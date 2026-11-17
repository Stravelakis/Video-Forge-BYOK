// Run: npm test. Rooms made from a description: only Kenney pieces, seats counted (10 Nov 2026).
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkRoom, seatCount, roomPrompt, PIECES } from "../../src/lib/rooms/room.ts";
import { checkSpec, setFor } from "../../characters/sets/custom.mjs";

test("unknown pieces are dropped, numbers clamped, colours checked", () => {
  const { room, problems } = checkRoom({ label: "cosy_den", wall: "#ffeedd", floor: "red", light: "warm", pieces: [{ model: "chair", x: 4, row: 7, turn: 45 }, { model: "spaceship", x: 0 }, { model: "laptop", on: 0, color: "#123456" }] });
  assert.equal(room.label, "cosy den");
  assert.equal(room.floor, "#b98a5e", "a bad floor colour falls back");
  assert.deepEqual(room.pieces[0], { model: "chair", x: 1, row: 2, turn: 0 });
  assert.equal(room.pieces[1].on, 0);
  assert.equal(room.pieces.length, 2);
  assert.match(problems[0], /spaceship/);
});

test("seats: chairs one each, sofas and benches two", () => {
  const { room } = checkRoom({ pieces: [{ model: "chair" }, { model: "loungeSofa" }, { model: "table" }] });
  assert.equal(seatCount(room), 3);
});

test("the prompt lists the real pieces and the seats wanted", () => {
  const p = roomPrompt("a library", 3);
  assert.match(p, /a library/); assert.match(p, /at least 3 seats/); assert.ok(Object.keys(PIECES).every((k) => p.includes(k)));
});

test("a room's seats travel as a set with nothing drawn, and people sit", () => {
  const { spec } = checkSpec({ label: "Room", back: [], front: [], seats: [{ x: .3, y: .7, h: .5 }], room: true, sit: true });
  assert.ok(spec);
  assert.equal(setFor({ id: "room-1", spec }).sit, true);
  assert.equal(checkSpec({ label: "x", back: [], front: [], seats: [{ x: .3, y: .7, h: .5 }] }).spec, null, "an ordinary set still needs a picture");
});
