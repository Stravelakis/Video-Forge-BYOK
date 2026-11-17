// ---------------------------------------------------------------------------
// Google Flow, step by step (Ak, 10 Nov 2026): the app's AI writes PROPER
// prompts for a background picture, then suggests what could move in that
// picture, then writes the prompt that turns it into a seamless looping video.
// These are the instructions the AI gets and the readers for its answers.
// Pure: tested in node.
// ---------------------------------------------------------------------------

export const LOOKS: { id: string; name: string; words: string }[] = [
  { id: "match", name: "Match my characters", words: "" },
  { id: "flat", name: "Flat cartoon", words: "flat 2D vector cartoon illustration, clean shapes, soft flat shading, limited harmonious palette" },
  { id: "toy3d", name: "Soft 3D", words: "soft stylised 3D render, rounded toy-like shapes, gentle global illumination, animated-film look" },
  { id: "storybook", name: "Storybook", words: "storybook illustration, gouache and watercolour texture, warm hand-painted detail" },
  { id: "painterly", name: "Painterly", words: "painterly digital painting, visible brush strokes, rich colour, cinematic composition" },
  { id: "photo", name: "Real photo", words: "photorealistic interior photograph, natural light, 35mm lens, shallow depth of field kept mild" },
];

const SYSTEM = "You are an expert prompt writer for Google Flow (Google's Imagen / Nano Banana pictures and Veo video). You answer with one JSON object only.";

/** Step 3: the picture prompt. */
export function imagePromptRequest(o: { place: string; look: string; aspect: string; mood?: string }) {
  return {
    system: SYSTEM,
    user: `Write the prompt for ONE background picture for a talking-character video. Characters are added later by another program, so the picture must be EMPTY of people.

Place described by the user: ${o.place.slice(0, 800)}
Art style: ${o.look.slice(0, 300)}
Shape: ${o.aspect} ${o.aspect === "9:16" ? "(tall, phone)" : o.aspect === "16:9" ? "(wide)" : ""}
${o.mood ? `Mood: ${o.mood.slice(0, 200)}` : ""}

A good prompt is one rich paragraph (70-130 words) in this order: shot and camera (eye-level, wide establishing shot, locked camera), the place and its main features, 3-6 concrete details that make it feel real, light (source, time of day, colour), colour palette, art style words, and the empty middle ground: "the centre and the floor in front are clear and uncluttered for characters to stand". End with: "No people, no animals, no text, no logos, no watermarks."
Avoid: vague words (beautiful, amazing), people, writing on signs, extreme wide-angle distortion.

JSON: {"title":"2-4 word name","prompt":"the paragraph","avoid":"comma list of things to keep out"}`,
  };
}

/** Step 4a: what could move in that picture, for a loop. */
export function motionIdeasRequest(imagePrompt: string) {
  return {
    system: SYSTEM,
    user: `This picture will be animated into a short SEAMLESS LOOP used behind talking characters:
"""${imagePrompt.slice(0, 1500)}"""

Suggest 6 small, natural movements that fit THIS picture (look at what is in it: windows, curtains, plants, lights, water, screens, steam, clocks, skies). Each must be gentle, repeat naturally, and never draw attention away from the characters. At most one living thing (a bird outside a window, a cat's tail) and only if it fits.

JSON: {"ideas":[{"label":"3-5 words","motion":"one sentence describing exactly what moves and how","strength":"subtle"|"medium"}]}`,
  };
}

/** Step 4b: the video prompt for the chosen movements. */
export function videoPromptRequest(imagePrompt: string, chosen: string[], seconds = 8) {
  return {
    system: SYSTEM,
    user: `Write the Veo prompt (Google Flow, "Frames to Video") that animates this picture into a SEAMLESS LOOP:
"""${imagePrompt.slice(0, 1500)}"""

Movements to include, and nothing else: ${chosen.map((c) => `- ${c}`).join("\n").slice(0, 1500)}

Rules: the camera does not move at all (locked-off tripod shot); the scene stays empty of people; lighting and colours stay exactly as in the picture; every movement is gentle and cyclical so the last frame matches the first; ${seconds} seconds; no new objects appear; no text. One paragraph, 50-90 words.

JSON: {"prompt":"the paragraph"}`,
  };
}

const parse = (raw: string): Record<string, unknown> | null => {
  try { const j = JSON.parse(String(raw).replace(/^```(?:json)?\s*|\s*```\s*$/g, "")); return j && typeof j === "object" ? j : null; } catch { return null; }
};
const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export function readImagePrompt(raw: string): { title: string; prompt: string; avoid: string } | null {
  const j = parse(raw); const prompt = text(j?.prompt, 2000);
  if (!prompt || prompt.split(/\s+/).length < 25) return null;
  return { title: text(j?.title, 40) || "Background", prompt, avoid: text(j?.avoid, 300) };
}

export function readIdeas(raw: string): { label: string; motion: string; strength: "subtle" | "medium" }[] {
  const j = parse(raw); const list = Array.isArray(j?.ideas) ? (j!.ideas as Record<string, unknown>[]) : [];
  return list.map((x) => ({ label: text(x?.label, 40), motion: text(x?.motion, 240), strength: x?.strength === "medium" ? "medium" as const : "subtle" as const })).filter((x) => x.label && x.motion).slice(0, 8);
}

export function readVideoPrompt(raw: string): string | null {
  const p = text(parse(raw)?.prompt, 1500);
  return p.split(/\s+/).length >= 20 ? p : null;
}
