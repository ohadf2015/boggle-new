# Ranked / Leagues UI Implementation Plan

> **For agentic workers:** Use executing-plans inline. Do NOT blind-delete `isAdmin`.

**Goal:** Surface ranked CTA + MMR/league UI for eligible signed-in players behind a kill-switch, with server auth/eligibility intact.

**Architecture:** Pure `resolveRankedCta` gates UI (`auth` | `locked` | `join` | `hidden`). Restore deleted MatchmakingQueue + handler, wire into socket registry, enforce auth + `ranked_progress` eligibility server-side, align payloads with client. Host of a matchFound creates `isRanked` room; joiner joins. Profile/results surface existing badges.

**Tech Stack:** fe-next, Socket.IO, PostHog `useExperiment`, Vitest.

## Global Constraints
- Preserve `canPlayRanked` (≥10 casual or unlocked_at); no blind isAdmin removal.
- Guests → auth CTA, never silent hide or fake ELO.
- Kill-switch `ranked-public-v1` default `on`.
- Classroom/casual unchanged; no prod accounts/DB migrations/merge/deploy.
- Hebrew RTL inherit; mock social tests only.

---

### Task 1: `resolveRankedCta` (TDD)
Create `fe-next/lib/ranked/resolveRankedCta.ts` + tests.

### Task 2: Experiment kill-switch
Add `ranked-public-v1` on/off default on to `lib/experiments.ts`.

### Task 3: Restore + harden matchmaking server
Restore queue/handler/tests from pre-#986; wire `registerMatchmakingHandlers` in `handlers/index.ts` with shared queue; server: auth + ranked_progress eligibility; emit `queueSize`/`eloRange`/`opponent.username`/`role`.

### Task 4: MultiplayerFlow CTA
Replace `isAdmin` gate with resolveRankedCta + flag; AuthModal for guests; locked copy with gamesUntilRanked; joinQueue + `ranked_queue_joined`.

### Task 5: Match-found room
Pass `isRanked` through HandleJoinFn createGame; host creates, joiner joins after delay.

### Task 6: Profile + results
Ungate `ProfileRankedProgress` for authenticated; mount `MmrChangeBadge` on MP results when store has delta; fire `ranked_rating_delta_shown` / `league_panel_shown` where cheap.

### Task 7: Verify + PR
Focused vitest + eslint; commit; push; gh pr create; no merge.
