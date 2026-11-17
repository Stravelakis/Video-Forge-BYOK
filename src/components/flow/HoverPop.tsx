// ---------------------------------------------------------------------------
// Hover a character and it pops out large, alive, beside the mouse. Big: up to
// 1024 px each way, or as much as the window allows (never under 300).
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { create } from "zustand";
import { KenneyAvatar } from "../canvas/KenneyAvatar";
import { kenneyAsset } from "../canvas/KenneyLive";
import { kenneyGesturesFor } from "../../lib/kenney/signals";
import type { Framing, KenneyCard, KenneySignal } from "../../lib/kenney/actor";

interface Pop { rect: DOMRect; render: (size: number) => ReactNode; label: string; note?: string }
const usePop = create<{ pop: Pop | null; set: (p: Pop | null) => void }>((set) => ({ pop: null, set: (pop) => set({ pop }) }));

export function HoverPopLayer() {
  const pop = usePop((s) => s.pop);
  const set = usePop((s) => s.set);
  useEffect(() => {
    const close = () => set(null);
    window.addEventListener("scroll", close, true);
    return () => window.removeEventListener("scroll", close, true);
  }, [set]);
  if (!pop) return null;
  const W = window.innerWidth, H = window.innerHeight, GAP = 18;
  const size = Math.max(300, Math.min(1024, H - 70, Math.max(W - pop.rect.right, pop.rect.left) - GAP * 2));
  const right = W - pop.rect.right >= pop.rect.left;
  const left = right ? Math.min(pop.rect.right + GAP, W - size - GAP) : Math.max(GAP, pop.rect.left - GAP - size);
  const top = Math.max(12, Math.min(H - size - 46, pop.rect.top + pop.rect.height / 2 - size / 2));
  return createPortal(
    <div className="flow-pop" style={{ left, top, width: size }} data-tip={pop.label}>
      <div className="flow-pop-stage" style={{ width: size, height: size }}>{pop.render(size)}</div>
      <div className="flow-pop-cap" data-tip={pop.label}><b>{pop.label}</b>{pop.note ? <span>{pop.note}</span> : null}</div>
    </div>,
    document.body,
  );
}

/** Wrap a tile: while the mouse rests on it, `render` is shown large. */
export function PopOn({ render, label, note, children }: { render: (size: number) => ReactNode; label: string; note?: string; children: ReactNode }) {
  const set = usePop((s) => s.set);
  const timer = useRef<number | undefined>(undefined);
  const el = useRef<HTMLDivElement>(null);
  const hide = useCallback(() => { window.clearTimeout(timer.current); set(null); }, [set]);
  useEffect(() => hide, [hide]);
  return (
    <div ref={el} className="flow-popon" onMouseEnter={() => { timer.current = window.setTimeout(() => { if (el.current) set({ rect: el.current.getBoundingClientRect(), render, label, note }); }, 130); }} onMouseLeave={hide}>
      {children}
    </div>
  );
}

const TALK = [1, 10, 3, 5, 2, 12, 7, 11, 0, 4, 8, 1, 6, 0];

/** A 3D character alive on its own clock, talking. */
/** Pretend lines (2.6 s each, two minutes) so a preview can show the automatic gestures. */
const DEMO_LINES = Array.from({ length: 46 }, (_, i) => ({ speakerId: "demo", startMs: i * 2600, endMs: i * 2600 + 2400, text: "and so it all went on for a while", tags: [] as string[] }));

export function KenneyDemo({ card, size, framing = "body", mood, gestures }: { card: KenneyCard; size: number; framing?: Framing; mood?: string; gestures?: number }) {
  const tags = useMemo(() => (gestures === undefined ? undefined : kenneyGesturesFor("demo", DEMO_LINES, gestures, card.set, card.motion === "sit")), [gestures, card.set, card.motion]);
  const [ms, setMs] = useState(0);
  useLayoutEffect(() => {
    let id = 0; const t0 = performance.now();
    const tick = (now: number) => { setMs(now - t0); id = requestAnimationFrame(tick); };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, []);
  const m = mood ?? card.face?.mood ?? "open";
  const at = useCallback((t: number): KenneySignal => ({ viseme: t % 4000 < 2800 ? TALK[Math.floor(t / 130) % TALK.length] : 0, talking: t % 4000 < 2800, mood: m }), [m]);
  return <KenneyAvatar card={card} size={size} timeMs={ms} asset={kenneyAsset} signalAt={at} signalKey={"demo" + m} framing={framing} lid={null} tags={tags} />;
}
