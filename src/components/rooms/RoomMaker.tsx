// ---------------------------------------------------------------------------
// Make a Kenney room (Ak, 10 Nov 2026): describe it, the AI furnishes it with
// Kenney's furniture kit, you recolour walls, floor and any piece, and "Use
// this room" makes it the background with every chair, stool, bench and sofa
// turned into a seat your characters sit on.
// ---------------------------------------------------------------------------

import { useRef, useState } from "react";
import { checkRoom, roomPrompt, type RoomSpec } from "../../lib/rooms/room";
import { useProjectStore } from "../../store/useProjectStore";
import { RoomView, type RoomHandle } from "./RoomView";

const SYSTEM = "You furnish small 3D rooms for videos. You answer with one JSON object only.";
const START: Record<string, RoomSpec> = {
  "Living room": { label: "Living room", wall: "#efe3cf", floor: "#b5865a", light: "warm", walls: "box", pieces: [
    { model: "bookcaseOpen", x: -0.85, row: 0, turn: 0 }, { model: "cabinetTelevision", x: 0, row: 0, turn: 0 }, { model: "televisionModern", x: 0, row: 0, turn: 0, on: 1 }, { model: "pottedPlant", x: 0.6, row: 0, turn: 0 }, { model: "lampRoundFloor", x: 0.9, row: 0, turn: 0 },
    { model: "loungeChair", x: -0.7, row: 1, turn: 0 }, { model: "tableCoffee", x: 0, row: 1, turn: 0 }, { model: "loungeSofa", x: 0.65, row: 1, turn: 0 }, { model: "rugRound", x: 0, row: 2, turn: 0 }] },
  "Kitchen table": { label: "Kitchen table", wall: "#f4f1ea", floor: "#cbb89d", light: "day", walls: "box", pieces: [
    { model: "kitchenFridgeLarge", x: -0.95, row: 0, turn: 0 }, { model: "kitchenCabinet", x: -0.45, row: 0, turn: 0 }, { model: "kitchenSink", x: -0.1, row: 0, turn: 0 }, { model: "kitchenStove", x: 0.3, row: 0, turn: 0 }, { model: "kitchenCabinetDrawer", x: 0.7, row: 0, turn: 0 }, { model: "kitchenCoffeeMachine", x: 0, row: 0, turn: 0, on: 4 },
    { model: "chair", x: -0.55, row: 1, turn: 90 }, { model: "tableCloth", x: 0, row: 1, turn: 0 }, { model: "chair", x: 0.55, row: 1, turn: 270 }] },
  "Office": { label: "Office", wall: "#dfe5ec", floor: "#8d97a6", light: "cool", walls: "box", pieces: [
    { model: "bookcaseClosedWide", x: -0.8, row: 0, turn: 0 }, { model: "pottedPlant", x: -0.3, row: 0, turn: 0 }, { model: "bookcaseOpen", x: 0.85, row: 0, turn: 0 },
    { model: "desk", x: 0, row: 1, turn: 0 }, { model: "computerScreen", x: 0, row: 1, turn: 0, on: 3 }, { model: "chairDesk", x: -0.55, row: 1, turn: 0 }, { model: "chairModernCushion", x: 0.55, row: 1, turn: 0 }, { model: "trashcan", x: 0.95, row: 2, turn: 0 }] },
};

export function RoomMaker() {
  const render = useProjectStore((s) => s.render);
  const speakers = useProjectStore((s) => s.speakers);
  const setScene = useProjectStore((s) => s.setScene);
  const backgrounds = useProjectStore((s) => s.backgrounds);
  const setBackgrounds = useProjectStore((s) => s.setBackgrounds);
  const narration = useProjectStore((s) => s.narration);
  const view = useRef<RoomHandle>(null);
  const [room, setRoom] = useState<RoomSpec>(START["Living room"]);
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const [seats, setSeats] = useState(0);
  const [piece, setPiece] = useState(0);
  const [copied, setCopied] = useState(false);
  const [paste, setPaste] = useState("");
  const aspect = render.width / render.height;
  const W = aspect >= 1 ? 620 : 340, H = Math.round(W / aspect);
  const want = Math.max(1, Math.min(8, speakers.length || 2));
  const take = (raw: string, by: string) => {
    const { room: r, problems } = checkRoom(raw);
    if (!r) { setMsg(`That answer can't be used: ${problems.join(" ")}`); return; }
    setRoom(r); setPiece(0); setMsg(`${r.label}, furnished by ${by}.${problems.length ? ` ${problems.length} unknown piece${problems.length > 1 ? "s" : ""} left out.` : ""}`);
  };
  async function make() {
    setBusy("Furnishing…"); setMsg("");
    try { const r = await window.byok.llm.makeSet(SYSTEM, roomPrompt(desc, want)); take(r.text, r.by); }
    catch (e) { setMsg(String((e as Error)?.message ?? e).replace(/^Error invoking remote method '[^']+': (Error: )?/, "")); }
    finally { setBusy(""); }
  }
  async function use() {
    const shot = view.current?.snapshot(render.width, render.height);
    if (!shot) return;
    setBusy("Saving the room…");
    try {
      const file = await window.byok.media.savePicture(shot.picture, room.label);
      const clip = await window.byok.media.fileClip(file, render.width, render.height);
      const hit = { id: "room-" + Date.now(), url: "", durationSec: 12, width: render.width, height: render.height, thumbnail: "", provider: "local", pageUrl: "" };
      setBackgrounds([...backgrounds, { startMs: 0, endMs: narration?.segments.at(-1)?.endMs ?? 0, query: room.label, reason: "A Kenney room you made. 3D models by Kenney (kenney.nl), CC0.", hit, filePath: clip } as never]);
      // the chairs become a set with nothing drawn: the room is the background, the set only seats people
      const spec = { label: room.label, help: "A Kenney room you made.", back: [], front: [], seats: shot.seats, room: true, sit: true };
      setScene({ id: "room-" + Date.now().toString(36), spec, title: "", names: [] });
      setMsg(`Using ${room.label}. ${shot.seats.length} seat${shot.seats.length === 1 ? "" : "s"}: your characters sit on them, in order.`);
    } catch (e) { setMsg(String((e as Error)?.message ?? e)); }
    finally { setBusy(""); }
  }
  const p = room.pieces[piece];
  return (
    <div className="room-maker">
      <div className="flow-chips">
        <b className="label-etched" data-tip="Start from a ready room, or describe a new one.">Start from</b>
        {Object.keys(START).map((k) => <button key={k} className={`btn ${room.label === k ? "btn-primary" : ""}`} onClick={() => { setRoom(START[k]); setPiece(0); setMsg(""); }} data-tip={`Load the ${k.toLowerCase()} and change it.`}>{k}</button>)}
      </div>
      <div className="flow-chips">
        <input type="text" className="flex-1" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="A cosy library with two armchairs and a fireplace wall" aria-label="Describe the room" data-tip="Describe the room in plain words. The AI picks and places Kenney furniture." onKeyDown={(e) => { if (e.key === "Enter" && desc.trim().length > 3) void make(); }} />
        <button className="btn btn-primary" disabled={!!busy || desc.trim().length < 4} onClick={() => void make()} data-tip="The AI furnishes the room now (your AI keys).">{busy === "Furnishing…" ? busy : "✨ Make the room"}</button>
        <button className="btn" disabled={desc.trim().length < 4} onClick={() => { void navigator.clipboard.writeText(roomPrompt(desc, want)); setCopied(true); }} data-tip="Copy the instructions for any AI chat, then paste its answer below.">{copied ? "Copied ✓" : "Copy a prompt"}</button>
      </div>
      {copied && (
        <div className="flow-chips">
          <textarea rows={2} className="flex-1" value={paste} onChange={(e) => setPaste(e.target.value)} placeholder="Paste the AI's answer here" aria-label="The other AI's answer" data-tip="Paste the whole answer." />
          <button className="btn" disabled={!paste.trim()} onClick={() => take(paste, "your AI")} data-tip="Check the answer and build the room.">Use this answer</button>
        </div>
      )}
      <RoomView ref={view} room={room} width={W} height={H} onSeats={setSeats} />
      <div className="flow-chips">
        <label className="flex items-center gap-2" data-tip="The colour of the walls."><span className="label-etched" data-tip="Walls.">Walls</span><input type="color" value={room.wall} onChange={(e) => setRoom({ ...room, wall: e.target.value })} aria-label="Wall colour" data-tip="Wall colour." /></label>
        <label className="flex items-center gap-2" data-tip="The colour of the floor."><span className="label-etched" data-tip="Floor.">Floor</span><input type="color" value={room.floor} onChange={(e) => setRoom({ ...room, floor: e.target.value })} aria-label="Floor colour" data-tip="Floor colour." /></label>
        <label className="flex items-center gap-2" data-tip="The light in the room."><span className="label-etched" data-tip="Light.">Light</span>
          <select value={room.light} onChange={(e) => setRoom({ ...room, light: e.target.value as RoomSpec["light"] })} aria-label="Light" data-tip="Day, warm, cool or evening light.">{["day", "warm", "cool", "evening"].map((l) => <option key={l} value={l}>{l}</option>)}</select></label>
        <label className="flex items-center gap-2" data-tip="Recolour one piece of furniture."><span className="label-etched" data-tip="Piece.">Piece</span>
          <select value={piece} onChange={(e) => setPiece(Number(e.target.value))} aria-label="Which piece" data-tip="Pick a piece to recolour.">{room.pieces.map((x, i) => <option key={i} value={i}>{x.model}</option>)}</select>
          {p && <input type="color" value={p.color ?? "#ffffff"} onChange={(e) => setRoom({ ...room, pieces: room.pieces.map((x, i) => (i === piece ? { ...x, color: e.target.value } : x)) })} aria-label="Piece colour" data-tip="Colour for this piece." />}</label>
      </div>
      <div className="flow-chips">
        <button className="btn btn-primary" disabled={!!busy} onClick={() => void use()} data-tip="Make this room the background. Chairs, stools, benches and sofas become seats for your characters.">{busy === "Saving the room…" ? busy : "Use this room"}</button>
        <span className="flow-note" data-tip="Places to sit in this room.">🪑 {seats} seat{seats === 1 ? "" : "s"}{seats < want ? ` · you have ${want} characters` : ""}</span>
      </div>
      {msg && <p className="flow-note" data-tip="What happened.">{msg}</p>}
      <p className="text-sm text-neutral-500" data-tip="Who made the furniture.">Furniture: <a href="https://kenney.nl" target="_blank" rel="noreferrer">Kenney's furniture kit</a>, CC0. Thank you, Kenney.</p>
    </div>
  );
}
