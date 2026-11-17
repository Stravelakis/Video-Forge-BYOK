// ---------------------------------------------------------------------------
// Turns a shelf picture into a short looping clip the size of the video, so a
// painting or a wall goes down the same road as any stock background.
// ---------------------------------------------------------------------------

import crypto from "node:crypto";
import fsp from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { ffmpegBin } from "../process/ffmpegPath";

const SECONDS = 12;

export async function makeStillClip(root: string, rel: string, mediaDir: string, width: number, height: number): Promise<string> {
  const base = path.resolve(root), src = path.resolve(base, rel);
  if (!src.startsWith(base + path.sep)) throw new Error("That picture is outside the shelves.");
  return pictureToClip(src, mediaDir, width, height, `shelf-${crypto.createHash("sha1").update(`${rel}|${width}x${height}`).digest("hex").slice(0, 16)}`);
}

/** Any picture file as a still clip the size of the video (cover-cropped). Cached by file and size. */
export async function pictureToClip(src: string, mediaDir: string, width: number, height: number, name?: string): Promise<string> {
  if (!/\.(png|jpe?g|webp|bmp|gif)$/i.test(src)) throw new Error("That isn't a picture (PNG, JPG, WEBP).");
  await fsp.access(src);
  await fsp.mkdir(mediaDir, { recursive: true });
  const st = await fsp.stat(src);
  const key = name ?? `pic-${crypto.createHash("sha1").update(`${src}|${st.size}|${st.mtimeMs}|${width}x${height}`).digest("hex").slice(0, 16)}`;
  const out = path.join(mediaDir, `${key}.mp4`);
  try { await fsp.access(out); return out; } catch { /* not made yet */ }
  const vf = `scale=${width}:${height}:force_original_aspect_ratio=increase:out_range=tv,crop=${width}:${height},format=yuv420p`;
  await new Promise<void>((ok, no) => {
    const p = spawn(ffmpegBin(), ["-y", "-v", "error", "-loop", "1", "-i", src, "-t", String(SECONDS), "-r", "30", "-vf", vf, "-c:v", "libx264", "-crf", "16", "-preset", "veryfast", "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709", "-color_range", "tv", "-an", out], { windowsHide: true });
    let err = ""; p.stderr.on("data", (d) => (err += d));
    p.on("error", no); p.on("close", (c) => (c === 0 ? ok() : no(new Error(err.slice(-400) || "The picture could not be prepared."))));
  });
  return out;
}
