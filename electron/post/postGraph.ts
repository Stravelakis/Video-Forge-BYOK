// ---------------------------------------------------------------------------
// Post-production as ffmpeg filter graphs. PURE: every function here turns
// settings into filter text and nothing else, so tools/lib/postProduction.test.mjs
// checks them without running ffmpeg. runPost.ts runs what these build.
//
// THE SPEECH GRAPH. The narration is one file with every speaker in it. Each
// speaker who needs their own treatment (a voice character, or a place left
// or right) gets a copy of the whole file with everyone else muted, their own
// chain, and their own pan; the copies are added back together; then studio
// sound runs over the sum:
//
//   narration (read once per branch)
//     ├─ mute others ─ voice A ─ pan A ─┐
//     └─ mute others ─ voice B ─ pan B ─┴─ add ─ studio sound ─ loudness
//
// The cut between two speakers falls in the middle of the pause between their
// lines (speakerWindows), so a cut never lands on a word and every moment of
// the file belongs to exactly one copy.
//
// WHICH FFMPEG. The app uses a full ffmpeg when the machine has one, and
// Remotion's cut-down copy (about 50 filters) when it does not
// (electron/process/ffmpegPath.ts). Every builder takes the set of filters the
// ffmpeg in use actually has, leaves out what it lacks, and says so in a
// warning — the render never fails because of post-production.
// ---------------------------------------------------------------------------

import { panGains, voiceIsFlat, voiceParams, type PostJob, type VoiceParams } from "../../src/lib/post/postSettings.ts";

/** Working sample rate of the speech graph. */
export const RATE = 48000;

export type Caps = ReadonlySet<string>;

/** The filter names from `ffmpeg -filters` output. */
export function filtersFrom(listing: string): Set<string> {
  const out = new Set<string>();
  for (const line of listing.split(/\r?\n/)) {
    // " T.. acompressor        A->A       Audio compressor."
    const m = /^\s*[TSC.|]{2,3}\s+(\w+)\s+\S+->\S+/.exec(line);
    if (m) out.add(m[1]);
  }
  return out;
}

const n3 = (v: number) => (Math.round(v * 1000) / 1000).toString();

// ---- who speaks when --------------------------------------------------------

export interface Seg {
  speakerId: string;
  startMs: number;
  endMs: number;
}

/** Each speaker's stretches of the file, in seconds. The whole timeline is
 *  shared out: the boundary between two lines is the middle of the gap between
 *  them, the first stretch starts at 0 and the last runs to the end (END). */
export const END = 1e6;

export function speakerWindows(segments: Seg[]): Map<string, [number, number][]> {
  const segs = segments
    .filter((s) => s && typeof s.speakerId === "string" && Number.isFinite(s.startMs) && Number.isFinite(s.endMs))
    .slice()
    .sort((a, b) => a.startMs - b.startMs);
  const out = new Map<string, [number, number][]>();
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i];
    const prev = segs[i - 1];
    const next = segs[i + 1];
    const from = prev ? Math.max(prev.startMs, cut(prev.endMs, s.startMs)) / 1000 : 0;
    const to = next ? Math.max(s.startMs, cut(s.endMs, next.startMs)) / 1000 : END;
    const list = out.get(s.speakerId) ?? [];
    const last = list[list.length - 1];
    // the same speaker twice in a row is one stretch
    if (last && Math.abs(last[1] - from) < 1e-9) last[1] = to;
    else list.push([from, to]);
    out.set(s.speakerId, list);
  }
  return out;
}

/** Where to cut between a line ending at `end` and the next starting at `start`. */
const cut = (end: number, start: number) => (start > end ? (end + start) / 2 : start);

/** ffmpeg expression: true while t is inside any of the stretches. */
export function windowExpr(windows: [number, number][]): string {
  return windows.map(([a, b]) => `between(t,${n3(a)},${n3(b)})`).join("+");
}

// ---- one voice ----------------------------------------------------------------

export interface Built {
  filters: string[];
  /** Filters this ffmpeg lacks, so a part was left out. */
  missing: string[];
}

/** The filters that give a voice its character, in order: pitch, band, tone,
 *  doubling, room. Mono in, mono out. */
export function voiceChain(p: VoiceParams, caps: Caps): Built {
  const f: string[] = [];
  const missing: string[] = [];
  const need = (name: string) => {
    if (caps.has(name)) return true;
    missing.push(name);
    return false;
  };
  const ratio = (st: number) => n3(Math.pow(2, st / 12));

  if (p.pitch || p.formant) {
    if (caps.has("rubberband")) {
      // rubberband moves the note and, separately, the throat (formants):
      //   shifted   = both move together (a cartoon voice)
      //   preserved = the note moves, the throat stays
      // A throat move different from the note is two steps: move both by the
      // throat amount, then the note alone by the rest.
      if (!p.formant) f.push(`rubberband=pitch=${ratio(p.pitch)}:formant=preserved`);
      else if (Math.abs(p.formant - p.pitch) < 1e-9) f.push(`rubberband=pitch=${ratio(p.pitch)}:formant=shifted`);
      else {
        f.push(`rubberband=pitch=${ratio(p.formant)}:formant=shifted`);
        if (Math.abs(p.pitch - p.formant) > 1e-9) f.push(`rubberband=pitch=${ratio(p.pitch - p.formant)}:formant=preserved`);
      }
    } else if (p.pitch && caps.has("asetrate") && caps.has("atempo") && caps.has("aresample")) {
      // Every ffmpeg has these: play faster or slower (note and throat move
      // together), then stretch the timing back. The throat cannot move alone.
      const r = Math.pow(2, p.pitch / 12);
      f.push(`asetrate=${Math.round(RATE * r)}`, `aresample=${RATE}`, `atempo=${n3(1 / r)}`);
      if (p.formant && Math.abs(p.formant - p.pitch) > 1e-9) missing.push("rubberband");
    } else {
      missing.push("rubberband");
    }
  }
  if (p.band) {
    if (need("highpass")) f.push(`highpass=f=${p.band[0]}:poles=2`);
    if (need("lowpass")) f.push(`lowpass=f=${p.band[1]}:poles=2`);
  }
  if (p.warmth && need("lowshelf")) f.push(`lowshelf=f=200:g=${n3(p.warmth)}`);
  if (p.bright && need("equalizer")) f.push(`equalizer=f=3000:width_type=o:width=1.5:g=${n3(p.bright)}`);
  if (p.air && need("highshelf")) f.push(`highshelf=f=10000:g=${n3(p.air)}`);
  if (p.chorus > 0 && need("chorus")) {
    const c = Math.min(1, p.chorus);
    f.push(`chorus=0.7:0.9:40|55:${n3(0.4 * c)}|${n3(0.32 * c)}:0.25|0.35:1.5|2`);
  }
  if (p.room > 0 && need("aecho")) {
    const r = Math.min(1, p.room);
    f.push(`aecho=1:0.9:${Math.round(30 + 40 * r)}|${Math.round(55 + 60 * r)}:${n3(0.25 * r)}|${n3(0.18 * r)}`);
  }
  return { filters: f, missing };
}

// ---- studio sound -----------------------------------------------------------

export const TARGET_LUFS = -14;
export const TARGET_TP = -1;
export const TARGET_LRA = 11;

/** Everything before the loudness step: rumble cut, gentle compression, light de-ess. */
export function studioChain(caps: Caps): Built {
  const f: string[] = [];
  const missing: string[] = [];
  // AI voices are already clean: everything here is gentle.
  if (caps.has("highpass")) f.push("highpass=f=80:poles=2");
  else missing.push("highpass");
  // threshold 0.125 ≈ −18 dB, 2.5:1, soft knee: evens the level, no pumping
  if (caps.has("acompressor")) f.push("acompressor=threshold=0.125:ratio=2.5:attack=15:release=250:knee=4:makeup=1");
  else missing.push("acompressor");
  if (caps.has("deesser")) f.push("deesser=i=0.25:m=0.5:f=0.5:s=o");
  else missing.push("deesser");
  return { filters: f, missing };
}

/** What the first loudness pass measured (ffmpeg's loudnorm JSON). */
export interface Loudness {
  input_i: string;
  input_tp: string;
  input_lra: string;
  input_thresh: string;
  target_offset: string;
}

/** Two-pass loudness: the first pass measures (`measure`), the second
 *  applies the measurement as one steady gain (linear), so the voice's own
 *  dynamics are kept rather than pumped. Without a measurement (a short voice
 *  test, or a failed first pass) it is one adaptive pass. */
export function loudnormFilter(measured?: Loudness | null, measure = false): string {
  const base = `loudnorm=I=${TARGET_LUFS}:TP=${TARGET_TP}:LRA=${TARGET_LRA}`;
  if (measure) return `${base}:print_format=json`;
  if (!measured) return base;
  const ok = (v: string) => /^-?\d+(\.\d+)?$/.test(v);
  if (![measured.input_i, measured.input_tp, measured.input_lra, measured.input_thresh, measured.target_offset].every(ok)) {
    return base; // a silent file measures -inf: fall back to one pass
  }
  return `${base}:measured_I=${measured.input_i}:measured_TP=${measured.input_tp}:measured_LRA=${measured.input_lra}:measured_thresh=${measured.input_thresh}:offset=${measured.target_offset}:linear=true:print_format=summary`;
}

/** The measurement out of ffmpeg's stderr, or null. */
export function parseLoudnorm(stderr: string): Loudness | null {
  const blocks = stderr.match(/\{[^{}]*"input_i"[^{}]*\}/g);
  if (!blocks) return null;
  try {
    const j = JSON.parse(blocks[blocks.length - 1]);
    const keys = ["input_i", "input_tp", "input_lra", "input_thresh", "target_offset"] as const;
    if (!keys.every((k) => typeof j[k] === "string")) return null;
    return { input_i: j.input_i, input_tp: j.input_tp, input_lra: j.input_lra, input_thresh: j.input_thresh, target_offset: j.target_offset };
  } catch {
    return null;
  }
}

// ---- where the voice is heard ---------------------------------------------------

/** silencedetect's report → the stretches between the quiet gaps, in ms. The
 *  last stretch runs to the last quiet gap's start, or on to END when the file
 *  ends while someone is still talking. */
export function islandsFrom(stderr: string): [number, number][] {
  const out: [number, number][] = [];
  let from = 0;
  for (const m of stderr.matchAll(/silence_(start|end): (-?[\d.]+)/g)) {
    const t = Math.max(0, parseFloat(m[2]) * 1000);
    if (!Number.isFinite(t)) continue;
    if (m[1] === "start") {
      if (Number.isFinite(from) && t - from > 30) out.push([Math.round(from), Math.round(t)]);
      from = NaN;
    } else from = t;
  }
  if (Number.isFinite(from)) out.push([Math.round(from), END * 1000]);
  return out;
}

// ---- the whole speech graph ----------------------------------------------------

export interface SpeechInput {
  job: PostJob;
  segments: Seg[];
  caps: Caps;
  /** "measure": ends in a loudness measurement (output to null).
   *  "apply":   ends in the finished speech. */
  mode: "measure" | "apply";
  measured?: Loudness | null;
  /** Length of the narration; the result is padded or trimmed to exactly this. */
  durationSec?: number | null;
  /** Swear clean-up: the stretches (seconds) to bleep or mute (swearWindows). */
  censor?: { kind: "bleep" | "mute"; windows: [number, number][] } | null;
}

export interface SpeechGraph {
  /** A -filter_complex graph from the narration's audio to [out]. */
  graph: string;
  warnings: string[];
  /** Speakers given their own branch. */
  branches: string[];
  /** How many times the narration is given as an input (-i), one per branch. */
  inputs: number;
}

/** The -i arguments a speech graph needs. */
export function speechInputs(file: string, g: SpeechGraph): string[] {
  return Array.from({ length: g.inputs }, () => ["-i", file]).flat();
}

/** Turn the post settings into one filter graph for the speech. */
export function speechGraph(input: SpeechInput): SpeechGraph {
  const { job, caps } = input;
  const warnings: string[] = [];
  const missing = new Set<string>();
  const windows = speakerWindows(input.segments);
  const speaking = [...windows.keys()];
  // Left/right only means something with two or more voices.
  const pan = job.stereo.on && speaking.length > 1;
  const voiceOf = new Map(job.voices.map((v) => [v.speakerId, v]));
  const needsOwn = (id: string) => {
    const v = voiceOf.get(id);
    return !!v && (!voiceIsFlat(v.character) || (pan && panGains(v.x, job.stereo.amount).left + panGains(v.x, job.stereo.amount).right < 2));
  };
  const own = speaking.filter(needsOwn);
  const parts: string[] = [];
  let mixed: string;
  let inputs = 1;

  if (!own.length) {
    parts.push(`[0:a]aresample=${RATE},aformat=channel_layouts=mono,pan=stereo|c0=c0|c1=c0[mix]`);
    mixed = "mix";
  } else {
    // Everyone not given their own branch shares one plain branch.
    const rest = speaking.filter((id) => !own.includes(id));
    const branches = [...own.map((id) => ({ id, win: windows.get(id)! })), ...(rest.length ? [{ id: "", win: rest.flatMap((id) => windows.get(id)!) }] : [])];
    // Each branch reads the narration as its own input rather than splitting
    // one: the cut-down ffmpeg has no asplit, and reading a WAV twice is free.
    inputs = branches.length;
    // short audio frames, so a mute starts and ends within 10 ms of the cut
    const fine = caps.has("asetnsamples") ? `,asetnsamples=n=${RATE / 100}` : "";
    branches.forEach((b, i) => {
      const chain: string[] = [`aresample=${RATE}`, `aformat=channel_layouts=mono${fine}`, `volume=volume=0:enable='not(${windowExpr(b.win)})'`];
      const v = b.id ? voiceOf.get(b.id) : undefined;
      if (v) {
        const built = voiceChain(voiceParams(v.character), caps);
        chain.push(...built.filters);
        built.missing.forEach((m) => missing.add(m));
      }
      const g = v && pan ? panGains(v.x, job.stereo.amount) : { left: 1, right: 1 };
      chain.push(`aresample=${RATE}`, `pan=stereo|c0=${n3(g.left)}*c0|c1=${n3(g.right)}*c0`);
      parts.push(`[${i}:a]${chain.join(",")}[b${i}]`);
    });
    if (branches.length === 1) mixed = "b0";
    else {
      parts.push(`${branches.map((_, i) => `[b${i}]`).join("")}amix=inputs=${branches.length}:normalize=0:duration=longest[mix]`);
      mixed = "mix";
    }
  }

  const tail: string[] = [];
  // SWEAR CLEAN-UP, part 1: the words go silent before studio sound. Only in
  // the writing pass: the loudness is measured on the whole voice, so the
  // voice comes out exactly as loud as without clean-up (measuring with the
  // gaps in left it 1.5 dB quiet on a test line, 19 Nov 2026). A bleep is
  // added after (part 2).
  const censor = input.mode === "apply" && input.censor && input.censor.windows.length ? input.censor : null;
  let bleep = false;
  if (censor) {
    if (caps.has("asetnsamples")) tail.push(`asetnsamples=n=${RATE / 100}`);
    tail.push(`volume=volume=0:enable='${windowExpr(censor.windows)}'`);
    if (censor.kind === "bleep") {
      if (caps.has("sine")) bleep = true;
      else warnings.push("[video-forge] post-production: this ffmpeg has no sine, so the swear words were muted instead of bleeped.");
    }
  }
  if (job.studioSound) {
    const st = studioChain(caps);
    tail.push(...st.filters);
    st.missing.forEach((m) => missing.add(m));
    if (caps.has("loudnorm")) {
      if (input.mode === "measure") tail.push(loudnormFilter(null, true));
      else tail.push(loudnormFilter(input.measured ?? null));
    } else missing.add("loudnorm");
  }
  if (input.mode === "apply") {
    tail.push(`aresample=${RATE}`);
    // Clock restarted from the samples themselves: loudnorm can hand its audio
    // on with timestamps that start late, and the trim below goes by
    // timestamp — it cut 0.1 s off the end on ffmpeg 7.1 (17 Nov 2026). The
    // sound itself is not moved: measured to the sample on a test tone.
    if (caps.has("asetpts")) tail.push("asetpts=N/SR/TB");
    const d = input.durationSec;
    if (d && d > 0 && caps.has("apad") && caps.has("atrim")) tail.push(`apad=whole_dur=${n3(d)}`, `atrim=end=${n3(d)}`);
    tail.push("aformat=sample_fmts=s16:channel_layouts=stereo");
  }
  if (bleep) {
    // part 2: a 1 kHz tone, heard only over the muted words. ffmpeg's tone is
    // 1/8 full scale; ×1.4 puts it near -18 dB, a little under a -14 LUFS voice,
    // so it reads as a bleep, not an alarm.
    const end = input.durationSec && input.durationSec > 0 ? input.durationSec : Math.max(...censor!.windows.map((w) => w[1])) + 1;
    parts.push(`[${mixed}]${tail.join(",")}[speech]`);
    parts.push(
      `sine=frequency=1000:sample_rate=${RATE}:duration=${n3(end)},volume=volume=1.4,` +
        `volume=volume=0:enable='not(${windowExpr(censor!.windows)})',pan=stereo|c0=c0|c1=c0,aformat=sample_fmts=s16:channel_layouts=stereo[tone]`,
    );
    parts.push(`[speech][tone]amix=inputs=2:normalize=0:duration=first,aformat=sample_fmts=s16:channel_layouts=stereo[out]`);
  } else {
    parts.push(`[${mixed}]${tail.length ? tail.join(",") : "anull"}[out]`);
  }

  if (missing.size) {
    warnings.push(
      `[video-forge] post-production: this ffmpeg has no ${[...missing].sort().join(", ")}, so part of the sound treatment was left out. ` +
        "Install a full ffmpeg (for example the gyan.dev build) to get all of it.",
    );
  }
  return { graph: parts.join(";\n"), warnings, branches: own, inputs };
}

// ---- the colour grade ----------------------------------------------------------

/** The video filter for the grade, or null when there is nothing to do (or
 *  this ffmpeg cannot do it — then a warning says so). `lutFile` is the LUT's
 *  name inside the folder ffmpeg runs in (a plain name: no escaping needed). */
export function gradeFilter(
  grade: PostJob["grade"],
  caps: Caps,
  lutFile: string | null,
): { filter: string | null; warnings: string[] } {
  const warnings: string[] = [];
  const f: string[] = [];
  if (!grade.on) return { filter: null, warnings };
  if (lutFile) {
    if (!/^[\w.-]+$/.test(lutFile)) throw new Error("LUT file name must be a plain name");
    if (caps.has("lut3d")) f.push(`lut3d=file=${lutFile}:interp=tetrahedral`);
    else warnings.push("[video-forge] post-production: this ffmpeg has no lut3d, so the colour LUT was left out.");
  }
  const c = Math.min(1.5, Math.max(0.5, grade.contrast));
  const s = Math.min(2, Math.max(0, grade.saturation));
  if (Math.abs(c - 1) > 0.001 || Math.abs(s - 1) > 0.001) {
    if (caps.has("eq")) f.push(`eq=contrast=${n3(c)}:saturation=${n3(s)}`);
    else warnings.push("[video-forge] post-production: this ffmpeg has no eq, so contrast and saturation were left out.");
  }
  if (!f.length) return { filter: null, warnings };
  f.push("format=yuv420p");
  return { filter: f.join(","), warnings };
}
