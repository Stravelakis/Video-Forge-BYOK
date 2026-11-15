// ---------------------------------------------------------------------------
// AI directing: a model reads the script and suggests directions for each line.
//
// The model only ever CHOOSES from the same buttons the Direct step offers
// (allowedTags). Anything it writes that is not on that list is dropped here, in
// code, so a suggestion can never be something the preview or render can't do.
// It names a word by its number in the line; code turns that into the "@NN%"
// timing. Suggestions are marked ai: true so they look different, can be removed
// in one go, and never replace directions the user placed by hand.
// Pure and relative imports only: tested in node.
// ---------------------------------------------------------------------------

import type { DirItem } from "./directions.ts";

export interface SuggestSpeaker { id: string; label: string; actions: string[] }
export interface SuggestLine { i: number; speakerId: string; text: string; words: { word: string; at: number }[] }

export const FEELING_IDS = ["happy", "fond", "sadness", "annoyance", "frustration", "surprise", "nervousness", "panicked", "curiosity", "confusion", "determination", "tired", "serious"];

const LOCOMOTION = /\b(walks?|walking|runs?|running|jog|jogging|sprint|strafe|backpedal)\b/i;

/** Every direction a speaker may get: exactly what the Direct step's buttons add. */
export function allowedTags(sp: SuggestSpeaker, cast: SuggestSpeaker[], feelings: string[] = FEELING_IDS): string[] {
  const others = cast.filter((c) => c.id !== sp.id);
  return [
    "walks to left", "walks to centre", "walks to right", "walks to their place",
    ...others.map((o) => `walks to ${o.label}`),
    "walks in", "walks in from the right", "walks out",
    "faces camera", "faces left", "faces right", ...others.map((o) => `faces ${o.label}`),
    "camera wide", ...cast.map((o) => `camera medium on ${o.label}`), ...cast.map((o) => `camera close on ${o.label}`), "camera push in", "camera pull out",
    ...feelings.map((f) => `feels ${f}`),
    // walking and running clips stay out: moving somewhere is what Walk is for
    ...sp.actions.filter((t) => !LOCOMOTION.test(t)),
  ];
}

const SYSTEM = `You are the director of a short animated video. You get the cast and the script, line by line, with every word numbered.
For each line, suggest a few stage directions that make the scene alive and clear: who walks where, who faces whom, where the camera looks, how the speaker feels, and small actions.

Rules:
- Use ONLY tags from that speaker's list, copied exactly. Never invent a tag. Tags are English even when the script is not.
- "word" is the number of the word in the line the direction happens on (0 = the first word). Put each direction on the word where it makes sense: a wave on a greeting, a turn on the name of the person addressed, a feeling on the word that carries it.
- Be sparing. Most lines get 1 or 2 directions; some get none. Never more than 3.
- Feelings: give one when the line clearly carries an emotion; it changes the face. Do not repeat the same feeling on every line.
- Camera: start the video with "camera wide". Change the shot every few lines, not every line: medium or close on whoever is speaking when it matters, wide again when people move. A push in suits a reveal or a serious moment.
- Every direction on a line is done by THAT line's speaker. When a speaker asks someone else to come, look or act ("come here", "look"), the speaker does not do it: the other person does it on their own next line.
- Walks: only when it helps the story (approaching someone they talk to, leaving, coming back). Put a walk early in the line, so it ends while they are still talking. Someone who walked away should usually go back to their place later. Two people never walk towards each other at the same time. Nobody walks on every line.
- Faces: when a speaker talks to another character, they can face them; when they talk to the viewer, they face the camera.
- Actions must match what is said (a wave for hello, a nod for yes, a shrug for "I don't know"). Skip actions rather than force them.
Example (cast Maria and Nikos):
  4. Maria: [0]Come [1]here, [2]I'll [3]show [4]you  ->  faces Nikos on 0, a beckoning action if her list has one, feels happy on 3
  5. Nikos: [0]Okay, [1]coming!  ->  walks to Maria on 0
  6. Maria: [0]Look [1]at [2]this!  ->  camera close on Maria on 0, feels surprise on 2
Answer with JSON only: {"lines":[{"line":<line number>,"directions":[{"tag":"<exact tag>","word":<word number>}]}]}. Lines with no directions can be left out.`;

export function suggestPrompt(lines: SuggestLine[], cast: SuggestSpeaker[], opts: { note?: string; feelings?: string[] } = {}): { system: string; user: string } {
  const castText = cast.map((sp) => `${sp.label}: ${JSON.stringify(allowedTags(sp, cast, opts.feelings))}`).join("\n");
  const byId = new Map(cast.map((c) => [c.id, c.label]));
  const script = lines.map((l) => `${l.i}. ${byId.get(l.speakerId) ?? "?"}: ${l.words.map((w, k) => `[${k}]${w.word}`).join(" ")}`).join("\n");
  const note = opts.note?.trim() ? `\nThe user's note about the tone: ${opts.note.trim()}\n` : "";
  return { system: SYSTEM, user: `CAST, each with the only tags they may use:\n${castText}\n${note}\nSCRIPT:\n${script}` };
}

/** The model's answer, kept only where it is a real choice on a real line and word. */
export function readSuggestions(answer: string, lines: SuggestLine[], cast: SuggestSpeaker[], feelings: string[] = FEELING_IDS): Record<number, DirItem[]> {
  let data: unknown;
  try { data = JSON.parse(answer.replace(/^```(?:json)?\s*|\s*```$/g, "")); } catch { return {}; }
  // small models vary the wrapper: {"lines":[…]}, a bare array, or another key holding the array
  const obj = data as Record<string, unknown>;
  const rows = Array.isArray(data) ? data : Array.isArray(obj?.lines) ? obj.lines : Object.values(obj ?? {}).find(Array.isArray);
  if (!Array.isArray(rows)) return {};
  const lineBy = new Map(lines.map((l) => [l.i, l]));
  const allowed = new Map(cast.map((sp) => [sp.id, new Map(allowedTags(sp, cast, feelings).map((t) => [t.toLowerCase(), t]))]));
  const out: Record<number, DirItem[]> = {};
  for (const r of rows as Record<string, unknown>[]) {
    const l = lineBy.get(Number(String(r?.line ?? r?.i ?? r?.index ?? r?.line_number ?? "").replace(/\D/g, "") || NaN));
    const dirs = r?.directions ?? r?.items ?? r?.tags;
    if (!l || !Array.isArray(dirs)) continue;
    const ok = allowed.get(l.speakerId);
    const items: DirItem[] = [];
    for (const d of dirs as ({ tag?: unknown; word?: unknown } | string)[]) {
      const raw = typeof d === "string" ? d : d?.tag;
      const tag = ok?.get(String(raw ?? "").trim().toLowerCase());
      if (!tag || items.some((x) => x.tag === tag)) continue;
      const k = Math.max(0, Math.min(l.words.length - 1, Math.round(Number(typeof d === "string" ? 0 : d?.word) || 0)));
      items.push({ tag, at: l.words[k]?.at ?? 0, ai: true });
      if (items.length >= 3) break;
    }
    if (items.length) out[l.i] = items;
  }
  return tidy(out, lines, cast);
}

/** Small models' habits, fixed in code: the camera cutting on every line, and two
 *  people walking at each other ("come here" walked by the one who said it). */
function tidy(out: Record<number, DirItem[]>, lines: SuggestLine[], cast: SuggestSpeaker[]): Record<number, DirItem[]> {
  const label = new Map(cast.map((c) => [c.id, c.label.toLowerCase()]));
  const order = [...lines].sort((a, b) => a.i - b.i);
  let lastCam = -9;
  order.forEach((l, n) => {
    let items = out[l.i];
    if (!items) return;
    const cam = items.findIndex((x) => x.tag.startsWith("camera "));
    if (cam >= 0 && n - lastCam < 2) items = items.filter((_, k) => k !== cam);
    else if (cam >= 0) lastCam = n;
    const walk = items.find((x) => x.tag.startsWith("walks to "));
    const to = walk && cast.find((c) => walk.tag.toLowerCase() === `walks to ${c.label.toLowerCase()}`);
    if (walk && to) {
      const back = order.slice(n + 1, n + 3).some((m) => m.speakerId === to.id && (out[m.i] ?? []).some((x) => x.tag.toLowerCase() === `walks to ${label.get(l.speakerId)}`));
      if (back) items = items.filter((x) => x !== walk);
    }
    if (items.length) out[l.i] = items; else delete out[l.i];
  });
  return out;
}

/** Lines in batches small enough for one answer. */
export function batches<T>(xs: T[], size = 50): T[][] {
  const out: T[][] = [];
  for (let k = 0; k < xs.length; k += size) out.push(xs.slice(k, k + size));
  return out;
}
