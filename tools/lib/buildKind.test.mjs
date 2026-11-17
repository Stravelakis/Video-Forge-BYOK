// Run: npm test
// The Public build guard: personal content (brands, music, Mixamo files) must
// never reach the version anyone can download.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import {
  PERSONAL_PATHS,
  checkPublicConfig,
  chooseKind,
  findPersonalFiles,
  isSetAside,
  makeBuildConfig,
  patternReaches,
} from "./buildKind.mjs";

const pkg = JSON.parse(fs.readFileSync(new URL("../../package.json", import.meta.url), "utf8"));
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "vf-buildkind-"));

test("the real package.json makes a Public config the guard accepts", () => {
  const cfg = makeBuildConfig(pkg.build, "public", pkg.version);
  assert.deepEqual(checkPublicConfig(cfg), []);
  assert.equal(cfg.productName, "Video Forge");
  assert.equal(cfg.extraMetadata.videoForgeBuild, "public");
  for (const f of cfg.files) assert.ok(!/^(brands|music)\//.test(f) && f !== "brand.local.json", `still asks for ${f}`);
});

test("Personal and Public are named apart", () => {
  const pub = makeBuildConfig(pkg.build, "public", "1.2.3");
  const per = makeBuildConfig(pkg.build, "personal", "1.2.3");
  assert.equal(per.productName, "Video Forge Personal");
  assert.notEqual(per.appId, pub.appId);
  assert.match(per.nsis.artifactName, /^Video Forge Personal Setup/);
  assert.match(pub.nsis.artifactName, /^Video Forge Setup/);
  assert.match(per.portable.artifactName, /Personal/);
  assert.doesNotMatch(pub.portable.artifactName, /Personal/);
  assert.equal(per.extraMetadata.videoForgeBuild, "personal");
  // linked folders are taken in by name too (a junction is not a folder to the builder)
  assert.ok(per.files.includes("brands") && per.files.includes("music"));
  // the input is left alone
  assert.ok(pkg.build.files.includes("brands/**"));
  assert.throws(() => makeBuildConfig(pkg.build, "secret", "1"));
});

test("the guard refuses a config that lets anything personal in", () => {
  const good = makeBuildConfig(pkg.build, "public", "1.0.0");
  // a pattern added after the "!" lines lets music back in
  assert.ok(checkPublicConfig({ ...good, files: [...good.files, "music/**"] }).some((p) => /music/.test(p)));
  // a catch-all after the shut-outs
  assert.ok(checkPublicConfig({ ...good, files: [...good.files, "**/*"] }).length > 0);
  // a shut-out missing
  const noModels = good.files.filter((f) => !f.includes("builder/models"));
  assert.ok(checkPublicConfig({ ...good, files: noModels }).some((p) => /models/.test(p)));
  // the personal config is not a public one
  assert.ok(checkPublicConfig(makeBuildConfig(pkg.build, "personal", "1.0.0")).length > 0);
  // extra files that would carry brands in
  assert.ok(checkPublicConfig({ ...good, extraResources: [{ from: "brands/skilitsa", to: "x" }] }).length > 0);
});

test("which patterns reach personal paths", () => {
  assert.ok(patternReaches("brands/**", "brands"));
  assert.ok(patternReaches("characters/samples/kenney/builder/**", "characters/samples/kenney/builder/models"));
  assert.ok(patternReaches("characters/**", "characters/samples/kenney/builder/motions.json"));
  assert.ok(patternReaches("**/*", "music"));
  assert.ok(!patternReaches("characters/core/**", "characters/samples/kenney/builder/models"));
  assert.ok(!patternReaches("!brands/**", "brands"));
  assert.ok(!patternReaches("out/**", "music"));
});

test("electron-builder's own file rules keep personal files out of the Public build", () => {
  // The same matcher electron-builder uses, run against a fake app folder.
  const require = createRequire(new URL("../../package.json", import.meta.url));
  let FileMatcher;
  try {
    ({ FileMatcher } = require("app-builder-lib/out/fileMatcher"));
  } catch {
    return; // electron-builder not installed: nothing to compare with
  }
  const root = tmp();
  const cfg = makeBuildConfig(pkg.build, "public", "1.0.0");
  const filter = new FileMatcher(root, root, (s) => s, cfg.files).createFilter();
  const fileStat = { isDirectory: () => false, isSymbolicLink: () => false };
  const at = (rel) => path.join(root, ...rel.split("/"));
  for (const rel of [
    "brands/skilitsa/brand.json",
    "music/loop.wav",
    "brand.local.json",
    "characters/samples/kenney/builder/motions.json",
    "characters/samples/kenney/builder/models/animated/lib-move.glb",
  ]) {
    assert.equal(filter(at(rel), fileStat), false, `${rel} would go in`);
  }
  // a folder link (junction) named brands is shut out as well
  const linkStat = { isDirectory: () => false, isSymbolicLink: () => true };
  assert.equal(filter(at("brands"), linkStat), false);
  assert.equal(filter(at("music"), linkStat), false);
  // the app itself still goes in
  for (const rel of ["out/main/main.js", "characters/samples/kenney/builder/manifest.json", "remotion/index.ts"]) {
    assert.equal(filter(at(rel), fileStat), true, `${rel} would be left out`);
  }
  // and the Personal build takes a linked brands folder
  const per = new FileMatcher(root, root, (s) => s, makeBuildConfig(pkg.build, "personal", "1.0.0").files).createFilter();
  assert.equal(per(at("brands"), linkStat), true);
  assert.equal(per(at("music"), linkStat), true);
  // copies the content script set aside never ship, in either build
  for (const f of [filter, per]) {
    assert.equal(f(at("characters/samples/kenney/builder/models.before-personal-2026-11-17/animated/a.glb"), fileStat), false);
    assert.equal(f(at("characters/samples/kenney/builder/motions.json.before-personal-2026-11-17"), fileStat), false);
  }
  assert.ok(isSetAside("music.before-personal-2026-11-17/a.wav"));
  assert.ok(!isSetAside("music/a.wav"));
  fs.rmSync(root, { recursive: true, force: true });
});

test("a packed folder is checked for personal files, and the kind follows what is on disk", () => {
  const root = tmp();
  assert.deepEqual(findPersonalFiles(root), []);
  assert.equal(chooseKind([], root), "public");
  fs.mkdirSync(path.join(root, "music"));
  fs.mkdirSync(path.join(root, "characters/samples/kenney/builder"), { recursive: true });
  fs.writeFileSync(path.join(root, "characters/samples/kenney/builder/motions.json"), "{}");
  assert.deepEqual(findPersonalFiles(root), ["music", "characters/samples/kenney/builder/motions.json"]);
  assert.equal(chooseKind([], root), "personal");
  assert.equal(chooseKind(["--public"], root), "public");
  // a set-aside copy inside a packed app is found too
  fs.mkdirSync(path.join(root, "characters/samples/kenney/builder/models.before-personal-2026-11-17"));
  assert.ok(findPersonalFiles(root, { setAside: true }).includes("characters/samples/kenney/builder/models.before-personal-2026-11-17"));
  assert.ok(PERSONAL_PATHS.includes("brands"));
  fs.rmSync(root, { recursive: true, force: true });
});
