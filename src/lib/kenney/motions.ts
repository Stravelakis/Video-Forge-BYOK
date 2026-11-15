// ---------------------------------------------------------------------------
// Script tags for the 3D cast: "[waves]", "[draw sword]", "[sits down]".
// Humans search the motion library; Mini people and pets use Kenney's own clips.
// Same tag + same files = same motion, in the preview and in every render.
// Relative imports only: the render bundler builds this too.
// ---------------------------------------------------------------------------

export interface LibClip { file: string; name: string; desc: string }
export type Library = Record<string, LibClip[]>;
export interface TagSpan { startMs: number; endMs: number; tag: string }
export interface MotionSpan { startMs: number; endMs: number; clip: string; text: string }

// Kenney's own clip names (Mini people and pets), by what a script would say.
const OWN: [RegExp, string][] = [
  [/\bsit/, "sit"], [/\bwalk/, "walk"], [/\brun|sprint/, "sprint"], [/\bjump/, "jump"], [/\bdanc/, "dance"], [/\beat/, "eat"],
  [/\bcrouch|duck/, "crouch"], [/\b(nod|yes|agree)/, "emote-yes"], [/\b(shak|no\b|disagree)/, "emote-no"], [/\bpick/, "pick-up"],
  [/\b(wave|greet|point)/, "interact-right"], [/\bfall/, "fall"], [/\b(die|faint)/, "die"], [/\b(cheer|celebrat|thumbs up)/, "gesture-positive"],
  [/\b(punch|hit|attack|swing|slash)/, "attack-melee-right"], [/\bkick/, "attack-kick-right"],
];
// Humans have these baked in, so they work even with no motion library installed.
const HUMAN_BASIC: [RegExp, string][] = [[/\bsit/, "sit"], [/\bwalk/, "walk"]];
const ORDER = ["emote", "talk", "hands", "sit", "move", "dnd"];

const stem = (w: string) => w.replace(/(ing|es|s)$/, "");

export function findMotion(tag: string, set: string, own: string[], library: Library): { clip: string; text: string } | null {
  const text = tag.toLowerCase().trim();
  // a direction's walk uses the character's own walk, never a library clip that happens to say "walking"
  if (/^walk(s|ing)?$/.test(text) && own.includes("walk")) return { clip: "walk", text };
  if (set !== "animated") {
    const hit = OWN.find(([re, c]) => re.test(text) && own.includes(c));
    return hit ? { clip: hit[1], text } : null;
  }
  const words = text.split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 2 && !["the", "and", "with", "his", "her", "their"].includes(w)).map(stem);
  if (words.length) {
    const hits: { m: LibClip; rank: number }[] = [];
    ORDER.forEach((cat, rank) => (library[cat] ?? []).forEach((m) => {
      const hay = (m.name + " " + m.desc).toLowerCase();
      if (words.every((w) => hay.includes(w))) hits.push({ m, rank });
    }));
    hits.sort((a, b) => a.rank - b.rank || a.m.desc.length - b.m.desc.length || a.m.file.localeCompare(b.m.file));
    if (hits[0]) return { clip: hits[0].m.file, text: (hits[0].m.name + " " + hits[0].m.desc).toLowerCase() };
  }
  const basic = HUMAN_BASIC.find(([re, c]) => re.test(text) && own.includes(c));
  return basic ? { clip: basic[1], text } : null;
}
