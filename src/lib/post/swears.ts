// ---------------------------------------------------------------------------
// Swear-word clean-up (plan item 10b, Ak 17 Nov 2026): Greek and English,
// default NO clean-up. Four ways, chosen per project in Render → Post-production:
//
//   off    the words stay as written and as spoken
//   bleep  the voice says it, post-production plays a beep over it, and the
//          subtitles show the first letter and stars (f***)
//   mute   the same, with silence instead of the beep
//   swap   the voice is ASKED for a softer word (fuck → duck), so the voice and
//          the subtitles say the same thing. This changes what is spoken, so it
//          takes effect when the voices are made. A video whose voices were made
//          before swap was turned on gets bleeps for the words still in it, and
//          a warning says to make the voices again.
//
// HOW A RULE MATCHES. One word at a time, ignoring capitals and Greek accents
// ("Γαμώτο" = "γαμωτο"). A plain rule matches the whole word only; "fuck*"
// matches any word that starts with it (fucking, fucked). A swap ending in "*"
// keeps the rest of the word: "fuck*" → "duck*" turns "fucking" into "ducking".
// Greek rules are whole words on purpose: "μαλακ*" would also catch μαλακός
// (soft), "γαμ*" γάμος (wedding).
//
// HONEST LIMIT (said in the hover help too): the bleep is placed from when each
// word was said. When the narration has measured word times (forced
// alignment) the bleep sits on the word; otherwise the time is estimated from
// letter counts, so the bleep is made a little wider to be sure to cover it.
//
// No runtime imports on purpose: tools/lib/swears.test.mjs runs this file
// directly.
// ---------------------------------------------------------------------------

export type SwearMode = "off" | "bleep" | "mute" | "swap";

export interface SwearRule {
  /** The word, lower case; "*" at the end = any word starting with it. */
  word: string;
  /** The softer word for "swap"; "*" at the end keeps the rest of the word. */
  swap: string;
}

export interface SwearSettings {
  mode: SwearMode;
  english: boolean;
  greek: boolean;
  /** Built-in words this project lets through (as written in the list). */
  allowed: string[];
  /** The project's own words, added to the built-in ones. */
  own: SwearRule[];
}

export const SWEAR_MODES: { value: SwearMode; label: string; help: string }[] = [
  { value: "off", label: "No clean-up", help: "Words stay exactly as written and spoken." },
  { value: "bleep", label: "Bleep", help: "A beep plays over the word. The subtitles show the first letter and stars (f***)." },
  { value: "mute", label: "Mute", help: "The word goes silent. The subtitles show the first letter and stars (f***)." },
  { value: "swap", label: "Softer word", help: "The voice says a softer word instead (shit → shoot), and the subtitles show it. Make the voices again after turning this on." },
];

// The built-in lists. Ak can let any of them through per project and add his own.
export const ENGLISH_SWEARS: SwearRule[] = [
  { word: "motherfuck*", swap: "motherduck*" },
  { word: "fuck*", swap: "duck*" },
  { word: "bullshit", swap: "nonsense" },
  { word: "shitty", swap: "crummy" },
  { word: "shit*", swap: "shoot*" },
  { word: "bitch*", swap: "witch*" },
  { word: "asshole*", swap: "butthead*" },
  { word: "dumbass", swap: "dummy" },
  { word: "jackass", swap: "jerk" },
  { word: "ass", swap: "butt" },
  { word: "bastard*", swap: "rascal*" },
  { word: "goddamn*", swap: "gosh-darn*" },
  { word: "damn*", swap: "darn*" },
  { word: "dickhead*", swap: "jerk*" },
  { word: "dick", swap: "jerk" },
  { word: "cunt*", swap: "creep*" },
  { word: "pissed", swap: "peeved" },
  { word: "piss", swap: "pee" },
  { word: "crap", swap: "crud" },
  { word: "wanker*", swap: "plonker*" },
  { word: "slut*", swap: "fool*" },
];

export const GREEK_SWEARS: SwearRule[] = [
  { word: "γαμώτο", swap: "να πάρει" },
  { word: "γαμώ", swap: "φτου" },
  { word: "γαμιέσαι", swap: "χάνεσαι" },
  { word: "γαμήσου", swap: "χάσου" },
  { word: "γάμησε", swap: "άσε" },
  { word: "γαμάει", swap: "σκίζει" },
  { word: "γαμάτο", swap: "τέλειο" },
  { word: "γαμάτος", swap: "τέλειος" },
  { word: "γαμάτη", swap: "τέλεια" },
  { word: "γαμημέν*", swap: "αναθεματισμέν*" },
  { word: "γαμιόλ*", swap: "κατεργάρ*" },
  { word: "μαλάκας", swap: "βλάκας" },
  { word: "μαλάκα", swap: "βλάκα" },
  { word: "μαλάκες", swap: "βλάκες" },
  { word: "μαλάκω", swap: "βλάκα" },
  { word: "μαλακία", swap: "βλακεία" },
  { word: "μαλακίες", swap: "βλακείες" },
  { word: "μαλακισμέν*", swap: "χαζ*" },
  { word: "σκατά", swap: "σκόρδα" },
  { word: "πουτάνα", swap: "κακούργα" },
  { word: "πουτάνας", swap: "κακούργας" },
  { word: "πούστ*", swap: "κατεργάρ*" },
  { word: "καριόλ*", swap: "κατεργάρ*" },
  { word: "αρχίδια", swap: "κολοκύθια" },
  { word: "αρχίδι", swap: "κολοκύθι" },
  { word: "μουνί", swap: "χαζό" },
  { word: "ψωλή", swap: "κολοκύθα" },
  { word: "τσούλα", swap: "κακούργα" },
  { word: "κώλος", swap: "πισινός" },
  { word: "κώλο", swap: "πισινό" },
  { word: "κώλου", swap: "πισινού" },
  { word: "κωλο*", swap: "παλιο*" },
];

export function defaultSwears(): SwearSettings {
  return { mode: "off", english: true, greek: true, allowed: [], own: [] };
}

const MODES = new Set<SwearMode>(["off", "bleep", "mute", "swap"]);

/** Swear settings read from a file or the autosave. Anything odd = off. */
export function cleanSwears(v: unknown): SwearSettings {
  const d = defaultSwears();
  if (!v || typeof v !== "object") return d;
  const o = v as Partial<Record<keyof SwearSettings, unknown>>;
  const str = (x: unknown) => (typeof x === "string" ? x.trim().slice(0, 60) : "");
  return {
    mode: MODES.has(o.mode as SwearMode) ? (o.mode as SwearMode) : "off",
    english: o.english !== false,
    greek: o.greek !== false,
    allowed: Array.isArray(o.allowed) ? o.allowed.map(str).filter(Boolean).slice(0, 200) : [],
    own: Array.isArray(o.own)
      ? o.own
          .map((r) => (r && typeof r === "object" ? { word: str((r as SwearRule).word).toLowerCase(), swap: str((r as SwearRule).swap) } : null))
          .filter((r): r is SwearRule => !!r && !!r.word && r.word !== "*")
          .slice(0, 200)
      : [],
  };
}

// ---- the project's own words, as text ---------------------------------------

/** "word = softer word", one per line (the box in Post-production). */
export function ownRulesFromText(text: string): SwearRule[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const [word, ...rest] = line.split("=");
      return { word: word.trim().toLowerCase(), swap: rest.join("=").trim() };
    })
    .filter((r) => r.word && r.word !== "*");
}

export function ownRulesToText(rules: SwearRule[]): string {
  return rules.map((r) => (r.swap ? `${r.word} = ${r.swap}` : r.word)).join("\n");
}

// ---- matching ---------------------------------------------------------------

/** Lower case, no accents, final ς as σ: one character in, a few out. */
function fold(c: string): string {
  return c.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/ς/g, "σ");
}

interface Compiled {
  stem: string;
  prefix: boolean;
  swap: string;
}

/** The rules this project uses, longest first so "motherfuck*" beats "fuck*". */
export function activeRules(s: SwearSettings | null | undefined): Compiled[] {
  const c = cleanSwears(s);
  if (c.mode === "off") return [];
  const allowed = new Set(c.allowed.map((w) => [...w.toLowerCase()].map(fold).join("")));
  const all = [...(c.english ? ENGLISH_SWEARS : []), ...(c.greek ? GREEK_SWEARS : []), ...c.own];
  const out: Compiled[] = [];
  const seen = new Set<string>();
  for (const r of all) {
    const prefix = r.word.endsWith("*");
    const stem = [...r.word.replace(/\*+$/, "")].map(fold).join("");
    if (!stem || allowed.has(stem) || allowed.has(stem + "*")) continue;
    const key = stem + (prefix ? "*" : "");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ stem, prefix, swap: r.swap });
  }
  // own rules were added last but should win over a built-in with the same stem
  for (const r of c.own) {
    const prefix = r.word.endsWith("*");
    const stem = [...r.word.replace(/\*+$/, "")].map(fold).join("");
    const hit = out.find((x) => x.stem === stem && x.prefix === prefix);
    if (hit) hit.swap = r.swap;
  }
  return out.sort((a, b) => b.stem.length - a.stem.length || Number(a.prefix) - Number(b.prefix));
}

const LETTER = /[\p{L}\p{N}]/u;

/** A word split into its leading punctuation, the word, and the trailing bit. */
function parts(token: string): { lead: string; core: string; trail: string } {
  let a = 0;
  let b = token.length;
  while (a < b && !LETTER.test(token[a])) a++;
  while (b > a && !LETTER.test(token[b - 1])) b--;
  return { lead: token.slice(0, a), core: token.slice(a, b), trail: token.slice(b) };
}

/** Which rule catches this word, and where its stem ends in the original. */
function matchCore(core: string, rules: Compiled[]): { rule: Compiled; stemEnd: number } | null {
  if (!core) return null;
  // fold character by character, remembering where each folded character came from
  let folded = "";
  const from: number[] = [];
  const chars = [...core];
  let pos = 0;
  for (const ch of chars) {
    const f = fold(ch);
    for (let i = 0; i < f.length; i++) from.push(pos);
    folded += f;
    pos += ch.length;
  }
  for (const rule of rules) {
    if (rule.prefix ? folded.startsWith(rule.stem) : folded === rule.stem) {
      const end = rule.stem.length < from.length ? from[rule.stem.length] : core.length;
      return { rule, stemEnd: end };
    }
  }
  return null;
}

export function isSwear(word: string, rules: Compiled[]): boolean {
  return !!matchCore(parts(word).core, rules);
}

/** Capitals follow the original: "Fuck" → "Duck", "FUCK" → "DUCK". */
function sameCase(original: string, swap: string): string {
  const letters = [...original].filter((c) => c.toLowerCase() !== c.toUpperCase());
  if (letters.length > 1 && letters.every((c) => c === c.toUpperCase())) return swap.toUpperCase();
  if (letters[0] && letters[0] === letters[0].toUpperCase()) return swap.charAt(0).toUpperCase() + swap.slice(1);
  return swap;
}

/** Every word in `text` the rules catch, changed by `change`. Spaces and
 *  [tags] are left exactly as they are. */
function eachWord(text: string, rules: Compiled[], change: (core: string, m: { rule: Compiled; stemEnd: number }) => string): string {
  if (!rules.length || !text) return text;
  return text
    .split(/(\[[^\]]*\]|\s+)/)
    .map((piece) => {
      if (!piece || /^\s+$/.test(piece) || piece.startsWith("[")) return piece;
      const { lead, core, trail } = parts(piece);
      const m = matchCore(core, rules);
      return m ? lead + change(core, m) + trail : piece;
    })
    .join("");
}

/** A Greek accent that sat on the replaced part (κωλό|παιδο) goes on the same
 *  place in the softer part (παλιό|παιδο), when the softer part has none. */
function moveAccent(origStem: string, swapStem: string): string {
  const ACUTE = /[\u0301\u0384]/;
  if ([...swapStem].some((c) => ACUTE.test(c.normalize("NFD")))) return swapStem;
  const o = [...origStem];
  const fromEnd = o.length - 1 - o.findIndex((c) => ACUTE.test(c.normalize("NFD")));
  if (fromEnd >= o.length) return swapStem; // no accent
  const w = [...swapStem];
  const i = w.length - 1 - fromEnd;
  if (i < 0 || !/[αεηιουω]/i.test(w[i])) return swapStem;
  w[i] = (w[i] + "\u0301").normalize("NFC");
  return w.join("");
}

/** "swap": the softer words, for the voice and the subtitles alike. A rule
 *  with no softer word written is bleeped instead (left as is here). */
export function swapSwears(text: string, rules: Compiled[]): string {
  return eachWord(text, rules, (core, m) => {
    if (!m.rule.swap) return core;
    const swap = m.rule.swap.endsWith("*") ? moveAccent(core.slice(0, m.stemEnd), m.rule.swap.slice(0, -1)) + core.slice(m.stemEnd) : m.rule.swap;
    return sameCase(core, swap);
  });
}

/** "bleep" / "mute": first letter, then a star for every other letter (f***ing → f******). */
export function maskSwears(text: string, rules: Compiled[]): string {
  return eachWord(text, rules, (core) => {
    const chars = [...core];
    return chars[0] + chars.slice(1).map((c) => (LETTER.test(c) ? "*" : c)).join("");
  });
}

// ---- where to bleep -----------------------------------------------------------

export interface TimedWord {
  text: string;
  startMs: number;
  endMs: number;
}

/** The stretches of the narration to bleep or mute, in seconds, merged where
 *  they touch. `padMs` widens each word on both sides (more when the word
 *  times are estimated rather than measured). */
export function swearWindows(words: TimedWord[], rules: Compiled[], padMs: number): [number, number][] {
  if (!rules.length) return [];
  const raw = words
    .filter((w) => w && Number.isFinite(w.startMs) && Number.isFinite(w.endMs) && isSwear(w.text, rules))
    .map((w) => [Math.max(0, w.startMs - padMs) / 1000, (w.endMs + padMs) / 1000] as [number, number]);
  return mergeWindows(raw);
}

/** Stretches sorted, and joined where they touch or overlap. */
export function mergeWindows(windows: [number, number][]): [number, number][] {
  const raw = windows.slice().sort((a, b) => a[0] - b[0]);
  const out: [number, number][] = [];
  for (const w of raw) {
    const last = out[out.length - 1];
    if (last && w[0] <= last[1]) last[1] = Math.max(last[1], w[1]);
    else out.push([w[0], w[1]]);
  }
  return out;
}

/** How much wider than the word a bleep is: measured word times are close,
 *  estimated ones can be off by most of a syllable. */
export const PAD_MEASURED_MS = 40;
/** Word times from the heard stretches (wordsFromIslands). */
export const PAD_ISLANDS_MS = 80;
/** Word times guessed from letter counts alone. */
export const PAD_ESTIMATED_MS = 140;

// ---- word times from the sound itself ------------------------------------------

/** Word times for one line when the narration has no measured ones: the line
 *  is cut into phrases at its punctuation, each phrase is matched to a stretch
 *  where the voice is actually heard (`islands`, from the audio, in ms), and
 *  the words are shared out inside it by length. Much closer than spreading
 *  them over the whole line, which also covers the pauses. Null when the line
 *  has no audio stretch at all. */
export function wordsFromIslands(
  seg: { text: string; startMs: number; endMs: number },
  islands: [number, number][],
): TimedWord[] | null {
  const words = seg.text.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return null;
  // the stretches heard inside this line, cut to it
  let isl = islands
    .map(([a, b]) => [Math.max(a, seg.startMs), Math.min(b, seg.endMs)] as [number, number])
    .filter(([a, b]) => b - a > 30);
  if (!isl.length) return null;
  const weight = (w: string) => Math.max(1, [...w.replace(/[^\p{L}\p{N}]/gu, "")].length);
  // phrases: [first word, last word + 1], with how strong the stop after it is
  let phrases: { from: number; to: number; stop: number }[] = [];
  let start = 0;
  words.forEach((w, i) => {
    const stop = /[.!?;…]$/.test(w) ? 2 : /[,:·—–-]$/.test(w) ? 1 : 0;
    if (stop || i === words.length - 1) {
      phrases.push({ from: start, to: i + 1, stop });
      start = i + 1;
    }
  });
  // more heard stretches than phrases: a breath inside a phrase, join the closest
  while (isl.length > phrases.length) {
    let best = 0;
    for (let i = 1; i < isl.length - 1; i++) if (isl[i + 1][0] - isl[i][1] < isl[best + 1][0] - isl[best][1]) best = i;
    isl = [...isl.slice(0, best), [isl[best][0], isl[best + 1][1]], ...isl.slice(best + 2)];
  }
  // more phrases than stretches: a comma said without a pause, join at the weakest stop
  while (phrases.length > isl.length) {
    let best = 0;
    for (let i = 1; i < phrases.length - 1; i++) if (phrases[i].stop < phrases[best].stop) best = i;
    phrases = [...phrases.slice(0, best), { from: phrases[best].from, to: phrases[best + 1].to, stop: phrases[best + 1].stop }, ...phrases.slice(best + 2)];
  }
  const out: TimedWord[] = [];
  phrases.forEach((p, k) => {
    const [a, b] = isl[k];
    const ws = words.slice(p.from, p.to);
    const total = ws.reduce((s, w) => s + weight(w), 0);
    let acc = 0;
    for (const w of ws) {
      const s = a + ((b - a) * acc) / total;
      acc += weight(w);
      out.push({ text: w, startMs: Math.round(s), endMs: Math.round(a + ((b - a) * acc) / total) });
    }
  });
  return out;
}
