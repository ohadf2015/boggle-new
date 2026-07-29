# WordCraft → Swipe-Chain Cascade

**Date:** 2026-05-15
**Status:** Design (brainstorm output — awaiting user go/no-go before plan + implementation)
**Owner:** Ohad
**Worktree:** `.claude/worktrees/wordcraft-swipe-cascade`

## Problem

WordCraft today is a Scrabble-alt: rack + drag-place + premium squares + bingo bonus + bot. The Scrabble feel — wait-turn, math scoring, dictionary lawyering, slow tactical placement — is the opposite of LexiClash's party/electric brand. Run-mode (5 rounds + 12 power cards) gave it a roguelike chassis but it still *plays* like Scrabble.

We need a twist that keeps the run/cards chassis but kills the Scrabble feel, makes it smoother and more fun.

## Goal

Replace the Scrabble loop with **Swipe-Chain Cascade**: letters live on the grid, swipe a path to spell a word, word burns its path, tiles above cascade down, chains auto-trigger, fire row creeps up creating constant pressure. Run-mode + power cards layered on top.

Success = playtester says **"this is nothing like Scrabble"** in under 60 seconds, AND **plays a second round voluntarily**.

## Non-goals (this spec)

- Multiplayer (defer; design must not block future MP, but no netcode now)
- Daily-seed mode (defer; trivial to add once core ships)
- Adventure-style story rooms
- Localized themed word lists (use existing wordlists from run-mode API)
- New animation primitives beyond `useWordCraftJuice` + existing Pixi scenes

## Inspirations (from online research)

- **Bookworm** (PopCap): word-removal collapse + rising fire pressure
- **SpellTower** (Zach Gage): swipe-path on letter grid, combo cascades
- **Squaredle**: swipe contiguous letters, no tile reuse per word
- **Candy Crush**: cascade auto-combos as juice
- **Slay the Spire / our existing run-mode**: card pick between rounds

Top mechanics consistently praised as "fun and not Scrabble":
1. Escalating pressure (fire/timer/elimination) — kills wait-for-turn
2. Spatial swipe-path — mobile/TV native
3. Combo cascades — generates scream moments
4. Theme/constraint over raw dictionary — kills lawyering
5. Async/short-loop pacing — no opponent downtime

## Player experience (60-second goal)

1. Tap **Play** → fade in 7×7 grid of letters with ambient sparkle
2. FTUE finger-trace overlay shows "drag a path" for first word
3. Player swipes A-R-T → tiles glow electric-lime → release → tiles burn, score chip floats up
4. Tiles above fall (gravity), new letters spawn at top
5. Fallen tiles happen to form a valid 4-letter word → **auto-combo**, score doubled, screen shake
6. After ~10s, bottom row turns ember-red — fire warning
7. Long word (≥6) clears whole row, pushes fire back down
8. Round ends at 60s or score target hit → existing `RoundResultScene` → card pick → next round

## Architecture

### Game state machine (extends `runReducer`)

```
intro → playing → fireWarning(visual only) → playing
playing → roundResult(success|fail) → cardPick → playing (next round)
                                              → runResult (all rounds done OR fire hit top)
```

Add to existing reducer:
- State: `lastWordScore`, `comboCount`, `fireRow` (0 = bottom, N = game over)
- Actions: `WORD_SUBMITTED(path, word)`, `CASCADE_TICK`, `FIRE_TICK`, `RESET_FIRE(rows)`

### New modules

**`lib/word-craft/cascade/`** (replaces tile-placement engine)

| File | Purpose | Est. lines |
|------|---------|------------|
| `boardGrid.ts` | NxN letter grid + cell IDs + neighbor lookups (4-dir, diag opt-in via card) | ~120 |
| `swipePath.ts` | Validate path: contiguous, no reuse, ≥3 letters; path → candidate word | ~80 |
| `burnAndGravity.ts` | Remove burned cells, gravity-drop tiles above, spawn from top via `tileBag` | ~100 |
| `cascadeResolver.ts` | After gravity, scan grid for auto-words (≥4 contiguous valid). Return chain. | ~140 |
| `fireRow.ts` | Tick fire-row counter, escalation curve per round | ~60 |
| `scoring.ts` (REWRITE) | Score = letterValues × lengthBonus × comboMult × cardMult. **No premium squares, no bingo bonus.** | ~80 |

**`components/word-craft/cascade/`** (replaces board/rack/zoom)

| File | Purpose | Est. lines |
|------|---------|------------|
| `CascadeBoard.tsx` | Renders grid, handles pointer/touch swipe path | ~220 |
| `SwipePathOverlay.tsx` | SVG path stroke connecting selected cells (electric-lime glow) | ~90 |
| `FireRowOverlay.tsx` | Pixi or CSS ember row + warning shake | ~70 |
| `useSwipeGesture.ts` | Pointer/touch handler, hit-tests cells, RTL-safe | ~150 |
| `useCascadeJuice.ts` | Adapts existing `useWordCraftJuice` for burn/cascade/fire events | ~90 |

### Kept

- `lib/word-craft/run/runReducer.ts` (extended)
- `lib/word-craft/run/cardEffects.ts` (extended with 6 cascade-native cards)
- `lib/word-craft/run/useWordCraftRun.ts` (rewired)
- `components/word-craft/run/RunHUD.tsx` (add fire + combo)
- `CardPickScreen.tsx`, `RoundResultScene.tsx`, `RunResultScene.tsx` unchanged
- Existing Pixi scenes (`ambientSparkles`, `tilePlaceRipple` → reskinned as burn, `wordCommitWave`, `scoreConfetti`)
- Wordlist API + `moveValidator.ts` (adapted: validate word from path, not from rack-placed tiles)

### Deleted / deprecated (Phase 4)

| File | Reason |
|------|--------|
| `useWordCraftGame.ts` (429) | Bot + rack + Scrabble turn loop — gone |
| `WordCraftRack.tsx` (178) | No rack |
| `useWordCraftDrag.ts` (222) | No drag-place |
| `WordCraftZoomShell.tsx` (391) | Board is fixed, no pinch zoom |
| `WordCraftBoard.tsx` (254) | Replaced by `CascadeBoard` |
| Premium-square logic in `scoring.ts` | Removed |
| `PageClient.tsx` Scrabble path (784 → ~100) | Replaced by thin shell mounting cascade + RunHUD |

**Net:** ~1,800 deleted, ~1,200 new = **codebase ~600 lines lighter**.

### Data flow

```
User pointerdown → useSwipeGesture
        ↓
Path of cell IDs (live)
        ↓
SwipePathOverlay (render glow)
        ↓
User pointerup → swipePath.ts validates → wordlist check
        ↓
runReducer dispatch WORD_SUBMITTED(word, path, baseScore)
        ↓
cardEffects.apply(word, path) → final score + side effects
        ↓
burnAndGravity → new grid state
        ↓
cascadeResolver → if auto-word(s) found, recurse with bonus mult (cap depth 10)
        ↓
fireRow tick (on timer, independent)
        ↓
Render: useCascadeJuice plays burn/fall/spark
```

## Scoring

```
base        = sum(letterValue) for letters in path
length      = pathLength
lengthBonus = { 3:1.0, 4:1.2, 5:1.5, 6:2.0, 7:3.0, 8+:4.0 }[length]
chainMult   = 1 + 0.5 × (chainCount - 1)         // first word = 1×, second auto-combo = 1.5×, etc., cap 5×
cardMult    = product of active card multipliers
final       = floor(base × lengthBonus × chainMult × cardMult)
```

No premium squares. No bingo bonus. Length-bonus replaces them — simpler, hides math, rewards big words.
Letter values keep current per-locale tables (already balanced).

## Power cards (12 → 18)

Keep 12 existing where they still make sense. Add 6 cascade-native:

1. **Pyro** — words ≥5 burn 1 extra random tile (more cascades)
2. **Frost** — fire row pauses for 8s after each ≥6-letter word
3. **Diagonal** — swipe paths may include diagonals
4. **Echo** — first auto-cascade combo per round scores 3x
5. **Ember Boost** — score doubled when fire row > halfway (risk reward)
6. **Bag Cheat** — common letters (E/A/R/S/T) spawn 2× more often

Pool config in `cardEffects.ts`; existing rarity tiers reused.

## Pacing & round design

| Round | Duration | Target | Fire rise | Board |
|-------|----------|-------:|-----------|-------|
| 1 | 60s | 80 | every 12s | 7×7 |
| 2 | 60s | 180 | every 11s | 7×7 |
| 3 | 75s | 350 | every 10s | 7×7 |
| 4 | 75s | 600 | every 9s | 9×9 |
| 5 | 90s | 1000 | every 8s | 9×9 |

Fail = fire reached top OR time out below target. Clear = all 5 + card picks survived.

## RTL / i18n

- Swipe is direction-agnostic — no RTL flip needed
- Hebrew tiles: existing letter renderer works
- Japanese: hiragana tile set already exists; cascade resolver uses per-locale dictionary
- **New strings:** ~12 keys (`wordcraft.cascade.*`) — FTUE copy, fire warning, combo names. Ship all 5 locales day 1 per memory `feedback-ai-hebrew-translation`. Flag "needs native review" in commit.

## Accessibility

- Reduced-motion: disable cascade particles, keep burn fade
- Fire warning uses color + position + audio sting — colorblind-safe
- aria-live for round-end + fail (extend live-region wiring per memory `adventure-a11y-live-region`)
- Keyboard swipe alternative (arrow keys + space) — defer to v2 if no requests

## Telemetry

New PostHog events (dedupe per memory `posthog-insights-2026-05-15` — single emitter):
- `wordcraft_cascade_word_submitted` (word, length, score, chainCount)
- `wordcraft_cascade_combo` (chainCount, totalScore)
- `wordcraft_cascade_fire_warning` (fireRow, secondsRemaining)
- `wordcraft_cascade_fire_gameover` (round, score)

## Testing (TDD per `22-tdd-strict.md`)

Unit:
- `boardGrid` — neighbor lookups, RTL parity, oob handling
- `swipePath` — contiguity, no-reuse, length validation
- `burnAndGravity` — column gravity, spawn determinism (seeded)
- `cascadeResolver` — auto-word detection, recursion termination, max-chain cap
- `fireRow` — tick scheduling, escalation curve, Frost card
- `scoring` — length bonus, chain mult, card mult composition
- `runReducer` — new actions, transitions, no regression on existing flow

Component:
- `CascadeBoard` swipe path E2E (simulated pointer events)
- `useSwipeGesture` cell hit-test under RTL
- `FireRowOverlay` warning trigger

Targets: **>90% line coverage on new `cascade/` modules.** Existing 17,914 FE tests stay green.

## Error handling

- Invalid word → red flash on path, no state change
- Path too short (<3) → silent reject
- Cascade resolver infinite-loop guard → hard cap chain depth 10
- Fire-tick race with card pick → reducer ignores fire ticks in non-`playing` phase
- Wordlist API failure → fall back to bundled local dictionary

## Rollout (Phase plan)

1. **P1 — Engine + UI** behind new flag `useWordCraftCascadeFlag`. Both run-mode and cascade live behind their own flags.
2. **P2 — Dev playtest** internal QA
3. **P3 — 10% rollout** via PostHog; watch round-2 retention, run-clear rate
4. **P4 — 100%** then delete `useWordCraftGame` + rack + drag + zoom shell
5. **P5 (separate spec)** — daily-seed + async race

Flag default: OFF prod, ON dev.

## Risks

| Risk | Mitigation |
|------|------------|
| Swipe flaky on ≤360px phones | Min cell 44px; 7×7 fits ~308px |
| Cascade scoring snowballs | Hard chain cap 10; chainMult cap 5× |
| Hebrew/JA cascade word recognition | Reuse per-locale dictionary in `cascadeResolver` |
| Fire row too punishing in R1 | Slow rate (12s); FTUE explains; R2 retention is the metric |
| Card pool unbalanced | Use rarity tiers; tune via PostHog after P3 |

## Open decisions (autonomous calls)

- **Cell shape**: square, hard pixel shadow (Neo-Brutalist). Letters in Fredoka. ✓
- **Burn anim**: tile flashes electric-lime → ember-pink → particle puff → empty (~280ms)
- **Combo names**: 2x="DOUBLE!", 3x="TRIPLE!", 5x="ELECTRIC!" — under `t('wordcraft.cascade.combo.*')`
- **Audio**: reuse swipe + burst + electric-charge SFX; add ember crackle for fire warning

## File map (TL;DR)

**Add**
- `lib/word-craft/cascade/` (6 files, ~580 lines)
- `components/word-craft/cascade/` (5 files, ~620 lines)
- `lib/i18n/locales/<lang>/wordcraft.js` (+12 keys × 5 locales)
- Tests mirroring each new module

**Modify**
- `lib/word-craft/run/runReducer.ts` (cascade actions)
- `lib/word-craft/run/cardEffects.ts` (+6 cards)
- `components/word-craft/run/RunHUD.tsx` (fire + combo)
- `app/[locale]/word-craft/page.tsx` (mount cascade flag)

**Delete (P4)**
- `useWordCraftGame.ts`, `WordCraftRack.tsx`, `useWordCraftDrag.ts`, `WordCraftZoomShell.tsx`, `WordCraftBoard.tsx`, Scrabble path of `PageClient.tsx`

## Acceptance criteria

- [ ] Round 1 playable end-to-end with no devtool
- [ ] Cascade auto-combo fires at least once per round on average (instrumented)
- [ ] Fire row triggers fail state correctly
- [ ] 5 rounds + 4 card picks completable
- [ ] All 5 locales: HE/EN/SV/JA/ES tiles + UI strings present
- [ ] Mobile portrait 360×640 playable; desktop 1280×720; TV 1920×1080 readable
- [ ] No regression in run-mode flag-off path
- [ ] 17,914+ FE tests green; new modules >90% coverage
- [ ] PostHog events fire once per action (no double-fire)
- [ ] Lint + types + `npm run build:fast` clean
