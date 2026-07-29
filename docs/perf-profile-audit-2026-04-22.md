# Performance Audit — 2026-04-22

Source: CCGS `ccgs-perf-profile` scan of `fe-next/`.

## Bundle Hot-Spots

| Library | Raw imports | Lazy/dynamic |
|---|---|---|
| `framer-motion` | ~460 files | 33 use `LazyMotion` |
| `pixi.js` | 7 prod files | `BlastGameCanvas` only; `AdventureEffectsCanvas` static |
| `date-fns` | 1 | No |
| `qrcode.react` | 3 | Yes |

**Assets:** `/public/gifs/` = 173MB (114MB in `/new-gifs/`). 2.8–6.1MB per GIF. Bypasses Next.js image pipeline.

## Top 10 Findings

### 1. `GridCell.tsx:212` — Inline style defeats memo (HIGH)
`memo()`-wrapped but `style={{...spread × 7 branches}}` produces new object each render. 16–25 tiles re-render on every parent tick.
**Fix:** `useMemo` the style obj keyed on `[isSelected, comboLevel, ...]`, or move to CSS custom properties.

### 2. `blast/result/route.ts:157–174` — Sequential read+write waterfall (HIGH)
`profiles.select` → `profiles.update` sequential. Then `addToWeeklyLeaderboard` → `getLeaderboardPercentile` (207–208) also sequential.
**Fix:** Collapse select+update into single upsert/RPC. `Promise.all` the Redis pair.

### 3. `ProgressionContext.tsx` 1002 lines — Monolithic context (HIGH)
Any state change re-renders all 3 consumers. No selector pattern.
**Fix:** Split State + Actions contexts. Consumers calling only actions stop re-rendering on data changes.

### 4. `blast/result/route.ts:207–208` — 2 sequential Redis calls (MED)
~10ms fixed tax per game-end. **Fix:** `Promise.all`.

### 5. `education/duels/[duelId]/PageClient.tsx:9` — Static duel import (MED)
`DuelGameView` + `RealTimeDuelGame` static. Pulls Socket.IO + framer-motion into initial bundle.
**Fix:** `next/dynamic` with `ssr: false`.

### 6. `/public/gifs/` 173MB unoptimized (HIGH)
**Fix:** `ffmpeg -i file.gif -movflags faststart -pix_fmt yuv420p out.mp4`. WebM ≈ 10× smaller. Swap to `<video autoPlay loop muted playsInline>`.

### 7. 460 raw `framer-motion` imports (HIGH)
Hot path: `GridCell`, `ComboIndicator`, `RoundEventTileEffects`. Grid renders 16–25 `motion.div` per selection frame.
**Fix:** Single `<LazyMotion features={domAnimation}>` at shell. `m.div` instead of `motion.div`.

### 8. `GameCanvas.tsx:183–191` — Inline style + unstable onTick (MED)
New style object + new `onTick` arrow each frame = wrapper re-renders.
**Fix:** `useMemo` style, `useCallback`/`useRef` onTick.

### 9. `supabaseRealtime.ts:95` — Module-level retry counter (MED)
`connectionRetryCount` shared across all classroom channels — retry storm on one resets the count for all.
**Fix:** `Map<channelName, retryCount>`.

### 10. `adventure/complete/route.ts:289–393` — Sequential writes (MED)
`upsert → update → rpc('increment_player_xp') → persistLootToInventory`. XP RPC + loot independent.
**Fix:** `Promise.all([rpc, persistLootToInventory])`.

## Re-render Hot-Spots

| Component | Cause |
|---|---|
| `GridCell` ×16–25 | Inline `style={{...}}` defeats memo |
| `GridCellEffects` | Receives 6 inline-derived objects |
| `ComboIndicator` | 8 inline `style={{}}`, no memo |
| `RoundEventTileEffects` | 13 inline `style={{}}`, no memo |
| `ProgressionContext` consumers | Monolithic 1002-line context |

## Priority Queue

1. **GIF→WebM** (F6) — single biggest mobile payload win.
2. **GridCell memo fix** (F1) — hot-path render, game board runs constantly.
3. **framer-motion LazyMotion** (F7) — bundle size across 427 files.
4. **ProgressionContext split** (F3) — aligns with TD-012.
5. **API waterfalls** (F2, F4, F10) — p99 latency on game end/adventure complete.
