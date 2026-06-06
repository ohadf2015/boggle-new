---
status: research-only
attempted: Flag hygiene audit + funnel analysis targeting MP invite rage-click (29 clicks on invite URL)
files_touched: docs/nightly/triage-queue.md, docs/nightly/reports/2026-06-06.md
next_steps: |
  - Implement exp-mp-invite-join-cta-v1: rage-click on /es/multiplayer?room= (29 hits, 83% invite drop)
    variant: "Join Game" hero card with room preview + big CTA vs current blank wait text
  - Instrument: invite_join_attempted, invite_join_succeeded, invite_join_failed (all missing)
  - Retire share-prompt-timing (67d, ~30/arm, no winner) — callsite at SinglePlayerResults.tsx:173
  - Retire show-signup-after-first-win (67d, after-third=34, after-first=29) — callsite at useSignupPrompt.ts:61
  - mp-signup-nudge-copy-v1: toast-disabled=53 vs control=38 (30d) — still too small; re-check at 60d
  - exp-results-replay-cta-v1: only 4 days live — re-check at 14d
---

## Analysis

### Active flags
| Flag | Age | Arm sizes | Status |
|---|---|---|---|
| share-prompt-timing | 67d | ~30/arm (90d) | inconclusive; retire |
| show-signup-after-first-win | 67d | after-third=34, after-first=29 | inconclusive; retire |
| mp-signup-nudge-copy-v1 | 29d | toast-disabled=53, control=38 | too small; keep |
| exp-results-replay-cta-v1 | 4d | too early | keep |
| connections_game | — | access gate | not experiment |

### Funnel (7d)
invite_landed=18 → invite_consumed=3 → **83% drop** (rage-click confirms friction)
mp_ftue_shown=10, mp_ftue_dismissed=3; growth:mp_session_game=195

### Top signal
29 rage-clicks on /es/multiplayer?room=DVWNYZ&utm_source=copy&... (invite link)
Hypothesis: showing hero "Join Room" card with player count + big CTA vs current waiting text
will lift invite_consumed/invite_landed 16% → 30%+
