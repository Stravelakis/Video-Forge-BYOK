// ---------------------------------------------------------------------------
// Which ffmpeg to use, decided from what each one says it can do.
//
// PURE: the caller finds the candidates and asks each for its filter list
// (`ffmpeg -filters`, parsed by filtersFrom in electron/post/postGraph.ts).
// tools/lib/ffmpegChoice.test.mjs checks the order without running anything.
//
// Order (18 Nov 2026):
//   1. the full ffmpeg the installer carries (resources/ffmpeg/ffmpeg.exe,
//      fetched at build time by scripts/fetch-ffmpeg.mjs)
//   2. a full ffmpeg on PATH (what a developer's machine usually has)
//   3. Remotion's cut-down copy, which keeps the app working with nothing else
// "Full" means it can weld the intro and outro cards (pad, setsar, fps).
// Post-production asks separately which of its filters the chosen one has
// (runPost.ts postCaps) and leaves out, with a warning, whatever is missing.
// ---------------------------------------------------------------------------

export type Caps = ReadonlySet<string>;
export type FfmpegWhere = "bundled" | "path" | "remotion";

export interface FfmpegCandidate {
  where: FfmpegWhere;
  bin: string;
}

export interface FfmpegChoice extends FfmpegCandidate {
  /** Has everything the intro/outro cards need. */
  full: boolean;
}

/** What joining an intro or outro card needs; Remotion's copy lacks all three. */
export const CARD_FILTERS = ["pad", "setsar", "fps"] as const;

/** What post-production uses beyond the basics (postGraph.ts). */
export const POST_FILTERS = ["rubberband", "highpass", "acompressor", "deesser", "equalizer", "chorus", "aecho", "lut3d", "eq"] as const;

export const isFull = (caps: Caps): boolean => CARD_FILTERS.every((f) => caps.has(f));

/** Post-production filters this ffmpeg does not have, in a fixed order. */
export const missingPostFilters = (caps: Caps): string[] => POST_FILTERS.filter((f) => !caps.has(f));

const RANK: Record<FfmpegWhere, number> = { bundled: 0, path: 1, remotion: 2 };

/**
 * The ffmpeg to use. Candidates are tried bundled → PATH → Remotion (whatever
 * order they are given in); the first full one wins. When none is full, the
 * cut-down Remotion copy is used if there is one (it runs, and every step says
 * what it could not do), else the first candidate. Null when there are none.
 */
export function chooseFfmpeg(candidates: (FfmpegCandidate | null | undefined)[], capsOf: (bin: string) => Caps): FfmpegChoice | null {
  const list = candidates.filter((c): c is FfmpegCandidate => !!c?.bin).sort((a, b) => RANK[a.where] - RANK[b.where]);
  if (!list.length) return null;
  for (const c of list) if (isFull(capsOf(c.bin))) return { ...c, full: true };
  const fallback = list.find((c) => c.where === "remotion") ?? list[0];
  return { ...fallback, full: false };
}

/**
 * Where the installer's own ffmpeg can be, most likely first: the packed app's
 * resources folder, then the build folder of a source checkout (npm run ffmpeg).
 * Windows only: that is the only build that carries one.
 */
export function bundledFfmpegPlaces(o: { platform: string; resourcesPath?: string; appRoot?: string }, join: (...p: string[]) => string): string[] {
  if (o.platform !== "win32") return [];
  const out: string[] = [];
  if (o.resourcesPath) out.push(join(o.resourcesPath, "ffmpeg", "ffmpeg.exe"));
  if (o.appRoot) out.push(join(o.appRoot, "build", "ffmpeg", "ffmpeg.exe"));
  return out;
}
