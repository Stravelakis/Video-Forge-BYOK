// Run: npm test   (needs Node 22.18+, which strips the TypeScript types itself)
// Save, autosave and "New project": what survives and what must not
// (review 16 Nov 2026, S1, S3, S4).
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { projectToDoc, docToProject, autosaveSnapshot, blankProject, cleanDirections } from "../../src/lib/project/projectFile.ts";

const read = (p) => fs.readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");

const directions = {
  "0": { text: "Maria: Hello", items: [{ tag: "walks to centre", at: 0.4 }, { tag: "camera close on Maria", at: 0, ai: true }] },
};

const state = () => ({
  render: { format: "9:16", width: 1080, height: 1920, durationSec: 30 },
  fps: 30,
  speakers: [],
  script: "Maria: Hello",
  language: "el",
  backgroundDim: 0.4,
  backgroundBlur: 0.02,
  backgroundColorLook: "sepia",
  backgroundCrossfadeMs: 500,
  directions,
  narration: { filePath: "C:/out/n.wav", segments: [], analysis: { hz: 30, amp: [1] } },
  music: null,
  attachedAudio: null,
});

test("Save project keeps the Direct step's directions, and opening gives them back", () => {
  const opened = docToProject(JSON.parse(JSON.stringify(projectToDoc(state()))));
  assert.equal(opened.ok, true);
  assert.deepEqual(opened.project.directions, directions);
});

test("an older file with no directions still opens, and brings none of its own", () => {
  const opened = docToProject({ kind: "byok-project", version: 2, project: { script: "x" } });
  assert.equal(opened.ok, true);
  assert.equal("directions" in opened.project, false);
});

test("directions of the wrong shape in a file are dropped, not loaded", () => {
  assert.deepEqual(cleanDirections("x"), {});
  assert.deepEqual(cleanDirections([1, 2]), {});
  assert.deepEqual(
    cleanDirections({ "0": { text: "a", items: [{ tag: "waves", at: "<b>" }, { tag: 5, at: 0 }, { tag: "nods", at: 3 }] }, "1": { text: 2, items: [] } }),
    { "0": { text: "a", items: [{ tag: "nods", at: 1 }] } },
  );
});

test("the autosave keeps background blur, colour look and directions", () => {
  const snap = JSON.parse(JSON.stringify(autosaveSnapshot(state())));
  assert.equal(snap.backgroundBlur, 0.02);
  assert.equal(snap.backgroundColorLook, "sepia");
  assert.deepEqual(snap.directions, directions);
  assert.equal(snap.narration.analysis, null, "the heavy analysis still stays out");
});

test("the store's autosave uses that same list", () => {
  const store = read("src/store/useProjectStore.ts");
  assert.match(store, /partialize: \(s\) => autosaveSnapshot\(s\)/);
});

test("New project leaves nothing of the old project behind, even fields the defaults lack", () => {
  // The store MERGES on set: model that exactly.
  const old = { ...state(), unrelatedAction: "kept" };
  const defaults = { script: "", backgroundBlur: 0, narration: null };
  const after = Object.assign({ ...old }, blankProject(defaults));
  assert.equal(after.directions, undefined, "the old directions are gone");
  assert.equal(after.backgroundColorLook, undefined, "the old colour look is gone");
  assert.equal(after.backgroundBlur, 0);
  assert.equal(after.script, "");
  assert.equal(after.narration, null);
  assert.equal(after.unrelatedAction, "kept", "the store's actions are untouched");
});

test("New and Open both start from blankProject, and the defaults start with no directions", () => {
  const store = read("src/store/useProjectStore.ts");
  assert.match(store, /set\(blankProject\(defaultProject\)\)/, "reset");
  assert.match(store, /\.\.\.blankProject\(defaultProject\),\s*\n\s*\.\.\.migrateFade\(p\)/, "loadProject");
  const defaults = read("src/store/defaults.ts");
  assert.match(defaults, /directions: \{\}/);
  assert.match(defaults, /backgroundColorLook: "none"/);
});
