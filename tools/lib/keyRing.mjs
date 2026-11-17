// ---------------------------------------------------------------------------
// Several keys for one service, used in turn (Ak, 10 Nov 2026: "rotate keys").
//
// Free Gemini keys run out of their daily allowance one by one. With a ring,
// a key that answers "quota used up" (or is refused) is rested and the next
// one is tried, so a render or a directing pass keeps going. The key that last
// worked is tried first next time. Any other error (a bad request, a broken
// line) is NOT a reason to burn through every key: it stops at once.
// Pure, no Electron: tested in node (tools/lib/keyRing.test.mjs).
// ---------------------------------------------------------------------------

/** An answer that means "this key can't do it right now; another key might". */
export const OUT_OF_QUOTA = /\b(429|402|403)\b|quota|used up|exceeded|RESOURCE_EXHAUSTED|rate.?limit|API key not valid|API_KEY_INVALID|PERMISSION_DENIED|billing/i;
/** Refusals that won't fix themselves soon: the key rests for hours, not minutes. */
const LONG = /\b(402|403)\b|API key not valid|API_KEY_INVALID|PERMISSION_DENIED|billing/i;
const SHORT_REST = 15 * 60 * 1000;
const LONG_REST = 6 * 60 * 60 * 1000;

export class KeyRing {
  constructor(now = () => Date.now()) { this.rest = new Map(); this.good = null; this.now = now; }
  /** Keys in the order to try: the last good one, the rested-out ones, then resting ones as a last resort. */
  order(keys) {
    const t = this.now();
    const live = keys.filter((k) => (this.rest.get(k) ?? 0) <= t);
    const resting = keys.filter((k) => !live.includes(k)).sort((a, b) => this.rest.get(a) - this.rest.get(b));
    const first = this.good && live.includes(this.good) ? [this.good, ...live.filter((k) => k !== this.good)] : live;
    return [...first, ...resting];
  }
  worked(key) { this.good = key; this.rest.delete(key); }
  failed(key, message) {
    this.rest.set(key, this.now() + (LONG.test(String(message)) ? LONG_REST : SHORT_REST));
    if (this.good === key) this.good = null;
  }
}

/** Run with each key in turn until one works. Stops at the first error that isn't about quota. */
export async function withKeys(ring, keys, run) {
  if (!keys.length) throw new Error("No key saved.");
  let last;
  for (const k of ring.order(keys)) {
    try { const out = await run(k); ring.worked(k); return out; }
    catch (e) {
      last = e;
      const msg = String(e?.message ?? e);
      if (!OUT_OF_QUOTA.test(msg)) throw e;
      ring.failed(k, msg);
    }
  }
  throw last;
}

/** Several keys pasted together: one per line, or separated by commas or spaces. */
export const splitKeys = (text) => [...new Set(String(text ?? "").split(/[\s,;]+/).map((s) => s.trim()).filter((s) => s.length >= 20))];
