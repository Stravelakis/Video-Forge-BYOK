// The full ffmpeg the Windows installer carries (18 Nov 2026).
//
// Remotion's own ffmpeg is cut down: no rubberband, compressors, EQ, chorus,
// lut3d or eq, so on a PC without a full ffmpeg most of post-production was
// skipped. The installer now carries one. It is downloaded at BUILD time by
// scripts/fetch-ffmpeg.mjs, pinned to one release and checked against its
// SHA-256 before anything is unpacked. The binary is never committed.
//
// It is a separate program (Video Forge runs it, it is not linked in), licensed
// GPL v3 by its builder. NOTICE says what it is and where its source is; its
// own LICENSE and README (which lists the exact configuration and library
// versions) are shipped next to it.
//
// To move to a newer release: change version, url, sha256 and size here (the
// SHA-256 is the "digest" GitHub shows for the asset), update NOTICE, run
// `npm run ffmpeg` and `npm test`.
//
// Pure Node, no electron import, so tools/lib/ffmpegBundle.test.mjs can run it.

import crypto from "node:crypto";
import fs from "node:fs";

export const FFMPEG = Object.freeze({
  version: "9.0.2",
  builder: "gyan.dev",
  variant: "essentials_build",
  licence: "GPL-3.0",
  // GitHub mirror of gyan.dev's release builds: tagged, never replaced
  url: "https://github.com/GyanD/codexffmpeg/releases/download/9.0.2/ffmpeg-9.0.2-essentials_build.zip",
  sha256: "60f467265b1e312373dbcd92200c2618a74850f98d3d078e94296bb3fa2047ba",
  size: 114768076,
  /** The folder inside the zip. */
  root: "ffmpeg-9.0.2-essentials_build",
  /** What is taken from the zip → its name next to the app. */
  take: Object.freeze({ "bin/ffmpeg.exe": "ffmpeg.exe", LICENSE: "LICENSE.txt", "README.txt": "README.txt" }),
  /** The exact FFmpeg source this build was made from (from its README). */
  source: "https://github.com/FFmpeg/FFmpeg/commit/946fcce07b",
  sourceTarball: "https://ffmpeg.org/releases/ffmpeg-9.0.2.tar.xz",
  buildInfo: "https://www.gyan.dev/ffmpeg/builds/",
});

/** Where the build keeps it, relative to the app folder (gitignored). */
export const FFMPEG_DIR = "build/ffmpeg";
export const FFMPEG_CACHE = "build/ffmpeg-cache";
/** Written after a good unpack; a later build with the same pin skips the work. */
export const STAMP = "bundle.json";

export const sha256File = (file) =>
  new Promise((resolve, reject) => {
    const h = crypto.createHash("sha256");
    fs.createReadStream(file).on("data", (d) => h.update(d)).on("error", reject).on("end", () => resolve(h.digest("hex")));
  });

/** Does a checksum match the pin? Case and an optional "sha256:" prefix are ignored. */
export const sameSha = (actual, expected = FFMPEG.sha256) =>
  typeof actual === "string" && actual.replace(/^sha256:/i, "").trim().toLowerCase() === String(expected).toLowerCase();

/** The stamp written next to the unpacked files. */
export const stampFor = (pin = FFMPEG) => ({ version: pin.version, builder: pin.builder, variant: pin.variant, sha256: pin.sha256, source: pin.source });

/** Is what is in the folder exactly this pin, with every file present? */
export function isUnpacked(stampText, present, pin = FFMPEG) {
  let s;
  try {
    s = JSON.parse(stampText);
  } catch {
    return false;
  }
  return !!s && s.version === pin.version && sameSha(s.sha256, pin.sha256) && Object.values(pin.take).every((name) => present.includes(name));
}
