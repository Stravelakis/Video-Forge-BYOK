import type { SetDef } from "./sets.mjs";
export interface SetShape { kind: string; [k: string]: unknown }
export interface SetSpec { room?: boolean; sit?: boolean; label: string; help: string; back: SetShape[]; front: SetShape[]; seats: { x: number; y: number; h: number; face: "camera" | "left" | "right" }[] }
export function checkSpec(raw: unknown): { spec: SetSpec | null; problems: string[] };
export function setFromSpec(spec: SetSpec): SetDef & { custom?: boolean; sit?: boolean };
export function setPrompt(description: string, seats?: number): string;
export function setFor(scene: { id: string; spec?: unknown } | null | undefined): SetDef | null;
