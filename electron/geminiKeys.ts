// ---------------------------------------------------------------------------
// Every Gemini key the user saved, used in turn (tools/lib/keyRing.mjs).
// "gemini" is the main key (its own box in Settings); "gemini-extra" holds any
// number of extra keys, one per line. Text (directing, footage plans) and
// voices both go through withGeminiKey, so a key that runs out mid-render
// hands over to the next one instead of failing the job.
// ---------------------------------------------------------------------------

import * as keyStore from "./keyStore";
import { KeyRing, OUT_OF_QUOTA, splitKeys, withKeys } from "../tools/lib/keyRing.mjs";

const ring = new KeyRing();

export async function geminiKeys(): Promise<string[]> {
  const main = (await keyStore.getKey("gemini"))?.trim();
  return [...new Set([...(main ? [main] : []), ...splitKeys(await keyStore.getKey("gemini-extra"))])];
}

export async function withGeminiKey<T>(run: (key: string) => Promise<T>): Promise<T> {
  const keys = await geminiKeys();
  if (!keys.length) throw new Error("No Gemini key saved (Settings → Gemini).");
  try {
    return await withKeys(ring, keys, run);
  } catch (e) {
    const msg = String((e as Error)?.message ?? e);
    if (keys.length > 1 && OUT_OF_QUOTA.test(msg)) throw new Error(`All ${keys.length} Gemini keys are used up or refused right now. Last answer: ${msg.slice(0, 200)}`);
    throw e;
  }
}
