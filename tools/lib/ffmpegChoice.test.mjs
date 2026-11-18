// Run: npm test   (needs Node 22.18+, which strips the TypeScript types itself)
// Which ffmpeg the app uses (electron/process/ffmpegChoice.ts), and the
// capability check post-production relies on (filtersFrom in postGraph.ts).
// No ffmpeg is run here except the optional real check at the end.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { CARD_FILTERS, POST_FILTERS, bundledFfmpegPlaces, chooseFfmpeg, isFull, missingPostFilters } from "../../electron/process/ffmpegChoice.ts";
import { filtersFrom } from "../../electron/post/postGraph.ts";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const FULL = new Set([...CARD_FILTERS, ...POST_FILTERS, "volume", "amix"]);
// Remotion's cut-down copy (measured 17 Nov 2026): none of the card or post filters
const STRIPPED = new Set(["adelay", "aformat", "amix", "anull", "apad", "aresample", "asetrate", "atempo", "atrim", "loudnorm", "pan", "volume", "asetpts", "format"]);
const bundled = { where: "bundled", bin: "C:/App/resources/ffmpeg/ffmpeg.exe" };
const onPath = { where: "path", bin: "ffmpeg" };
const remotion = { where: "remotion", bin: "C:/App/node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe" };
const caps = (table) => (bin) => table[bin] ?? new Set();

test("preference: the bundled full ffmpeg, then a full one on PATH, then Remotion's", () => {
  // everything full: the bundled one wins, whatever order they come in
  const all = { [bundled.bin]: FULL, ffmpeg: FULL, [remotion.bin]: STRIPPED };
  assert.deepEqual(chooseFfmpeg([remotion, onPath, bundled], caps(all)), { ...bundled, full: true });
  // no bundled one (a source checkout): the full PATH ffmpeg
  assert.deepEqual(chooseFfmpeg([null, onPath, remotion], caps(all)), { ...onPath, full: true });
  // PATH has a cut-down or no ffmpeg: still the bundled one
  assert.deepEqual(chooseFfmpeg([bundled, onPath, remotion], caps({ [bundled.bin]: FULL, ffmpeg: STRIPPED })), { ...bundled, full: true });
  // a broken bundled copy (it does not run: no filters) is passed over
  assert.deepEqual(chooseFfmpeg([bundled, onPath, remotion], caps({ ffmpeg: FULL })), { ...onPath, full: true });
  // nothing full anywhere: Remotion's copy keeps the app working, marked not full
  assert.deepEqual(chooseFfmpeg([onPath, remotion], caps({ [remotion.bin]: STRIPPED })), { ...remotion, full: false });
  // only a bare PATH name and nothing answers: still something to try
  assert.deepEqual(chooseFfmpeg([onPath], caps({})), { ...onPath, full: false });
  assert.equal(chooseFfmpeg([], caps({})), null);
  assert.equal(chooseFfmpeg([null, undefined], caps({})), null);
});

test("full means the card filters; post-production lists what is missing", () => {
  assert.ok(isFull(FULL));
  assert.ok(!isFull(STRIPPED));
  assert.ok(!isFull(new Set(["pad", "setsar"])), "fps is needed too");
  assert.deepEqual(missingPostFilters(FULL), []);
  assert.deepEqual(missingPostFilters(STRIPPED), [...POST_FILTERS]);
  assert.deepEqual(missingPostFilters(new Set(POST_FILTERS.filter((f) => f !== "rubberband"))), ["rubberband"]);
  assert.ok(POST_FILTERS.includes("rubberband") && POST_FILTERS.includes("lut3d") && POST_FILTERS.includes("eq"));
});

test("where the installer's ffmpeg is looked for", () => {
  const j = (...p) => p.join("/");
  assert.deepEqual(bundledFfmpegPlaces({ platform: "win32", resourcesPath: "R", appRoot: "A" }, j), ["R/ffmpeg/ffmpeg.exe", "A/build/ffmpeg/ffmpeg.exe"]);
  assert.deepEqual(bundledFfmpegPlaces({ platform: "win32", appRoot: "A" }, j), ["A/build/ffmpeg/ffmpeg.exe"]);
  assert.deepEqual(bundledFfmpegPlaces({ platform: "linux", resourcesPath: "R", appRoot: "A" }, j), []);
});

test("the capability check reads `ffmpeg -filters` as ffmpeg 9 prints it", () => {
  // lines copied from gyan.dev 9.0.2 essentials and from Remotion's copy
  const listing = [
    "Filters:",
    "  T.. = Timeline support",
    "  .S. = Slice threading",
    "  A = Audio input/output",
    "  | = Source or sink filter",
    " .. acompressor       A->A       Audio compressor.",
    " T. deesser           A->A       Apply de-essing to the audio.",
    " TS equalizer         A->A       Apply two-pole peaking equalization (EQ) filter.",
    " .. rubberband        A->A       Apply time-stretching and pitch-shifting.",
    " .. asplit            A->N       Pass on the audio input to N audio outputs.",
    " T. eq                V->V       Adjust brightness, contrast, gamma, and saturation.",
    " TS lut3d             V->V       Adjust colors using a 3D LUT.",
    " .. anullsrc          |->A       Null audio source, return empty audio frames.",
    " ... amix              N->A       Audio mixing.",
    "",
  ].join("\r\n");
  const got = filtersFrom(listing);
  for (const f of ["acompressor", "deesser", "equalizer", "rubberband", "asplit", "eq", "lut3d", "anullsrc", "amix"]) assert.ok(got.has(f), f);
  // the legend lines are not filters
  for (const f of ["Timeline", "Slice", "A", "Filters"]) assert.ok(!got.has(f), f);
  assert.deepEqual(missingPostFilters(got), ["highpass", "chorus", "aecho"]);
  assert.equal(filtersFrom("").size, 0);
});

test("the fetched ffmpeg, when present, is full and has every post-production filter", (t) => {
  const exe = path.join(ROOT, "build", "ffmpeg", "ffmpeg.exe");
  if (process.platform !== "win32" || !fs.existsSync(exe)) return t.skip("no build/ffmpeg here (npm run ffmpeg fetches it)");
  const r = spawnSync(exe, ["-hide_banner", "-filters"], { encoding: "utf8", windowsHide: true, timeout: 30000 });
  assert.equal(r.status, 0);
  const c = filtersFrom(r.stdout);
  assert.ok(isFull(c));
  assert.deepEqual(missingPostFilters(c), []);
  assert.deepEqual(chooseFfmpeg([{ where: "bundled", bin: exe }, onPath, remotion], (b) => (b === exe ? c : new Set())), { where: "bundled", bin: exe, full: true });
});
