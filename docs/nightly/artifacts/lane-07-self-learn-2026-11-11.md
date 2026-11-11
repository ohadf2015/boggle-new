status: shipped
attempted: rewrite learnings.md from the 11-05..11-10 window + write loop-improvements/2026-11-11.md
files_touched:
  - docs/nightly/learnings.md (rewritten, 199 lines)
  - docs/nightly/loop-improvements/2026-11-11.md (new, 128 lines)
  - docs/nightly/reports/2026-11-11.md (Lane 7 section appended)
key_findings:
  - The volume theory is dead. Lane 01's clamp worked (37 kept files -> 3) and the gate still failed
    every night. 11-07 ran 16 files in 6 units and the bisect returned "NO PASSING SUBSET — every one
    of 6 unit(s) failed": six independent lanes cannot all be broken, so that verdict is an
    environment signature, not lane code. The oracle is poisoned.
  - Headline 1 unchanged after 19 nights. `rg -c 'build:i18n' scripts/nightly/lib/gate-isolated.sh`
    -> NO MATCH. 54 TS2307 messagesManifest lines across 5 gated logs. Backup re-verified present
    (58668B, Oct 23 03:20). One `cp` fixes it. FOUNDER ACTION.
  - NEW: 11-09 lost the whole night to the monthly spend cap (lane 01 rc=76 at 01:16, circuit breaker
    deferred all 8 lanes) and ended with "residual ship OK" + "nightly-loop complete". The
    long-carried "spend-cap leaves no artifact" watch has fired for real.
  - 11-06 and 11-07 printed the docs-only salvage line and created NO COMMIT (git log --all --grep
    -> empty for both). 11-05/11-08/11-10 committed 12/11/8 files with 0 under fe-next/.
  - 39 consecutive days of zero nightly code on master, while master merged ~40 PRs (#1783-#1815) in
    3 days from interactive sessions. The repo is healthy; only the loop is failing.
next_steps:
  - FOUNDER: run the one-line `cp` of gate-isolated.sh (Headline 1 in learnings.md). Nothing else in
    the loop matters until it lands.
  - FOUNDER: add scripts/nightly/** to the salvage keep-set in run.sh (~:1179) so lane 07 can ship
    its own repair instead of emitting patches into a doc for the 5th window.
  - Tomorrow's lane 07: verify the night's commit with `git show --name-only --format='' <sha> |
    rg -c '^fe-next/'`, never a log line. Check whether improvements #1-#4 landed before re-ranking;
    do NOT revive the volume theory, and do NOT re-prioritise the cheaper-peel work until #1 ships.
  - Tonight's run (11-11) kept 2/2/2/3/7/3 files across 6 lanes = 19 files. Expect the same TS2307
    failure at ~03:30 unless #1 landed in between.
