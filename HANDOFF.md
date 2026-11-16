
## Next up (approved 29 Oct 2026, not started, nothing committed)
- Full-body puppets: ring, frame and waveform all default OFF (ring already done in CastPanel/PuppetShelf, uncommitted).
- New waveform styles (all approved): bottom-centre mirrored bar (low square edges, recommended), thin baseline, name-plate meter, floor glow. Drop the edge-lit frame pulse.
- Each speaker gets a signature colour, shared by waveform and clothes accent.
- Approval step before render: big view of the character with clothes; user can change clothes colour and waveform colour. No silent auto-pick; colour is proposed, user approves.
- Named recurring characters (e.g. Kostas, son-in-law): keep the signature colour fixed across videos; clothes item may change (green tie, green hat, green shirt).
- Needs a short planning session first: where colour is stored, per-show vs per-project style, side-by-side preview page.
- Ultra reviews, then commits and merges. Do not commit before that.

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
