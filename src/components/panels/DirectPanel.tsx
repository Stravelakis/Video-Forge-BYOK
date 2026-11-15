// ---------------------------------------------------------------------------
// The Direct step: for every line, who moves, where to, who they face, where the
// camera goes, how they feel, and WHEN in the line (click a word). Directions are
// kept apart from the script, so changing them never re-makes a voice.
// ---------------------------------------------------------------------------

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { SHELF } from "../../../characters/core/index.mjs";
import { useProjectStore } from "../../store/useProjectStore";
import { usePlayer } from "../../lib/motion/usePreviewPlayer";
import { moodFace } from "../../lib/motion/facePerformance";
import { kenneyAsset } from "../canvas/KenneyLive";
import type { DirItem } from "../../lib/direct/directions";
import { batches, readSuggestions, suggestPrompt, type SuggestLine, type SuggestSpeaker } from "../../lib/direct/suggest";
import type { NarrationSegment, SpeakerConfig } from "../../store/types";

type Kind = "go" | "do" | "face" | "camera" | "feel";
const KINDS: { id: Kind; emoji: string; name: string; tip: string }[] = [
  { id: "go", emoji: "🚶", name: "Walk", tip: "Walk to a spot or to someone. They stay there until told to move again." },
  { id: "do", emoji: "🎬", name: "Action", tip: "A gesture or motion: wave, sit down, dance, draw a sword…" },
  { id: "face", emoji: "👀", name: "Face", tip: "Turn to the camera, to one side, or to someone." },
  { id: "camera", emoji: "🎥", name: "Camera", tip: "Wide, medium or close on someone, or a slow push in or pull out." },
  { id: "feel", emoji: "😊", name: "Feeling", tip: "How they feel on this line: it changes the face and, for 3D, the body." },
];
const EMOJI: Record<Kind, string> = { go: "🚶", do: "🎬", face: "👀", camera: "🎥", feel: "😊" };
const kindOf = (tag: string): Kind => (/^(walks|goes|moves|runs|steps|comes)\b.*\bto\b/i.test(tag) ? "go" : /^(faces|turns to|looks at)\b/i.test(tag) ? "face" : /^camera\b/i.test(tag) ? "camera" : /^feels\b/i.test(tag) ? "feel" : "do");
const FEELINGS = [["happy", "Happy"], ["fond", "Fond"], ["sadness", "Sad"], ["annoyance", "Annoyed"], ["frustration", "Frustrated"], ["surprise", "Surprised"], ["nervousness", "Nervous"], ["panicked", "Panicked"], ["curiosity", "Curious"], ["confusion", "Confused"], ["determination", "Determined"], ["tired", "Tired"], ["serious", "Calm"]];

/** Where in the line each word starts, 0 to 1. */
function wordStarts(seg: NarrationSegment): { word: string; at: number }[] {
  const dur = Math.max(1, seg.endMs - seg.startMs);
  if (seg.words?.length) return seg.words.map((w) => ({ word: w.text, at: Math.max(0, Math.min(1, (w.startMs - seg.startMs) / dur)) }));
  const words = seg.text.replace(/\[[^\]]*\]/g, "").split(/\s+/).filter(Boolean);
  const total = words.reduce((n, w) => n + w.length + 1, 0) || 1;
  let acc = 0;
  return words.map((w) => { const at = acc / total; acc += w.length + 1; return { word: w, at }; });
}

/** The actions a speaker's Action button offers, as plain tags (for AI directing). */
async function actionsFor(sp: SpeakerConfig): Promise<string[]> {
  if (sp.kenney?.set === "animated") {
    const lib = (Object.values(await loadMotions()).flat() as { name: string; desc: string }[]).map((m) => (m.desc || m.name).toLowerCase());
    return [...new Set(lib)].slice(0, 200);
  }
  return [...new Set(Object.values(SHELF).filter((m) => m.kind !== "travel" && m.phrases.length).map((m) => m.phrases[0]))];
}

let motionsP: Promise<Record<string, { file: string; name: string; desc: string }[]>> | null = null;
const loadMotions = () => (motionsP ??= fetch(kenneyAsset("motions.json")).then((r) => (r.ok ? r.json() : {})).catch(() => ({})));

function Choices({ kind, sp, others, onAdd }: { kind: Kind; sp: SpeakerConfig; others: SpeakerConfig[]; onAdd: (tag: string) => void }) {
  const [q, setQ] = useState("");
  const [lib, setLib] = useState<{ file: string; name: string; desc: string }[]>([]);
  useEffect(() => { if (kind === "do" && sp.kenney?.set === "animated") void loadMotions().then((m) => setLib(Object.values(m).flat() as { file: string; name: string; desc: string }[])); }, [kind, sp.kenney?.set]);
  const opt = (tag: string, label: string, tip: string) => <button key={tag} className="btn" onClick={() => onAdd(tag)} data-tip={tip}>{label}</button>;
  if (kind === "go") return (
    <div className="flex flex-wrap gap-2">
      {opt("walks to left", "Left", "Walk to the left of the picture.")}{opt("walks to centre", "Centre", "Walk to the middle.")}{opt("walks to right", "Right", "Walk to the right of the picture.")}
      {opt("walks to their place", "Back to their place", "Walk back to where they started.")}
      {others.map((o) => opt(`walks to ${o.label}`, `Next to ${o.label}`, `Walk over and stand beside ${o.label}.`))}
      {opt("walks in", "Walk in (from left)", "Walk on from the left edge.")}{opt("walks in from the right", "Walk in (from right)", "Walk on from the right edge.")}{opt("walks out", "Walk out", "Leave the picture.")}
    </div>
  );
  if (kind === "face") return (
    <div className="flex flex-wrap gap-2">
      {opt("faces camera", "The camera", "Turn to the viewer.")}{opt("faces left", "Left", "Turn to the left.")}{opt("faces right", "Right", "Turn to the right.")}
      {others.map((o) => opt(`faces ${o.label}`, o.label, `Turn towards ${o.label}.`))}
    </div>
  );
  if (kind === "camera") return (
    <div className="flex flex-wrap gap-2">
      {opt("camera wide", "Wide", "Show everyone.")}
      {[sp, ...others].map((o) => opt(`camera medium on ${o.label}`, `Medium on ${o.label}`, `Move in on ${o.label}, waist up.`))}
      {[sp, ...others].map((o) => opt(`camera close on ${o.label}`, `Close on ${o.label}`, `A close-up of ${o.label}.`))}
      {opt("camera push in", "Slow push in", "Creep closer during this line.")}{opt("camera pull out", "Slow pull out", "Ease back during this line.")}
    </div>
  );
  if (kind === "feel") return (
    <div className="flex flex-wrap gap-2">{FEELINGS.filter(([id]) => moodFace(id) || id === "happy").map(([id, label]) => opt(`feels ${id}`, label, `On this line they feel ${label.toLowerCase()}.`))}</div>
  );
  // actions: the drawn moves, or for 3D Humans the motion library
  const t = q.trim().toLowerCase();
  const moves = Object.values(SHELF).filter((m) => m.kind !== "travel" && m.phrases.length).map((m) => ({ tag: m.phrases[0], help: m.help ?? m.name }));
  const rows = (sp.kenney?.set === "animated" ? lib.map((m) => ({ tag: (m.desc || m.name).toLowerCase(), help: m.desc || m.name })) : moves).filter((m) => !t || m.tag.includes(t) || m.help.toLowerCase().includes(t)).slice(0, 60);
  return (
    <div className="space-y-2">
      <input type="text" className="w-full" placeholder="Search: wave, sit, sword, dance… or type your own and press Enter" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && q.trim()) onAdd(q.trim()); }} aria-label="Search actions" data-tip="Find an action, or type your own and press Enter." />
      <div className="flex flex-wrap gap-2" style={{ maxHeight: 200, overflowY: "auto" }}>{rows.map((m) => opt(m.tag, m.tag, m.help))}</div>
    </div>
  );
}

function Line({ seg, i, sp, others }: { seg: NarrationSegment; i: number; sp: SpeakerConfig; others: SpeakerConfig[] }) {
  const d = useProjectStore((s) => s.directions?.[String(i)]);
  const set = useProjectStore((s) => s.setLineDirections);
  const player = usePlayer();
  const [at, setAt] = useState(0);
  const [open, setOpen] = useState<Kind | null>(null);
  const items: DirItem[] = d && d.text === seg.text ? d.items : [];
  const stale = d && d.text !== seg.text;
  const words = useMemo(() => wordStarts(seg), [seg]);
  const wordAt = (a: number) => words.reduce((best, w) => (w.at <= a + 1e-6 ? w : best), words[0])?.word ?? "";
  const add = (tag: string) => { set(String(i), { text: seg.text, items: [...items, { tag, at }] }); setOpen(null); };
  const remove = (k: number) => set(String(i), { text: seg.text, items: items.filter((_, n) => n !== k) });
  return (
    <div className="forge-dline" style={{ ["--c" as string]: sp.borderColor }}>
      <div className="forge-dline-head">
        <button className="forge-sample" onClick={() => player?.playSpan(seg.startMs, seg.endMs)} aria-label={`Play line ${i + 1}`} data-tip="Play this line in the preview, with its directions.">▶</button>
        <b data-tip={`Line ${i + 1}, spoken by ${sp.label}.`}>{sp.label}</b>
        <span className="text-sm text-neutral-500" data-tip="When this line starts in the video.">{(seg.startMs / 1000).toFixed(1)} s</span>
        {stale && <span className="text-sm text-amber-300" data-tip="The line's words changed after you directed it, so its old directions are set aside.">Line changed: directions set aside</span>}
      </div>
      <p className="forge-dline-text" data-tip="Click a word: the next direction you add happens on that word.">
        {words.map((w, k) => (
          <button key={k} className={`forge-dword ${Math.abs(w.at - at) < 1e-6 ? "on" : ""}`} onClick={() => setAt(w.at)} data-tip={`Directions you add next happen on "${w.word}".`}>{w.word}</button>
        ))}
      </p>
      {items.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {items.map((x, k) => (
            <span key={k} className={`forge-dchip ${x.ai ? "ai" : ""}`} style={x.ai ? { animationDelay: `${k * 90}ms` } : undefined} data-tip={`${x.ai ? "Suggested by AI: " : ""}${x.tag}, on "${wordAt(x.at)}". Press × to remove it.`}>
              {x.ai && <span aria-hidden>✨</span>}{EMOJI[kindOf(x.tag)]} {x.tag} <small>on “{wordAt(x.at)}”</small>
              <button onClick={() => remove(k)} aria-label="Remove direction" data-tip="Remove this direction.">×</button>
            </span>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {KINDS.map((k) => <button key={k.id} className={`btn ${open === k.id ? "btn-primary" : ""}`} onClick={() => setOpen(open === k.id ? null : k.id)} data-tip={k.tip}>{k.emoji} {k.name}</button>)}
        <span className="text-sm text-neutral-500 self-center" data-tip="The word the next direction happens on. Click another word to change it.">on “{wordAt(at)}”</span>
      </div>
      {open && <div className="mt-2"><Choices kind={open} sp={sp} others={others} onAdd={add} /></div>}
    </div>
  );
}

export function DirectPanel() {
  const narration = useProjectStore((s) => s.narration);
  const speakers = useProjectStore((s) => s.speakers);
  const directions = useProjectStore((s) => s.directions);
  const set = useProjectStore((s) => s.setLineDirections);
  const [only, setOnly] = useState<string | null>(null);
  const [big, setBig] = useState(true);
  const [aiOpen, setAiOpen] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState("");
  const [aiMsg, setAiMsg] = useState("");
  const [brain, setBrain] = useState(() => { try { return localStorage.getItem("vf.directBrain") ?? "auto"; } catch { return "auto"; } });
  const [brains, setBrains] = useState<{ id: string; label: string }[]>([]);
  useEffect(() => { if (aiOpen) void window.byok.llm.directBrains().then(setBrains).catch(() => setBrains([])); }, [aiOpen]);
  const pickBrain = (v: string) => { setBrain(v); try { localStorage.setItem("vf.directBrain", v); } catch { /* fine */ } };
  // the model, per provider: "" = the app picks the best it knows
  const [model, setModel] = useState("");
  const [models, setModels] = useState<string[]>([]);
  useEffect(() => {
    try { setModel(localStorage.getItem(`vf.directModel.${brain}`) ?? ""); } catch { setModel(""); }
    setModels([]);
    if (aiOpen && brain !== "auto") void window.byok.llm.directModels(brain).then(setModels).catch(() => setModels([]));
  }, [brain, aiOpen]);
  const pickModel = (v: string) => { setModel(v); try { localStorage.setItem(`vf.directModel.${brain}`, v); } catch { /* fine */ } };
  const segs = narration?.segments ?? [];
  const count = Object.values(directions ?? {}).reduce((n, d) => n + d.items.length, 0);
  const aiCount = Object.values(directions ?? {}).reduce((n, d) => n + d.items.filter((x) => x.ai).length, 0);
  /** Lines the user directed by hand keep their directions; every other line gets the AI's. */
  const ownLine = (i: number) => { const d = directions?.[String(i)]; return !!d && d.text === segs[i]?.text && d.items.some((x) => !x.ai); };
  const suggest = async () => {
    setAiMsg("");
    const cast: SuggestSpeaker[] = await Promise.all(speakers.map(async (sp) => ({ id: sp.id, label: sp.label, actions: await actionsFor(sp) })));
    const lines: SuggestLine[] = segs.map((seg, i) => ({ i, speakerId: seg.speakerId, text: seg.text, words: wordStarts(seg) })).filter((l) => !ownLine(l.i) && cast.some((c) => c.id === l.speakerId));
    if (!lines.length) { setAiMsg("Every line already has your own directions. Remove some to get suggestions there."); return; }
    let got = 0, failed = "", by = "";
    const askAi = async (p: { system: string; user: string }) => { const r = await window.byok.llm.suggestDirections(p.system, p.user, brain, brain !== "auto" && model ? model : undefined); by = r.by; return r.text; };
    const parts = batches(lines, 40);
    for (const [n, part] of parts.entries()) {
      setBusy(parts.length > 1 ? `Directing… part ${n + 1} of ${parts.length}` : "Directing…");
      try {
        const p = suggestPrompt(part, cast, { note });
        let found = readSuggestions(await askAi(p), part, cast);
        // an answer with nothing usable in it gets one more try
        if (!Object.keys(found).length) found = readSuggestions(await askAi(p), part, cast);
        for (const l of part) {
          const items = found[l.i] ?? [];
          got += items.length;
          set(String(l.i), items.length ? { text: l.text, items } : null);
        }
      } catch (e) { failed = String((e as Error)?.message ?? e).replace(/^Error invoking remote method '[^']+': (Error: )?/, ""); break; }
    }
    setBusy("");
    setAiMsg(failed ? `Stopped: ${failed}` : `${got} suggestion${got === 1 ? "" : "s"} added by ${by}. Press ▶ on a line to see it; × removes one you don't like.`);
  };
  const removeAi = () => Object.entries(directions ?? {}).forEach(([k, d]) => { const own = d.items.filter((x) => !x.ai); set(k, own.length ? { ...d, items: own } : null); });
  if (!segs.length) {
    return (
      <div className="space-y-3">
        <h2 className="title-deco text-lg" data-tip="Who moves, where, when, and where the camera looks.">Direct</h2>
        <p className="text-sm text-neutral-400" data-tip="Directing needs the timing of every line.">Make the narration in the Script step first: directions are placed on the words as they're spoken.</p>
      </div>
    );
  }
  // full height lives on the page itself: the steps column clips anything inside it
  const wrap = (node: ReactNode) => (big ? createPortal(node, document.body) : node);
  return wrap(
    <div className={big ? "forge-direct-big" : "flex flex-col h-full min-h-0"}>
      <div className="flex items-center gap-2 flex-wrap mb-2">
        <h2 className="title-deco text-lg" data-tip="Who moves, where, when, and where the camera looks.">Direct</h2>
        <span className="text-sm text-neutral-500" data-tip="How many directions this video has.">{count} direction{count === 1 ? "" : "s"} · click a word, then add what happens on it</span>
        <span className="ml-auto flex gap-2">
          <button className={`btn forge-ai-btn ${aiOpen ? "btn-primary" : ""}`} onClick={() => setAiOpen((v) => !v)} data-tip="Let AI suggest walks, turns, camera shots and feelings for every line you haven't directed yourself.">✨ Suggest</button>
          {aiCount > 0 && <button className="btn" onClick={removeAi} data-tip="Remove every AI suggestion. Directions you added yourself stay.">Remove suggestions</button>}
          {count > 0 && <button className="btn" onClick={() => Object.keys(directions ?? {}).forEach((k) => set(k, null))} data-tip="Remove every direction from every line.">Clear all</button>}
          <button className="btn" onClick={() => setBig((v) => !v)} data-tip={big ? "Tuck the Direct step back into the steps column." : "Give the Direct step the full height of the window, beside the preview."}>{big ? "Smaller" : "Full height"}</button>
        </span>
      </div>
      {aiOpen && (
        <div className={`forge-ai-bar ${busy ? "busy" : ""}`}>
          <p className="text-sm" data-tip="How AI directing works.">AI reads the script and picks from the same choices you have. Lines you directed yourself are left alone; its own earlier suggestions are replaced.</p>
          <div className="flex gap-2 items-center">
            <select value={brain} onChange={(e) => pickBrain(e.target.value)} aria-label="Which AI directs" data-tip="Which AI writes the directions. Auto tries your saved keys (Settings), best first.">
              <option value="auto">Auto (best saved key)</option>
              {brains.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
            </select>
            {brain !== "auto" && (
              <select value={model} onChange={(e) => pickModel(e.target.value)} aria-label="Which model" data-tip="Which of this provider's models directs. Best = the app picks.">
                <option value="">Best (app picks)</option>
                {models.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            )}
            <input type="text" className="flex-1" placeholder="Optional note: calm explainer, heated argument, slapstick…" value={note} onChange={(e) => setNote(e.target.value)} aria-label="Note for the AI director" data-tip="Tell the AI the tone you want. Leave empty to let it read the script." />
            <button className="btn btn-primary" disabled={!!busy} onClick={() => void suggest()} data-tip="Ask the AI for directions now. Needs an AI key in Settings: Gemini, OpenRouter, NVIDIA, Groq, Cerebras, Mistral, OpenAI or your own server.">{busy || "✨ Direct it"}</button>
          </div>
          {aiMsg && <p className="text-sm text-neutral-300" data-tip="What the AI director did.">{aiMsg}</p>}
        </div>
      )}
      <div className="flex flex-wrap gap-2 mb-2">
        <button className={`btn ${!only ? "btn-primary" : ""}`} onClick={() => setOnly(null)} data-tip="Show every line.">Everyone</button>
        {speakers.map((sp) => <button key={sp.id} className={`btn ${only === sp.id ? "btn-primary" : ""}`} onClick={() => setOnly(sp.id)} data-tip={`Only ${sp.label}'s lines.`}>{sp.label}</button>)}
      </div>
      <div className="flex-1 overflow-y-auto pr-1 space-y-2">
        {segs.map((seg, i) => {
          const sp = speakers.find((s) => s.id === seg.speakerId);
          if (!sp || (only && only !== sp.id)) return null;
          return <Line key={i} seg={seg} i={i} sp={sp} others={speakers.filter((o) => o.id !== sp.id)} />;
        })}
      </div>
    </div>
  );
}
