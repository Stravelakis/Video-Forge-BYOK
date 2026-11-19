// Swear-word clean-up (src/lib/post/swears.ts): matching, swapping, starring
// out, and where the bleeps go.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  activeRules, cleanSwears, defaultSwears, maskSwears, swapSwears, swearWindows, isSwear,
  ownRulesFromText, ownRulesToText,
} from "../../src/lib/post/swears.ts";
import { cleanPost, defaultPost } from "../../src/lib/post/postSettings.ts";

const on = (mode, extra = {}) => activeRules({ ...defaultSwears(), mode, ...extra });

test("default is no clean-up, and old projects stay off", () => {
  assert.equal(defaultSwears().mode, "off");
  assert.equal(defaultPost().swears.mode, "off");
  assert.equal(cleanPost({ studioSound: true }).swears.mode, "off");
  assert.equal(cleanSwears({ mode: "nuke" }).mode, "off");
  assert.deepEqual(on("off"), []);
});

test("English: whole words and word starts, any capitals", () => {
  const r = on("bleep");
  for (const w of ["fuck", "Fucking", "FUCKED", "shit!", "bullshit", "motherfucker", "ass,", "Damn"]) assert.ok(isSwear(w, r), w);
  for (const w of ["assume", "class", "duck", "shoot", "scunthorpe", "pass"]) assert.ok(!isSwear(w, r), w);
});

test("Greek: accents and capitals don't matter, innocent look-alikes stay", () => {
  const r = on("bleep");
  for (const w of ["γαμώτο", "Γαμωτο", "ΓΑΜΩΤΟ!", "μαλάκα", "μαλακα", "σκατά", "γαμημένος", "γαμημένη", "κωλόπαιδο"]) assert.ok(isSwear(w, r), w);
  for (const w of ["γάμος", "μαλακός", "μαλακό", "κώλυμα", "σκάλα", "μουντός"]) assert.ok(!isSwear(w, r), w);
});

test("swap: softer word, same capitals, rest of the word kept", () => {
  const r = on("swap");
  assert.equal(swapSwears("What the fuck, this is fucking great. FUCK!", r), "What the duck, this is ducking great. DUCK!");
  assert.equal(swapSwears("Motherfucker.", r), "Motherducker.");
  assert.equal(swapSwears("Γαμώτο, είσαι μαλάκας.", r), "Να πάρει, είσαι βλάκας.");
  assert.equal(swapSwears("ο γαμημένος καιρός", r), "ο αναθεματισμένος καιρός");
  assert.equal(swapSwears("Ένα κωλόπαιδο!", r), "Ένα παλιόπαιδο!");
});

test("swap and mask leave [tags] and spacing alone", () => {
  const r = on("swap");
  assert.equal(swapSwears("[angry]  fuck  [pop shit]", r), "[angry]  duck  [pop shit]");
  assert.equal(maskSwears("[angry] fuck", r), "[angry] f***");
});

test("mask: first letter and stars, punctuation kept, word count kept", () => {
  const r = on("bleep");
  assert.equal(maskSwears("Oh shit, fucking hell!", r), "Oh s***, f****** hell!");
  assert.equal(maskSwears("Γαμώτο!", r), "Γ*****!");
  const line = "This is fucking amazing, holy shit";
  assert.equal(maskSwears(line, r).split(/\s+/).length, line.split(/\s+/).length);
});

test("allowed words get through; the project's own words are added and win", () => {
  const r = on("swap", { allowed: ["damn*"], own: [{ word: "heck", swap: "hmm" }, { word: "fuck*", swap: "fudge*" }] });
  assert.ok(!isSwear("damn", r));
  assert.equal(swapSwears("heck, fucking damn", r), "hmm, fudgeing damn");
  // a word with no softer word is left for the bleep
  const r2 = on("swap", { own: [{ word: "blah", swap: "" }] });
  assert.equal(swapSwears("blah", r2), "blah");
  assert.ok(isSwear("blah", r2));
});

test("languages switch off separately", () => {
  const r = on("bleep", { greek: false });
  assert.ok(isSwear("shit", r));
  assert.ok(!isSwear("σκατά", r));
});

test("own words box: text in, rules out, and back", () => {
  const rules = ownRulesFromText("heck = hmm\n# a note\n\nφτου* = ωχ*\nblah\n* = x");
  assert.deepEqual(rules, [{ word: "heck", swap: "hmm" }, { word: "φτου*", swap: "ωχ*" }, { word: "blah", swap: "" }]);
  assert.equal(ownRulesToText(rules), "heck = hmm\nφτου* = ωχ*\nblah");
});

test("bleep windows: padded, merged when they touch, in seconds", () => {
  const r = on("bleep");
  const words = [
    { text: "oh", startMs: 0, endMs: 200 },
    { text: "fuck", startMs: 1000, endMs: 1300 },
    { text: "shit", startMs: 1350, endMs: 1600 },
    { text: "ok", startMs: 1700, endMs: 1900 },
    { text: "damn!", startMs: 3000, endMs: 3200 },
  ];
  assert.deepEqual(swearWindows(words, r, 40), [[0.96, 1.64], [2.96, 3.24]]);
  assert.deepEqual(swearWindows(words, [], 40), []);
  assert.deepEqual(swearWindows([{ text: "fuck", startMs: 10, endMs: 100 }], r, 40), [[0, 0.14]]);
});
