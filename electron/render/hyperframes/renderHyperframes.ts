// ---------------------------------------------------------------------------
// Render with HyperFrames instead of Remotion (Ak, 11 Oct 2026).
//
// WHY. Remotion is source-available and paid for companies of four or more
// that build video tools; HyperFrames is Apache-2.0. A trial
// (docs/research/hyperframes-trial.md) showed our frame-driven React plugs
// straight in.
//
// THE SHAPE OF A RENDER. renderVideo.ts stages every asset into one folder
// and builds the composition's props exactly as it always has. This file
// turns that folder into a HyperFrames project and renders it:
//
//   bg-track.mp4   the background clips, looped and crossfaded by ffmpeg —
//                  native video, because HyperFrames extracts video frames
//                  exactly and a <video> inside React cannot promise that
//   banner.mp4     the banner, looped to the video's length, likewise
//   mix.wav        the whole soundtrack — narration, music ducked under the
//                  voices by the same musicGainAt the Remotion path used,
//                  and every sound effect at its own volume
//   vf.js          the React composition (remotion/hf/hfEntry.tsx) bundled
//                  with a stand-in for `remotion` (remotion/hf/remotionShim.tsx)
//   index.html     the layers in order: footage, React (faces, waveforms,
//                  subtitles), intro clip, banner, logo; plus the soundtrack
//
// HyperFrames' CLI does the rest. It runs on the app's own Node (Electron 43
// carries Node 24) and with its usage telemetry switched OFF.
// ---------------------------------------------------------------------------

import fsp from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { ffmpegBin } from "../../process/ffmpegPath";
import { childEnv } from "../../net/childEnv";
import { killTree, spawnTracked } from "../../process/childTree";
import { NO_BROWSER_HELP, pickRenderBrowser } from "./renderBrowser";

/**
 * THE GRAPHICS CARD (Ak, 26 Oct 2026: "use the gpu"). HyperFrames draws and
 * encodes on the processor unless told otherwise, and Video Forge never told
 * it — every render so far ran on the CPU alone. --gpu encodes with the NVIDIA
 * card (NVENC); --browser-gpu draws the frames with the graphics card instead
 * of software. VIDEOFORGE_RENDER_CPU=1 goes back to the processor (for a
 * machine without a usable card, or to keep the card cool).
 */
const gpuFlags = () => (process.env.VIDEOFORGE_RENDER_CPU === "1" ? [] : ["--gpu", "--browser-gpu"]);
import { backgroundTiming } from "../../../src/lib/background/backgroundTiming";
import { musicGainAt } from "../../../src/lib/audio/ducking";
import { colorLookCss } from "../../../src/lib/background/colorLook";
import type { RenderProps } from "../../../remotion/types";
import { writePage } from "./hfPage";
import { num } from "../jobSafety";

const require_ = createRequire(import.meta.url);

export interface HyperframesInput {
  /** Folder already holding every asset the props name (renderVideo stages it). */
  dir: string;
  props: RenderProps;
  /** Where the entry lives in the app: <appRoot>/remotion/hf/hfEntry.tsx. */
  appRoot: string;
  crf: number;
  outputPath: string;
  onProgress: (fraction: number, note: string) => void;
  signal?: AbortSignal;
}


function run(cmd: string, args: string[], opts: { env?: NodeJS.ProcessEnv; onLine?: (l: string) => void; signal?: AbortSignal } = {}) {
  return new Promise<void>((resolve, reject) => {
    if (opts.signal?.aborted) return reject(new Error("Stopped."));
    // Tracked: if the app closes, the whole tree (the HyperFrames node process
    // AND the headless Chrome it started) is ended by process id.
    const p = spawnTracked(cmd, args, { env: opts.env ?? process.env, windowsHide: true });
    let tail = "";
    let stopped = false;
    const eat = (d: Buffer) => {
      const s = d.toString();
      tail = (tail + s).slice(-4000);
      if (opts.onLine) for (const l of s.split(/\r?\n/)) if (l.trim()) opts.onLine(l);
    };
    p.stdout?.on("data", eat);
    p.stderr?.on("data", eat);
    // A Stop ends the process we started and everything it started (by pid,
    // never by name) — p.kill() alone leaves the browser running.
    opts.signal?.addEventListener("abort", () => {
      stopped = true;
      if (p.pid) void killTree(p.pid);
    });
    p.on("error", reject);
    p.on("close", (code) => {
      if (stopped) return reject(new Error("Stopped."));
      code === 0 ? resolve() : reject(new Error(`${path.basename(cmd)} failed (${code}): ${tail.slice(-800)}`));
    });
  });
}

/** Output tags that say "ordinary video" (bt709), for every clip we build. */
// "-color_range tv": a picture made into a clip (JPEG, full range) otherwise comes out as
// full-range yuvj420p, which the frame capture dropped: the background rendered black (10 Nov 2026).
const SDR_TAGS = ["-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709", "-color_range", "tv"];

// ---- background track --------------------------------------------------------
async function buildBackgroundTrack(input: HyperframesInput): Promise<{ file: string; startSec: number; durSec: number } | null> {
  const { props, dir } = input;
  const timing = backgroundTiming(props.backgrounds ?? [], props.backgroundCrossfadeMs ?? 0, props.fps);
  if (timing.slots.length === 0) return null;
  const W = props.width, H = props.height, fps = props.fps;
  const first = timing.slots[0];
  const args: string[] = ["-y", "-v", "error"];
  const chains: string[] = [];
  timing.slots.forEach((slot, i) => {
    if (slot.loopInFrames > 0) args.push("-stream_loop", "-1");
    args.push("-i", path.join(dir, props.backgrounds[slot.index].fileName));
    const d = (slot.durationInFrames / fps).toFixed(4);
    // object-fit: cover, at the composition's own size and frame rate
    chains.push(
      `[${i}:v]fps=${fps},scale=${W}:${H}:force_original_aspect_ratio=increase:out_range=tv,crop=${W}:${H},setsar=1,` +
        `trim=duration=${d},setpts=PTS-STARTPTS,format=yuv420p[v${i}]`
    );
  });
  let last = "v0";
  const T = timing.transitionInFrames / fps;
  for (let i = 1; i < timing.slots.length; i++) {
    const offset = ((timing.slots[i].startFrame - first.startFrame) / fps).toFixed(4);
    const out = `x${i}`;
    chains.push(
      T > 0
        ? `[${last}][v${i}]xfade=transition=fade:duration=${T.toFixed(4)}:offset=${offset}[${out}]`
        : `[${last}][v${i}]concat=n=2:v=1:a=0[${out}]`
    );
    last = out;
  }
  const lastSlot = timing.slots[timing.slots.length - 1];
  const durSec = (lastSlot.startFrame + lastSlot.durationInFrames - first.startFrame) / fps;
  const file = "bg-track.mp4";
  // Tagged as ordinary (SDR, bt709) video. A stock clip tagged HDR (HLG/PQ)
  // otherwise passes its tag on to the whole track, and the renderer then tries
  // to unpack every frame as raw HDR — about 100 GB for a 7-minute lesson,
  // which failed the 101.1 test render (26 Oct 2026).
  args.push("-filter_complex", chains.join(";"), "-map", `[${last}]`, "-an", "-c:v", "libx264", "-crf", "16", "-preset", "veryfast", "-r", String(fps), ...SDR_TAGS, path.join(dir, file));
  await run(ffmpegBin(), args, { signal: input.signal });
  return { file, startSec: first.startFrame / fps, durSec };
}

// ---- banner ------------------------------------------------------------------
async function buildBanner(input: HyperframesInput, totalSec: number): Promise<string | null> {
  const b = input.props.bannerVideo;
  if (!b) return null;
  const file = "banner-loop.mp4";
  await run(ffmpegBin(), ["-y", "-v", "error", "-stream_loop", "-1", "-i", path.join(input.dir, b.fileName),
    "-t", totalSec.toFixed(3), "-an", "-c:v", "libx264", "-crf", "18", "-preset", "veryfast", "-r", String(input.props.fps), ...SDR_TAGS,
    path.join(input.dir, file)], { signal: input.signal });
  return file;
}

// ---- soundtrack -------------------------------------------------------------
async function buildMix(input: HyperframesInput, totalSec: number): Promise<string | null> {
  const { props, dir } = input;
  const inputs: string[] = [];
  const parts: string[] = [];
  const labels: string[] = [];
  let n = 0;
  const RATE = 48000;

  if (props.audioFileName) {
    inputs.push("-i", path.join(dir, props.audioFileName));
    parts.push(`[${n}:a]aresample=${RATE},aformat=channel_layouts=stereo[a${n}]`);
    labels.push(`[a${n}]`);
    n++;
  }

  if (props.musicFileName && (props.musicVolume ?? 0) > 0) {
    // The duck, as an envelope: one gain value per frame, written as a tiny
    // mono track and multiplied into the music — the same musicGainAt the
    // Remotion path evaluated frame by frame.
    const ENV_RATE = 4000;
    const samples = Math.ceil(totalSec * ENV_RATE);
    const env = Buffer.alloc(samples * 4);
    for (let i = 0; i < samples; i++) {
      env.writeFloatLE(musicGainAt(props.analysis, (i / ENV_RATE) * 1000, props.musicVolume, props.musicDuck ?? 0), i * 4);
    }
    const envFile = path.join(dir, "duck-envelope.f32");
    await fsp.writeFile(envFile, env);
    inputs.push("-stream_loop", "-1", "-i", path.join(dir, props.musicFileName));
    const m = n++;
    inputs.push("-f", "f32le", "-ar", String(ENV_RATE), "-ac", "1", "-i", envFile);
    const e = n++;
    parts.push(
      `[${m}:a]aresample=${RATE},aformat=channel_layouts=stereo,atrim=duration=${totalSec.toFixed(3)}[m${m}]`,
      `[${e}:a]aresample=${RATE},aformat=channel_layouts=stereo[e${e}]`,
      `[m${m}][e${e}]amultiply[a${m}]`
    );
    labels.push(`[a${m}]`);
  }

  for (const s of props.sfx ?? []) {
    inputs.push("-i", path.join(dir, s.fileName));
    const ms = Math.max(0, Math.round(s.atMs));
    parts.push(`[${n}:a]aresample=${RATE},aformat=channel_layouts=stereo,volume=${num(s.volume, 1)},adelay=${ms}|${ms}[a${n}]`);
    labels.push(`[a${n}]`);
    n++;
  }

  if (labels.length === 0) return null;
  const file = "mix.wav";
  parts.push(`${labels.join("")}amix=inputs=${labels.length}:normalize=0:duration=longest,atrim=duration=${totalSec.toFixed(3)}[out]`);
  await run(ffmpegBin(), ["-y", "-v", "error", ...inputs, "-filter_complex", parts.join(";"), "-map", "[out]", "-c:a", "pcm_s16le", path.join(dir, file)], { signal: input.signal });
  return file;
}

// ---- the page ----------------------------------------------------------------
async function bundleEntry(input: HyperframesInput) {
  const esbuild = require_("esbuild") as typeof import("esbuild");
  const hf = path.join(input.appRoot, "remotion", "hf");
  await esbuild.build({
    entryPoints: [path.join(hf, "hfEntry.tsx")],
    bundle: true,
    format: "iife",
    platform: "browser",
    jsx: "automatic",
    minify: true,
    outfile: path.join(input.dir, "vf.js"),
    define: { "process.env.NODE_ENV": '"production"' },
    alias: {
      remotion: path.join(hf, "remotionShim.tsx"),
      "@remotion/transitions": path.join(hf, "transitionsShim.tsx"),
      "@remotion/transitions/fade": path.join(hf, "transitionsShim.tsx"),
    },
    logLevel: "silent",
  });
}

// The page itself is built in hfPage.ts (kept free of app imports so a test
// can run it against a hostile project).

// ---- the render --------------------------------------------------------------
export async function renderHyperframes(input: HyperframesInput): Promise<void> {
  const { props, onProgress } = input;
  const totalSec = Math.max(1, Math.round(props.durationSec * props.fps)) / props.fps;

  onProgress(0.02, "Building the background track…");
  const bg = await buildBackgroundTrack(input);
  onProgress(0.08, "Looping the banner…");
  const banner = await buildBanner(input, totalSec);
  onProgress(0.12, "Mixing the soundtrack…");
  const mix = await buildMix(input, totalSec);
  onProgress(0.16, "Building the page…");
  await bundleEntry(input);
  await fsp.writeFile(path.join(input.dir, "index.html"), writePage(props, { bg, banner, mix, totalSec, lookCss: colorLookCss(props.backgroundColorLook) }));

  onProgress(0.2, "Rendering frames…");
  // A complete copy of the hidden browser (renderBrowser.ts says why).
  const browser = pickRenderBrowser();
  // Found through package.json: since 0.9 the package only exports ./api and
  // ./package.json, so asking for the bin file by name is refused.
  const cli = path.join(path.dirname(require_.resolve("hyperframes/package.json")), "bin", "hyperframes.mjs");
  try {
    await run(process.execPath, [cli, "render", input.dir, "--output", input.outputPath, "--fps", String(props.fps), "--crf", String(input.crf), "--sdr", ...gpuFlags(), "--quiet"], {
      // childEnv() carries the no-update / no-telemetry switches (it is the one
      // place engine environments are set).
      env: childEnv({ ELECTRON_RUN_AS_NODE: "1", ...(browser ? { HYPERFRAMES_BROWSER_PATH: browser } : {}) }),
      signal: input.signal,
      onLine: (l) => {
        const m = l.match(/@hf-progress (\{.*\})/);
        if (m) {
          try {
            const p = JSON.parse(m[1]);
            onProgress(0.2 + 0.8 * Math.min(1, (p.pct ?? 0) / 100), p.code === "assemble" ? "Assembling…" : "Rendering frames…");
          } catch { /* a malformed progress line is not worth failing a render for */ }
        }
      },
    });
  } catch (e) {
    // the damaged-browser error says nothing a person can act on; this does
    if (/ICU data|Failed to launch the browser/i.test(String(e))) throw new Error(NO_BROWSER_HELP);
    throw e;
  }
}
