// ---------------------------------------------------------------------------
// Which AI writes the directions (the Direct step's ✨ Suggest).
//
// Any provider with a saved key can do it; "auto" tries them best first and
// keeps the first that answers. The order and the model families come from a
// test on 10 Nov 2026: the app's real directing prompt on a 10-line Greek
// script, 2 runs per model, checked by the same code that checks the app's
// answers (src/lib/direct/suggest.ts). See docs/HANDOFF.md, "AI directing".
// Families, not exact ids: each key's own model list decides the exact name.
// ---------------------------------------------------------------------------

import * as keyStore from "../keyStore";
import { geminiJson } from "./geminiText";
import { withGeminiKey } from "../geminiKeys";
import { PROVIDERS, chat, listModels, setCustomBase } from "../../tools/lib/explainerLlm.mjs";

/** Best first. Gemini goes through geminiJson, which has its own model order. */
export const AUTO_ORDER = ["gemini", "custom", "openrouter", "nvidia", "groq", "cerebras", "mistral", "openai"] as const;

/** Model families to try per provider, best first. */
//   10 Nov results (Greek 10-line script, 4 story checks each):
//   gpt-oss-120b      richest and most "cinematic" (push in on the serious line), all checks; slow on free routes (2.5 min)
//   nemotron-3-ultra  nearly as good, all checks; 1.5 min or timed out
//   gemini-3.5-flash-lite  2 s, all checks once, one odd action pick
//   qwen3.8-27b       2 s, all checks, but sparing: mostly feelings, little camera
//   gemini 3.x Flash, gemma-4, mistral, cerebras, groq: over quota / rate-limited / 402 that day, not judged
export const DIRECT_HINTS: Record<string, string[]> = {
  custom: ["gemini-3.6-flash", "gemini-3-flash", "gemini-3.5-flash", "gpt-oss-120b", "nemotron-3-ultra", "qwen3.8", "qwen3", "gemma-4", "llama"],
  openrouter: ["google/gemini-3.6-flash", "google/gemini-3.5-flash", "openai/gpt-oss-120b", "nvidia/nemotron-3-ultra", "google/gemma-4-31b", "qwen/qwen3"],
  nvidia: ["gpt-oss-120b", "qwen3.8", "qwen3", "minimax-m3", "llama-3.3"],
  groq: ["openai/gpt-oss-120b", "kimi-k2", "llama-3.3"],
  cerebras: ["gpt-oss-120b", "qwen-3", "llama"],
  mistral: ["mistral-medium", "mistral-large", "mistral-small"],
  openai: ["gpt-5.5-mini", "gpt-5-mini", "gpt-5"],
};

/** The custom server's address lives beside its key; the chat layer needs it set. */
export async function syncCustomServer(): Promise<void> {
  setCustomBase(await keyStore.getKey("custom-url"));
}

/** The models to try on one key, best first: its own list matched to the hints. */
const lists = new Map<string, string[]>();
const worked = new Map<string, string>();
async function modelsFor(provider: string, key: string): Promise<string[]> {
  let ids = lists.get(provider);
  if (!ids) { ids = await listModels(provider, key); lists.set(provider, ids); }
  const out: string[] = [];
  for (const h of DIRECT_HINTS[provider] ?? []) {
    const hit = ids.find((id) => id === h) ?? ids.find((id) => id.includes(h));
    if (hit && !out.includes(hit)) out.push(hit);
  }
  if (!out.length && ids[0]) out.push(ids[0]);
  const w = worked.get(provider);
  return (w && out.includes(w) ? [w, ...out.filter((m) => m !== w)] : out).slice(0, 4);
}

export async function providersWithKeys(): Promise<{ id: string; label: string }[]> {
  await syncCustomServer();
  const out: { id: string; label: string }[] = [];
  for (const id of AUTO_ORDER) {
    if (!(await keyStore.getKey(id))) continue;
    if (id === "custom" && !PROVIDERS.custom.base) continue;
    out.push({ id, label: PROVIDERS[id]?.label ?? id });
  }
  return out;
}

const NOT_TEXT = /antigravity|deep-research|computer-use|embed|tts|image|imagen|veo|audio|native-audio|live|robotics|aqa|learnlm|rerank|guard|whisper|vision|-vl|ocr|moderation|transcri/i;

/** The models a provider offers for writing text, for the picker in the app. */
export async function modelsOf(provider: string): Promise<string[]> {
  await syncCustomServer();
  const key = provider === "gemini" ? (await withGeminiKey(async (k) => k)) : await keyStore.getKey(provider);
  if (!key) return [];
  const ids = await listModels(provider, key);
  return [...new Set(ids)].filter((id) => !NOT_TEXT.test(id)).sort();
}

async function ask(provider: string, system: string, user: string, model?: string): Promise<{ text: string; by: string }> {
  if (provider === "gemini" && !model) return { text: await geminiJson(system, user), by: "Gemini" };
  if (provider === "gemini") {
    // a chosen Gemini model still uses every saved key in turn
    const { text } = await withGeminiKey((key) => chat({ provider, key, model: model as string, json: true, maxTokens: 6000, timeoutMs: 180000, messages: [{ role: "system", content: system }, { role: "user", content: user }] }));
    return { text, by: `Gemini · ${model}` };
  }
  const key = await keyStore.getKey(provider);
  if (!key) throw new Error(`No ${PROVIDERS[provider]?.label ?? provider} key saved.`);
  const label = PROVIDERS[provider]?.label ?? provider;
  const models = model ? [model] : await modelsFor(provider, key);
  if (!models.length) throw new Error(`${label} lists no models.`);
  const problems: string[] = [];
  // a busy or broken model is common on free routes: the next good one gets a turn
  for (const m of models) {
    try {
      const { text } = await chat({ provider, key, model: m, json: true, maxTokens: 6000, timeoutMs: 180000, messages: [{ role: "system", content: system }, { role: "user", content: user }] });
      worked.set(provider, m);
      return { text, by: `${label} · ${m}` };
    } catch (e) { problems.push(`${m}: ${String((e as Error)?.message ?? e).slice(0, 90)}`); }
  }
  throw new Error(`${label}: ${problems.join(" · ")}`);
}

/** provider "auto" (or empty) walks AUTO_ORDER over the saved keys. */
export async function suggestWith(system: string, user: string, provider = "auto", model?: string): Promise<{ text: string; by: string }> {
  await syncCustomServer();
  if (provider && provider !== "auto") return ask(provider, system, user, model);
  const tried: string[] = [];
  for (const p of await providersWithKeys()) {
    try { return await ask(p.id, system, user); } catch (e) { tried.push(`${p.label}: ${String((e as Error)?.message ?? e).slice(0, 100)}`); }
  }
  throw new Error(tried.length ? `No AI answered. ${tried.join(" · ")}` : "No AI key saved. Add one in Settings (Gemini, OpenRouter, NVIDIA, Groq, Cerebras, Mistral, OpenAI or your own server).");
}
