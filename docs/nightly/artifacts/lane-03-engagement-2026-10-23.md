status: research-only
attempted: flag hygiene sweep + rage-click driven experiment on multiplayer/adventure/word-craft + instrumentation gaps
files_touched: docs/nightly/triage-queue.md, docs/nightly/reports/2026-10-23.md (docs only, no code)
next_steps: |
  - exp-homepage-click-feedback-v1 is a dark flag (live in PostHog, 0 code call sites).
    Before wiring, re-pull $rageclick el_text/selector breakdown for /en + / to confirm
    hits land on ModeCard DOM nodes. If yes, suspect mobile :active not firing on
    tap-down without a touchstart listener (ModeCard's CSS press effect predates the
    flag by 7 months) — fix via touchstart-triggered class toggle, not the flag.
  - No new experiment shipped: tonight's rage-click brief items (adventure, connections/
    daily, multiplayer, word-craft, word-tower-ja) were all reach=2 — too thin to act on
    blind; prior lane-03 nights already found this PostHog heuristic noisy on gameplay
    taps (see triage-queue.md 10-21 entry re: /en/multiplayer false positive).
  - No instrumentation gaps closed this run — ran out of safe time budget after the flag
    investigation; re-run goal 3 (2-3 analytics events) fresh next night.
