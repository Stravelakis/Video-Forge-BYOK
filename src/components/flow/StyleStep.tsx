// Step 1: choose the style. Every style shown moving, with pros and cons.
import { useEffect, useMemo, useState } from "react";
import { DRAWN_PRESETS, lookById, normalizeCard } from "../../../characters/core/index.mjs";
import { CLIPS } from "../creator/drawing";
import { LiveFigure } from "../creator/Figure";
import { LiveFace } from "../panels/LiveFace";
import { builtinPuppetPath, type BrandInfo } from "../../store/builtinCast";
import { useFlowStore, type FlowTemplate } from "../../store/useFlowStore";
import { useProjectStore } from "../../store/useProjectStore";
import type { KenneyCard } from "../../lib/kenney/actor";
import { GROUPS, STYLES, styleOf, type StyleInfo } from "./styles";
import { KenneyDemo, PopOn } from "./HoverPop";
import { kenneyAsset } from "../canvas/KenneyLive";
import { useKenneyAvailability } from "../canvas/useKenneyAvailability";
import { PERSONAL_ONLY_NOTE, setAvailable } from "../../lib/kenney/available";

const clip = (id: string) => CLIPS.find((c) => c.id === id) ?? CLIPS[0];
const demoCard = (look: string) => normalizeCard({ ...(DRAWN_PRESETS.find((p) => p.subjects.includes("everyday")) ?? DRAWN_PRESETS[0]).card, name: "Demo", look }).card;
const DEMO3D: Record<string, KenneyCard> = {
  "3d-animated": { set: "animated", base: "skaterMaleA", motion: "talk", face: { mood: "happy" }, props: {} },
  "3d-mini": { set: "mini", base: "character-female-b", motion: "holding-right", face: { mood: "surprised" }, props: { right: "sword" } },
  "3d-pets": { set: "pets", base: "animal-dog", motion: "idle", face: { mood: "happy" }, props: { mouth: "bone" } },
};

let sample: string | null = null;
function usePuppetSample() {
  const [p, setP] = useState(sample);
  useEffect(() => {
    if (sample) return;
    window.byok?.brand?.active().then((b: BrandInfo | null) => { if (b?.cast[0]) { sample = builtinPuppetPath(b.puppetDir, b.cast[0].file); setP(sample); } }).catch(() => undefined);
  }, []);
  return p;
}

/** A still picture for a 3D set this build does not have (no model to load). */
const Still = ({ size }: { size?: number }) => <img src={kenneyAsset("thumbs/anim-skaterFemaleA.png")} alt="3D Humans" style={size ? { width: size, height: size, objectFit: "contain" } : undefined} />;
const missing3d = (s: StyleInfo, ok: (set: string) => boolean) => s.style.family === "3d" && !ok(s.style.set);

function Demo({ s, off }: { s: StyleInfo; off?: boolean }) {
  const puppet = usePuppetSample();
  if (off) return <div className="flow-demo flow-demo-3d" data-tip={PERSONAL_ONLY_NOTE}><Still /></div>;
  if (s.style.family === "drawn") {
    const look = lookById(s.style.look);
    return <div className="flow-demo" style={{ background: (look as { stage?: string }).stage }}><LiveFigure card={demoCard(s.style.look)} look={look} clip={clip("talk")} framing="waist" fps={12} /></div>;
  }
  if (s.style.family === "3d") return <div className="flow-demo flow-demo-3d"><KenneyDemo card={DEMO3D[s.id]} size={200} /></div>;
  return <div className="flow-demo flow-demo-puppet" data-tip="Picture puppets come from Image Forge: Pixar-like, lifelike, photo, flat, clay, paper, anime, doodle or stick.">{puppet ? <LiveFace path={puppet} label="Puppet" size={180} talking /> : "🖼️"}</div>;
}

function Big({ s, size, off }: { s: StyleInfo; size: number; off?: boolean }) {
  if (off) return <Still size={size} />;
  if (s.style.family === "drawn") {
    const look = lookById(s.style.look);
    return <div style={{ width: size, height: size, background: (look as { stage?: string }).stage }}><LiveFigure card={demoCard(s.style.look)} look={look} clip={clip("wave")} framing="full" fps={30} pad={0.04} /></div>;
  }
  if (s.style.family === "3d") return <KenneyDemo card={DEMO3D[s.id]} size={size} />;
  return sample ? <LiveFace path={sample} label="Puppet" size={size * .9} talking /> : <div className="flow-demo-puppet" style={{ width: size, height: size, fontSize: size / 4 }} data-tip="Picture puppets are shown in the next step.">🖼️</div>;
}

export function StyleStep() {
  const cur = useFlowStore((f) => f.style);
  const setStyle = useFlowStore((f) => f.setStyle);
  const setStep = useFlowStore((f) => f.setStep);
  const templates = useFlowStore((f) => f.templates);
  const restore = useFlowStore((f) => f.restore);
  const removeTemplate = useFlowStore((f) => f.removeTemplate);
  const chosen = styleOf(cur)?.id;
  const avail = useKenneyAvailability();
  const ok = (set: string) => setAvailable(set, avail);
  const groups = useMemo(() => GROUPS.map((g) => ({ ...g, items: STYLES.filter((s) => s.group === g.id) })), []);
  const useTemplate = (t: FlowTemplate) => { useProjectStore.setState(t.project as never); restore(t); };
  return (
    <div className="flow-page">
      <h2 className="flow-h" data-tip="Everything else in this video is chosen to match this style.">Choose your style</h2>
      <p className="flow-lede" data-tip="Move the mouse over any style to see it large and moving.">Rest the mouse on a style to see it large. You can change it later and mix styles in one video.</p>
      {templates.length > 0 && (
        <section className="flow-group">
          <h3 data-tip="Set-ups you saved on the last step.">Start from a template</h3>
          <div className="flow-chips">
            {templates.map((t) => (
              <span key={t.id} className="flow-tpl">
                <button className="btn" onClick={() => useTemplate(t)} data-tip={`Load every choice saved in "${t.name}".`}>{t.name}</button>
                <button className="btn" onClick={() => removeTemplate(t.id)} data-tip={`Delete the template "${t.name}".`} aria-label={`Delete ${t.name}`}>×</button>
              </span>
            ))}
          </div>
        </section>
      )}
      {groups.map((g) => (
        <section key={g.id} className="flow-group">
          <h3 data-tip={g.sub}>{g.title} <small>{g.sub}</small></h3>
          <div className="flow-styles">
            {g.items.map((s) => {
              const name = s.name ?? (s.style.family === "drawn" ? lookById(s.style.look).name : s.id);
              const blurb = s.style.family === "drawn" ? lookById(s.style.look).blurb : undefined;
              const off = missing3d(s, ok);
              return (
                <PopOn key={s.id} label={name} note={off ? PERSONAL_ONLY_NOTE : blurb} render={(size) => <Big s={s} size={size} off={off} />}>
                  <button className={`flow-style ${chosen === s.id ? "on" : ""} ${off ? "personal-only" : ""}`} aria-disabled={off || undefined}
                    onClick={() => { if (off) return; setStyle(s.style); setStep(2); }}
                    data-tip={off ? `${name}: ${PERSONAL_ONLY_NOTE} Their motions come from a library that cannot be shared.` : `Make this video in ${name}, then choose the characters.`}>
                    <Demo s={s} off={off} />
                    <b>{name}</b>
                    <ul className="flow-pros">{s.pros.map((p) => <li key={p}>{p}</li>)}</ul>
                    <ul className="flow-cons">{s.cons.map((p) => <li key={p}>{p}</li>)}</ul>
                  </button>
                </PopOn>
              );
            })}
          </div>
        </section>
      ))}
      <p className="flow-note" data-tip="Who made the 3D characters and pets."><a href="https://kenney.nl" target="_blank" rel="noreferrer">3D characters by Kenney</a>, CC0. Thank you, Kenney.</p>
    </div>
  );
}
