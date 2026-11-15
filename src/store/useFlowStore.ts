// ---------------------------------------------------------------------------
// The five-step way of setting up a video: style, characters, background,
// format, review. This holds only what the steps themselves decide; the
// speakers, sets and backgrounds stay in the project store.
// ---------------------------------------------------------------------------

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { KenneySet } from "../lib/kenney/actor";

export type FlowStyle = { family: "drawn"; look: string } | { family: "3d"; set: KenneySet } | { family: "puppet" };
export type ParamId = "voice" | "colour" | "demeanour" | "looks" | "bars" | "place";

export interface FlowTemplate {
  id: string;
  name: string;
  savedAt: number;
  style: FlowStyle | null;
  format: string | null;
  bgMethod: string | null;
  project: Record<string, unknown>;
}

interface FlowState {
  step: number;
  style: FlowStyle | null;
  format: string | null;
  bgMethod: string | null;
  approved: Record<string, Partial<Record<ParamId, boolean>>>;
  templates: FlowTemplate[];
  setStep: (n: number) => void;
  setStyle: (s: FlowStyle | null) => void;
  setFormat: (f: string | null) => void;
  setBgMethod: (m: string | null) => void;
  approve: (speakerId: string, p: ParamId, on: boolean) => void;
  saveTemplate: (t: FlowTemplate) => void;
  removeTemplate: (id: string) => void;
  restore: (t: FlowTemplate) => void;
}

export const useFlowStore = create<FlowState>()(
  persist(
    (set) => ({
      step: 1, style: null, format: null, bgMethod: null, approved: {}, templates: [],
      setStep: (step) => set({ step }),
      setStyle: (style) => set({ style }),
      setFormat: (format) => set({ format }),
      setBgMethod: (bgMethod) => set({ bgMethod }),
      approve: (id, p, on) => set((s) => ({ approved: { ...s.approved, [id]: { ...s.approved[id], [p]: on } } })),
      saveTemplate: (t) => set((s) => ({ templates: [t, ...s.templates.filter((x) => x.name !== t.name)] })),
      removeTemplate: (id) => set((s) => ({ templates: s.templates.filter((x) => x.id !== id) })),
      restore: (t) => set({ style: t.style, format: t.format, bgMethod: t.bgMethod, step: 5 }),
    }),
    { name: "vf.flow" },
  ),
);
