// Run: npm test   (needs Node 22.18+, which strips the TypeScript types itself)
// The 3D Humans (Mixamo-based) ship in the Personal build only. Every picker
// asks src/lib/kenney/available.ts whether they are here; this checks its
// answers, and that the public model sets are complete in the repo.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { ANIMATED_FILES, ASSUME_PUBLIC, PERSONAL_ONLY_NOTE, PersonalOnlyError, isPersonalOnly, probeKenney, setAvailable, setNote } from "../../src/lib/kenney/available.ts";

const asset = (rel) => "forge-kenney://app/" + rel;
const fakeFetch = (present, seen = []) => async (url, init) => {
  seen.push([url, init?.method]);
  if (url.includes("boom")) throw new Error("offline");
  return { ok: present.some((p) => url.endsWith(p)) };
};

test("Public build: no Humans model or moves → the Humans are greyed out", async () => {
  const seen = [];
  const a = await probeKenney(asset, fakeFetch([], seen));
  assert.deepEqual(a, { animated: false, motions: false });
  // asks once per file, without downloading it
  assert.deepEqual(seen, ANIMATED_FILES.map((f) => [asset(f), "HEAD"]));
  assert.equal(setAvailable("animated", a), false);
  assert.equal(setNote("animated", a), PERSONAL_ONLY_NOTE);
  assert.equal(PERSONAL_ONLY_NOTE, "In the personal build only.");
  for (const set of ["mini", "pets"]) {
    assert.equal(setAvailable(set, a), true);
    assert.equal(setNote(set, a), null);
  }
});

test("Personal build: both files → the Humans are offered", async () => {
  const a = await probeKenney(asset, fakeFetch(["models/animated/animated.glb", "motions.json"]));
  assert.deepEqual(a, { animated: true, motions: true });
  assert.equal(setNote("animated", a), null);
});

test("half there counts as absent; a failed request counts as absent", async () => {
  assert.deepEqual(await probeKenney(asset, fakeFetch(["models/animated/animated.glb"])), { animated: false, motions: false });
  assert.deepEqual(await probeKenney(asset, fakeFetch(["motions.json"])), { animated: false, motions: true });
  assert.deepEqual(await probeKenney((rel) => "boom/" + rel, fakeFetch(["motions.json"])), { animated: false, motions: false });
  // before the answer comes, nothing personal is assumed
  assert.equal(setAvailable("animated", ASSUME_PUBLIC), false);
});

test("the actor's missing-Humans error is recognised as a note, not a failure", () => {
  const e = new PersonalOnlyError();
  assert.ok(isPersonalOnly(e));
  assert.match(e.message, /personal build only/);
  assert.ok(!isPersonalOnly(new Error("Could not load x")));
  assert.ok(!isPersonalOnly(null));
});

test("the public model sets are complete in the repo, and Mixamo-free", () => {
  const base = new URL("../../characters/samples/kenney/builder/", import.meta.url);
  const manifest = JSON.parse(fs.readFileSync(new URL("manifest.json", base), "utf8"));
  const props = JSON.parse(fs.readFileSync(new URL("props.json", base), "utf8"));
  const files = [...manifest.sets.mini.items, ...manifest.sets.pets.items, ...props.items].map((i) => i.file);
  assert.equal(files.length, 20 + 24 + 42);
  for (const f of files) {
    assert.match(f, /^models\/(mini|pets|props)\//);
    const buf = fs.readFileSync(new URL(f, base));
    assert.equal(buf.toString("latin1", 0, 4), "glTF", `${f} is not a .glb`);
    assert.ok(!buf.toString("latin1").toLowerCase().includes("mixamo"), `${f} mentions mixamo`);
  }
  // the Humans point at the private set only
  for (const i of manifest.sets.animated.items) assert.match(i.file, /^models\/animated\//);
});
