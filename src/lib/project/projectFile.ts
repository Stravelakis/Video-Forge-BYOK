// ---------------------------------------------------------------------------
// The "Save project" file: what goes in it, and reading one back.
//
// It used to hold the render settings, speakers, subtitles, script and
// narration — and nothing else. Music, sound effects, backgrounds, the logo,
// the intro/outro cards and attached audio were all in the autosave but not in
// the file, so "save, move to another PC, open" lost half the video.
//
// Now the file carries everything the autosave carries (the heavy audio
// analysis aside: the path is saved and the analysis is rebuilt on open).
//
//   version 1  the original, partial file. Still opens: whatever it does not
//              say stays at the app's defaults.
//   version 2  everything.
//
// A file from a NEWER Video Forge is refused with a message rather than opened
// half-understood.
//
// Type-only imports on purpose: tools/lib/projectFile.test.mjs runs this file.
// ---------------------------------------------------------------------------

import type { ProjectState } from "../../store/types";

export const PROJECT_KIND = "byok-project";
export const PROJECT_VERSION = 2;

/** Everything that is saved as it is. */
export const PLAIN_FIELDS = [
  "render", "fps", "speakers", "script", "language",
  "musicWaveform", "musicColor", "subtitles",
  "pauseSameMs", "pauseTurnMs", "visemeFadeMs", "fadeMigrated", "idleMotion",
  "cards", "logo",
  "backgrounds", "backgroundDim", "backgroundBlur", "backgroundColorLook", "backgroundCrossfadeMs",
  "musicVolume", "musicDuck", "sfx", "scene",
  // The Direct step's stage directions (17 Nov 2026: Save project used to drop
  // them; a file without them opens with none).
  "directions",
] as const;

type Plain = (typeof PLAIN_FIELDS)[number];

/** Everything the project owns besides the plain fields: the audio entries. */
const AUDIO_FIELDS = ["narration", "music", "attachedAudio"] as const;

/** What the autosave keeps: exactly what the project file keeps (one list, so
 *  the two cannot drift apart again — blur and colour look were in the file but
 *  missing from the autosave until 17 Nov 2026). */
export function autosaveSnapshot(s: ProjectState): ProjectDoc["project"] {
  return projectToDoc(s, 0).project;
}

/** A project with nothing of the previous one left in it.
 *
 *  The store MERGES on every set, so "New" and "Open" used to keep any field
 *  the defaults have no value for (the Direct step's directions, the colour
 *  look). Every field a project owns is named here, explicitly undefined when
 *  the defaults have no value, then the defaults go on top. */
export function blankProject<T extends object>(defaults: T): T {
  const out: Record<string, unknown> = {};
  for (const k of PLAIN_FIELDS) out[k] = undefined;
  for (const k of AUDIO_FIELDS) out[k] = null;
  return { ...out, ...defaults } as T;
}

export interface ProjectDoc {
  kind: typeof PROJECT_KIND;
  version: number;
  savedAt: number;
  project: Partial<Pick<ProjectState, Plain>> & {
    narration?: { filePath: string; segments: unknown[]; analysis: null } | null;
    music?: { filePath: string; analysis: null } | null;
    attachedAudio?: { filePath: string; analysis: null } | null;
  };
}

/** The project as a file. The analyses are dropped (megabytes; rebuilt from the
 *  audio file on open), the paths are kept. */
export function projectToDoc(s: ProjectState, savedAt: number = Date.now()): ProjectDoc {
  const project: Record<string, unknown> = {};
  for (const k of PLAIN_FIELDS) if (s[k] !== undefined) project[k] = s[k];
  project.narration = s.narration ? { filePath: s.narration.filePath, segments: s.narration.segments, analysis: null } : null;
  project.music = s.music ? { filePath: s.music.filePath, analysis: null } : null;
  project.attachedAudio = s.attachedAudio ? { filePath: s.attachedAudio.filePath, analysis: null } : null;
  return { kind: PROJECT_KIND, version: PROJECT_VERSION, savedAt, project: project as ProjectDoc["project"] };
}

export type OpenResult =
  | { ok: true; version: number; project: Partial<ProjectState> }
  | { ok: false; message: string };

/** Read a project file's contents (already parsed from JSON). */
export function docToProject(raw: unknown): OpenResult {
  const doc = raw as { kind?: unknown; version?: unknown; project?: unknown } | null;
  if (!doc || typeof doc !== "object" || doc.kind !== PROJECT_KIND || !doc.project || typeof doc.project !== "object") {
    return { ok: false, message: "That's not a project file. Presets load with Import… above." };
  }
  const version = typeof doc.version === "number" ? doc.version : 1;
  if (version > PROJECT_VERSION) {
    return { ok: false, message: `This project was saved by a newer Video Forge (file version ${version}; this one reads up to ${PROJECT_VERSION}). Update the app to open it.` };
  }
  const src = doc.project as Record<string, unknown>;
  const project: Record<string, unknown> = {};
  // Only the fields this app knows. Anything else in the file is ignored, so a
  // hand-edited or foreign file cannot write arbitrary state.
  for (const k of PLAIN_FIELDS) if (src[k] !== undefined) project[k] = src[k];
  // Directions are read field by field: the Direct step and the render both
  // walk them, so a wrong shape would break the screen rather than be ignored.
  // A file without any (older files) leaves the new project's empty default.
  if (src.directions !== undefined) project.directions = cleanDirections(src.directions);
  const pathOnly = (v: unknown) => {
    const f = (v as { filePath?: unknown } | null)?.filePath;
    return typeof f === "string" && f ? { filePath: f, analysis: null } : null;
  };
  const nar = src.narration as { filePath?: unknown; segments?: unknown } | null | undefined;
  project.narration = nar && typeof nar.filePath === "string" ? { filePath: nar.filePath, segments: Array.isArray(nar.segments) ? nar.segments : [], analysis: null } : null;
  project.music = pathOnly(src.music);
  project.attachedAudio = pathOnly(src.attachedAudio);
  return { ok: true, version, project: project as Partial<ProjectState> };
}

/** A file's stage directions in the shape the app uses; anything else is dropped.
 *  A file without any (older files) gives none. */
export function cleanDirections(v: unknown): NonNullable<ProjectState["directions"]> {
  const out: NonNullable<ProjectState["directions"]> = {};
  if (!v || typeof v !== "object" || Array.isArray(v)) return out;
  for (const [key, line] of Object.entries(v as Record<string, unknown>)) {
    const l = line as { text?: unknown; items?: unknown } | null;
    if (!l || typeof l !== "object" || typeof l.text !== "string" || !Array.isArray(l.items)) continue;
    const items = l.items
      .filter((x): x is { tag: string; at: number; ai?: unknown } =>
        !!x && typeof x === "object" && typeof (x as { tag?: unknown }).tag === "string" && Number.isFinite((x as { at?: unknown }).at))
      .map((x) => ({ tag: x.tag, at: Math.min(1, Math.max(0, x.at)), ...(x.ai === true ? { ai: true } : {}) }));
    if (items.length) out[key] = { text: l.text, items };
  }
  return out;
}
