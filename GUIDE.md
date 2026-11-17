# Guide: make a video

Four steps, left to right: **Cast, Script, Look, Make.**

## 1. Cast: who is talking

- Press **+** to add a character. Pick a face from the list: ready-made, made in Image Forge, or from your own library.
- Hover over a face and it talks to you.
- Give each character a voice.
- **How much they gesture** sets how much they wave their hands. Zero keeps the hands still. Hands move on their own: a question gets a shrug, "this" or "here" gets a point.
- The app ships with no characters of its own. Make your own (`docs/PUPPET-MAKING.md` in the repo), or switch on a brand pack with `npm run brand -- <name>` (`docs/BRAND-PACKS.md`).

## 2. Script: what they say

- Write one line per speaker: `Name: what they say`.
- The name before the colon must match the name in the Cast panel exactly. Capital letters do not matter. Spelling and accents do.
- Add feelings or actions in square brackets: `[laughs]`, `[waves]`, `[points]`, `[shrugs]`, `[nods]`.
- Greek without accent marks is fine. The app adds them before the voice speaks. If a word still sounds wrong, add it to **Settings -> Say it like this**.
- Short lines cut faster: one line is one scene, and a scene gets one background clip.
- More on writing scripts: `docs/WRITING-SCRIPTS.md` in the repo.

## 3. Look: how it looks

- Pick the frame, the moving sound bars, the subtitles and the background.
- There are 6 waveform styles, 8 one-click caption styles, and sets such as a news desk, conference room, stage, podcast and game show.
- What you see in the preview is what you get.

## 4. Make: get the file

- Press **Render video**.
- **Also as:** tick Tall, Square, Portrait or Wide to get more shapes from the same script.
- **Also in English / Greek:** get a second copy in the other language. The script is translated, the cast stays, the subtitles match.
- **Made with Video Forge:** a small label on the picture. On by default. Publishing a video means crediting "Made with Video Forge - https://stravelakis.com/forge" (see the licence).
- When it finishes you get the video plus `.srt` and `.vtt` subtitle files beside it.
- **Many videos:** paste a Google Sheet link (shared "anyone with the link") or a CSV with one row per video. They are made one after another into a folder named after the sheet.

## Stuck?

Hover over anything: a button, a label, a badge, a number. A bubble says what it is in plain words. No mouse? Press **Tab** to reach it. **Esc** closes the bubble.

## Keys

Open **Settings** with the gear at the top right. Each online helper has its own box: ElevenLabs, Gemini, OpenRouter, NVIDIA, Groq, Cerebras, OpenAI, Mistral, Pixabay, Pexels, Freesound. Paste the key, press **Save**, then **Test**. If a message says a key is missing, it has an **Open Settings** button. No key is charged without you adding it.
