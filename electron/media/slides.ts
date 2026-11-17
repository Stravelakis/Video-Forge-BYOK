// ---------------------------------------------------------------------------
// A presentation as the background (Ak, 10 Nov 2026). Everything becomes a PDF
// here; the window turns its pages into slides with pdf.js.
//   PDF            read as it is
//   Google Slides  its public PDF download (the deck must be shared "Anyone with the link")
//   PowerPoint     converted by LibreOffice when it is installed; otherwise a plain
//                  message: save it as PDF first
// ---------------------------------------------------------------------------

import fsp from "node:fs/promises";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { requestBuffer } from "../net/http";

const MAX = 80 * 1024 * 1024;
const isPdf = (b: Buffer) => b.subarray(0, 5).toString("latin1") === "%PDF-";

export async function readPdf(file: string): Promise<Uint8Array> {
  const b = await fsp.readFile(file);
  if (b.length > MAX) throw new Error("That PDF is bigger than 80 MB.");
  if (!isPdf(b)) throw new Error("That file isn't a PDF.");
  return new Uint8Array(b);
}

/** The deck id from any Google Slides address. */
export function slidesId(url: string): string | null {
  const m = /docs\.google\.com\/presentation\/d\/([A-Za-z0-9_-]{20,})/.exec(String(url));
  return m ? m[1] : null;
}

export async function googleSlidesPdf(url: string): Promise<Uint8Array> {
  const id = slidesId(url);
  if (!id) throw new Error("That isn't a Google Slides link. Copy the address of the deck (docs.google.com/presentation/d/…).");
  const r = await requestBuffer(`https://docs.google.com/presentation/d/${id}/export/pdf`);
  if (r.status !== 200 || !isPdf(r.body)) throw new Error('Google would not hand over the deck. In Google Slides press Share and set "Anyone with the link" to Viewer, then try again.');
  if (r.body.length > MAX) throw new Error("That deck is bigger than 80 MB as a PDF.");
  return new Uint8Array(r.body);
}

function soffice(): string | null {
  const tries = [
    path.join(process.env.ProgramFiles ?? "C:\\Program Files", "LibreOffice", "program", "soffice.exe"),
    path.join(process.env["ProgramFiles(x86)"] ?? "C:\\Program Files (x86)", "LibreOffice", "program", "soffice.exe"),
    "/usr/bin/soffice", "/Applications/LibreOffice.app/Contents/MacOS/soffice",
  ];
  return tries.find((p) => fs.existsSync(p)) ?? null;
}

export function canConvertOffice(): boolean { return !!soffice(); }

export async function officeToPdf(file: string): Promise<Uint8Array> {
  const exe = soffice();
  if (!exe) throw new Error("PowerPoint files need LibreOffice (free, libreoffice.org) to be read here. Or, in PowerPoint: File → Save As → PDF, and bring in the PDF.");
  const out = await fsp.mkdtemp(path.join(os.tmpdir(), "vf-slides-"));
  try {
    await new Promise<void>((ok, no) => {
      const p = spawn(exe, ["--headless", "--convert-to", "pdf", "--outdir", out, file], { windowsHide: true });
      const timer = setTimeout(() => { p.kill(); no(new Error("LibreOffice took too long.")); }, 180000);
      p.on("error", no); p.on("close", (c) => { clearTimeout(timer); c === 0 ? ok() : no(new Error("LibreOffice could not convert that file.")); });
    });
    const pdf = (await fsp.readdir(out)).find((f) => f.toLowerCase().endsWith(".pdf"));
    if (!pdf) throw new Error("LibreOffice made no PDF.");
    return await readPdf(path.join(out, pdf));
  } finally { await fsp.rm(out, { recursive: true, force: true }).catch(() => {}); }
}
