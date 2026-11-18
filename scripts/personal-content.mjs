#!/usr/bin/env node
/**
 * Brings the owner's personal content into the app folder.
 *
 *   node scripts/personal-content.mjs            clone or update, then link
 *   node scripts/personal-content.mjs --dry-run  only say what it would do
 *   node scripts/personal-content.mjs --copy     copy the folders instead of linking
 *
 * Options: --app <folder> (default: this app folder), --clone <folder>
 * (default: ../Video-Forge-personal, beside the app folder).
 *
 * 1. Clones the private repo DnD-World/Video-Forge-personal beside the app
 *    folder, or updates it (fast-forward only; local changes are never
 *    overwritten).
 * 2. Links brands/, music/ and the Mixamo model set (models/animated) into the
 *    app with a Windows junction (a folder shortcut programs follow), and
 *    copies motions.json (a single file cannot be a junction). The other model
 *    sets (mini, pets, props) are Kenney CC0 and come with the public repo.
 *
 * Before 18 Nov 2026 the whole models/ folder was one link. That old link is
 * removed (a link holds no data), the public model sets come back from git,
 * and only models/animated is linked.
 *
 * Safe to run again and again: a link that is already right is left alone.
 * Nothing is ever deleted. Real content in the way is moved aside to
 * "<name>.before-personal-<date>" only when every file in it is also in the
 * repo; otherwise the script stops for that item and says why.
 *
 * The old layout, where brands/ was itself a clone of the brand-packs repo, is
 * handled: once its tracked files are confirmed saved on GitHub, the files that
 * only exist on this PC (ignored work folders and the like) move into the new
 * clone at the same place, and the old clone is set aside, not deleted.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ITEMS,
  PERSONAL_REPO,
  asideName,
  checkCloneDir,
  defaultCloneDir,
  isOurRemote,
  itemPath,
  parseStatus,
  planItem,
  whatIsAt,
} from "../tools/lib/personalContent.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const opt = (name) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
};
const APP = path.resolve(opt("--app") ?? ROOT);
const CLONE = path.resolve(opt("--clone") ?? defaultCloneDir(APP));
const DRY = argv.includes("--dry-run");
const COPY = argv.includes("--copy");
const stamp = new Date().toISOString().slice(0, 10);

const say = (m) => console.log(m);
const stop = (m) => {
  console.error(`✗ ${m}`);
  process.exit(1);
};

function git(cwd, args, { quiet = false } = {}) {
  const r = spawnSync("git", args, { cwd, encoding: "utf8", stdio: quiet ? "pipe" : ["ignore", "pipe", "pipe"] });
  return { ok: r.status === 0, out: (r.stdout ?? "").trim(), err: (r.stderr ?? "").trim() };
}

const isClone = (dir) => fs.existsSync(path.join(dir, ".git"));
const remoteOf = (dir) => git(dir, ["remote", "get-url", "origin"]).out;

function removeLink(p) {
  try {
    fs.unlinkSync(p);
  } catch {
    fs.rmdirSync(p); // a junction on older Windows Node; never recursive
  }
}

function makeLink(src, dst, kind) {
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  if (kind === "file" || COPY) {
    fs.cpSync(src, dst, { recursive: true, force: true });
  } else {
    fs.symlinkSync(src, dst, process.platform === "win32" ? "junction" : "dir");
  }
}

function moveAside(p) {
  const to = asideName(p, stamp);
  fs.renameSync(p, to);
  return to;
}

// ── 0. where things go ────────────────────────────────────────────────────
if (!fs.existsSync(path.join(APP, "package.json"))) stop(`${APP} is not the Video Forge app folder`);
const badClone = checkCloneDir(APP, CLONE);
if (badClone) stop(badClone);
say(`App folder:    ${APP}`);
say(`Personal repo: ${CLONE}${DRY ? "   (dry run: nothing changes)" : ""}`);

// ── 1. the old layout: brands/ is a clone of the brand-packs repo ─────────
const brandsDir = itemPath(APP, "brands");
const oldClone = whatIsAt(brandsDir).type === "dir" && isClone(brandsDir) && isOurRemote(remoteOf(brandsDir));
let oldLocalOnly = [];
if (oldClone) {
  say("\n▸ brands/ is the old brand-packs clone; checking it is all saved on GitHub");
  const status = parseStatus(git(brandsDir, ["status", "--porcelain=v1", "--ignored", "--untracked-files=normal"]).out);
  if (status.changed) stop("brands/ has changes that are not committed. Commit and push them first, then run this again.");
  const fetched = git(brandsDir, ["fetch", "origin"]);
  if (!fetched.ok) stop(`could not reach GitHub to check brands/ is saved: ${fetched.err.split("\n")[0]}`);
  const ahead = git(brandsDir, ["rev-list", "--count", "@{u}..HEAD"]);
  if (!ahead.ok || ahead.out !== "0") stop("brands/ has commits that are not on GitHub. Push them first, then run this again.");
  oldLocalOnly = status.localOnly;
  say(`  ✓ saved. ${oldLocalOnly.length} folder(s)/file(s) exist only on this PC and will move into the new clone.`);
}

// ── 2. clone or update the personal repo ──────────────────────────────────
say("\n▸ personal repo");
if (!fs.existsSync(CLONE)) {
  say(`  cloning ${PERSONAL_REPO}`);
  if (!DRY) {
    const r = spawnSync("git", ["clone", PERSONAL_REPO, CLONE], { stdio: "inherit" });
    if (r.status !== 0) stop("the clone failed (is this PC signed in to GitHub with access to the private repo?)");
  }
} else {
  if (!isClone(CLONE)) stop(`${CLONE} exists but is not a git clone. Move it away or pass --clone <folder>.`);
  const url = remoteOf(CLONE);
  if (!isOurRemote(url)) stop(`${CLONE} is a clone of something else. Pass --clone <folder>.`);
  if (!/Video-Forge-personal/i.test(url) && !DRY) git(CLONE, ["remote", "set-url", "origin", PERSONAL_REPO]);
  const st = parseStatus(git(CLONE, ["status", "--porcelain=v1"]).out);
  if (st.changed) say("  ! it has uncommitted changes, so it is not updated this time (nothing overwritten)");
  else if (!DRY) {
    const r = git(CLONE, ["pull", "--ff-only"]);
    say(r.ok ? `  ✓ up to date${r.out.includes("Already") ? "" : " (updated)"}` : `  ! could not update (${r.err.split("\n")[0]}); using what is there`);
  }
}

// ── 3. carry the old clone's local-only files over, then set it aside ────
if (oldClone) {
  say("\n▸ moving brands/ local-only files into the new clone");
  const intoBrands = path.join(CLONE, "brands");
  const kept = [];
  // every path is checked before the first one moves
  const moves = oldLocalOnly.map((rel) => ({ rel, from: itemPath(brandsDir, rel), to: itemPath(intoBrands, rel) }));
  for (const { rel, from, to } of moves) {
    if (fs.existsSync(to)) {
      kept.push(rel);
      continue;
    }
    say(`  ${rel}`);
    if (!DRY) {
      fs.mkdirSync(path.dirname(to), { recursive: true });
      fs.renameSync(from, to);
    }
  }
  if (DRY) say(`  then brands/ → ${path.basename(asideName(brandsDir, stamp))}`);
  else say(`  ✓ old clone set aside as ${path.basename(moveAside(brandsDir))}`);
  if (kept.length) say(`  ! left in the set-aside copy (the new clone already has them): ${kept.join(", ")}`);
}

// ── 4. link each item ─────────────────────────────────────────────────────
say(`\n▸ ${COPY ? "copying" : "linking"} into the app`);
let stopped = 0;
for (const item of ITEMS) {
  if (DRY && !fs.existsSync(CLONE)) {
    say(`  ${item.rel}: would ${COPY || item.kind === "file" ? "copy" : "link"} after cloning`);
    continue;
  }
  if (DRY && oldClone && item.rel === "brands") {
    say("  brands: link (after the old clone is set aside)");
    continue;
  }
  const src = itemPath(CLONE, item.rel);
  const dst = itemPath(APP, item.rel);
  let plan = planItem(APP, CLONE, item, { copy: COPY });
  if (plan.action === "unlink-parent") {
    say(`  ${plan.parent}: the old whole-folder link. Remove the link (links hold no data), then bring back the public model sets from git`);
    if (DRY) {
      say(`  ${item.rel}: link (after that)`);
      continue;
    }
    removeLink(itemPath(APP, plan.parent));
    const tracked = git(APP, ["ls-files", "--", plan.parent]);
    if (tracked.ok && tracked.out) {
      const back = git(APP, ["checkout", "--", plan.parent]);
      const n = tracked.out.split(/\r?\n/).length;
      say(back.ok ? `    ✓ ${n} public file(s) restored from git` : `    ! git could not restore them (${back.err.split(/\r?\n/)[0]}); run: git checkout -- ${plan.parent}`);
    } else fs.mkdirSync(itemPath(APP, plan.parent), { recursive: true });
    plan = planItem(APP, CLONE, item, { copy: COPY });
  }
  const line = `  ${item.rel}: ${plan.action} (${plan.why})`;
  if (plan.action === "stop") {
    stopped++;
    say(line.replace(/^ {2}/, "  ✗ "));
    continue;
  }
  say(line);
  if (DRY || plan.action === "ok" || plan.action === "skip") continue;
  if (plan.action === "relink") removeLink(dst);
  if (plan.action === "set-aside") say(`    set aside as ${path.basename(moveAside(dst))}`);
  if (plan.action === "refresh-copy") {
    fs.cpSync(src, dst, { recursive: true, force: true });
    continue;
  }
  makeLink(src, dst, item.kind);
}

if (stopped) stop(`${stopped} item(s) were left as they are (see ✗ above). Nothing was lost.`);
say(`\n✓ personal content ready${DRY ? " (dry run)" : ""}. npm run build-exe now makes the Personal build.`);
