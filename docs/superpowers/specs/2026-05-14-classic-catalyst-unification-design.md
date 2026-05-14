# Classic Mode Catalyst Unification — Design

**Date:** 2026-05-14
**Scope:** Multiplayer classic mode only. Single-player earthquake is untouched.

## Problem

Classic mode runs two independent catalyst systems:

- **Earthquake / Fire Round** — timing decided by the *host's client* (`useEarthquakeFireRound`), which emits `triggerEarthquake`. Fires 65–100% into the game.
- **Round Events** (blizzard / lightning / meteor) — scheduled server-side at game start by `roundEventsManager`. Fires 50–75% in.

Both are armed every game. Mutual exclusion is a runtime flag-check (`roundEventsManager.ts:124`) that races on whichever fires first. Players can effectively be exposed to two catalyst systems, the earthquake timing is client-influenced, the durations are short and inconsistent, and the warning UI does not explain what each catalyst actually does.

## Goals

1. Exactly **one** catalyst per MP classic game, chosen randomly by the server.
2. Catalysts last longer (~1.5× current).
3. Warning + active UI explains, in plain language, what the catalyst does.

## Non-Goals

- No change to single-player. SP still self-drives earthquake with current durations and UI.
- No merge of the two UI component systems.
- No new catalyst types.

## Design

### 1. Selection authority — `roundEventsManager` becomes the single picker

Extend the catalyst pool to four: `earthquake | blizzard | lightning | meteor`.

At game start (`gameStartHandler.ts:603`, MP classic, ≥2 players), `scheduleRoundEvent` picks one uniformly at random and schedules a single timer. On fire:

- pick is `earthquake` → call `executeEarthquakeSequence` (kept, from `earthquakeHandler.ts`)
- pick is a round event → call `executeRoundEvent` (existing)

One timer, one authority. Two catalysts in one game becomes structurally impossible.

The server is now the only party that knows which catalyst is coming — a minor anti-cheat improvement, since the host's client previously influenced earthquake timing.

### 2. Dead code removed

- `earthquakeHandler.ts` — remove `socket.on('triggerEarthquake')` MP path, the host-only check, and the `activeRoundEvent` guard. `executeEarthquakeSequence` is **kept** and invoked by the manager.
- `roundEventsManager.ts:124` — remove the `earthquakeTriggered || fireRoundActive` mutual-exclusion guard (now impossible).
- `useEarthquakeFireRound.ts` — remove the MP timing window and the `triggerEarthquake` emit path. The SP path stays intact; SP earthquake still self-drives.

### 3. Durations — ~1.5× scale, per-catalyst pacing kept

| Catalyst   | Now (warning + active)       | New (warning + active)            |
|------------|------------------------------|-----------------------------------|
| Earthquake | 2s + 1s shake + 15s = 18s    | 3s + 1.5s shake + 23s = 27.5s     |
| Blizzard   | 2s + 12s = 14s               | 3s + 18s = 21s                    |
| Lightning  | 2s + 10s = 12s               | 3s + 15s = 18s                    |
| Meteor     | 2s + 8s = 10s                | 3s + 12s = 15s                    |

Earthquake values live in `EARTHQUAKE_CONFIG` in `backend/handlers/earthquakeHandler.ts` (the server/MP source — the `fireRoundStart` broadcast already sends `duration`, which the client countdown reads, so this single edit propagates to the client). Round-event values live in `EVENT_CONFIG` in `roundEventsManager.ts`. `DEFAULT_EARTHQUAKE_CONFIG` in `shared/types/earthquake.ts` drives single-player only and is left unchanged.

### 4. UI — keep both component systems, add clarity + polish

No component merge. Both warning screens (`EarthquakeWarning.tsx`, `RoundEventOverlay.tsx`) gain a plain-language effect line under the title:

- Earthquake → "The whole board is replaced — score fast for 2× points"
- Blizzard → "Frozen tiles can't be used until they thaw"
- Lightning → "Charged tiles score bonus points — grab them fast"
- Meteor → "New letters crash in — fresh words appear"

Polish:

- Warning telegraph extended/clarified to match the new 3s warning phase.
- Active-phase badges (`FireRoundIndicator.tsx`, `RoundEventOverlay.tsx` active state) keep the effect label visible alongside the countdown, not just an icon/name.
- Consistent visual treatment (spacing, type scale, countdown styling) between the two systems so they read as one feature.

New copy: 4 effect strings × 5 locales (en/he/sv/ja/es). English authored here; HE/SV/JA/ES AI-translated and flagged for native review (project standard).

### 5. Testing (TDD — RED/GREEN/REFACTOR per project rules)

- `roundEventsManager` — pool includes `earthquake`; selection is uniform across 4; `earthquake` pick routes to `executeEarthquakeSequence`; exactly one catalyst scheduled per game.
- `earthquakeHandler` — `triggerEarthquake` MP handler removed; host emit is a no-op.
- Duration constants — new values propagate to server broadcasts and client countdowns.
- SP earthquake — existing `useEarthquakeFireRound` SP tests stay green (no MP path).
- UI — `EarthquakeWarning` and `RoundEventOverlay` render the correct effect line per catalyst in both warning and active states.

## Files Touched

- `backend/modules/roundEventsManager.ts` — pool + routing + remove guard
- `backend/handlers/earthquakeHandler.ts` — remove MP trigger path, keep sequence
- `backend/handlers/gameStartHandler.ts` — unchanged call site, verify scheduling
- `shared/types/earthquake.ts` — `DEFAULT_EARTHQUAKE_CONFIG` durations
- `hooks/useEarthquakeFireRound.ts` — strip MP path, keep SP
- `components/earthquake/EarthquakeWarning.tsx` — effect line
- `components/earthquake/FireRoundIndicator.tsx` — persistent effect label
- `components/game/in-game/components/RoundEventOverlay.tsx` — effect line + active label
- `translations/{en,he,sv,ja,es}.js` — 4 effect strings
- test files alongside each
