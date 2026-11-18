// Step 2: choose characters one by one. Ready-made first, then the full customiser
// for the one selected. On the right: who's chosen so far, with a status for every setting.
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { DRAWN_PRESETS, SUBJECTS, formOf, lookById, normalizeCard, type CharacterCard } from "../../../characters/core/index.mjs";
import { CLIPS } from "../creator/drawing";
import { LiveFigure, StillFigure } from "../creator/Figure";
import { CharacterStudio } from "../creator/CharacterStudio";
import { CastPanel } from "../panels/CastPanel";
import { LiveFace } from "../panels/LiveFace";
import { PuppetShelf } from "../panels/PuppetShelf";
import { KenneyEditor } from "../panels/KenneyPanel";
import { kenneyAsset } from "../canvas/KenneyLive";
import { useKenneyAvailability } from "../canvas/useKenneyAvailability";
import { PERSONAL_ONLY_NOTE, setNote } from "../../lib/kenney/available";
import { useCreatorStore } from "../../store/useCreatorStore";
import { useFlowStore, type FlowStyle, type ParamId } from "../../store/useFlowStore";
import { useProjectStore } from "../../store/useProjectStore";
import { builtinPuppetPath, type BrandInfo } from "../../store/builtinCast";
import { cardOf } from "../../lib/creator/edit";
import { defaultTrackWaveform } from "../../lib/waveform/buildTracks";
import type { KenneyCard } from "../../lib/kenney/actor";
import type { SpeakerConfig } from "../../store/types";
import { KenneyDemo, PopOn } from "./HoverPop";
import { styleOf } from "./styles";
import { ColourPanel, DemeanourPanel, PlacePanel, WavesPanel } from "./CharPanels";
import { MiniStage } from "./CharPreview";

const COLORS = ["#5be3b5", "#7fd3ff", "#ffb35b", "#ff7fb0", "#b48cff", "#f2e35b"];
const clip = (id: string) => CLIPS.find((c) => c.id === id) ?? CLIPS[0];
export const PARAMS: { id: ParamId; emoji: string; name: string; tip: string }[] = [
  { id: "voice", emoji: "🔊", name: "Voice", tip: "How they sound: the speech engine and voice." },
  { id: "colour", emoji: "🎨", name: "Main colour", tip: "Their colour: frame, sound waves and highlighted subtitle words." },
  { id: "demeanour", emoji: "🎭", name: "Demeanour", tip: "Who they are, how they behave, how much they gesture." },
  { id: "looks", emoji: "👕", name: "Looks", tip: "Face, body, clothes and drawing style." },
  { id: "bars", emoji: "〰️", name: "Sound waves", tip: "The moving waves that show when they speak, and the frame round them." },
  { id: "place", emoji: "📍", name: "Place", tip: "Where they stand and how big they are." },
];

/** "red" needs a choice from you; "grey" is fine but you haven't approved it; "ok" you approved. */
export function statusOf(sp: SpeakerConfig, p: ParamId, approved: boolean): "ok" | "grey" | "red" {
  if (p === "looks" && !sp.kenney && !sp.character && !sp.puppetPath && !sp.sheetPath) return "red";
  if (p === "voice" && !sp.geminiVoice && !sp.voiceId && !sp.elevenVoiceId && !sp.voiceRef) return "red";
  if (p === "demeanour" && !sp.description && !sp.personality) return "red";
  return approved ? "ok" : "grey";
}
const STATUS_TIP = { ok: "You approved this.", grey: "Fine as it is, but you haven't approved it yet.", red: "This needs a choice from you." };

function Tile({ onClick, name, tip, children }: { onClick: () => void; name: string; tip: string; children: ReactNode }) {
  return <button className="flow-tile" onClick={onClick} data-tip={tip}><span className="flow-tile-pic">{children}</span><span className="flow-tile-name">{name}</span></button>;
}

function waveOff(n: number) { return { ...defaultTrackWaveform(n % 2 === 1 ? 1 : -1), enabled: false }; }

function DrawnShelf({ look, add, q }: { look: string; add: (s: Partial<SpeakerConfig> & { label: string }) => void; q: string }) {
  const [subject, setSubject] = useState<string | null>(null);
  const creator = useCreatorStore();
  useEffect(() => { if (!creator.brands) void creator.load(); }, [creator]);
  const lk = lookById(look);
  const n = useProjectStore((s) => s.speakers.length);
  const t = q.trim().toLowerCase();
  const presets = DRAWN_PRESETS.filter((p) => (!subject || p.subjects.includes(subject)) && (!t || `${p.name} ${p.description}`.toLowerCase().includes(t)));
  const brands = (creator.brands ?? []).filter((b) => b.brand !== "__video");
  const big = (card: CharacterCard) => (size: number) => <div style={{ width: size, height: size, background: (lk as { stage?: string }).stage }}><LiveFigure card={card} look={lk} clip={clip("wave")} framing="full" fps={30} pad={0.04} /></div>;
  return (
    <>
      <div className="flow-chips">
        <button className={`btn ${!subject ? "btn-primary" : ""}`} onClick={() => setSubject(null)} data-tip="Show every ready-made character.">All</button>
        {SUBJECTS.map((s) => <button key={s.id} className={`btn ${subject === s.id ? "btn-primary" : ""}`} onClick={() => setSubject(s.id)} data-tip={`Characters for: ${s.label}.`}>{s.label}</button>)}
      </div>
      <div className="flow-tiles">
        {presets.map((p) => {
          const card = normalizeCard({ ...p.card, name: p.name, look }).card;
          return (
            <PopOn key={p.id} label={p.name} note={p.description} render={big(card)}>
              <Tile name={p.name} tip={`Add ${p.name}. ${p.description}`} onClick={() => add({ label: p.name, form: "drawn", character: card, description: p.description, personality: p.personality, subjects: p.subjects, borderColor: COLORS[n % COLORS.length], bgColor: "#1a1a1a", bgOpacity: 0, borderOpacity: 0, outlineShape: "none", size: .32, waveform: waveOff(n) })}>
                <StillFigure card={card} look={lk} framing="head" />
              </Tile>
            </PopOn>
          );
        })}
      </div>
      {brands.map((b) => {
        const people = b.order.map((id) => b.saved[id]).filter((c) => !t || `${c.name} ${c.role}`.toLowerCase().includes(t));
        if (!people.length) return null;
        return (
          <div key={b.brand}>
            <div className="flow-sub" data-tip={`Characters saved for ${b.title}.`}>{b.title}</div>
            <div className="flow-tiles">
              {people.map((c) => {
                const card = cardOf(c, undefined, undefined, look);
                return (
                  <PopOn key={c.id} label={c.name} note={c.role} render={big(card)}>
                    <Tile name={c.name} tip={`Add ${c.name}. ${c.role}`} onClick={() => add({ label: c.name, form: "drawn", character: card, description: c.role, borderColor: c.signature, bgColor: "#1a1a1a", bgOpacity: 0, borderOpacity: 0, outlineShape: "none", size: .32, waveform: waveOff(n) })}>
                      <StillFigure card={card} look={lk} framing="head" />
                    </Tile>
                  </PopOn>
                );
              })}
            </div>
          </div>
        );
      })}
    </>
  );
}

interface KItem { id: string; label: string; thumb: string; skin?: string }
const nice = (label: string) => label.replace(/^(.+?)(male|female)$/i, (_m, a: string, g: string) => `${a[0].toUpperCase()}${a.slice(1).toLowerCase()} (${g.toLowerCase()})`);

function KenneyShelf({ set, add, q }: { set: Extract<FlowStyle, { family: "3d" }>["set"]; add: (s: Partial<SpeakerConfig> & { label: string }) => void; q: string }) {
  const [items, setItems] = useState<KItem[]>([]);
  useEffect(() => { fetch(kenneyAsset("manifest.json")).then((r) => r.json()).then((m) => setItems(m.sets[set].items)).catch(() => setItems([])); }, [set]);
  const n = useProjectStore((s) => s.speakers.length);
  const t = q.trim().toLowerCase();
  const off = setNote(set, useKenneyAvailability());
  if (off) return <p className="flow-note personal-only" data-tip={`3D Humans: ${PERSONAL_ONLY_NOTE} Pick 3D Mini people or 3D Pets in the first step instead.`}>3D Humans are in the personal build only.</p>;
  return (
    <div className="flow-tiles">
      {items.filter((i) => !t || nice(i.label).toLowerCase().includes(t)).map((it) => {
        const card: KenneyCard = { set, base: it.id, skin: it.skin, motion: "idle", colours: {}, face: { mood: "open", blink: 1 }, props: {}, credit: "Kenney (kenney.nl), CC0" };
        return (
          <PopOn key={it.id} label={nice(it.label)} note="Talking, in its own colours" render={(size) => <KenneyDemo card={{ ...card, motion: set === "animated" ? "talk" : "idle" }} size={size} />}>
            <Tile name={nice(it.label)} tip={`Add ${nice(it.label)}.`} onClick={() => add({ label: nice(it.label), kenney: card, kenneyFraming: "body", borderColor: COLORS[n % COLORS.length], bgColor: "#1a1a1a", bgOpacity: 0, borderOpacity: 0, outlineShape: "none", size: .42, y: .62, waveform: waveOff(n) })}>
              <img src={kenneyAsset(it.thumb)} alt={it.label} />
            </Tile>
          </PopOn>
        );
      })}
    </div>
  );
}

function PuppetShelfTiles({ add }: { add: (s: Partial<SpeakerConfig> & { label: string }) => void }) {
  const [brand, setBrand] = useState<BrandInfo | null>(null);
  const [shelf, setShelf] = useState<Awaited<ReturnType<NonNullable<Window["byok"]>["forge"]["shelfPuppets"]>>>([]);
  useEffect(() => {
    window.byok?.brand?.active().then(setBrand).catch(() => setBrand(null));
    window.byok?.forge?.shelfPuppets().then(setShelf).catch(() => setShelf([]));
  }, []);
  const n = useProjectStore((s) => s.speakers.length);
  const base = { bgColor: "#1a1a1a", bgOpacity: 0, borderOpacity: 1, outlineShape: "circle" as const, size: .28 };
  return (
    <div className="flow-tiles">
      {brand?.cast.map((c) => {
        const path = builtinPuppetPath(brand.puppetDir, c.file);
        return (
          <PopOn key={c.file} label={c.label} note={c.note} render={(size) => <LiveFace path={path} label={c.label} color={c.borderColor} size={size} talking />}>
            <Tile name={c.label} tip={`Add ${c.label}, with their face and voice.`} onClick={() => add({ ...base, label: c.label, puppetPath: path, borderColor: c.borderColor, openingPhrase: c.openingPhrase, voiceRef: c.voiceRef, ttsEngine: c.voice?.engine ?? "gemini", geminiModel: c.voice?.geminiModel, geminiVoice: c.voice?.geminiVoice, pitch: c.voice?.pitch, waveform: defaultTrackWaveform(n % 2 === 1 ? 1 : -1) })}>
              <LiveFace path={path} label={c.label} color={c.borderColor} size={110} />
            </Tile>
          </PopOn>
        );
      })}
      {shelf.map((p) => (
        <PopOn key={p.slug} label={p.name} note="Made in Image Forge" render={(size) => <LiveFace path={p.rigPath} label={p.name} size={size} talking />}>
          <Tile name={p.name} tip={`Add ${p.name}, made in Image Forge.`} onClick={() => add({ ...base, label: p.name, puppetPath: p.rigPath, borderColor: COLORS[n % COLORS.length], waveform: { ...defaultTrackWaveform(n % 2 === 1 ? 1 : -1), enabled: p.framing !== "full" } })}>
            <LiveFace path={p.rigPath} label={p.name} size={110} />
          </Tile>
        </PopOn>
      ))}
    </div>
  );
}

/** The drawn-character builder, working on this speaker: every change shows at once. */
function Builder({ sp }: { sp: SpeakerConfig }) {
  const creator = useCreatorStore();
  const update = useProjectStore((s) => s.updateSpeaker);
  const key = `__video/${sp.id}`;
  useEffect(() => { void useCreatorStore.getState().openForSpeaker(sp); }, [sp.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const draft = creator.drafts[key];
  const seen = useRef<unknown>(null);
  useEffect(() => {
    if (draft && draft !== seen.current) { seen.current = draft; update(sp.id, { character: cardOf(draft) }); }
  }, [draft, sp.id, update]);
  return <div className="flow-builder"><CharacterStudio /></div>;
}

/** The character as they will be in the video, with everyone else there too (Ak, 11 Nov 2026). */
function InVideo({ sp, width }: { sp: SpeakerConfig; width: number }) {
  const speakers = useProjectStore((s) => s.speakers);
  // always wide (16:9), whatever the video's shape: a tall preview leaves no room for the controls (Ak, 11 Nov 2026)
  const aspect = 16 / 9;
  return (
    <div className="flow-invideo" data-tip={`How ${sp.label} looks in the video. Every change shows here at once.`}>
      <span className="label-etched" data-tip="The video picture, with everyone in their places.">In the video</span>
      <MiniStage speakers={speakers} width={width} aspect={aspect} selected={sp.id} live={(o) => o.id === sp.id} />
    </div>
  );
}

function Customiser({ sp }: { sp: SpeakerConfig }) {
  const update = useProjectStore((s) => s.updateSpeaker);
  if (sp.kenney) return (
    <div className="flow-split">
      <div className="flow-split-stick"><InVideo sp={sp} width={480} /></div>
      <div className="flow-cust"><KenneyEditor sp={sp} update={(p) => update(sp.id, p)} /></div>
    </div>
  );
  if (formOf(sp) === "drawn" && sp.character) return <><div className="flow-invideo-row"><InVideo sp={sp} width={340} /><p className="text-sm text-neutral-300" data-tip="The small picture follows every change.">Change anything below and the small picture shows how {sp.label} looks in the video, next to everyone else.</p></div><Builder sp={sp} /></>;
  return <div className="flow-cust"><PuppetShelf current={sp.puppetPath} onPick={(p) => update(sp.id, { puppetPath: p })} /></div>;
}

function ParamPanel({ sp, param, onClose, onMove, onSelect }: { sp: SpeakerConfig; param: ParamId; onClose: () => void; onMove: (p: ParamId) => void; onSelect: (id: string) => void }) {
  const update = useProjectStore((s) => s.updateSpeaker);
  const approved = useFlowStore((f) => f.approved[sp.id]?.[param]) ?? false;
  const approve = useFlowStore((f) => f.approve);
  const i = PARAMS.findIndex((p) => p.id === param), P = PARAMS[i];
  const next = PARAMS[(i + 1) % PARAMS.length];
  const status = statusOf(sp, param, approved);
  return (
    <div className={`flow-param ${param === "looks" ? "wide" : ""}`} role="dialog" aria-label={`${P.name} for ${sp.label}`}>
      <div className="flow-param-head">
        <h3 data-tip={P.tip}>{P.emoji} {P.name} <small>{sp.label}</small></h3>
        <button className="btn" onClick={onClose} data-tip="Close and go back to the characters.">Close</button>
      </div>
      <div className="flow-param-body">
        {param === "colour" && <ColourPanel sp={sp} />}
        {param === "demeanour" && <DemeanourPanel sp={sp} />}
        {param === "voice" && <CastPanel only={["Voice"]} speakerId={sp.id} />}
        {param === "bars" && <WavesPanel sp={sp} />}
        {param === "place" && <PlacePanel sp={sp} onSelect={onSelect} />}
        {param === "looks" && <Customiser key={sp.id} sp={sp} />}
      </div>
      <div className="flow-param-foot">
        {status === "red" ? <span className="flow-need" data-tip={STATUS_TIP.red}>Needs a choice</span> : (
          <button className={`btn ${approved ? "" : "btn-primary"}`} onClick={() => approve(sp.id, param, !approved)} data-tip={approved ? "Take back your approval." : "Mark this as approved."}>{approved ? "Approved ✓" : "Approve"}</button>
        )}
        <button className="btn" onClick={() => { if (status !== "red") approve(sp.id, param, true); onMove(next.id); }} data-tip={`Approve this and go on to ${next.name}.`}>Approve, next: {next.emoji} {next.name} →</button>
      </div>
    </div>
  );
}

function Sidebar({ selected, onSelect, onParam }: { selected: string | null; onSelect: (id: string) => void; onParam: (id: string, p: ParamId) => void }) {
  const speakers = useProjectStore((s) => s.speakers);
  const remove = useProjectStore((s) => s.removeSpeaker);
  const approved = useFlowStore((f) => f.approved);
  return (
    <aside className="flow-side" aria-label="Chosen characters">
      <h3 data-tip="Everyone in this video so far.">Your characters <small>{speakers.length}</small></h3>
      <div className="flow-legend" data-tip="What the colours of the setting icons mean."><span className="ok">🎨 approved</span><span className="grey">🎨 OK, not approved</span><span className="red">🎨 needs you</span></div>
      {!speakers.length && <p className="flow-note" data-tip="Pick a character on the left.">Nobody yet. Pick someone on the left.</p>}
      {speakers.map((sp) => (
        <div key={sp.id} className={`flow-member ${selected === sp.id ? "on" : ""}`} style={{ ["--c" as string]: sp.borderColor }}>
          <button className="flow-member-name" onClick={() => onSelect(sp.id)} data-tip={`Go back and adjust ${sp.label}.`}><i />{sp.label}</button>
          <button className="flow-x" onClick={() => remove(sp.id)} data-tip={`Take ${sp.label} out of this video.`} aria-label={`Remove ${sp.label}`}>×</button>
          <div className="flow-emojis">
            {PARAMS.map((p) => {
              const st = statusOf(sp, p.id, !!approved[sp.id]?.[p.id]);
              return <button key={p.id} className={`flow-emo ${st}`} onClick={() => onParam(sp.id, p.id)} data-tip={`${p.name}: ${STATUS_TIP[st]}`} aria-label={`${p.name} for ${sp.label}`}>{p.emoji}</button>;
            })}
          </div>
        </div>
      ))}
    </aside>
  );
}

export function CastStep() {
  const style = useFlowStore((f) => f.style);
  const setStep = useFlowStore((f) => f.setStep);
  const speakers = useProjectStore((s) => s.speakers);
  const addSpeakerFrom = useProjectStore((s) => s.addSpeakerFrom);
  const [selected, setSelected] = useState<string | null>(null);
  const [param, setParam] = useState<ParamId | null>(null);
  const [q, setQ] = useState("");
  const pick = useRef(false);
  const custRef = useRef<HTMLDivElement>(null);
  const add = useMemo(() => (s: Partial<SpeakerConfig> & { label: string }) => { pick.current = true; addSpeakerFrom(s as never); }, [addSpeakerFrom]);
  useEffect(() => { if (pick.current && speakers.length) { pick.current = false; setSelected(speakers[speakers.length - 1].id); } }, [speakers]);
  const sp = speakers.find((s) => s.id === selected) ?? null;
  const info = styleOf(style);
  const styleName = info?.name ?? (style?.family === "drawn" ? lookById(style.look).name : "");
  if (!style) return <div className="flow-page"><p className="flow-lede" data-tip="The style decides which characters are offered.">Choose a style first.</p><button className="btn btn-primary" onClick={() => setStep(1)} data-tip="Go to the style step.">Choose a style</button></div>;
  return (
    <div className="flow-cast">
      <div className="flow-cast-main">
        <div className="flow-head">
          <h2 className="flow-h" data-tip="Add characters one at a time. You can always go back to one from the list on the right.">Choose your characters</h2>
          <button className="btn" onClick={() => setStep(1)} data-tip="Go back and pick another style. Characters you already added stay.">Style: {styleName} · change</button>
          {sp && <button className="btn btn-primary" onClick={() => custRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })} data-tip={`Jump down to every detail of ${sp.label}.`}>Customise {sp.label} ↓</button>}
          <input type="text" className="flow-search" placeholder="Find a character…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Find a character" data-tip="Search the ready-made characters by name." />
        </div>
        <section className="flow-group">
          <h3 data-tip="Rest the mouse on one to see it large. Click to add it.">Ready-made <small>Rest the mouse to see it large, click to add</small></h3>
          {style.family === "drawn" && <DrawnShelf look={style.look} add={add} q={q} />}
          {style.family === "3d" && <KenneyShelf set={style.set} add={add} q={q} />}
          {style.family === "puppet" && <PuppetShelfTiles add={add} />}
        </section>
        <section className="flow-group" ref={custRef}>
          <h3 data-tip="Every detail of the character selected on the right.">Full customiser {sp ? <small>{sp.label}</small> : <small>Add or select a character to customise it</small>}</h3>
          {sp && <Customiser key={sp.id} sp={sp} />}
        </section>
      </div>
      <Sidebar selected={selected} onSelect={(id) => { setSelected(id); custRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }} onParam={(id, p) => { setSelected(id); setParam(p); }} />
      {sp && param && <ParamPanel sp={sp} param={param} onClose={() => setParam(null)} onMove={setParam} onSelect={setSelected} />}
    </div>
  );
}
