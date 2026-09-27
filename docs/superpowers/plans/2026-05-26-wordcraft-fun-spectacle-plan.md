# WordCraft Fun Spectacle — Implementation Plan

Spec: `docs/superpowers/specs/2026-05-26-wordcraft-fun-spectacle-design.md`
Working dir: `fe-next/`

## Phase 1 — Tier resolver + commit fanfare ladder

### TDD: `lib/word-craft/celebration/commitTier.ts`
1. RED: `commitTier.test.ts` covering every tier boundary:
   - score=6 → 'soft'
   - score=15 → 'nice'
   - premium triggered at score=10 → 'nice'
   - score=30 → 'great'
   - hasRareTile + score=18 → 'great'
   - score=60 → 'huge'
   - streak=3 + score=35 → 'huge'
   - score=120 → 'bingo'
   - tilesPlaced=7 → 'bingo'
   - cosy clamp test (separate `clampForCosy(tier)` helper)
2. GREEN: write `resolveCommitTier` + `clampForCosy`.
3. REFACTOR: extract tier table to const if readable.

### Streak tracking in `useWordCraftGame.ts`
4. RED: add to `useWordCraftGame.hotseat.test.ts` (or new file): commit → streak increments; pass → streak resets; invalid → streak resets; hot-seat: each player has own streak.
5. GREEN: add `streak: number` to reducer state (per-player array for hot-seat); update on COMMIT_VALID / PASS / INVALID actions.

### Pixi scenes (each: file + smoke test that import + invoke doesn't throw)
6. `lib/word-craft/pixi/scenes/pathTrace.ts` — sequential glow + connecting Graphics line. Test: jsdom mock of Pixi, verify call returns void, reducedMotion early-return.
7. `lib/word-craft/pixi/scenes/wordStampSlam.ts` — Container with Text + Rect, scale-in via app.ticker, removes self after timeout.
8. `lib/word-craft/pixi/scenes/auroraSweep.ts` — Graphics gradient sweep + ParticleContainer of sparkles.
9. `lib/word-craft/pixi/scenes/screenEdgeFlash.ts` — vignette rect, alpha tween.

### Orchestrator: `lib/word-craft/celebration/useSpectacle.ts`
10. RED: `useSpectacle.test.ts` — mock SceneCtx + spy on imported scene fns. Verify per-tier scenes fire (soft → only ripple; bingo → all + SharedFxApp.spawnBurst).
11. GREEN: hook implementation; uses lazy dynamic imports per scene; cosy clamp via existing `resolveCosyPreferences`.

### Wire into existing commit fire site
12. Locate current scoreConfetti+wordCommitWave callsite (likely `WordCraftBoardSection.tsx` or board commit handler). Replace direct scene calls with `spectacle.fireCommit(ctx, rects)`.
13. Verify: `npm run lint && npm run test -- word-craft && npm run build`.
14. Manual: dev server, place a small word + a big word + a bingo, confirm escalation.

**Commit (ASK first):** `feat(word-craft): tiered commit fanfare — escalating drama per word size`

---

## Phase 2 — Gem rarity drama + heat-state transition beats

### TDD: `lib/word-craft/celebration/gemDrama.ts`
1. RED: tests for each rarity → plan; cosy clamp (legendary → rare-equivalent in cosy).
2. GREEN: pure mapping function.

### TDD: `lib/word-craft/celebration/heatTransition.ts`
3. RED: tests for every transition: cold→warm (null), warm→overdrive (enter-overdrive), overdrive→warm (exit-overdrive), warm→burnout (enter-burnout), burnout→warm (recover), same-state (null).
4. GREEN: pure diff function.

### Pixi: `lib/word-craft/pixi/scenes/heatBeat.ts`
5. Ember rain (overdrive) — orange ParticleContainer falling. Ice cracks (burnout) — cyan Graphics frost lines.

### Component: `components/word-craft/WordCraftHeatStamp.tsx`
6. RED: component test — renders text by beat, calls onDone after 1.2s, i18n via `t()`.
7. GREEN: implementation with `useEffect` cleanup.

### i18n keys
8. Add to `translations/en.js` under `wordcraft.heatStamp.*`. Leave he/sv/ja/es for follow-up (mirrors `wordcraft-tap-zoom-2026-05-25` pattern).

### Wire
9. Extend `useSpectacle` with `fireGemCollect` + `fireHeatBeat`.
10. In `useGemHunt.ts`: on COLLECT action, call `spectacle.fireGemCollect(gem, ...)`.
11. In `useWordCraftGame.ts` heat reducer: detect transition via `detectTransition(prev, next)`, fire `spectacle.fireHeatBeat(beat)`.
12. Mount `WordCraftHeatStamp` in `WordCraftBoardSection` via spectacle event.

### Verify
13. `npm run lint && npm run test && npm run build`.
14. Manual: dev — pick up a legendary gem (debug-route?), let heat hit overdrive, confirm beats.

**Commit (ASK first):** `feat(word-craft): legendary gem freeze-burst + heat-state stamps`

---

## Phase 3 — Score preview + card-pick fanfare

### TDD: `lib/word-craft/celebration/scorePreview.ts`
1. RED: tests — null when placement invalid, score returned when valid, bingoReady true at 7+ tiles, tier matches `commitTier`.
2. GREEN: thin wrapper over existing `scoreTurn` + word-detection lib.

### Component: `WordCraftScorePreviewBadge.tsx`
3. RED: test — hidden when null preview, shows score chip with tier color when valid, shows "BINGO!" suffix when bingoReady.
4. GREEN: floating div positioned via `useBoardCoords` of last-placed tile, neo-brutalist styling.

### Pixi: `lib/word-craft/pixi/scenes/cardPullFanfare.ts`
5. Sparkle trail from card to inventory chip, scale-bounce on chip.

### Wire
6. `WordCraftBoard.tsx`: render `<WordCraftScorePreviewBadge>` reading from current pending placement.
7. `GemHuntPageClient.tsx`: on card pick, call `spectacle.fireCardPull(cardEl, inventoryEl)`.

### Verify
8. `npm run lint && npm run test && npm run build`.
9. Manual: place tiles, confirm preview updates; pick a Gem Hunt card, confirm sparkle trail.

**Commit (ASK first):** `feat(word-craft): live score preview + Gem Hunt card-pull fanfare`

---

## Conventions
- TDD strict per `.claude/rules/22-tdd-strict.md` — RED before GREEN, every cycle.
- All file sizes < 500 LOC (CLAUDE.md). New scenes ~100-140 LOC each.
- Lint + test + build after each phase, before commit.
- Translation keys only added to `en.js` in-phase; multi-locale via `/clean-translations` once stable.
- No new npm dependencies.

## Risks / mitigations
- **Pixi double-init in StrictMode** — existing stage already handles via `cancelled` flag. New scenes are stage-scoped, share its lifecycle.
- **Test mocking complexity for useSpectacle** — keep scenes as named imports of pure functions; spy via `vi.mock('@/lib/word-craft/pixi/scenes/pathTrace')` per existing patterns.
- **Performance regression on low-end** — every new scene gated by `ctx.reducedMotion`; `useDevicePerformance` already returns `maxParticles=0` for low-end.
- **Translation drift** — only one locale at a time per existing pattern; `/clean-translations` catches orphans.
