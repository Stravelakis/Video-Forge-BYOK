## Orientation

Video Forge is a **Windows desktop app that renders narrated, subtitled, character-driven video locally**. A script of `Name: words` lines goes through a voice engine, becomes timed audio, mouth shapes and subtitles, and is rendered to MP4 on the user's own machine. Online services (voices, LLMs, stock media) are reached with the user's own keys.

| Runtime | Entry | What it is |
|---|---|---|
| App window | `electron/main.ts` → `src/main.tsx` | The only interactive runtime. **No browser mode and, in a packaged build, no local web address for the UI** (`npm run dev` serves a Vite address for the dev window). |
| Headless render | `electron . --job <file>` (`npm run job`) | One video, no window. Same pipeline as the app (`electron/batch/runJob.ts`) |
| Sound-effect jobs | `--sfx <wanted.csv>`, `--sfx-free <wanted.csv>` | Make or gather a course's sound effects before rendering (`electron/audio/`) |
| Repair job | `--add-outros [--only …] [--apply]` | Re-adds a missing outro to finished lessons. Needs a brand pack with `addOutros` set |
| Open a project | `--project <file>` | Opens the app on a saved project instead of the autosave (`project:startup`) |

Stack, from `package.json`: Electron ^45, React 19, Zustand 5, Tailwind 4, Vite 8, TypeScript ^7, `electron-vite` 6, `electron-builder` 26, three.js 0.170.0 (pinned), HyperFrames ^0.9.16, Remotion ^4.0.540, `ws` (the Gemini Live socket), FFmpeg 9.0.2 as a separate process. About 51 test files run under Node's built-in runner. Windows only: DPAPI, NSIS, NVENC flags.

> **Watch out** If this page and the code disagree, the code wins. [HANDOFF.md](https://github.com/Stravelakis/Video-Forge-BYOK/blob/HEAD/HANDOFF.md) is the running log; [GUIDE.md](https://github.com/Stravelakis/Video-Forge-BYOK/blob/HEAD/GUIDE.md) is the user manual, longer than this page and from the same code.

## Run it

```bash
git clone https://github.com/Stravelakis/Video-Forge-BYOK.git
cd Video-Forge-BYOK
git config core.hooksPath githooks   # pre-commit: gitleaks must pass
npm ci
npm run dev                          # electron-vite dev --watch: builds, opens the window
npm test                             # node --test over an explicit list of files
npx tsc --noEmit -p .                # typecheck (only release.yml runs it)
npm run build-exe:public             # public installer + portable exe → release\
```

Use **Node 22**: that is what `release.yml` and the docs workflow use. `electron-vite` compiles with esbuild and does not typecheck, so run `tsc` yourself.

| Script | What it does |
|---|---|
| `npm run build-exe` | Personal build if personal content is present, else the same as public |
| `npm run build-exe:check` | Dry run: lists what electron-builder would pack, builds nothing |
| `npm run ffmpeg` | Download the pinned FFmpeg to `build/ffmpeg-cache/`, check its SHA-256, unpack to `build/ffmpeg/` |
| `npm run personal` | Owner only: link private content into the checkout (`scripts/personal-content.mjs`) |
| `npm run brand -- <name>` / `off` | Switch a brand pack on in `brand.local.json`; no argument lists packs |
| `npm run docs:move-tags` | Regenerate `docs/MOVE-TAGS.md` from the motion library |
| `npm run outros` | `electron . --add-outros` |
| `npm run sfx`, `sfx:free` | `electron . --sfx`, `--sfx-free` |

> **Watch out** `npm test` is not a glob. The `test` script in `package.json` lists every file by name. A new `*.test.mjs` that you do not add there never runs.

## Architecture

```
┌──────────────────────── renderer (sandboxed window) ───────────────────────┐
│ React + Zustand stores (src/store)    Create flow · Production · Many videos│
│ pure logic in src/lib (parse, timing, visemes, post settings, directions)  │
└───────────────────────────┬────────────────────────────────────────────────┘
                            │ window.byok  (electron/preload.ts: a whitelist
                            │ of ipcRenderer.invoke channels, nothing else)
┌───────────────────────────▼────────────────────────────────────────────────┐
│ main process (electron/main.ts, ~60 handlers in main.ts, more in           │
│ electron/characters/ and electron/explainer/)                              │
│  keyStore · tts/ · llm/ · media/ · net/ · batch/ · render/ · post/ · process/│
└───────┬──────────────────────┬─────────────────────────┬───────────────────┘
        ▼                      ▼                         ▼
  provider APIs           child processes            %APPDATA%\video-forge
  (keys from the vault)   FFmpeg · headless browser  %APPDATA%\Forge (shared)
                          Piper (python)
```

- **The window is sandboxed**: `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true` (`electron/main.ts`). The renderer can reach only what `electron/preload.ts` exposes as `window.byok`.
- **Everything that touches the network, disk or a child process is in the main process.** The renderer holds state and draws it.
- **Pure logic is shared on purpose**: files under `src/lib/**` and almost all of `tools/lib/*.mjs` import no Electron (`explainerRun.mjs` is the exception), so `node --test` runs the real code. Several `tools/lib/*.mjs` files are also imported by the main process (`forgeKeys`, `forgeShelf`, `forgeHub`, `updateCheck`).
- **`forge-kenney://`** (`electron/kenneyProtocol.ts`) serves the 3D models, faces and thumbnails read-only from `characters/samples/kenney/builder`, because a `file://` page cannot fetch files. It refuses any path that escapes that folder.

> **Why** One rule shapes the repo: logic that can be pure is pure, and logic that must touch the world sits behind one named IPC channel and one guard. Every time a path or a key crossed that line casually, a review found it.

## Module map

| Path | Owns |
|---|---|
| `src/store/` | `useProjectStore`, `useSettingsStore`, `useManyStore`, `useCreatorStore`, `useFlowStore`, templates, voices, speaker library, undo (`projectHistory.ts`); defaults in `defaults.ts` |
| `src/components/flow/` | The **Create** flow: `StyleStep`, `CastStep`, `BackgroundStep`, `FormatStep`, `FlowStudio` (Review) |
| `src/components/panels`, `render`, `settings`, `creator`, `explainer`, `rooms` | Production steps, `RenderBar`, `ManyVideos`, Settings (`BackendPanel`, `SayItCard`), the character creator, Explainer, sets and rooms |
| `src/lib/narration/` | `parseScript.ts` (the `Name: text` grammar), `resolveSegments.ts`, `scriptStarters.ts`, per-engine helpers |
| `src/lib/subtitles/` | `wordTiming.ts` (cues from segment times), `subtitleFiles.ts` (`.srt`, `.vtt`) |
| `src/lib/visemes/` | `visemeMap.ts`, `timeline.ts` (hold, merge, skip rules), `speakerTracks.ts` |
| `src/lib/post/` | `postSettings.ts` (presets, `MAX_PAN`), `swears.ts` (pure rules, lists, matching) |
| `src/lib/project/projectFile.ts` | Save/open: `PLAIN_FIELDS`, `autosaveSnapshot`, `blankProject` |
| `electron/tts/` | One file per engine, `buildNarration.ts`, `remakeLine.ts`, `scriptMatch.ts`, `greekAccents*.ts`, `paidVoice.ts` |
| `electron/render/` | `renderVideo.ts`, `hyperframes/` (`renderHyperframes.ts`, `hfPage.ts`, `renderBrowser.ts`), `jobSafety.ts`, `joinCards.ts`, `addOutros.ts` |
| `electron/post/` | `postGraph.ts` (pure FFmpeg filter graphs), `runPost.ts` (runs them), `swearPlan.ts` |
| `electron/batch/` | `runJob.ts` (`BatchJob`, `JobSpeaker`), `manyVideos.ts`, `sheet.ts` (CSV and Google Sheet URL) |
| `electron/security/` | `pathGuard.ts` (the rules) and `guard.ts` (wired to this app's folders) |
| `remotion/` | The React composition: `VideoComposition.tsx`, `Root.tsx`, faces, subtitles, waveforms; `remotion/hf/` is the HyperFrames entry and its `remotion` stand-in |
| `characters/`, `explainer/` | Plain-JS cores with their own tests: drawn characters, moves, sets; explainer scenes and kits |
| `tools/lib/` | Pure helpers and their tests (about 40 `*.test.mjs`) |

## Data flow: script to video

1. **Script → segments.** `parseScript.ts` reads `Name: text`, `Name [direction]: text` (direction before the colon, never spoken) lines. A name is matched to a speaker in `parseScript.ts` case-insensitively but **exactly otherwise**: accents count, Latin never matches Greek. Speakers may carry `aliases`. (`electron/tts/scriptMatch.ts` is a different, forgiving check: it compares what a Gemini Live voice said with the script.) `[SFX: stem]` cue lines are read only by headless `--job` runs (`runJob.ts`); in the app they are skipped as unmatched.
2. **Voice per segment.** `buildNarration.ts` sends each segment to its speaker's engine (four engines: `gemini`, `fish`, `elevenlabs`, `piper`; `buildNarration.ts` accepts only these). DramaBox was retired on 10 Oct 2026 and old projects fall back to Gemini. Before synthesis a Greek accent fixer (`greekAccents*.ts`) and the user's pronunciation list (`pronunciations.ts`) run. Gemini Live lines are checked word by word against the script and retaken on drift.
3. **Timing.** Segment starts and ends come from the audio. Word times are spread by word length and re-anchored at pauses heard in the audio (`wordTiming.ts`); exact word times are used when an engine supplies them.
4. **Tracks.** Visemes (nine shapes plus half-open in-betweens, held about 100 ms, look-alikes merged in fast speech), brows and head from punctuation, gestures, move tags, pop-ups, directions and camera.
5. **Render.** `renderVideo.ts` stages every asset into one folder, builds the composition's props, then renders. **HyperFrames is the default engine; Remotion is the older path**, chosen only when the job says `engine: "remotion"` (`renderVideo.ts`, `RenderJob.engine`). The `render.engine` field in `defaultProject` (`"remotion"`) is a legacy project value; the render job does not use it to pick.
6. **Post.** The narration is processed before the frames (audio only, two passes: measure then apply). The colour grade is the one extra video encode, after the frames and before intro and outro cards are joined. Music and effects are mixed after the voices are processed.

> **Watch out** `renderVideo` warns about every job key that nothing carries into the composition ("had NO EFFECT on this video"). Add a new job field in both the job type and the props, or you get the warning and no change.

### The render engine

`renderHyperframes.ts` turns the staged folder into a HyperFrames project: `bg-track.mp4` (background clips looped and crossfaded by FFmpeg), `banner.mp4`, `mix.wav` (narration, music ducked by `musicGainAt`, every effect), `vf.js` (the React composition bundled with a stand-in for `remotion`, from `remotion/hf/`) and an `index.html` of layers. HyperFrames' CLI does the rest, started with `childEnv()` so its update check and auto-install are off (`tools/lib/ipcSurface.test.mjs` asserts this).

- Draws and encodes on the graphics card by default (`--gpu --browser-gpu`). `VIDEOFORGE_RENDER_CPU=1` switches to the processor.
- Needs a headless Chromium. `renderBrowser.ts` looks in the usual places; `HYPERFRAMES_BROWSER_PATH` overrides.
- The code comment in `renderHyperframes.ts` gives the reason for the switch: Remotion's licence is paid for companies of four or more that build video tools; HyperFrames is Apache-2.0. Read the comment before changing it.

## Post-production internals

Settings and presets: `src/lib/post/postSettings.ts`. Filter graphs (pure, tested): `electron/post/postGraph.ts`. Runner: `electron/post/runPost.ts`. It runs inside `renderVideo`, so the app, Many videos and `--job` all get it.

- **Studio sound:** high-pass 80 Hz, gentle compressor, light de-ess, two-pass `loudnorm` to `TARGET_LUFS = -14` and `TARGET_TP = -1`. Narration only; a hand-attached audio file is left alone.
- **Voice characters** per speaker: natural, chibi, bright, warm, deep, radio, plus pitch (±4 semitones), brightness and sparkle. A formant shift needs Rubber Band; without it, pitch falls back to `asetrate` + `atempo` and the throat size moves with it.
- **Stereo:** pan from each speaker's x (or seat); the far side is lowered by at most `MAX_PAN = 0.3`, the near side never raised. Off with one speaker.
- **Swear clean-up:** off, bleep, mute, or a softer word. Rules and matching are in `src/lib/post/swears.ts`; windows come from `swearPlan.ts` and `speechIslands` in `runPost.ts` (silence detection). A softer word is applied to the text the voice is asked for (`spokenText` in `resolveSegments.ts`), so old audio is bleeped with a warning.
- **Grade:** a user `.cube` through `lut3d` plus `eq`, path-guarded, one extra encode.
- **FFmpeg choice** (`electron/process/ffmpegChoice.ts`): the installer's copy (`resources/ffmpeg/ffmpeg.exe`) → a full one on `PATH` → Remotion's bundled copy. Each is asked for its filters; missing ones are warned about and skipped. The pinned build is gyan.dev 9.0.2 essentials with a SHA-256 in `tools/lib/ffmpegBundle.mjs`.

> **Watch out** Projects saved before post-production open with every part off, so their sound and picture do not change. New projects start with studio sound on. Keep that asymmetry when you touch defaults.

## Keys, data and the shared Forge folder

| Store | Where | Notes |
|---|---|---|
| Key vault | `<userData>\byok.secrets.enc` | Electron `safeStorage`; atomic saves, a `.bak` copy, and a vault it cannot read is **never overwritten** (`electron/vaultFile.ts`, `keyStore.ts`). With no OS keychain it falls back to a plain file and says so |
| Shared keys | `%APPDATA%\Forge\shared-keys.bin` | Windows DPAPI through PowerShell; newest write wins; off Windows there is no sharing |
| Puppet shelf | `%APPDATA%\Forge\orders\`, `puppets\`, `puppets-deleted\` | Orders to Image Forge, finished puppets from it |
| Made list | `%APPDATA%\Forge\made\register.jsonl` | One JSON line per finished render (`recordMade` in `main.ts` and `manyVideos.ts`) |
| Everything else | `<userData>` | `renders\`, `media\`, `fonts\`, `update-check.json`, `picked-files.json` (files the user picked) |

`<userData>` is `%APPDATA%\video-forge` on a fresh install. **A computer that already has the old folder `byok-vid-creator` or `BYOK-Vid-Creator` keeps using it in place** (`electron/migrateUserData.ts`). `VIDEOFORGE_USER_DATA` overrides both. `main.ts` calls `app.setName("video-forge")` first, so a headless run started as plain `electron` does not fall back to `%APPDATA%\Electron`.

- The window **cannot read a key in plain text**: there is no `keys:get` channel, and a test fails if one appears (`tools/lib/ipcSurface.test.mjs`). The main process reads a key only to make an outgoing call.
- **The path guard** (`electron/security/`) covers every path the window hands to main: its own folders are read-write; the app folder, the Forge shelf and the active brand pack are read-only; files the user picks are remembered in `picked-files.json`. `renderSafety.test.mjs` checks that `render:start` puts every file a job names through it (narration, music, intro, outro, logo, banner, effects, backgrounds, face sheets, puppets) before anything is copied.
- **Providers:** Gemini (extra keys rotate on quota), OpenRouter, NVIDIA, Groq, Cerebras, OpenAI, Mistral, any OpenAI-compatible server (`custom-url` + key), Pixabay, Pexels, Freesound (CC0 only), ElevenLabs (cost prompt, batch opt-in, per-sheet character cap in `electron/tts/paidVoice.ts`).
- **Projects** are JSON: `kind: "byok-project"`, `version: 2` (`projectFile.ts`). `PLAIN_FIELDS` is the list of what is saved as is; the autosave uses the same list through `autosaveSnapshot`, so the two cannot drift. `blankProject` clears every field before defaults go on, so New and Open never inherit the last project.
- **Update check:** `electron/main.ts` asks the GitHub Releases API at most once a day and remembers it in `update-check.json`; the window gets a link, nothing downloads (`tools/lib/updateCheck.mjs`, repo `Stravelakis/Video-Forge-BYOK`).

## Shared with Image Forge

Five files are copies of each other. The header of each says "THE SAME FILE": change one, copy it to the other repo, and run both repos' tests.

| Here | In Image Forge | Job |
|---|---|---|
| `tools/lib/forgeKeys.mjs` | `electron/forgeKeys.mjs` | The shared-keys file. `SHARED_NAMES` is the list both apps read and write; a name an app does not know is **kept untouched**, never deleted |
| `tools/lib/forgeShelf.mjs` | `electron/forgeShelf.mjs` | Orders and puppets. Video Forge places orders and reads puppets; Image Forge takes orders and writes puppets. Everything read from there is validated |
| `tools/lib/forgeHub.mjs` | `electron/forgeHub.mjs` | `recordMade` into `made/register.jsonl`, appended only |
| `src/components/ui/TipLayer.tsx` | `src/components/TipLayer.tsx` | The hover bubble for the whole window (`data-tip`, `data-tip-more`, or `title`), also on keyboard focus |
| `tools/lib/hoverHelp.mjs` | `scripts/hoverHelp.mjs` | The check that lists any clickable thing with no hover help (used by `hoverHelp.test.mjs`) |

`tools/lib/hoverHelp.test.mjs` fails on a control with no tip. The two apps meet only through those plain folders and files: nothing has to be open at the same moment, and Video Forge never reads Image Forge's keys directly.

## Batch: Many videos and job files

- **Many videos** (`electron/batch/manyVideos.ts`, `sheet.ts`): a Google Sheet link (turned into its CSV export, no key) or a CSV file. The parser accepts `,`, `;` and tab as separators, lower-cases the header, and knows aliases (`name`: title, video, file, όνομα; `script`: text, σενάριο; `topic`: about, θέμα; and so on). Only `script` is required. Columns: `name, script, topic, template, format, music, backgrounds, language`.
- One run at a time, one video at a time, through `runBatchJob`, the same function a `--job` file uses. The output folder is `<sheet> · <date> · <n> videos`. Every video gets post-production.
- **Paid voices are refused in a batch** unless the user allowed it in Settings (`paid.allow`, with a character cap): nobody is there to be asked.
- **A job file** is a `BatchJob` (`runJob.ts`): speakers as `JobSpeaker` (engine, voice settings, face paths), a preset for the look, optional `post`, `directions`, `scene`, `aiLabel`. The look comes from a preset because that is already the app's portable format.

## Two builds from one codebase

One codebase, two installers. `tools/lib/buildKind.mjs` lists the personal paths and refuses to pack them into a public build: `characters/samples/kenney/builder/models/animated/` and `motions.json` (Mixamo-derived, not redistributable). The 3D sets `mini`, `pets` and `props` are in the repo and public. The build script also checks the packed folder before it makes an installer.

- Personal has its own `appId` and installs beside Public; both share `<userData>`.
- In a public build the 3D Humans tiles are greyed with the note "In the personal build only" (`src/lib/kenney/available.ts`). A Humans speaker in an old project shows that note, and a render skips it with a warning.
- `app:info` reports `personal`, `public`, or `dev` when run from source.

## Release

1. Branch from `main`, set `version` in `package.json`.
2. Add the `CHANGELOG.md` entry (`## [x.y.z]`) and `release-notes/v<version>.md` (the English / Devenglish table).
3. `npm test`, `npx tsc --noEmit -p .`, build the exe and **install it**.
4. PR, merge, then `git tag v<version>` and push the tag.
5. `release.yml` (windows-latest, Node 22) checks tag = `package.json` version, that the notes and changelog entry exist, runs the tests and `tsc`, fetches FFmpeg, builds the public installer into a folder **outside the checkout** (`VF_OUTPUT`, because Defender locks a freshly unpacked `electron.exe` inside a scanned folder), and publishes the exes. A tag containing `-` becomes a pre-release.
6. The same tag runs `deploy-docs.yml` (this site), then `lighthouse.yml` checks it. `secret-scan.yml` runs gitleaks in CI as a backstop to the pre-commit hook.

> **Watch out** Not signed yet: no Authenticode signature, so SmartScreen shows "Windows protected your PC" (signing through SignPath Foundation is planned). The Pages environment must allow tags `v*`, or a tag deploy is refused.

## Environment variables

All optional, none loaded from a `.env` file; set them in the terminal before starting (see `.env.example`). `.env.example` is incomplete: it does not list `VIDEOFORGE_SHELVES`, `VIDEOFORGE_KEEP_RENDER` or `VIDEOFORGE_SFX_DIR`.

| Name | Effect |
|---|---|
| `VIDEOFORGE_USER_DATA` | A separate data folder, for a test copy |
| `VIDEOFORGE_RENDER_CPU` | `1` renders on the processor |
| `VIDEOFORGE_CARD_SATURATION` | Colour boost for intro and outro cards, 0.5 to 2; the in-app setting wins |
| `HYPERFRAMES_BROWSER_PATH` | Full path to a headless browser |
| `VIDEOFORGE_SHELVES` | A folder of picture shelves served read-only at `forge-kenney://shelf/` and used for stickers; default `~/Tools/assets/_shelves`, and a computer without it simply shows no shelf |
| `VIDEOFORGE_KEEP_RENDER` | `1` keeps a render's work folder for debugging and logs its path (`renderVideo.ts`) |
| `VIDEOFORGE_SFX_DIR` | Overrides the shipped sound-effects folder for the explainer's sound lookup (`tools/lib/explainerRun.mjs`) |

## Gotchas

- **Headless runs go through Electron, not plain Node**, because `app.getPath`, the vault and Chromium's network stack (which reads the Windows certificate store) are assumed everywhere.
- **Piper** runs as a lazily spawned local Python HTTP server per voice model (`piperEngine.ts`); `pythonAllowed` accepts only a Python interpreter, and leftover servers from a crashed session are reaped at start-up.
- **Child processes** are started with `spawnTracked` and `childEnv()`. Do not hand-build an environment.
- **Greek names:** `Καιτη` is not `Καίτη`, and `Kaiti` matches nothing unless it is an alias. The "no voice for this line" report is almost always this.
- **`[SFX: name]` cues work only in headless `--job` runs.** There, an unknown name stops the render by design; in the app the line is skipped as unmatched, so sounds go through Look → Sounds. The public download ships `sfx/library` empty.
- **Mixed languages in one script** do not read well; the Language setting is one choice per script. "Also in English / Greek" translates with the Gemini key at render time.
- **A render stopped half-way** discards the partial file and keeps the narration.
- **Never move the data folder.** Renames once made saved data look gone; the migration keeps the old folder in place on purpose.

## Licence and third parties

Forge Attribution License (FAL) v1.2, source available, not OSI. Free for personal, educational and commercial use; every publicly distributed output must credit "Made with Video Forge - https://stravelakis.com/forge" or equivalent. Third-party: Kenney and Quaternius (CC0), FFmpeg (GPL v3, run as a separate process). See `NOTICE`.
