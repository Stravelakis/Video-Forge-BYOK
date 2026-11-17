---
# Not reviewed yet: owner ticks templates/docs/REVIEW-CHECKLIST.md, then adds
# checkedAgainst: v0.3.0 and checkedOn: YYYY-MM-DD here.
---

## Video Forge: developer view

Desktop studio for deterministic, narrated, subtitled, avatar-driven video. Bring-your-own-keys for TTS and stock media; rendering is local.

- **Stack:** Electron app built with `electron-vite`. Render pipeline: Remotion + FFmpeg, with a HyperFrames page builder under `electron/render/hyperframes/`. Package version `0.3.0`.
- **Voices:** DramaBox (acting driven by stage directions, runs on a rented GPU) and Piper (local, flat, fast). A `[VOICE: acting=2.4]` line in a script overrides the per-character sliders for one block.
- **Lip-sync:** 9-shape visemes from forced alignment against the script. Shapes are held about 100 ms, look-alikes are merged in fast speech, half-open in-betweens are added.
- **Subtitles:** word-level timing with active-word glow, plus `.srt` and `.vtt` beside every video.
- **Output shapes:** Make -> Also as: Tall 9:16, Square 1:1, Portrait 4:5, Wide 16:9. Twin-language output translates the script and keeps the cast.
- **Batch:** a Google Sheet link or CSV, one row per video, written to a folder named `<sheet> · <date> · <n> videos`.
- **Greek:** a stress fixer adds missing accents before the voice speaks; "Say it like this" holds stubborn words.
- **Env vars (all optional, set in the terminal before starting):** `VIDEOFORGE_SECRETS_DIR`, `VIDEOFORGE_USER_DATA`, `VIDEOFORGE_RENDER_CPU`, `VIDEOFORGE_CARD_SATURATION`, `HYPERFRAMES_BROWSER_PATH`. See `.env.example`.
- **Commands:** `npm run dev`, `npm run build`, `npm run build-exe`, `npm test` (Node's built-in test runner), `npm run brand -- <name>`.
- **Recommended machine:** NVIDIA 8 GB GPU, 32 GB RAM; about one hour of render per 10-minute video.
- **Licence:** Forge Attribution License (FAL) v1.2. Source available, not an OSI open-source licence. Free for personal, school and paid work; every published video must credit "Made with Video Forge - https://stravelakis.com/forge".
