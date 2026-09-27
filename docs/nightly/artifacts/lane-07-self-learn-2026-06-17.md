status: shipped
attempted: rewrite docs/nightly/learnings.md from last 7 reports + write loop-improvements/2026-06-17.md meta-review
files_touched:
  - docs/nightly/learnings.md (rewritten, 108 lines, DO-NOT-EDIT blocks preserved verbatim)
  - docs/nightly/loop-improvements/2026-06-17.md (new meta-review)
  - docs/nightly/reports/2026-06-17.md (appended Lane 7 stanza)
key_findings:
  - Gate full-vitest wedge = #1 loss (5/6 nights docs-only salvage). Fix = scope gate tests to changed-cone.
  - PostHog flag gap narrowed 4->2 on 06-17 (first reduction in 7+ nights) after d6dcb3270 autonomous flag creation.
  - Stranded push refs/nightly-pending/2026-06-13 still unrecovered 4+ nights; blind-retry cherry-pick fails on conflict.
  - polish:try 9/0 (100% try-rate) vs idea:build 1 / idea:pass 2 = polish outranks new ideas 9:1.
next_steps:
  - infra/lane-07: ship scripts/nightly/tools/gate-cone-tests.sh (specced, not built this run — out of budget)
  - infra: replace blind-retry push recovery with inspect-or-drop (move ref to refs/nightly-stranded/)
  - lane 03: build exp-game-abandon-confirm-v1 wiring component (defined but no variant exists), then flag
  - add docs/nightly/human-queue.md single machine-readable handoff queue (Supabase migrations + PostHog flags)
