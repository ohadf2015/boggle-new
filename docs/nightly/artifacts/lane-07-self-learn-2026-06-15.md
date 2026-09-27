status: shipped
attempted: rewrite learnings.md from last 7 reports + write loop-improvements/2026-06-15.md meta-review + append lane-7 report block
files_touched:
  - docs/nightly/learnings.md (rewritten, 111 lines, <200 cap)
  - docs/nightly/loop-improvements/2026-06-15.md (new, 53 lines)
  - docs/nightly/reports/2026-06-15.md (lane-7 block appended)
  - docs/nightly/artifacts/lane-07-self-learn-2026-06-15.md (this file)
key_findings:
  - Gate fully clean only 1/6 nights; full-suite vitest wedge (rc=124, 281-358 pool-timeouts/night) is the #1 cause
  - Dark-experiment gap WIDENED 3->4 (exp-game-abandon-confirm-v1 added 06-15); all blocked on human PostHog flag creation
  - Push failed 2/6 (06-13 x4, 06-15)
  - /he home regression now n>=50 (CLS 0.460, INP +67%) -> profile-eligible
  - polish:try x11 vs idea:build x4 -> polish remains dominant appetite
top_improvement: scope nightly gate tests to changed-cone (reuse pre-push cone-shard) -> converts 5/6 timeout nights to clean
next_steps:
  - Human: create the 4 PostHog flags (single biggest leak, >=6 nights)
  - Implement loop-improvement #1 (gate cone-shard) + #2 (quarantine 3 chronic-red suites)
  - Watch /he regression now that n>=50
