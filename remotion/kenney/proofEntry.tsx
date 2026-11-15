// Proof render: three Kenney characters speaking one line, through the real avatar
// component and the real HyperFrames path. Run with `node tools/kenney-proof.mjs`.
import { useCallback, useMemo } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { AbsoluteFill, continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { FrameRoot, allLoaded, type VideoConfig } from "../hf/remotionShim";
import { KenneyAvatar } from "../../src/components/canvas/KenneyAvatar";
import type { KenneyCard, KenneySignal } from "../../src/lib/kenney/actor";

interface P { track: { t: number; viseme: number }[]; cast: { card: KenneyCard; mood: string; x: number; talks: boolean }[] }
declare global { interface Window { __P: P; __C: VideoConfig; __vfTimeline: unknown; __vfLoaded: Promise<void> } }

function Scene({ track, cast }: P) {
  const frame = useCurrentFrame(); const { fps, width, height, durationInFrames } = useVideoConfig();
  const timeMs = (frame / fps) * 1000;
  const asset = useCallback((rel: string) => staticFile("kenney/" + rel), []);
  const end = (durationInFrames / fps) * 1000 - 400;
  const signals = useMemo(() => cast.map((c) => (ms: number): KenneySignal => {
    let v = 0; for (const f of track) { if (f.t * 1000 <= ms) v = f.viseme; else break; }
    return { viseme: c.talks ? v : 0, talking: c.talks && ms < end, mood: c.mood };
  }), [cast, track, end]);
  const hold = useCallback(() => { const h = delayRender("3D"); return () => continueRender(h); }, []);
  const size = height * .92;
  return (
    <AbsoluteFill style={{ background: "linear-gradient(#3b3550,#6d5a6e)" }}>
      {cast.map((c, i) => (
        <div key={i} style={{ position: "absolute", left: c.x * width - size / 2, top: (height - size) / 2 }}>
          <KenneyAvatar card={c.card} size={size} timeMs={timeMs} asset={asset} signalAt={signals[i]} signalKey="proof" hold={hold} lid={null} />
        </div>
      ))}
    </AbsoluteFill>
  );
}

const root = createRoot(document.getElementById("vf-react")!);
let frame = 0;
const draw = (f: number) => { frame = Math.max(0, Math.min(window.__C.durationInFrames - 1, f)); flushSync(() => root.render(<FrameRoot frame={frame} config={window.__C}><Scene {...window.__P} /></FrameRoot>)); };
draw(0);
window.__vfLoaded = allLoaded().then(() => draw(frame));
const secs = () => frame / window.__C.fps, dur = window.__C.durationInFrames / window.__C.fps;
const tl = { pause: () => tl, play: () => tl, paused: () => true, isActive: () => false, duration: () => dur, totalDuration: () => dur, progress: () => secs() / dur,
  time(t?: number): unknown { if (t === undefined) return secs(); draw(Math.round(t * window.__C.fps)); return tl; },
  totalTime(t?: number) { return tl.time(t); }, seek(t: number) { draw(Math.round(t * window.__C.fps)); return tl; } };
window.__vfTimeline = tl;
