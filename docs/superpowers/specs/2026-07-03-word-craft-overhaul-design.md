# Word Craft Overhaul — Design Spec (2026-07-03)

## Goal

Make Word Craft (Conquest) more fun, performant, lightweight:

1. **Pre-game setup screen** — opponent choice (bot + difficulty / pass-and-play / challenge friend) and modifier choice move OUT of the game screen. Game screen loses that cognitive load.
2. **Board-first game screen** — declutter in-game chrome; board dominates.
3. **Auto-place first letter at center** — first tile a player selects on move 1 lands on the center cell automatically (recallable). Removes the "where do I even start?" decision.
4. **Performance** — kill the per-pointermove layout thrash + whole-page re-renders that make placement feel sluggish.
5. **Modifiers that are FELT** — player-pickable, gameplay-visible modifiers, still language-agnostic and engine-safe.

## Current state (verified in code)

- Engine already supports everything the setup screen needs:
  - `BotDifficulty` easy/medium/hard with tuned knobs (`lib/word-craft/botDifficulty.ts`), persisted at `wordcraft.difficulty` localStorage, changed mid-game via `WordCraftDifficultySelect` in the topbar.
  - `hotseat` pass-and-play (`useWordCraftGame` option + `WordCraftHandoff` curtain), entered via URL param.
  - Async **duel** (challenge friend with seed-locked board contract) via `WordCraftPlayFriendControl` popover in the topbar.
  - 5 seeded modifiers (`lib/word-craft/modifiers.ts`) rolled **randomly and invisibly** at init; only surfaced by a chip.
- Game screen chrome (`app/[locale]/word-craft/PageClient.tsx`, **1274 lines**): global Header + topbar (back, difficulty select, friend button+popover, tutor) + dict-loading banner + Scoreboard + ModifierChip + DuelTargetStrip + board (+3 overlays) + PendingStrip/AxisChip row + StepHint + Rack + clue banner + Controls + 3 floating toasts + handoff + blank picker + game-over scene.
- Perf hot spots (verified):
  - `useWordCraftDrag.resolveDropCell` (`components/word-craft/useWordCraftDrag.ts:50`) runs `querySelectorAll('[data-board-cell][data-tile-state="empty"]')` + `getBoundingClientRect()` per cell **on every pointermove** — up to ~200 forced layout reads per frame on a 15×15 board.
  - `setDrag({...x, y...})` fires per pointermove, and the hook lives in `PageClient` → the whole 1274-line page tree re-renders every finger move. Leaf components are memoized but the parent render + prop churn still costs.
- First move: Conquest has no center star; `requireFirstMoveCenter` validation flag exists but board is neutral. First move can be anywhere ≥2 letters.

## Design

### A. Setup screen (new `WordCraftSetup`)

New component `components/word-craft/WordCraftSetup.tsx`, rendered by `PageClient` while `phase === 'setup'`; game mounts on `phase === 'playing'`. No new route — avoids duplicated data loading and keeps deep links working.

Content (one screen, board-color purple family, neo-brutalist cards):

- **Opponent picker** (3 cards): Bot · Pass & Play · Challenge a Friend.
  - Bot card expands an easy/medium/hard segmented control (reuses tuning; default = persisted `wordcraft.difficulty`).
  - Pass & Play sets `hotseat` (today's `?vs=human` entry — setup sets state directly, param kept for deep links).
  - Challenge a Friend: keeps current duel model (play vs bot, send a beat-my-score link — `WordCraftPlayFriendControl` builds it from seed+dims+difficulty+score). Setup card explains the flow and starts a bot game; the share affordance moves to the game-over scene. Verified: `WordCraftGameOverScene` does NOT currently mount the share control for vs-bot games (only `WordCraftDuelResult` has a challenge button) → mount `WordCraftPlayFriendControl` in the vs-bot game-over scene, so removing the in-game topbar button loses nothing.
- **Twist picker** (modifier): "Surprise me" (default — today's seeded roll) + 4 explicit choices with one-line effect descriptions. Adds `modifierOverride?: WordCraftModifier` option to `useWordCraftGame` (override skips `rollModifier`).
- **Big START button** + **Quick Play** subtitle-action that starts instantly with last-used settings.

Skip rules (no setup friction where it'd be wrong):

- Arriving with a duel param → skip setup (contract locked by challenger).
- `?quick=1` or "play again" → skip setup, reuse settings.
- Settings persist to localStorage (`wordcraft.setup.v1`). localStorage is the ONLY source (read synchronously before first paint of setup — no dual-source flash; Class-1 checklist applied).

### B. Game screen declutter (board-first)

- **Remove from in-game topbar**: `WordCraftDifficultySelect`, friend button + popover (both now live in setup). Topbar becomes: back · sr-only h1 · tutor.
- **Fold `WordCraftModifierChip` into the Scoreboard strip** (single compact HUD row: scores · turn · bag · modifier icon). One fewer stacked row above the board.
- Keep: axis chip, step hint, placement guide (new-player aids, already auto-retire), pending strip, rack, controls, toasts.
- Net: two chrome rows deleted → board (already `100cqmin` container-query sized) gains their height.
- **Split `PageClient.tsx`** (1274 lines, violates 500-line rule): extract `WordCraftGameScreen` (in-game render tree) and `WordCraftSetup`; PageClient becomes a thin phase switcher + shared state owner. Target ≤500 lines per file.

### C. Auto-center first letter

In `useWordCraftGame` reducer, `SELECT_RACK_TILE` gains a rule: if `isFirstMove(board)` and `pendingPlacements.length === 0` and center cell empty → also dispatch-place the selected tile at center as a pending placement (same code path as `PLACE_PENDING`). Tile is recallable exactly like any pending tile (tap it on board, or recall button) and the player can then place it elsewhere — auto-placement is a default, not a constraint.

- Applies to both tap-select and drag? Drag already targets a specific cell — auto-center applies only to tap-select (drag intent is explicit).
- Bot unaffected (bot builds its own placements).
- Live region announces the placement (existing `placed` announcement covers it).

### D. Performance

1. **O(1) drop-cell resolution.** Replace per-move `querySelectorAll` + ~225 per-cell rects with grid math: each pointermove reads the board container rect ONCE (`getBoundingClientRect` on `[data-wc-board]` — post-transform, so it stays correct under `WordCraftZoomShell` pinch/pan with zero invalidation bookkeeping), then computes `row/col = floor((xy - origin - padding) / cellPitch)` arithmetically and checks emptiness against a `Set<string>` of empty-cell keys kept in a ref. Nearest-center snap within `SNAP_RADIUS_PX` is arithmetic (clamp to nearest cell center + distance check). 1 layout read per move vs ~225.
2. **No React state on pointermove.** Split `DragState`: `x`/`y` leave React state — ghost position updates imperatively (`ref.style.transform` in the pointermove handler, throttled by rAF). React state changes only on begin / activation flip / hoverCell change / end. `hoverCell` changes at most once per cell crossing (~a few per second), not per pixel.
3. **Isolate drag ownership.** Drag hook + ghost move out of `PageClient` into the extracted `WordCraftGameScreen`; with (2), re-renders happen only on cell crossings — acceptable at that scope. (The B split gives most of the win; no context plumbing needed.)
4. Board cell hover markers keep using `dragHoverCell` prop (memoized board re-renders only on cell crossing — unchanged behavior, massively fewer renders).

### E. Felt modifiers

Keep the 4 existing + add 2 new **player-visible, language-agnostic, symmetric** modifiers:

1. **`golden_tiles`** — a seeded ~1-in-6 of bag tiles are golden (deterministic from tile id hash — no bag surgery). Committing a golden tile captures its neighbor ring (reuses `spreadToNeighbors` capture path per-cell). Gold visual on rack + board tile. Felt every few turns; pure rule-change like land_grab.
2. **`quick_draw`** — rack holds 5 tiles instead of 7. `RACK_SIZE` has exactly 4 use sites (`useWordCraftGame.ts:105,106,149`, `tileBag.ts:95`) → becomes a per-game `rackSize` in state, threaded to those sites; bot unaffected — it plays from the same 5.

Weighted roll table gains both; setup screen lists all 6 with one-line descriptions. `modifierLabelKey` i18n keys ×6 locales (en/he/sv/ja/es/ru).

### F. What we are NOT doing (YAGNI)

- No live socket multiplayer for Word Craft (duel + hotseat already cover "play with a friend"; live MP is a separate project).
- No new route/page for setup (phase state inside existing page).
- No board/premium redesign, no timer modifiers (complexity ↑, fun unclear).
- No DB persistence of settings (localStorage only, single source).

## Error handling

- Setup screen with dict still loading: START enabled; game already handles `!dict` with its loading banner.
- `modifierOverride` validated against `WORDCRAFT_MODIFIERS`; invalid → fall back to roll.
- Drag rect cache: on any scroll/resize/orientation event mid-drag → re-read rect once (cheap), not per move.

## Testing (TDD, per existing suites)

- `useWordCraftGame`: auto-center on first SELECT_RACK_TILE; recall restores; override modifier; quick_draw rack size 5; golden_tiles capture ring on commit.
- `useWordCraftDrag`: grid-math resolution (mock rects), no per-move querySelectorAll (spy), hoverCell transitions, snap radius, rect invalidation on scroll.
- `WordCraftSetup`: renders 3 opponent cards, difficulty segmented control, twist picker, persists + restores localStorage, Quick Play path, duel param skips setup.
- `PageClient` integration: phase switch, topbar no longer renders difficulty/friend controls in-game.
- Perf smoke: pointermove storm (100 synthetic moves) triggers ≤ N React commits (React Profiler in test or render-count spy).

## Rollout

Pure client change, no migration, no flag (mode is already live and low-traffic; setup screen is strictly less confusing than status quo). PostHog: `wordcraft_setup_start` event with `{opponent, difficulty, modifier, quick}`.
