// ---------------------------------------------------------------------------
// Live pictures for the Characters step (Ak, 10 Nov 2026: the choices must be
// visual). One moving figure for any kind of character, and a small stage that
// shows everyone where they stand, with their frames and sound waves, that can
// be dragged. Positions follow the main preview's rule: centred on x/y, a box
// sp.size wide (fractions of the video's width).
// ---------------------------------------------------------------------------

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { setFor } from "../../../characters/sets/custom.mjs";
import { kenneyAsset } from "../canvas/KenneyLive";
import { formOf, lookById } from "../../../characters/core/index.mjs";
import { CLIPS } from "../creator/drawing";
import { LiveFigure, StillFigure } from "../creator/Figure";
import { LiveFace } from "../panels/LiveFace";
import { WaveformScene } from "../canvas/WaveformScene";
import { buildTracks } from "../../lib/waveform/buildTracks";
import { useProjectStore } from "../../store/useProjectStore";
import type { OutlineShape, SpeakerConfig, TrackWaveform } from "../../store/types";
import { KenneyDemo } from "./HoverPop";
import { CharacterAvatar } from "../canvas/CharacterAvatar";
import { seatSpeakers } from "../../lib/motion/seats";

/** One shared clock per component: milliseconds since it appeared. */
export function useClock(on = true): number {
  const [t, setT] = useState(0);
  useEffect(() => {
    if (!on) return;
    let raf = 0; const t0 = performance.now();
    const tick = (now: number) => { setT(now - t0); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [on]);
  return t;
}

export const RADIUS: Record<OutlineShape, string> = { circle: "50%", rounded: "18%", square: "0%", none: "50%" };

/** The character itself, moving. energy: how much the hands move (drawn), idle vs talking (3D). */
export function CharFigure({ sp, size, energy, still = false }: { sp: SpeakerConfig; size: number; energy?: number; still?: boolean }) {
  if (sp.kenney) {
    if (still) return <KenneyThumb set={sp.kenney.set} base={sp.kenney.base} size={size} label={sp.label} />;
    const motion = sp.kenney.motion === "sit" ? "sit" : energy === undefined ? "talk" : (sp.kenney.motion ?? "idle");
    return <KenneyDemo key={motion} card={{ ...sp.kenney, motion }} size={size} framing={sp.kenneyFraming ?? "body"} gestures={energy} />;
  }
  if (formOf(sp) === "drawn" && sp.character) {
    const look = lookById(sp.character.look);
    const talk = sp.sitting ? { ...(CLIPS.find((c) => c.id === "sit") ?? CLIPS[0]), chair: false } : CLIPS.find((c) => c.id === "talk") ?? CLIPS[0];
    // in a frame (a face format) they show head and shoulders; free-standing, the whole body
    const framing = sp.outlineShape && sp.outlineShape !== "none" ? "head" : "full";
    return (
      <div style={{ width: size, height: size, position: "relative" }}>
        {still ? <StillFigure card={sp.character} look={look} framing={framing} /> : <LiveFigure card={sp.character} look={look} clip={{ ...talk, energy: energy ?? sp.gestures ?? .5 }} framing={framing} fps={30} pad={0.04} />}
      </div>
    );
  }
  if (sp.puppetPath) return <LiveFace path={sp.puppetPath} label={sp.label} color={sp.borderColor} size={size} talking={!still} />;
  return <div data-tip={sp.label} style={{ width: size, height: size, borderRadius: "50%", background: sp.borderColor, display: "grid", placeItems: "center", color: "#000", fontWeight: 700, fontSize: size * .35 }}>{sp.label.slice(0, 1)}</div>;
}

let manifestP: Promise<Record<string, { items: { id: string; thumb: string }[] }>> | null = null;
/** A 3D character's ready-made picture (cheap: no 3D drawing). */
function KenneyThumb({ set, base, size, label }: { set: string; base: string; size: number; label: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    manifestP ??= fetch(kenneyAsset("manifest.json")).then((r) => r.json()).then((m) => m.sets).catch(() => ({}));
    void manifestP.then((sets) => { const it = sets[set]?.items.find((i) => i.id === base); setSrc(it ? kenneyAsset(it.thumb) : null); });
  }, [set, base]);
  return src ? <img src={src} alt={label} data-tip={label} style={{ width: size, height: size, objectFit: "contain" }} /> : <div data-tip={label} style={{ width: size, height: size }} />;
}

/** A plain stand-in: the speaker's initial on a disc in their colour (cheap, for small tiles). */
export function Token({ sp, size, shape }: { sp: Pick<SpeakerConfig, "label" | "borderColor">; size: number; shape?: OutlineShape }) {
  return <div data-tip={sp.label} style={{ width: size, height: size, borderRadius: RADIUS[shape ?? "circle"], background: `color-mix(in srgb, ${sp.borderColor} 35%, #10181d)`, border: `2px solid ${sp.borderColor}`, display: "grid", placeItems: "center", color: "#fff", fontWeight: 700, fontSize: size * .42 }}>{sp.label.slice(0, 1)}</div>;
}

/** The project's picture shape, as width / height. */
export function useAspect(): number {
  const r = useProjectStore((s) => s.render);
  return r?.width && r?.height ? r.width / r.height : 16 / 9;
}

/** What is behind the characters. "set" draws a code-drawn set and seats everyone in it. */
export type Bg = { kind: "image" | "video"; src: string; poster?: string } | { kind: "colour"; css: string } | { kind: "set"; id: string; spec?: unknown; under?: Exclude<Bg, { kind: "set" } | null> } | null;

/** One pass of a code-drawn set (back = behind the people, front = desk, table, podium). */
function SetCanvas({ id, spec, pass, width, height, names }: { id: string; spec?: unknown; pass: "back" | "front"; width: number; height: number; names: string[] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const cv = ref.current; const set = setFor({ id, spec }); if (!cv || !set) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(width * dpr); cv.height = Math.round(height * dpr);
    const c = cv.getContext("2d")!; c.scale(dpr, dpr); c.clearRect(0, 0, width, height);
    (set as any)[pass](c, width, height, { title: id === "news" ? "NEWS" : id === "stage" ? "TALK" : "", names }); // eslint-disable-line @typescript-eslint/no-explicit-any
  }, [id, spec, pass, width, height, names.join("|")]); // eslint-disable-line react-hooks/exhaustive-deps
  return <canvas ref={ref} aria-hidden style={{ position: "absolute", inset: 0, width, height, pointerEvents: "none", zIndex: pass === "back" ? 0 : 3 }} />;
}

/** Where a set seats each speaker, as stage fractions (feet on the seat, height = the seat's person height). */
export function seatIn(id: string, speakers: SpeakerConfig[], width: number, height: number, spec?: unknown): SpeakerConfig[] {
  const set = setFor({ id, spec }) as unknown as { seats: (n: number, W: number, H: number) => { x: number; y: number; h: number }[] } | null;
  if (!set) return speakers;
  const seats = set.seats(speakers.length, width, height);
  // the same rule as the render (src/lib/motion/seats.ts): 3D by the hips; drawn, hips a little above the seat line
  return speakers.slice(0, seats.length).map((sp, i) => {
    const st = seats[i];
    const room = !!(spec as { sit?: boolean } | undefined)?.sit;
    const size = sp.kenney ? st.h * .78 : st.h * .82;
    // drawn, on a room's chair: seated hips on the seat; otherwise hips a little above the furniture line
    const y = sp.kenney ? st.y - size * .3 : room ? st.y - size * .23 : st.y - st.h * .1;
    return { ...sp, x: st.x / width, y: y / height, size: size / width, outlineShape: "none", borderOpacity: 0, waveform: { ...sp.waveform, enabled: false }, ...(room && sp.kenney ? { kenney: { ...sp.kenney, motion: "sit" } } : room ? { sitting: true } : {}) };
  });
}

function BgLayer({ bg }: { bg: Exclude<Bg, null | { kind: "set" }> }) {
  const st: CSSProperties = { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", zIndex: 0, pointerEvents: "none" };
  if (bg.kind === "colour") return <div style={{ ...st, background: bg.css }} />;
  if (bg.kind === "video") return <video key={bg.src} src={bg.src} poster={bg.poster} muted loop autoPlay playsInline style={st} />;
  return <img key={bg.src} src={bg.src} alt="" style={st} />;
}

interface StageProps {
  speakers: SpeakerConfig[];
  width: number;
  aspect: number;
  /** Override one speaker's settings, to preview a choice before it's made. */
  preview?: { id: string; patch: Partial<SpeakerConfig> };
  /** Draw these speakers as live figures; the rest as tokens. Default: everyone live. */
  live?: (sp: SpeakerConfig) => boolean;
  selected?: string | null;
  onSelect?: (id: string) => void;
  /** Dragging moves a speaker; omitted = not draggable. */
  onMove?: (id: string, x: number, y: number) => void;
  showWaves?: boolean;
  caption?: { text: string; word: string; color: string };
  className?: string;
  bg?: Bg;
  /** Everyone as a still picture: cheap enough for a page of small previews. */
  still?: boolean;
}

/** The whole picture: everyone at their place, in their frame, with their waves. */
export function MiniStage({ speakers, width, aspect, preview, live, selected, onSelect, onMove, showWaves = true, caption, className = "", bg = null, still = false }: StageProps) {
  const height = Math.round(width / aspect);
  const t = useClock(!still);
  const box = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<{ id: string; dx: number; dy: number } | null>(null);
  const list0 = speakers.map((s) => (preview && s.id === preview.id ? { ...s, ...preview.patch } as SpeakerConfig : s));
  // in a set the preview seats people with the render's own rule (src/lib/motion/seats.ts)
  const seated = bg?.kind === "set";
  const sitRoom = seated && !!(setFor({ id: bg.id, spec: bg.spec }) as { sit?: boolean } | null)?.sit;
  const list = seated ? seatSpeakers(list0, { id: bg.id, spec: bg.spec }, width, height).map((x) => ({ ...x, waveform: { ...x.waveform, enabled: false } })) : list0;
  const tracks = showWaves ? buildTracks(list.map((s) => ({ ...s, waveform: s.waveform })), { ...(list[0]?.waveform as TrackWaveform), enabled: false }, "#fff") : [];
  const at = (e: React.PointerEvent) => { const r = box.current!.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height }; };
  return (
    <div ref={box} className={`flow-stage ${className}`} style={{ width, height }}
      onPointerMove={(e) => { if (!drag || !onMove) return; const p = at(e); onMove(drag.id, clamp(p.x - drag.dx), clamp(p.y - drag.dy)); }}
      onPointerUp={() => setDrag(null)} onPointerLeave={() => setDrag(null)}>
      {bg && bg.kind !== "set" && <BgLayer bg={bg} />}
      {bg?.kind === "set" && bg.under && <BgLayer bg={bg.under} />}
      {bg?.kind === "set" && <SetCanvas id={bg.id} spec={bg.spec} pass="back" width={width} height={height} names={list.map((x) => x.label)} />}
      {bg?.kind === "set" && <SetCanvas id={bg.id} spec={bg.spec} pass="front" width={width} height={height} names={list.map((x) => x.label)} />}
      {list.map((sp) => {
        const s = sp.size * width;
        const frame = sp.outlineShape !== "none" && (sp.borderOpacity ?? 0) > 0;
        const st: CSSProperties = { position: "absolute", left: `${sp.x * 100}%`, top: `${sp.y * 100}%`, width: s, height: s, transform: "translate(-50%, -50%)", cursor: onMove ? (drag?.id === sp.id ? "grabbing" : "grab") : "default", touchAction: "none", zIndex: selected === sp.id ? 3 : 2 };
        return (
          <div key={sp.id} style={st} className={`flow-stage-who ${selected === sp.id ? "on" : ""}`}
            data-tip={onMove ? `Drag ${sp.label} to move them.` : sp.label}
            onPointerDown={(e) => { onSelect?.(sp.id); if (!onMove) return; e.preventDefault(); (e.target as Element).setPointerCapture?.(e.pointerId); const p = at(e); setDrag({ id: sp.id, dx: p.x - sp.x, dy: p.y - sp.y }); }}>
            {frame && <i className="flow-stage-frame" style={{ borderRadius: RADIUS[sp.outlineShape], borderColor: sp.borderColor, opacity: sp.borderOpacity, borderWidth: Math.max(1, ((sp.frameWidth ?? sp.size * 1080 * 0.015) * width) / 1080) }} />}
            {seated && sp.character && !sp.kenney ? (
              // seated drawn characters: the render's own avatar, sitting on a room's chair
              <CharacterAvatar card={sp.character} size={s} timeMs={t} viseme={0} moveSpans={sitRoom ? SIT : undefined} active bgOpacity={0} borderOpacity={0} />
            ) : still ? <CharFigure sp={sp} size={s} still /> : (live ? live(sp) : true) || (sp.kenney && list.length <= 6) ? <CharFigure sp={sp} size={s} /> : <CharFigure sp={sp} size={s} still />}
            <span className="flow-stage-name" style={{ ["--c" as string]: sp.borderColor }}>{sp.label}</span>
          </div>
        );
      })}
      {showWaves && tracks.length > 0 && <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 4 }}><WaveformScene tracks={tracks} width={width} height={height} timeMs={t} analysis={null} musicAnalysis={null} /></div>}
      {caption && <div className="flow-stage-cap">{caption.text.split(" ").map((w, i) => <span key={i} data-tip="A sample subtitle: their colour lights up the spoken word." style={w === caption.word ? { color: caption.color } : undefined}>{w} </span>)}</div>}
    </div>
  );
}
const SIT = [{ startMs: 0, endMs: 36e5, move: "ual-sit-idle", prop: "none", seed: 1 }];
const clamp = (v: number) => Math.max(0, Math.min(1, Math.round(v * 1000) / 1000));
