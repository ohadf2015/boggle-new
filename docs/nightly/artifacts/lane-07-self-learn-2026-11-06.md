# Lane 07 — Self-learn — 2026-11-06

status: shipped
attempted: rewrite docs/nightly/learnings.md from the last 7 nightly reports + run logs, and write docs/nightly/loop-improvements/2026-11-06.md (loop meta-review).

files_touched:
- docs/nightly/learnings.md (rewritten, 200 lines — exactly at cap)
- docs/nightly/loop-improvements/2026-11-06.md (new, 109 lines)
- docs/nightly/reports/2026-11-06.md (appended Lane 7 section — note: gitignored, machine-local only)
- docs/nightly/artifacts/lane-07-self-learn-2026-11-06.md (this file)

## Verified findings (evidence, not inference)
- **7/7 nights 2026-10-30..11-05 dropped ALL lane code: 224 files.** Per-night from each run log's
  `docs-only salvage: backed up N reverted code file(s)` line — 41/39/42/14/21/33/34.
- **Root cause unchanged for 14 nights.** `rg -Nc TS2307` → 10/11/12/7/11/13/11. On 11-05 all 11 are the
  same gitignored module: `TS2307: Cannot find module '@/lib/i18n/messagesManifest.json'`
  (`fe-next/.gitignore:133`). `rg -n 'build:i18n' scripts/nightly/lib/gate-isolated.sh` → no match on master.
- **The fix exists only as a backup.** `rg -l 'build:i18n' ~/logs/lexi-nightly/salvaged-code-*/scripts/nightly/lib/gate-isolated.sh`
  → sole hit `salvaged-code-20261023-010005`. It was reverted on the night it was written because `scripts/`
  counts as code in the salvage keep-set.
- **224 dropped verified by `git show --stat`, not the log's self-report:**
  `git show --name-only --format='' 5e3ff4bc9 fed97dcbd d1a65b7d2 | rg -c '^fe-next/'` → 0 on all three.
- **NEW: the peel is LINEAR (`planned = 2N − 7`, exact on all 7 nights), and loses on per-call cost.**
  ~580s/call (4636/8 on 11-05); 61 calls ≈ 9.8h vs a 3600s budget → 3–8 calls completed, ~70 min burned
  nightly (~8.2h this window). Fix needs fewer calls AND a cheaper call; 8 per-lane calls ≈ 77 min still
  overruns today's budget. (Corrected after review — an earlier draft of this lane called it exponential.)
- **NEW: the salvage replay RAN for the first time.** 11-06 lane 01 replayed `20261104-010003` — 33 files,
  3-way merged, 0 skipped, eslint-clean. Prior learnings said "nobody replays it"; that is now false and was
  corrected. This is also why lane 01 kept 37 files.
- **NEW: `translations/*.js` is a multi-lane hotspot where last write wins** — a loss the gate never caused.
  A `blast.waveIntro.dragHint` fix was blamed on the gate for nights; lane 11 proved it was simply never
  applied. Likewise `AcademyMap.tsx`'s eslint-clean 2-line fix: uncommitted 13 nights on "leave it to the gate".
- **NEW: one lane's volume discards every other lane's.** Lane 01 kept 32 (11-05) and 37 (11-06) files vs
  lanes 02–06's 1–2 each. `file-cap=8` is printed in the time-guard line but unenforced on the keep path.
- Telegram inbound still dead: 40 ndjson files, 112 lines, last entry 2026-07-26 (103 days).
- `docs/nightly/reports/` is gitignored (`.gitignore:82`); root `.gitattributes` still absent.

## next_steps (for tomorrow's run / the founder)
1. **FOUNDER, 5 min, unblocks everything:** `cp` the gate patch out of
   `~/logs/lexi-nightly/salvaged-code-20261023-010005/scripts/nightly/lib/gate-isolated.sh`, `bash -n`, commit.
   Exact command in learnings.md Headline 1.
2. **FOUNDER, S:** add `scripts/nightly/**` to the docs-only keep-set in `scripts/nightly/run.sh` (~:1179),
   or step 1 is lost again on any night a lane touches that file.
3. **M, strictly after step 1:** replace the subset-peel with per-lane gating (8 calls) plus a tsc-only
   per-call tier and a budget sized to 8 × per-call. It ships nothing before step 1 — the TS2307 comes from
   `layout.tsx` on any fresh checkout, so it fails every per-lane call too. After step 1 it turns an
   all-or-nothing drop into per-lane isolation.
4. Enforce `file-cap=8` on the keep path; make a zero-code ship a loud Telegram ERROR; print
   `lane=<name> kept=<n> code=<n>`; un-ignore `docs/nightly/reports/`.
5. Once step 1 lands, lane 01 replays the newest salvage stamp as its first act
   (`20261105-010005`, 34 files; largest `20261101-010001`, 42).

## Deliberate non-actions
- Did NOT write `scripts/nightly/tools/gate-oracle-selfcheck.sh` despite it being the right helper: the gate
  reverts `scripts/`, so writing it tonight would repeat the 10-23 loss. Emitted as a spec in
  loop-improvements instead. This is learnings avoid-#2 applied to itself.
- Did not commit or push (per lane contract).
