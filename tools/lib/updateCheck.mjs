// "A newer Video Forge is out": the deciding half of the update check.
//
// The app asks GitHub's Releases API at most once a day, from the main process
// (the window's content policy allows no network calls, on purpose). Nothing is
// downloaded: the window shows a small notice with a link to the release page.
//
// Pure (no electron, no network) so tools/lib/updateCheck.test.mjs can run it.
// electron/main.ts supplies the fetch and the place to remember the last check.

export const RELEASES_REPO = "Stravelakis/Video-Forge-BYOK";
export const RELEASES_API = `https://api.github.com/repos/${RELEASES_REPO}/releases?per_page=30`;
export const RELEASES_PAGE = `https://github.com/${RELEASES_REPO}/releases`;
export const DAY_MS = 24 * 60 * 60 * 1000;

/** "v0.4.0-beta.1" → { major, minor, patch, pre: ["beta", 1] }, or null if it is not a version. */
export function parseVersion(text) {
  const m = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/.exec(String(text ?? "").trim());
  if (!m) return null;
  const pre = m[4] ? m[4].split(".").map((p) => (/^\d+$/.test(p) ? Number(p) : p)) : [];
  return { major: +m[1], minor: +m[2], patch: +m[3], pre };
}

/**
 * SemVer order: -1 if a is older than b, 1 if newer, 0 if the same.
 * A pre-release is older than its release (0.4.0-beta.2 < 0.4.0), numbers
 * compare as numbers (beta.10 > beta.9). Something that is not a version
 * counts as the oldest possible.
 */
export function compareVersions(a, b) {
  const x = parseVersion(a);
  const y = parseVersion(b);
  if (!x || !y) return !x && !y ? 0 : !x ? -1 : 1;
  for (const k of ["major", "minor", "patch"]) if (x[k] !== y[k]) return x[k] < y[k] ? -1 : 1;
  if (!x.pre.length || !y.pre.length) return x.pre.length === y.pre.length ? 0 : x.pre.length ? -1 : 1;
  for (let i = 0; i < Math.max(x.pre.length, y.pre.length); i++) {
    const p = x.pre[i];
    const q = y.pre[i];
    if (p === undefined) return -1;
    if (q === undefined) return 1;
    if (p === q) continue;
    if (typeof p === "number" && typeof q === "number") return p < q ? -1 : 1;
    if (typeof p === "number") return -1;
    if (typeof q === "number") return 1;
    return p < q ? -1 : 1;
  }
  return 0;
}

export const isPrerelease = (v) => (parseVersion(v)?.pre.length ?? 0) > 0;

/** Only links to this repo's own pages reach the window. */
export function safeReleaseUrl(url) {
  const s = String(url ?? "");
  return s.startsWith(`https://github.com/${RELEASES_REPO}/releases/`) && !/[\s"'<>]/.test(s) ? s : RELEASES_PAGE;
}

/**
 * The newest published release worth telling this copy about, or null.
 * Drafts never count. Betas only count for someone already on a beta: a
 * person on a finished version is not nudged onto a test version.
 */
export function newestRelease(releases, current) {
  if (!Array.isArray(releases)) return null;
  const wantBetas = isPrerelease(current);
  let best = null;
  for (const r of releases) {
    if (!r || r.draft) continue;
    const version = String(r.tag_name ?? "").replace(/^v/, "");
    if (!parseVersion(version)) continue;
    const beta = r.prerelease === true || isPrerelease(version);
    if (beta && !wantBetas) continue;
    if (!best || compareVersions(version, best.version) > 0) {
      best = { version, url: safeReleaseUrl(r.html_url), beta };
    }
  }
  return best;
}

/** Is it time to ask GitHub again? */
export const dueForCheck = (lastCheckedAt, now) =>
  !Number.isFinite(lastCheckedAt) || now - lastCheckedAt >= DAY_MS || now < lastCheckedAt;

/**
 * The whole check. `state` is what the last check remembered
 * ({ checkedAt, latest }); `fetchReleases` is called only when a day has passed.
 * Returns { update, state }: `update` is { version, url, beta } when a newer
 * release is out, else null; `state` is what to remember next.
 * A failed call is remembered as a check (so a PC offline does not retry on
 * every start) but keeps the last known answer.
 */
export async function checkForUpdate({ current, now, state, fetchReleases }) {
  const prev = state && typeof state === "object" ? state : {};
  let next = prev;
  if (dueForCheck(prev.checkedAt, now)) {
    try {
      next = { checkedAt: now, latest: newestRelease(await fetchReleases(), current) };
    } catch {
      next = { checkedAt: now, latest: prev.latest ?? null };
    }
  }
  const latest = next.latest;
  const update = latest && compareVersions(latest.version, current) > 0 ? latest : null;
  return { update, state: next };
}
