/* Renders card.html to the 1200x630 share image (og:image / twitter:image) and
   the app icon to a 64 px favicon, both into site/public/.
   From the repo root: npx electron site/scripts/social/render.cjs */
const { app, BrowserWindow, nativeImage } = require('electron');
const fs = require('fs');
const path = require('path');

const pub = path.join(__dirname, '..', '..', 'public');

app.whenReady().then(async () => {
  // Off-screen rendering: no window on screen, and it works on any display set-up.
  const win = new BrowserWindow({ width: 1200, height: 630, show: false, useContentSize: true,
    webPreferences: { offscreen: true, backgroundThrottling: false } });
  await win.loadFile(path.join(__dirname, 'card.html'));
  await win.webContents.executeJavaScript('document.fonts.ready.then(() => true)');
  await new Promise((r) => setTimeout(r, 1500));
  const img = await win.webContents.capturePage({ x: 0, y: 0, width: 1200, height: 630 });
  fs.writeFileSync(path.join(pub, 'og-image.png'), img.resize({ width: 1200, height: 630 }).toPNG());

  const icon = nativeImage.createFromPath(path.join(__dirname, '..', '..', '..', 'build', 'icon.png'));
  fs.writeFileSync(path.join(pub, 'favicon.png'), icon.resize({ width: 64, height: 64, quality: 'best' }).toPNG());

  console.log('wrote', path.join(pub, 'og-image.png'), 'and favicon.png');
  app.quit();
});
