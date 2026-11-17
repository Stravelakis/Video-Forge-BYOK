// Every character style the app can render today, with plain pros and cons.
// The looks come from characters/core/looks.mjs; this adds what a person needs to choose.
import type { FlowStyle } from "../../store/useFlowStore";

export interface StyleInfo { id: string; style: FlowStyle; group: string; name?: string; pros: string[]; cons: string[] }

const drawn = (look: string, group: string, pros: string[], cons: string[]): StyleInfo => ({ id: look, style: { family: "drawn", look }, group, pros, cons });

export const GROUPS = [
  { id: "3d", title: "3D characters", sub: "Real models with moods, a big motion library and props in hand." },
  { id: "flat", title: "Drawn: clean and modern", sub: "Drawn by the app, frame by frame. Full movement, any colours." },
  { id: "era", title: "Drawn: history and folk", sub: "Old film, ancient art, Greek shadow theatre." },
  { id: "medium", title: "Drawn: art materials", sub: "Chalk, paper, ink, glass, neon." },
  { id: "puppet", title: "Picture puppets", sub: "Made as pictures in Image Forge: the richest detail, the least movement." },
];

export const STYLES: StyleInfo[] = [
  { id: "3d-animated", style: { family: "3d", set: "animated" }, group: "3d", name: "3D Humans", pros: ["Elbows, knees and fingers that really move", "349 motions, from talking to sword fights", "Props, moods and real-place lighting"], cons: ["One body shape per gender", "Toy-like, not realistic"] },
  { id: "3d-mini", style: { family: "3d", set: "mini" }, group: "3d", name: "3D Mini people", pros: ["Charming and chunky, reads well when small", "20 ready-made people", "Holds props"], cons: ["About 30 simple motions", "Big heads, so it's never serious"] },
  { id: "3d-pets", style: { family: "3d", set: "pets" }, group: "3d", name: "3D Pets", pros: ["24 animals that talk, made for the dog channel", "Ears, tails, wings and claws show the mood", "Can carry things in the mouth"], cons: ["No hands or gestures", "Cute only: wrong for serious stories"] },

  drawn("stick", "flat", ["Instantly reads as a storytime channel", "Very clear at phone size"], ["Plain: needs a good script", "Little personality in the bodies"]),
  drawn("geo", "flat", ["Calm, modern, premium", "Works on any background"], ["No outlines, so it can blur into busy footage"]),
  drawn("corp", "flat", ["Looks like explainer and startup videos", "Long limbs make gestures easy to read"], ["Tiny heads: faces and lip sync are hard to see", "Feels corporate"]),
  drawn("sticker", "flat", ["Bold, friendly, stands out on anything", "Faces read clearly"], ["The sticker edge can feel childish", "Seen everywhere on YouTube"]),
  drawn("pop", "flat", ["Loud and funny, great for drama", "Halftone dots look printed"], ["Tiring over long videos"]),
  drawn("sitcom", "flat", ["Big expressive eyes, made for comedy", "Familiar and warm"], ["Close to well-known cartoon shows, so keep characters original"]),
  drawn("mid", "flat", ["Stylish 1950s design feel", "Elegant in explainers"], ["Thin lines get lost on footage"]),

  drawn("hose", "era", ["Vintage black-and-white charm with film grain", "Bendy limbs are fun to watch"], ["Dated look limits topics", "Pie eyes hide the emotion"]),
  drawn("hose2", "era", ["Warm old-colour film feel", "Great for flashbacks"], ["A strong style that can overpower the story"]),
  drawn("vase", "era", ["Unique: ancient Greek pottery brought to life", "Perfect for myths and history"], ["Best side-on", "Two colours only"]),
  drawn("shadow", "era", ["Dramatic silhouettes", "Strong for fables and dark stories"], ["Only eyes and mouth show expression", "Best side-on"]),
  drawn("karag", "era", ["Authentically Greek shadow theatre, painted leather", "Nobody else has this"], ["Side-on only", "Small faces; lip sync is subtle"]),
  drawn("karagblack", "era", ["The older, darker Karagiozis look", "Beautiful with lamp light"], ["Side-on only", "Very little facial detail"]),

  drawn("chalk", "medium", ["Feels like a lesson", "Light on dark, very readable"], ["Outline only: no filled colours"]),
  drawn("paper", "medium", ["Handmade and warm, with real texture", "Soft shadows give depth"], ["Gentle wobble can distract in long talks"]),
  drawn("riso", "medium", ["Trendy print look, bright inks", "Distinctive thumbnails"], ["Limited colours"]),
  drawn("neon", "medium", ["Striking on dark night scenes", "Great for tech and thrillers"], ["Needs a dark background", "Outline only"]),
  drawn("noir", "medium", ["Heavy shadows and tension", "One spot colour focuses attention"], ["Dark mood only"]),
  drawn("glass", "medium", ["Rich jewel colours, glowing", "Perfect for legends and D&D"], ["Thick lead lines hide small facial detail"]),
  drawn("notebook", "medium", ["Doodled feel, honest and casual", "Great for personal stories"], ["Blue only; the line wobbles by design"]),
  drawn("blueprint", "medium", ["Technical and clever", "Great for how-things-work"], ["Cold; little warmth for feelings"]),

  { id: "puppet", style: { family: "puppet" }, group: "puppet", name: "Picture puppets", pros: ["Richest detail: Pixar-like, clay, photo, anime and more", "Each one made to order in Image Forge"], cons: ["Only a few arm poses", "Walking is a bob, not real steps", "Each new character costs image generation time"] },
];

export const styleOf = (s: FlowStyle | null): StyleInfo | undefined =>
  !s ? undefined : STYLES.find((x) => (s.family === "drawn" ? x.style.family === "drawn" && x.style.look === s.look : s.family === "3d" ? x.style.family === "3d" && x.style.set === s.set : x.style.family === "puppet"));
