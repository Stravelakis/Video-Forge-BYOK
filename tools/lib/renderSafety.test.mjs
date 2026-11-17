// Run: npm test   (needs Node 22.18+, which strips the TypeScript types itself)
// A hostile project file against the render (review 16 Nov 2026, X1 and X2).
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { PathGuard } from "../../electron/security/pathGuard.ts";
import { renderJobPaths, assertRenderJobPaths, cleanRenderNumbers } from "../../electron/render/jobSafety.ts";
import { writePage } from "../../electron/render/hyperframes/hfPage.ts";

const read = (p) => fs.readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");

function world() {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), "vf-render-"));
  const own = path.join(base, "userData");
  const secret = path.join(base, "secrets");
  for (const d of [own, secret]) fs.mkdirSync(d, { recursive: true });
  const guard = new PathGuard({ ownRoots: () => [own], readOnlyRoots: () => [], grantsFile: path.join(own, "grants.json") });
  return { own, secret, guard };
}

const job = (file) => ({
  musicWaveform: { style: "wave" }, musicColor: "#fff", width: 1080, height: 1920, fps: 30, durationSec: 5,
  subtitles: {}, speakers: [{ id: "a", label: "A", sheetPath: file("sheet.png"), puppetPath: file("p.json") }],
  audioFilePath: file("n.wav"), musicFilePath: file("m.mp3"), introPath: file("i.mp4"), outroPath: file("o.mp4"),
  logo: { filePath: file("logo.png"), position: "top-left", size: 0.2, opacity: 1, margin: 0.02 },
  bannerVideo: { filePath: file("b.mp4"), cropTop: 0, cropBottom: 0 },
  sfx: [{ filePath: file("s.wav"), atMs: 0, volume: 1 }],
  backgrounds: [{ startMs: 0, endMs: 1000, filePath: file("bg.mp4") }],
});

test("every file a render job names is on the list the guard checks", () => {
  const listed = renderJobPaths(job((n) => `X/${n}`)).map((x) => x.path).sort();
  assert.deepEqual(listed, ["X/b.mp4", "X/bg.mp4", "X/i.mp4", "X/logo.png", "X/m.mp3", "X/n.wav", "X/o.mp4", "X/p.json", "X/s.wav", "X/sheet.png"]);
});

test("a render job pointing at a file outside the allowed folders is refused, whichever field it hides in", () => {
  const w = world();
  const assertRead = (p) => w.guard.assertRead(p);
  const ok = job((n) => path.join(w.own, n));
  assert.doesNotThrow(() => assertRenderJobPaths(ok, assertRead));
  const evil = path.join(w.secret, "keys.txt");
  for (const field of ["audioFilePath", "musicFilePath", "introPath", "outroPath"]) {
    assert.throws(() => assertRenderJobPaths({ ...ok, [field]: evil }, assertRead), /only opens files you picked/, field);
  }
  assert.throws(() => assertRenderJobPaths({ ...ok, logo: { ...ok.logo, filePath: evil } }, assertRead));
  assert.throws(() => assertRenderJobPaths({ ...ok, sfx: [{ filePath: evil, atMs: 0, volume: 1 }] }, assertRead));
  assert.throws(() => assertRenderJobPaths({ ...ok, backgrounds: [{ startMs: 0, endMs: 1, filePath: evil }] }, assertRead));
  assert.throws(() => assertRenderJobPaths({ ...ok, speakers: [{ id: "a", label: "A", puppetPath: evil }] }, assertRead));
  assert.throws(() => assertRenderJobPaths({ ...ok, speakers: [{ id: "a", label: "A", sheetPath: evil }] }, assertRead));
  assert.throws(() => assertRenderJobPaths({ ...ok, bannerVideo: { filePath: evil, cropTop: 0, cropBottom: 0 } }, assertRead));
  assert.throws(() => assertRenderJobPaths({ ...ok, audioFilePath: { not: "a path" } }, assertRead), "not a string");
});

test("render:start checks the job's files before the render starts, and passes the guard on for puppet art", () => {
  const main = read("electron/main.ts");
  const at = main.indexOf('ipcMain.handle("render:start"');
  const handler = main.slice(at, main.indexOf("ipcMain.handle(", at + 10));
  const check = handler.indexOf("assertRenderJobPaths(job, (p) => guard().assertRead(p))");
  assert.ok(check > 0, "the check is there");
  assert.ok(check < handler.indexOf("renderVideo(job"), "and comes before the render");
  assert.match(handler, /canRead: \(p\) => guard\(\)\.canRead\(p\)/);
  assert.match(read("electron/render/renderVideo.ts"), /ctx\.canRead && !ctx\.canRead\(abs\)/);
});

test("numbers from a project file are made real numbers before the render uses them", () => {
  const bad = '1"><script>alert(1)</script>';
  const j = cleanRenderNumbers({ ...job((n) => n), fps: bad, width: bad, height: "1920", logo: { filePath: "l.png", position: '"><script>', size: bad, opacity: bad, margin: bad }, sfx: [{ filePath: "s", atMs: bad, volume: "1,amovie=secret" }] });
  assert.equal(j.fps, 30);
  assert.equal(j.width, 1080);
  assert.equal(j.height, 1920);
  assert.equal(j.logo.opacity, 1);
  assert.equal(j.logo.position, "top-right");
  assert.equal(j.sfx[0].volume, 1);
  assert.equal(j.sfx[0].atMs, 0);
  assert.match(read("electron/render/renderVideo.ts"), /const job = cleanRenderNumbers\(rawJob\)/);
});

test("the render page cannot be given script through a project value", () => {
  const bad = '1"></div><script>alert(1)</script>';
  const props = {
    width: bad, height: bad, fps: bad, durationSec: 5, backgroundBlur: bad,
    backgroundBand: { top: bad, bottom: bad },
    introOverlay: { fileName: '"><script>alert(2)</script>', durationMs: bad },
    bannerVideo: { fileName: "b.mp4", cropTop: bad, cropBottom: bad },
    logo: { fileName: "logo.png", position: '"><script>alert(3)</script>', size: bad, opacity: bad, margin: bad },
    narrationSegments: [{ text: "</script><script>alert(4)</script>" }],
  };
  const html = writePage(props, { bg: { file: "bg-track.mp4", startSec: 0, durSec: 5 }, banner: "banner-loop.mp4", mix: "mix.wav", totalSec: 5, lookCss: "sepia(1)</style><script>alert(5)</script>" });
  assert.ok(!/alert\(\d\)<\/script>/.test(html), "no injected script survives");
  assert.equal((html.match(/<script/g) ?? []).length, 3, "only the page's own three scripts");
  assert.match(html, /data-fps="30"/);
  assert.match(html, /opacity:1;/);
});

test("the render's ffmpeg mix takes only a real number for an effect's volume", () => {
  assert.match(read("electron/render/hyperframes/renderHyperframes.ts"), /volume=\$\{num\(s\.volume, 1\)\}/);
});
