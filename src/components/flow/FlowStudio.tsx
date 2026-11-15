// ---------------------------------------------------------------------------
// The way to set up a video: style, characters, background, format, review.
// Full window, one decision at a time, every step reachable to go back.
// ---------------------------------------------------------------------------

import { useEffect, useState } from "react";
import { lookById } from "../../../characters/core/index.mjs";
import { useFlowStore } from "../../store/useFlowStore";
import { useProjectStore } from "../../store/useProjectStore";
import { BackgroundStep, METHODS } from "./BackgroundStep";
import { CastStep, PARAMS, statusOf } from "./CastStep";
import { FORMATS, FormatStep, applyFormat } from "./FormatStep";
import { HoverPopLayer } from "./HoverPop";
import { StyleStep } from "./StyleStep";
import { styleOf } from "./styles";

const STEPS = [
  { n: 1, title: "Style", tip: "How the characters are drawn." },
  { n: 2, title: "Characters", tip: "Who is in the video." },
  { n: 3, title: "Background", tip: "Where they are." },
  { n: 4, title: "Format", tip: "What kind of video it is." },
  { n: 5, title: "Review", tip: "Check everything, save it, go to production." },
];

function useProblems() {
  const speakers = useProjectStore((s) => s.speakers);
  const approved = useFlowStore((f) => f.approved);
  return speakers.flatMap((sp) => PARAMS.filter((p) => statusOf(sp, p.id, !!approved[sp.id]?.[p.id]) === "red").map((p) => ({ sp, p })));
}

function Review({ onProduce }: { onProduce: (mode?: "explainer" | "many") => void }) {
  const f = useFlowStore();
  const project = useProjectStore();
  const problems = useProblems();
  const [name, setName] = useState("");
  const [saved, setSaved] = useState(false);
  const info = styleOf(f.style);
  const styleName = info?.name ?? (f.style?.family === "drawn" ? lookById(f.style.look).name : "Not chosen");
  const format = FORMATS.find((x) => x.id === f.format);
  const method = METHODS.find((m) => m.id === f.bgMethod);
  const row = (step: number, label: string, value: string, ok: boolean) => (
    <div className="flow-row" key={label}>
      <span className={ok ? "flow-dot ok" : "flow-dot red"} data-tip={ok ? "Chosen." : "Not chosen yet."} />
      <b data-tip={`The ${label.toLowerCase()} of this video.`}>{label}</b>
      <span data-tip={value}>{value}</span>
      <button className="btn" onClick={() => f.setStep(step)} data-tip={`Go back and change the ${label.toLowerCase()}.`}>Change</button>
    </div>
  );
  function save() {
    if (!name.trim()) return;
    const { speakers, scene, backgrounds, render, fps, subtitles, backgroundDim, backgroundBlur, backgroundCrossfadeMs } = project;
    f.saveTemplate({ id: String(Date.now()), name: name.trim(), savedAt: Date.now(), style: f.style, format: f.format, bgMethod: f.bgMethod, project: { speakers, scene, backgrounds, render, fps, subtitles, backgroundDim, backgroundBlur, backgroundCrossfadeMs } });
    setSaved(true);
  }
  return (
    <div className="flow-page flow-review">
      <h2 className="flow-h" data-tip="Everything chosen so far.">Review</h2>
      {row(1, "Style", styleName, !!f.style)}
      {row(2, "Characters", project.speakers.map((s) => s.label).join(", ") || "Nobody yet", project.speakers.length > 0)}
      {row(3, "Background", [method?.name, project.scene ? `Set: ${project.scene.id}` : "", project.backgrounds.length ? `${project.backgrounds.length} picked` : ""].filter(Boolean).join(" · ") || "Plain", true)}
      {row(4, "Format", format ? `${format.name} · ${project.render.format}` : "Not chosen", !!format)}
      {problems.length > 0 && (
        <section className="flow-group">
          <h3 data-tip="These need a choice from you before the video can be good.">Still needs you</h3>
          {problems.map(({ sp, p }) => <p key={sp.id + p.id} className="flow-need" data-tip={p.tip}>{p.emoji} {sp.label}: {p.name}</p>)}
        </section>
      )}
      <section className="flow-group">
        <h3 data-tip="Keeps every choice above so you can start a new video from it.">Save as a template</h3>
        <div className="flow-chips">
          <input type="text" value={name} placeholder="e.g. Dog channel duo" onChange={(e) => { setName(e.target.value); setSaved(false); }} aria-label="Template name" data-tip="A name for this set-up." />
          <button className="btn" disabled={!name.trim()} onClick={save} data-tip="Save these choices. They appear at the top of step 1.">Save template</button>
          {saved && <span className="flow-ok" data-tip="Saved. It's at the top of step 1.">Saved ✓</span>}
        </div>
      </section>
      <button className="flow-go" onClick={() => { if (format && !format.mode) applyFormat(format); onProduce(format?.mode); }} data-tip="Next: write the script, make the voices and render the video.">Go to production →</button>
      <p className="flow-note" data-tip="What happens next.">Production is where the script, voices and final render happen.</p>
    </div>
  );
}

export function FlowStudio({ onProduce }: { onProduce: (mode?: "explainer" | "many") => void }) {
  useEffect(() => { try { localStorage.setItem("vf.flowSeen", "1"); } catch { /* fine */ } }, []);
  const step = useFlowStore((f) => f.step);
  const setStep = useFlowStore((f) => f.setStep);
  const style = useFlowStore((f) => f.style);
  const format = useFlowStore((f) => f.format);
  const n = useProjectStore((s) => s.speakers.length);
  const summary = (i: number) => (i === 1 ? (style ? styleOf(style)?.name ?? (style.family === "drawn" ? lookById(style.look).name : "") : "") : i === 2 ? (n ? `${n} chosen` : "") : i === 4 ? FORMATS.find((x) => x.id === format)?.name ?? "" : "");
  const problems = useProblems();
  return (
    <div className="flow">
      <nav className="flow-steps" aria-label="Steps">
        {STEPS.map((s) => (
          <button key={s.n} className={`flow-step ${s.n === step ? "on" : ""} ${s.n < step ? "done" : ""}`} onClick={() => setStep(s.n)} data-tip={s.tip}>
            <i>{s.n}</i><b>{s.title}</b>{summary(s.n) ? <small>{summary(s.n)}</small> : null}
            {s.n === 2 && problems.length > 0 ? <em data-tip="Settings that need a choice from you.">{problems.length}</em> : null}
          </button>
        ))}
      </nav>
      <div className="flow-body">
        {step === 1 && <StyleStep />}
        {step === 2 && <CastStep />}
        {step === 3 && <BackgroundStep />}
        {step === 4 && <FormatStep />}
        {step === 5 && <Review onProduce={onProduce} />}
      </div>
      <div className="flow-foot">
        {step > 1 ? <button className="btn" onClick={() => setStep(step - 1)} data-tip="Back one step. Nothing is lost.">← Back</button> : <span />}
        {step < 5 ? <button className="flow-next" onClick={() => setStep(step + 1)} data-tip={`Next: ${STEPS[step].title}.`}>Next: {STEPS[step].title} →</button> : <span />}
      </div>
      <HoverPopLayer />
    </div>
  );
}
