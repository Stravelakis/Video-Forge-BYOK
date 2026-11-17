// Run: npm test
// scripts/personal-content.mjs's decisions: where the clone may go, which
// paths are allowed, and what happens to content already in the app folder.
// Temp folders only; no git, no network.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  ITEMS,
  asideName,
  checkCloneDir,
  defaultCloneDir,
  filesNotIn,
  isOurRemote,
  itemPath,
  parseStatus,
  planItem,
  whatIsAt,
} from "./personalContent.mjs";

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "vf-personal-"));
const put = (root, rel, text = "x") => {
  const p = path.join(root, ...rel.split("/"));
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, text);
};
const linkDir = (target, at) => fs.symlinkSync(target, at, process.platform === "win32" ? "junction" : "dir");
const item = (rel) => ITEMS.find((i) => i.rel === rel);

test("the items mirror the app's paths", () => {
  assert.deepEqual(
    ITEMS.map((i) => `${i.rel}:${i.kind}`),
    ["brands:dir", "music:dir", "characters/samples/kenney/builder/motions.json:file", "characters/samples/kenney/builder/models:dir"],
  );
});

test("item paths cannot leave their folder", () => {
  const root = path.resolve("/vf/app");
  assert.equal(itemPath(root, "characters/samples/kenney/builder/models"), path.join(root, "characters", "samples", "kenney", "builder", "models"));
  for (const bad of ["../x", "a/../../x", "/etc/passwd", "C:/Windows", "c:x", "a\\b", "", "a//b", "./a", null]) {
    assert.throws(() => itemPath(root, bad), undefined, String(bad));
  }
});

test("the clone sits beside the app folder, never inside it", () => {
  const app = path.resolve("/work/BYOK-Vid-Creator");
  assert.equal(defaultCloneDir(app), path.resolve("/work/Video-Forge-personal"));
  assert.equal(checkCloneDir(app, defaultCloneDir(app)), null);
  assert.match(checkCloneDir(app, path.join(app, ".personal")), /outside the app folder/);
  assert.match(checkCloneDir(app, app), /outside the app folder/);
  assert.match(checkCloneDir(app, path.resolve("/work")), /must not contain/);
  // a folder whose name merely starts the same is fine
  assert.equal(checkCloneDir(app, path.resolve("/work/BYOK-Vid-Creator-personal")), null);
});

test("only the personal repo, old or new name, counts as ours", () => {
  assert.ok(isOurRemote("https://github.com/DnD-World/Video-Forge-personal.git"));
  assert.ok(isOurRemote("https://github.com/DnD-World/Video-Forge-brands.git"));
  assert.ok(isOurRemote("git@github.com:DnD-World/Video-Forge-personal.git\n"));
  assert.ok(!isOurRemote("https://github.com/Stravelakis/Video-Forge-BYOK.git"));
  assert.ok(!isOurRemote("https://github.com/DnD-World/Video-Forge-personal-fork.git"));
  assert.ok(!isOurRemote(""));
});

test("git status: local-only entries and unsaved changes", () => {
  const s = parseStatus("!! scotus/rig/.venv/\n?? notes.txt\n!! \"with space/\"\n");
  assert.deepEqual(s.localOnly, ["scotus/rig/.venv", "notes.txt", "with space"]);
  assert.equal(s.changed, false);
  assert.equal(parseStatus(" M brand.json\n!! x/").changed, true);
  assert.equal(parseStatus("").changed, false);
});

test("plans: link, already linked, relink, set aside, stop — and run twice changes nothing", () => {
  const base = tmp();
  const app = path.join(base, "app");
  const clone = path.join(base, "Video-Forge-personal");
  put(clone, "music/a.wav", "aaa");
  put(clone, "brands/skilitsa/brand.json", "{}");
  put(clone, "characters/samples/kenney/builder/motions.json", "{\"m\":1}");
  put(app, "package.json", "{}");

  // nothing there yet
  assert.equal(planItem(app, clone, item("music")).action, "link");
  assert.equal(planItem(app, clone, item("characters/samples/kenney/builder/models")).action, "skip");

  // linked to the clone: nothing to do (the second run)
  linkDir(path.join(clone, "music"), path.join(app, "music"));
  assert.equal(whatIsAt(path.join(app, "music")).type, "link");
  assert.equal(planItem(app, clone, item("music")).action, "ok");

  // linked somewhere else: the link is replaced (links hold no data)
  const elsewhere = path.join(base, "elsewhere");
  fs.mkdirSync(elsewhere);
  linkDir(elsewhere, path.join(app, "brands"));
  assert.equal(planItem(app, clone, item("brands")).action, "relink");
  fs.unlinkSync(path.join(app, "brands"));

  // a real folder whose files are all in the clone: set aside, not deleted
  put(app, "brands/skilitsa/brand.json", "{}");
  assert.equal(planItem(app, clone, item("brands")).action, "set-aside");
  assert.equal(planItem(app, clone, item("brands"), { copy: true }).action, "refresh-copy");
  // …and one that holds a file the clone lacks: stop
  put(app, "brands/skilitsa/only-here.png", "p");
  const stop = planItem(app, clone, item("brands"));
  assert.equal(stop.action, "stop");
  assert.match(stop.why, /only-here\.png/);
  assert.deepEqual(filesNotIn(path.join(app, "brands"), path.join(clone, "brands")), ["skilitsa/only-here.png"]);
  // the old brands clone is migrated, not judged file by file
  assert.equal(planItem(app, clone, item("brands"), { oldClone: true }).action, "migrate-clone");

  // the single file: same = ok, different = kept aside then copied
  const motions = item("characters/samples/kenney/builder/motions.json");
  assert.equal(planItem(app, clone, motions).action, "link");
  put(app, "characters/samples/kenney/builder/motions.json", "{\"m\":1}");
  assert.equal(planItem(app, clone, motions).action, "ok");
  put(app, "characters/samples/kenney/builder/motions.json", "{\"m\":2}");
  assert.equal(planItem(app, clone, motions).action, "set-aside");

  fs.unlinkSync(path.join(app, "music"));
  fs.rmSync(base, { recursive: true, force: true });
});

test("set-aside names never overwrite an earlier one", () => {
  const base = tmp();
  const p = path.join(base, "music");
  assert.equal(asideName(p, "2026-11-17"), `${p}.before-personal-2026-11-17`);
  fs.mkdirSync(`${p}.before-personal-2026-11-17`);
  assert.equal(asideName(p, "2026-11-17"), `${p}.before-personal-2026-11-17-2`);
  fs.rmSync(base, { recursive: true, force: true });
});
