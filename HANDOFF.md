
## Next up (approved 29 Oct 2026, not started, nothing committed)
- Full-body puppets: ring, frame and waveform all default OFF (ring already done in CastPanel/PuppetShelf, uncommitted).
- New waveform styles (all approved): bottom-centre mirrored bar (low square edges, recommended), thin baseline, name-plate meter, floor glow. Drop the edge-lit frame pulse.
- Each speaker gets a signature colour, shared by waveform and clothes accent.
- Approval step before render: big view of the character with clothes; user can change clothes colour and waveform colour. No silent auto-pick; colour is proposed, user approves.
- Named recurring characters (e.g. Kostas, son-in-law): keep the signature colour fixed across videos; clothes item may change (green tie, green hat, green shirt).
- Needs a short planning session first: where colour is stored, per-show vs per-project style, side-by-side preview page.
- Ultra reviews, then commits and merges. Do not commit before that.

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
