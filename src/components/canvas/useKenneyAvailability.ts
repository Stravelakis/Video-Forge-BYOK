// Which 3D sets this copy of the app has (src/lib/kenney/available.ts), asked
// once per window and shared by every shelf and picker.
import { useEffect, useState } from "react";
import { ASSUME_PUBLIC, probeKenney, type KenneyAvailability } from "../../lib/kenney/available";
import { kenneyAsset } from "./KenneyLive";

let answer: KenneyAvailability | null = null;
let asking: Promise<KenneyAvailability> | null = null;

export function kenneyAvailability(): Promise<KenneyAvailability> {
  asking ??= probeKenney(kenneyAsset, (url, init) => fetch(url, init)).then((a) => (answer = a));
  return asking;
}

export function useKenneyAvailability(): KenneyAvailability {
  const [a, setA] = useState<KenneyAvailability>(answer ?? ASSUME_PUBLIC);
  useEffect(() => {
    let live = true;
    void kenneyAvailability().then((x) => { if (live) setA(x); });
    return () => { live = false; };
  }, []);
  return a;
}
