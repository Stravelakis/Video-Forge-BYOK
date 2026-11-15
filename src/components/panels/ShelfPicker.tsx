// ---------------------------------------------------------------------------
// The free picture shelves in the Look step. Paintings and materials become the
// video's background; emoji and Open Peeps give a tag to paste into the script.
// Shows nothing on a computer without the shelves.
// ---------------------------------------------------------------------------

import { useEffect, useMemo, useState } from "react";
import { HudButton } from "../ui/HudButton";

export interface ShelfItem { id: string; shelf: string; label: string; group?: string; by: string; licence: string; file: string; tall?: string; thumb: string }
const url = (rel: string) => "forge-kenney://shelf/" + rel.split("/").map(encodeURIComponent).join("/");
const SHELVES: [string, string, string][] = [
  ["art", "Famous paintings", "Very famous public-domain paintings, from the Met and the Rijksmuseum. Click one to use it as the background."],
  ["materials", "Walls & materials", "Wood, brick, plaster, fabric and more, from ambientCG. Click one to use it as the background."],
  ["emoji", "Emoji", "3D emoji by Microsoft. Click one to copy its tag, then paste it on a line in your script."],
  ["peeps", "Open Peeps", "Hand-drawn people by Pablo Stanley. Click one to copy its tag, then paste it on a line in your script."],
  ["kits", "Kenney 3D rooms", "Rooms, dungeons and camps built from Kenney's kits. Click one to use it as the background."],
  ["colours", "Colours", "Plain colours and gradients. Click one to use it as the background."],
];

export function ShelfPicker({ onBackground, busy, only, startShelf, alwaysOpen }: { onBackground: (item: ShelfItem) => void; busy: boolean; only?: string[]; startShelf?: string; alwaysOpen?: boolean }) {
  const [items, setItems] = useState<ShelfItem[] | null>(null);
  const [open0, setOpen] = useState(false);
  const open = alwaysOpen || open0;
  const [shelf, setShelf] = useState(startShelf ?? "art");
  const [q, setQ] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  useEffect(() => { fetch(url("index.json")).then((r) => (r.ok ? r.json() : null)).then(setItems).catch(() => setItems(null)); }, []);
  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (items ?? []).filter((i) => i.shelf === shelf && (!t || (i.label + " " + (i.group ?? "") + " " + i.by).toLowerCase().includes(t))).slice(0, 120);
  }, [items, shelf, q]);
  if (!items?.length) return null;
  const isTag = shelf === "emoji" || shelf === "peeps";
  function pick(i: ShelfItem) {
    if (!isTag) return onBackground(i);
    const name = i.file.replace(/^(emoji|peeps)\//, "").replace(/\.png$/, "");
    const tag = `[pop ${shelf === "emoji" ? "emoji" : "peep"} ${name}]`;
    void navigator.clipboard.writeText(tag);
    setCopied(tag);
  }
  return (
    <div className="space-y-2">
      {!alwaysOpen && (
        <HudButton onClick={() => setOpen((v) => !v)} data-tip="Free paintings, materials, emoji and drawn people you can use in this video.">
          {open ? "Hide free pictures" : "Free pictures"}
        </HudButton>
      )}
      {open && (
        <>
          <div className="flex gap-2 flex-wrap">
            {SHELVES.filter(([k]) => !only || only.includes(k)).map(([k, l, tip]) => <button key={k} className={`btn ${k === shelf ? "btn-primary" : ""}`} onClick={() => { setShelf(k); setQ(""); setCopied(null); }} data-tip={tip}>{l}</button>)}
          </div>
          <input type="text" className="w-full" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search pictures" data-tip="Search this shelf by name." />
          {copied && <p className="text-sm text-emerald-400" data-tip="Paste this at the start of a line in your script.">Copied {copied}. Paste it on a line in your script.</p>}
          <div className={alwaysOpen ? "grid grid-cols-6 gap-2" : "grid grid-cols-4 gap-2"} style={{ maxHeight: alwaysOpen ? 560 : 320, overflowY: "auto" }}>
            {rows.map((i) => (
              <button key={i.id} disabled={busy} className="btn" style={{ padding: 3 }} onClick={() => pick(i)} data-tip={`${i.label}. ${i.by}, ${i.licence}.`} data-preview={isTag ? undefined : JSON.stringify({ kind: "image", src: url(i.file) })}>
                <img src={url(i.thumb)} alt={i.label} loading="lazy" style={{ width: "100%", height: alwaysOpen ? 120 : 64, objectFit: "contain", display: "block" }} />
              </button>
            ))}
          </div>
          <p className="text-sm text-neutral-500" data-tip="Where these free pictures come from.">{SHELVES.find((s) => s[0] === shelf)![2].split(".")[0]}.</p>
        </>
      )}
    </div>
  );
}
