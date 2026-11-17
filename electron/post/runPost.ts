// ---------------------------------------------------------------------------
// Post-production, run. The filter graphs are built in postGraph.ts (pure,
// tested); this file finds out what the ffmpeg in use can do, writes the graph
// to a file and runs it.
//
// WHERE IT SITS IN A RENDER (renderVideo.ts, so the in-app render, the batch
// and --job all go through it):
//   1. processSpeech, before the frames: the narration gets its voice
//      characters, left/right places and studio sound. Audio only — a few
//      seconds for a ten-minute lesson (one measuring read, one writing pass).
//   2. gradeVideo, after the frames and before the intro/outro are joined:
//      the ONE extra video encode, and only when a colour grade is on.
// The voice test in the Cast uses processVoiceTest: the same graph, so what
// you hear there is what the render does.
// ---------------------------------------------------------------------------

import fsp from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";
import { ffmpegBin } from "../process/ffmpegPath";
import { killTree, spawnTracked } from "../process/childTree";
import { filtersFrom, gradeFilter, parseLoudnorm, speechGraph, speechInputs, type Caps, type Seg } from "./postGraph";
import { cleanVoiceCharacter, type PostJob, type VoiceCharacter } from "../../src/lib/post/postSettings";

let capsCache: { bin: string; caps: Set<string> } | null = null;

/** The filters the ffmpeg in use has (asked once per run). */
export function postCaps(): Caps {
  const bin = ffmpegBin();
  if (capsCache?.bin === bin) return capsCache.caps;
  let caps = new Set<string>();
  try {
    const out = spawnSync(bin, ["-hide_banner", "-filters"], { encoding: "utf8", windowsHide: true, timeout: 15000 });
    caps = filtersFrom(out.stdout ?? "");
  } catch {
    /* no ffmpeg: every part is reported missing and skipped */
  }
  capsCache = { bin, caps };
  return caps;
}

function run(args: string[], opts: { cwd?: string; signal?: AbortSignal } = {}): Promise<{ code: number; err: string }> {
  return new Promise((resolve) => {
    if (opts.signal?.aborted) return resolve({ code: -1, err: "Stopped." });
    const p = spawnTracked(ffmpegBin(), args, { windowsHide: true, cwd: opts.cwd });
    let err = "";
    p.stderr?.on("data", (d) => {
      err = (err + String(d)).slice(-200_000);
    });
    opts.signal?.addEventListener("abort", () => {
      if (p.pid) void killTree(p.pid);
    });
    p.on("error", (e) => resolve({ code: -1, err: String(e) }));
    p.on("close", (code) => resolve({ code: code ?? -1, err }));
  });
}

const tail = (s: string) => s.trim().split(/\r?\n/).slice(-3).join(" ").slice(0, 300);

export interface SpeechOptions {
  inputPath: string;
  outputPath: string;
  job: PostJob;
  segments: Seg[];
  durationSec?: number | null;
  signal?: AbortSignal;
}

/** The narration with its post-production, written to `outputPath` (a stereo
 *  16-bit WAV). Throws on failure; the caller falls back to the untouched file. */
export async function processSpeech(o: SpeechOptions): Promise<{ warnings: string[] }> {
  const caps = postCaps();
  const work = await fsp.mkdtemp(path.join(os.tmpdir(), "video-forge-post-"));
  try {
    let measured = null;
    const warnings: string[] = [];
    if (o.job.studioSound && caps.has("loudnorm")) {
      const m = speechGraph({ job: o.job, segments: o.segments, caps, mode: "measure" });
      await fsp.writeFile(path.join(work, "measure.txt"), m.graph, "utf8");
      const r = await run(["-hide_banner", "-nostats", "-v", "info", ...speechInputs(o.inputPath, m), "-/filter_complex", "measure.txt", "-map", "[out]", "-f", "null", "-"], { cwd: work, signal: o.signal });
      if (o.signal?.aborted) throw new Error("Stopped.");
      if (r.code !== 0) throw new Error(`the sound could not be measured: ${tail(r.err)}`);
      measured = parseLoudnorm(r.err);
      if (!measured) warnings.push("[video-forge] post-production: the loudness could not be measured, so it was set in one pass.");
    }
    const g = speechGraph({ job: o.job, segments: o.segments, caps, mode: "apply", measured, durationSec: o.durationSec });
    warnings.push(...g.warnings);
    await fsp.writeFile(path.join(work, "apply.txt"), g.graph, "utf8");
    const r = await run(["-y", "-hide_banner", "-v", "error", ...speechInputs(o.inputPath, g), "-/filter_complex", "apply.txt", "-map", "[out]", "-c:a", "pcm_s16le", "-ar", "48000", o.outputPath], { cwd: work, signal: o.signal });
    if (o.signal?.aborted) throw new Error("Stopped.");
    if (r.code !== 0) throw new Error(`the speech could not be processed: ${tail(r.err)}`);
    return { warnings };
  } finally {
    await fsp.rm(work, { recursive: true, force: true }).catch(() => {});
  }
}

export interface GradeOptions {
  /** The rendered video. Replaced by the graded one. */
  videoPath: string;
  grade: PostJob["grade"];
  crf: number;
  signal?: AbortSignal;
}

/** The colour grade on the finished picture, in place. The sound is copied, not
 *  re-encoded. Returns warnings; a failure leaves the ungraded video and says so. */
export async function gradeVideo(o: GradeOptions): Promise<{ graded: boolean; warnings: string[] }> {
  const caps = postCaps();
  const work = await fsp.mkdtemp(path.join(os.tmpdir(), "video-forge-grade-"));
  try {
    let lutFile: string | null = null;
    const warnings: string[] = [];
    if (o.grade.lutPath) {
      // Copied in under a plain name: a Windows path inside a filter needs
      // escaping that is easy to get wrong, a plain name needs none.
      try {
        await fsp.copyFile(o.grade.lutPath, path.join(work, "grade.cube"));
        lutFile = "grade.cube";
      } catch {
        warnings.push(`[video-forge] post-production: the colour LUT could not be read and was left out: ${o.grade.lutPath}`);
      }
    }
    const { filter, warnings: w } = gradeFilter(o.grade, caps, lutFile);
    warnings.push(...w);
    if (!filter) return { graded: false, warnings };
    const graded = o.videoPath.replace(/\.mp4$/i, "") + ".graded.mp4";
    const r = await run([
      "-y", "-hide_banner", "-v", "error", "-i", o.videoPath,
      "-vf", filter,
      "-map", "0:v:0", "-map", "0:a?",
      "-c:v", "libx264", "-crf", String(o.crf), "-preset", "medium", "-pix_fmt", "yuv420p",
      "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709",
      "-c:a", "copy", "-movflags", "+faststart", graded,
    ], { cwd: work, signal: o.signal });
    if (o.signal?.aborted) {
      await fsp.rm(graded, { force: true }).catch(() => {});
      throw new Error("Stopped.");
    }
    if (r.code !== 0) {
      await fsp.rm(graded, { force: true }).catch(() => {});
      warnings.push(`[video-forge] post-production: the colour grade failed and was left out (${tail(r.err)}).`);
      return { graded: false, warnings };
    }
    await fsp.rename(graded, o.videoPath);
    return { graded: true, warnings };
  } finally {
    await fsp.rm(work, { recursive: true, force: true }).catch(() => {});
  }
}

/** The Cast's voice test, through the same graph as the render: this voice
 *  character, and studio sound when the project has it on (loudness in one
 *  pass: a test line is too short to measure first). */
export async function processVoiceTest(wav: Buffer, character: VoiceCharacter | null | undefined, studioSound: boolean): Promise<Buffer> {
  const c = cleanVoiceCharacter(character);
  if (!studioSound && c.preset === "natural" && !c.pitch && !c.brightness && !c.sparkle) return wav;
  const work = await fsp.mkdtemp(path.join(os.tmpdir(), "video-forge-test-"));
  try {
    await fsp.writeFile(path.join(work, "in.wav"), wav);
    const job: PostJob = {
      studioSound,
      stereo: { on: false, amount: 0 },
      grade: { on: false, lutPath: null, contrast: 1, saturation: 1 },
      voices: [{ speakerId: "test", x: 0.5, character: c }],
    };
    const g = speechGraph({ job, segments: [{ speakerId: "test", startMs: 0, endMs: 1e9 }], caps: postCaps(), mode: "apply", measured: null });
    await fsp.writeFile(path.join(work, "apply.txt"), g.graph, "utf8");
    const r = await run(["-y", "-hide_banner", "-v", "error", ...speechInputs("in.wav", g), "-/filter_complex", "apply.txt", "-map", "[out]", "-c:a", "pcm_s16le", "out.wav"], { cwd: work });
    if (r.code !== 0) throw new Error(`the voice character could not be applied: ${tail(r.err)}`);
    return await fsp.readFile(path.join(work, "out.wav"));
  } finally {
    await fsp.rm(work, { recursive: true, force: true }).catch(() => {});
  }
}
