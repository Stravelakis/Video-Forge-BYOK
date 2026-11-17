// ---------------------------------------------------------------------------
// Controls for ONE waveform track — used by both a speaker's tab and the
// music tab, so the two can never end up with different capabilities.
//
// Deliberately wider ranges and finer steps than the old global panel had.
// The previous version felt untweakable because Size was capped at 1.8x with a
// 0.05 step and there was no control at all over bar thickness or smoothing —
// the two things that most change how a waveform reads.
// ---------------------------------------------------------------------------

import { HudButton } from "../ui/HudButton";
import { Slider } from "../ui/Slider";
import { Toggle } from "../ui/Toggle";
import { WAVEFORM_STYLES, type TrackWaveform, type OutlineShape } from "../../store/types";
import { useEffect, useState } from "react";
import { WaveformScene } from "../canvas/WaveformScene";
import { buildTracks } from "../../lib/waveform/buildTracks";

// Read from the one list in types.ts rather than repeated here. The lab styles
// rendered correctly for a week and could not be selected, because the union
// was extended and this panel was not — a second copy of the list is exactly
// how that happens again.
const STYLES = WAVEFORM_STYLES;

/** Plain names, where the code's name would not do. "bloomBars" is camelCase
 *  and "boil" is a verb; nobody choosing a look should have to read either. */
const STYLE_LABEL: Partial<Record<TrackWaveform["style"], string>> = {
  bloomBars: "bloom bars",
  centreBar: "centre bar",
  boil: "boiling",
  mesh: "mesh",
};

/** Looks that draw round a centre rather than sampling a path along an edge.
 *  They hide the edge controls. Only the mesh is left, and nothing uses it. */
const isOrbit = (style: string) => style === "mesh";
const POSITIONS: TrackWaveform["position"][] = [
  "speaker", "frame", "circular", "top", "bottom", "left", "right",
];
const POSITION_LABEL: Record<TrackWaveform["position"], string> = {
  speaker: "around face",
  frame: "around the video",
  circular: "circular",
  top: "top",
  bottom: "bottom",
  left: "left",
  right: "right",
};

interface Props {
  value: TrackWaveform;
  onChange: (patch: Partial<TrackWaveform>) => void;
  /** Shown next to the enable toggle, e.g. "Καίτη's waveform". */
  label: string;
  /** Music has no face to ring, so it doesn't get the "around face" option. */
  canAnchorToFace?: boolean;
  /** The speaker's colour and frame shape: when given, styles are chosen from
   *  live picture tiles drawn on that frame, not from a list of names (Ak,
   *  12 Oct 2026: "the visuals are the way to understand which to choose"). */
  face?: Face;
}
/** The speaker the pictures are drawn for: colour, frame shape and, when known, where they stand. */
interface Face { color: string; shape: OutlineShape; x?: number; y?: number; size?: number; label?: string; aspect?: number }

/** One clock for all the tiles, so they move together and cost one loop. */
function useTileClock() {
  const [t, setT] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      setT(now - start);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return t;
}

const TILE = 96;
const SCREEN = 150;

/** A tiny picture of the whole video: the speaker at their place and the wave as it would be. */
function ScreenTile({ value, patch, face, t, on, name, tip, onClick }: { value: TrackWaveform; patch: Partial<TrackWaveform>; face: Face; t: number; on: boolean; name: string; tip: string; onClick: () => void }) {
  const aspect = face.aspect ?? 16 / 9;
  const w = aspect >= 1 ? SCREEN : Math.round(SCREEN * 0.62), h = Math.round(w / aspect);
  const x = face.x ?? .5, y = face.y ?? .5, size = face.size ?? .3;
  const tracks = buildTracks([{ borderColor: face.color, outlineShape: face.shape, x, y, size, waveform: { ...value, ...patch, enabled: true } }], { ...value, enabled: false }, face.color);
  const d = size * w;
  const radius = face.shape === "square" ? "0%" : face.shape === "rounded" ? "18%" : "50%";
  return (
    <button className={`wave screen ${on ? "on" : ""}`} onClick={onClick} aria-label={name} data-tip={tip}>
      <span className="pic" style={{ width: w, height: h }}>
        <i className="who" style={{ left: `${x * 100}%`, top: `${y * 100}%`, width: d, height: d, borderRadius: radius, borderColor: face.color }}>{(face.label ?? "").slice(0, 1)}</i>
        <WaveformScene tracks={tracks} width={w} height={h} timeMs={t} analysis={null} musicAnalysis={null} />
      </span>
      <span className="name">{name}</span>
    </button>
  );
}

function StyleTiles({ value, onChange, face }: { value: TrackWaveform; onChange: (p: Partial<TrackWaveform>) => void; face: Face }) {
  const t = useTileClock();
  // along an edge, each style is shown on a little picture of the whole video
  if (value.position !== "speaker") return (
    <div className="forge-waves">
      {STYLES.filter((s) => !isOrbit(s)).map((s) => <ScreenTile key={s} value={value} patch={{ style: s }} face={face} t={t} on={value.style === s} name={STYLE_LABEL[s] ?? s} tip={`Draws the voice as "${STYLE_LABEL[s] ?? s}". The picture shows how it will move.`} onClick={() => onChange({ style: s })} />)}
    </div>
  );
  return (
    <div className="forge-waves">
      {STYLES.filter((s) => !isOrbit(s) && s !== "centreBar").map((s) => {
        const tracks = buildTracks(
          [{ borderColor: face.color, outlineShape: face.shape, x: 0.5, y: 0.5, size: 0.42, waveform: { ...value, style: s, enabled: true, position: "speaker" } }],
          { ...value, enabled: false },
          face.color
        );
        return (
          <button key={s} className={`wave ${value.style === s ? "on" : ""}`} onClick={() => onChange({ style: s })} aria-label={STYLE_LABEL[s] ?? s} data-tip={`Draws the voice as "${STYLE_LABEL[s] ?? s}". The picture shows how it will move.`}>
            <span className="pic" style={{ width: TILE, height: TILE }}>
              <i className={`frame ${face.shape}`} style={{ borderColor: face.shape === "none" ? "transparent" : face.color }} />
              <WaveformScene tracks={tracks} width={TILE} height={TILE} timeMs={t} analysis={null} musicAnalysis={null} />
            </span>
            <span className="name">{STYLE_LABEL[s] ?? s}</span>
          </button>
        );
      })}
    </div>
  );
}

function PositionTiles({ value, onChange, face, canAnchorToFace }: { value: TrackWaveform; onChange: (p: Partial<TrackWaveform>) => void; face: Face; canAnchorToFace: boolean }) {
  const t = useTileClock();
  return (
    <div className="forge-waves">
      {POSITIONS.filter((p) => p !== "speaker" || canAnchorToFace).filter((p) => value.style !== "centreBar" || ["top", "bottom", "left", "right"].includes(p)).map((p) => (
        <ScreenTile key={p} value={value} patch={{ position: p }} face={face} t={t} on={value.position === p} name={POSITION_LABEL[p]} tip={`Places the waves ${POSITION_LABEL[p]}.`} onClick={() => onChange({ position: p })} />
      ))}
    </div>
  );
}

function FlushTiles({ value, onChange, face }: { value: TrackWaveform; onChange: (p: Partial<TrackWaveform>) => void; face: Face }) {
  const t = useTileClock();
  return (
    <div>
      <div className="label-etched mb-2" data-tip="Whether the waves touch the very edge of the video.">Edge</div>
      <div className="forge-waves">
        <ScreenTile value={value} patch={{ edgeFlush: true }} face={face} t={t} on={value.edgeFlush} name="flush to edge" tip="The waves touch the very edge of the video." onClick={() => onChange({ edgeFlush: true })} />
        <ScreenTile value={value} patch={{ edgeFlush: false }} face={face} t={t} on={!value.edgeFlush} name="small gap" tip="The waves leave a little gap before the edge." onClick={() => onChange({ edgeFlush: false })} />
      </div>
    </div>
  );
}

export function WaveformControls({ value, onChange, label, canAnchorToFace = true, face }: Props) {
  return (
    <div className="space-y-4">
      <Toggle label={label} checked={value.enabled} onChange={(v) => onChange({ enabled: v })} data-tip="Turns the moving picture that dances to the sound on or off." />

      {value.enabled && (
        <>
          <div>
            <div className="label-etched mb-2" data-tip="How the moving bars look. Each picture is drawn on this speaker's own frame.">Style</div>
            {face ? (
              <StyleTiles value={value} onChange={onChange} face={face} />
            ) : (
              <div className="flex flex-wrap gap-2">
                {STYLES.map((s) => (
                  <HudButton key={s} active={value.style === s} onClick={() => onChange({ style: s })} data-tip={`Draws the sound as "${STYLE_LABEL[s] ?? s}".`}>
                    {STYLE_LABEL[s] ?? s}
                  </HudButton>
                ))}
              </div>
            )}
          </div>

          {!isOrbit(value.style) && (
            <div>
              <div data-tip="Where the moving sound waves sit on the picture." className="label-etched mb-2">Position</div>
              {face ? <PositionTiles value={value} onChange={onChange} face={face} canAnchorToFace={canAnchorToFace} /> : (
              <div className="flex flex-wrap gap-2">
                {POSITIONS.filter((p) => p !== "speaker" || canAnchorToFace).map((p) => (
                  <HudButton key={p} active={value.position === p} onClick={() => onChange({ position: p })} data-tip={`Places the moving picture ${POSITION_LABEL[p]}.`}>
                    {POSITION_LABEL[p]}
                  </HudButton>
                ))}
              </div>
              )}
              {value.position === "speaker" && (
                <p className="text-sm text-neutral-500 mt-2">
                  A halo on this speaker's own face — it moves with them. Ring
                  Size pushes it out from the artwork.
                </p>
              )}
            </div>
          )}

          {value.position === "speaker" && !isOrbit(value.style) && (
            <Slider
              data-tip="How far the ring sits out from the character. Bigger = further away."
              label="Ring Size" value={value.ringSize} min={0.6} max={3} step={0.02}
              onChange={(v) => onChange({ ringSize: v })} format={(v) => `${v.toFixed(2)}x`}
            />
          )}

          <Slider
            data-tip="How tall the bars get when the voice is loud. Higher = more dramatic." label="Height" value={value.scale} min={0.2} max={2.5} step={0.02}
            onChange={(v) => onChange({ scale: v })} format={(v) => `${v.toFixed(2)}x`}
          />
          <Slider
            data-tip="How many bars or dots are drawn. More = finer detail." label="Count" value={value.density} min={8} max={160} step={1}
            onChange={(v) => onChange({ density: Math.round(v) })} format={(v) => `${Math.round(v)}`}
          />
          <Slider
            data-tip="How fat each bar or line is." label="Thickness" value={value.thickness} min={0.2} max={3} step={0.05}
            onChange={(v) => onChange({ thickness: v })} format={(v) => `${v.toFixed(2)}x`}
          />
          <Slider
            data-tip="How much neighbouring bars follow each other. Higher = flowing waves, 0 = jumpy." label="Smoothing" value={value.smoothing} min={0} max={1} step={0.02}
            onChange={(v) => onChange({ smoothing: v })}
            format={(v) => (v === 0 ? "raw" : `${Math.round(v * 100)}%`)}
          />
          <Slider
            data-tip="Slides the picture sideways, so two speakers' pictures do not sit on top of each other." label="Lane Offset" value={value.lane} min={-3} max={3} step={0.1}
            onChange={(v) => onChange({ lane: v })} format={(v) => v.toFixed(1)}
          />
          <Slider
            data-tip="Adds twinkling extras. 0 = none." label="Sparkle" value={value.sparkle} min={0} max={1} step={0.05}
            onChange={(v) => onChange({ sparkle: v })}
            format={(v) => (v === 0 ? "off" : `${Math.round(v * 100)}%`)}
          />

          {(value.style === "dots" || value.style === "particles" || value.style === "sparks") && (
            <Slider
              data-tip="How big each dot or particle is." label={value.style === "dots" ? "Dot Size" : "Particle size"} value={value.dotSize} min={0.2} max={4} step={0.05}
              onChange={(v) => onChange({ dotSize: v })} format={(v) => `${v.toFixed(2)}x`}
            />
          )}

          {face && !isOrbit(value.style) && value.position !== "circular" && value.position !== "speaker" && <FlushTiles value={value} onChange={onChange} face={face} />}
          {!face && !isOrbit(value.style) && value.position !== "circular" && (
            <Toggle
              data-tip="On = the picture touches the very edge. Off = it leaves a little gap."
              label="Flush to edge" checked={value.edgeFlush}
              onChange={(v) => onChange({ edgeFlush: v })}
            />
          )}

          {isOrbit(value.style) && (
            <>
              <Slider
                data-tip="How big the ring is."
                label="Ring Size" value={value.ringSize} min={0.2} max={2} step={0.02}
                onChange={(v) => onChange({ ringSize: v })} format={(v) => `${v.toFixed(2)}x`}
              />
              <Slider
                data-tip="How much empty space is left in the middle of the ring. Higher = bigger hole." label="Center Opening" value={value.ringInnerRadius} min={0} max={0.9} step={0.01}
                onChange={(v) => onChange({ ringInnerRadius: v })} format={(v) => `${Math.round(v * 100)}%`}
              />
              <Slider
                data-tip="Moves the ring left or right across the picture." label="Ring X" value={value.ringX} min={0} max={1} step={0.01}
                onChange={(v) => onChange({ ringX: v })} format={(v) => `${Math.round(v * 100)}%`}
              />
              <Slider
                data-tip="Moves the ring up or down the picture." label="Ring Y" value={value.ringY} min={0} max={1} step={0.01}
                onChange={(v) => onChange({ ringY: v })} format={(v) => `${Math.round(v * 100)}%`}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}
