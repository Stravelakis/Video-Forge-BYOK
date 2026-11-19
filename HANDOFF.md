
## Next up (approved 29 Oct 2026, not started, nothing committed)
- Full-body puppets: ring, frame and waveform all default OFF (ring already done in CastPanel/PuppetShelf, uncommitted).
- New waveform styles (all approved): bottom-centre mirrored bar (low square edges, recommended), thin baseline, name-plate meter, floor glow. Drop the edge-lit frame pulse.
- Each speaker gets a signature colour, shared by waveform and clothes accent.
- Approval step before render: big view of the character with clothes; user can change clothes colour and waveform colour. No silent auto-pick; colour is proposed, user approves.
- Named recurring characters (e.g. Kostas, son-in-law): keep the signature colour fixed across videos; clothes item may change (green tie, green hat, green shirt).
- Needs a short planning session first: where colour is stored, per-show vs per-project style, side-by-side preview page.
- Ultra reviews, then commits and merges. Do not commit before that.

## 18 Nov 2026: user docs and docs site (branch docs/guide-and-site, PR open, not merged)
- **GUIDE.md** is now the full manual (every screen, from the code); **INSTALL.md** covers install from zero, the unsigned-app screen, building from source, Public vs Personal. The old guides in `docs/` (WRITING-SCRIPTS, PUPPET-MAKING, PUPPET-CELLS, VISEME-SHEETS, BRAND-PACKS, eli5/make-a-video, docs/INSTALL) are folded in and left as one-line pointers so old links work. MOVE-TAGS stays the generated reference.
- **docs/glossary.yml**: 40 terms, Dev/English/ELI5 (moved from site/glossary.yml).
- **site/**: three levels regenerated and stamped v0.4.0-beta.1 / 2026-11-18 (owner still ticks REVIEW-CHECKLIST); new share card with the logo (`npx electron site/scripts/social/render.cjs`); PNG favicon; carousel fills itself from `docs/media/` (src/data/showcase.ts), hidden while that folder is empty. Site-only fixes: GUIDE/INSTALL links rewritten for the site (sync-docs.mjs), stamp date as "18 Nov 2026", min 13px text, wide tables scroll in place, no scroll-reveal on the long Install/Guide sections (they never appeared). Worth copying back into repo standards/docs-theme.
- **lighthouse.yml + lighthouserc.json** added (runs after "Deploy docs site").
- Open: the address is /Video-Forge-BYOK/ (what Pages serves for this repo name); the repo homepage says /video-forge/. Pages environment allows only `main`, so a `v*` tag deploy is refused until a tag rule is added. No Tally form yet. TODOs left in GUIDE/INSTALL (screenshot, DramaBox, viseme-sheet picker, YouTube secrets dir, Repair/Update).

## 18 Nov 2026: public 3D cast and a full ffmpeg in the installer (branch fix/public-3d-and-ffmpeg, PR open, not merged)
- **3D sets now public:** `characters/samples/kenney/builder/models/{mini,pets,props}` are in this repo (86 .glb, 20.4 MB). Checked: no "mixamo" in any file; part names and motion names are Kenney's Mini Characters / Cube Pets ones (not compared byte for byte with Kenney's downloads: these were re-exported from Blender with face cards). Props: 28 Kenney, 5 Quaternius (CC0), 9 made for Video Forge (props.json "by"). Credits in README and the new NOTICE.
- **Still private:** `models/animated/` and `motions.json` (Mixamo). `.gitignore` now ignores only those (the old bare `models/` rule is `/models/`, root AI weights only). `npm run personal` links only `models/animated`; it removes the old whole-`models` link (links hold no data) and brings the public sets back from git. Guard (`tools/lib/buildKind.mjs`) refuses animated + motions.json, allows the three sets; `npm run build-exe:check` prints the sets that would go in.
- **On the owner's PC, when this is merged:** `git pull`, then `npm run personal`. (The pull writes the three sets through the old link into the private clone first; they are identical files, so nothing changes there. The private repo can drop mini/pets/props later.)
- **Public build without the Humans:** the 3D Humans style, shelf button, cast tiles and editor are greyed with the hover note "In the personal build only." (`src/lib/kenney/available.ts`, HEAD check of `models/animated/animated.glb` + `motions.json`). A Humans speaker in an old project shows the note instead of an error; a render skips them with a warning.
- **Full ffmpeg:** gyan.dev 9.0.2 essentials (GPL v3), pinned in `tools/lib/ffmpegBundle.mjs` (URL, size, SHA-256). `npm run ffmpeg` downloads it once to `build/ffmpeg-cache/`, checks it, unpacks ffmpeg.exe + LICENSE.txt + README.txt to `build/ffmpeg/` (gitignored), and runs it to confirm version and filters. `build-exe` does this first and refuses to make an installer without `resources/ffmpeg/`; the release workflow fetches it too (cached).
- **Which ffmpeg runs** (`electron/process/ffmpegChoice.ts`): installer's own → full one on PATH → Remotion's. Post-production still asks the chosen one for its filters and warns about missing ones.
- **Size:** ffmpeg.exe is 105 MB installed; installer and portable exe each grow about 28 MB (measured LZMA size of ffmpeg.exe).
- Not done: no installer built locally; release workflow not run; the greyed-out tiles not looked at in the running app.

## 17 Nov 2026: two versions (Personal / Public) and releases (branch feat/personal-and-releases, PR open, not merged)
- **Public** = the app only; GitHub Releases carry it. **Personal** = the app + the owner's content: brand packs, music, Mixamo moves and models.
- Personal content lives in the private repo **DnD-World/Video-Forge-personal** (renamed from Video-Forge-brands 17 Nov; brands moved to `brands/`, plus `music/`, `characters/samples/kenney/builder/motions.json` and `.../models/`, same paths as in the app).
- Get it: `npm run personal` (scripts/personal-content.mjs). Clones the repo beside the app folder (`../Video-Forge-personal`, never inside: the installer would keep broken links), links the folders in with junctions, copies motions.json. Safe to rerun; never deletes; anything in the way is moved to `<name>.before-personal-<date>`. Handles the old layout where `brands/` was itself a clone.
- Build Personal: `npm run build-exe` (picks Personal when the content is present) → `release/Video Forge Personal Setup x.y.z.exe`. Separate app id, so it installs beside the Public one; saved data is shared.
- Build Public: `npm run build-exe:public` → `release/Video Forge Setup x.y.z.exe`. Refuses if its settings would let personal content in, and checks the packed folder before making the installer. `npm run build-exe:check` = dry run with electron-builder's own file rules.
- Settings shows "Video Forge <version> · Personal/Public build". Update notice: main process asks the GitHub Releases API at most once a day (`update-check.json` in the data folder); link only, no download.
- Release: set `version` in package.json, CHANGELOG entry, `release-notes/v<version>.md` (English/Devenglish table), merge to main, then `git tag v<version> && git push origin v<version>`. `.github/workflows/release.yml` builds the Public installer + portable exe and publishes the Release (pre-release when the tag has a "-"). Not tagged yet: 0.4.0-beta.1 is ready for the owner to check.
- Not verified: no exe was built locally (heavy); the release workflow has not run yet.

## 19 Nov 2026: swear-word clean-up (branch feat/swear-cleanup, plan 10b)
- Rules, lists, matching, swap/mask, bleep windows, word times from heard stretches: `src/lib/post/swears.ts` (pure, `tools/lib/swears.test.mjs`).
- Per render: `electron/post/swearPlan.ts` (windows + starred subtitles), `speechIslands` in `runPost.ts` (silencedetect), bleep/mute in `speechGraph` (`censor`). Mute only in the writing pass, so loudness matches a clean render.
- Softer word: applied to the text the voice is asked for (`spokenText` in `resolveSegments.ts`, app and batch). Words still in old voices are bleeped with a warning.
- Screen: `src/components/render/SwearCleanup.tsx`. Default off; old projects open off.
- Checked 19 Nov: real speech (Windows voice) through bleep/mute/off: silences end where planned to the ms, bleep is 1 kHz at about -18 dB, studio sound alone = -14.0 LUFS, peaks -1.0. Not checked: a full video render with it on; Greek on real Greek speech.

## 17 Nov 2026: post-production after every render (branch feat/post-production, PR open, not merged)
Plan items A4, 1, 1b, 2, 3 (Blacksmith/FORGES-PLAN-2026-11-17.md).
- Settings, presets and panning maths: `src/lib/post/postSettings.ts`. Filter graphs (pure, tested): `electron/post/postGraph.ts`. Running them: `electron/post/runPost.ts`.
- Where it runs: inside `renderVideo`, so the Render step, Many videos and `--job` all get it. The narration is processed before the frames (audio only, two quick passes: measure, then apply). The colour grade is the one extra video encode, after the frames and before the intro/outro are joined, and only when a grade is on.
- Studio sound: high-pass 80 Hz, gentle compressor, light de-ess, two-pass loudnorm to -14 LUFS / -1 dBTP. Speech only (needs narration lines); a hand-attached audio file is left alone. Music and effects are mixed after, untouched, so the final mix can sit a little above -14.
- Voice characters per speaker (Cast > Voice): natural, chibi/bubbly, bright and young, warm narrator, deep and dramatic, radio, plus Pitch / Brightness / Sparkle. Heard in "Test the voice" through the same graph (`tts:testVoice` takes `character` and `studioSound`).
- Voices left/right: balance from each speaker's x (or their seat in a set), far side down by at most 30%. Off with one speaker.
- Colour grade: a user-picked `.cube` (path-guarded like every other job file) + contrast + saturation via `lut3d` + `eq`.
- Saved: `post` is in PLAIN_FIELDS (file + autosave); `voiceCharacter` rides on each speaker. New projects: studio sound on. Older files and autosaves: all off. Batch job files: `post` field, else the preset's (Many videos carries the project's), else off.
- ffmpeg: the app prefers a full ffmpeg on PATH (gyan 8.1 here: has rubberband, so formant shifts work). Remotion's bundled copy has none of highpass/acompressor/deesser/EQ/chorus/aecho/rubberband/lut3d/eq: pitch falls back to asetrate+atempo, the rest is skipped with a warning. Shipping a full ffmpeg is a packaging decision.
- Tests: `tools/lib/postProduction.test.mjs` (in `npm test`), incl. a real check that every preset's graph runs on both ffmpegs on a 3 s tone. Not heard by a person yet; the grade was checked on a 32 px test clip only.

## 17 Nov 2026: save/restore holes and hostile project files (branch fix/save-and-render-safety, not merged, awaiting review)
From the 16 Nov review (Blacksmith/reviews-2026-11-16/VIDEO-FORGE-REVIEW.md), all confirmed in code first.
- Save project now keeps the Direct step's directions (`directions` added to PLAIN_FIELDS; this also gives directions undo and the unsaved-work warning, review S2). Directions read from a file are shape-checked (`cleanDirections`). Older files open as before, with no directions.
- The autosave now uses the project file's own field list (`autosaveSnapshot`), so background blur and colour look survive a restart and the two lists cannot drift again.
- New / Open project start from `blankProject(defaultProject)`: every project field is cleared before the defaults go on, so the old project's directions and colour look no longer leak in. Defaults gained `directions: {}` and `backgroundColorLook: "none"`.
- `render:start` puts every file the job names (narration, music, intro, outro, logo, banner, effects, backgrounds, face sheets, puppets) through the path guard before anything is copied (`electron/render/jobSafety.ts`); puppet art inside a puppet file is checked too.
- The HyperFrames page builder moved to `electron/render/hyperframes/hfPage.ts`; every value written into it is a forced number, a fixed word, or escaped. `renderVideo` also turns every numeric job field into a real number first, and the ffmpeg effect volume only takes a number.
- Tests: `tools/lib/projectRestore.test.mjs`, `tools/lib/renderSafety.test.mjs` (in `npm test`).
- Follow-ups not done: S5 (damaged autosave = blank app, no error boundary), S6, X4, X5; S8 is now the other way round (preview and render both refuse unpicked files from another PC, so such a render stops with a "pick it again" message); the batch path (`runJob.ts`) still renders without the path guard (job files are the user's own).

## 16 Nov 2026: repo cleaned and moved
- Public repo: **Stravelakis/video-forge**. History rewritten: only files the app needs, no private addresses, commit emails = GitHub noreply. Scan-history and gitleaks clean.
- Old repo with full history: **DnD-World/Video-Forge-archive** (private). Backup bundle: `D:\Backups\video-forge-2026-11-16\`.
- Moved out, kept on this PC (gitignored):
  - `brands/` = private repo DnD-World/Video-Forge-brands (renamed Video-Forge-personal 17 Nov, see above)
  - `workshop/` = private repo DnD-World/Video-Forge-workshop (plans, research, labs, dev tools, test jobs, legal drafts, music copy)
  - `music/`, `CLAUDE.md`, `.claude/` stay local only
- Branches/worktrees made before 16 Nov carry the OLD history. A push guard (`.git/guard-hooks/pre-push`) refuses them. To keep their work: cherry-pick the commits onto `clean-up`.
- Tests that read the brand packs skip when `brands/` is absent.
- Still to do: README, GUIDE, INSTALL and the docs site at docs.stravelakis.com/video-forge/.
