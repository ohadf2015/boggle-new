---
status: research-only
attempted: impact checks, flag hygiene audit, funnel analysis, triage-queue stale-flag backlog
files_touched:
  - docs/nightly/impact-ledger.ndjson (2 verdict lines appended)
  - docs/nightly/triage-queue.md (10 stale experiments added)
next_steps: |
  1. Implement exp-practice-tile-loading-v1 in PageClient.tsx + experiments.ts
     (practice "Start here" rage click, variant=loading-state shows spinner after tap)
  2. Add game_abandoned instrumentation event (game_started→game_completed 33.5% gap, no event exists)
  3. Human: review 10 stale flags in triage-queue (>14d, all wired, need PostHog stats review)
  4. Impact of exp-connections-hint-gate-v1 (3d old) — check in 4 days
---

## Findings

### Impact checks
- multiplayer rage click (baseline=1): 0 in 7d → IMPROVED
- connections/play rage click (baseline=2): 2 in 7d → NEUTRAL

### Funnel (7d)
- game_started: 2928 → game_completed: 1946 = **33.5% drop** (biggest gap)
- No `game_abandoned` event exists — PostHog cannot distinguish rage-quit from session-expiry
- practice_started: 251 → practice_completed: 107 = 57.4% drop (secondary)

### Rage clicks (7d)
- /en homepage: 5 null-element + "Play free now" (1) + "How to play" (1) = 7 total
- /en/practice: "Start here" (1)
- /es homepage: 1
- /he/daily/word-hunt: "Back" (1)

### Flag hygiene
- 10 experiments running >14 days with active call sites, no retirement → added to triage-queue
- 3 flags inactive: exp-blast-wave-banner-v1, adventure-difficulty-tuning (already inactive)
- New flags (< 7 days): exp-mp-round-progress-header-v1 (2d), exp-connections-hint-gate-v1 (3d) — too new to decide
