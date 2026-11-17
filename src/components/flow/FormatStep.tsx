// Step 4: what kind of video this is. Every format is shown as a picture made of
// YOUR choices: your characters, placed the way that format places them, in front
// of your background (Ak, 10 Nov 2026: "we need previews"). Words are short and
// plain (Ak reads with dyslexia): the picture does the explaining.
import { useState } from "react";
import { builtinPresets } from "../../store/builtinPresets";
import { useFlowStore } from "../../store/useFlowStore";
import { useProjectStore } from "../../store/useProjectStore";
import type { SpeakerConfig } from "../../store/types";
import { MiniStage, useAspect, type Bg } from "./CharPreview";
import { useCurrentBg } from "./BackgroundStep";

export interface Format {
  id: string; name: string; group: string; preset?: string; scene?: string; mode?: "explainer" | "many"; fullBody?: boolean;
  say: string; pros: string[]; cons: string[];
}
export const FORMAT_GROUPS = ["One person talking", "People talking together", "Shows and sets", "Other kinds of video"];
export const FORMATS: Format[] = [
  { id: "narrator", name: "Talking head", group: "One person talking", preset: "Halo", say: "One face talks.", pros: ["Simple and fast", "Works in every style"], cons: ["Little movement"] },
  { id: "narrator-body", name: "Whole-body narrator", group: "One person talking", preset: "Halo", fullBody: true, say: "One person, head to toe, using their hands.", pros: ["More alive than a face", "Can hold things and move"], cons: ["The face is smaller"] },
  { id: "story", name: "Storyteller", group: "One person talking", preset: "Broadcast", fullBody: true, say: "One person tells a story. The picture behind changes.", pros: ["Holds attention", "Cheap to make"], cons: ["Needs many backgrounds"] },
  { id: "broadcast", name: "Big words", group: "One person talking", preset: "Broadcast", say: "Small presenter, big words on screen.", pros: ["Works with the sound off"], cons: ["The person is small"] },
  { id: "promo", name: "Ad", group: "One person talking", preset: "Promo", say: "Big bold words, quick and punchy.", pros: ["Made for ads and shorts"], cons: ["Not for long videos"] },
  { id: "duo", name: "Two people talking", group: "People talking together", preset: "Dialogue", say: "Side by side, facing each other.", pros: ["Natural back and forth"], cons: ["Needs a dialogue"] },
  { id: "interview", name: "Interview", group: "People talking together", preset: "Interview", say: "One asks, one answers.", pros: ["Clear questions and answers"], cons: ["Two or three people at most"] },
  { id: "podcast-faces", name: "Big faces", group: "People talking together", preset: "Podcast", say: "Two big faces, words between them.", pros: ["Strong for shorts"], cons: ["Faces only"] },
  { id: "drama", name: "Mini drama", group: "People talking together", preset: "Dialogue", fullBody: true, say: "Whole people who walk, sit and wave.", pros: ["The most alive", "You direct every move"], cons: ["Takes directing", "Walks go left and right only"] },
  { id: "podcast", name: "Podcast studio", group: "Shows and sets", scene: "podcast", say: "Two hosts at a table.", pros: ["Looks like a real show"], cons: ["No walking"] },
  { id: "podcast-split", name: "Podcast, split", group: "Shows and sets", scene: "podcastSplit", say: "Each host in their own half.", pros: ["Clear in tall video"], cons: ["No walking"] },
  { id: "news", name: "News desk", group: "Shows and sets", scene: "news", say: "Anchors at a desk.", pros: ["Reads as news at once", "Great for parody"], cons: ["No walking"] },
  { id: "meeting", name: "Office meeting", group: "Shows and sets", scene: "meeting", say: "People round a table.", pros: ["Office comedy and drama"], cons: ["No walking"] },
  { id: "stage", name: "Talk on stage", group: "Shows and sets", scene: "stage", say: "A talk on a stage.", pros: ["Feels important"], cons: ["No walking"] },
  { id: "gameshow", name: "Game show", group: "Shows and sets", scene: "gameshow", say: "Players at podiums.", pros: ["Fun for quizzes"], cons: ["Needs a game in the script"] },
  { id: "explainer", name: "Explainer", group: "Other kinds of video", mode: "explainer", say: "Pictures, words and charts that move with the voice.", pros: ["Best for teaching"], cons: ["Has its own screens"] },
  { id: "many", name: "Many videos", group: "Other kinds of video", mode: "many", say: "One row in a sheet makes one video.", pros: ["A whole series at once"], cons: ["Needs a sheet"] },
];

const RATIOS = [["9:16", 1080, 1920, "Tall, for Shorts and Reels."], ["16:9", 1920, 1080, "Wide, for YouTube."], ["1:1", 1080, 1080, "Square."], ["4:5", 1080, 1350, "Feed post."]] as const;
const SOLO = new Set(["narrator", "narrator-body", "broadcast", "promo", "story"]);

/** How a format would place these speakers, without changing anything. */
export function layoutFor(f: Format, speakers: SpeakerConfig[]): SpeakerConfig[] {
  if (!f.preset) return speakers;
  const n = SOLO.has(f.id) ? 1 : Math.min(3, speakers.length || 1);
  const noun = n === 1 ? "solo" : n === 2 ? "duo" : "trio";
  const b = builtinPresets().find((x) => x.name === `${f.preset} · ${noun}`);
  if (!b) return speakers;
  return speakers.slice(0, SOLO.has(f.id) ? 1 : speakers.length).map((sp, i) => {
    const slot = b.slots?.[i]; if (!slot) return sp;
    const body = f.fullBody || !!sp.kenney;
    return { ...sp, x: slot.x, y: body ? Math.max(slot.y, .6) : slot.y, size: body ? Math.max(slot.size, .42) : slot.size, outlineShape: body ? "none" : slot.outlineShape, borderOpacity: body ? 0 : sp.borderOpacity, waveform: body ? { ...slot.waveform, enabled: false } : slot.waveform } as SpeakerConfig;
  });
}

export function applyFormat(f: Format) {
  const st = useProjectStore.getState();
  if (f.scene) { st.setScene({ id: f.scene, title: st.scene?.title ?? "", names: st.scene?.names ?? [] }); return; }
  st.setScene(null);
  if (!f.preset) return;
  const n = SOLO.has(f.id) ? 1 : Math.min(3, st.speakers.length || 1);
  const b = builtinPresets().find((x) => x.name === `${f.preset} · ${n === 1 ? "solo" : n === 2 ? "duo" : "trio"}`);
  const placed = layoutFor(f, st.speakers);
  placed.forEach((sp, i) => {
    st.updateSpeaker(sp.id, { x: sp.x, y: sp.y, size: sp.size, outlineShape: sp.outlineShape, surface: f.fullBody || sp.kenney ? undefined : b?.slots?.[i]?.surface });
    st.setSpeakerWaveform(sp.id, sp.waveform);
  });
  if (b?.subtitles) st.setSubtitles(b.subtitles);
}

/** The format as a picture: your characters, placed by it, in front of your background. */
function FormatPic({ f, width, live = false }: { f: Format; width: number; live?: boolean }) {
  const speakers = useProjectStore((s) => s.speakers);
  const aspect = useAspect();
  const current = useCurrentBg();
  if (f.mode) return <div className="flow-format-pic flow-spots big" style={{ width, height: width / aspect }} data-tip={f.say}>{f.mode === "explainer" ? "📊" : "🗂️"}</div>;
  const bg: Bg = f.scene ? { kind: "set", id: f.scene } : current?.kind === "set" ? null : current;
  return <MiniStage speakers={layoutFor(f, speakers)} width={width} aspect={aspect} bg={bg} still={!live} showWaves={live} />;
}

export function FormatStep() {
  const cur = useFlowStore((f) => f.format);
  const setFormat = useFlowStore((f) => f.setFormat);
  const render = useProjectStore((s) => s.render);
  const setRender = useProjectStore((s) => s.setRender);
  const aspect = useAspect();
  const [hover, setHover] = useState<string | null>(null);
  const shown = FORMATS.find((f) => f.id === (hover ?? cur));
  const tile = aspect >= 1 ? 232 : 130;
  return (
    <div className="flow-page flow-bg">
      <div className="flow-bg-main">
        <h2 className="flow-h" data-tip="What kind of video this is.">Choose the format</h2>
        <div className="flow-chips" role="group" aria-label="Shape of the video">
          {RATIOS.map(([r, width, height, tip]) => <button key={r} className={`btn ${render.format === r ? "btn-primary" : ""}`} onClick={() => setRender({ format: r, width, height } as never)} data-tip={tip}>{r}</button>)}
        </div>
        {FORMAT_GROUPS.map((g) => (
          <section key={g} className="flow-group">
            <h3 data-tip={g}>{g}</h3>
            <div className="flow-formats pics">
              {FORMATS.filter((f) => f.group === g).map((f) => (
                <button key={f.id} className={`flow-format ${cur === f.id ? "on" : ""}`} onClick={() => { setFormat(f.id); applyFormat(f); }} onMouseEnter={() => setHover(f.id)} onMouseLeave={() => setHover(null)} data-tip={f.say}>
                  <FormatPic f={f} width={tile} />
                  <b>{f.name}</b><span>{f.say}</span>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
      <aside className="flow-bg-side" aria-label="Preview">
        <div className="flow-preview-label" data-tip="The format you are looking at, made with your characters and background.">{shown ? shown.name : "Pick a format"} <small>{hover && hover !== cur ? "click to use it" : cur ? "chosen" : ""}</small></div>
        {shown ? <FormatPic key={shown.id} f={shown} width={aspect >= 1 ? 560 : 300} live /> : <p className="flow-lede" data-tip="Rest the mouse on a format.">Rest the mouse on a format to see it with your characters.</p>}
        {shown && (
          <div className="flow-proscons" data-tip={`Good and bad points of ${shown.name}.`}>
            <b>{shown.say}</b>
            {shown.pros.map((p) => <span key={p} className="pro">✓ {p}</span>)}
            {shown.cons.map((p) => <span key={p} className="con">✗ {p}</span>)}
          </div>
        )}
      </aside>
    </div>
  );
}
