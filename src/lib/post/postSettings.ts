// ---------------------------------------------------------------------------
// Post-production: the settings, the voice character presets, and the panning
// maths. Shared by the screens (Render step, Cast) and the render itself
// (electron/post), so the numbers a slider shows are the numbers ffmpeg gets.
//
// WHAT POST-PRODUCTION IS (17 Nov 2026, plan A4 + items 1, 1b, 2, 3). One step
// after every render, in-app, batch and --job alike:
//   - studio sound on the speech: low rumble cut, gentle compression, light
//     de-ess, loudness to -14 LUFS with peaks under -1 dB
//   - a voice character per speaker (chibi, warm narrator, radio…)
//   - voices placed a little left or right, from where each one stands
//   - a colour grade: a .cube LUT plus contrast and saturation
//
// HONEST LIMIT, said in the hover help too: a voice character changes the
// SOUND of a voice (pitch, the size of the "throat", brightness, room). It
// cannot change the acting. Sadness, joy and timing come from the voice engine.
//
// No runtime imports on purpose: tools/lib/postProduction.test.mjs runs this
// file directly.
// ---------------------------------------------------------------------------

export type VoicePresetId = "natural" | "chibi" | "bright" | "warm" | "deep" | "radio";

/** One speaker's voice character: a preset plus three plain sliders on top. */
export interface VoiceCharacter {
  preset: VoicePresetId;
  /** Extra pitch in semitones, −4…+4, on top of the preset's. */
  pitch: number;
  /** Darker (−1) to brighter (+1), on top of the preset's. */
  brightness: number;
  /** Air and shine on the top end, 0…1, on top of the preset's. */
  sparkle: number;
}

export interface PostSettings {
  /** Studio sound on the speech (see the top of this file). */
  studioSound: boolean;
  /** Voices a little left or right, from where each speaker stands on screen.
   *  `amount` 0…1 of the most it ever moves (MAX_PAN). Off for one speaker. */
  stereo: { on: boolean; amount: number };
  /** The colour grade, applied once to the finished picture. */
  grade: { on: boolean; lutPath: string | null; contrast: number; saturation: number };
}

/** At most this much of a voice leaves the far speaker (30%): subtle on
 *  purpose, so headphones never feel lopsided. */
export const MAX_PAN = 0.3;

/** A new project: studio sound on, everything else off. */
export function defaultPost(): PostSettings {
  return {
    studioSound: true,
    stereo: { on: false, amount: 0.6 },
    grade: { on: false, lutPath: null, contrast: 1, saturation: 1 },
  };
}

/** A project saved before post-production existed: nothing changes its sound
 *  or picture until the user turns something on. */
export function postOff(): PostSettings {
  return { ...defaultPost(), studioSound: false };
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const fin = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) ? v : d);

/** Post settings read from a file or the autosave, in the shape the app uses.
 *  Missing (an older project) = everything off. */
export function cleanPost(v: unknown): PostSettings {
  const off = postOff();
  if (!v || typeof v !== "object") return off;
  const o = v as { studioSound?: unknown; stereo?: { on?: unknown; amount?: unknown }; grade?: { on?: unknown; lutPath?: unknown; contrast?: unknown; saturation?: unknown } };
  return {
    studioSound: o.studioSound === true,
    stereo: {
      on: o.stereo?.on === true,
      amount: clamp(fin(o.stereo?.amount, off.stereo.amount), 0, 1),
    },
    grade: {
      on: o.grade?.on === true,
      lutPath: typeof o.grade?.lutPath === "string" && o.grade.lutPath ? o.grade.lutPath : null,
      contrast: clamp(fin(o.grade?.contrast, 1), 0.5, 1.5),
      saturation: clamp(fin(o.grade?.saturation, 1), 0, 2),
    },
  };
}

// ---- voice character presets ------------------------------------------------

/** What a preset does, in sound terms. All in plain units ffmpeg takes. */
export interface VoiceParams {
  /** Pitch change, semitones. */
  pitch: number;
  /** Formant ("throat size") change, semitones: up = smaller and younger,
   *  down = bigger. Needs rubberband; without it the formants move with the pitch. */
  formant: number;
  /** dB at 3 kHz (presence). */
  bright: number;
  /** dB at 10 kHz (air, sparkle). */
  air: number;
  /** dB at 200 Hz (warmth, chest). */
  warmth: number;
  /** 0…1, a light doubling. */
  chorus: number;
  /** 0…1, a touch of room. */
  room: number;
  /** Telephone/radio band, Hz; absent = full range. */
  band?: [number, number];
}

const FLAT: VoiceParams = { pitch: 0, formant: 0, bright: 0, air: 0, warmth: 0, chorus: 0, room: 0 };

export interface VoicePreset {
  id: VoicePresetId;
  label: string;
  /** Hover help: what it does, in plain words. */
  help: string;
  params: VoiceParams;
}

export const VOICE_PRESETS: VoicePreset[] = [
  {
    id: "natural",
    label: "Natural (off)",
    help: "The voice exactly as the voice engine made it. The sliders below still work.",
    params: FLAT,
  },
  {
    id: "chibi",
    label: "Chibi / bubbly",
    help: "Higher and smaller, like a cartoon: pitch up 4 steps with a smaller throat, a bright shine and a light doubling.",
    params: { pitch: 4, formant: 4, bright: 3, air: 3, warmth: -1, chorus: 0.5, room: 0 },
  },
  {
    id: "bright",
    label: "Bright and young",
    help: "A little younger and clearer: pitch up a step and a half, a slightly smaller throat, more presence and air.",
    params: { pitch: 1.5, formant: 2, bright: 2, air: 2, warmth: 0, chorus: 0, room: 0 },
  },
  {
    id: "warm",
    label: "Warm narrator",
    help: "Calm and close, like an audiobook: a touch lower, more chest, softer top end and a hint of a small room.",
    params: { pitch: -1, formant: -0.5, bright: -1, air: -1, warmth: 3, chorus: 0, room: 0.25 },
  },
  {
    id: "deep",
    label: "Deep and dramatic",
    help: "Big and serious, like a trailer: pitch down 3 steps with a bigger throat, strong chest and a larger room.",
    params: { pitch: -3, formant: -2, bright: -1, air: 0, warmth: 4, chorus: 0, room: 0.5 },
  },
  {
    id: "radio",
    label: "Radio",
    help: "An old radio or phone: only the middle of the voice is kept, with a forward, boxy edge.",
    params: { pitch: 0, formant: 0, bright: 4, air: 0, warmth: 0, chorus: 0, room: 0, band: [300, 3400] },
  },
];

export const VOICE_CHARACTER_HELP =
  "Changes the SOUND of this voice after it is made: higher or lower, a smaller or bigger throat, brighter or warmer, a touch of room. " +
  "It does not change the acting: feelings and timing come from the voice itself.";

export function naturalVoice(): VoiceCharacter {
  return { preset: "natural", pitch: 0, brightness: 0, sparkle: 0 };
}

/** A speaker's voice character read from anywhere; anything odd becomes natural. */
export function cleanVoiceCharacter(v: unknown): VoiceCharacter {
  const n = naturalVoice();
  if (!v || typeof v !== "object") return n;
  const o = v as Partial<Record<keyof VoiceCharacter, unknown>>;
  const preset = VOICE_PRESETS.some((p) => p.id === o.preset) ? (o.preset as VoicePresetId) : "natural";
  return {
    preset,
    pitch: clamp(fin(o.pitch, 0), -4, 4),
    brightness: clamp(fin(o.brightness, 0), -1, 1),
    sparkle: clamp(fin(o.sparkle, 0), 0, 1),
  };
}

/** The preset's sound with the three sliders added on top. */
export function voiceParams(v: VoiceCharacter | null | undefined): VoiceParams {
  const c = cleanVoiceCharacter(v);
  const base = VOICE_PRESETS.find((p) => p.id === c.preset)?.params ?? FLAT;
  return {
    ...base,
    // the Pitch slider moves the note only: the throat stays where the preset put it
    pitch: base.pitch + c.pitch,
    bright: base.bright + c.brightness * 4,
    air: base.air + c.sparkle * 5,
  };
}

/** Does this voice character change anything at all? */
export function voiceIsFlat(v: VoiceCharacter | null | undefined): boolean {
  const p = voiceParams(v);
  return !p.pitch && !p.formant && !p.bright && !p.air && !p.warmth && !p.chorus && !p.room && !p.band;
}

// ---- left / right -----------------------------------------------------------

/** Gains for the left and right speaker for a voice standing at `x` (0 = left
 *  edge of the picture, 1 = right edge). Balance, not a full pan: the near side
 *  stays at full level and only the far side drops, by at most MAX_PAN × amount,
 *  so a voice never gets louder by being moved. */
export function panGains(x: number, amount: number): { left: number; right: number } {
  const pos = clamp((fin(x, 0.5) - 0.5) * 2, -1, 1) * clamp(fin(amount, 0), 0, 1) * MAX_PAN;
  return {
    left: round4(1 - Math.max(0, pos)),
    right: round4(1 - Math.max(0, -pos)),
  };
}

const round4 = (v: number) => Math.round(v * 10000) / 10000;

// ---- what the render is given ------------------------------------------------

/** What renderVideo needs to do post-production: the settings, plus each
 *  speaker's voice character and place. Built by postJobFor from the project
 *  in BOTH callers (the Render step and the batch), so nothing is hand-copied. */
export interface PostJob {
  studioSound: boolean;
  stereo: { on: boolean; amount: number };
  grade: { on: boolean; lutPath: string | null; contrast: number; saturation: number };
  voices: { speakerId: string; x: number; character: VoiceCharacter }[];
}

export function postJobFor(
  post: PostSettings | null | undefined,
  speakers: { id: string; x: number; voiceCharacter?: VoiceCharacter | null }[],
): PostJob {
  const p = cleanPost(post);
  return {
    ...p,
    voices: speakers.map((sp) => ({ speakerId: sp.id, x: fin(sp.x, 0.5), character: cleanVoiceCharacter(sp.voiceCharacter) })),
  };
}

/** A post job from a render request, every field checked (a project file is
 *  only as trustworthy as where it came from). */
export function cleanPostJob(v: unknown): PostJob | null {
  if (!v || typeof v !== "object") return null;
  const voices = Array.isArray((v as { voices?: unknown }).voices) ? ((v as { voices: unknown[] }).voices) : [];
  return postJobFor(
    v as PostSettings,
    voices
      .filter((x): x is { speakerId: string; x?: unknown; character?: unknown } => !!x && typeof (x as { speakerId?: unknown }).speakerId === "string")
      .map((x) => ({ id: x.speakerId, x: fin(x.x, 0.5), voiceCharacter: x.character as VoiceCharacter })),
  );
}

/** Is the colour grade going to change the picture? */
export function gradeIsActive(g: PostJob["grade"] | null | undefined): boolean {
  if (!g?.on) return false;
  return !!g.lutPath || Math.abs(g.contrast - 1) > 0.001 || Math.abs(g.saturation - 1) > 0.001;
}

/** Will the speech be touched at all? */
export function speechIsActive(j: PostJob | null | undefined): boolean {
  if (!j) return false;
  return j.studioSound || j.stereo.on || j.voices.some((v) => !voiceIsFlat(v.character));
}
