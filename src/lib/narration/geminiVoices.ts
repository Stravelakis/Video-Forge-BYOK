// The Gemini voice choices, shared by the engine (electron/tts/geminiEngine.ts)
// and the pickers in the app. Ak's picks, 10 Oct 2026 — docs/V2-NEEDS.md.

export type GeminiMode = "live" | "tts";

export interface GeminiModelChoice {
  id: string;
  mode: GeminiMode;
  label: string;
}

/** Live first: unlimited on the free tier, and Ak loved both. */
export const GEMINI_MODELS: GeminiModelChoice[] = [
  { id: "gemini-2.5-flash-native-audio-latest", mode: "live", label: "Gemini 2.5 Native Audio — free, unlimited" },
  { id: "gemini-3.1-flash-live-preview", mode: "live", label: "Gemini 3.1 Flash Live — free, unlimited" },
  { id: "gemini-3.8-flash-tts", mode: "tts", label: "Gemini 3.8 Flash TTS — 10 lines a day free" },
  { id: "gemini-3.1-flash-tts-preview", mode: "tts", label: "Gemini 3.1 Flash TTS — 10 lines a day free" },
  { id: "gemini-3.8-flash-lite-tts", mode: "tts", label: "Gemini 3.8 Flash-Lite TTS — 10 lines a day free" },
];

export const DEFAULT_GEMINI_MODEL = GEMINI_MODELS[0].id;
export const DEFAULT_GEMINI_VOICE = "Kore";

/** Google's prebuilt voices, by how they come across (Google's own words). Male or female from
 *  Google's Chirp 3 HD voice list (cloud.google.com/text-to-speech/docs/chirp3-hd, read 11 Nov 2026);
 *  Google offers no intersex voice. */
export const GEMINI_VOICES: { name: string; gender: "male" | "female"; feel: string }[] = [
  { name: "Kore", gender: "female", feel: "firm" }, { name: "Aoede", gender: "female", feel: "breezy" }, { name: "Leda", gender: "female", feel: "youthful" },
  { name: "Zephyr", gender: "female", feel: "bright" }, { name: "Callirrhoe", gender: "female", feel: "easy-going" }, { name: "Autonoe", gender: "female", feel: "bright" },
  { name: "Despina", gender: "female", feel: "smooth" }, { name: "Erinome", gender: "female", feel: "clear" }, { name: "Laomedeia", gender: "female", feel: "upbeat" },
  { name: "Achernar", gender: "female", feel: "soft" }, { name: "Gacrux", gender: "female", feel: "mature" }, { name: "Pulcherrima", gender: "female", feel: "forward" },
  { name: "Vindemiatrix", gender: "female", feel: "gentle" }, { name: "Sulafat", gender: "female", feel: "warm" },
  { name: "Puck", gender: "male", feel: "upbeat" }, { name: "Charon", gender: "male", feel: "informative" }, { name: "Fenrir", gender: "male", feel: "excitable" },
  { name: "Orus", gender: "male", feel: "firm" }, { name: "Enceladus", gender: "male", feel: "breathy" }, { name: "Iapetus", gender: "male", feel: "clear" },
  { name: "Umbriel", gender: "male", feel: "easy-going" }, { name: "Algieba", gender: "male", feel: "smooth" }, { name: "Algenib", gender: "male", feel: "gravelly" },
  { name: "Rasalgethi", gender: "male", feel: "informative" }, { name: "Alnilam", gender: "male", feel: "firm" }, { name: "Schedar", gender: "male", feel: "even" },
  { name: "Achird", gender: "male", feel: "friendly" }, { name: "Zubenelgenubi", gender: "male", feel: "casual" }, { name: "Sadachbia", gender: "male", feel: "lively" },
  { name: "Sadaltager", gender: "male", feel: "knowledgeable" },
];

export function geminiModeOf(modelId: string | undefined): GeminiMode {
  return GEMINI_MODELS.find((m) => m.id === modelId)?.mode ?? "live";
}

export type VoiceEngine = "gemini" | "fish" | "elevenlabs" | "piper";

/** Which engine a speaker really uses. DramaBox was retired on 10 Oct 2026
 *  (it needed a rented Google Cloud GPU), so old projects that still say
 *  "dramabox" — or say nothing — get the free default instead. */
export function engineOf(sp: { ttsEngine?: string }): VoiceEngine {
  return sp.ttsEngine === "elevenlabs" || sp.ttsEngine === "piper" || sp.ttsEngine === "fish" ? sp.ttsEngine : "gemini";
}
