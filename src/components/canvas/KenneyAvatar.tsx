// ---------------------------------------------------------------------------
// A Kenney 3D character as a speaker, next to the drawn character (CharacterAvatar)
// and the picture puppet (PuppetAvatar). Same signals, drawn by src/lib/kenney/actor.
//
// Loading is asynchronous, so a Remotion render passes `hold`: the frame waits
// until the character is ready. The live preview simply shows nothing for a moment.
// Relative imports only: Remotion's own webpack builds this too.
// ---------------------------------------------------------------------------

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { KenneyActor, type Framing, type KenneyCard, type KenneySignal } from "../../lib/kenney/actor";
import type { TagSpan } from "../../lib/kenney/motions";

interface Props {
  card: KenneyCard;
  size: number;
  timeMs: number;
  /** Rel path inside the Kenney folder -> loadable URL. */
  asset: (rel: string) => string;
  /** The speaker's timeline: what they are saying and feeling at any moment. */
  signalAt: (ms: number) => KenneySignal;
  /** Changes when the timeline changes. */
  signalKey: string;
  /** Script tags on this speaker's lines ("waves", "draw sword"), for their motions. */
  tags?: TagSpan[];
  /** 1 half, 2 closed (a blink); null = whatever the mood's eyes are. */
  lid?: number | null;
  framing?: Framing;
  /** Turned towards someone, in radians (0 = to camera). */
  yaw?: number;
  /** Render only: keep the frame open until `release` is called. */
  hold?: () => () => void;
}

export function KenneyAvatar({ card, size, timeMs, asset, signalAt, signalKey, tags, lid = null, framing = "body", hold, yaw = 0 }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const actor = useRef<KenneyActor | null>(null);
  const [ready, setReady] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const cardKey = JSON.stringify([card, tags ?? []]);
  // a render is exact; the preview doubles up on sharp screens
  const scale = hold ? 1 : Math.min(2, typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1) * 2;
  const px = Math.max(8, Math.round(size * scale));

  // Taken while the first frame is being built, so a render can't capture before this character is in.
  const [release] = useState(() => hold?.());
  useEffect(() => {
    const cv = canvas.current; if (!cv) return;
    let gone = false;
    const [c, t] = JSON.parse(cardKey);
    const a = new KenneyActor(cv, c, asset, t);
    a.load().then(() => {
      if (gone) { a.dispose(); return; }
      actor.current = a; setReady((n) => n + 1);
    }).catch((e) => { console.error(e); setError(String(e?.message ?? e)); }).finally(() => release?.());
    return () => { gone = true; actor.current?.dispose(); actor.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardKey]);

  useLayoutEffect(() => {
    const a = actor.current; if (!a) return;
    a.setSignals(signalKey, signalAt);
    a.draw(timeMs, framing, lid, px, yaw);
  });

  return (
    <div style={{ width: size, height: size, position: "relative" }}>
      <canvas ref={canvas} data-ready={ready} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
      {error && <div data-tip="This 3D character could not be loaded." style={{ position: "absolute", inset: 0, color: "#f88", fontSize: 14 }}>{error}</div>}
    </div>
  );
}
