# Blast Highlight Reel — Design Spec

**Date**: 2026-05-03
**Owner**: ohadfisher
**Mode**: Blast (single-player)
**Status**: Brainstorm complete, awaiting user review before plan phase

## Goal

After the Blast board is cleared (win condition), play a short cinematic highlight reel that replays the player's most epic moments from the game in slow motion with edited transitions, captions, and an audio stinger. Make the win feel like an event.

## Non-goals (v1)

- Highlight reels for non-Blast modes (Adventure, MP, drills, WOTD, Connections)
- Reels on dead-end / loss endings (wins only)
- Share-to-social or video-file export
- Persistent "Highlights gallery" / IndexedDB storage
- Multiple stinger variants or custom soundtracks
- Live-ops remote tuning of scoring weights
- RNG-deterministic Pixi particle replay (v1 accepts visual drift if particles use `Math.random()`)

## User-facing experience

1. Player clears board → existing `planSugarCrush()` finale plays (no change).
2. `BlastView` transitions to a new `highlight` phase.
3. Letterbox bars slide in (200ms). Background music ducks -12dB.
4. Reel plays. Phase 1 = single ~5sec clip with speed-ramp time-warp on the highest-epicness moment. Phase 2 = 3 clips × ~2sec each cut together, ending on the final clearing word.
5. During each clip: camera push-in centers the action tile cluster, non-focal tiles blur+dim, score readout smashes in (`+428`), word reveals letter-by-letter, mascot reacts, optional caption banner ("BIGGEST WORD" / "TRIPLE COMBO" / "POWER CHAIN" / "FINAL CLEAR"), audio stinger fires on peak frame.
6. "BOARD CLEARED" full-screen card holds 1sec.
7. Fade-out (300ms) → results screen mounts as today.
8. Player can tap **Skip** at any time → jump straight to fadeOut. Reduced-motion users get a 1.5sec static "Best Word" card instead of the reel.

Total duration: ~5sec (Phase 1), ~7-8sec (Phase 2).

## Architecture

```
┌───────────────────────────┐    events    ┌──────────────────────┐
│ HighlightRecorder         │ ───────────▶ │ HighlightStore       │
│ (subscribes to engine)    │              │ (Zustand, in-memory) │
└───────────────────────────┘              └──────────┬───────────┘
                                                      │ on game-end
                                                      ▼
                                           ┌──────────────────────┐
                                           │ EpicnessScorer       │
                                           │ → ranked clip list   │
                                           └──────────┬───────────┘
                                                      │ top 3 + final
                                                      ▼
┌───────────────────────────┐   replay     ┌──────────────────────┐
│ BlastBoard / Pixi /       │ ◀─────────── │ HighlightPlayer      │
│ Sequencer (existing)      │   (snapshots │ (clock + ramp)       │
└───────────────────────────┘    at scaled └──────────┬───────────┘
                                  rate)              │ end
                                                      ▼
                                           ┌──────────────────────┐
                                           │ BlastResultsSummary  │
                                           └──────────────────────┘
```

### Boundaries (one purpose per unit)

| Unit | Path | Responsibility |
|---|---|---|
| `HighlightRecorder` | `lib/blast/highlightRecorder.ts` | Subscribe to engine, push typed events to store. Never touches DOM/Pixi. |
| `HighlightStore` | `lib/blast/highlightStore.ts` | Zustand slice (NOT bound to React). Event log + ring buffer with 5MB cap. |
| `EpicnessScorer` | `lib/blast/highlightScoring.ts` | Pure function: `events → rankedMoments[]`. Tunable weights as constants. |
| `rampCurve` | `lib/blast/rampCurve.ts` | Pure function: `t → playbackRate` for speed-ramp time-warp. |
| `useHighlightClock` | `hooks/useHighlightClock.ts` | Single playback clock. RAF loop owns time. Both Framer + Pixi read from it. |
| `HighlightPlayer` | `components/blast/highlight/HighlightPlayer.tsx` | Orchestrates phases, mounts overlay layers, drives scaled-time playback. |
| `BlastHighlightOverlay` | `components/blast/highlight/BlastHighlightOverlay.tsx` | Pixi container for letterbox, color-grade, grain, score-readout, caption. |
| `LetterboxBars` | `components/blast/highlight/LetterboxBars.tsx` | Framer slide-in bars. |
| `ColorGradeFilter` | `components/blast/highlight/ColorGradeFilter.tsx` | Pixi `ColorMatrixFilter` teal-orange preset. |
| `ScoreReadout` | `components/blast/highlight/ScoreReadout.tsx` | Framer `+428` Fredoka 96pt with hard pixel shadow. |
| `WordReveal` | `components/blast/highlight/WordReveal.tsx` | Framer letter-stagger reveal, 80pt caps, `dir="auto"` for RTL. |
| `MascotReaction` | `components/blast/highlight/MascotReaction.tsx` | Bottom-corner mascot GIF (mood from scorer). |
| `CaptionBanner` | `components/blast/highlight/CaptionBanner.tsx` | "BIGGEST WORD" / "TRIPLE COMBO" / etc. Translated keys. |
| `GrainOverlay` | `components/blast/highlight/GrainOverlay.tsx` | Pixi sprite, 8% opacity grain texture. |
| `BoardClearedCard` | `components/blast/highlight/BoardClearedCard.tsx` | Final full-screen "BOARD CLEARED" card. |

## Data model

```ts
// lib/blast/highlightTypes.ts
type HighlightEventBase = { t: number /*ms since game start*/ };

type WordSubmitEvent = HighlightEventBase & {
  kind: 'word';
  word: string;
  path: GridCoord[];
  score: number;
  combo: number;
  specialTilesHit: BlastTileType[];
  preGrid: BlastTileState[][];
  postGrid: BlastTileState[][];
  effectsFired: ParticlePresetName[];
  rngSeed?: number;       // optional; populated only if seedrandom is threaded (post-v1)
};

type EffectEvent = HighlightEventBase & {
  kind: 'effect';
  preset: ParticlePresetName;
  origin: GridCoord;
  rngSeed?: number;       // optional; see WordSubmitEvent.rngSeed
};

type CascadeTickEvent = HighlightEventBase & {
  kind: 'cascade';
  step: number;
  tilesCleared: GridCoord[];
};

type GameEndEvent = HighlightEventBase & {
  kind: 'end';
  reason: 'cleared' | 'deadEnd';
  finalScore: number;
};

type HighlightEvent =
  | WordSubmitEvent
  | EffectEvent
  | CascadeTickEvent
  | GameEndEvent;
```

### Buffer policy

- Ring buffer drops oldest events past 5MB (typical game ~200KB; cap is safety net).
- Drop telemetry: PostHog `highlight_buffer_overflow` event with `eventsDropped` count.
- Memory cap untested in v1 — telemetry from beta will size it correctly.

### RNG / determinism

- Particle factories currently use `Math.random()`. v1 does NOT thread seedrandom — `rngSeed` field stays `undefined` on captured events.
- Replay accepts visual drift: same word-path replayed twice may show slightly different particle positions. Acceptable for v1.
- Marked `// TODO: seed for full determinism` in scorer. Threading seedrandom is a follow-up.

## Scoring

### Epicness formula (Phase 1)

```ts
// lib/blast/highlightScoring.ts
const EPICNESS_WEIGHTS = {
  wordScore: 1.0,
  comboMultiplier: 25,    // each combo level adds 25 points
  specialTileBonus: 40,   // per unique special tile in path
  cascadeDepth: 15,       // per tier of cascade triggered
  finalClearBonus: 9999,  // guarantees winning word always in reel
};

function epicness(e: WordSubmitEvent, isFinalClear: boolean): number {
  return (
    e.score * EPICNESS_WEIGHTS.wordScore +
    e.combo * EPICNESS_WEIGHTS.comboMultiplier +
    new Set(e.specialTilesHit).size * EPICNESS_WEIGHTS.specialTileBonus +
    cascadeDepth(e) * EPICNESS_WEIGHTS.cascadeDepth +
    (isFinalClear ? EPICNESS_WEIGHTS.finalClearBonus : 0)
  );
}
```

### Caption tagging

Each ranked moment gets a tag:
- `biggestWord` if top by raw word score
- `tripleCombo` if combo ≥ 3
- `specialChain` if ≥ 2 unique special tiles in path
- `finalClear` reserved for last move that cleared board
- Default: no caption banner (word-reveal only)

### Reel composition

- **Phase 1**: top-1 moment by epicness. If `finalClear` is not the top-1, use `finalClear` instead (winning word always wins ties for cinematic emphasis).
- **Phase 2**: top-2 moments + `finalClear` as bookend. Three clips total. Caption per clip from tag.

## Playback engine

### Clock

```ts
// hooks/useHighlightClock.ts
type ClockState = {
  elapsed: number;        // ms since reel start
  rate: number;           // current playback rate (0.2 → 1.5)
  phase: 'idle' | 'letterboxIn' | 'clip' | 'card' | 'fadeOut';
  clipIndex: number;      // 0..N for multi-cut
};
```

- One RAF loop owns the clock. `delta * rate` advances `elapsed`.
- Pixi: `app.ticker.speed = rate` each frame.
- Framer: clip animations as `motion` components with `transition={{ duration: scaled }}` driven by clock.
- BlastBoard receives `replayMode={true}` + `replayState={preGrid|postGrid}` props — re-renders existing `BlastTile` with correct phase (`clearing`, `falling`, etc.) at scaled rate. **No new tile renderer.**

### Speed-ramp curve

```
t=0      rate=1.0       (real-time approach)
t=0.4s   rate=0.2       ease-in to peak
t=0.4s   hold 0.4s      slow-mo dwell (the "money frame")
t=0.8s   rate=1.5       ease-out follow-through
```

3-keyframe `easeInOutCubic` interpolation in `lib/blast/rampCurve.ts`. Pure function, unit-testable.

### Multi-cut sequencer (Phase 2)

- Array of `Clip` objects: `{eventRange, ramp, caption}`
- Player advances `clipIndex` on clip end
- Hard-cut transition (200ms color flash via overlay) between clips
- Lives in `HighlightPlayer.tsx`. Does NOT live in existing `useBlastSequencer` (different concern).

## Cinematic toolkit (rendering layers)

| Layer | Tech | Notes |
|---|---|---|
| Letterbox bars | Framer | 2× absolute-positioned `<motion.div>`, slides from -100% / +100% over 200ms |
| Camera push | Framer | `scale` + `translate` on `BlastBoard` wrapper. Computed from `path` bbox. |
| DOF blur | CSS class | `data-replay-focal={true|false}` toggles `filter: blur(4px) brightness(0.5)` on non-focal tiles. Phase 2 only. |
| Color grade | Pixi `ColorMatrixFilter` | Teal-orange preset (lift/gain matrix). Phase 2 only. |
| Score readout | Framer | `+428` Fredoka 96pt, 4px hard pixel shadow, slides in from peak position |
| Word reveal | Framer | letter stagger 40ms, 80pt caps, `dir="auto"` |
| Audio stinger | Howler | 1 new asset `blast-highlight-stinger.webm` (~80KB). Music ducks -12dB during reel. |
| Mascot reaction | `<Image>` | Bottom-corner mascot GIF. Mood = `mindblown` if epicness>500, `cool` otherwise. |
| Caption banner | Framer | "BIGGEST WORD" / etc. Phase 2 only. |
| Grain overlay | Pixi sprite | Loop animated grain texture, 8% opacity. Phase 2 only. |
| Final card | Framer | Full-screen "BOARD CLEARED" + final score, 1sec hold |

## UX integration

### Trigger flow (modify `useBlastGameEnd.ts`)

```
isComplete=true (board cleared)
  → planSugarCrush() (existing finale)
  → fire 'reel.start' with HighlightStore snapshot
  → BlastView.phase = 'highlight'  (NEW phase)
  → HighlightPlayer mounts, plays reel
  → BlastView.phase = 'results'
  → BlastResultsSummary mounts as today
```

`isDeadEnd` (no board clear) → skip reel, go straight to results. Reel celebrates wins only.

### Skip control

- Top-right `[Skip ▸]` button, 44px hit target
- Tap = jump to fadeOut phase (not hard cut)
- Logs `highlight_skipped` PostHog event with `clipIndex` + `elapsed`
- Keyboard: `Esc` or `Space` skips

## A11y

- `prefers-reduced-motion` → skip animation entirely. Show static "Best Word" card with top-rank word + score for 1.5sec → results. Reuses `useReducedMotion` from `AdaptiveMotion.tsx`.
- Reel mounts with `role="dialog"` + `aria-label={t('blast.highlight.reelLabel')}`.
- Captions in DOM as `aria-live="polite"` text — screen-reader accessible even though Pixi paints them visually.
- `prefers-contrast: more` → disable color grade + DOF filters, keep timing only.
- Focus returns to results screen on reel end.

## i18n (5 locales)

```
blast.highlight.captions.biggestWord     // "BIGGEST WORD"
blast.highlight.captions.tripleCombo     // "TRIPLE COMBO"
blast.highlight.captions.specialChain    // "POWER CHAIN"
blast.highlight.captions.finalClear      // "FINAL CLEAR"
blast.highlight.boardCleared             // "BOARD CLEARED"
blast.highlight.skipLabel                // "Skip"
blast.highlight.reelLabel                // "Highlight reel"
blast.highlight.bestWord                 // "Best word" (reduced-motion fallback header)
```

- Hebrew RTL: caption banner mirrors automatically (logical CSS).
- Score readout `+428` is locale-neutral.
- Word reveal `dir="auto"` so HE words reveal RTL letter-by-letter.
- HE/JA/ES strings AI-translated initially, flagged for native review (per project pattern).

## Testing strategy

### Unit (Vitest)
- `highlightScoring.test.ts` — fixture event log → asserts ranking + caption tags. Edge cases: empty log, single move, all-same-score moves.
- `rampCurve.test.ts` — speed-ramp curve at t=0/0.4/0.8/1.0 returns expected rates.
- `highlightStore.test.ts` — buffer overflow drops oldest, telemetry fires.
- `highlightRecorder.test.ts` — engine event subscription captures correct shape.

### Integration (Vitest + RTL)
- `HighlightPlayer.test.tsx` — fixture clip → verify phase transitions on schedule, skip jumps to fadeOut, reduced-motion shows static card.
- `useBlastGameEnd.highlight.test.ts` — board-clear triggers reel; dead-end does not.

### E2E (Playwright)
- Smoke: complete a Blast game end-to-end with deterministic seed → reel mounts, captions visible, final card shows, results screen follows.
- Reduced-motion mode → static fallback path.

### Manual QA checklist
- iPhone SE (low-end perf, 60fps target during reel)
- Hebrew RTL — word reveal letter direction, caption mirror
- Sound off — reel reads visually
- Background tab → reel pauses, resumes (RAF naturally pauses)

## Phase plan

### Phase 1 (MVP, single-clip speed-ramp ~5sec)
- HighlightRecorder + HighlightStore + EpicnessScorer (full)
- HighlightPlayer single-clip mode
- Cinematic toolkit subset: letterbox, camera push, score readout, word reveal, audio stinger, BoardClearedCard, mascot reaction
- Skip button + reduced-motion fallback
- All 5 locales for required strings
- Unit + integration tests

### Phase 2 (multi-cut, ~7-8sec)
- Multi-clip sequencer in HighlightPlayer
- Caption banner overlay
- Color grade + grain + DOF blur
- Hard-cut transition between clips
- Polish + balance pass on EPICNESS_WEIGHTS

## Open risks (track during plan phase)

1. **Pixi `ticker.speed` × audio stinger timing** — Howler doesn't follow Pixi ticker. May need explicit `Howler.rate()` or fixed-clock audio not driven by ticker. **Mitigation**: spike on Phase 1 day-1; fall back to fixed-rate stinger if sync fails.
2. **DOM tile blur perf on Android low-end** — DOF blur on 30+ tiles is a known perf hazard. **Mitigation**: feature-flag `BLAST_HIGHLIGHT_DOF` off by default on `lowEndDevice` detection (already exists in `AdaptiveMotion`).
3. **Memory cap (5MB) untested** — needs telemetry from beta to size correctly. **Mitigation**: ship with conservative cap, log overflow events, retune after 1 week of prod data.
4. **Particle visual drift on replay** — `Math.random()` not seeded. **Mitigation**: accept for v1 (drift is small visually); add seedrandom threading in a follow-up.
5. **Mascot mood mapping is taste-based** — `epicness>500` threshold is a guess. **Mitigation**: tune in Phase 2 polish pass with side-by-side playtest.

## File touch list (estimated)

**New**:
- `lib/blast/highlightTypes.ts`
- `lib/blast/highlightRecorder.ts`
- `lib/blast/highlightStore.ts`
- `lib/blast/highlightScoring.ts`
- `lib/blast/rampCurve.ts`
- `hooks/useHighlightClock.ts`
- `components/blast/highlight/HighlightPlayer.tsx`
- `components/blast/highlight/BlastHighlightOverlay.tsx`
- `components/blast/highlight/LetterboxBars.tsx`
- `components/blast/highlight/ColorGradeFilter.tsx` (Phase 2)
- `components/blast/highlight/ScoreReadout.tsx`
- `components/blast/highlight/WordReveal.tsx`
- `components/blast/highlight/MascotReaction.tsx`
- `components/blast/highlight/CaptionBanner.tsx` (Phase 2)
- `components/blast/highlight/GrainOverlay.tsx` (Phase 2)
- `components/blast/highlight/BoardClearedCard.tsx`
- `public/sounds/blast-highlight-stinger.webm` (asset)
- Tests: `__tests__/blast/highlight/*.test.{ts,tsx}`

**Modified**:
- `components/blast/BlastView.tsx` — add `'highlight'` phase
- `components/blast/BlastGame.tsx` — wire HighlightRecorder subscription
- `components/blast/hooks/useBlastGameEnd.ts` — fire reel before results on `isComplete`
- `components/blast/hooks/useBlastWordHandler.ts` — emit recorder events on word submit
- `components/blast/BlastBoard.tsx` — accept `replayMode` + `replayState` props
- `components/blast/BlastTile.tsx` — accept `data-replay-focal` for DOF blur (Phase 2)
- `i18n/locales/{en,he,sv,ja,es}.json` — add `blast.highlight.*` keys
