// The two versions of Video Forge, made from one codebase.
//
//   Personal = the app + the owner's own content (brand packs, music, the
//              Mixamo-derived moves and models). Only ever built on the owner's
//              PC, from the private repo DnD-World/Video-Forge-personal.
//   Public   = the app only. This is what GitHub Releases carry.
//
// scripts/build-exe.mjs turns package.json's electron-builder `build` block
// into the config for one kind with makeBuildConfig(), and for Public it checks
// the result twice: the config itself (checkPublicConfig) before anything is
// packaged, and the packaged folder (findPersonalFiles) after.
//
// Pure Node, no electron import, so tools/lib/buildKind.test.mjs can run it.

import fs from "node:fs";
import path from "node:path";

/** Everything personal, as paths relative to the app folder (forward slashes). */
export const PERSONAL_PATHS = [
  "brands",
  "music",
  "brand.local.json",
  "characters/samples/kenney/builder/motions.json",
  "characters/samples/kenney/builder/models",
];

export const BUILD_KINDS = ["personal", "public"];

/**
 * scripts/personal-content.mjs moves content that was in the way to
 * "<name>.before-personal-<date>" instead of deleting it. Those copies are
 * never shipped, in either build.
 */
export const SET_ASIDE = ["!**/*.before-personal-*", "!**/*.before-personal-*/**"];
export const isSetAside = (rel) => /(^|\/)[^/]+\.before-personal-[^/]*(\/|$)/.test(rel);

/** How each kind is named on disk and in Windows. */
export const KIND_NAMES = {
  public: {
    productName: "Video Forge",
    appId: "com.stravelakis.videoforge",
    shortcutName: "Video Forge",
    installer: "Video Forge Setup ${version}.${ext}",
    portable: "Video Forge ${version} portable.${ext}",
  },
  personal: {
    productName: "Video Forge Personal",
    // A different id, so the Personal and Public installs can sit side by side
    // and each has its own uninstaller. Saved data is shared either way: the app
    // pins its data folder itself (electron/main.ts), not from this id.
    appId: "com.stravelakis.videoforge.personal",
    shortcutName: "Video Forge Personal",
    installer: "Video Forge Personal Setup ${version}.${ext}",
    portable: "Video Forge Personal ${version} portable.${ext}",
  },
};

const norm = (p) => p.replace(/\\/g, "/").replace(/^\.\//, "");

/** The part of a files-pattern before any wildcard, without "!" (e.g. "!brands/*\/intros/**" → "brands/"). */
function fixedPrefix(pattern) {
  const p = norm(pattern.replace(/^!/, ""));
  const wild = p.search(/[*?[{]/);
  return wild === -1 ? p : p.slice(0, wild);
}

/**
 * Could this files-pattern take in this personal path? True when the pattern
 * names the path or something inside it, or when its fixed part is a parent
 * folder and the rest is a wildcard ("characters/samples/kenney/builder/**"
 * reaches builder/models).
 */
export function patternReaches(pattern, personal) {
  if (pattern.startsWith("!")) return false;
  const p = norm(pattern);
  const prefix = fixedPrefix(p);
  if (p === personal || prefix === personal || prefix.startsWith(personal + "/")) return true;
  const hasWild = prefix.length !== p.length;
  return hasWild && (prefix === "" || personal.startsWith(prefix.endsWith("/") ? prefix : prefix + "/"));
}

/** Could this files-pattern take in any personal path? */
export function patternReachesPersonal(pattern) {
  return PERSONAL_PATHS.some((personal) => patternReaches(pattern, personal));
}

/** Does this pattern name a personal path (or something inside one) directly? */
function namesPersonal(pattern) {
  const prefix = fixedPrefix(pattern).replace(/\/$/, "");
  return PERSONAL_PATHS.some((personal) => prefix === personal || prefix.startsWith(personal + "/"));
}

/** The "!" lines that keep every personal path out, folder and contents both. */
export function personalExclusions() {
  const out = [];
  for (const p of PERSONAL_PATHS) {
    out.push(`!${p}`);
    if (!p.endsWith(".json")) out.push(`!${p}/**`);
  }
  return out;
}

/**
 * electron-builder config for one kind, from package.json's `build` block.
 * The input is not changed.
 *
 * personal: as package.json says, plus "brands" and "music" on their own: when
 *   scripts/personal-content.mjs links those folders in (a Windows junction),
 *   electron-builder sees a link, not a folder, and "brands/**" alone would
 *   quietly leave it out.
 * public: every pattern naming personal content is dropped, and "!" lines for
 *   all of it go last, so nothing personal gets in even if it is on disk.
 */
export function makeBuildConfig(base, kind, version) {
  if (!BUILD_KINDS.includes(kind)) throw new Error(`unknown build kind "${kind}" (personal or public)`);
  const names = KIND_NAMES[kind];
  const cfg = structuredClone(base);
  let files = [...(cfg.files ?? [])];
  if (kind === "public") {
    files = files.filter((f) => !namesPersonal(f));
    files.push(...personalExclusions());
  } else {
    for (const top of ["brands", "music"]) if (!files.includes(top)) files.push(top);
  }
  for (const line of SET_ASIDE) if (!files.includes(line)) files.push(line);
  cfg.files = files;
  cfg.appId = names.appId;
  cfg.productName = names.productName;
  cfg.extraMetadata = { ...(cfg.extraMetadata ?? {}), videoForgeBuild: kind, ...(version ? { version } : {}) };
  cfg.nsis = { ...(cfg.nsis ?? {}), shortcutName: names.shortcutName, artifactName: names.installer };
  cfg.portable = { ...(cfg.portable ?? {}), artifactName: names.portable };
  return cfg;
}

/**
 * Problems with a Public config, in plain words. Empty = safe to package.
 * Every personal path must be shut out by a "!" line that comes after every
 * pattern that could take it in.
 */
export function checkPublicConfig(cfg) {
  const problems = [];
  if (cfg.extraMetadata?.videoForgeBuild !== "public") problems.push("the build is not marked public");
  const files = cfg.files ?? [];
  for (const personal of PERSONAL_PATHS) {
    const needed = personal.endsWith(".json") ? [`!${personal}`] : [`!${personal}`, `!${personal}/**`];
    const at = needed.map((n) => files.lastIndexOf(n));
    if (at.some((i) => i === -1)) {
      problems.push(`${personal} is not shut out`);
      continue;
    }
    // electron-builder reads the list in order: a pattern after the "!" line
    // would let the content back in.
    const lastIn = files.reduce((last, f, i) => (patternReaches(f, personal) ? i : last), -1);
    if (lastIn > Math.min(...at)) problems.push(`${personal} is let back in by "${files[lastIn]}"`);
  }
  for (const f of files) if (!f.startsWith("!") && namesPersonal(f)) problems.push(`"${f}" asks for personal content`);
  for (const line of SET_ASIDE) if (!files.includes(line)) problems.push(`set-aside copies ("${line}") are not shut out`);
  for (const extra of [...(cfg.extraFiles ?? []), ...(cfg.extraResources ?? [])]) {
    const from = typeof extra === "string" ? extra : extra.from ?? "";
    if (namesPersonal(from) || patternReachesPersonal(from)) problems.push(`extra files bring in ${from}`);
  }
  return problems;
}

/**
 * Personal files inside a packaged app folder (release/win-unpacked/resources/app).
 * Relative paths, forward slashes. Empty = clean.
 */
export function findPersonalFiles(appDir, { setAside = false } = {}) {
  const found = [];
  for (const personal of PERSONAL_PATHS) {
    const p = path.join(appDir, ...personal.split("/"));
    if (fs.existsSync(p)) found.push(personal);
  }
  if (setAside && fs.existsSync(appDir)) {
    const walk = (rel) => {
      for (const e of fs.readdirSync(path.join(appDir, ...rel.split("/").filter(Boolean)), { withFileTypes: true })) {
        const r = rel ? `${rel}/${e.name}` : e.name;
        if (isSetAside(r)) found.push(r);
        else if (e.isDirectory() && e.name !== "node_modules") walk(r);
      }
    };
    walk("");
  }
  return found;
}

/** Which kind to build: "public" when asked for, otherwise personal if the content is there. */
export function chooseKind(argv, appRoot) {
  if (argv.includes("--public")) return "public";
  if (argv.includes("--personal")) return "personal";
  return findPersonalFiles(appRoot).length ? "personal" : "public";
}
