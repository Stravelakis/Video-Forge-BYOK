#!/usr/bin/env node
/**
 * One-command Windows packaging — the same shape as Image Forge's.
 *
 *   npm run build-exe          Personal build when the owner's content is here
 *                              (brands/, music/, the Mixamo files), otherwise Public
 *   npm run build-exe:public   Public build: the app only, never personal content
 *   npm run build-exe:check    no packaging: say which kind would be built and
 *                              list, with electron-builder's own file rules,
 *                              anything personal that would go in
 *
 * Two versions, one codebase (tools/lib/buildKind.mjs):
 *   Personal → release/"Video Forge Personal Setup x.y.z.exe" + portable
 *   Public   → release/"Video Forge Setup x.y.z.exe" + portable
 *
 * Steps:
 * 1. builds the app                                  → out/
 * 2. packs it into a folder                          → release/win-unpacked/
 * 3. Public only: checks that folder holds nothing personal, and stops if it does
 * 4. makes the installer and the portable exe from that same folder
 *
 * WHY THE APP IS NOT PACKED INTO AN ASAR ARCHIVE, which is electron-builder's
 * default and makes the install smaller. Rendering works by handing
 * remotion/index.ts to webpack at render time, and webpack reads real files
 * from a real folder: the composition's sources, the src/ files it imports and
 * node_modules. Inside an archive those paths do not exist and every render
 * would fail on its first step. A larger install that renders beats a smaller
 * one that cannot.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import {
  PERSONAL_PATHS,
  checkPublicConfig,
  chooseKind,
  isSetAside,
  findPersonalFiles,
  makeBuildConfig,
} from "../tools/lib/buildKind.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);

const step = (msg) => console.log(`\n▸ ${msg}`);
const ok = (msg) => console.log(`✓ ${msg}`);
const fail = (msg) => {
  console.error(`✗ ${msg}`);
  process.exit(1);
};

// shell:true parses the command through cmd, so a path containing a space
// ("C:\...\CLAUDE SPACE\...") has to be quoted or it splits in two.
const quoted = (p) => (/\s/.test(p) ? `"${p}"` : p);
const bin = (name) =>
  path.join(ROOT, "node_modules", ".bin", process.platform === "win32" ? `${name}.cmd` : name);

function run(name, args, what) {
  const exe = bin(name);
  if (!fs.existsSync(exe)) fail(`${name} is not installed — run "npm install" once, then try again`);
  const r = spawnSync(quoted(exe), args.map(quoted), { cwd: ROOT, stdio: "inherit", shell: true });
  if (r.status !== 0) fail(`${what} failed — scroll up for the real error`);
}

/**
 * The files electron-builder would take from the app folder, using its own
 * pattern rules (app-builder-lib's FileMatcher). node_modules is left out: the
 * builder copies it separately and it holds no personal content. Folder links
 * (junctions) are followed the way the builder follows them.
 */
function filesTheBuilderWouldTake(cfg) {
  const require = createRequire(path.join(ROOT, "package.json"));
  const { FileMatcher } = require("app-builder-lib/out/fileMatcher");
  const matcher = new FileMatcher(ROOT, ROOT, (s) => s, cfg.files);
  const filter = matcher.createFilter();
  const taken = [];
  const walk = (dir) => {
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      if (dir === ROOT && (name === "node_modules" || name === ".git")) continue;
      let st = fs.lstatSync(full);
      if (!filter(full, st)) continue;
      if (st.isSymbolicLink()) {
        try {
          st = fs.statSync(full);
        } catch {
          continue;
        }
      }
      if (st.isDirectory()) walk(full);
      else taken.push(path.relative(ROOT, full).replace(/\\/g, "/"));
    }
  };
  walk(ROOT);
  return taken;
}

const isPersonal = (rel) => isSetAside(rel) || PERSONAL_PATHS.some((p) => rel === p || rel.startsWith(p + "/"));

// ── which kind ────────────────────────────────────────────────────────────
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
const kind = chooseKind(argv, ROOT);
const cfg = makeBuildConfig(pkg.build, kind, pkg.version);
// VF_OUTPUT: build somewhere else than release/. The release workflow builds
// outside the checkout: Windows Defender locks the freshly unpacked
// electron.exe inside a scanned folder and the packing step fails (EPERM).
if (process.env.VF_OUTPUT) cfg.directories = { ...(cfg.directories ?? {}), output: path.resolve(process.env.VF_OUTPUT) };
console.log(`Building: ${cfg.productName} ${pkg.version} (${kind})`);
if (kind === "personal" && !argv.includes("--personal")) {
  console.log(`  personal content found here: ${findPersonalFiles(ROOT).join(", ")}`);
  console.log("  (npm run build-exe:public makes the version without it)");
}

if (kind === "public") {
  const problems = checkPublicConfig(cfg);
  if (problems.length) fail(`the Public build settings would let personal content in:\n  - ${problems.join("\n  - ")}`);
  ok("Public build settings shut out all personal content");
}

if (argv.includes("--check")) {
  step("checking which files the installer would take (nothing is built)");
  const taken = filesTheBuilderWouldTake(cfg);
  const personal = taken.filter(isPersonal);
  console.log(`  ${taken.length} files from the app folder (plus node_modules)`);
  if (kind === "public" && personal.length) fail(`personal files would go in:\n  ${personal.slice(0, 20).join("\n  ")}`);
  if (kind === "public") ok("no personal files would go in");
  else console.log(`  ${personal.length} of them are personal content`);
  process.exit(0);
}

// electron-builder reads this file instead of package.json's build block.
const cfgFile = path.join(os.tmpdir(), `video-forge-${kind}-builder.json`);
fs.writeFileSync(cfgFile, JSON.stringify(cfg, null, 2));

step("building the app");
run("electron-vite", ["build"], "the build");
ok("built into out/");

if (!fs.existsSync(path.join(ROOT, "build", "icon.png"))) {
  console.log("  (no build/icon.png — the installer will use Electron's default icon)");
}

const outDir = path.resolve(ROOT, cfg.directories?.output ?? "release");
const unpacked = path.join(outDir, "win-unpacked");
// A folder left by the other kind would be packed straight into this one.
if (fs.existsSync(unpacked)) fs.rmSync(unpacked, { recursive: true, force: true });

step("packing the app folder (the first run downloads ~150 MB)");
run("electron-builder", ["--config", cfgFile, "--win", "dir", "--x64", "--publish", "never"], "packing");
const appDir = path.join(unpacked, "resources", "app");

if (kind === "public") {
  const found = findPersonalFiles(appDir, { setAside: true });
  if (found.length) {
    fail(`STOPPED: personal content got into the Public build (${found.join(", ")}). No installer was made. Delete ${unpacked} before trying again.`);
  }
  ok("the packed app holds no personal content");
}

step("making the installer and the portable exe");
run(
  "electron-builder",
  ["--config", cfgFile, "--prepackaged", unpacked, "--win", "nsis", "portable", "--x64", "--publish", "never"],
  "packaging",
);
ok(`done — look in ${path.relative(ROOT, outDir) || outDir} for "${cfg.productName}"`);
