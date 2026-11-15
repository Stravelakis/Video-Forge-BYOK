// ---------------------------------------------------------------------------
// A presentation as the background (Ak, 10 Nov 2026): a PDF, a PowerPoint
// (through LibreOffice), a Google Slides link, or pictures. Pages are drawn
// with pdf.js (Mozilla, Apache-2.0), shown as slides you can tick, and become
// background clips one after the other, each slide whole (never cropped).
// ---------------------------------------------------------------------------

import { useState } from "react";
import * as pdfjs from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { useProjectStore } from "../../store/useProjectStore";
import { plainError } from "../../lib/plainError";

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

interface Slide { id: string; thumb: string; draw: (w: number, h: number) => Promise<string>; label: string }

/** Draws something onto a video-sized canvas, whole and centred on a dark background. */
function framed(w: number, h: number, srcW: number, srcH: number, paint: (ctx: CanvasRenderingContext2D, x: number, y: number, s: number) => Promise<void> | void) {
  return (async () => {
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const ctx = c.getContext("2d")!; ctx.fillStyle = "#0b0b0d"; ctx.fillRect(0, 0, w, h);
    const s = Math.min(w / srcW, h / srcH);
    await paint(ctx, (w - srcW * s) / 2, (h - srcH * s) / 2, s);
    return c.toDataURL("image/jpeg", 0.92);
  })();
}

async function pdfSlides(bytes: Uint8Array, name: string): Promise<Slide[]> {
  const doc = await pdfjs.getDocument({ data: bytes }).promise;
  const out: Slide[] = [];
  for (let n = 1; n <= Math.min(doc.numPages, 120); n++) {
    const page = await doc.getPage(n);
    const vp = page.getViewport({ scale: 1 });
    const draw = (w: number, h: number) => framed(w, h, vp.width, vp.height, async (ctx, x, y, s) => {
      const tmp = document.createElement("canvas"); const v2 = page.getViewport({ scale: s });
      tmp.width = Math.ceil(v2.width); tmp.height = Math.ceil(v2.height);
      await page.render({ canvasContext: tmp.getContext("2d")!, viewport: v2 }).promise;
      ctx.drawImage(tmp, x, y);
    });
    out.push({ id: `${name}-${n}`, label: `${name} · ${n}`, draw, thumb: await draw(320, 180) });
  }
  return out;
}

export function SlidesPicker({ onAdd }: { onAdd: (clips: { file: string; label: string }[], seconds: number) => void }) {
  const render = useProjectStore((s) => s.render);
  const narration = useProjectStore((s) => s.narration);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [on, setOn] = useState<Set<string>>(new Set());
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const [secs, setSecs] = useState(8);
  const total = narration?.segments.at(-1)?.endMs ?? 0;
  const take = (list: Slide[]) => { setSlides((s) => [...s, ...list]); setOn((o) => new Set([...o, ...list.map((x) => x.id)])); setMsg(`${list.length} slide${list.length === 1 ? "" : "s"} added. Untick any you don't want.`); };
  const run = async (label: string, fn: () => Promise<void>) => { setBusy(label); setMsg(""); try { await fn(); } catch (e) { setMsg(plainError(e, "Try again.")); } finally { setBusy(""); } };
  const fromFile = () => run("Reading the presentation…", async () => {
    const f = await window.byok.dialog.openFile([{ name: "Presentation", extensions: ["pdf", "pptx", "ppt", "odp"] }]);
    if (!f) return;
    const name = (f.split(/[\\/]/).pop() ?? "Slides").replace(/\.[^.]+$/, "");
    take(await pdfSlides(await window.byok.media.slidesFile(f), name));
  });
  const fromGoogle = () => run("Fetching from Google Slides…", async () => { take(await pdfSlides(await window.byok.media.slidesGoogle(url), "Google Slides")); });
  const fromPicture = () => run("Adding the picture…", async () => {
    const f = await window.byok.dialog.openFile([{ name: "Picture", extensions: ["png", "jpg", "jpeg", "webp"] }]);
    if (!f) return;
    // a picture becomes a slide the same way: whole, centred
    const clip = await window.byok.media.fileClip(f, render.width, render.height);
    onAdd([{ file: clip, label: f.split(/[\\/]/).pop() ?? "Picture" }], secs); setMsg("Picture added as a slide.");
  });
  const use = () => run("Making the slides…", async () => {
    const chosen = slides.filter((s) => on.has(s.id));
    const clips: { file: string; label: string }[] = [];
    for (const [i, s] of chosen.entries()) {
      setBusy(`Making slide ${i + 1} of ${chosen.length}…`);
      const file = await window.byok.media.savePicture(await s.draw(render.width, render.height), s.label);
      clips.push({ file: await window.byok.media.fileClip(file, render.width, render.height), label: s.label });
    }
    const each = total && chosen.length ? Math.max(2, Math.round(total / chosen.length / 1000)) : secs;
    onAdd(clips, each); setMsg(`${clips.length} slides are now the background, ${each} seconds each.`);
  });
  return (
    <div className="flow-pictools">
      <div className="flow-chips">
        <button className="btn btn-primary" disabled={!!busy} onClick={() => void fromFile()} data-tip="A PDF, or a PowerPoint if LibreOffice is installed.">📄 PDF or PowerPoint</button>
        <button className="btn" disabled={!!busy} onClick={() => void fromPicture()} data-tip="Add one picture as a slide. Press again for more.">🖼 Add a picture</button>
      </div>
      <div className="flow-chips">
        <input type="text" className="flex-1" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Google Slides link: docs.google.com/presentation/d/…" aria-label="Google Slides link" data-tip='Share the deck as "Anyone with the link", then paste its address.' />
        <button className="btn" disabled={!!busy || !url.includes("docs.google.com/presentation")} onClick={() => void fromGoogle()} data-tip="Fetch the slides from Google.">Get the slides</button>
      </div>
      {slides.length > 0 && (
        <>
          <div className="flow-picgrid">
            {slides.map((s) => (
              <button key={s.id} className={on.has(s.id) ? "on" : "off"} onClick={() => setOn((o) => { const n = new Set(o); if (n.has(s.id)) n.delete(s.id); else n.add(s.id); return n; })} data-preview={JSON.stringify({ kind: "image", src: s.thumb })} data-tip={`${s.label}. Click to ${on.has(s.id) ? "leave it out" : "use it"}.`}>
                <img src={s.thumb} alt={s.label} />
              </button>
            ))}
          </div>
          <div className="flow-chips">
            {!total && <label className="flex items-center gap-2" data-tip="How long each slide stays."><span className="label-etched" data-tip="Seconds per slide.">Seconds each</span><input type="number" min={2} max={120} value={secs} onChange={(e) => setSecs(Math.max(2, Math.min(120, Number(e.target.value) || 8)))} style={{ width: 70 }} aria-label="Seconds per slide" data-tip="Seconds per slide." /></label>}
            {total > 0 && <span className="flow-note" data-tip="The slides share the narration's length.">Spread over the {Math.round(total / 1000)} s narration</span>}
            <button className="btn btn-primary" disabled={!!busy || !on.size} onClick={() => void use()} data-tip="Make the ticked slides the background, one after the other.">Use {on.size} slide{on.size === 1 ? "" : "s"}</button>
            <button className="btn" onClick={() => { setSlides([]); setOn(new Set()); }} data-tip="Start again with no slides.">Clear</button>
          </div>
        </>
      )}
      {busy && <p className="flow-note" data-tip="Working on it.">{busy}</p>}
      {msg && !busy && <p className="flow-note" data-tip="What happened.">{msg}</p>}
    </div>
  );
}
