// Run: npm test. Sets made from a description are checked data, never code (10 Nov 2026).
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkSpec, setFromSpec, setFor, setPrompt } from "../../characters/sets/custom.mjs";
import { SETS } from "../../characters/sets/sets.mjs";

const good = { label: "Bakery", help: "A bakery counter.", back: [{ kind: "rect", x: 0, y: 0, w: 1, h: 1, fill: { linear: [0, 0, 0, 1], stops: [[0, "#f5e1c0"], [1, "#a77b4f"]] } }, { kind: "rect", x: .1, y: .1, w: .1, h: .05, fill: "#7a4a22", repeat: [6, 3, .14, .12] }], front: [{ kind: "rect", x: 0, y: .78, w: 1, h: .22, fill: "#5b3a22" }], seats: [{ x: .3, y: .85, h: 1.1, face: "right" }, { x: .7, y: .85, h: 1.1, face: "left" }] };

test("a good spec is kept and becomes a set like the built-in ones", () => {
  const { spec, problems } = checkSpec(JSON.stringify(good));
  assert.ok(spec); assert.deepEqual(problems, []);
  const set = setFromSpec(spec);
  assert.equal(set.max, 2);
  assert.deepEqual(set.seats(2, 1000, 500)[1], { x: 700, y: 425, h: 550, face: "left" });
});

test("anything that isn't plain drawing data is dropped", () => {
  const bad = { ...good, back: [...good.back, { kind: "script", code: "alert(1)" }, { kind: "rect", x: 0, y: 0, w: 1, h: 1, fill: "url(javascript:alert(1))" }, { kind: "text", x: .5, y: .5, text: "x".repeat(500), fill: "#fff" }] };
  const { spec } = checkSpec(bad);
  assert.equal(spec.back.length, 3, "the script shape and the bad-colour rect are gone");
  assert.equal(spec.back[2].text.length, 40);
});

test("no seats or not JSON: refused with a plain reason", () => {
  assert.equal(checkSpec({ ...good, seats: [] }).spec, null);
  assert.match(checkSpec("not json").problems[0], /valid JSON/);
  assert.ok(checkSpec("```json\n" + JSON.stringify(good) + "\n```").spec, "a fenced answer still reads");
});

test("the Supreme Court seats two lawyers big in front, then nine smaller justices", () => {
  const seats = SETS.court.seats(11, 1920, 1080);
  assert.equal(seats.length, 11);
  assert.equal(seats[0].face, "right"); assert.equal(seats[1].face, "left");
  assert.ok(seats[2].h < seats[0].h / 2);
  assert.ok(Math.abs(seats[2].x - 960) < 1, "the chief justice sits in the middle");
});

test("setFor finds built-in and made sets; the prompt carries the description and seat count", () => {
  assert.equal(setFor({ id: "news" }), SETS.news);
  assert.equal(setFor({ id: "custom-x", spec: good }).label, "Bakery");
  assert.match(setPrompt("a bakery", 3), /a bakery[\s\S]*3 characters/);
});
