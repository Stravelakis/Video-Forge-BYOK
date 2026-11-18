// ---------------------------------------------------------------------------
// Which 3D sets this copy of the app actually has.
//
// The "animated" set (3D Humans) and its motion library (motions.json) are
// built on Mixamo motions, which Adobe does not allow anyone to pass on. They
// ship only in the owner's Personal build. The Public build has the Kenney CC0
// sets (Mini people, Pets) and the props, so every place that offers the
// Humans asks here first and greys them out with a plain note when absent.
//
// Pure apart from the `fetch` it is given, so tools/lib/kenneyAvailable.test.mjs
// can check it without Electron.
// ---------------------------------------------------------------------------

import type { KenneySet } from "./actor";

/** The hover note on anything that needs the Personal build. */
export const PERSONAL_ONLY_NOTE = "In the personal build only.";

/** The files whose presence means the Humans set is here. */
export const ANIMATED_FILES = ["models/animated/animated.glb", "motions.json"] as const;

export interface KenneyAvailability {
  /** The Humans model files are here. */
  animated: boolean;
  /** The motion library (motions.json) is here. */
  motions: boolean;
}

/** Until the check has answered: assume nothing personal (nothing flickers on, then off). */
export const ASSUME_PUBLIC: KenneyAvailability = { animated: false, motions: false };

type Fetch = (url: string, init?: { method?: string }) => Promise<{ ok: boolean }>;

/** Asks for each file once (HEAD, no download). Any failure counts as absent. */
export async function probeKenney(asset: (rel: string) => string, fetchFn: Fetch): Promise<KenneyAvailability> {
  const has = (rel: string) => fetchFn(asset(rel), { method: "HEAD" }).then((r) => !!r?.ok, () => false);
  const [model, motions] = await Promise.all(ANIMATED_FILES.map(has));
  return { animated: model && motions, motions };
}

/** Can this set be used here? */
export function setAvailable(set: KenneySet | string, a: KenneyAvailability): boolean {
  return set === "animated" ? a.animated : true;
}

/** The note for a set that cannot be used here, or null. */
export function setNote(set: KenneySet | string, a: KenneyAvailability): string | null {
  return setAvailable(set, a) ? null : PERSONAL_ONLY_NOTE;
}

/** The error an actor throws for a character this build does not have. */
export class PersonalOnlyError extends Error {
  constructor(what = "3D Humans") {
    super(`${what}: ${PERSONAL_ONLY_NOTE}`);
    this.name = "PersonalOnlyError";
  }
}

export const isPersonalOnly = (e: unknown): boolean => (e as { name?: string } | null)?.name === "PersonalOnlyError";
