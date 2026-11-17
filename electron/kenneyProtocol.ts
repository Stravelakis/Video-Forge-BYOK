// ---------------------------------------------------------------------------
// forge-kenney:// serves the 3D cast's models, faces and thumbnails to the app
// window, read-only, from one folder. The window is a file:// page in the built
// app, and a file:// page can't fetch files itself.
// 3D models by Kenney (kenney.nl), CC0.
// ---------------------------------------------------------------------------

import { app, net, protocol } from "electron";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const kenneyRoot = () => path.join(app.getAppPath(), "characters", "samples", "kenney", "builder");
/** The free picture shelves; a computer without them simply shows no shelf. */
export const shelfRoot = () => process.env.VIDEOFORGE_SHELVES || path.join(os.homedir(), "Tools", "assets", "_shelves");

/** Must run before app.whenReady(). */
export function registerKenneyScheme() {
  protocol.registerSchemesAsPrivileged([{ scheme: "forge-kenney", privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } }]);
}

/** Must run after app.whenReady(). */
export function serveKenney() {
  protocol.handle("forge-kenney", async (req) => {
    const u = new URL(req.url);
    const rel = decodeURIComponent(u.pathname).replace(/^\/+/, "");
    const root = path.resolve(u.hostname === "shelf" ? shelfRoot() : kenneyRoot());
    const file = path.resolve(root, rel);
    if (file !== root && !file.startsWith(root + path.sep)) return new Response("Not found", { status: 404 });
    try {
      const r = await net.fetch(pathToFileURL(file).toString());
      if (!r.ok) return new Response("Not found", { status: 404 });
      return new Response(r.body, { status: 200, headers: { "content-type": r.headers.get("content-type") ?? "application/octet-stream", "access-control-allow-origin": "*" } });
    } catch {
      return new Response("Not found", { status: 404 });
    }
  });
}
