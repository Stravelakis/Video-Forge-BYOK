# Changelog

All notable changes to Video Forge. Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versions follow [SemVer](https://semver.org/). 0.4.0-beta.1 is the first tagged release; it also carries everything made before it.

## [Unreleased]

### Added (19 Nov 2026)
- Swear-word clean-up in Post-production, Greek and English: No clean-up (default), Bleep, Mute, or Softer word. Bleep and Mute star out the subtitles (picture and .srt/.vtt). Each project can let built-in words through and add its own.

## [0.4.0-beta.1] - 2026-11-17

### Added (17 Nov 2026)
- Two versions from one codebase: **Public** (the app only, what GitHub Releases carry) and **Personal** (the app plus the owner's own brand packs, music and Mixamo moves). `npm run build-exe` makes the Personal one when that content is on the PC; `npm run build-exe:public` makes the Public one and refuses to pack anything personal.
- `scripts/personal-content.mjs` (`npm run personal`) fetches the owner's private content and links it into the app folder. Safe to run again; it never deletes anything.
- Settings shows which copy this is ("Video Forge 0.4.0-beta.1 · Public build").
- The app checks GitHub at most once a day for a newer release and shows a small link to it. Nothing downloads by itself.
- Releases: pushing a tag like `v0.4.0-beta.1` builds the public Windows installer and portable exe and puts them on a GitHub Release.

### Fixed (17 Nov 2026)
- Saving a project keeps the Direct step's directions; background blur and colour look survive a restart; New and Open project no longer carry the old project's settings over.
- Every file a render names is checked before it is used, and the render page only takes clean values.
- A shared-keys file that cannot be read is never saved over, and keys another Forge app wrote are kept.
- README links work again; the user guides are back in `docs/`.

### Changed (15-16 Nov 2026)
- Licence: Video Forge is now source-available under the Forge Attribution License (FAL) v1.2: free to use, including for paid work, with the credit "Made with Video Forge" on published videos. Copies from before 26 Oct 2026 stay MIT.
- The public repo was cleaned: only what the app needs stays in it. Brand packs, plans, research and music moved to private repos or stay on the owner's PC. Tests that need the brand packs skip when they are absent.

### Added (6-11 Nov 2026)
- Character creator: each character in its own file, part by part, with locks, a randomiser, outfits, moving previews, undo and redo.
- Character creator: marks (tattoos, scars, freckles, moles), eye quirks, and an AI box that changes only the unlocked parts and shows a preview first.
- Talking portraits: a speaker can be a portrait picture whose mouth, eyes and brows move with the voice.

### Fixed (11 Nov 2026)
- The installed app crashed on start (a command-line check in the character index); fixed.
- The installed app could not render: the characters folder was missing from the installer; now packaged.

Everything below was made before 6 Nov 2026 and is part of this release too.

### Security (6 Nov 2026)
- The video renderer's download library (undici) moved from 7.25.0 to 7.30.2, clearing 26 GitHub security warnings. Renders are unchanged.

### Changed (6 Nov 2026)
- Under the hood: React 19, Tailwind 4, Vite 8, TypeScript 7, Electron 45, Remotion 4.0.540. The app looks and renders the same; builds are about 4× faster.

### Added (27–30 Oct 2026, batch 2 and 3)
- Drawn characters: smoother movement layer, in-between poses, round smiles, beards that follow the jaw, shoes, elbows and knees that bend, Karagiozis looks, 1.5-eye turning heads.
- Sets: news desk, conference room, conference stage, podcast (facing or split screen), game show; speakers are seated, legs hidden.
- Animated pop-ups: `[pop red flag]`, `[pop d20]` or `[🎉]` in a line; 52 code-drawn icons for Ak's subjects.
- Costumes: 26 new wardrobe pieces and 21 one-click costume packs ("Dress as…").
- Caption styles: bold box, karaoke, one word, clean outline, lesson bar, plus forge sweep, comic burst and ink drop; "Words shown" and "Keep said words coloured".
- docs/AI-BRIEF.md: what the forges can and can't make, for an AI that plans series and writes scripts.

### Changed (25 Oct 2026)
- Full-body puppets no longer get the waveform ring around them: adding one (or picking one on a speaker) switches that speaker's ring off. It can still be switched back on in the speaker's waveform settings.
- The label on the picture and in the MP4 notes now reads "Made with Video Forge" (was "Made with AI · Video Forge").

### Added (13 Oct 2026)
- Cast "+" menu: every character has a live face (blinks, talks on hover), grouped Ready-made / Made in Image Forge / My library; "Order it from Image Forge" and "Open Image Forge".
- Puppet shelf: live faces and a two-click delete (moved to `%APPDATA%\Forge\puppets-deleted`, not erased).
- Automatic gestures: question = shrug, "this / here / look / αυτό / εδώ" = point, longer lines = explain; per-speaker "How much they gesture" slider. Tags `[waves] [points] [shrugs] [explains]` still work.
- Make: "Also as" Tall 9:16, Square 1:1, Portrait 4:5, Wide 16:9.
- Make: "Also in English/Greek" twin video (script translated by Gemini, same cast, matching subtitles).
- Make: "Made with AI · Video Forge" label on the picture (on by default) and in the MP4's comment metadata.
- `.srt` and `.vtt` subtitle files beside every video.
- Greek stress fixer: Greek words typed without a tonos get one before the voice speaks (subtitles unchanged); Settings → "Say it like this" word list.
- Settings → Language card (English now; Greek, French, German, Spanish, Portuguese coming soon).
- Hover help bubble on every control, shared with Image Forge, plus `tools/lib/hoverHelp.test.mjs`.
- Many videos: output folder named `<sheet> · <date> · <n> videos`.
- Shared keys file now also carries openai, groq, elevenlabs and fish names.

### Changed
- Smoother mouths: shapes held ~100 ms, look-alikes merged in fast speech, quick consonants skipped, short vowels half-open, half-open in-betweens (visemes 10, 11, 12).
- Primary buttons are readable (lighter gradient).

### Fixed
- Arm pictures were never loaded; now they are. Whole-body poses replace the resting body.
- Frame thickness and gestures now reach the final render.
- Boiling waveform now shows in the preview (SVG id clash).
- Sample subtitles alternate Greek and English before narration exists.

### Earlier (12-13 Oct 2026)
- Many videos from a Google Sheet or CSV; Cast "Puppet" section with frame thickness; "around the video" waveform position; keys shared with Image Forge; puppets from Image Forge shelf.
- Renamed from BYOK-Vid-Creator to Video Forge (9 Oct).
