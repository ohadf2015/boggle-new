status: shipped
attempted: rewrite docs/nightly/learnings.md from the 10-21..10-27 window + write docs/nightly/loop-improvements/2026-10-27.md
files_touched:
  - docs/nightly/learnings.md (rewritten, 200 lines)
  - docs/nightly/loop-improvements/2026-10-27.md (new, 105 lines)
  - docs/nightly/reports/2026-10-27.md (Lane 7 section appended)
headline: the loop cannot ship a fix to itself. Lane 7's 10-23 `build:i18n` gate fix was
  written into scripts/nightly/lib/gate-isolated.sh, classified as CODE, and reverted by the
  docs-only salvage it was written to prevent. It survives only as
  ~/logs/lexi-nightly/salvaged-code-20261023-010005/scripts/nightly/lib/gate-isolated.sh.
  Proof: `rg -n build:i18n scripts/nightly/lib/gate-isolated.sh` -> no match on master;
  `git log --oneline -- scripts/nightly/lib/gate-isolated.sh` top entry 743f71b6fc (pre-10-23).
  Consequence: TS2307 on @/lib/i18n/messagesManifest.json in app/[locale]/layout.tsx still fires
  in every clean-HEAD worktree (rg -Nc TS2307 per night: 12/11/13/10/11/4), always unattributable,
  always docs-only drop-all. 100 code files dropped in 6 nights; 27 days of zero nightly code.
  Secondary: last night's handed-down verification grep `rg 'TS2307 .*messagesManifest'` (space,
  not colon) returned 0 on all 7 logs and was read as "fix held" - a false negative of our own making.
next_steps:
  - FOUNDER (S, ~5 min, blocks everything else): cp the gate script from
    salvaged-code-20261023-010005 back over scripts/nightly/lib/gate-isolated.sh, bash -n, commit;
    then add `scripts/nightly/**` to the docs-only salvage keep-set in scripts/nightly/run.sh (~:1179).
  - gate: abort the peel when the error set stops shrinking (cap 3) - 10-24 burned 61 min on 6 of 61 calls.
  - run.sh: a zero-code ship must be a loud ERROR card; print `lane=<name> kept=<n> code=<n>`.
  - lane 01: replay the newest unshipped salvage stamp first (newest 20261026-010726 = 11 files,
    largest 20261024-010154 = 34) - only after the gate fix lands.
  - lane 07 prompt: emit infra fixes as copy-pasteable patches in loop-improvements, never as edits.
  - verification rule now in learnings: grep the error CODE alone (`rg -c TS2307`), never code + prose.
