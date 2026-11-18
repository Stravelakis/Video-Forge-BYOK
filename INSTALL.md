# Install: Video Forge

How to get Video Forge running, from zero.
For using it, see [GUIDE.md](GUIDE.md).

## What you need

- **Windows 10 or 11, 64-bit.** There is no Mac or Linux build.
- **About 700 MB of disk space** for the app. It carries its own browser engine and video tools.
- **Space for your videos.** A finished seven-minute video is roughly 100 to 200 MB.
- **Internet** for voices, AI, stock footage (Pixabay, Pexels), sound search (Freesound) and fonts.
- **Recommended:** an NVIDIA graphics card with 8 GB, and 32 GB of memory.
  Expect about one hour of rendering for a 10-minute video.

## Windows: the installer

1. Open the [latest release](https://github.com/Stravelakis/Video-Forge-BYOK/releases/latest).
2. Under **Assets**, download **`Video Forge Setup 0.4.0-beta.1.exe`**.
   (The number changes with each version.)
3. Double-click it.
4. Windows may show **"Windows protected your PC"**. See the next section.
5. Pick a folder, or keep the one offered. Click **Install**.
6. A **Video Forge** shortcut appears on the desktop and in the Start menu.

Don't want to install anything?
Download **`video-forge-portable.exe`** from the same release instead.
It is the same app as a single file. Double-click it and it runs.

> The first public release, 0.4.0-beta.1, is ready but not tagged yet.
> Until it is, the release page has no files. You can build the app yourself (below).

### "Windows protected your PC"

You will probably see a blue box with this title the first time.

**Why:** the app is not code-signed yet.
Signing tells Windows who made a program. It is planned, through SignPath Foundation, once the app has users to show.
The warning does not mean anything is wrong with the file.

**Get past it in two clicks:**

1. Click **More info** (small text under the message).
2. Click **Run anyway** (the button that appears at the bottom).

Windows remembers your choice for this file.

TODO: screenshot

### After installing

1. Open **Video Forge** from the shortcut.
2. Press the gear **⚙** at the top right to open **Settings**.
3. Paste at least one key (Gemini is free and gives you voices). Press **Save**, then **Test**.
4. Press **Create** and follow the five steps.

The full walk-through is in [GUIDE.md](GUIDE.md), "First run and keys".

### Update

When a newer release exists, a small link shows in the top bar and in Settings.
The app checks GitHub at most once a day. Nothing downloads or installs by itself.
Download the new installer and run it over the old one. Your data is kept.

There is no **Repair** button in the app yet.
TODO: Settings → Advanced with Repair and Update (STANDARDS §6) is not built yet.

### Uninstall

**Settings → Apps → Installed apps → Video Forge → Uninstall**, or the Uninstall entry in the Start menu.

It asks one question: **Remove your Video Forge data as well?**

- **No** (the safe answer) keeps your keys, settings, downloaded footage and finished videos.
  A reinstall picks up where you left off.
- **Yes** deletes `%APPDATA%\video-forge`, **including every finished video in `renders\`**.
  Copy out anything you want first.

A silent uninstall always answers No.

### Your data folder

Everything you make lives in one folder, separate from the app:

```
%APPDATA%\video-forge
```

Paste that into the address bar of a File Explorer window to open it.

| Inside | What it is |
|---|---|
| `renders\` | Your finished videos |
| `media\` | Stock footage and pictures the app downloaded |
| `fonts\` | Subtitle fonts it downloaded |
| `byok.secrets.enc` | Your keys, encrypted by Windows for your account only |

Keys shared with Image Forge, and the puppet shelf, are in `%APPDATA%\Forge\`.

---

## Build it from source

For people who want to run the code itself, change it, or use the puppet tools.

### Requirements

- Windows 10 or 11, 64-bit
- [Node.js](https://nodejs.org/) 22 (the version the release build uses)
- [Git](https://git-scm.com/)
- Optional: [gitleaks](https://github.com/gitleaks/gitleaks#installing), for the secret check before each commit

### Steps

```bash
git clone https://github.com/Stravelakis/Video-Forge-BYOK.git
cd Video-Forge-BYOK
git config core.hooksPath githooks
npm ci
npm run dev
```

- `git config core.hooksPath githooks` switches on the check that blocks a commit containing a secret.
- `npm ci` installs the exact package versions in `package-lock.json`.
- `npm run dev` builds the app and opens its window. It rebuilds when you change a file.

There is no `.env` file to make. Every setting in `.env.example` is optional.
To use one, set it in the terminal before starting (PowerShell: `$env:VIDEOFORGE_RENDER_CPU = "1"; npm run dev`).

### Check it works

The Video Forge window opens on the **Create** screen.
Video Forge has no browser mode: it runs only as its own window, so there is no local web address to open.

Run the tests (Node's built-in test runner):

```bash
npm test
```

### Make your own installer

```bash
npm run build-exe:public
```

- It first downloads a full FFmpeg once (pinned version, checksum checked) into `build/ffmpeg-cache/`.
  `npm run ffmpeg` does only that step.
- The first run also downloads about 150 MB of Electron.
- The files land in `release\`: an installer (`Video Forge Setup <version>.exe`) and `video-forge-portable.exe`.
- `npm run build-exe:check` is a dry run: it lists what would go in, and builds nothing.

This is the same build the release workflow makes when a version tag is pushed.

### Public and personal builds

One codebase, two versions:

| | Public | Personal |
|---|---|---|
| Who it is for | Everyone | The owner only |
| What is in it | The app, drawn characters, 3D Mini people and 3D Pets | The app plus the owner's brand packs, music, and the 3D Humans with their motion library |
| How it is made | `npm run build-exe:public` | `npm run personal`, then `npm run build-exe` |
| Installer name | `Video Forge Setup <version>.exe` | `Video Forge Personal Setup <version>.exe` |

- `npm run personal` fetches the owner's private content from a private repository and links it into the app folder.
  It only works with access to that repository. It never deletes anything; anything in the way is moved aside.
- The public build refuses to pack anything personal, and checks the packed folder before making the installer.
- The personal build has its own app id, so both can be installed side by side. They share the same saved data.
- Settings shows which one you have: "Video Forge 0.4.0-beta.1 · Public build" or "· Personal build".

### Release (for the maintainer)

1. Set `version` in `package.json`.
2. Write the `CHANGELOG.md` entry and `release-notes/v<version>.md` (the English / Devenglish table).
3. Merge to `main`.
4. `git tag v<version>` and `git push origin v<version>`.

`.github/workflows/release.yml` checks that the tag, version, changelog and notes agree, runs the tests,
builds the public installer and portable exe, and publishes the GitHub Release.
A tag with a "-" in it (like `v0.4.0-beta.1`) becomes a pre-release.
The same tag also rebuilds this docs site (`.github/workflows/deploy-docs.yml`).
