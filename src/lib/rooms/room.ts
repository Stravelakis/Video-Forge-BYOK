// ---------------------------------------------------------------------------
// ROOMS FROM A DESCRIPTION (Ak, 10 Nov 2026): "make new Kenney rooms every
// time we need one", recolourable, with chairs ready for characters to sit on.
//
// An AI (or a person) writes a ROOM SPEC: wall and floor colours, a light, and
// pieces of Kenney's furniture kit placed on a simple floor plan. Code checks
// it (unknown pieces dropped), lays it out in 3D (RoomView) and turns every
// chair, stool, bench and sofa into a SEAT the characters can be put on.
// Pure: no three.js here, tested in node.
// ---------------------------------------------------------------------------

/** Kenney furniture kit (CC0), by what a room needs. "seat" pieces become places to sit. */
export const PIECES: Record<string, { group: string; seat?: boolean; wall?: boolean; on?: boolean }> = {};
const add = (group: string, names: string, o: { seat?: boolean; wall?: boolean; on?: boolean } = {}) => names.split(" ").forEach((n) => (PIECES[n] = { group, ...o }));
add("seats", "chair chairCushion chairDesk chairModernCushion chairModernFrameCushion chairRounded stoolBar stoolBarSquare bench benchCushion benchCushionLow loungeChair loungeChairRelax loungeDesignChair loungeSofa loungeSofaLong loungeDesignSofa", { seat: true });
add("tables", "table tableCloth tableCoffee tableCoffeeGlass tableCoffeeGlassSquare tableCoffeeSquare tableCross tableCrossCloth tableGlass tableRound desk deskCorner sideTable sideTableDrawers kitchenBar kitchenBarEnd");
add("storage", "bookcaseClosed bookcaseClosedDoors bookcaseClosedWide bookcaseOpen bookcaseOpenLow cabinetBed cabinetBedDrawer cabinetBedDrawerTable cabinetTelevision cabinetTelevisionDoors coatRackStanding cardboardBoxClosed cardboardBoxOpen", { wall: true });
add("kitchen", "kitchenCabinet kitchenCabinetDrawer kitchenSink kitchenStove kitchenStoveElectric kitchenFridge kitchenFridgeLarge kitchenFridgeSmall washer dryer washerDryerStacked", { wall: true });
add("on top", "computerScreen computerKeyboard laptop lampRoundTable lampSquareTable televisionModern televisionVintage radio books plantSmall1 plantSmall2 plantSmall3 kitchenCoffeeMachine kitchenBlender kitchenMicrowave toaster speakerSmall", { on: true });
add("decor", "pottedPlant lampRoundFloor lampSquareFloor speaker trashcan bear coatRack rugRound rugRectangle rugRounded rugSquare rugDoormat bedSingle bedDouble bedBunk bathtub");

export interface RoomPiece { model: string; x: number; row: number; turn: number; color?: string; on?: number }
export interface RoomSpec { label: string; wall: string; floor: string; light: "warm" | "cool" | "day" | "evening"; walls: "back" | "corner" | "box"; pieces: RoomPiece[] }

const HEX = /^#[0-9a-f]{6}$/i;
const n = (v: unknown, lo: number, hi: number, d: number) => (typeof v === "number" && Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : d);

/** Checks a room from an AI or a person. Unknown pieces are dropped; at most 40 pieces. */
export function checkRoom(raw: unknown): { room: RoomSpec | null; problems: string[] } {
  let r = raw as Record<string, unknown>;
  if (typeof raw === "string") { try { r = JSON.parse(raw.replace(/^```(?:json)?\s*|\s*```\s*$/g, "")); } catch { return { room: null, problems: ["That isn't valid JSON."] }; } }
  if (!r || typeof r !== "object") return { room: null, problems: ["Empty answer."] };
  const problems: string[] = [];
  const list = Array.isArray(r.pieces) ? r.pieces : [];
  const pieces: RoomPiece[] = [];
  for (const p of list.slice(0, 60) as Record<string, unknown>[]) {
    const model = String(p?.model ?? "");
    if (!PIECES[model]) { problems.push(`Dropped "${model.slice(0, 30)}" (not a Kenney piece).`); continue; }
    const piece: RoomPiece = { model, x: n(p.x, -1, 1, 0), row: Math.round(n(p.row, 0, 2, 0)), turn: [0, 90, 180, 270].includes(Number(p.turn)) ? Number(p.turn) : 0 };
    if (typeof p.color === "string" && HEX.test(p.color)) piece.color = p.color;
    if (PIECES[model].on && typeof p.on === "number") piece.on = Math.round(n(p.on, 0, 59, 0));
    pieces.push(piece);
    if (pieces.length >= 40) break;
  }
  if (!pieces.length) problems.push("No furniture in it.");
  const room: RoomSpec = {
    label: String(r.label ?? "New room").replace(/[_-]+/g, " ").slice(0, 40),
    wall: HEX.test(String(r.wall)) ? String(r.wall) : "#e8e1d4",
    floor: HEX.test(String(r.floor)) ? String(r.floor) : "#b98a5e",
    light: (["warm", "cool", "day", "evening"] as const).find((x) => x === r.light) ?? "day",
    walls: (["back", "corner", "box"] as const).find((x) => x === r.walls) ?? "box",
    pieces,
  };
  return { room: pieces.length ? room : null, problems };
}

/** How many seats a room has (chairs, stools, benches, sofas: a sofa seats two). */
export function seatCount(room: RoomSpec): number {
  return room.pieces.reduce((k, p) => k + (PIECES[p.model]?.seat ? (/Sofa|bench/i.test(p.model) ? 2 : 1) : 0), 0);
}

/** The instructions for an AI (and for "copy a prompt"). */
export function roomPrompt(description: string, seats: number): string {
  const groups: Record<string, string[]> = {};
  for (const [k, v] of Object.entries(PIECES)) (groups[v.group] ??= []).push(k);
  return `You furnish a small 3D room for a talking-character video, using ONLY these Kenney furniture pieces:
${Object.entries(groups).map(([g, l]) => `${g}: ${l.join(", ")}`).join("\n")}

The room: ${String(description).slice(0, 600)}
It needs at least ${seats} seat${seats === 1 ? "" : "s"} (pieces from "seats") where characters will sit, facing the camera or each other, in rows 1 and 2, not hidden behind tables.

Floor plan, seen from the camera: "x" from -1 (left wall) to 1 (right wall); "row" 0 = against the back wall, 1 = middle, 2 = front (near the camera). "turn": 0 faces the camera, 90 faces right, 180 faces the back wall, 270 faces left.
Put "storage" and "kitchen" pieces in row 0. Pieces from "on top" sit on another piece: give "on" = the index (0-based) of that piece in your list.
Keep the middle of row 1 fairly open so the characters can be seen. 8 to 25 pieces. Optional "color": "#rrggbb" on any piece to recolour it.

Answer with JSON only:
{"label":"short name","wall":"#rrggbb","floor":"#rrggbb","light":"warm"|"cool"|"day"|"evening","walls":"back"|"corner"|"box","pieces":[{"model":"...","x":0,"row":0,"turn":0}]}`;
}
