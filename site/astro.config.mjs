import { defineConfig } from 'astro/config';

// GitHub Pages serves a project site under the organisation's custom domain at
// /<repo name>/, so this repo (Stravelakis/Video-Forge-BYOK) is served at
// https://docs.stravelakis.com/Video-Forge-BYOK/. `base` must match that path,
// or every link and picture on the site breaks.
// The repo's homepage setting says /video-forge/: that address only works if the
// repo is renamed to video-forge (then set base: '/video-forge'), or if the
// organisation site (Stravelakis.github.io) gets a /video-forge/ redirect page.
export default defineConfig({
  site: 'https://docs.stravelakis.com',
  base: '/Video-Forge-BYOK',
  outDir: './dist',
  vite: {
    // Inline PostCSS config so Vite never picks up a postcss.config.js from the repo root.
    css: { postcss: { plugins: [] } },
    // The carousel reads the README's screenshots from ../docs/media (src/data/showcase.ts).
    server: { fs: { allow: ['..'] } },
  },
});
