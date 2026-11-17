// Step 3: how the background gets made. One method at a time, each with its own space.
import { useEffect, useState } from "react";
import { lookById } from "../../../characters/core/index.mjs";
import { BackgroundPanel } from "../panels/BackgroundPanel";
import { SetPicker } from "../panels/SetPicker";
import { ShelfPicker, type ShelfItem } from "../panels/ShelfPicker";
import { useFlowStore } from "../../store/useFlowStore";
import { useProjectStore } from "../../store/useProjectStore";
import { plainError } from "../../lib/plainError";
import { styleOf } from "./styles";
import { MiniStage, useAspect, type Bg } from "./CharPreview";
import { useFileUrls } from "../../lib/assets/useFileUrls";
import { RoomMaker } from "../rooms/RoomMaker";
import { FlowWizard } from "./FlowWizard";
import { SlidesPicker } from "./SlidesPicker";

export const METHODS = [
  // say: one short plain line (Ak reads with dyslexia: short words, no jargon)
  { id: "stock", emoji: "🎞️", name: "Stock video", pros: ["Real footage from Pixabay and Pexels", "Can pick a clip for every scene from your script"], cons: ["Needs the script first for automatic picks", "Can feel generic"] },
  { id: "sets", emoji: "🏛️", name: "Sets drawn by code", pros: ["News desk, podcast, game show, stage, meeting, Supreme Court", "Describe a new one and the AI draws it", "Seats your characters"], cons: ["Walking is switched off in a set"] },
  { id: "pictures", emoji: "🖼️", name: "Paintings & materials", pros: ["44 very famous paintings", "214 walls, woods and fabrics"], cons: ["Still pictures: nothing moves"] },
  { id: "kits", emoji: "🧱", name: "Kenney 3D rooms", pros: ["Matches the 3D characters", "Describe a room and the AI furnishes it", "Recolour anything; chairs become seats"], cons: ["Toy-like", "Still pictures"] },
  { id: "ai", emoji: "✨", name: "AI-made (Google Flow)", pros: ["Any place you can describe", "Step by step: the AI writes the prompts", "Pictures or looping videos"], cons: ["You make them in Flow, then bring them back", "Takes time and Flow credits"] },
  { id: "slides", emoji: "📊", name: "Presentation", pros: ["PDF, PowerPoint, Google Slides or pictures", "Each slide whole, one after the other"], cons: ["Still pictures", "PowerPoint needs LibreOffice, or save as PDF"] },
  { id: "colour", emoji: "🎨", name: "Plain colour or gradient", pros: ["Clean, fast, keeps attention on the characters"], cons: ["Plain"] },
];

function useAddClip() {
  const narration = useProjectStore((s) => s.narration);
  const render = useProjectStore((s) => s.render);
  const backgrounds = useProjectStore((s) => s.backgrounds);
  const setBackgrounds = useProjectStore((s) => s.setBackgrounds);
  return (filePath: string, label: string, reason: string, id: string) => {
    const hit = { id, url: "", durationSec: 12, width: render.width, height: render.height, thumbnail: "", provider: "local", pageUrl: "" };
    // endMs 0 means "the whole video": the script doesn't exist yet at this step
    setBackgrounds([...backgrounds, { startMs: 0, endMs: narration?.segments.at(-1)?.endMs ?? 0, query: label, reason, hit, filePath } as never]);
  };
}

function Shelves({ only, startShelf }: { only: string[]; startShelf: string }) {
  const render = useProjectStore((s) => s.render);
  const add = useAddClip();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  async function use(i: ShelfItem) {
    setBusy(true); setErr(null);
    try {
      const file = await window.byok.media.stillClip(render.height > render.width && i.tall ? i.tall : i.file, render.width, render.height);
      add(file, i.label, `${i.by}, ${i.licence}.`, i.id); setDone(i.label);
    } catch (e) { setErr(plainError(e, "Pick a different picture.")); } finally { setBusy(false); }
  }
  return (
    <>
      <ShelfPicker onBackground={(i) => void use(i)} busy={busy} only={only} startShelf={startShelf} alwaysOpen />
      {busy && <p className="flow-note" data-tip="Turning the picture into a background clip.">Preparing…</p>}
      {done && !busy && <p className="flow-ok" data-tip="This picture is now the video's background.">Using {done}.</p>}
      {err && <p className="flow-need" data-tip="The picture could not be used.">{err}</p>}
    </>
  );
}

/** The look written into picture prompts, from the chosen style. */
function useStyleWords(): string {
  const style = useFlowStore((f) => f.style);
  return style?.family === "drawn" ? `${lookById(style.look).name} style: ${lookById(style.look).blurb}` : style?.family === "3d" ? "Toy-like 3D style, soft shapes, simple bright materials" : "Rich illustrated style";
}

/** Your own picture, one made from a description, or a free photo (Ak, 10 Nov 2026). */
function PictureTools() {
  const render = useProjectStore((s) => s.render);
  const add = useAddClip();
  const styleWords = useStyleWords();
  const [tab, setTab] = useState<"make" | "photos" | null>(null);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const [desc, setDesc] = useState("");
  const [made, setMade] = useState<{ picture: string; clip: string; by: string; label: string }[]>([]);
  const madeUrls = useFileUrls(made.map((m) => m.picture), "image/jpeg");
  const [q, setQ] = useState("");
  const [photos, setPhotos] = useState<Awaited<ReturnType<typeof window.byok.media.searchPhotos>>["hits"]>([]);
  const orientation = render.height > render.width ? "portrait" : "landscape";
  const run = async (label: string, fn: () => Promise<void>) => { setBusy(label); setMsg(""); try { await fn(); } catch (e) { setMsg(plainError(e, "Try again.")); } finally { setBusy(""); } };
  const upload = () => run("Preparing your picture…", async () => {
    const f = await window.byok.dialog.openFile([{ name: "Picture", extensions: ["png", "jpg", "jpeg", "webp"] }]);
    if (!f) return;
    const name = f.split(/[\\/]/).pop() ?? "Your picture";
    add(await window.byok.media.fileClip(f, render.width, render.height), name, "Your own picture.", "own-" + Date.now()); setMsg(`Using ${name}.`);
  });
  const make = () => run("Making the picture…", async () => {
    const prompt = `${styleWords}. ${desc.trim()}. An empty place: no people, no animals, no text, no logos. Wide shot, eye level, the middle and the floor left clear for characters to stand in.`;
    const r = await window.byok.media.makePicture(prompt, render.width, render.height);
    setMade((m) => [{ ...r, label: desc.trim().slice(0, 40) }, ...m].slice(0, 8)); setMsg(`Made by ${r.by}. Rest the mouse on it to see it with your characters; click to use it.`);
  });
  const search = () => run("Searching…", async () => {
    const r = await window.byok.media.searchPhotos(q, orientation);
    setPhotos(r.hits); setMsg(r.hits.length ? `${r.hits.length} photos.${r.problems.length ? " " + r.problems.join(" ") : ""}` : `Nothing found. ${r.problems.join(" ")}`);
  });
  const usePhoto = (h: (typeof photos)[number]) => run("Fetching the photo…", async () => {
    add(await window.byok.media.photoClip(h.url, render.width, render.height), h.tags || "Photo", `Photo by ${h.author} on ${h.provider === "pixabay" ? "Pixabay" : "Pexels"}.`, h.id); setMsg(`Using the photo by ${h.author}.`);
  });
  return (
    <div className="flow-pictools">
      <div className="flow-chips">
        <button className="btn" disabled={!!busy} onClick={() => void upload()} data-tip="Use a picture from your computer as the background.">⬆ Your own picture</button>
        <button className={`btn ${tab === "make" ? "btn-primary" : ""}`} onClick={() => setTab(tab === "make" ? null : "make")} data-tip="Describe a place and a picture is made for you, free, in your style.">✨ Make a picture</button>
        <button className={`btn ${tab === "photos" ? "btn-primary" : ""}`} onClick={() => setTab(tab === "photos" ? null : "photos")} data-tip="Free photos from Pixabay and Pexels.">🔎 Free photos</button>
        <button className="btn" onClick={() => void window.byok.forge.openImageForge()} data-tip="Open Image Forge to make a picture there, then bring it in with Your own picture.">Open Image Forge</button>
      </div>
      {tab === "make" && (
        <div className="flow-chips">
          <input type="text" className="flex-1" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="A sunny classroom with a big green board" aria-label="Describe the picture" data-tip="Describe the place in plain words." onKeyDown={(e) => { if (e.key === "Enter" && desc.trim().length > 3) void make(); }} />
          <button className="btn btn-primary" disabled={!!busy || desc.trim().length < 4} onClick={() => void make()} data-tip="Make the picture now (free, takes a few seconds).">✨ Make it</button>
        </div>
      )}
      {tab === "photos" && (
        <div className="flow-chips">
          <input type="text" className="flex-1" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search photos: kitchen, beach, office…" aria-label="Search photos" data-tip="Search free photos by what's in them." onKeyDown={(e) => { if (e.key === "Enter" && q.trim()) void search(); }} />
          <button className="btn btn-primary" disabled={!!busy || !q.trim()} onClick={() => void search()} data-tip="Search Pixabay and Pexels.">Search</button>
        </div>
      )}
      {busy && <p className="flow-note" data-tip="Working on it.">{busy}</p>}
      {msg && !busy && <p className="flow-note" data-tip="What happened.">{msg}</p>}
      {made.length > 0 && (
        <div className="flow-picgrid">
          {made.map((m) => madeUrls[m.picture] && (
            <button key={m.picture} onClick={() => { add(m.clip, m.label, `Made by ${m.by}.`, "made-" + Date.now()); setMsg(`Using ${m.label}.`); }} data-preview={JSON.stringify({ kind: "image", src: madeUrls[m.picture] })} data-tip={`${m.label}. Click to use it.`}>
              <img src={madeUrls[m.picture]} alt={m.label} />
            </button>
          ))}
        </div>
      )}
      {tab === "photos" && photos.length > 0 && (
        <div className="flow-picgrid">
          {photos.map((h) => (
            <button key={h.id} disabled={!!busy} onClick={() => void usePhoto(h)} data-preview={JSON.stringify({ kind: "image", src: h.thumbUrl })} data-tip={`${h.tags || "Photo"}, by ${h.author} on ${h.provider === "pixabay" ? "Pixabay" : "Pexels"}. Click to use it.`}>
              <img src={h.thumbUrl} alt={h.tags} loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Slides() {
  const narration = useProjectStore((s) => s.narration);
  const render = useProjectStore((s) => s.render);
  const backgrounds = useProjectStore((s) => s.backgrounds);
  const setBackgrounds = useProjectStore((s) => s.setBackgrounds);
  // one after the other, each for its share of the video
  const add = (clips: { file: string; label: string }[], seconds: number) => {
    const start = backgrounds.reduce((m, b) => Math.max(m, (b as { endMs: number }).endMs ?? 0), 0);
    const next = clips.map((c, i) => ({ startMs: start + i * seconds * 1000, endMs: start + (i + 1) * seconds * 1000, query: c.label, reason: "A slide from your presentation.", hit: { id: "slide-" + Date.now() + i, url: "", durationSec: 12, width: render.width, height: render.height, thumbnail: "", provider: "local", pageUrl: "" }, filePath: c.file }));
    setBackgrounds([...(narration ? backgrounds : backgrounds.filter((b) => (b as { endMs: number }).endMs > 0)), ...next] as never);
  };
  return <SlidesPicker onAdd={add} />;
}

function FlowSteps() {
  const add = useAddClip();
  return <FlowWizard onAdd={add} />;
}

/** What's behind the characters right now: the set, or the first background clip. */
export function useCurrentBg(): Bg {
  const scene = useProjectStore((s) => s.scene);
  const bgs = useProjectStore((s) => s.backgrounds) as { filePath?: string; hit?: { thumbUrl?: string } }[];
  const first = bgs[0];
  const urls = useFileUrls([first?.filePath], "video/mp4");
  const clip: Exclude<Bg, { kind: "set" } | null> | null = first?.hit?.thumbUrl && !first.filePath ? { kind: "image", src: first.hit.thumbUrl } : first?.filePath && urls[first.filePath] ? { kind: "video", src: urls[first.filePath] } : null;
  // a room you made: its picture is the background clip, the set only seats the characters
  if (scene) return { kind: "set", id: scene.id, spec: scene.spec, under: (scene.spec as { room?: boolean } | undefined)?.room && clip ? clip : undefined };
  return clip;
}

const SAMPLE: Record<string, Bg> = { sets: { kind: "set", id: "news" }, colour: { kind: "colour", css: "linear-gradient(160deg, #20364a, #0b1620 60%, #3a1f3d)" } };

export function BackgroundStep() {
  const method = useFlowStore((f) => f.bgMethod);
  const setMethod = useFlowStore((f) => f.setBgMethod);
  const backgrounds = useProjectStore((s) => s.backgrounds);
  const setBackgrounds = useProjectStore((s) => s.setBackgrounds);
  const scene = useProjectStore((s) => s.scene);
  const speakers = useProjectStore((s) => s.speakers);
  const aspect = useAspect();
  const current = useCurrentBg();
  const [hover, setHover] = useState<{ bg: Bg; method?: string } | null>(null);
  const shown = hover?.bg ?? current;
  const m = METHODS.find((x) => x.id === (hover?.method ?? method));
  const onOver = (e: React.MouseEvent) => {
    const el = (e.target as HTMLElement).closest("[data-preview]") as HTMLElement | null;
    if (!el) return;
    try { setHover({ bg: JSON.parse(el.dataset.preview!) }); } catch { /* not a preview */ }
  };
  const W = aspect >= 1 ? 560 : 300;
  return (
    <div className="flow-page flow-bg">
      <div className="flow-bg-main">
        <h2 className="flow-h" data-tip="Where your characters are.">Choose the background</h2>
        <div className="flow-methods compact">
          {METHODS.map((x) => (
            <button key={x.id} className={`flow-method ${method === x.id ? "on" : ""}`} onClick={() => setMethod(x.id)} onMouseEnter={() => setHover({ bg: SAMPLE[x.id] ?? current, method: x.id })} onMouseLeave={() => setHover(null)} data-tip={`Make the background with: ${x.name}.`}>
              <span className="flow-emoji">{x.emoji}</span><b>{x.name}</b>
            </button>
          ))}
        </div>
        <section className="flow-work" onMouseOver={onOver} onMouseLeave={() => setHover(null)}>
          {!method && <p className="flow-lede" data-tip="Pick a way above.">Pick a way above. Rest the mouse on anything to see it behind your characters.</p>}
          {method === "stock" && <BackgroundPanel shelves={false} />}
          {method === "sets" && <SetPicker />}
          {method === "pictures" && <><PictureTools /><Shelves only={["art", "materials"]} startShelf="art" /></>}
          {method === "kits" && <><RoomMaker /><Shelves only={["kits"]} startShelf="kits" /></>}
          {method === "colour" && <Shelves only={["colours"]} startShelf="colours" />}
          {method === "ai" && <FlowSteps />}
          {method === "slides" && <Slides />}
        </section>
      </div>
      <aside className="flow-bg-side" aria-label="Preview">
        <div className="flow-preview-label" data-tip="Your characters in front of the background you are looking at.">{hover ? "Trying" : "Now"} <small>{hover ? "click to use it" : scene ? `set: ${scene.id}` : backgrounds.length ? `${backgrounds.length} background${backgrounds.length > 1 ? "s" : ""}` : "no background yet"}</small></div>
        <MiniStage speakers={speakers} width={W} aspect={aspect} bg={shown} showWaves={!hover} className="flow-bg-stage" />
        {m && (
          <div className="flow-proscons" data-tip={`Good and bad points of ${m.name}.`}>
            <b>{m.emoji} {m.name}</b>
            {m.pros.map((p) => <span key={p} className="pro">✓ {p}</span>)}
            {m.cons.map((p) => <span key={p} className="con">✗ {p}</span>)}
          </div>
        )}
        {backgrounds.length > 0 && <button className="btn" onClick={() => setBackgrounds([])} data-tip="Remove every background from this video.">Clear backgrounds</button>}
      </aside>
    </div>
  );
}
