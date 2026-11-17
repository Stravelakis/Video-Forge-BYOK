
## Next up (approved 29 Oct 2026, not started, nothing committed)
- Full-body puppets: ring, frame and waveform all default OFF (ring already done in CastPanel/PuppetShelf, uncommitted).
- New waveform styles (all approved): bottom-centre mirrored bar (low square edges, recommended), thin baseline, name-plate meter, floor glow. Drop the edge-lit frame pulse.
- Each speaker gets a signature colour, shared by waveform and clothes accent.
- Approval step before render: big view of the character with clothes; user can change clothes colour and waveform colour. No silent auto-pick; colour is proposed, user approves.
- Named recurring characters (e.g. Kostas, son-in-law): keep the signature colour fixed across videos; clothes item may change (green tie, green hat, green shirt).
- Needs a short planning session first: where colour is stored, per-show vs per-project style, side-by-side preview page.
- Ultra reviews, then commits and merges. Do not commit before that.

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
  - `brands/` = private repo DnD-World/Video-Forge-brands
  - `workshop/` = private repo DnD-World/Video-Forge-workshop (plans, research, labs, dev tools, test jobs, legal drafts, music copy)
  - `music/`, `CLAUDE.md`, `.claude/` stay local only
- Branches/worktrees made before 16 Nov carry the OLD history. A push guard (`.git/guard-hooks/pre-push`) refuses them. To keep their work: cherry-pick the commits onto `clean-up`.
- Tests that read the brand packs skip when `brands/` is absent.
- Still to do: README, GUIDE, INSTALL and the docs site at docs.stravelakis.com/video-forge/.
