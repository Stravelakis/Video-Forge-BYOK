// ---------------------------------------------------------------------------
// Turns a speaker's script tracks into the signal a 3D character reads.
// One function, used by both the preview (App.tsx) and the render
// (VideoComposition.tsx), so they can't disagree.
// Relative imports only: the render bundler builds this too.
// ---------------------------------------------------------------------------

import { buildSpeakerPoseTracks, moodAt, moodFace } from "../motion/facePerformance";
import type { NarrationSegment } from "../../store/types";
import { visemeBlendAt } from "../visemes/timeline";
import type { KenneySignal } from "./actor";
import type { TagSpan } from "./motions";
import { splitTag, tagStart } from "../direct/directions";

/** The app's script feelings ([gasp], [sadness]…) as one of the eight 3D moods. */
export function kenneyMood(tag: string | undefined, fallback: string): string {
  if (!tag) return fallback;
  const t = tag.toLowerCase();
  if (/sad|cry|tears|grief|sorrow|reluct|sigh/.test(t)) return "sad";
  if (/angry|anger|rage|furious|frustrat|annoy/.test(t)) return "angry";
  if (/happ|joy|laugh|delight|excit|fond|smil|cheer/.test(t)) return "happy";
  if (/surpris|amaz|gasp|awe|shock|astonish/.test(t)) return "surprised";
  if (/worr|nerv|tens|panic|trembl|fear|scared|agitat/.test(t)) return "worried";
  if (/tired|sleepy|bored/.test(t)) return "half";
  const f = moodFace(tag);
  if (f?.smile) return "happy";
  if (f?.lid === "wide") return "surprised";
  if (f?.brow === "firm") return "angry";
  if (f?.brow === "worried") return "worried";
  return fallback;
}

interface Seg { speakerId: string; startMs: number; endMs: number; tags?: string[]; text?: string }
type VisemeTrack = Parameters<typeof visemeBlendAt>[0];

export function kenneySignalFor(
  speakerId: string,
  restingMood: string,
  track: VisemeTrack | undefined,
  moods: { startMs: number; endMs: number; mood: string }[] | undefined,
  segments: Seg[],
  fadeSec: number,
) {
  const own = segments.filter((s) => s.speakerId === speakerId);
  const at = (ms: number): KenneySignal => ({
    viseme: track ? visemeBlendAt(track, ms / 1000, fadeSec).to : 0,
    talking: own.some((s) => ms >= s.startMs && ms < s.endMs),
    mood: kenneyMood(moodAt(moods, ms), restingMood),
  });
  const last = own[own.length - 1];
  return { at, key: `${speakerId}|${restingMood}|${own.length}|${last?.endMs ?? 0}|${track ? (track as unknown[]).length : 0}|${moods?.length ?? 0}` };
}

/** The words the motion lookup turns into a gesture clip (motions.ts findMotion):
 *  library phrases for the animated people, Kenney's own clip words for the rest. */
const GESTURE_WORDS: Record<string, { lib: string; seated: string; own: string | null }> = {
  explain: { lib: "general conversation", seated: "talking while seated", own: null },
  point: { lib: "question one hand", seated: "pointing while seated", own: "points" },
  shrug: { lib: "shoulder shrug", seated: "talking while seated", own: null },
  wave: { lib: "waving", seated: "talking while seated", own: "waves" },
};

/**
 * Hands that move by themselves while talking (Ak, 11 Nov 2026): the same rule
 * and the same "how much they gesture" amount as the drawn characters
 * (buildSpeakerPoseTracks), played as motion clips and blended in and out.
 * Only lines with no script tag: a tag already picks its own motion.
 */
export function kenneyGesturesFor(speakerId: string, segments: Seg[], amount: number, set: string, seated: boolean): TagSpan[] {
  const own = segments.filter((s) => s.speakerId === speakerId && typeof s.text === "string");
  if (!own.length) return [];
  const free = own.filter((s) => !(s.tags ?? []).length);
  const poses = buildSpeakerPoseTracks(free as unknown as NarrationSegment[], { [speakerId]: amount })[speakerId] ?? [];
  const out: TagSpan[] = [];
  for (const p of poses) {
    const w = GESTURE_WORDS[p.pose] ?? GESTURE_WORDS.explain;
    const tag = set === "animated" ? (seated ? w.seated : w.lib) : w.own;
    if (tag) out.push({ startMs: p.startMs, endMs: p.endMs, tag });
  }
  return out;
}

/** Every tag on this speaker's lines, for the motion lookup. */
export function kenneyTagsFor(speakerId: string, segments: Seg[], walks: { startMs: number; endMs: number }[] = [], gestures?: { amount: number; set: string; seated: boolean }): TagSpan[] {
  const out: TagSpan[] = gestures ? kenneyGesturesFor(speakerId, segments, gestures.amount, gestures.set, gestures.seated) : [];
  for (const s of segments) {
    if (s.speakerId !== speakerId) continue;
    for (const raw of s.tags ?? []) {
      const { tag, at } = splitTag(raw);
      if (moodFace(tag) || /^(faces|turns|looks at|camera)\b/i.test(tag)) continue;
      const start = tagStart(s, at);
      // a walk lasts as long as the walk itself, from the Direct step's staging
      const w = /^(walks|goes|moves|runs|steps|comes)\b.*\bto\b/i.test(tag) ? walks.find((x) => x.startMs >= start - 1) : undefined;
      out.push(w ? { startMs: w.startMs, endMs: w.endMs, tag: "walks" } : { startMs: start, endMs: s.endMs, tag });
    }
  }
  return out;
}

export const kenneyLid = (state: string | undefined): number | null => (state === "closed" ? 2 : state === "half" ? 1 : null);
