// Run: npm test   (needs Node 22.18+, which strips the TypeScript types itself)
// Post-production (17 Nov 2026): the filter-graph builders, the panning maths,
// the settings on save/open, and one small real check that every voice preset's
// graph is accepted by ffmpeg (a 3-second generated tone, no video).
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import {
  filtersFrom, speakerWindows, windowExpr, voiceChain, studioChain, loudnormFilter, parseLoudnorm,
  speechGraph, speechInputs, gradeFilter, END,
} from "../../electron/post/postGraph.ts";
import {
  panGains, MAX_PAN, defaultPost, postOff, cleanPost, cleanVoiceCharacter, voiceParams, voiceIsFlat,
  VOICE_PRESETS, postJobFor, cleanPostJob, gradeIsActive, speechIsActive,
} from "../../src/lib/post/postSettings.ts";
import { projectToDoc, docToProject } from "../../src/lib/project/projectFile.ts";
import { renderJobPaths, cleanRenderNumbers } from "../../electron/render/jobSafety.ts";

const FULL = new Set(["rubberband", "asetrate", "atempo", "aresample", "highpass", "lowpass", "lowshelf", "highshelf", "equalizer",
  "chorus", "aecho", "acompressor", "deesser", "loudnorm", "pan", "amix", "asplit", "volume", "aformat", "apad", "atrim", "anull",
  "asetnsamples", "asetpts", "lut3d", "eq", "format"]);
// what Remotion's cut-down ffmpeg has (measured 17 Nov 2026)
const STRIPPED = new Set(["adelay", "aformat", "amix", "anull", "apad", "aresample", "asetrate", "atempo", "atrim", "loudnorm", "pan", "volume", "asetpts", "format"]);

const two = [
  { speakerId: "a", startMs: 0, endMs: 1000 },
  { speakerId: "b", startMs: 1400, endMs: 2000 },
  { speakerId: "a", startMs: 2200, endMs: 2900 },
];

// ---- settings ---------------------------------------------------------------

test("new projects: studio sound on, the rest off; older projects: all off", () => {
  assert.equal(defaultPost().studioSound, true);
  assert.equal(defaultPost().stereo.on, false);
  assert.equal(defaultPost().grade.on, false);
  assert.equal(postOff().studioSound, false);
  assert.deepEqual(cleanPost(undefined), postOff());
  assert.deepEqual(cleanPost("nonsense"), postOff());
});

test("cleanPost clamps and drops odd values", () => {
  const p = cleanPost({ studioSound: "yes", stereo: { on: true, amount: 9 }, grade: { on: true, lutPath: 42, contrast: "1.2", saturation: -3 } });
  assert.equal(p.studioSound, false);
  assert.deepEqual(p.stereo, { on: true, amount: 1 });
  assert.deepEqual(p.grade, { on: true, lutPath: null, contrast: 1, saturation: 0 });
});

test("voice characters: unknown preset is natural, sliders clamped and added on top", () => {
  assert.equal(cleanVoiceCharacter({ preset: "villain" }).preset, "natural");
  assert.equal(cleanVoiceCharacter({ preset: "chibi", pitch: 40 }).pitch, 4);
  assert.ok(voiceIsFlat(null));
  assert.ok(voiceIsFlat({ preset: "natural", pitch: 0, brightness: 0, sparkle: 0 }));
  assert.ok(!voiceIsFlat({ preset: "natural", pitch: 1, brightness: 0, sparkle: 0 }));
  const p = voiceParams({ preset: "warm", pitch: 1, brightness: 0.5, sparkle: 1 });
  assert.equal(p.pitch, 0); // −1 + 1
  assert.equal(p.bright, 1); // −1 + 0.5 × 4
  assert.equal(p.air, 4); // −1 + 1 × 5
  assert.equal(p.formant, -0.5); // the Pitch slider leaves the throat alone
  const ids = VOICE_PRESETS.map((x) => x.id);
  for (const id of ["natural", "chibi", "bright", "warm", "deep", "radio"]) assert.ok(ids.includes(id), id);
  for (const x of VOICE_PRESETS) assert.ok(x.help.length > 20, `${x.id} has hover help`);
});

// ---- panning ----------------------------------------------------------------

test("panGains: centre is untouched, the far side drops by at most 30%", () => {
  assert.deepEqual(panGains(0.5, 1), { left: 1, right: 1 });
  assert.deepEqual(panGains(0, 1), { left: 1, right: 1 - MAX_PAN });
  assert.deepEqual(panGains(1, 1), { left: 1 - MAX_PAN, right: 1 });
  assert.deepEqual(panGains(0.75, 1), { left: 0.85, right: 1 });
  assert.deepEqual(panGains(0.25, 0.5), { left: 1, right: 0.925 });
  assert.deepEqual(panGains(-5, 1), { left: 1, right: 0.7 }); // off the frame = the edge
  assert.deepEqual(panGains(0, 0), { left: 1, right: 1 });
  assert.deepEqual(panGains(NaN, 1), { left: 1, right: 1 });
  for (let x = 0; x <= 1; x += 0.05) {
    const g = panGains(x, 1);
    assert.ok(g.left <= 1 && g.right <= 1, "never louder");
    assert.ok(g.left >= 0.7 && g.right >= 0.7, "never more than 30%");
  }
});

// ---- who speaks when --------------------------------------------------------

test("speakerWindows shares out the whole timeline, cutting mid-pause", () => {
  const w = speakerWindows(two);
  assert.deepEqual(w.get("a"), [[0, 1.2], [2.1, END]]);
  assert.deepEqual(w.get("b"), [[1.2, 2.1]]);
});

test("speakerWindows: the same speaker twice in a row is one stretch; overlaps cut at the next start", () => {
  const w = speakerWindows([
    { speakerId: "a", startMs: 0, endMs: 500 },
    { speakerId: "a", startMs: 700, endMs: 900 },
    { speakerId: "b", startMs: 850, endMs: 1500 },
  ]);
  assert.deepEqual(w.get("a"), [[0, 0.85]]);
  assert.deepEqual(w.get("b"), [[0.85, END]]);
  assert.equal(speakerWindows([]).size, 0);
  assert.equal(speakerWindows([{ speakerId: 3, startMs: 0, endMs: 1 }]).size, 0);
});

test("windowExpr", () => {
  assert.equal(windowExpr([[0, 1.2], [2.1, 3]]), "between(t,0,1.2)+between(t,2.1,3)");
});

// ---- builders ---------------------------------------------------------------

test("voiceChain: rubberband moves the throat separately from the note", () => {
  const chibi = voiceChain(voiceParams({ preset: "chibi", pitch: 0, brightness: 0, sparkle: 0 }), FULL);
  assert.equal(chibi.filters[0], "rubberband=pitch=1.26:formant=shifted"); // 4 steps, both together
  assert.ok(chibi.filters.some((f) => f.startsWith("chorus=")));
  const deep = voiceChain(voiceParams({ preset: "deep", pitch: 0, brightness: 0, sparkle: 0 }), FULL);
  assert.equal(deep.filters[0], "rubberband=pitch=0.891:formant=shifted"); // throat −2
  assert.equal(deep.filters[1], "rubberband=pitch=0.944:formant=preserved"); // note a further −1
  assert.ok(deep.filters.some((f) => f.startsWith("aecho=")));
  const radio = voiceChain(voiceParams({ preset: "radio", pitch: 0, brightness: 0, sparkle: 0 }), FULL);
  assert.deepEqual(radio.filters.slice(0, 2), ["highpass=f=300:poles=2", "lowpass=f=3400:poles=2"]);
  const slider = voiceChain(voiceParams({ preset: "natural", pitch: 2, brightness: 0, sparkle: 0 }), FULL);
  assert.deepEqual(slider.filters, ["rubberband=pitch=1.122:formant=preserved"]);
  assert.deepEqual(voiceChain(voiceParams(null), FULL), { filters: [], missing: [] });
});

test("voiceChain without rubberband falls back to asetrate + atempo and reports what is missing", () => {
  const b = voiceChain(voiceParams({ preset: "chibi", pitch: 0, brightness: 0, sparkle: 0 }), STRIPPED);
  assert.deepEqual(b.filters, ["asetrate=60476", "aresample=48000", "atempo=0.794"]);
  assert.ok(b.missing.includes("chorus") && b.missing.includes("equalizer"));
  const deep = voiceChain(voiceParams({ preset: "deep", pitch: 0, brightness: 0, sparkle: 0 }), STRIPPED);
  assert.ok(deep.missing.includes("rubberband"), "a throat change different from the note needs rubberband");
});

test("studio sound: gentle chain, two-pass loudness to −14 LUFS / −1 dBTP", () => {
  assert.deepEqual(studioChain(FULL).filters.map((f) => f.split("=")[0]), ["highpass", "acompressor", "deesser"]);
  assert.deepEqual(studioChain(STRIPPED).missing, ["highpass", "acompressor", "deesser"]);
  assert.equal(loudnormFilter(null, true), "loudnorm=I=-14:TP=-1:LRA=11:print_format=json");
  assert.equal(loudnormFilter(null), "loudnorm=I=-14:TP=-1:LRA=11");
  const m = { input_i: "-23.10", input_tp: "-4.20", input_lra: "3.10", input_thresh: "-33.40", target_offset: "0.30" };
  assert.match(loudnormFilter(m), /measured_I=-23\.10:measured_TP=-4\.20:.*offset=0\.30:linear=true/);
  assert.equal(loudnormFilter({ ...m, input_i: "-inf" }), "loudnorm=I=-14:TP=-1:LRA=11");
  const stderr = `[Parsed_loudnorm_3 @ 0x1]\n{\n\t"input_i" : "-23.10",\n\t"input_tp" : "-4.20",\n\t"input_lra" : "3.10",\n\t"input_thresh" : "-33.40",\n\t"output_i" : "-14.0",\n\t"target_offset" : "0.30"\n}\n`;
  assert.deepEqual(parseLoudnorm(stderr), m);
  assert.equal(parseLoudnorm("nothing here"), null);
});

const job = (over = {}) => postJobFor({ ...defaultPost(), ...over }, [{ id: "a", x: 0.2 }, { id: "b", x: 0.8 }]);

test("speechGraph: studio sound only = no split, mono to stereo", () => {
  const g = speechGraph({ job: job(), segments: two, caps: FULL, mode: "apply", durationSec: 3 });
  assert.equal(g.branches.length, 0);
  assert.equal(g.inputs, 1);
  assert.match(g.graph, /highpass=f=80.*acompressor.*deesser.*loudnorm=I=-14:TP=-1:LRA=11.*asetpts=N\/SR\/TB,apad=whole_dur=3,atrim=end=3.*\[out\]$/s);
  assert.deepEqual(g.warnings, []);
});

test("speechGraph: two speakers left/right get their own branch and pan", () => {
  const g = speechGraph({ job: job({ stereo: { on: true, amount: 1 } }), segments: two, caps: FULL, mode: "apply" });
  assert.deepEqual(g.branches, ["a", "b"]);
  assert.equal(g.inputs, 2);
  assert.match(g.graph, /\[0:a\]aresample=48000,aformat=channel_layouts=mono,asetnsamples=n=480,volume=volume=0:enable='not\(between\(t,0,1\.2\)\+between\(t,2\.1,1000000\)\)'.*pan=stereo\|c0=1\*c0\|c1=0\.82\*c0\[b0\]/);
  assert.match(g.graph, /pan=stereo\|c0=0\.82\*c0\|c1=1\*c0\[b1\]/);
  assert.match(g.graph, /\[b0\]\[b1\]amix=inputs=2:normalize=0/);
});

test("speechGraph: left/right is off with one speaker", () => {
  const solo = [{ speakerId: "a", startMs: 0, endMs: 2000 }];
  const g = speechGraph({ job: job({ stereo: { on: true, amount: 1 } }), segments: solo, caps: FULL, mode: "apply" });
  assert.equal(g.branches.length, 0);
  assert.ok(!g.graph.includes("0.82"));
});

test("speechGraph: a voice character on one speaker; the rest share a plain branch", () => {
  const j = postJobFor(defaultPost(), [{ id: "a", x: 0.5, voiceCharacter: { preset: "radio" } }, { id: "b", x: 0.5 }]);
  const g = speechGraph({ job: j, segments: two, caps: FULL, mode: "measure" });
  assert.deepEqual(g.branches, ["a"]);
  assert.match(g.graph, /\[0:a\].*volume.*highpass=f=300/);
  assert.match(g.graph, /\[1:a\].*volume=volume=0:enable='not\(between\(t,1\.2,2\.1\)\)'/);
  assert.match(g.graph, /print_format=json\[out\]$/, "measure pass ends in the measurement");
});

test("speechGraph on the cut-down ffmpeg: still valid, says what was left out", () => {
  const g = speechGraph({ job: job(), segments: two, caps: STRIPPED, mode: "apply" });
  assert.ok(!g.graph.includes("acompressor"));
  assert.match(g.graph, /loudnorm/);
  assert.equal(g.warnings.length, 1);
  assert.match(g.warnings[0], /acompressor, deesser, highpass/);
});

test("gradeFilter: LUT then contrast/saturation; off or neutral = nothing", () => {
  const on = { on: true, lutPath: "C:/x.cube", contrast: 1.2, saturation: 0.8 };
  assert.equal(gradeFilter(on, FULL, "grade.cube").filter, "lut3d=file=grade.cube:interp=tetrahedral,eq=contrast=1.2:saturation=0.8,format=yuv420p");
  assert.equal(gradeFilter({ ...on, on: false }, FULL, "grade.cube").filter, null);
  assert.equal(gradeFilter({ on: true, lutPath: null, contrast: 1, saturation: 1 }, FULL, null).filter, null);
  assert.throws(() => gradeFilter(on, FULL, "C:\\evil:path.cube"));
  const s = gradeFilter(on, STRIPPED, "grade.cube");
  assert.equal(s.filter, null);
  assert.equal(s.warnings.length, 2);
  assert.ok(gradeIsActive(on));
  assert.ok(!gradeIsActive({ on: true, lutPath: null, contrast: 1, saturation: 1 }));
});

test("speechIsActive", () => {
  assert.ok(speechIsActive(job()));
  assert.ok(!speechIsActive(postJobFor(postOff(), [{ id: "a", x: 0.5 }])));
  assert.ok(speechIsActive(postJobFor(postOff(), [{ id: "a", x: 0.5, voiceCharacter: { preset: "deep" } }])));
  assert.ok(!speechIsActive(null));
});

// ---- the render job and the project file -------------------------------------

test("render job: the LUT goes through the path guard; post numbers are cleaned", () => {
  const rj = { width: 1080, height: 1920, fps: 30, durationSec: 5, speakers: [], subtitles: {},
    post: { studioSound: true, stereo: { on: true, amount: "2" }, grade: { on: true, lutPath: "C:/l.cube", contrast: 9, saturation: 1 }, voices: [{ speakerId: "a", x: "x", character: { preset: "deep", pitch: 99 } }, { nope: 1 }] } };
  assert.ok(renderJobPaths(rj).some((p) => p.what === "colour LUT" && p.path === "C:/l.cube"));
  const c = cleanRenderNumbers(rj).post;
  assert.equal(c.stereo.amount, 0.6);
  assert.equal(c.grade.contrast, 1.5);
  assert.deepEqual(c.voices, [{ speakerId: "a", x: 0.5, character: { preset: "deep", pitch: 4, brightness: 0, sparkle: 0 } }]);
  assert.equal(cleanRenderNumbers({ ...rj, post: undefined }).post, undefined);
  assert.equal(cleanPostJob(null), null);
});

test("project file: post is saved and opened; an older file opens with it all off", () => {
  const post = { studioSound: true, stereo: { on: true, amount: 0.4 }, grade: { on: true, lutPath: "C:/l.cube", contrast: 1.1, saturation: 0.9 } };
  const s = { render: {}, speakers: [{ id: "a", voiceCharacter: { preset: "chibi", pitch: 1, brightness: 0, sparkle: 0.5 } }], post, narration: null, music: null, attachedAudio: null };
  const opened = docToProject(JSON.parse(JSON.stringify(projectToDoc(s))));
  assert.deepEqual(opened.project.post, post);
  assert.deepEqual(opened.project.speakers[0].voiceCharacter, s.speakers[0].voiceCharacter);
  const old = docToProject({ kind: "byok-project", version: 2, project: { render: {}, speakers: [] } });
  assert.deepEqual(old.project.post, postOff());
});

// ---- one small real check: ffmpeg accepts every preset's graph ---------------

/** A 3-second, 24 kHz mono tone that glides, so pitch and EQ have something to act on. */
function toneWav(file) {
  const rate = 24000, n = rate * 3;
  const b = Buffer.alloc(44 + n * 2);
  b.write("RIFF", 0); b.writeUInt32LE(36 + n * 2, 4); b.write("WAVE", 8); b.write("fmt ", 12);
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(rate, 24);
  b.writeUInt32LE(rate * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write("data", 36); b.writeUInt32LE(n * 2, 40);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    ph += (2 * Math.PI * (180 + 120 * (i / n))) / rate;
    const v = 0.3 * Math.sin(ph) + 0.1 * Math.sin(3 * ph) + 0.05 * Math.sin(7 * ph);
    b.writeInt16LE(Math.round(v * 32767), 44 + i * 2);
  }
  fs.writeFileSync(file, b);
}

function binaries() {
  const out = [];
  const onPath = spawnSync("ffmpeg", ["-hide_banner", "-filters"], { encoding: "utf8", windowsHide: true });
  if (onPath.status === 0) out.push({ name: "ffmpeg on PATH", bin: "ffmpeg", caps: filtersFrom(onPath.stdout) });
  try {
    const pkg = createRequire(import.meta.url).resolve("@remotion/compositor-win32-x64-msvc/package.json");
    const bin = path.join(path.dirname(pkg), "ffmpeg.exe");
    const r = spawnSync(bin, ["-hide_banner", "-filters"], { encoding: "utf8", windowsHide: true });
    if (r.status === 0) out.push({ name: "Remotion's bundled ffmpeg", bin, caps: filtersFrom(r.stdout) });
  } catch { /* not on Windows */ }
  return out;
}

test("ffmpeg accepts every voice preset's graph (two speakers, left/right, studio sound, both passes)", (t) => {
  const bins = binaries();
  if (!bins.length) return t.skip("no ffmpeg on this machine");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "vf-post-"));
  try {
    toneWav(path.join(dir, "in.wav"));
    for (const { name, bin, caps } of bins) {
      for (const preset of VOICE_PRESETS) {
        const j = postJobFor({ ...defaultPost(), stereo: { on: true, amount: 1 } }, [
          { id: "a", x: 0.1, voiceCharacter: { preset: preset.id, pitch: 0, brightness: 0.3, sparkle: 0.4 } },
          { id: "b", x: 0.9 },
        ]);
        const m = speechGraph({ job: j, segments: two, caps, mode: "measure" });
        fs.writeFileSync(path.join(dir, "m.txt"), m.graph);
        const r1 = spawnSync(bin, ["-hide_banner", "-nostats", "-v", "info", ...speechInputs("in.wav", m), "-/filter_complex", "m.txt", "-map", "[out]", "-f", "null", "-"], { cwd: dir, encoding: "utf8", windowsHide: true });
        assert.equal(r1.status, 0, `${name} / ${preset.id} measure: ${r1.stderr.slice(-600)}`);
        const measured = parseLoudnorm(r1.stderr);
        assert.ok(measured, `${name} / ${preset.id}: loudness measured`);
        const a = speechGraph({ job: j, segments: two, caps, mode: "apply", measured, durationSec: 3 });
        fs.writeFileSync(path.join(dir, "a.txt"), a.graph);
        const r2 = spawnSync(bin, ["-y", "-hide_banner", "-v", "error", ...speechInputs("in.wav", a), "-/filter_complex", "a.txt", "-map", "[out]", "-c:a", "pcm_s16le", "out.wav"], { cwd: dir, encoding: "utf8", windowsHide: true });
        assert.equal(r2.status, 0, `${name} / ${preset.id} apply: ${r2.stderr.slice(-600)}`);
        const out = fs.readFileSync(path.join(dir, "out.wav"));
        assert.equal(out.readUInt16LE(22), 2, "stereo");
        assert.equal(out.readUInt32LE(24), 48000, "48 kHz");
        const secs = (out.length - 44) / (48000 * 4);
        assert.ok(Math.abs(secs - 3) < 0.05, `${name} / ${preset.id}: length kept (${secs.toFixed(3)} s)`);
      }
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
