# Install

Video Forge is a Windows desktop app built with Electron. **There is no published installer download yet** (the repository has no releases). Today you run it from source, or build the installer yourself.

## Run it from source

You need Node.js and Git.

```bash
git clone https://github.com/Stravelakis/Video-Forge-BYOK.git
cd Video-Forge-BYOK
npm install
npm run dev
```

Then open the Backend Panel, paste your API keys, add a speaker, give them a puppet and a script, and press Render.

## Build the installer yourself

```bash
npm install
npm run build-exe
```

The first run downloads about 150 MB of Electron. The files land in the `release` folder: an installer and a portable single-file `.exe`. This is the project's own description of the build output; it is not a published download.

## What it needs

- Windows 10 or 11, 64-bit.
- About 700 MB of disk space for the app (it includes its own Chromium and video tools).
- Space for your videos. A finished seven-minute lesson is roughly 100 to 200 MB.
- Internet for stock footage (Pixabay, Pexels), sound search (Freesound), fonts and any paid engine.
- Recommended: an NVIDIA graphics card with 8 GB, and 32 GB of memory. Expect about one hour of rendering for a 10-minute video.

## "Windows protected your PC"

An installer you build is not code-signed, so Windows may show this screen. It does not mean something is wrong with the file. Click **More info**, then **Run anyway**.

## Where your things are kept

Everything you create lives in one folder, separate from the app: `%APPDATA%\video-forge`. Paste that into the address bar of a File Explorer window to open it.

- `renders\`: your finished videos
- `media\`: stock footage the app downloaded
- `fonts\`: subtitle fonts it downloaded
- `byok.secrets.enc`: your API keys, encrypted by Windows for your account only

## Uninstall

Settings -> Apps -> Installed apps -> Video Forge -> Uninstall. It asks whether to remove your data too. **No** keeps your keys, settings and videos. **Yes** deletes the folder above, including every video in `renders\`. Copy out anything you want first.

## What it does not do yet

- Windows only. No Mac or Linux build.
- No automatic updates. A new version is a new installer, installed over the old one; your data is kept.
- Your own keys: paid engines (ElevenLabs, NVIDIA) and stock libraries need keys you add in Settings.
