// ---------------------------------------------------------------------------
// Pick a set: the built-in ones (characters/sets/sets.mjs: news desk, meeting,
// stage, podcasts, game show, Supreme Court) and sets made from a description
// (characters/sets/custom.mjs). Each tile is the set itself, drawn live. With a
// set the speakers are seated in it and the furniture hides them from the waist
// down; "No set" puts them back where they were placed.
//
// NEW SETS (Ak, 10 Nov 2026): describe it, then either the app's AI draws it, or
// you copy a ready prompt to any AI and paste its answer back. Either way the
// answer is plain data checked by checkSpec, never code.
// ---------------------------------------------------------------------------

import { useLayoutEffect, useRef, useState } from "react";
import { SETS, SET_IDS } from "../../../characters/sets/sets.mjs";
import { checkSpec, setFor, setPrompt, type SetSpec } from "../../../characters/sets/custom.mjs";
import { useProjectStore } from "../../store/useProjectStore";
import { useCustomSets } from "../../store/useCustomSets";

function Tile({ id, spec }: { id: string; spec?: SetSpec }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const cv = ref.current;
    const set = setFor({ id, spec });
    if (!cv || !set) return;
    cv.width = 320; cv.height = 180;
    const ctx = cv.getContext("2d")!;
    set.back(ctx, 320, 180, { title: id === "news" ? "NEWS" : id === "stage" ? "TALK" : "", names: ["A", "B"] });
    set.front(ctx, 320, 180, { names: ["A", "B"] });
  }, [id, spec]);
  return <canvas ref={ref} style={{ width: "100%", aspectRatio: "16 / 9", display: "block", borderRadius: 10 }} />;
}

const SYSTEM = "You design backgrounds drawn by simple code. You answer with one JSON object only.";

function NewSet() {
  const speakers = useProjectStore((s) => s.speakers);
  const setScene = useProjectStore((s) => s.setScene);
  const add = useCustomSets((s) => s.add);
  const [desc, setDesc] = useState("");
  const [seats, setSeats] = useState(Math.max(1, Math.min(6, speakers.length || 2)));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [paste, setPaste] = useState("");
  const [copied, setCopied] = useState(false);
  const [made, setMade] = useState<SetSpec | null>(null);
  const take = (raw: string, by: string) => {
    const { spec, problems } = checkSpec(raw);
    if (!spec) { setMsg(`That answer can't be used: ${problems.join(" ")} Try again, or reword the description.`); return; }
    setMade(spec); setMsg(`${spec.label}, made by ${by}.${problems.length ? " " + problems.join(" ") : ""} Rest the mouse on it to see it with your characters.`);
  };
  async function generate() {
    setBusy(true); setMsg(""); setMade(null);
    try { const r = await window.byok.llm.makeSet(SYSTEM, setPrompt(desc, seats)); take(r.text, r.by); }
    catch (e) { setMsg(String((e as Error)?.message ?? e).replace(/^Error invoking remote method '[^']+': (Error: )?/, "")); }
    finally { setBusy(false); }
  }
  const use = (spec: SetSpec) => { const id = add(spec); setScene({ id, spec, title: "", names: [] }); setMade(null); setMsg(`Using ${spec.label}. It's saved with your sets.`); };
  return (
    <div className="forge-newset" data-tip="Make a set that doesn't exist yet.">
      <b className="label-etched" data-tip="Describe a place; the AI draws it as a set.">✨ Make a new set</b>
      <textarea rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="A cosy bakery counter with bread shelves behind, warm morning light" aria-label="Describe the set" data-tip="Describe the place in plain words: what's behind them and what's in front of them." />
      <div className="flex gap-2 items-center flex-wrap">
        <label className="flex gap-2 items-center" data-tip="How many characters it seats."><span className="label-etched" data-tip="How many characters it seats.">Seats</span>
          <input type="number" min={1} max={12} value={seats} onChange={(e) => setSeats(Math.max(1, Math.min(12, Number(e.target.value) || 1)))} style={{ width: 64 }} aria-label="Seats" data-tip="How many characters it seats." /></label>
        <button className="btn btn-primary" disabled={busy || desc.trim().length < 4} onClick={() => void generate()} data-tip="The app's AI draws the set now (uses your AI keys from Settings).">{busy ? "Drawing…" : "✨ Make it"}</button>
        <button className="btn" disabled={desc.trim().length < 4} onClick={() => { void navigator.clipboard.writeText(setPrompt(desc, seats)); setCopied(true); }} data-tip="Copy the full instructions, to paste into any AI chat (ChatGPT, Claude, Gemini).">{copied ? "Copied ✓" : "Copy a prompt for another AI"}</button>
      </div>
      {copied && (
        <div className="space-y-1">
          <textarea rows={3} value={paste} onChange={(e) => setPaste(e.target.value)} placeholder="Paste the AI's answer here" aria-label="The other AI's answer" data-tip="Paste the whole answer the other AI gave you." />
          <button className="btn" disabled={!paste.trim()} onClick={() => take(paste, "your AI")} data-tip="Check the answer and show the set.">Use this answer</button>
        </div>
      )}
      {msg && <p className="text-sm text-neutral-300" data-tip="What happened.">{msg}</p>}
      {made && (
        <button className="forge-set-tile" onClick={() => use(made)} data-tip="Click to use this set." data-preview={JSON.stringify({ kind: "set", id: "custom-new", spec: made })}>
          <Tile id="custom-new" spec={made} />
          <span>{made.label} · click to use</span>
        </button>
      )}
    </div>
  );
}

export function SetPicker() {
  const scene = useProjectStore((s) => s.scene);
  const setScene = useProjectStore((s) => s.setScene);
  const speakers = useProjectStore((s) => s.speakers);
  const mine = useCustomSets((s) => s.sets);
  const remove = useCustomSets((s) => s.remove);
  const cur = setFor(scene);
  return (
    <section className="space-y-2 mb-5">
      <div className="label-etched" data-tip="A place for your speakers to sit: they are seated in it and the furniture hides them from the waist down.">Set</div>
      <NewSet />
      <div className="grid grid-cols-2 gap-2">
        <button
          className={`forge-set-tile ${!scene ? "on" : ""}`}
          onClick={() => setScene(null)}
          data-tip="No set: the speakers stand where you placed them, over the background."
        >
          <div className="none">No set</div>
        </button>
        {SET_IDS.map((id) => (
          <button
            key={id}
            className={`forge-set-tile ${scene?.id === id ? "on" : ""}`}
            onClick={() => setScene({ id, title: scene?.id === id ? scene.title : "", names: scene?.names ?? [] })}
            data-tip={`${SETS[id].help} Seats up to ${SETS[id].max}.`}
            data-preview={JSON.stringify({ kind: "set", id })}
          >
            <Tile id={id} />
            <span>{SETS[id].label}</span>
          </button>
        ))}
        {mine.map((m) => (
          <div key={m.id} className="relative">
            <button className={`forge-set-tile w-full ${scene?.id === m.id ? "on" : ""}`} onClick={() => setScene({ id: m.id, spec: m.spec, title: "", names: [] })} data-tip={`${m.spec.help || "A set you made."} Seats up to ${m.spec.seats.length}.`} data-preview={JSON.stringify({ kind: "set", id: m.id, spec: m.spec })}>
              <Tile id={m.id} spec={m.spec} />
              <span>✨ {m.spec.label}</span>
            </button>
            <button className="forge-set-x" onClick={() => { remove(m.id); if (scene?.id === m.id) setScene(null); }} aria-label={`Delete ${m.spec.label}`} data-tip="Delete this set you made.">×</button>
          </div>
        ))}
      </div>
      {cur && scene && (
        <>
          {speakers.length > cur.max && (
            <p className="text-sm text-amber-300" data-tip="The set has fewer seats than you have speakers.">
              This set seats {cur.max}; the first {cur.max} speakers are shown.
            </p>
          )}
          {(scene.id === "news" || scene.id === "stage") && (
            <label className="block" data-tip="The words on the set: under the news desk, or on the big screen behind the stage.">
              <span className="label-etched">Title on the set</span>
              <input type="text" className="w-full mt-1" maxLength={40} placeholder="MORNING BRIEF" value={scene.title ?? ""} onChange={(e) => setScene({ ...scene, title: e.target.value.toUpperCase() })} />
            </label>
          )}
          {scene.id === "podcastSplit" && (
            <label className="block" data-tip="The name tags under each host, left then right, separated by a comma.">
              <span className="label-etched">Name tags</span>
              <input type="text" className="w-full mt-1" maxLength={40} placeholder="NIKOS, MAYA" value={(scene.names ?? []).join(", ")} onChange={(e) => setScene({ ...scene, names: e.target.value.toUpperCase().split(",").map((x) => x.trim()).filter(Boolean).slice(0, 2) })} />
            </label>
          )}
        </>
      )}
    </section>
  );
}
