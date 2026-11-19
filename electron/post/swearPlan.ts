// ---------------------------------------------------------------------------
// Swear clean-up for one render: which stretches of the narration to bleep or
// mute, and the subtitle text with the words starred out. The rules and the
// matching are in src/lib/post/swears.ts; the bleep itself is in postGraph.ts.
// The picture's subtitles and the .srt/.vtt files both use `segments` from
// here, so what is heard and what is read always agree.
// ---------------------------------------------------------------------------

import { buildCues } from "../../src/lib/subtitles/wordTiming";
import type { NarrationSegment } from "../../src/store/types";
import type { PostJob } from "../../src/lib/post/postSettings";
import { activeRules, cleanSwears, maskSwears, mergeWindows, swearWindows, wordsFromIslands, PAD_ESTIMATED_MS, PAD_ISLANDS_MS, PAD_MEASURED_MS, type TimedWord } from "../../src/lib/post/swears";

export interface SwearPlan {
  /** The segments for the subtitles (starred out when bleeping or muting). */
  segments: NarrationSegment[];
  censor: { kind: "bleep" | "mute"; windows: [number, number][] } | null;
  warnings: string[];
}

/** Does this render need swear clean-up at all? (Then it is worth listening
 *  for where the voice is heard: speechIslands in runPost.ts.) */
export function swearsActive(post: PostJob | null | undefined): boolean {
  return activeRules(cleanSwears(post?.swears)).length > 0;
}

/** `islands`: where the voice is heard, in ms (speechIslands), used for lines
 *  without measured word times. Without them the times come from letter counts. */
export function swearPlan(post: PostJob | null | undefined, segments: NarrationSegment[], pauses: number[], islands?: [number, number][] | null): SwearPlan {
  const s = cleanSwears(post?.swears);
  const rules = activeRules(s);
  if (!rules.length || !segments.length) return { segments, censor: null, warnings: [] };

  // Each line's word times: measured, else from the heard stretches, else
  // from letter counts. The bleep is widened by how sure the time is.
  let windows: [number, number][] = [];
  for (const seg of segments) {
    const count = seg.text.trim().split(/\s+/).filter(Boolean).length;
    let words: TimedWord[] | null = null;
    let pad = PAD_MEASURED_MS;
    if (seg.words && seg.words.length === count) words = seg.words;
    if (!words && islands?.length) {
      words = wordsFromIslands(seg, islands);
      pad = PAD_ISLANDS_MS;
    }
    if (!words) {
      words = buildCues([seg], 100000, pauses).flatMap((c) => c.words);
      pad = PAD_ESTIMATED_MS;
    }
    windows.push(...swearWindows(words, rules, pad));
  }
  windows = mergeWindows(windows);
  if (!windows.length) return { segments, censor: null, warnings: [] };

  const warnings: string[] = [];
  if (s.mode === "swap") {
    warnings.push(
      `[video-forge] swear clean-up: ${windows.length} swear word(s) are still in the voices, so they were bleeped. ` +
        "Softer words are spoken only when the voices are made with \"Softer word\" on: make the voices again. Words with no softer word written are always bleeped.",
    );
  }
  const shown = segments.map((seg) => ({
    ...seg,
    text: maskSwears(seg.text, rules),
    ...(seg.words ? { words: seg.words.map((w) => ({ ...w, text: maskSwears(w.text, rules) })) } : {}),
  }));
  return { segments: shown, censor: { kind: s.mode === "mute" ? "mute" : "bleep", windows }, warnings };
}
