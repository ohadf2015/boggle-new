status: partial
files_touched: none (fe-next code untouched this run — only docs/nightly/* + live PostHog REST writes)
next_steps: |
  - Found exp-mp-quickplay-eager-disable-v1 was wired since 07-28 but its PostHog flag was missing entirely (100% control-only) — created it live tonight (id 238760). Re-check next run whether rage clicks on /multiplayer actually drop now that variant-B serves.
  - 10 experiment defs in lib/experiments.ts are unwired (0 non-test call sites): exp-wordwheel-drag-hint-v1, exp-results-replay-cta-v1, exp-leaderboard-play-cta-v1, exp-mp-quickplay-wait-v1, exp-invite-arrival-clarity-v1, exp-mp-round-feedback-top-v1, exp-wordhunt-hint-v1, exp-mp-score-gap-nudge-v1, exp-landing-quick-play-v1, exp-wordcraft-hint-duration-v1. Pick 1-2 and wire next run, then ensure their flags.
  - mp_round_issue_selected is still 0 since shipping 2026-07-24 (5 days) — verify the issue-probe chips actually render in prod (not just a slow-metric issue) before waiting longer.
  - Did NOT get to: new typed experiment for the brief's rage-click targets (/practice/classic?play=1, /ja homepage) or new instrumentation events — ran out of time budget after the flag-wiring sweep (an `rg --type tsx` bug cost ~2min debugging silent-0-result greps). Good starting point for tomorrow: investigate those two rage-click URLs first before picking a fix.
  - Flag-hygiene retirement (goal 1) needs an experiment-results/stats pull (p<0.05, n≥1000/arm) not attempted this run — worth a dedicated pass.
