// Run: npm test
// The update check: version order, which releases count, once a day.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DAY_MS,
  RELEASES_PAGE,
  checkForUpdate,
  compareVersions,
  dueForCheck,
  newestRelease,
  parseVersion,
  safeReleaseUrl,
} from "./updateCheck.mjs";

test("versions compare the SemVer way", () => {
  const order = ["0.3.0", "0.4.0-alpha.1", "0.4.0-beta.1", "0.4.0-beta.2", "0.4.0-beta.10", "0.4.0-rc.1", "0.4.0", "0.4.1", "0.10.0", "1.0.0"];
  for (let i = 0; i < order.length - 1; i++) {
    assert.equal(compareVersions(order[i], order[i + 1]), -1, `${order[i]} < ${order[i + 1]}`);
    assert.equal(compareVersions(order[i + 1], order[i]), 1, `${order[i + 1]} > ${order[i]}`);
  }
  assert.equal(compareVersions("v0.4.0-beta.1", "0.4.0-beta.1"), 0);
  assert.equal(compareVersions("1.0.0-beta", "1.0.0-beta.1"), -1);
  assert.equal(compareVersions("1.0.0+build.5", "1.0.0"), 0);
  assert.equal(compareVersions("not a version", "0.0.1"), -1);
  assert.equal(parseVersion("1.2"), null);
  assert.equal(parseVersion("v1.2.3-beta.1").pre[1], 1);
});

const rel = (tag, extra = {}) => ({ tag_name: tag, html_url: `https://github.com/Stravelakis/Video-Forge-BYOK/releases/tag/${tag}`, draft: false, prerelease: /-/.test(tag), ...extra });

test("drafts never count; betas only for someone on a beta", () => {
  const list = [rel("v0.4.0-beta.2"), rel("v0.3.1"), rel("v0.5.0", { draft: true }), rel("nightly")];
  assert.equal(newestRelease(list, "0.4.0-beta.1").version, "0.4.0-beta.2");
  assert.equal(newestRelease(list, "0.3.0").version, "0.3.1");
  assert.equal(newestRelease([rel("v0.4.0-beta.2")], "0.3.0"), null);
  // a finished release beats its own betas for beta users too
  assert.equal(newestRelease([rel("v0.4.0-beta.3"), rel("v0.4.0")], "0.4.0-beta.1").version, "0.4.0");
  assert.equal(newestRelease({ message: "rate limited" }, "0.3.0"), null);
});

test("only this repo's release pages reach the window", () => {
  assert.equal(safeReleaseUrl("https://github.com/Stravelakis/Video-Forge-BYOK/releases/tag/v1.0.0"), "https://github.com/Stravelakis/Video-Forge-BYOK/releases/tag/v1.0.0");
  assert.equal(safeReleaseUrl("https://evil.example/releases/"), RELEASES_PAGE);
  assert.equal(safeReleaseUrl("javascript:alert(1)"), RELEASES_PAGE);
  assert.equal(safeReleaseUrl(undefined), RELEASES_PAGE);
});

test("GitHub is asked at most once a day", async () => {
  const now = 1_800_000_000_000;
  assert.equal(dueForCheck(undefined, now), true);
  assert.equal(dueForCheck(now - DAY_MS + 1, now), false);
  assert.equal(dueForCheck(now - DAY_MS, now), true);
  assert.equal(dueForCheck(now + 5000, now), true, "a clock set back does not block checks forever");

  let calls = 0;
  const fetchReleases = async () => {
    calls++;
    return [rel("v0.4.0-beta.2")];
  };
  const first = await checkForUpdate({ current: "0.4.0-beta.1", now, state: null, fetchReleases });
  assert.equal(calls, 1);
  assert.equal(first.update.version, "0.4.0-beta.2");
  const again = await checkForUpdate({ current: "0.4.0-beta.1", now: now + 60_000, state: first.state, fetchReleases });
  assert.equal(calls, 1, "no second call the same day");
  assert.equal(again.update.version, "0.4.0-beta.2", "the remembered answer is used");
  // once updated, the remembered release is no longer news
  const updated = await checkForUpdate({ current: "0.4.0-beta.2", now: now + 60_000, state: first.state, fetchReleases });
  assert.equal(updated.update, null);
  // next day: asked again
  await checkForUpdate({ current: "0.4.0-beta.1", now: now + DAY_MS, state: first.state, fetchReleases });
  assert.equal(calls, 2);
});

test("an offline check is remembered and keeps the last answer", async () => {
  const now = 1_800_000_000_000;
  const prev = { checkedAt: now - 2 * DAY_MS, latest: { version: "0.5.0", url: RELEASES_PAGE, beta: false } };
  const r = await checkForUpdate({ current: "0.4.0", now, state: prev, fetchReleases: async () => { throw new Error("offline"); } });
  assert.equal(r.state.checkedAt, now);
  assert.equal(r.update.version, "0.5.0");
  const none = await checkForUpdate({ current: "0.4.0", now, state: null, fetchReleases: async () => { throw new Error("offline"); } });
  assert.equal(none.update, null);
});
