// ---------------------------------------------------------------------------
// Animated pop-ups beside the speakers (src/lib/motion/popTracks.ts), one
// full-frame canvas over the stage. Placed above the speaker's head, to the
// side away from the frame's edge; a second pop on the same line sits beside
// the first. The same component in the preview and the render.
//
// Relative imports only (no "@/"): Remotion's own webpack renders this too.
// ---------------------------------------------------------------------------

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { drawPop } from "../../../characters/icons/icons.mjs";
import type { SpeakerPop } from "../../lib/motion/popTracks";

interface Placed { id: string; x: number; y: number; size: number }

export function PopLayer({ pops, speakers, width, height, timeMs, pictureUrl, hold }: { pops: SpeakerPop[]; speakers: Placed[]; width: number; height: number; timeMs: number; pictureUrl?: (rel: string) => string; hold?: () => () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const live = pops.filter((p) => timeMs >= p.startMs && timeMs < p.endMs);
  const pictures = useRef(new Map<string, HTMLImageElement>());
  const [, setLoaded] = useState(0);
  const wanted = [...new Set(pops.flatMap((p) => (p.picture ? [p.picture] : [])))].join("|");
  const [release] = useState(() => (wanted ? hold?.() : undefined));
  useEffect(() => {
    if (!wanted || !pictureUrl) { release?.(); return; }
    let left = wanted.split("|").length;
    const done = () => { left--; setLoaded((n) => n + 1); if (left <= 0) release?.(); };
    for (const rel of wanted.split("|")) {
      if (pictures.current.has(rel)) { done(); continue; }
      const img = new Image(); img.crossOrigin = "anonymous"; img.onload = done; img.onerror = done; img.src = pictureUrl(rel); pictures.current.set(rel, img);
    }
  }, [wanted]); // eslint-disable-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const dpr = typeof window !== "undefined" ? Math.min(2, window.devicePixelRatio || 1) : 1;
    const W = Math.max(2, Math.round(width * dpr)), H = Math.max(2, Math.round(height * dpr));
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    for (const p of live) {
      const sp = speakers.find((s) => s.id === p.speakerId);
      if (!sp) continue;
      const box = sp.size * W;
      const side = sp.x < 0.5 ? 1 : -1; // towards the middle of the frame
      const size = Math.max(W * 0.06, box * 0.32);
      const x = sp.x * W + side * (box * 0.42 + p.slot * size * 1.15);
      const y = sp.y * H - box * 0.42;
      const px = Math.min(W - size * 0.7, Math.max(size * 0.7, x)), py = Math.max(size * 0.7, y);
      if (p.picture) {
        const img = pictures.current.get(p.picture);
        if (!img?.complete || !img.naturalWidth) continue;
        // springs in, floats, fades out
        const age = timeMs - p.startMs, left_ = p.endMs - timeMs, u = Math.min(1, age / 260);
        const s = (1 + 2.2 * Math.pow(u - 1, 3) + 1.2 * Math.pow(u - 1, 2)) * size * 1.5, k = img.naturalWidth / img.naturalHeight;
        ctx.globalAlpha = Math.min(1, left_ / 220); const w = k >= 1 ? s : s * k, h = k >= 1 ? s / k : s;
        ctx.drawImage(img, px - w / 2, py - h / 2 + Math.sin(age / 260) * size * .05, w, h); ctx.globalAlpha = 1;
      } else drawPop(ctx, p, px, py, size, timeMs);
    }
  });
  if (!pops.length) return null;
  return <canvas ref={ref} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 11 }} />;
}
