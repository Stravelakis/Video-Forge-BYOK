// ---------------------------------------------------------------------------
// The 3D cast in the Cast step: a shelf to add a character, and everything you
// can set on one (colours, shot, mood, motion, props). The card is plain JSON on
// the speaker, so it saves, reloads and renders like any other setting.
// 3D models by Kenney (kenney.nl), CC0. Thank you, Kenney.
// ---------------------------------------------------------------------------

import { useEffect, useMemo, useState } from "react";
import { kenneyAsset } from "../canvas/KenneyLive";
import { KENNEY_MOODS, type KenneyCard, type KenneySet } from "../../lib/kenney/actor";
import type { SpeakerConfig } from "../../store/types";
import { defaultTrackWaveform } from "../../lib/waveform/buildTracks";
import { useKenneyAvailability } from "../canvas/useKenneyAvailability";
import { setNote } from "../../lib/kenney/available";

interface Item { id: string; label: string; thumb: string; skin?: string; colours?: { hex: string }[]; anims?: string[]; moves?: string[] }
interface Prop { id: string; label: string; cat: string; by: string; thumb: string; msize?: number | null; hand: string; kind: string }
interface Rule { match: string; right?: string; left?: string }
interface Clip { file: string; name: string; desc: string }
interface Data { sets: Record<string, { items: Item[] }>; props: { items: Prop[]; rules: Rule[] }; motions: Record<string, Clip[]>; lights: { id: string; label: string }[] }

const SETS: [KenneySet, string, string][] = [
  ["mini", "Mini people", "Chunky toy people. They can hold things."],
  ["animated", "Humans", "Proper elbows, knees and fingers, and the whole motion library."],
  ["pets", "Pets", "24 cube animals. Ears, tails, wings and claws move with their mood."],
];
const CAT: Record<string, string> = { talk: "Talking", emote: "Feelings", sit: "Sit & kneel", move: "Moving", hands: "Hands & pets", dnd: "D&D" };
const MOOD_NAME: Record<string, string> = { open: "Calm", half: "Sleepy", closed: "Eyes shut", worried: "Worried", happy: "Happy", angry: "Angry", surprised: "Surprised", sad: "Sad" };

let dataP: Promise<Data> | null = null;
function loadData(): Promise<Data> {
  if (dataP) return dataP;
  const j = (rel: string) => fetch(kenneyAsset(rel)).then((r) => { if (!r.ok) throw new Error(rel); return r.json(); });
  dataP = Promise.all([j("manifest.json"), j("props.json"), j("motions.json").catch(() => ({})), j("lights/index.json").catch(() => ({ items: [] }))]).then(([m, props, motions, lights]) => ({ sets: m.sets, props, motions, lights: lights.items }));
  return dataP;
}
function useData() {
  const [d, setD] = useState<Data | null>(null);
  const [err, setErr] = useState(false);
  useEffect(() => { loadData().then(setD).catch(() => setErr(true)); }, []);
  return { d, err };
}

const chip = (on: boolean) => `btn ${on ? "btn-primary" : ""}`;
/** "Skaterfemale" -> "Skater (female)" */
const nice = (label: string) => label.replace(/^(.+?)(male|female)$/i, (_m, a: string, g: string) => `${a[0].toUpperCase()}${a.slice(1).toLowerCase()} (${g.toLowerCase()})`);

/** The add-a-speaker shelf. */
export function KenneyShelf({ count, onAdd }: { count: number; onAdd: (s: Partial<SpeakerConfig> & { label: string }) => void }) {
  const { d, err } = useData();
  const avail = useKenneyAvailability();
  const [set, setSet] = useState<KenneySet>("mini");
  if (err) return <p className="text-sm text-amber-300" data-tip="The 3D character files are missing from this copy of the app.">The 3D characters could not be loaded.</p>;
  if (!d) return <p className="text-sm text-neutral-500" data-tip="Reading the 3D cast. This takes a moment the first time.">Loading…</p>;
  return (
    <>
      <div className="flex gap-2 flex-wrap" role="group" aria-label="3D family">
        {SETS.map(([k, label, tip]) => {
          const off = setNote(k, avail);
          return <button key={k} className={`${chip(k === set)} ${off ? "personal-only" : ""}`} aria-disabled={!!off || undefined} onClick={() => { if (!off) setSet(k); }} data-tip={off ? `${label}: ${off}` : tip}>{label}</button>;
        })}
      </div>
      <div className="forge-shelf">
        {d.sets[set].items.map((it) => (
          <button key={it.id} className="shelf-face" data-tip={`Add ${it.label} as a 3D speaker. Colours, mood, motion and props can be changed afterwards.`}
            onClick={() => onAdd({
              label: nice(it.label),
              kenney: { set, base: it.id, skin: it.skin, motion: "idle", colours: {}, face: { mood: "open", blink: 1 }, props: {}, credit: "Kenney (kenney.nl), CC0" },
              kenneyFraming: "body", borderColor: "#7be0a5", bgColor: "#1a1a1a", bgOpacity: 0, borderOpacity: 0, outlineShape: "none", size: .42, y: .62,
              waveform: { ...defaultTrackWaveform(count % 2 === 1 ? 1 : -1), enabled: false },
            })}>
            <img src={kenneyAsset(it.thumb)} alt={it.label} style={{ width: 64, height: 64, objectFit: "contain" }} />
            <span>{nice(it.label)}</span>
          </button>
        ))}
      </div>
    </>
  );
}

/** Everything about one 3D speaker. */
export function KenneyEditor({ sp, update }: { sp: SpeakerConfig; update: (p: Partial<SpeakerConfig>) => void }) {
  const { d, err } = useData();
  const avail = useKenneyAvailability();
  const card = sp.kenney!;
  const set = (patch: Partial<KenneyCard>) => update({ kenney: { ...card, ...patch } });
  const [slot, setSlot] = useState<"right" | "left" | "mouth">(card.set === "pets" ? "mouth" : "right");
  const [cat, setCat] = useState<string | null>(null);
  const [libCat, setLibCat] = useState("talk");
  const [q, setQ] = useState("");
  useEffect(() => { if (card.set === "pets") setSlot("mouth"); else if (slot === "mouth") setSlot("right"); }, [card.set]); // eslint-disable-line react-hooks/exhaustive-deps

  const item = d?.sets[card.set].items.find((i) => i.id === card.base);
  const pool = useMemo(() => (d?.props.items ?? []).filter((p) => (card.set === "pets" ? p.msize : true)), [d, card.set]);
  const cats = [...new Set(pool.map((p) => p.cat))];
  const curCat = cat && cats.includes(cat) ? cat : cats[0];
  const lib = d?.motions ?? {};
  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    const all = t ? Object.entries(lib).flatMap(([k, v]) => v.map((m) => [k, m] as const)) : (lib[libCat] ?? []).map((m) => [libCat, m] as const);
    return all.filter(([, m]) => !t || (m.name + " " + m.desc).toLowerCase().includes(t)).slice(0, 80);
  }, [lib, libCat, q]);

  if (err) return <p className="text-sm text-amber-300">The 3D character files could not be loaded.</p>;
  if (!d || !item) return <p className="text-sm text-neutral-500" data-tip="Reading the 3D cast. This takes a moment the first time.">Loading…</p>;
  const off = setNote(card.set, avail);
  if (off) return <p className="text-sm text-amber-300 personal-only" data-tip={`This speaker is one of the 3D Humans. ${off} Swap them for a Mini person or a Pet to see and render them here.`}>3D Humans are in the personal build only.</p>;
  const props = card.props ?? {};
  const own = (item.anims ?? []).filter((n) => !/attack|shoot|die|wheelchair|static|Targeting|mixamo/i.test(n));

  /** Choosing a motion: a sword motion brings a sword, unless that hand already holds something. */
  function pickMotion(name: string, text: string) {
    const rule = d!.props.rules.find((r) => new RegExp(r.match).test(text.toLowerCase()));
    const next = { ...props };
    if (rule) for (const s of ["right", "left"] as const) if (rule[s] && !next[s]) next[s] = rule[s];
    set({ motion: name, props: next, motionsUsed: undefined });
  }
  function pickProp(id: string | null) {
    const next = { ...props }; if (id) next[slot] = id; else delete next[slot];
    const patch: Partial<KenneyCard> = { props: next };
    // Mini people raise their arm for a held thing
    if (card.set === "mini" && /^(idle|holding-(left|right|both))$/.test(card.motion ?? "idle")) {
      patch.motion = next.left && next.right ? "holding-both" : next.left ? "holding-left" : next.right ? "holding-right" : "idle";
    }
    set(patch);
  }
  const surprise = () => {
    const c: Record<string, string> = {};
    (item.colours ?? []).slice(0, 4).forEach((x) => { c[x.hex] = hsl(Math.random() * 360, 45 + Math.random() * 35, 35 + Math.random() * 30); });
    set({ colours: c });
  };

  return (
    <div className="space-y-3">
      <div>
        <div className="label-etched" data-tip="How close the camera is.">Shot</div>
        <div className="flex gap-2 flex-wrap mt-1">
          {([["body", "Full body"], ["bust", "Waist up"], ["face", "Face"]] as const).map(([k, l]) => <button key={k} className={chip((sp.kenneyFraming ?? "body") === k)} onClick={() => update({ kenneyFraming: k })} data-tip={`Frame them: ${l.toLowerCase()}.`}>{l}</button>)}
        </div>
      </div>

      <div>
        <div className="label-etched" data-tip="The face and body they keep when the script doesn't say otherwise. Tags like [sad] or [gasp] on a line change it for that line.">Resting mood</div>
        <div className="flex gap-2 flex-wrap mt-1">
          {KENNEY_MOODS.filter((m) => m !== "closed").map((m) => <button key={m} className={chip((card.face?.mood ?? "open") === m)} onClick={() => set({ face: { ...card.face, mood: m } })} data-tip={`Rest on: ${MOOD_NAME[m].toLowerCase()}. Face, shoulders, head and hands all follow.`}>{MOOD_NAME[m]}</button>)}
        </div>
        <label className="flex items-center gap-2 mt-2" data-tip="How often they blink. 0 never, 1 normal.">
          <span className="label-etched">Blinks</span>
          <input type="range" min={0} max={3} step={.1} value={card.face?.blink ?? 1} onChange={(e) => set({ face: { ...card.face, blink: Number(e.target.value) } })} className="flex-1" />
        </label>
      </div>

      {!!item.colours?.length && (
        <div>
          <div className="label-etched" data-tip="This character's main colours, biggest areas first. Change one and every part painted in it follows.">Colours</div>
          <div className="flex gap-2 flex-wrap mt-1 items-center">
            {item.colours.slice(0, 8).map((c) => <input key={c.hex} type="color" aria-label="Colour" value={card.colours?.[c.hex] ?? c.hex} onChange={(e) => set({ colours: { ...card.colours, [c.hex]: e.target.value } })} data-tip="Pick a new colour for this part." style={{ width: 38, height: 30 }} />)}
            <button className="btn" onClick={() => set({ colours: {} })} data-tip="Back to the original colours.">Reset</button>
            <button className="btn" onClick={surprise} data-tip="Random colours. Press again for another set.">Surprise me</button>
          </div>
        </div>
      )}

      <div>
        <div className="label-etched" data-tip="What they do when no script tag says otherwise. Tags like [waves] or [sits down] on a line play a motion for that line.">Motion</div>
        <div className="flex gap-2 flex-wrap mt-1">
          {own.map((n) => <button key={n} className={chip(card.motion === n)} onClick={() => pickMotion(n, n)} data-tip={`Their default motion: ${n.replace(/-/g, " ")}.`}>{n.replace(/-/g, " ")}</button>)}
        </div>
        {!!item.moves?.length && (
          <div className="flex gap-2 flex-wrap mt-2">
            {item.moves.map((m) => <button key={m} className={chip(card.move === m)} onClick={() => set({ move: card.move === m ? undefined : m })} data-tip={`Keeps doing this: ${m.replace("-", " ")}.`}>✦ {m.replace("-", " ")}</button>)}
          </div>
        )}
        {card.set === "animated" && Object.keys(lib).length > 0 && (
          <div className="mt-2 space-y-2">
            <input type="text" className="w-full" placeholder="Search motions: sword, phone, cry, sit…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search motions" data-tip="Search all motions in the library." />
            <div className="flex gap-2 flex-wrap">
              {Object.keys(lib).map((k) => <button key={k} className={chip(k === libCat && !q)} onClick={() => { setLibCat(k); setQ(""); }} data-tip={`Show ${CAT[k] ?? k} motions.`}>{CAT[k] ?? k} {lib[k].length}</button>)}
            </div>
            <div style={{ maxHeight: 180, overflowY: "auto" }} className="space-y-1">
              {rows.map(([k, m]) => (
                <button key={m.file} className={`${chip(card.motion === m.file)} w-full text-left`} onClick={() => pickMotion(m.file, m.name + " " + m.desc)} data-tip={`Use "${m.desc || m.name}" as their default motion.`}>{m.desc || m.name} <small className="text-neutral-500">{CAT[k]}</small></button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div>
        <div className="label-etched" data-tip="Something to hold. Pets carry in the mouth.">Props</div>
        <div className="flex gap-2 flex-wrap mt-1">
          {(card.set === "pets" ? ["mouth"] as const : ["right", "left"] as const).map((k) => <button key={k} className={chip(slot === k)} onClick={() => setSlot(k)} data-tip={`Choose what goes in the ${k === "mouth" ? "mouth" : k + " hand"}.`}>{k === "mouth" ? "Mouth" : k === "right" ? "Right hand" : "Left hand"}{props[k] ? " ✓" : ""}</button>)}
        </div>
        <div className="flex gap-2 flex-wrap mt-2">
          {cats.map((c) => <button key={c} className={chip(c === curCat)} onClick={() => setCat(c)} data-tip={`Show ${c.toLowerCase()} props.`}>{c}</button>)}
        </div>
        <div className="forge-shelf mt-2">
          <button className="shelf-face" onClick={() => pickProp(null)} data-tip="Nothing in this hand."><span className="text-sm text-neutral-500" style={{ height: 52, display: "flex", alignItems: "center" }}>Empty</span><span>{props[slot] ? "" : "✓"}</span></button>
          {pool.filter((p) => p.cat === curCat).map((p) => (
            <button key={p.id} className="shelf-face" onClick={() => pickProp(p.id)} data-tip={`${p.label}, by ${p.by}.`}>
              <img src={kenneyAsset(p.thumb)} alt={p.label} style={{ width: 52, height: 52, objectFit: "contain" }} />
              <span>{p.label}{props[slot] === p.id ? " ✓" : ""}</span>
            </button>
          ))}
        </div>
      </div>

      {d.lights.length > 0 && (
        <div>
          <div className="label-etched" data-tip="Light them with a real place: a studio, a field, a workshop. Skies from Poly Haven, CC0.">Light</div>
          <div className="forge-shelf mt-1" style={{ maxHeight: 190, overflowY: "auto" }}>
            <button className="shelf-face" onClick={() => set({ light: undefined })} data-tip="The app's plain studio light."><span className="text-sm text-neutral-500" style={{ height: 44, display: "flex", alignItems: "center" }}>Studio</span><span>{card.light ? "" : "✓"}</span></button>
            {d.lights.map((l) => <button key={l.id} className="shelf-face" onClick={() => set({ light: l.id })} data-tip={`Light them like: ${l.label}.`}><img src={kenneyAsset(`lights/${l.id}.png`)} alt={l.label} style={{ width: 88, height: 44, objectFit: "cover" }} /><span>{l.label}{card.light === l.id ? " ✓" : ""}</span></button>)}
          </div>
        </div>
      )}

      <p className="text-sm text-neutral-500" data-tip="Kenney gives these characters away for free, for anyone to use.">
        3D characters by <a href="https://kenney.nl" target="_blank" rel="noreferrer">Kenney</a>, CC0. Thank you, Kenney.
      </p>
      <button className="btn" onClick={() => update({ kenney: undefined, kenneyFraming: undefined })} data-tip="Stop using the 3D character for this speaker. Their voice and name stay.">Remove 3D character</button>
    </div>
  );
}

function hsl(h: number, s: number, l: number) {
  s /= 100; l /= 100;
  const k = (n: number) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l), f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return "#" + [f(0), f(8), f(4)].map((x) => Math.round(x * 255).toString(16).padStart(2, "0")).join("");
}
