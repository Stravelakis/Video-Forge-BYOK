// Run: npm test. Several keys used in turn (10 Nov 2026).
import { test } from "node:test";
import assert from "node:assert/strict";
import { KeyRing, withKeys, splitKeys } from "./keyRing.mjs";

const A = "a".repeat(30), B = "b".repeat(30), C = "c".repeat(30);

test("a used-up key hands over to the next, and the one that worked goes first next time", async () => {
  const ring = new KeyRing();
  const tried = [];
  const out = await withKeys(ring, [A, B, C], async (k) => { tried.push(k); if (k === A) throw new Error("HTTP 429 quota exceeded"); return k; });
  assert.equal(out, B);
  assert.deepEqual(tried, [A, B]);
  assert.deepEqual(ring.order([A, B, C]), [B, C, A], "A rests, B leads");
});

test("an error that isn't about quota stops at once", async () => {
  const ring = new KeyRing();
  let n = 0;
  await assert.rejects(withKeys(ring, [A, B], async () => { n++; throw new Error("bad request: line too long"); }), /bad request/);
  assert.equal(n, 1);
});

test("a rested key comes back after its rest; refused keys rest for hours", () => {
  let now = 0;
  const ring = new KeyRing(() => now);
  ring.failed(A, "HTTP 429");
  ring.failed(B, "HTTP 403 API key not valid");
  assert.deepEqual(ring.order([A, B, C]), [C, A, B]);
  now = 16 * 60 * 1000;
  assert.deepEqual(ring.order([A, B, C]), [A, C, B]);
});

test("when every key is used up, the last answer comes back", async () => {
  await assert.rejects(withKeys(new KeyRing(), [A, B], async () => { throw new Error("RESOURCE_EXHAUSTED"); }), /RESOURCE_EXHAUSTED/);
});

test("pasted keys: one per line or comma-separated, duplicates and junk dropped", () => {
  assert.deepEqual(splitKeys(`${A}\n${B}, ${A}\n\nshort`), [A, B]);
});
