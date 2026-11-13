status: research-only
files_touched: none (docs/nightly/reports/2026-11-13.md appended, this artifact)
next_steps: |
  - Brief's top target (/en/word-craft rage clicks) was a FALSE GAP: exp-wordcraft-hint-duration-v1
    is already fully wired, its PostHog flag already live, and its guardrail event
    word_craft_turn_submitted already fires. No action was needed there tonight.
  - Swept all 17 wired `exp-*` experiments in lib/experiments.ts — every one already has a live
    PostHog flag (`status:"exists"` on every `ensure` call). No decided-winner cleanup candidates
    found (no fresh HogQL n/p-value pull done this run — skipped per brief-first contract since
    the rage-click/flag slice of the brief was fresh, not stale).
  - 10 defined experiments remain genuinely UNWIRED (0 non-test call sites): exp-mp-quickplay-wait-v1,
    exp-mp-round-feedback-top-v1, exp-mp-score-gap-nudge-v1, exp-mp-auto-continue-v1,
    exp-landing-quick-play-v1, exp-edu-demo-interrupt-v1, exp-homepage-click-feedback-v1,
    exp-mp-round-reaction-v1, exp-mp-results-rival-best-word-v1, exp-profile-locked-tile-tap-v1.
    Tomorrow's lane 03 should pick ONE of these, wire its variant-B call site, then `ensure` its flag.
  - Tomorrow: re-run the HogQL funnel pull (homepage→game-start→game-complete→return-day-2) —
    this run spent its time budget on the experiment-wiring sweep instead, per the brief's
    "act on the top slice first" instruction, and ran out of time before reaching it.
  - Lesson for lane 07 playbook: `rg` hangs/times out when run from fe-next root without excluding
    .next/node_modules/public even with -g excludes in this repo tonight — scope greps to specific
    dirs (components app hooks utils backend) with short --timeout, not root-wide scans.
