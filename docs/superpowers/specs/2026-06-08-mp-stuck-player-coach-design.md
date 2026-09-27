# MP Stuck-Player Coach — Design

**Date:** 2026-06-08
**Status:** IMPLEMENTED (uncommitted) — 61 feature tests + 1332 integration tests green, build OK
**Scope:** Classic multiplayer in-game FTUE for confused players

## Implementation notes (delta from design)

- Hook gate renamed `gameActive` → `active`, fed `gameActive && isPlaying && !showStartAnimation`
  so the coach never pops during the start animation or for spectators.
- The orphaned `useTapToDragGuidance` plumbing was **layered on, not removed** — the legacy
  tap detector still runs (its tooltip was already dead); the coach is the new working surface.
- Veteran gate confirmed live: `totalGamesPlayed` = `profile?.total_games` (useAuth/Supabase)
  on the MP path; guests with no profile coalesce to 0 (= treated as new, intended).
- Dedup is one-shot **across sessions** (`stuckCoachShown` localStorage). If PostHog outcome
  data later looks sparse, switch to per-game dedup — see "Open follow-ups".

## Problem

Players reach a live multiplayer (classic word-finding) game and don't understand what to
do: they tap tiles randomly, never form a path, or submit junk and never land a valid word.
There is no working in-game guidance for them.

### What actually exists today (verified)

| Mechanism | State on classic MP |
|---|---|
| `useTapToDragGuidance` (tap-one-tile → "drag across letters") | Hook wired in `InGameScreen:252`, props threaded to `PortraitLayout`, **but `TapToDragTooltip.tsx` is never rendered** — orphaned/dead. |
| `useMPFTUEIdle` (20s idle → drag nudge) | Only in WordHunt + WheelRush. **Not on classic MP.** |
| `createDeadTimeDetector` (`dead_time_detected`) | Adventure mode only. Not on classic MP. |
| Veteran signal | `totalGamesPlayed` prop already threaded into `PortraitLayout`; `isFirstTimeUser()` exists. |
| Dedup storage | `contextualGuidanceStorage` (`shouldShowGuidance('dragTutorialShown')`, localStorage). |

So: the "tap randomly" case is built but **dead**; the idle case is **unwired**; and the
"fiddle but never submit a valid word" case is **structurally uncovered** (idle timers reset
on every interaction, so an actively-stuck player never trips them).

## Goals

1. Detect a stuck classic-MP player across **three distinct confusion signals** and show the
   **right** help for each (copy must match the signal).
2. Never stack popups and never tutorialize a competent player — "not annoying" is a hard
   requirement, concretized as **one arbiter** + veteran gate + dedup + auto-hide.
3. Include a small **animated, RTL-aware explanatory visual** (drag-across-letters), not a PNG.
4. **Measure outcomes** in PostHog — not just shown/dismissed, but whether the help *worked*.

### Non-goals (YAGNI / scope cuts)

- Not touching WordHunt / WheelRush existing FTUE (they already have idle nudges). Unifying
  them onto the new arbiter is a flagged follow-up, not this spec.
- Not rebuilding keyboard-trail logic.
- Not building a desktop "tap" hint (mouse users don't tap-one-tile). Desktop gets only the
  idle + validity branches. Mobile-first.

## Confusion taxonomy → matched help

The load-bearing design decision is matching copy to signal (showing "drag to submit" to
someone already submitting invalid words is wrong help).

| Stage | Signal (after veteran/dedup gates pass) | Help shown |
|---|---|---|
| `idle-nudge` | No interaction at all for `IDLE_MS` (no taps, no drags) | Gentle: "Drag across letters to spell a word." |
| `tap-hint` | Tapped ≥ `TAP_MIN` single tiles, **0 drags started**, 0 submits | Animated drag diagram + "Hold and drag across letters, then lift to submit." (mobile only) |
| `submit-hint` | Drags started ≥ `DRAG_MIN`, **0 submits**, after `FRUITLESS_MS` | "Lift your finger off the last letter to submit the word." |
| `validity-hint` | Submits ≥ `SUBMIT_MIN`, **accepted words still 0**, after `FRUITLESS_MS` | Animated diagram + "Letters must connect. Spell a real word — 2 letters or more." |

`submit-hint` + `validity-hint` together are the genuinely new "clicks randomly / never
submits anything" coverage. All four are mutually exclusive — at most one is ever active.

### Suppression (mutual exclusion + "not annoying")

- **Veteran gate:** `totalGamesPlayed > VETERAN_GAMES` → `none` (never show).
- **Success gate:** once `accepted > 0` in this game → `none` for the rest of the game and
  the dedup flag is set so the coach never re-shows in future games.
- **Dedup:** `shouldShowGuidance('dragTutorialShown')` (reuse existing key family; add coach
  keys as needed) — first-show-only across sessions.
- **One escalation per game:** after the coach shows once and auto-hides, it does not re-arm.
- **Auto-hide:** `AUTO_HIDE_MS` (~10s) then dismissed as `ignored`.
- **Thoughtful-pause guard:** short `elapsedMs`, or recent accepted word, → `none`. Encoded in
  the pure fn and pinned by a discriminator test (thoughtful pause vs fruitless fiddle).

Tunable constants (initial): `IDLE_MS=12000`, `FRUITLESS_MS=15000`, `TAP_MIN=3`, `DRAG_MIN=2`,
`SUBMIT_MIN=2`, `VETERAN_GAMES=1`, `AUTO_HIDE_MS=10000`.

## Architecture

### 1. Pure decision fn — `fe-next/lib/ftue/mpStuckCoach.ts`

```ts
export type StuckStage =
  | 'none' | 'idle-nudge' | 'tap-hint' | 'submit-hint' | 'validity-hint';

export interface StuckSignals {
  elapsedMs: number;       // since grid became interactive
  idleMs: number;          // since last interaction of any kind
  taps: number;            // single-tap-no-drag count
  dragsStarted: number;    // path selections begun
  submits: number;         // words submitted to server (any result)
  accepted: number;        // accepted (valid) words this game
  totalGamesPlayed: number;
  isDesktop: boolean;      // suppress tap-hint on desktop
  alreadyShown: boolean;   // dedup: coach already shown (this game or stored)
}

export function nextStuckStage(s: StuckSignals): StuckStage;
```

Pure, fully unit-testable, encodes priority + all gates. No React, no DOM, no clock. This is
where the thoughtful-pause-vs-fiddle discriminator lives. **Test-first.**

### 2. Arbiter hook — `fe-next/hooks/useMPStuckCoach.ts`

Single owner of all classic-MP FTUE state. Replaces the orphaned tap-to-drag wiring path.

- Polls a 1s idle ticker (pattern from PracticeClassicSandbox).
- Accumulates interaction counters via callbacks it exposes:
  `markTap()`, `markDragStart()`, `markSubmit()`, `markAccepted()`.
- Calls `nextStuckStage` each tick; exposes `{ stage, visible, dismiss(reason) }`.
- Fires PostHog on show / outcome (see below).
- Reads `totalGamesPlayed`, `isDesktop`, dedup storage.
- Returns `none` whenever `!gameActive`.

### 3. Visual — `fe-next/components/game/ftue/MPStuckCoachCard.tsx`

- Neo-brutalist card anchored under the grid; `role="status"` `aria-live="polite"`.
- Copy keyed by `stage` via `useLanguage().t(...)`.
- Embeds `DragHintDiagram` (below) for `tap-hint` / `validity-hint`.
- Dismiss (×) button → `dismiss('manual')`. Entrance: `animate-neo-pop`.

### 4. Explanatory visual — `fe-next/components/game/ftue/DragHintDiagram.tsx`

- Pure CSS/SVG: three mini letter-tiles in a row, an animated dot/arrow tracing across them,
  ending on a check. Loops, respects `prefers-reduced-motion`.
- **RTL:** arrow/trace direction mirrors when `dir === 'rtl'` (right-to-left sweep). No asset
  pipeline; themeable to neo-brutalist palette.

### 5. Analytics — extend `fe-next/utils/posthogEngagement.ts`

Client-only PostHog (no Supabase round-trip).

- `mp_stuck_coach_shown` `{ stage, mode:'classic', games_played, is_desktop }`
- `mp_stuck_coach_outcome` `{ stage, outcome:'helped'|'dismissed'|'ignored', ms_to_valid }`
  - `helped` = an accepted word arrived within the show window.
  - `dismissed` = manual close.
  - `ignored` = auto-hidden, no accepted word.

The **outcome** event is the real deliverable for "use PostHog to see how players react."

### 6. Wiring

- Instantiate `useMPStuckCoach` in `InGameScreen` (already holds `tapDragGuidance` +
  `totalGamesPlayed` + game state + `isDesktop`). Remove/replace the orphaned tap-to-drag
  plumbing.
- Feed counters: `markTap` from existing `onSingleTapDetected`; `markDragStart` from grid
  path-start; `markSubmit` from `useWordSubmission`; `markAccepted` from the `wordAccepted`
  socket feedback.
- Render `MPStuckCoachCard` in `PortraitLayout` (mobile) and the desktop adapter mount, gated
  by `visible`.
- Classic mode only (gate on `gameMode === 'classic'`).

## Data flow

```
grid taps/drags/submits ──▶ useMPStuckCoach counters ──┐
wordAccepted socket ───────▶ markAccepted ─────────────┤
1s idle ticker ────────────▶ idleMs ───────────────────┤
totalGamesPlayed / isDesktop / dedup storage ──────────┤
                                                        ▼
                                          nextStuckStage(signals)  (pure)
                                                        │
                                          stage ≠ none & gates ok
                                                        ▼
                              MPStuckCoachCard (+ DragHintDiagram, RTL-aware)
                                                        │
                          show → posthog shown ;  word/close/timeout → posthog outcome
```

## Error handling

- All PostHog via the existing `safe()` wrapper — never throws, no-ops without consent.
- Coach is purely additive UI: if anything fails, gameplay is unaffected (no blocking).
- DOM tile highlight (if used) guarded by null-checks like `practice-hint-cell`.

## Testing (TDD, test-first)

1. **`mpStuckCoach.test.ts` (pure):** each stage's trigger; mutual exclusion; veteran gate;
   success gate; thoughtful-pause-vs-fruitless-fiddle discriminator; desktop suppresses
   `tap-hint`; `alreadyShown` → none.
2. **`useMPStuckCoach.test.tsx`:** counters increment via callbacks; visible toggles; dismiss
   reasons; fires shown + outcome events (mock posthog); never re-arms after first accept.
3. **`MPStuckCoachCard.test.tsx`:** renders correct copy per stage; dismiss button; RTL
   diagram mirror; reduced-motion.

## Open follow-ups (not this spec)

- Migrate WordHunt / WheelRush idle FTUE onto the same arbiter.
- Consider server-side aggregate of `mp_stuck_coach_outcome` for an admin "confusion" view.
