// ---------------------------------------------------------------------------
// A render job is only as trustworthy as the project file it came from.
//
// Two checks, both run before a single file is copied (17 Nov 2026 review,
// X1 and X2):
//
//   renderJobPaths    every file the job names, so main can put each one
//                     through the path guard like every other IPC handler.
//                     Before this, a hostile project file could pull any
//                     readable file on the PC into the render folder.
//   cleanRenderNumbers the numbers the render writes into the HyperFrames page
//                     and into ffmpeg filter text. A project file can hold a
//                     string where a number belongs; this turns every one of
//                     them back into a plain finite number.
//
// Type-only imports on purpose: tools/lib/renderSafety.test.mjs runs this file.
// ---------------------------------------------------------------------------

import type { RenderJob } from "./renderVideo";

/** Every file on disk the job asks the render to read, with what it is for. */
export function renderJobPaths(job: RenderJob): { what: string; path: unknown }[] {
  const out: { what: string; path: unknown }[] = [];
  const add = (what: string, p: unknown) => {
    if (p !== undefined && p !== null && p !== "") out.push({ what, path: p });
  };
  add("narration audio", job.audioFilePath);
  add("music", job.musicFilePath);
  add("intro", job.introPath);
  add("outro", job.outroPath);
  add("logo", job.logo?.filePath);
  add("banner", job.bannerVideo?.filePath);
  for (const s of job.sfx ?? []) add("sound effect", s?.filePath);
  for (const b of job.backgrounds ?? []) add("background", b?.filePath);
  for (const sp of job.speakers ?? []) {
    add("face sheet", sp?.sheetPath);
    add("puppet", sp?.puppetPath);
  }
  return out;
}

/** Throws (the guard's own plain-words error) unless every file the job names
 *  may be read. `assertRead` is guard().assertRead in main. */
export function assertRenderJobPaths(job: RenderJob, assertRead: (p: unknown) => string): void {
  for (const { path } of renderJobPaths(job)) assertRead(path);
}

/** A plain finite number, or the fallback. Strings are never let through. */
export function num(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

const LOGO_POSITIONS = new Set(["top-left", "top-right", "bottom-left", "bottom-right", "bottom-center", "watermark"]);

/** The job with every number that reaches the page or ffmpeg made a real number. */
export function cleanRenderNumbers(job: RenderJob): RenderJob {
  const opt = (v: unknown) => (v === undefined || v === null ? undefined : num(v, 0));
  return {
    ...job,
    width: num(job.width, 1080),
    height: num(job.height, 1920),
    fps: num(job.fps, 30),
    durationSec: num(job.durationSec, 1),
    crf: opt(job.crf),
    musicVolume: opt(job.musicVolume),
    musicDuck: opt(job.musicDuck),
    backgroundDim: opt(job.backgroundDim),
    backgroundBlur: opt(job.backgroundBlur),
    backgroundCrossfadeMs: opt(job.backgroundCrossfadeMs),
    visemeFadeMs: opt(job.visemeFadeMs),
    idleMotion: opt(job.idleMotion),
    introOverMs: opt(job.introOverMs),
    backgroundColorLook: typeof job.backgroundColorLook === "string" ? job.backgroundColorLook : undefined,
    sfx: job.sfx?.map((s) => ({ ...s, atMs: num(s.atMs, 0), volume: num(s.volume, 1) })),
    backgrounds: job.backgrounds?.map((b) => ({ ...b, startMs: num(b.startMs, 0), endMs: num(b.endMs, 0), sourceSec: opt(b.sourceSec) })),
    backgroundBand: job.backgroundBand ? { top: num(job.backgroundBand.top, 0), bottom: num(job.backgroundBand.bottom, 1) } : job.backgroundBand,
    bannerVideo: job.bannerVideo ? { ...job.bannerVideo, cropTop: num(job.bannerVideo.cropTop, 0), cropBottom: num(job.bannerVideo.cropBottom, 0) } : job.bannerVideo,
    logo: job.logo
      ? {
          ...job.logo,
          position: LOGO_POSITIONS.has(job.logo.position) ? job.logo.position : "top-right",
          size: num(job.logo.size, 0.15),
          opacity: num(job.logo.opacity, 1),
          margin: num(job.logo.margin, 0.03),
        }
      : job.logo,
  };
}
