status: shipped
attempted: Rewrite docs/nightly/learnings.md from last 7 reports + write loop-improvements/2026-06-13.md meta-review.
files_touched:
  - docs/nightly/learnings.md (rewritten, 105 lines, window shifted to 06-08..06-13)
  - docs/nightly/loop-improvements/2026-06-13.md (new, 48 lines, 5 improvements + 2 scripts + 4 ideas)
  - docs/nightly/reports/2026-06-13.md (appended Lane 7 block)
note: Founder directive (word-vault escape-room rework) = Lane 05 scope, not Lane 07 — noted + skipped per lane rules. Lane 05 already shipped the hub rework tonight (puzzle mechanics deferred).
key_findings:
  - 06-13 strongest ship night of window — founder-directive fast path converted 3 named requests (word-vault, adventure, wordcraft Conquest) to shipped code in one run.
  - Dominant unchanged gap (≥5 nights): 3 PostHog experiments wired-but-dark, blocked-on-human flag creation. Single biggest loop ROI leak.
  - Feedback 7d: polish:try ×11 / polish:pass ×2; idea:build ×4 / idea:pass ×1 (80%, first non-build); night quality buttons silent.
  - word-vault drew polish:pass button BUT founder text directive — recorded that free-text outranks button feedback (different axes).
next_steps:
  - Human: create the 3 PostHog flags (exp-mp-quickplay-wait-v1, exp-invite-arrival-clarity-v1, exp-practice-wheel-cta-v1) to unblock invite/practice/rage-click measurement.
  - Lane 05: deepen word-vault puzzle mechanics (cipher jars, logic-sequence) per founder directive.
  - Consider shipping scripts/nightly/tools/feedback-aggregate.sh + flag-queue-append.sh (proposed in loop-improvements, not yet created — needs prompt wiring).
