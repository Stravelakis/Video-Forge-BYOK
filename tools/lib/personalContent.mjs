// Where the owner's personal content lives and how it reaches the app folder.
// The doing (git, moving folders) is in scripts/personal-content.mjs; the
// deciding is here, so tools/lib/personalContent.test.mjs can check it against
// temp folders without git or the network.
//
// The private repo DnD-World/Video-Forge-personal mirrors the app folder:
// brands/, music/ and the Mixamo files sit at the same relative paths. It is
// cloned NEXT TO the app folder (../Video-Forge-personal), never inside it:
// electron-builder copies a link that points outside the app as real files, but
// keeps a link that points inside the app as a link, which the installed app
// could not follow.

import fs from "node:fs";
import path from "node:path";
import { PERSONAL_PATHS } from "./buildKind.mjs";

export const PERSONAL_REPO = "https://github.com/DnD-World/Video-Forge-personal.git";
/** Remote names this repo has had; a clone with any of them is ours. */
export const KNOWN_REMOTES = [/github\.com[/:]DnD-World\/Video-Forge-personal(\.git)?$/i, /github\.com[/:]DnD-World\/Video-Forge-brands(\.git)?$/i];

/** The personal items, folder or single file, at the same path in the repo and the app. */
export const ITEMS = PERSONAL_PATHS.filter((p) => p !== "brand.local.json").map((rel) => ({
  rel,
  kind: rel.endsWith(".json") ? "file" : "dir",
}));

export const isOurRemote = (url) => KNOWN_REMOTES.some((re) => re.test(String(url ?? "").trim()));

/** Default clone folder: beside the app folder. */
export function defaultCloneDir(appRoot) {
  return path.join(path.dirname(path.resolve(appRoot)), "Video-Forge-personal");
}

/**
 * The full path of an item under a root. Refuses anything that could land
 * outside the root: absolute paths, "..", empty parts, drive letters.
 */
export function itemPath(root, rel) {
  if (typeof rel !== "string" || !rel || path.isAbsolute(rel) || /^[a-z]:/i.test(rel) || rel.includes("\\")) {
    throw new Error(`not a plain relative path: ${rel}`);
  }
  const parts = rel.split("/");
  if (parts.some((p) => p === "" || p === "." || p === "..")) throw new Error(`not a plain relative path: ${rel}`);
  const full = path.resolve(root, ...parts);
  const base = path.resolve(root);
  if (full !== base && !full.startsWith(base + path.sep)) throw new Error(`${rel} would land outside ${base}`);
  return full;
}

/** Is the clone folder somewhere a link from the app can safely point to? */
export function checkCloneDir(appRoot, cloneDir) {
  const app = path.resolve(appRoot);
  const clone = path.resolve(cloneDir);
  if (clone === app || clone.startsWith(app + path.sep)) {
    return `the clone (${clone}) must sit outside the app folder, or the installer would keep broken links`;
  }
  if (app.startsWith(clone + path.sep)) return `the clone (${clone}) must not contain the app folder`;
  return null;
}

/** What is at a path: nothing, a link (junction/symlink, with its target), a folder or a file. */
export function whatIsAt(p) {
  let st;
  try {
    st = fs.lstatSync(p);
  } catch {
    return { type: "none" };
  }
  if (st.isSymbolicLink()) {
    let target = null;
    try {
      target = fs.readlinkSync(p);
    } catch {
      /* unreadable link */
    }
    return { type: "link", target: target && path.resolve(path.dirname(p), target) };
  }
  return { type: st.isDirectory() ? "dir" : "file" };
}

const same = (a, b) => {
  const n = (x) => path.resolve(x).replace(/[\\/]+$/, "").toLowerCase();
  return n(a) === n(b);
};

/**
 * What to do for one item. Never decides to delete: anything real that is in
 * the way is either already the same content (moved aside to a backup) or a
 * reason to stop.
 *
 * Returns { action, why } with action one of:
 *   "skip"          the repo has no such item
 *   "ok"            already linked to the clone, or the same file
 *   "link"          nothing there: make the link (copy mode, or a file: copy)
 *   "relink"        a link to somewhere else: replace the link (links hold no data)
 *   "migrate-clone" the old brands clone: check it is saved, move it aside, link
 *   "set-aside"     real content that is safe to move aside (a folder whose every
 *                   file is also in the clone, or a different copy of the file):
 *                   move it to "<name>.before-personal-<date>", then link/copy
 *   "refresh-copy"  copy mode, a folder already copied: copy the clone over it
 *   "stop"          real content that is not in the clone: leave it, tell the owner
 */
export function planItem(appRoot, cloneDir, item, { copy = false, oldClone = null } = {}) {
  const src = itemPath(cloneDir, item.rel);
  const dst = itemPath(appRoot, item.rel);
  if (!fs.existsSync(src)) return { action: "skip", why: "not in the personal repo" };
  const here = whatIsAt(dst);
  if (here.type === "none") return { action: "link", why: "not in the app yet" };
  if (here.type === "link") {
    if (here.target && same(here.target, src)) return { action: "ok", why: "already linked" };
    return { action: "relink", why: `linked to ${here.target ?? "an unreadable place"}` };
  }
  if (item.kind === "file") {
    if (here.type === "file" && filesMatch(dst, src)) return { action: "ok", why: "same file" };
    if (here.type === "file") return { action: "set-aside", why: "a different copy is in the app (kept aside)" };
    return { action: "stop", why: "a folder sits where a file belongs" };
  }
  if (here.type === "file") return { action: "stop", why: "a file sits where a folder belongs" };
  if (oldClone) return { action: "migrate-clone", why: "the old brands clone" };
  const extra = filesNotIn(dst, src);
  if (extra.length === 0) return { action: copy ? "refresh-copy" : "set-aside", why: "everything in it is also in the repo" };
  return { action: "stop", why: `${extra.length} file(s) only in the app copy, e.g. ${extra.slice(0, 3).join(", ")}` };
}

/** Same size and bytes. */
export function filesMatch(a, b) {
  try {
    const sa = fs.statSync(a);
    const sb = fs.statSync(b);
    if (sa.size !== sb.size) return false;
    return fs.readFileSync(a).equals(fs.readFileSync(b));
  } catch {
    return false;
  }
}

/** Files under `dir` (relative, forward slashes) that are missing from `other` or differ in size. */
export function filesNotIn(dir, other) {
  const out = [];
  const walk = (rel) => {
    const here = rel ? path.join(dir, rel) : dir;
    for (const e of fs.readdirSync(here, { withFileTypes: true })) {
      const r = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) walk(r);
      else {
        const there = path.join(other, ...r.split("/"));
        try {
          if (fs.statSync(there).size !== fs.statSync(path.join(dir, ...r.split("/"))).size) out.push(r);
        } catch {
          out.push(r);
        }
      }
    }
  };
  walk("");
  return out;
}

/** A free name beside `p` for setting it aside: "music.before-personal-2026-11-17", then "-2", "-3"… */
export function asideName(p, stamp) {
  let name = `${p}.before-personal-${stamp}`;
  for (let n = 2; fs.existsSync(name); n++) name = `${p}.before-personal-${stamp}-${n}`;
  return name;
}

/**
 * Lines of `git status --porcelain --ignored` → the entries that exist only on
 * this PC (untracked "??" and ignored "!!"), and whether any tracked file has
 * unsaved changes.
 */
export function parseStatus(text) {
  const localOnly = [];
  let changed = false;
  for (const line of String(text).split(/\r?\n/)) {
    if (!line.trim()) continue;
    const code = line.slice(0, 2);
    let rel = line.slice(3);
    if (rel.startsWith('"') && rel.endsWith('"')) rel = rel.slice(1, -1);
    if (code === "??" || code === "!!") localOnly.push(rel.replace(/\/$/, ""));
    else changed = true;
  }
  return { localOnly, changed };
}
