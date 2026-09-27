# Hidden Achievements (Easter Eggs) — Design

**Date:** 2026-06-08
**Status:** Approved (autonomy directive — proceed to plan + implementation)

## Goal

Add a registry-driven, extensible **in-app hidden-achievement** system for classic
single-player Boggle, seeded with secret play-pattern "easter eggs" that surprise
the player when discovered. The flagship example (from the request) is **selecting
every tile on the board in one drag**.

These are distinct from the existing surfaces:
- **PGS achievements** (`lib/playGames/*`) — native Android, pre-registered in a console,
  not ad-hoc extensible.
- **`FirstTimeAchievement`** (`components/game/FirstTimeAchievement.tsx`) — a fixed
  4-value union (`firstWord`/`firstCombo`/`firstLongWord`/`firstUniqueWord`) for
  *visible* milestones. We reuse its celebration *style* + confetti infra, not its type.

## Critical definition fix

The naive reading "use every tile in one word" = `word.length === totalTiles` is a
**dead achievement**: a valid dictionary word whose letters also trace a Hamiltonian
path across a 4×4+ board effectively never occurs. The literal, obtainable reading of
"selecting all the tiles" is a **drag gesture** that touches every tile in one trace —
a valid word is NOT required. This fires from the **selection layer at drag-end**, not
from word validation.

This splits detection into two pure entry points by input source:
- **Selection-gesture** detectors — fed the drag path length + total tiles.
- **Word-pattern** detectors — fed an accepted valid word + game context.

## Scope

- **Classic single-player only** for v1 (`components/singleplayer/*`). Blast / word-hunt /
  multiplayer are explicitly out of scope — the registry + bus are mode-agnostic, so
  other modes can wire detectors later. This is a decision, not a silent gap.
- **Reveal-on-unlock only.** There is no in-app achievement list (PGS is the only
  existing list surface). We persist an "earned" flag for dedup, but do NOT build a
  gallery in v1. We will not imply persistence the UI doesn't expose.

## Seed achievements

| id | emoji | trigger | source |
|---|---|---|---|
| `board_sweep` | 🧹 | one drag selects EVERY tile on the board (valid word not required) | gesture |
| `palindrome` | 🔄 | submit a valid palindrome word, length ≥ 4 | word |
| `speed_demon` | ⚡ | reach 5 valid words within the first 10 seconds | word |
| `triple_threat` | 🎰 | a single valid word uses the same letter 3+ times | word |

All four are obtainable by a real player and language-agnostic (no path-coordinate or
language-specific letter dependency). `wordzilla`/long-word was rejected — it overlaps
the existing visible `firstLongWord`.

## Architecture

Each unit has one purpose, a clear interface, and is independently testable.

1. **`lib/achievements/hiddenAchievements.ts`** — registry. `HiddenAchievement =
   { id, emoji, titleKey, descKey, color }`. Exports `HIDDEN_ACHIEVEMENTS`, the
   `HiddenAchievementId` union type, and `getHiddenAchievement(id)`. Pure data.

2. **`lib/achievements/detectHiddenAchievements.ts`** — **pure** detection (the TDD core):
   - `detectSelectionAchievements(ctx: { selectedTileCount; totalTiles }): HiddenAchievementId[]`
     → `board_sweep` when `totalTiles > 0 && selectedTileCount === totalTiles`.
   - `detectWordAchievements(ctx: { word; validWordTimesSec: number[] }): HiddenAchievementId[]`
     → `palindrome` (normalized reverse-equal, len ≥ 4), `speed_demon`
     (count of times ≤ 10s ≥ 5), `triple_threat` (any letter count ≥ 3).
   Returns all qualifying ids; dedup is a separate concern.

3. **`lib/achievements/hiddenAchievementState.ts`** — SSR-safe localStorage dedup,
   mirroring `lib/playGames/awardState.ts`. `hasEarned(id): boolean`,
   `markEarned(id): boolean` (true iff newly earned), `getEarnedIds(): string[]`.
   Namespace key prefix `lexiclash_hidden_ach_`.

4. **`lib/achievements/hiddenAchievementBus.ts`** — `triggerHiddenAchievement(id)`:
   dedup via `markEarned` → if newly earned, dispatch
   `CustomEvent('lexiclash:hidden-achievement', { detail: { id } })` on `window` and
   fire a light analytics event (`hidden_achievement_unlocked`, one GrowthEvent union
   member — justified because hidden = rare; without it we can't tell a dead achievement
   from an undiscovered one). Returns `boolean`. Decouples gameplay from UI.
   - Convenience: `evaluateSelectionAchievements(ctx)` / `evaluateWordAchievements(ctx)`
     run the matching pure detector and trigger each returned id.

5. **`components/achievements/HiddenAchievementListener.tsx`** — global, render-free-ish
   listener mounted beside `EasterEggListener` in `app/essential-providers.tsx`.
   Subscribes to the bus event, renders a localized "secret unlocked" reveal card
   (neo-brutalist, confetti via `fireConfetti`/`InlineConfetti`), auto-dismiss ~3.5s,
   cooldown to avoid stacking. Uses `useLanguage().t`.

## Wiring (two thin call sites)

- **Gesture** — `components/singleplayer/SinglePlayerGame.tsx`: wrap `core.handlePathSubmit`.
  On submit, compute `totalTiles = core.grid.length * core.grid[0].length` and call
  `evaluateSelectionAchievements({ selectedTileCount: path.length, totalTiles })`, then
  delegate to `core.handlePathSubmit(path)`. No edits to `useGridInteraction`.
- **Word-pattern** — `components/singleplayer/game/hooks/useWordSubmission.ts`: at the end
  of `handleValidWord`, build `{ word: normalizedWord, validWordTimesSec: <valid words'
  timeSinceStart> }` and call `evaluateWordAchievements(ctx)`.

## i18n (×5: en/he/sv/ja/es)

New `hiddenAchievement` block (sibling of existing `easterEgg` at `translations/en.js:881`):
`hiddenAchievement.unlockedBanner` (e.g. "Secret unlocked!") + `<id>.title` and
`<id>.desc` for all four ids, in all five languages. Native copy (not literal MT) —
RTL Hebrew respected by existing layout primitives.

## Testing (TDD, RED→GREEN→REFACTOR)

Order: pure detection → state dedup → bus → component → wiring.
- `detectHiddenAchievements.test.ts` — each rule: positive, negative, boundary
  (len 3 vs 4 palindrome; 4 vs 5 words; 9.9s vs 10.1s; selectedCount === vs < totalTiles;
  totalTiles 0 guard).
- `hiddenAchievementState.test.ts` — first earn returns true, second returns false,
  SSR/no-storage no-throw.
- `hiddenAchievementBus.test.ts` — fires CustomEvent once per id, dedups, analytics call.
- `HiddenAchievementListener.test.tsx` — renders localized card on event, dismiss.

## Error handling

All localStorage access wrapped (SSR-safe, quota-safe) — never throws into gameplay.
Detection is pure and total (empty/garbage input → `[]`). Bus + listener are cosmetic;
a failure must never block word submission or the game loop.

## Known limitations (v1, accepted)

- **`board_sweep` is drag-only.** It rides `onPathSubmit` (the drag channel), so
  tap/keyboard-input players cannot trigger it. By design — "selecting all the tiles"
  is a drag gesture. Verified obtainable: `useGridInteraction` has no max-selection
  cap and backtracks on tile re-entry (no duplicates), so a human can trace a
  Hamiltonian king-move path across the whole board and `path.length === totalTiles`
  exactly equals "every distinct tile covered".
- **Simultaneous fires show only the last card.** If one word qualifies for two eggs
  at once (e.g. palindrome ∧ tripled-letter), both are marked earned + both fire
  confetti, but the reveal card shows only the last. Near-unhittable; not worth a queue.

## Out of scope (v1)

Achievement gallery/list UI · cross-mode wiring (blast/word-hunt/MP) · server-side
persistence · sharing.
