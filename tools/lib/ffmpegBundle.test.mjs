// Run: npm test
// The pinned full ffmpeg (tools/lib/ffmpegBundle.mjs): the pin is complete,
// checksums are compared strictly, and the installer settings carry it.
// No download here.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { FFMPEG, FFMPEG_DIR, isUnpacked, sameSha, sha256File, stampFor } from "./ffmpegBundle.mjs";
import { checkPublicConfig, makeBuildConfig } from "./buildKind.mjs";

const pkg = JSON.parse(fs.readFileSync(new URL("../../package.json", import.meta.url), "utf8"));
const notice = fs.readFileSync(new URL("../../NOTICE", import.meta.url), "utf8");

test("the pin names one exact release, with its checksum and source", () => {
  assert.match(FFMPEG.version, /^\d+\.\d+(\.\d+)?$/);
  assert.match(FFMPEG.sha256, /^[0-9a-f]{64}$/);
  assert.ok(FFMPEG.size > 10e6);
  // a tagged release asset, never a "latest" link that changes under the pin
  assert.match(FFMPEG.url, new RegExp(`^https://github\\.com/GyanD/codexffmpeg/releases/download/${FFMPEG.version.replace(/\./g, "\\.")}/`));
  assert.doesNotMatch(FFMPEG.url, /latest|release-essentials|git-/);
  assert.ok(FFMPEG.url.endsWith(`${FFMPEG.root}.zip`));
  assert.match(FFMPEG.source, /^https:\/\/github\.com\/FFmpeg\/FFmpeg\/commit\/[0-9a-f]{7,40}$/);
  assert.deepEqual(Object.values(FFMPEG.take).sort(), ["LICENSE.txt", "README.txt", "ffmpeg.exe"]);
});

test("checksums: exact match only", async () => {
  assert.ok(sameSha(FFMPEG.sha256));
  assert.ok(sameSha(`sha256:${FFMPEG.sha256.toUpperCase()}`), "GitHub's digest form");
  assert.ok(!sameSha(FFMPEG.sha256.slice(0, 63) + "0"));
  assert.ok(!sameSha(""));
  assert.ok(!sameSha(undefined));
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "vf-ffmpeg-"));
  const f = path.join(dir, "x.bin");
  fs.writeFileSync(f, "abc");
  assert.equal(await sha256File(f), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  fs.rmSync(dir, { recursive: true, force: true });
});

test("an unpacked folder counts only when it is this pin and complete", () => {
  const stamp = JSON.stringify(stampFor());
  const all = ["ffmpeg.exe", "LICENSE.txt", "README.txt", "bundle.json"];
  assert.ok(isUnpacked(stamp, all));
  assert.ok(!isUnpacked(stamp, ["ffmpeg.exe", "README.txt"]), "the licence must ship next to it");
  assert.ok(!isUnpacked(JSON.stringify({ ...stampFor(), version: "8.1.2" }), all));
  assert.ok(!isUnpacked(JSON.stringify({ ...stampFor(), sha256: "0".repeat(64) }), all));
  assert.ok(!isUnpacked("", all));
  assert.ok(!isUnpacked("not json", all));
});

test("both installers carry it in resources/ffmpeg, and the Public guard still passes", () => {
  const extra = pkg.build.extraResources;
  assert.ok(Array.isArray(extra));
  const ff = extra.find((e) => e.to === "ffmpeg");
  assert.equal(ff.from, FFMPEG_DIR);
  assert.deepEqual([...ff.filter].sort(), Object.values(FFMPEG.take).sort());
  for (const kind of ["public", "personal"]) assert.deepEqual(makeBuildConfig(pkg.build, kind, "1.0.0").extraResources, extra);
  assert.deepEqual(checkPublicConfig(makeBuildConfig(pkg.build, "public", "1.0.0")), []);
  assert.ok(pkg.build.files.includes("NOTICE"));
  assert.equal(pkg.scripts.ffmpeg, "node scripts/fetch-ffmpeg.mjs");
});

test("NOTICE says what the ffmpeg is, its licence and where its source is", () => {
  assert.ok(notice.includes(`FFmpeg ${FFMPEG.version}`));
  assert.ok(notice.includes(FFMPEG.source));
  assert.ok(notice.includes(FFMPEG.sourceTarball));
  assert.match(notice, /GNU General Public License/);
  assert.match(notice, /separate program/i);
  assert.match(notice, /Kenney/);
  assert.match(notice, /CC0/);
});
