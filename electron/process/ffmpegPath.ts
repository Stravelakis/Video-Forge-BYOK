// ---------------------------------------------------------------------------
// Where ffmpeg and ffprobe are.
//
// WHY NOT JUST "ffmpeg". Spawning the bare name finds whatever is on PATH, and
// on the machine this was written on that is a winget install. On anyone
// else's machine — which is the point of an installer — there is usually no
// ffmpeg at all, and the first thing to fail would be joining an intro onto a
// finished video, after the whole render had already been paid for in time.
//
// THREE CANDIDATES, best first (electron/process/ffmpegChoice.ts decides):
//   1. The full ffmpeg the Windows installer carries (gyan.dev build, GPL v3,
//      fetched at build time by scripts/fetch-ffmpeg.mjs; see NOTICE). It has
//      everything post-production uses: rubberband, compressors, EQ, chorus,
//      lut3d, eq.
//   2. A full ffmpeg on PATH (a source checkout without `npm run ffmpeg`).
//   3. Remotion's own copy, inside @remotion/compositor-win32-x64-msvc.
//
// REMOTION SHIPS A STRIPPED FFMPEG: 42 filters where a normal build has 576,
// and the three missing ones happen to be exactly what welding a card needs —
// `pad`, `setsar` and `fps`. Preferring it over the machine's own ffmpeg cost
// every one of the 69 lessons its outro (20 Sep 2026): the step failed, said
// so in one line, and the line scrolled past inside a twelve-minute render.
// It stays as the last resort that keeps the app working with nothing else.
//
// Each candidate is asked what filters it has (`-filters`), once per run.
// Post-production asks the chosen one again for its own filters
// (electron/post/runPost.ts postCaps) and warns about anything missing.
// ---------------------------------------------------------------------------

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { filtersFrom } from "../post/postGraph";
import { bundledFfmpegPlaces, chooseFfmpeg, type FfmpegChoice } from "./ffmpegChoice";

const require = createRequire(import.meta.url);

function remotionCopy(exe: "ffmpeg" | "ffprobe"): string | null {
  if (process.platform !== "win32") return null;
  try {
    const pkg = require.resolve("@remotion/compositor-win32-x64-msvc/package.json");
    const file = path.join(path.dirname(pkg), `${exe}.exe`);
    return fs.existsSync(file) ? file : null;
  } catch {
    return null;
  }
}

/** The installer's own full ffmpeg, if this copy has one. */
function bundledFull(): string | null {
  // out/main/main.js → the app folder (resources/app when installed)
  const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
  const resourcesPath = (process as { resourcesPath?: string }).resourcesPath;
  return bundledFfmpegPlaces({ platform: process.platform, resourcesPath, appRoot }, path.join).find((p) => fs.existsSync(p)) ?? null;
}

/** The filters a binary says it has; an empty set if it does not run. */
function filtersOf(bin: string): Set<string> {
  try {
    const out = spawnSync(bin, ["-hide_banner", "-filters"], { encoding: "utf8", windowsHide: true, timeout: 15000 });
    if (out.status !== 0 || !out.stdout) return new Set();
    return filtersFrom(out.stdout);
  } catch {
    return new Set();
  }
}

let chosen: FfmpegChoice | null | undefined;
let probe: string | undefined;

/** Which ffmpeg is in use and whether it is a full one (asked once per run). */
export function ffmpegChoice(): FfmpegChoice {
  if (chosen === undefined) {
    const bundled = bundledFull();
    const remotion = remotionCopy("ffmpeg");
    chosen = chooseFfmpeg(
      [bundled ? { where: "bundled", bin: bundled } : null, { where: "path", bin: "ffmpeg" }, remotion ? { where: "remotion", bin: remotion } : null],
      filtersOf,
    );
  }
  return chosen ?? { where: "path", bin: "ffmpeg", full: false };
}

export function ffmpegBin(): string {
  return ffmpegChoice().bin;
}

/** ffprobe only reads, so Remotion's copy is enough; the installer does not carry a second one. */
export function ffprobeBin(): string {
  return (probe ??= remotionCopy("ffprobe") ?? "ffprobe");
}
