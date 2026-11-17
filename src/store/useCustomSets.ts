// Sets made from a description (characters/sets/custom.mjs), kept on this computer
// so they can be used in any project. A project that uses one also carries its spec
// (scene.spec), so it still renders on a machine that doesn't have this list.
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { SetSpec } from "../../characters/sets/custom.mjs";

interface CustomSets {
  sets: { id: string; spec: SetSpec }[];
  add: (spec: SetSpec) => string;
  remove: (id: string) => void;
}

export const useCustomSets = create<CustomSets>()(
  persist(
    (set) => ({
      sets: [],
      add: (spec) => { const id = `custom-${Date.now().toString(36)}`; set((s) => ({ sets: [...s.sets, { id, spec }].slice(-40) })); return id; },
      remove: (id) => set((s) => ({ sets: s.sets.filter((x) => x.id !== id) })),
    }),
    { name: "vf.customSets" }
  )
);
