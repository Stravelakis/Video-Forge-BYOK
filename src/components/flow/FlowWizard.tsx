// ---------------------------------------------------------------------------
// Google Flow, step by step (Ak, 10 Nov 2026): 1 style, 2 describe the place,
// 3 the AI writes the picture prompt, 4 optionally a looping video: the AI
// suggests what could move in THIS picture, you tick some, it writes the video
// prompt. Plain instructions for Flow at every step, and a way to bring the
// picture or the clip back as the background.
// ---------------------------------------------------------------------------

import { useState } from "react";
import { lookById } from "../../../characters/core/index.mjs";
import { LOOKS, imagePromptRequest, motionIdeasRequest, readIdeas, readImagePrompt, readVideoPrompt, videoPromptRequest } from "../../lib/flow/flowPrompts";
import { useFlowStore } from "../../store/useFlowStore";
import { useProjectStore } from "../../store/useProjectStore";
import { plainError } from "../../lib/plainError";

const FLOW_URL = "https://labs.google/fx/tools/flow";

export function FlowWizard({ onAdd }: { onAdd: (file: string, label: string, reason: string, id: string) => void }) {
  const style = useFlowStore((f) => f.style);
  const render = useProjectStore((s) => s.render);
  const [look, setLook] = useState("match");
  const [place, setPlace] = useState("");
  const [mood, setMood] = useState("");
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [img, setImg] = useState<{ title: string; prompt: string; avoid: string } | null>(null);
  const [wantLoop, setWantLoop] = useState<boolean | null>(null);
  const [ideas, setIdeas] = useState<{ label: string; motion: string; strength: string }[]>([]);
  const [picked, setPicked] = useState<number[]>([]);
  const [video, setVideo] = useState("");
  const [copied, setCopied] = useState("");
  const [added, setAdded] = useState("");
  const aspect = render.height > render.width ? "9:16" : "16:9";
  const matchWords = style?.family === "drawn" ? `${lookById(style.look).name} style: ${lookById(style.look).blurb}` : style?.family === "3d" ? "soft stylised 3D render, rounded toy-like shapes, bright simple materials" : "rich illustrated style";
  const lookWords = look === "match" ? matchWords : LOOKS.find((l) => l.id === look)!.words;
  const ask = async (req: { system: string; user: string }) => (await window.byok.llm.makeSet(req.system, req.user)).text;
  const step = async (label: string, fn: () => Promise<void>) => { setBusy(label); setErr(""); try { await fn(); } catch (e) { setErr(plainError(e, "Try again.")); } finally { setBusy(""); } };
  const makeImage = () => step("Writing the picture prompt…", async () => {
    let r = readImagePrompt(await ask(imagePromptRequest({ place, look: lookWords, aspect, mood })));
    if (!r) r = readImagePrompt(await ask(imagePromptRequest({ place, look: lookWords, aspect, mood })));
    if (!r) throw new Error("The AI's answer wasn't a usable prompt. Press Generate again.");
    setImg(r); setWantLoop(null); setIdeas([]); setPicked([]); setVideo("");
  });
  const makeIdeas = () => step("Looking for things that could move…", async () => {
    const list = readIdeas(await ask(motionIdeasRequest(img!.prompt)));
    if (!list.length) throw new Error("No ideas came back. Press the button again.");
    setIdeas(list); setPicked([0, 1].filter((i) => i < list.length));
  });
  const makeVideo = () => step("Writing the loop prompt…", async () => {
    const p = readVideoPrompt(await ask(videoPromptRequest(img!.prompt, picked.map((i) => ideas[i].motion))));
    if (!p) throw new Error("The AI's answer wasn't a usable prompt. Press the button again.");
    setVideo(p);
  });
  const copy = (id: string, t: string) => { void navigator.clipboard.writeText(t); setCopied(id); };
  const bring = (kind: "picture" | "clip") => step("Bringing it in…", async () => {
    const f = await window.byok.dialog.openFile(kind === "picture" ? [{ name: "Picture", extensions: ["png", "jpg", "jpeg", "webp"] }] : [{ name: "Video clip", extensions: ["mp4", "mov", "webm"] }]);
    if (!f) return;
    const name = f.split(/[\\/]/).pop() ?? kind;
    const file = kind === "picture" ? await window.byok.media.fileClip(f, render.width, render.height) : f;
    onAdd(file, img?.title ?? name, "Made in Google Flow.", "flow-" + Date.now()); setAdded(name);
  });
  const Num = ({ n, done }: { n: number; done: boolean }) => <span className={`flow-wiz-n ${done ? "done" : ""}`} data-tip={done ? "Done." : "This step."}>{done ? "✓" : n}</span>;
  return (
    <div className="flow-wiz">
      <section>
        <h4><Num n={1} done={true} /> Choose the look</h4>
        <div className="flow-chips">{LOOKS.map((l) => <button key={l.id} className={`btn ${look === l.id ? "btn-primary" : ""}`} onClick={() => setLook(l.id)} data-tip={l.id === "match" ? `The look of your characters: ${matchWords}.` : l.words}>{l.name}</button>)}</div>
      </section>
      <section>
        <h4><Num n={2} done={place.trim().length > 3} /> Describe the place</h4>
        <textarea rows={3} value={place} onChange={(e) => setPlace(e.target.value)} placeholder="A small bakery at dawn, bread on wooden shelves, a big window onto a quiet street" aria-label="Describe the place" data-tip="Say what is there and where. The AI turns it into a proper prompt." />
        <input type="text" value={mood} onChange={(e) => setMood(e.target.value)} placeholder="Mood (optional): calm, cosy, mysterious…" aria-label="Mood" data-tip="How the place should feel." />
      </section>
      <section>
        <h4><Num n={3} done={!!img} /> Make the picture prompt</h4>
        <button className="btn btn-primary" disabled={!!busy || place.trim().length < 4} onClick={() => void makeImage()} data-tip="The AI writes a detailed prompt for Google Flow (uses your AI keys).">{busy === "Writing the picture prompt…" ? busy : img ? "✨ Generate again" : "✨ Generate"}</button>
        {img && (
          <div className="flow-wiz-out">
            <b data-tip="The name of this background.">{img.title}</b>
            <p data-tip="The prompt to paste into Google Flow.">{img.prompt}</p>
            {img.avoid && <small data-tip="Things to keep out of the picture.">Keep out: {img.avoid}</small>}
            <div className="flow-chips">
              <button className="btn btn-primary" onClick={() => copy("img", img.prompt)} data-tip="Copy the picture prompt.">{copied === "img" ? "Copied ✓" : "Copy picture prompt"}</button>
              <a className="btn" href={FLOW_URL} target="_blank" rel="noreferrer" data-tip="Open Google Flow in your browser.">Open Google Flow ↗</a>
            </div>
            <ol className="flow-wiz-how" data-tip="What to do in Google Flow.">
              <li>In Flow, start a new project and choose <b>Create image</b>.</li>
              <li>Paste the prompt. Set the shape to <b>{aspect}</b>.</li>
              <li>Make 2–4 versions. Pick the one with the clearest empty middle.</li>
              <li>Download it, then press <b>Bring in the picture</b> below.</li>
            </ol>
            <button className="btn" disabled={!!busy} onClick={() => void bring("picture")} data-tip="Use the picture you made in Flow as a still background.">⬇ Bring in the picture</button>
          </div>
        )}
      </section>
      {img && (
        <section>
          <h4><Num n={4} done={!!video} /> Make it move? <small data-tip="A short video that repeats without a jump.">(a looping video background)</small></h4>
          <div className="flow-chips">
            <button className={`btn ${wantLoop ? "btn-primary" : ""}`} onClick={() => { setWantLoop(true); if (!ideas.length) void makeIdeas(); }} data-tip="Small movements that repeat: a curtain, a lamp, a bird outside.">Yes, make it loop</button>
            <button className={`btn ${wantLoop === false ? "btn-primary" : ""}`} onClick={() => setWantLoop(false)} data-tip="Keep it a still picture.">No, a still picture is fine</button>
          </div>
          {wantLoop && (
            <>
              {busy === "Looking for things that could move…" && <p className="flow-note" data-tip="Working on it.">{busy}</p>}
              {ideas.length > 0 && (
                <div className="flow-wiz-ideas" data-tip="Tick the movements you want. Two or three is plenty.">
                  {ideas.map((x, i) => (
                    <label key={i} className={`flow-wiz-idea ${picked.includes(i) ? "on" : ""}`} data-tip={x.motion}>
                      <input type="checkbox" checked={picked.includes(i)} onChange={() => setPicked((p) => (p.includes(i) ? p.filter((k) => k !== i) : [...p, i]))} aria-label={x.label} data-tip={x.motion} />
                      <b>{x.label}</b><span>{x.motion}</span>
                    </label>
                  ))}
                </div>
              )}
              {ideas.length > 0 && <button className="btn btn-primary" disabled={!!busy || !picked.length} onClick={() => void makeVideo()} data-tip="The AI writes the video prompt with the movements you ticked.">{busy === "Writing the loop prompt…" ? busy : "✨ Write the loop prompt"}</button>}
              {video && (
                <div className="flow-wiz-out">
                  <p data-tip="The video prompt to paste into Google Flow.">{video}</p>
                  <button className="btn btn-primary" onClick={() => copy("vid", video)} data-tip="Copy the video prompt.">{copied === "vid" ? "Copied ✓" : "Copy video prompt"}</button>
                  <ol className="flow-wiz-how" data-tip="What to do in Google Flow.">
                    <li>In Flow choose <b>Frames to Video</b>.</li>
                    <li>Put <b>your picture as the first frame AND the last frame</b>. That is what makes it loop without a jump.</li>
                    <li>Paste the video prompt. Shape <b>{aspect}</b>, 8 seconds.</li>
                    <li>Watch it: if the camera moves or something new appears, make it again.</li>
                    <li>Download it, then press <b>Bring in the clip</b>.</li>
                  </ol>
                  <button className="btn" disabled={!!busy} onClick={() => void bring("clip")} data-tip="Use the looping clip from Flow as the background.">⬇ Bring in the clip</button>
                </div>
              )}
            </>
          )}
        </section>
      )}
      {busy && !["Looking for things that could move…"].includes(busy) && <p className="flow-note" data-tip="Working on it.">{busy}</p>}
      {err && <p className="flow-need" data-tip="What went wrong.">{err}</p>}
      {added && <p className="flow-ok" data-tip="This is now a background.">Added {added}.</p>}
    </div>
  );
}
