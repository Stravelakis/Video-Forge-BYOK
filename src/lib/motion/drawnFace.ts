// ---------------------------------------------------------------------------
// A drawn character's face at one moment, with everything BLENDED (Ak, 11 Nov
// 2026): the mouth morphs from shape to shape, the brows glide, the blinks
// ease. One function for the preview (App.tsx) and the render
// (VideoComposition.tsx), so they can't disagree.
// Relative imports only: the render bundler builds this too.
// ---------------------------------------------------------------------------

import { DRAWN_MOUTH_MORPH_MS, blinkBlendAt, browBlendAt, moodAt, moodFace, type BrowSpan } from "./facePerformance";
import { visemeBlendAt } from "../visemes/timeline";
import { SMILE_VISEME, VISEME } from "../visemes/visemeMap";

type Track = Parameters<typeof visemeBlendAt>[0];

export function drawnFaceAt(o: {
  id: string; timeMs: number; track: Track | undefined; visemeFadeMs: number; idleMotion: number;
  brows: BrowSpan[] | undefined; moods: Parameters<typeof moodAt>[0];
}) {
  const fade = Math.max(o.visemeFadeMs, DRAWN_MOUTH_MORPH_MS) / 1000;
  const b = o.track ? visemeBlendAt(o.track, o.timeMs / 1000, fade) : { from: VISEME.NEUTRAL, to: VISEME.NEUTRAL, mix: 1 };
  // the resting face follows the feeling: a fond line rests on a smile, an astonished one on wide eyes
  const face = moodFace(moodAt(o.moods, o.timeMs));
  const rest = (v: number) => (face?.smile && v === VISEME.NEUTRAL ? SMILE_VISEME : v);
  const lid = blinkBlendAt(o.id, o.timeMs, o.idleMotion);
  const at = (state: string) => (state === "open" && face?.lid ? face.lid : state);
  const brow = browBlendAt(o.brows, o.timeMs);
  return {
    viseme: rest(b.to), prevViseme: rest(b.from), mix: b.mix,
    lidFrom: at(lid.from), lidTo: at(lid.to), lidMix: lid.mix,
    browLeft: brow.to, browRight: brow.to, browFrom: brow.from, browMix: brow.mix,
  };
}
