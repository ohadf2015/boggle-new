status: shipped
files_touched:
  - docs/nightly/learnings.md (rewritten, 171 lines)
  - docs/nightly/loop-improvements/2026-08-17.md (new)
  - docs/nightly/reports/2026-08-17.md (Lane 7 section appended)
summary: |
  Off-master preflight abort (last week's #1) is FIXED — 5/5 nights launched on a dirty
  founder tree with WIP snapshot + isolated ship. New #1 is two stranded
  refs/nightly-pending/{2026-08-03,2026-08-06} whose auto-recover has failed ~14 nights
  with only a WARN line. Lane scheduler (8/12 lanes) halved night wall-clock but is
  starving lane 08 (blog cadence) and skipped lane 07 itself on 08-15. Gate's new
  conclusive typecheck tier rescued 08-16's whole authored set from a docs-only drop.
  Restore queue fully clean (08-09/08-13/08-14 all resolved).
next_steps:
  - Wire scripts/nightly/tools/gate-record.sh into gate-isolated.sh (per-check gate attribution)
  - Escalate stranded-ref auto-recover to Telegram alert at >=3 consecutive failures
  - Add scheduler pin/exemption for lane 08 (founder blog directive) and lane 07 (meta lane)
  - Pre-seed cookie-consent before first navigation (unblocks lane 11 visual QA + lane 02 CLS, 13+ nights)
  - Lane 11 prompt hard-stop: same blocker twice => fix blocker or rotate mode (wheel-rush x6)
