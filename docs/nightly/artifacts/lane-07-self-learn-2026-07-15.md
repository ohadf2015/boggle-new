status: shipped
attempted: rewrite learnings.md from last 7 reports + write loop-improvements/2026-07-15.md meta-review
files_touched:
  - docs/nightly/learnings.md (rewritten, 91 lines)
  - docs/nightly/loop-improvements/2026-07-15.md (new, 49 lines)
  - docs/nightly/reports/2026-07-15.md (Lane 7 section appended)
key_findings:
  - Gate "salvage" nights were false-NEGATIVES (vitest fork oversubscription under CPU load), root-fixed 07-14 by c3973c715 — first real attack on the treadmill vs prior restore-only reflex.
  - 0 pushed-code reverts across window; salvage drops pre-push, restores round-trip clean.
  - Crossword 55→88% in 4 nights, ~1 night to release. Word-tower stays Released.
  - Supabase MCP dead 20 straight nights; 4 migrations stale-backlogged — human-blocked on never-expire PAT.
  - Feedback flat (3 callbacks, no new files after 07-11); both polish votes shipped; only Blast Ghost Round unbuilt.
next_steps:
  - Lane 07 next 3 nights: classify each gate outcome full|reduced|salvage explicitly to verify c3973c715 converts salvage→full.
  - Author scripts/nightly/tools/gate-outcome.sh (deferred this run, out of budget) to auto-extract gate outcome + failed check + rc.
  - Lane 12/03: pivot from telemetry wiring to DIAGNOSING the 53-56% completion crater (query game_abandoned by mode + last-screen).
