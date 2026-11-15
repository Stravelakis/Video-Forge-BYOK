// ---------------------------------------------------------------------------
// Pop-ups from the script (#20, 28 Oct 2026): "[pop red flag]", "[pop d20]",
// "[pop κόκκινη σημαία]" or an emoji tag "[🎉]" on a line makes an animated
// icon (characters/icons/icons.mjs) pop up beside that speaker as the line
// starts. Same in the preview and the render.
//
// Relative imports only (no "@/"): Remotion's own webpack renders this too.
// ---------------------------------------------------------------------------

import { findIcon, isEmoji, type Pop } from "../../../characters/icons/icons.mjs";
import type { NarrationSegment } from "../../store/types";
import { splitTag, tagStart } from "../direct/directions.ts";

export interface SpeakerPop extends Pop { speakerId: string; slot: number; picture?: string }

/** "[pop emoji dog-face]" or "[pop peep standing-12]": the shelf file it names, or null. */
export function pictureTag(tag: string): string | null {
  const m = tag.trim().match(/^(?:pop|icon)\s*:?\s+(emoji|peep)\s+([a-z0-9-]+)$/i);
  return m ? `${m[1].toLowerCase() === "emoji" ? "emoji" : "peeps"}/${m[2].toLowerCase()}.png` : null;
}

const SHOW_MS = 2200;

/** Every pop on every line: [pop …] tags and emoji tags, a little apart when a line has two. */
export function buildPopTracks(segments: NarrationSegment[]): SpeakerPop[] {
  const out: SpeakerPop[] = [];
  for (const seg of segments) {
    let n = 0;
    for (const raw of seg.tags ?? []) {
      const { tag: t, at } = splitTag(raw);
      const lineStart = tagStart(seg, at);
      const picture = pictureTag(t);
      if (picture) {
        const startMs = lineStart + n * 450;
        out.push({ speakerId: seg.speakerId, picture, startMs, endMs: Math.min(startMs + SHOW_MS, Math.max(seg.endMs, startMs + SHOW_MS)), slot: n });
        n++;
        continue;
      }
      const m = t.match(/^(pop|icon|εικονίδιο)\s*:?\s+(.+)$/i);
      const icon = m ? findIcon(m[2]) : null;
      const emoji = !m && isEmoji(t) ? t : null;
      if (!icon && !emoji) continue;
      const startMs = lineStart + n * 450;
      out.push({ speakerId: seg.speakerId, icon: icon ?? undefined, emoji: emoji ?? undefined, startMs, endMs: Math.min(seg.endMs + 400, startMs + SHOW_MS), slot: n });
      n++;
    }
  }
  return out;
}
