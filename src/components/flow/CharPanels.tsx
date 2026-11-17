// ---------------------------------------------------------------------------
// The Characters step's setting panels, as pictures (Ak, 10 Nov 2026):
//   colour     the character with its colour; hover a swatch to see the change
//   demeanour  the character itself, calm hands next to lively hands
//   waves      frame shapes, then styles / positions / edge as little videos
//   place      every character on a stage: drag, or type exact numbers
// ---------------------------------------------------------------------------

import { useState } from "react";
import { formOf } from "../../../characters/core/index.mjs";
import { useProjectStore } from "../../store/useProjectStore";
import { WaveformControls } from "../panels/WaveformControls";
import type { OutlineShape, SpeakerConfig } from "../../store/types";
import { CharFigure, MiniStage, RADIUS, useAspect } from "./CharPreview";

const SWATCHES = ["#5be3b5", "#7fd3ff", "#4f8bff", "#b48cff", "#ff7fb0", "#ff5f5f", "#ffb35b", "#f2e35b", "#a6e35b", "#ffffff", "#c9a27a", "#8a94a6"];

export function ColourPanel({ sp }: { sp: SpeakerConfig }) {
  const update = useProjectStore((s) => s.updateSpeaker);
  const speakers = useProjectStore((s) => s.speakers);
  const aspect = useAspect();
  const [hover, setHover] = useState<string | null>(null);
  const colour = hover ?? sp.borderColor;
  const used = speakers.filter((o) => o.id !== sp.id).map((o) => o.borderColor.toLowerCase());
  return (
    <div className="space-y-4">
      <p className="text-sm text-neutral-300" data-tip="What the colour changes.">Their colour runs their sound waves, their frame and the highlighted words of the subtitles. Rest the mouse on a colour to try it.</p>
      <MiniStage speakers={[sp]} width={620} aspect={aspect} preview={{ id: sp.id, patch: { borderColor: colour, x: .5, y: .45, size: .5, waveform: { ...sp.waveform, enabled: true } } }} caption={{ text: "This is how my words light up", word: "light", color: colour }} />
      <div className="flow-swatches" onMouseLeave={() => setHover(null)}>
        {SWATCHES.map((c) => (
          <button key={c} className={`flow-swatch ${sp.borderColor.toLowerCase() === c ? "on" : ""}`} style={{ background: c, ["--sw" as string]: c }}
            onMouseEnter={() => setHover(c)} onClick={() => update(sp.id, { borderColor: c })}
            aria-label={`Colour ${c}`} data-tip={used.includes(c) ? "Another character already has this colour." : "Use this colour."}>{used.includes(c) ? "•" : ""}</button>
        ))}
        <label className="flow-field" data-tip="Any colour you like.">
          <span className="label-etched" data-tip="Pick any colour.">Any colour</span>
          <input type="color" value={sp.borderColor} onChange={(e) => update(sp.id, { borderColor: e.target.value })} style={{ width: 64, height: 44 }} aria-label="Any colour" />
        </label>
      </div>
    </div>
  );
}

export function DemeanourPanel({ sp }: { sp: SpeakerConfig }) {
  const update = useProjectStore((s) => s.updateSpeaker);
  const g = sp.gestures ?? .5;
  const puppet = !sp.kenney && formOf(sp) !== "drawn";
  // 3D: the animated people have talking motions; Mini people and pets can only wave and point
  const threeD = !!sp.kenney && sp.kenney.set !== "animated";
  const opts: [number, string, string][] = [[.25, "Calm hands", "Moves their hands on one line in four."], [g, "Now", "How they are set now. Move the slider below."], [1, "Lively hands", "Moves their hands on every line."]];
  return (
    <div className="space-y-4">
      {puppet || threeD ? (
        <p className="text-sm text-neutral-300" data-tip={threeD ? "Mini people and pets have few motions of their own." : "Picture puppets have no hands."}>
          {threeD ? `This kind of 3D character has no talking motions, only a wave and a point, so the gesture amount changes little for ${sp.label}. The animated people use it fully.` : `Picture puppets talk with their face only, so the gesture amount changes nothing for ${sp.label}.`}
        </p>
      ) : (
        <div className="flow-gest">
          {opts.map(([k, name, tip], i) => (
            <button key={name} className={i === 1 ? "on" : ""} onClick={() => i !== 1 && update(sp.id, { gestures: k })} data-tip={i === 1 ? tip : `${tip} Click to use it.`}>
              <CharFigure sp={sp} size={i === 1 ? 260 : 190} energy={k} />
              <b>{name}</b><small>{Math.round(k * 100)}%</small>
            </button>
          ))}
        </div>
      )}
      {!puppet && !threeD && (
        <label className="flow-field" data-tip="How often their hands move by themselves while talking.">
          <span className="label-etched" data-tip="How often their hands move by themselves.">Gestures {Math.round(g * 100)}%</span>
          <input type="range" min={0} max={1} step={.05} value={g} onChange={(e) => update(sp.id, { gestures: Number(e.target.value) })} />
        </label>
      )}
      <label className="flow-field" data-tip="A sentence or two: who they are. The AI reads this when it writes for them.">
        <span className="label-etched" data-tip="Who they are.">Who they are</span>
        <textarea rows={3} value={sp.description ?? ""} onChange={(e) => update(sp.id, { description: e.target.value || undefined })} />
      </label>
      <label className="flow-field" data-tip="How they talk and behave.">
        <span className="label-etched" data-tip="How they talk and behave.">Personality</span>
        <textarea rows={3} value={sp.personality ?? ""} onChange={(e) => update(sp.id, { personality: e.target.value || undefined })} />
      </label>
    </div>
  );
}

const SHAPES: { id: OutlineShape; name: string; tip: string }[] = [
  { id: "none", name: "No frame", tip: "No frame: the waves follow a circle round them." },
  { id: "circle", name: "Circle", tip: "A round frame." },
  { id: "rounded", name: "Rounded square", tip: "A square frame with soft corners." },
  { id: "square", name: "Square", tip: "A square frame with sharp corners." },
];

export function WavesPanel({ sp }: { sp: SpeakerConfig }) {
  const update = useProjectStore((s) => s.updateSpeaker);
  const setWave = useProjectStore((s) => s.setSpeakerWaveform);
  const speakers = useProjectStore((s) => s.speakers);
  const aspect = useAspect();
  const lineOn = sp.outlineShape !== "none" && (sp.borderOpacity ?? 0) > 0;
  const width = sp.frameWidth ?? Math.round(sp.size * 1080 * 0.015);
  return (
    <div className="flow-split">
      {/* the preview stays in view while the controls beside it scroll (Ak, 11 Nov 2026) */}
      <div className="flow-split-stick" data-tip="How it looks in the video. It stays here while you change things.">
        <MiniStage speakers={speakers} width={480} aspect={aspect} selected={sp.id} live={(o) => o.id === sp.id} />
      </div>
      <div className="space-y-4">
        <div>
          <div className="label-etched mb-2" data-tip="The shape round the character. Waves 'around face' follow it.">Frame shape</div>
          <div className="flow-shapes">
            {SHAPES.map((s) => (
              <button key={s.id} className={`wave ${sp.outlineShape === s.id ? "on" : ""}`} onClick={() => update(sp.id, { outlineShape: s.id })} data-tip={s.tip} aria-label={s.name}>
                <span className="pic" style={{ width: 84, height: 84, display: "grid", placeItems: "center" }}>
                  <i style={{ width: 62, height: 62, borderRadius: RADIUS[s.id], border: s.id === "none" ? "2px dashed rgba(255,255,255,.25)" : `3px solid ${sp.borderColor}`, display: "block" }} />
                </span>
                <span className="name">{s.name}</span>
              </button>
            ))}
          </div>
        </div>
        {sp.outlineShape !== "none" && (
          <div>
            <div className="label-etched mb-2" data-tip="The line drawn round the frame: on or off, thin or thick.">Frame line</div>
            <div className="flow-shapes">
              {LINES.map((l) => {
                const on = l.px === 0 ? !lineOn : lineOn && Math.abs(width - l.px) <= 1;
                return (
                  <button key={l.id} className={`wave ${on ? "on" : ""}`} onClick={() => update(sp.id, l.px === 0 ? { borderOpacity: 0 } : { borderOpacity: Math.max(sp.borderOpacity || 0, 1), frameWidth: l.px })} data-tip={l.tip} aria-label={l.name}>
                    <span className="pic" style={{ width: 84, height: 84, display: "grid", placeItems: "center" }}>
                      <i style={{ width: 62, height: 62, borderRadius: RADIUS[sp.outlineShape ?? "circle"], border: l.px === 0 ? "2px dashed rgba(255,255,255,.25)" : `${Math.max(1, Math.round(l.px / 2))}px solid ${sp.borderColor}`, display: "block" }} />
                    </span>
                    <span className="name">{l.name}</span>
                  </button>
                );
              })}
            </div>
            {lineOn && (
              <label className="flow-field mt-2" data-tip="Exact thickness, in pixels on a 1080-wide video.">
                <span className="label-etched" data-tip="Line thickness in pixels.">Thickness {width} px</span>
                <input type="range" min={1} max={24} step={1} value={width} onChange={(e) => update(sp.id, { frameWidth: Number(e.target.value) })} aria-label="Frame line thickness" data-tip="Thinner to the left, thicker to the right." />
              </label>
            )}
          </div>
        )}
        <WaveformControls label={`Show ${sp.label}'s sound waves`} value={sp.waveform} onChange={(p) => setWave(sp.id, p)} face={{ color: sp.borderColor, shape: sp.outlineShape, x: sp.x, y: sp.y, size: sp.size, label: sp.label, aspect }} />
      </div>
    </div>
  );
}

const LINES: { id: string; name: string; px: number; tip: string }[] = [
  { id: "off", name: "No line", px: 0, tip: "Keep the shape, hide the line." },
  { id: "thin", name: "Thin", px: 4, tip: "A thin line." },
  { id: "medium", name: "Medium", px: 8, tip: "A medium line." },
  { id: "thick", name: "Thick", px: 14, tip: "A thick line." },
];

export function PlacePanel({ sp, onSelect }: { sp: SpeakerConfig; onSelect: (id: string) => void }) {
  const speakers = useProjectStore((s) => s.speakers);
  const update = useProjectStore((s) => s.updateSpeaker);
  const aspect = useAspect();
  const pct = (v: number) => Math.round(v * 1000) / 10;
  const num = (id: string, key: "x" | "y" | "size", v: string, min: number, max: number) => { const n = Number(v); if (Number.isFinite(n)) update(id, { [key]: Math.max(min, Math.min(max, n / 100)) }); };
  return (
    <div className="space-y-4">
      <p className="text-sm text-neutral-300" data-tip="How to place them.">Drag anyone on the picture, or type exact numbers. Everyone in this video is shown.</p>
      <MiniStage speakers={speakers} width={aspect >= 1 ? 760 : 380} aspect={aspect} selected={sp.id} onSelect={onSelect} onMove={(id, x, y) => update(id, { x, y })} />
      <div className="flow-place">
        <table data-tip="Exact places, in % of the video: across from the left, down from the top, and size.">
          <thead><tr><th data-tip="Who.">Character</th><th data-tip="0% = left edge, 100% = right edge.">Across %</th><th data-tip="0% = top, 100% = bottom.">Down %</th><th data-tip="How wide they are, as % of the video's width.">Size %</th></tr></thead>
          <tbody>
            {speakers.map((o) => (
              <tr key={o.id} className={o.id === sp.id ? "on" : ""} onClick={() => onSelect(o.id)}>
                <td style={{ color: o.borderColor }}>{o.label}</td>
                <td><input type="number" step={0.5} min={0} max={100} value={pct(o.x)} onChange={(e) => num(o.id, "x", e.target.value, 0, 1)} aria-label={`${o.label} across`} data-tip="Across, in %." /></td>
                <td><input type="number" step={0.5} min={0} max={100} value={pct(o.y)} onChange={(e) => num(o.id, "y", e.target.value, 0, 1)} aria-label={`${o.label} down`} data-tip="Down, in %." /></td>
                <td><input type="number" step={0.5} min={5} max={90} value={pct(o.size)} onChange={(e) => num(o.id, "size", e.target.value, .05, .9)} aria-label={`${o.label} size`} data-tip="Size, in %." /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
