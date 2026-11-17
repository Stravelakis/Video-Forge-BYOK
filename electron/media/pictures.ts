// ---------------------------------------------------------------------------
// Pictures as backgrounds (Ak, 10 Nov 2026): your own picture, a picture made
// from a description, or a free photo from Pixabay or Pexels. Each becomes a
// short still clip the size of the video, like the paintings do.
//
// MAKING A PICTURE uses the free services Image Forge uses: Cloudflare Workers AI
// (FLUX.1 schnell; the shared "cloudflare-account" / "cloudflare-token" keys),
// then Pollinations as a fallback. Tested 10 Nov 2026: a bakery in 4 seconds.
// Free Gemini keys can't make pictures (quota 0 on both NB2 models that day).
// ---------------------------------------------------------------------------

import crypto from "node:crypto";
import fsp from "node:fs/promises";
import path from "node:path";
import { request, requestBuffer } from "../net/http";
import { downloadTo } from "../net/mediaSearch";
import * as keyStore from "../keyStore";
import { pictureToClip } from "./stillClip";

export interface PhotoHit { id: string; provider: "pixabay" | "pexels"; url: string; thumbUrl: string; width: number; height: number; author: string; pageUrl: string; tags: string }

export async function searchPhotos(query: string, orientation?: "portrait" | "landscape"): Promise<{ hits: PhotoHit[]; problems: string[] }> {
  const q = String(query).slice(0, 100);
  const hits: PhotoHit[] = [], problems: string[] = [];
  const pixabay = await keyStore.getKey("pixabay");
  if (pixabay) {
    try {
      const r = await request(`https://pixabay.com/api/?key=${encodeURIComponent(pixabay)}&q=${encodeURIComponent(q)}&image_type=photo&safesearch=true&per_page=40${orientation ? `&orientation=${orientation === "portrait" ? "vertical" : "horizontal"}` : ""}`);
      if (r.status !== 200) throw new Error(`HTTP ${r.status}`);
      for (const h of JSON.parse(r.body).hits ?? []) hits.push({ id: `pixabay-${h.id}`, provider: "pixabay", url: h.largeImageURL, thumbUrl: h.webformatURL, width: h.imageWidth, height: h.imageHeight, author: h.user ?? "", pageUrl: h.pageURL ?? "", tags: h.tags ?? "" });
    } catch (e) { problems.push(`Pixabay: ${(e as Error).message}`); }
  } else problems.push("No Pixabay key (Settings).");
  const pexels = await keyStore.getKey("pexels");
  if (pexels) {
    try {
      const r = await request(`https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&per_page=40${orientation ? `&orientation=${orientation}` : ""}`, { headers: { Authorization: pexels } });
      if (r.status !== 200) throw new Error(`HTTP ${r.status}`);
      for (const p of JSON.parse(r.body).photos ?? []) hits.push({ id: `pexels-${p.id}`, provider: "pexels", url: p.src?.large2x ?? p.src?.original, thumbUrl: p.src?.medium, width: p.width, height: p.height, author: p.photographer ?? "", pageUrl: p.url ?? "", tags: p.alt ?? "" });
    } catch (e) { problems.push(`Pexels: ${(e as Error).message}`); }
  } else problems.push("No Pexels key (Settings).");
  // mix the two libraries so neither one's look takes over the page
  const a = hits.filter((h) => h.provider === "pixabay"), b = hits.filter((h) => h.provider === "pexels");
  const mixed: PhotoHit[] = [];
  for (let i = 0; i < Math.max(a.length, b.length); i++) { if (a[i]) mixed.push(a[i]); if (b[i]) mixed.push(b[i]); }
  return { hits: mixed, problems };
}

const PHOTO_HOSTS = /^https:\/\/([a-z0-9-]+\.)*(pixabay\.com|pexels\.com)\//i;

/** A free photo, downloaded once, as a background clip. Only Pixabay and Pexels addresses. */
export async function photoClip(url: string, mediaDir: string, width: number, height: number): Promise<string> {
  if (!PHOTO_HOSTS.test(url)) throw new Error("Only Pixabay and Pexels photos can be fetched here.");
  await fsp.mkdir(mediaDir, { recursive: true });
  const file = path.join(mediaDir, `photo-${crypto.createHash("sha1").update(url).digest("hex").slice(0, 16)}.jpg`);
  try { await fsp.access(file); } catch { await downloadTo(url, file); }
  return pictureToClip(file, mediaDir, width, height);
}

/** A picture made from a description: Cloudflare first, Pollinations if that fails. Returns the picture file. */
export async function makePicture(prompt: string, mediaDir: string): Promise<{ file: string; by: string }> {
  const text = String(prompt).slice(0, 1200);
  await fsp.mkdir(mediaDir, { recursive: true });
  const file = path.join(mediaDir, `made-${Date.now().toString(36)}.jpg`);
  const problems: string[] = [];
  const acc = await keyStore.getKey("cloudflare-account"), tok = await keyStore.getKey("cloudflare-token");
  if (acc && tok) {
    try {
      const r = await request(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(acc)}/ai/run/@cf/black-forest-labs/flux-1-schnell`, { method: "POST", headers: { authorization: `Bearer ${tok}`, "content-type": "application/json" }, body: JSON.stringify({ prompt: text, steps: 8 }) });
      const j = JSON.parse(r.body);
      if (r.status === 200 && j.result?.image) { await fsp.writeFile(file, Buffer.from(j.result.image, "base64")); return { file, by: "Cloudflare (FLUX)" }; }
      problems.push(`Cloudflare: HTTP ${r.status} ${String(j.errors?.[0]?.message ?? "").slice(0, 100)}`);
    } catch (e) { problems.push(`Cloudflare: ${(e as Error).message}`); }
  } else problems.push("No Cloudflare keys.");
  try {
    const token = await keyStore.getKey("pollinations");
    const r = await requestBuffer(`https://image.pollinations.ai/prompt/${encodeURIComponent(text)}?width=1344&height=768&nologo=true&safe=true${token ? `&token=${encodeURIComponent(token)}` : ""}`);
    if (r.status === 200 && r.body.length > 10000) { await fsp.writeFile(file, r.body); return { file, by: "Pollinations" }; }
    problems.push(`Pollinations: HTTP ${r.status}`);
  } catch (e) { problems.push(`Pollinations: ${(e as Error).message}`); }
  throw new Error(`No picture service answered. ${problems.join(" · ")}`);
}
