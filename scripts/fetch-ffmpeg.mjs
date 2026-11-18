#!/usr/bin/env node
/**
 * Gets the full ffmpeg the Windows installer carries (tools/lib/ffmpegBundle.mjs).
 *
 *   npm run ffmpeg                       download (once), check, unpack
 *   node scripts/fetch-ffmpeg.mjs --zip <file>   use a zip already on this PC
 *   node scripts/fetch-ffmpeg.mjs --check        only say whether it is ready
 *
 * 1. Downloads the pinned zip into build/ffmpeg-cache/ (kept, so a second
 *    build does not download again).
 * 2. Stops unless its size and SHA-256 match the pin exactly.
 * 3. Unpacks ffmpeg.exe, its LICENSE and README into build/ffmpeg/, which
 *    electron-builder copies to resources/ffmpeg/ in the installer.
 * 4. Runs it once: it must report the pinned version and have every filter
 *    post-production and the intro/outro cards use.
 *
 * Network only, no heavy CPU. Nothing here is committed (see .gitignore).
 * Called by scripts/build-exe.mjs and the release workflow.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";
import { FFMPEG, FFMPEG_CACHE, FFMPEG_DIR, STAMP, isUnpacked, sameSha, sha256File, stampFor } from "../tools/lib/ffmpegBundle.mjs";
import { filtersFrom } from "../electron/post/postGraph.ts";
import { CARD_FILTERS, POST_FILTERS } from "../electron/process/ffmpegChoice.ts";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const opt = (name) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
};
const OUT = path.join(ROOT, ...FFMPEG_DIR.split("/"));
const CACHE = path.join(ROOT, ...FFMPEG_CACHE.split("/"));
const ZIP = path.join(CACHE, path.basename(new URL(FFMPEG.url).pathname));

const ok = (m) => console.log(`✓ ${m}`);
const fail = (m) => {
  console.error(`✗ ${m}`);
  process.exit(1);
};

if (process.platform !== "win32") {
  console.log("(the full ffmpeg is only carried by the Windows build; nothing to do here)");
  process.exit(0);
}

const present = () => (fs.existsSync(OUT) ? fs.readdirSync(OUT) : []);
const stampText = () => {
  try {
    return fs.readFileSync(path.join(OUT, STAMP), "utf8");
  } catch {
    return "";
  }
};

/** Run the unpacked ffmpeg: right version, every filter we use. */
function verify(exe) {
  const v = spawnSync(exe, ["-hide_banner", "-version"], { encoding: "utf8", windowsHide: true, timeout: 30000 });
  const first = (v.stdout ?? "").split(/\r?\n/)[0];
  if (v.status !== 0 || !first.includes(`version ${FFMPEG.version}-`)) fail(`ffmpeg.exe did not report version ${FFMPEG.version} (said: ${first || v.error?.message || "nothing"})`);
  const f = spawnSync(exe, ["-hide_banner", "-filters"], { encoding: "utf8", windowsHide: true, timeout: 30000 });
  const caps = filtersFrom(f.stdout ?? "");
  const lacking = [...CARD_FILTERS, ...POST_FILTERS].filter((x) => !caps.has(x));
  if (lacking.length) fail(`ffmpeg.exe lacks ${lacking.join(", ")}`);
  ok(`${first.split(" Copyright")[0]}: all ${CARD_FILTERS.length + POST_FILTERS.length} filters the app uses are there (${caps.size} in all)`);
}

if (isUnpacked(stampText(), present())) {
  if (argv.includes("--check")) verify(path.join(OUT, "ffmpeg.exe"));
  ok(`full ffmpeg ${FFMPEG.version} ready in ${FFMPEG_DIR}/`);
  process.exit(0);
}
if (argv.includes("--check")) fail(`the full ffmpeg is not in ${FFMPEG_DIR}/ yet: run npm run ffmpeg`);

// ── 1. the zip ────────────────────────────────────────────────────────────
let zip = opt("--zip") ? path.resolve(opt("--zip")) : ZIP;
if (!fs.existsSync(zip)) {
  fs.mkdirSync(CACHE, { recursive: true });
  console.log(`▸ downloading ffmpeg ${FFMPEG.version} (${FFMPEG.builder} ${FFMPEG.variant}, ${(FFMPEG.size / 1e6).toFixed(0)} MB)`);
  const res = await fetch(FFMPEG.url, { redirect: "follow" });
  if (!res.ok || !res.body) fail(`download failed: HTTP ${res.status} from ${FFMPEG.url}`);
  const part = `${zip}.part`;
  await pipeline(Readable.fromWeb(res.body), fs.createWriteStream(part));
  fs.renameSync(part, zip);
}

// ── 2. checked before anything is unpacked ────────────────────────────────
const size = fs.statSync(zip).size;
const sha = await sha256File(zip);
if (size !== FFMPEG.size || !sameSha(sha)) {
  if (zip === ZIP) fs.rmSync(zip, { force: true }); // a bad download is not kept
  fail(`the ffmpeg zip does not match the pin (size ${size}, SHA-256 ${sha}; expected ${FFMPEG.size}, ${FFMPEG.sha256}). Nothing was unpacked.`);
}
ok(`SHA-256 matches the pin (${sha.slice(0, 16)}…)`);

// ── 3. unpack the three files ─────────────────────────────────────────────
fs.mkdirSync(CACHE, { recursive: true });
const tmp = fs.mkdtempSync(path.join(CACHE, "unpack-"));
// Windows' own tar (bsdtar) reads zip; Git's GNU tar on PATH does not.
const tar = path.join(process.env.SystemRoot ?? "C:\\Windows", "System32", "tar.exe");
const members = Object.keys(FFMPEG.take).map((rel) => `${FFMPEG.root}/${rel}`);
const r = spawnSync(tar, ["-xf", zip, "-C", tmp, ...members], { encoding: "utf8", windowsHide: true });
if (r.status !== 0) fail(`unpacking failed: ${(r.stderr || r.error?.message || "").trim()}`);
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
for (const [rel, name] of Object.entries(FFMPEG.take)) {
  const from = path.join(tmp, FFMPEG.root, ...rel.split("/"));
  if (!fs.existsSync(from)) fail(`${rel} is missing from the zip`);
  fs.renameSync(from, path.join(OUT, name));
}
fs.rmSync(tmp, { recursive: true, force: true });

// ── 4. it runs and has what we need ───────────────────────────────────────
verify(path.join(OUT, "ffmpeg.exe"));
fs.writeFileSync(path.join(OUT, STAMP), JSON.stringify(stampFor(), null, 2) + "\n");
const mb = (fs.statSync(path.join(OUT, "ffmpeg.exe")).size / 1e6).toFixed(0);
ok(`full ffmpeg ${FFMPEG.version} unpacked into ${FFMPEG_DIR}/ (ffmpeg.exe ${mb} MB, LICENSE.txt, README.txt)`);
