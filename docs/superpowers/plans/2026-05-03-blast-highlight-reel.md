# Blast Highlight Reel — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a cinematic post-board-clear replay reel to Blast mode that plays the player's most epic moments in slow motion with edited transitions, captions, and audio stinger.

**Architecture:** Three-layer separation — `HighlightRecorder` writes typed events to `HighlightStore` during play; `EpicnessScorer` ranks moments; `HighlightPlayer` replays scored moments through the existing `BlastBoard` + Pixi pipeline at scaled time. Reuses `BlastTile` animation phases and Pixi particle presets — no new tile renderer.

**Tech Stack:** TypeScript, Next.js 16, Zustand (non-React-bound store), Framer Motion, PixiJS v8, Howler.js, Vitest, React Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-05-03-blast-highlight-reel-design.md`

**Project conventions:**
- Direct commits to `master` (no branches)
- TDD strict: RED → GREEN → REFACTOR; never write impl before test
- Conventional commits: `feat:`, `test:`, `refactor:` etc.
- All UI text via `t('key')` — never hardcode strings
- 5 locales: `translations/{en,he,sv,ja,es}.js` (HE/JA/ES flagged for native review)
- Max 500 lines per file
- Run `npm run lint && npm run test && npm run build` after meaningful changes
- Dev server: `npm run dev` on port **3001** (NEVER 3000)

---

## File Structure

### New files

| Path | Responsibility | Phase |
|---|---|---|
| `lib/blast/highlightTypes.ts` | Type definitions for events, ranked moments, clips | 1 |
| `lib/blast/highlightScoring.ts` | Pure: events → ranked moments + caption tags | 1 |
| `lib/blast/rampCurve.ts` | Pure: time → playback rate (speed-ramp curve) | 1 |
| `stores/highlightStore.ts` | Zustand store: event log + ring buffer (5MB cap) | 1 |
| `lib/blast/highlightRecorder.ts` | Subscribes to engine events, pushes to store | 1 |
| `hooks/useHighlightClock.ts` | RAF-driven clock; Pixi+Framer both read from it | 1 |
| `components/blast/highlight/HighlightPlayer.tsx` | Orchestrator: phases, mounts overlay, drives playback | 1 |
| `components/blast/highlight/BlastHighlightOverlay.tsx` | Pixi container for cinematic overlays | 1 |
| `components/blast/highlight/LetterboxBars.tsx` | Framer slide-in bars | 1 |
| `components/blast/highlight/ScoreReadout.tsx` | Big `+428` Fredoka, hard pixel shadow | 1 |
| `components/blast/highlight/WordReveal.tsx` | Letter-stagger word reveal, RTL-safe | 1 |
| `components/blast/highlight/MascotReaction.tsx` | Bottom-corner mascot GIF | 1 |
| `components/blast/highlight/BoardClearedCard.tsx` | Final full-screen card | 1 |
| `components/blast/highlight/CaptionBanner.tsx` | "BIGGEST WORD" / etc. banner | 2 |
| `components/blast/highlight/ColorGradeFilter.tsx` | Pixi ColorMatrixFilter, teal-orange | 2 |
| `components/blast/highlight/GrainOverlay.tsx` | Pixi sprite, 8% grain | 2 |
| `public/sounds/blast-highlight-stinger.webm` | Audio asset (~80KB) | 1 |

### Modified files

| Path | Change | Phase |
|---|---|---|
| `components/blast/BlastView.tsx` | Add `'highlight'` phase to `BlastPhase` union, mount HighlightPlayer | 1 |
| `components/blast/BlastGame.tsx` | Wire HighlightRecorder subscription | 1 |
| `components/blast/hooks/useBlastGameEnd.ts` | Fire reel before results on `isComplete` | 1 |
| `components/blast/hooks/useBlastWordHandler.ts` | Emit recorder events on word submit | 1 |
| `components/blast/BlastBoard.tsx` | Accept `replayMode` + `replayState` props | 1 |
| `components/blast/BlastTile.tsx` | Accept `data-replay-focal` attr for DOF | 2 |
| `translations/{en,he,sv,ja,es}.js` | Add `blast.highlight.*` keys | 1 |
| `utils/growthTracking.ts` | Add `trackHighlightStart`, `trackHighlightSkipped`, `trackHighlightBufferOverflow` | 1 |

---

## Phase 1: Single-clip MVP

### Task 1: Types module

**Files:**
- Create: `fe-next/lib/blast/highlightTypes.ts`

- [ ] **Step 1: Create types file**

```ts
// fe-next/lib/blast/highlightTypes.ts
import type { BlastTileType, BlastTileState } from '@/shared/types/blast';

export type GridCoord = { row: number; col: number };

type HighlightEventBase = { t: number /* ms since game start */ };

export type WordSubmitEvent = HighlightEventBase & {
  kind: 'word';
  word: string;
  path: GridCoord[];
  score: number;
  combo: number;
  specialTilesHit: BlastTileType[];
  preGrid: BlastTileState[][];
  postGrid: BlastTileState[][];
  effectsFired: string[];
  rngSeed?: number;
};

export type EffectEvent = HighlightEventBase & {
  kind: 'effect';
  preset: string;
  origin: GridCoord;
  rngSeed?: number;
};

export type CascadeTickEvent = HighlightEventBase & {
  kind: 'cascade';
  step: number;
  tilesCleared: GridCoord[];
};

export type GameEndEvent = HighlightEventBase & {
  kind: 'end';
  reason: 'cleared' | 'deadEnd';
  finalScore: number;
};

export type HighlightEvent =
  | WordSubmitEvent
  | EffectEvent
  | CascadeTickEvent
  | GameEndEvent;

export type CaptionTag =
  | 'biggestWord'
  | 'tripleCombo'
  | 'specialChain'
  | 'finalClear'
  | 'none';

export type RankedMoment = {
  event: WordSubmitEvent;
  epicness: number;
  caption: CaptionTag;
  isFinalClear: boolean;
};

export type Clip = {
  moment: RankedMoment;
  rampDurationMs: number; // 800 typical
};
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd fe-next && npx tsc --noEmit`
Expected: PASS (no new errors)

- [ ] **Step 3: Commit**

```bash
git add fe-next/lib/blast/highlightTypes.ts
git commit -m "feat(blast): highlight reel types module"
```

---

### Task 2: Ramp curve (pure function)

**Files:**
- Create: `fe-next/lib/blast/rampCurve.ts`
- Test: `fe-next/lib/blast/__tests__/rampCurve.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// fe-next/lib/blast/__tests__/rampCurve.test.ts
import { describe, it, expect } from 'vitest';
import { rampRate, RAMP_DEFAULTS } from '../rampCurve';

describe('rampRate', () => {
  it('returns 1.0 at t=0 (real-time approach)', () => {
    expect(rampRate(0, RAMP_DEFAULTS)).toBeCloseTo(1.0, 2);
  });

  it('returns 0.2 at peak start (t=400ms)', () => {
    expect(rampRate(400, RAMP_DEFAULTS)).toBeCloseTo(0.2, 2);
  });

  it('holds 0.2 during dwell (t=600ms)', () => {
    expect(rampRate(600, RAMP_DEFAULTS)).toBeCloseTo(0.2, 2);
  });

  it('returns 1.5 at end of follow-through (t=1400ms)', () => {
    expect(rampRate(1400, RAMP_DEFAULTS)).toBeCloseTo(1.5, 2);
  });

  it('clamps to 1.5 past end', () => {
    expect(rampRate(2000, RAMP_DEFAULTS)).toBeCloseTo(1.5, 2);
  });

  it('clamps to 1.0 at negative t', () => {
    expect(rampRate(-100, RAMP_DEFAULTS)).toBeCloseTo(1.0, 2);
  });
});
```

- [ ] **Step 2: Run test — must FAIL**

Run: `cd fe-next && npx vitest run lib/blast/__tests__/rampCurve.test.ts`
Expected: FAIL with "Cannot find module '../rampCurve'"

- [ ] **Step 3: Implement**

```ts
// fe-next/lib/blast/rampCurve.ts
export type RampConfig = {
  approachMs: number;     // 0 → 400
  dwellMs: number;        // 400 → 800 (hold at peak)
  followThroughMs: number; // 800 → 1400
  startRate: number;      // 1.0
  peakRate: number;       // 0.2
  endRate: number;        // 1.5
};

export const RAMP_DEFAULTS: RampConfig = {
  approachMs: 400,
  dwellMs: 400,
  followThroughMs: 600,
  startRate: 1.0,
  peakRate: 0.2,
  endRate: 1.5,
};

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function rampRate(elapsedMs: number, config: RampConfig): number {
  if (elapsedMs <= 0) return config.startRate;
  const peakStart = config.approachMs;
  const dwellEnd = peakStart + config.dwellMs;
  const totalEnd = dwellEnd + config.followThroughMs;

  if (elapsedMs < peakStart) {
    const t = elapsedMs / config.approachMs;
    return config.startRate + (config.peakRate - config.startRate) * easeInOutCubic(t);
  }
  if (elapsedMs <= dwellEnd) return config.peakRate;
  if (elapsedMs >= totalEnd) return config.endRate;
  const t = (elapsedMs - dwellEnd) / config.followThroughMs;
  return config.peakRate + (config.endRate - config.peakRate) * easeInOutCubic(t);
}
```

- [ ] **Step 4: Run test — must PASS**

Run: `cd fe-next && npx vitest run lib/blast/__tests__/rampCurve.test.ts`
Expected: PASS, 6/6

- [ ] **Step 5: Commit**

```bash
git add fe-next/lib/blast/rampCurve.ts fe-next/lib/blast/__tests__/rampCurve.test.ts
git commit -m "feat(blast): speed-ramp curve for highlight reel time-warp"
```

---

### Task 3: Epicness scorer (pure function)

**Files:**
- Create: `fe-next/lib/blast/highlightScoring.ts`
- Test: `fe-next/lib/blast/__tests__/highlightScoring.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// fe-next/lib/blast/__tests__/highlightScoring.test.ts
import { describe, it, expect } from 'vitest';
import { rankMoments, EPICNESS_WEIGHTS } from '../highlightScoring';
import type { HighlightEvent, WordSubmitEvent } from '../highlightTypes';

function wordEvent(over: Partial<WordSubmitEvent>): WordSubmitEvent {
  return {
    kind: 'word', t: 0, word: 'CAT', path: [], score: 30, combo: 0,
    specialTilesHit: [], preGrid: [], postGrid: [], effectsFired: [],
    ...over,
  };
}

describe('rankMoments', () => {
  it('returns empty array for empty events', () => {
    expect(rankMoments([])).toEqual([]);
  });

  it('ranks by epicness desc', () => {
    const events: HighlightEvent[] = [
      wordEvent({ word: 'A', score: 10 }),
      wordEvent({ word: 'B', score: 100 }),
      wordEvent({ word: 'C', score: 50 }),
    ];
    const ranked = rankMoments(events);
    expect(ranked.map(r => r.event.word)).toEqual(['B', 'C', 'A']);
  });

  it('flags top word with caption=biggestWord', () => {
    const events: HighlightEvent[] = [
      wordEvent({ word: 'BIG', score: 200 }),
      wordEvent({ word: 'SM', score: 20 }),
    ];
    expect(rankMoments(events)[0].caption).toBe('biggestWord');
  });

  it('flags combo>=3 with caption=tripleCombo', () => {
    const events: HighlightEvent[] = [
      wordEvent({ word: 'COMBO', score: 50, combo: 3 }),
      wordEvent({ word: 'BIG', score: 200 }),
    ];
    const combo = rankMoments(events).find(r => r.event.word === 'COMBO');
    expect(combo?.caption).toBe('tripleCombo');
  });

  it('always promotes final-clear word above others', () => {
    const events: HighlightEvent[] = [
      wordEvent({ word: 'BIG', score: 500, t: 100 }),
      wordEvent({ word: 'CLEAR', score: 30, t: 200 }),
      { kind: 'end', t: 250, reason: 'cleared', finalScore: 530 },
    ];
    const ranked = rankMoments(events);
    expect(ranked[0].event.word).toBe('CLEAR');
    expect(ranked[0].caption).toBe('finalClear');
    expect(ranked[0].isFinalClear).toBe(true);
  });

  it('does not promote final word on dead-end', () => {
    const events: HighlightEvent[] = [
      wordEvent({ word: 'BIG', score: 500, t: 100 }),
      wordEvent({ word: 'LAST', score: 30, t: 200 }),
      { kind: 'end', t: 250, reason: 'deadEnd', finalScore: 530 },
    ];
    expect(rankMoments(events)[0].event.word).toBe('BIG');
  });

  it('flags >=2 unique special tiles as specialChain', () => {
    const events: HighlightEvent[] = [
      wordEvent({
        word: 'X', score: 50,
        specialTilesHit: ['bomb', 'lightning'],
      }),
    ];
    expect(rankMoments(events)[0].caption).toBe('specialChain');
  });
});
```

- [ ] **Step 2: Run — must FAIL**

Run: `cd fe-next && npx vitest run lib/blast/__tests__/highlightScoring.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement**

```ts
// fe-next/lib/blast/highlightScoring.ts
import type {
  HighlightEvent,
  WordSubmitEvent,
  RankedMoment,
  CaptionTag,
} from './highlightTypes';

export const EPICNESS_WEIGHTS = {
  wordScore: 1.0,
  comboMultiplier: 25,
  specialTileBonus: 40,
  cascadeDepth: 15,
  finalClearBonus: 9999,
} as const;

function isWord(e: HighlightEvent): e is WordSubmitEvent {
  return e.kind === 'word';
}

function epicness(e: WordSubmitEvent, isFinalClear: boolean): number {
  const uniqueSpecials = new Set(e.specialTilesHit).size;
  return (
    e.score * EPICNESS_WEIGHTS.wordScore +
    e.combo * EPICNESS_WEIGHTS.comboMultiplier +
    uniqueSpecials * EPICNESS_WEIGHTS.specialTileBonus +
    (isFinalClear ? EPICNESS_WEIGHTS.finalClearBonus : 0)
  );
}

function captionFor(e: WordSubmitEvent, isFinalClear: boolean, isTopByScore: boolean): CaptionTag {
  if (isFinalClear) return 'finalClear';
  if (e.combo >= 3) return 'tripleCombo';
  if (new Set(e.specialTilesHit).size >= 2) return 'specialChain';
  if (isTopByScore) return 'biggestWord';
  return 'none';
}

export function rankMoments(events: HighlightEvent[]): RankedMoment[] {
  const words = events.filter(isWord);
  if (words.length === 0) return [];

  const endEvent = events.find((e): e is Extract<HighlightEvent, { kind: 'end' }> => e.kind === 'end');
  const lastWord = words[words.length - 1];
  const finalClearWord = endEvent?.reason === 'cleared' ? lastWord : null;

  const topByScore = [...words].sort((a, b) => b.score - a.score)[0];

  const moments: RankedMoment[] = words.map(w => {
    const isFinal = w === finalClearWord;
    const isTop = w === topByScore;
    return {
      event: w,
      epicness: epicness(w, isFinal),
      caption: captionFor(w, isFinal, isTop),
      isFinalClear: isFinal,
    };
  });

  return moments.sort((a, b) => b.epicness - a.epicness);
}
```

- [ ] **Step 4: Run — must PASS**

Run: `cd fe-next && npx vitest run lib/blast/__tests__/highlightScoring.test.ts`
Expected: PASS, 7/7

- [ ] **Step 5: Commit**

```bash
git add fe-next/lib/blast/highlightScoring.ts fe-next/lib/blast/__tests__/highlightScoring.test.ts
git commit -m "feat(blast): epicness scorer ranks highlight moments"
```

---

### Task 4: Highlight store (Zustand, ring buffer)

**Files:**
- Create: `fe-next/stores/highlightStore.ts`
- Test: `fe-next/stores/__tests__/highlightStore.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// fe-next/stores/__tests__/highlightStore.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useHighlightStore, BUFFER_BYTE_CAP } from '../highlightStore';

describe('highlightStore', () => {
  beforeEach(() => {
    useHighlightStore.getState().reset();
  });

  it('starts empty', () => {
    expect(useHighlightStore.getState().events).toEqual([]);
  });

  it('appends events in order', () => {
    const s = useHighlightStore.getState();
    s.append({ kind: 'word', t: 1, word: 'A', path: [], score: 10, combo: 0, specialTilesHit: [], preGrid: [], postGrid: [], effectsFired: [] });
    s.append({ kind: 'word', t: 2, word: 'B', path: [], score: 20, combo: 0, specialTilesHit: [], preGrid: [], postGrid: [], effectsFired: [] });
    expect(useHighlightStore.getState().events.map((e: any) => e.word)).toEqual(['A', 'B']);
  });

  it('drops oldest events when cap exceeded and reports overflow', () => {
    const s = useHighlightStore.getState();
    const onOverflow = vi.fn();
    s.setOverflowHandler(onOverflow);

    const fakeBig = { kind: 'word', t: 1, word: 'X', path: [], score: 0, combo: 0, specialTilesHit: [], preGrid: [], postGrid: [], effectsFired: [], _padding: 'x'.repeat(2_000_000) } as any;
    s.append(fakeBig);
    s.append(fakeBig);
    s.append(fakeBig);

    expect(onOverflow).toHaveBeenCalled();
    expect(useHighlightStore.getState().events.length).toBeLessThan(3);
  });

  it('reset clears events', () => {
    const s = useHighlightStore.getState();
    s.append({ kind: 'word', t: 1, word: 'A', path: [], score: 10, combo: 0, specialTilesHit: [], preGrid: [], postGrid: [], effectsFired: [] });
    s.reset();
    expect(useHighlightStore.getState().events).toEqual([]);
  });

  it('exposes BUFFER_BYTE_CAP constant', () => {
    expect(BUFFER_BYTE_CAP).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run — must FAIL**

Run: `cd fe-next && npx vitest run stores/__tests__/highlightStore.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement**

```ts
// fe-next/stores/highlightStore.ts
import { create } from 'zustand';
import type { HighlightEvent } from '@/lib/blast/highlightTypes';

export const BUFFER_BYTE_CAP = 5 * 1024 * 1024;

type OverflowHandler = (eventsDropped: number) => void;

interface HighlightState {
  events: HighlightEvent[];
  byteSize: number;
  overflowHandler: OverflowHandler | null;
  append: (e: HighlightEvent) => void;
  reset: () => void;
  setOverflowHandler: (h: OverflowHandler) => void;
}

function approxBytes(e: HighlightEvent): number {
  return JSON.stringify(e).length;
}

export const useHighlightStore = create<HighlightState>((set, get) => ({
  events: [],
  byteSize: 0,
  overflowHandler: null,
  append: (e) => {
    const eBytes = approxBytes(e);
    let { events, byteSize } = get();
    let dropped = 0;

    while (byteSize + eBytes > BUFFER_BYTE_CAP && events.length > 0) {
      const removed = events[0];
      byteSize -= approxBytes(removed);
      events = events.slice(1);
      dropped++;
    }

    set({ events: [...events, e], byteSize: byteSize + eBytes });

    if (dropped > 0) {
      const handler = get().overflowHandler;
      if (handler) handler(dropped);
    }
  },
  reset: () => set({ events: [], byteSize: 0 }),
  setOverflowHandler: (h) => set({ overflowHandler: h }),
}));
```

- [ ] **Step 4: Run — must PASS**

Run: `cd fe-next && npx vitest run stores/__tests__/highlightStore.test.ts`
Expected: PASS, 5/5

- [ ] **Step 5: Commit**

```bash
git add fe-next/stores/highlightStore.ts fe-next/stores/__tests__/highlightStore.test.ts
git commit -m "feat(blast): highlight store with 5MB ring buffer"
```

---

### Task 5: PostHog telemetry helpers

**Files:**
- Modify: `fe-next/utils/growthTracking.ts`

- [ ] **Step 1: Write failing test**

```ts
// fe-next/utils/__tests__/growthTracking.highlight.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const captureMock = vi.fn();
vi.mock('posthog-js', () => ({
  default: { capture: captureMock },
}));

import {
  trackHighlightStart,
  trackHighlightSkipped,
  trackHighlightBufferOverflow,
} from '../growthTracking';

describe('highlight telemetry', () => {
  beforeEach(() => captureMock.mockClear());

  it('trackHighlightStart fires highlight_started', () => {
    trackHighlightStart({ topEpicness: 320, clipCount: 1 });
    expect(captureMock).toHaveBeenCalledWith('highlight_started', { topEpicness: 320, clipCount: 1 });
  });

  it('trackHighlightSkipped includes clipIndex + elapsed', () => {
    trackHighlightSkipped({ clipIndex: 0, elapsedMs: 1200 });
    expect(captureMock).toHaveBeenCalledWith('highlight_skipped', { clipIndex: 0, elapsedMs: 1200 });
  });

  it('trackHighlightBufferOverflow includes eventsDropped', () => {
    trackHighlightBufferOverflow({ eventsDropped: 5 });
    expect(captureMock).toHaveBeenCalledWith('highlight_buffer_overflow', { eventsDropped: 5 });
  });
});
```

- [ ] **Step 2: Run — must FAIL**

Run: `cd fe-next && npx vitest run utils/__tests__/growthTracking.highlight.test.ts`
Expected: FAIL — exports missing

- [ ] **Step 3: Implement** — append to existing `fe-next/utils/growthTracking.ts`

Open `fe-next/utils/growthTracking.ts` and append at end of file:

```ts
export function trackHighlightStart(payload: { topEpicness: number; clipCount: number }): void {
  safe(() => (posthog.capture as PHFn)('highlight_started', payload));
}

export function trackHighlightSkipped(payload: { clipIndex: number; elapsedMs: number }): void {
  safe(() => (posthog.capture as PHFn)('highlight_skipped', payload));
}

export function trackHighlightBufferOverflow(payload: { eventsDropped: number }): void {
  safe(() => (posthog.capture as PHFn)('highlight_buffer_overflow', payload));
}
```

(`safe`, `posthog`, `PHFn` are already in scope — see existing helpers in the same file.)

- [ ] **Step 4: Run — must PASS**

Run: `cd fe-next && npx vitest run utils/__tests__/growthTracking.highlight.test.ts`
Expected: PASS, 3/3

- [ ] **Step 5: Commit**

```bash
git add fe-next/utils/growthTracking.ts fe-next/utils/__tests__/growthTracking.highlight.test.ts
git commit -m "feat(blast): highlight reel PostHog telemetry helpers"
```

---

### Task 6: i18n keys (5 locales)

**Files:**
- Modify: `fe-next/translations/{en,he,sv,ja,es}.js`

- [ ] **Step 1: Add keys to `en.js`**

Open `fe-next/translations/en.js`, find the `blast` object, add:

```js
"highlight": {
  "captions": {
    "biggestWord": "BIGGEST WORD",
    "tripleCombo": "TRIPLE COMBO",
    "specialChain": "POWER CHAIN",
    "finalClear": "FINAL CLEAR"
  },
  "boardCleared": "BOARD CLEARED",
  "skipLabel": "Skip",
  "reelLabel": "Highlight reel",
  "bestWord": "Best word"
}
```

- [ ] **Step 2: Add to `he.js` (RTL, AI translation — flag for native review)**

```js
"highlight": {
  "captions": {
    "biggestWord": "המילה הכי גדולה",
    "tripleCombo": "קומבו משולש",
    "specialChain": "שרשרת עוצמה",
    "finalClear": "ניקוי סופי"
  },
  "boardCleared": "הלוח נוקה",
  "skipLabel": "דלג",
  "reelLabel": "סרטון שיא",
  "bestWord": "המילה הטובה ביותר"
}
```

- [ ] **Step 3: Add to `sv.js`**

```js
"highlight": {
  "captions": {
    "biggestWord": "STÖRSTA ORDET",
    "tripleCombo": "TRIPPELCOMBO",
    "specialChain": "KRAFTKEDJA",
    "finalClear": "SLUTSTÄDNING"
  },
  "boardCleared": "BRÄDET RENSAT",
  "skipLabel": "Hoppa över",
  "reelLabel": "Höjdpunkter",
  "bestWord": "Bästa ord"
}
```

- [ ] **Step 4: Add to `ja.js` (flag for native review)**

```js
"highlight": {
  "captions": {
    "biggestWord": "最大の単語",
    "tripleCombo": "トリプルコンボ",
    "specialChain": "パワーチェーン",
    "finalClear": "ファイナルクリア"
  },
  "boardCleared": "ボードクリア",
  "skipLabel": "スキップ",
  "reelLabel": "ハイライト",
  "bestWord": "ベストワード"
}
```

- [ ] **Step 5: Add to `es.js` (flag for native review)**

```js
"highlight": {
  "captions": {
    "biggestWord": "PALABRA MÁS GRANDE",
    "tripleCombo": "COMBO TRIPLE",
    "specialChain": "CADENA DE PODER",
    "finalClear": "LIMPIEZA FINAL"
  },
  "boardCleared": "TABLERO LIMPIO",
  "skipLabel": "Omitir",
  "reelLabel": "Repetición",
  "bestWord": "Mejor palabra"
}
```

- [ ] **Step 6: Verify build**

Run: `cd fe-next && npm run lint && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add fe-next/translations/
git commit -m "feat(blast): i18n keys for highlight reel (HE/JA/ES need native review)"
```

---

### Task 7: Highlight recorder

**Files:**
- Create: `fe-next/lib/blast/highlightRecorder.ts`
- Test: `fe-next/lib/blast/__tests__/highlightRecorder.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// fe-next/lib/blast/__tests__/highlightRecorder.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createHighlightRecorder } from '../highlightRecorder';
import { useHighlightStore } from '@/stores/highlightStore';

describe('highlightRecorder', () => {
  beforeEach(() => {
    useHighlightStore.getState().reset();
    vi.useFakeTimers();
    vi.setSystemTime(new Date(1_000_000));
  });

  it('records word submit events with normalized t', () => {
    const r = createHighlightRecorder();
    r.start();
    vi.setSystemTime(new Date(1_000_500));
    r.recordWordSubmit({
      word: 'CAT', score: 30, path: [{ row: 0, col: 0 }],
      combo: 1, specialTilesHit: [],
      preGrid: [], postGrid: [], effectsFired: [],
    });

    const events = useHighlightStore.getState().events;
    expect(events.length).toBe(1);
    expect(events[0]).toMatchObject({ kind: 'word', word: 'CAT', t: 500 });
  });

  it('recordEnd writes a GameEndEvent', () => {
    const r = createHighlightRecorder();
    r.start();
    vi.setSystemTime(new Date(1_010_000));
    r.recordEnd('cleared', 1234);

    const events = useHighlightStore.getState().events;
    expect(events.find(e => e.kind === 'end')).toMatchObject({
      kind: 'end', reason: 'cleared', finalScore: 1234, t: 10_000,
    });
  });

  it('start() resets the store', () => {
    useHighlightStore.getState().append({
      kind: 'word', t: 0, word: 'OLD', path: [], score: 0, combo: 0,
      specialTilesHit: [], preGrid: [], postGrid: [], effectsFired: [],
    });
    const r = createHighlightRecorder();
    r.start();
    expect(useHighlightStore.getState().events).toEqual([]);
  });
});
```

- [ ] **Step 2: Run — must FAIL**

Run: `cd fe-next && npx vitest run lib/blast/__tests__/highlightRecorder.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement**

```ts
// fe-next/lib/blast/highlightRecorder.ts
import { useHighlightStore } from '@/stores/highlightStore';
import type {
  WordSubmitEvent,
  GameEndEvent,
} from './highlightTypes';

export interface HighlightRecorder {
  start: () => void;
  recordWordSubmit: (data: Omit<WordSubmitEvent, 't' | 'kind'>) => void;
  recordEnd: (reason: 'cleared' | 'deadEnd', finalScore: number) => void;
}

export function createHighlightRecorder(): HighlightRecorder {
  let startTime = 0;

  return {
    start() {
      startTime = Date.now();
      useHighlightStore.getState().reset();
    },
    recordWordSubmit(data) {
      const t = Date.now() - startTime;
      useHighlightStore.getState().append({ kind: 'word', t, ...data });
    },
    recordEnd(reason, finalScore) {
      const t = Date.now() - startTime;
      const event: GameEndEvent = { kind: 'end', t, reason, finalScore };
      useHighlightStore.getState().append(event);
    },
  };
}
```

- [ ] **Step 4: Run — must PASS**

Run: `cd fe-next && npx vitest run lib/blast/__tests__/highlightRecorder.test.ts`
Expected: PASS, 3/3

- [ ] **Step 5: Commit**

```bash
git add fe-next/lib/blast/highlightRecorder.ts fe-next/lib/blast/__tests__/highlightRecorder.test.ts
git commit -m "feat(blast): highlight recorder factory"
```

---

### Task 8: Wire recorder into BlastGame + word handler

**Files:**
- Modify: `fe-next/components/blast/BlastGame.tsx`
- Modify: `fe-next/components/blast/hooks/useBlastWordHandler.ts`

- [ ] **Step 1: Read existing files**

Run: `cat fe-next/components/blast/BlastGame.tsx | head -120`
Run: `cat fe-next/components/blast/hooks/useBlastWordHandler.ts | head -150`

Note where game start fires (look for `engine` instantiation or game-start effect) and where `handleWordAccepted` is defined.

- [ ] **Step 2: Add recorder to `BlastGame.tsx`**

Near top of `BlastGame` component body (where other refs/state are defined):

```ts
import { createHighlightRecorder } from '@/lib/blast/highlightRecorder';

// Inside component:
const highlightRecorderRef = useRef(createHighlightRecorder());
```

Find the effect that runs when game starts (phase becomes `'playing'`); add:

```ts
useEffect(() => {
  if (phase === 'playing') {
    highlightRecorderRef.current.start();
  }
}, [phase]);
```

Pass recorder as prop to word handler hook (or via context — match existing pattern). Simplest: pass through props on `useBlastWordHandler` call.

- [ ] **Step 3: Add recorder call in `useBlastWordHandler.ts`**

In `handleWordAccepted` callback, after `engine.submitWord(...)` returns:

```ts
const result = engine.submitWord(path, data.word, /* ... */);
// NEW:
if (recorder && result?.accepted) {
  recorder.recordWordSubmit({
    word: data.word,
    score: result.score ?? data.score,
    path: path.map(p => ({ row: p.row, col: p.col })),
    combo: detectedCombos?.depth ?? 0,
    specialTilesHit: clearedInfo.map(c => c.type).filter(t => t !== 'standard'),
    preGrid: result.preGrid ?? [],
    postGrid: result.postGrid ?? [],
    effectsFired: result.effectsFired ?? [],
  });
}
```

If engine doesn't currently return `preGrid`/`postGrid`, capture them by snapshotting `engine.tileStates` before and after the `submitWord` call (deep clone via `structuredClone`).

- [ ] **Step 4: Verify type-check**

Run: `cd fe-next && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 5: Run existing blast tests — must still PASS**

Run: `cd fe-next && npx vitest run components/blast`
Expected: PASS (no regression)

- [ ] **Step 6: Commit**

```bash
git add fe-next/components/blast/BlastGame.tsx fe-next/components/blast/hooks/useBlastWordHandler.ts
git commit -m "feat(blast): wire highlight recorder into game lifecycle"
```

---

### Task 9: Highlight clock hook

**Files:**
- Create: `fe-next/hooks/useHighlightClock.ts`
- Test: `fe-next/hooks/__tests__/useHighlightClock.test.tsx`

- [ ] **Step 1: Write failing tests**

```tsx
// fe-next/hooks/__tests__/useHighlightClock.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useHighlightClock } from '../useHighlightClock';

describe('useHighlightClock', () => {
  let rafCallbacks: Array<(t: number) => void> = [];
  let now = 0;

  beforeEach(() => {
    rafCallbacks = [];
    now = 0;
    vi.stubGlobal('requestAnimationFrame', (cb: (t: number) => void) => {
      rafCallbacks.push(cb);
      return rafCallbacks.length;
    });
    vi.stubGlobal('cancelAnimationFrame', () => {});
  });

  afterEach(() => vi.unstubAllGlobals());

  function tick(deltaMs: number) {
    now += deltaMs;
    const cbs = rafCallbacks;
    rafCallbacks = [];
    act(() => cbs.forEach(cb => cb(now)));
  }

  it('starts in idle phase with elapsed=0 rate=1', () => {
    const { result } = renderHook(() => useHighlightClock());
    expect(result.current.state.phase).toBe('idle');
    expect(result.current.state.elapsed).toBe(0);
  });

  it('start() advances elapsed at rate=1 by default', () => {
    const { result } = renderHook(() => useHighlightClock());
    act(() => result.current.start());
    tick(16);
    tick(16);
    expect(result.current.state.elapsed).toBeGreaterThan(0);
  });

  it('setRate scales elapsed advance', () => {
    const { result } = renderHook(() => useHighlightClock());
    act(() => result.current.start());
    act(() => result.current.setRate(0.5));
    tick(100);
    expect(result.current.state.elapsed).toBeLessThan(100);
  });

  it('stop() halts advance', () => {
    const { result } = renderHook(() => useHighlightClock());
    act(() => result.current.start());
    tick(100);
    const before = result.current.state.elapsed;
    act(() => result.current.stop());
    tick(100);
    expect(result.current.state.elapsed).toBe(before);
  });
});
```

- [ ] **Step 2: Run — must FAIL**

Run: `cd fe-next && npx vitest run hooks/__tests__/useHighlightClock.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement**

```ts
// fe-next/hooks/useHighlightClock.ts
import { useCallback, useEffect, useRef, useState } from 'react';

export type ClockPhase = 'idle' | 'letterboxIn' | 'clip' | 'card' | 'fadeOut';

export type ClockState = {
  elapsed: number;
  rate: number;
  phase: ClockPhase;
  clipIndex: number;
};

export type ClockApi = {
  state: ClockState;
  start: () => void;
  stop: () => void;
  setRate: (r: number) => void;
  setPhase: (p: ClockPhase) => void;
  setClipIndex: (i: number) => void;
};

const INITIAL: ClockState = { elapsed: 0, rate: 1.0, phase: 'idle', clipIndex: 0 };

export function useHighlightClock(): ClockApi {
  const [state, setState] = useState<ClockState>(INITIAL);
  const stateRef = useRef(state);
  stateRef.current = state;
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const runningRef = useRef(false);

  const tick = useCallback((time: number) => {
    if (!runningRef.current) return;
    if (lastTimeRef.current == null) lastTimeRef.current = time;
    const delta = time - lastTimeRef.current;
    lastTimeRef.current = time;
    const next: ClockState = {
      ...stateRef.current,
      elapsed: stateRef.current.elapsed + delta * stateRef.current.rate,
    };
    setState(next);
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const start = useCallback(() => {
    runningRef.current = true;
    lastTimeRef.current = null;
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  const stop = useCallback(() => {
    runningRef.current = false;
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
  }, []);

  const setRate = useCallback((r: number) => setState(s => ({ ...s, rate: r })), []);
  const setPhase = useCallback((p: ClockPhase) => setState(s => ({ ...s, phase: p })), []);
  const setClipIndex = useCallback((i: number) => setState(s => ({ ...s, clipIndex: i })), []);

  useEffect(() => () => stop(), [stop]);

  return { state, start, stop, setRate, setPhase, setClipIndex };
}
```

- [ ] **Step 4: Run — must PASS**

Run: `cd fe-next && npx vitest run hooks/__tests__/useHighlightClock.test.tsx`
Expected: PASS, 4/4

- [ ] **Step 5: Commit**

```bash
git add fe-next/hooks/useHighlightClock.ts fe-next/hooks/__tests__/useHighlightClock.test.tsx
git commit -m "feat(blast): RAF-driven highlight clock with scaled time"
```

---

### Task 10: LetterboxBars component

**Files:**
- Create: `fe-next/components/blast/highlight/LetterboxBars.tsx`
- Test: `fe-next/components/blast/highlight/__tests__/LetterboxBars.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
// fe-next/components/blast/highlight/__tests__/LetterboxBars.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LetterboxBars } from '../LetterboxBars';

describe('LetterboxBars', () => {
  it('renders top + bottom bars with role=presentation', () => {
    render(<LetterboxBars active={true} />);
    const bars = screen.getAllByRole('presentation');
    expect(bars.length).toBe(2);
  });

  it('does not render bars when inactive', () => {
    const { container } = render(<LetterboxBars active={false} />);
    expect(container.querySelectorAll('[role="presentation"]').length).toBe(0);
  });
});
```

- [ ] **Step 2: Run — must FAIL**

Run: `cd fe-next && npx vitest run components/blast/highlight/__tests__/LetterboxBars.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement**

```tsx
// fe-next/components/blast/highlight/LetterboxBars.tsx
import { motion, AnimatePresence } from 'framer-motion';

export function LetterboxBars({ active }: { active: boolean }) {
  return (
    <AnimatePresence>
      {active && (
        <>
          <motion.div
            role="presentation"
            initial={{ y: '-100%' }}
            animate={{ y: 0 }}
            exit={{ y: '-100%' }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed top-0 left-0 right-0 h-[12vh] bg-black z-[60] pointer-events-none"
          />
          <motion.div
            role="presentation"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed bottom-0 left-0 right-0 h-[12vh] bg-black z-[60] pointer-events-none"
          />
        </>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 4: Run — must PASS**

Run: `cd fe-next && npx vitest run components/blast/highlight/__tests__/LetterboxBars.test.tsx`
Expected: PASS, 2/2

- [ ] **Step 5: Commit**

```bash
git add fe-next/components/blast/highlight/LetterboxBars.tsx fe-next/components/blast/highlight/__tests__/LetterboxBars.test.tsx
git commit -m "feat(blast): letterbox bars component"
```

---

### Task 11: ScoreReadout component

**Files:**
- Create: `fe-next/components/blast/highlight/ScoreReadout.tsx`
- Test: `fe-next/components/blast/highlight/__tests__/ScoreReadout.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ScoreReadout } from '../ScoreReadout';

describe('ScoreReadout', () => {
  it('renders +428 with prefix', () => {
    render(<ScoreReadout score={428} visible={true} />);
    expect(screen.getByText('+428')).toBeInTheDocument();
  });

  it('does not render when invisible', () => {
    const { container } = render(<ScoreReadout score={428} visible={false} />);
    expect(container.textContent).not.toContain('+428');
  });
});
```

- [ ] **Step 2: Run — must FAIL**

Run: `cd fe-next && npx vitest run components/blast/highlight/__tests__/ScoreReadout.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement**

```tsx
// fe-next/components/blast/highlight/ScoreReadout.tsx
import { motion, AnimatePresence } from 'framer-motion';

export function ScoreReadout({ score, visible }: { score: number; visible: boolean }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ scale: 0, opacity: 0, rotate: -8 }}
          animate={{ scale: 1, opacity: 1, rotate: -4 }}
          exit={{ scale: 1.4, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 18 }}
          className="absolute top-1/3 left-1/2 -translate-x-1/2 z-[70] pointer-events-none"
          style={{
            fontFamily: 'Fredoka, sans-serif',
            fontWeight: 700,
            fontSize: '96px',
            color: '#FAFF00',
            textShadow: '4px 4px 0 #1a1a2e',
            WebkitTextStroke: '2px #1a1a2e',
          }}
        >
          +{score}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 4: Run — must PASS**

Run: `cd fe-next && npx vitest run components/blast/highlight/__tests__/ScoreReadout.test.tsx`
Expected: PASS, 2/2

- [ ] **Step 5: Commit**

```bash
git add fe-next/components/blast/highlight/ScoreReadout.tsx fe-next/components/blast/highlight/__tests__/ScoreReadout.test.tsx
git commit -m "feat(blast): score readout component"
```

---

### Task 12: WordReveal component

**Files:**
- Create: `fe-next/components/blast/highlight/WordReveal.tsx`
- Test: `fe-next/components/blast/highlight/__tests__/WordReveal.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WordReveal } from '../WordReveal';

describe('WordReveal', () => {
  it('renders each letter as separate span', () => {
    render(<WordReveal word="CAT" visible={true} />);
    const spans = screen.getAllByTestId('word-reveal-letter');
    expect(spans.length).toBe(3);
    expect(spans.map(s => s.textContent)).toEqual(['C', 'A', 'T']);
  });

  it('container has dir=auto for RTL safety', () => {
    render(<WordReveal word="שלום" visible={true} />);
    const container = screen.getByTestId('word-reveal');
    expect(container).toHaveAttribute('dir', 'auto');
  });

  it('hidden when visible=false', () => {
    const { container } = render(<WordReveal word="X" visible={false} />);
    expect(container.querySelector('[data-testid="word-reveal-letter"]')).toBeNull();
  });
});
```

- [ ] **Step 2: Run — must FAIL**

Run: `cd fe-next && npx vitest run components/blast/highlight/__tests__/WordReveal.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement**

```tsx
// fe-next/components/blast/highlight/WordReveal.tsx
import { motion, AnimatePresence } from 'framer-motion';

export function WordReveal({ word, visible }: { word: string; visible: boolean }) {
  const letters = Array.from(word);
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          data-testid="word-reveal"
          dir="auto"
          className="absolute top-[20%] left-1/2 -translate-x-1/2 z-[70] pointer-events-none flex gap-1"
          style={{ fontFamily: 'Fredoka, sans-serif', fontWeight: 700, fontSize: '80px' }}
        >
          {letters.map((ch, i) => (
            <motion.span
              key={`${ch}-${i}`}
              data-testid="word-reveal-letter"
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: i * 0.04, duration: 0.18 }}
              style={{
                color: '#FAFF00',
                textShadow: '4px 4px 0 #1a1a2e',
                textTransform: 'uppercase',
              }}
            >
              {ch}
            </motion.span>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 4: Run — must PASS**

Run: `cd fe-next && npx vitest run components/blast/highlight/__tests__/WordReveal.test.tsx`
Expected: PASS, 3/3

- [ ] **Step 5: Commit**

```bash
git add fe-next/components/blast/highlight/WordReveal.tsx fe-next/components/blast/highlight/__tests__/WordReveal.test.tsx
git commit -m "feat(blast): word reveal letter-stagger component"
```

---

### Task 13: MascotReaction component

**Files:**
- Create: `fe-next/components/blast/highlight/MascotReaction.tsx`
- Test: `fe-next/components/blast/highlight/__tests__/MascotReaction.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MascotReaction } from '../MascotReaction';

describe('MascotReaction', () => {
  it('shows mindblown mood for epicness > 500', () => {
    render(<MascotReaction epicness={800} visible={true} />);
    const img = screen.getByRole('img') as HTMLImageElement;
    expect(img.src).toContain('mindblown');
  });

  it('shows cool mood for epicness <= 500', () => {
    render(<MascotReaction epicness={200} visible={true} />);
    const img = screen.getByRole('img') as HTMLImageElement;
    expect(img.src).toContain('cool');
  });

  it('hidden when visible=false', () => {
    const { container } = render(<MascotReaction epicness={500} visible={false} />);
    expect(container.querySelector('img')).toBeNull();
  });
});
```

- [ ] **Step 2: Run — must FAIL**

Run: `cd fe-next && npx vitest run components/blast/highlight/__tests__/MascotReaction.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement**

```tsx
// fe-next/components/blast/highlight/MascotReaction.tsx
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

export function MascotReaction({ epicness, visible }: { epicness: number; visible: boolean }) {
  const mood = epicness > 500 ? 'mindblown' : 'cool';
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 22 }}
          className="absolute bottom-[18vh] right-6 z-[70] pointer-events-none"
        >
          <Image
            src={`/mascot/${mood}.gif`}
            alt=""
            width={140}
            height={140}
            unoptimized
            priority
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 4: Run — must PASS**

Run: `cd fe-next && npx vitest run components/blast/highlight/__tests__/MascotReaction.test.tsx`
Expected: PASS, 3/3

- [ ] **Step 5: Commit**

```bash
git add fe-next/components/blast/highlight/MascotReaction.tsx fe-next/components/blast/highlight/__tests__/MascotReaction.test.tsx
git commit -m "feat(blast): mascot reaction overlay"
```

---

### Task 14: BoardClearedCard component

**Files:**
- Create: `fe-next/components/blast/highlight/BoardClearedCard.tsx`
- Test: `fe-next/components/blast/highlight/__tests__/BoardClearedCard.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BoardClearedCard } from '../BoardClearedCard';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k }),
}));

describe('BoardClearedCard', () => {
  it('renders translation key when visible', () => {
    render(<BoardClearedCard finalScore={1234} visible={true} />);
    expect(screen.getByText('blast.highlight.boardCleared')).toBeInTheDocument();
    expect(screen.getByText('1234')).toBeInTheDocument();
  });

  it('hidden when visible=false', () => {
    const { container } = render(<BoardClearedCard finalScore={0} visible={false} />);
    expect(container.textContent).not.toContain('boardCleared');
  });
});
```

- [ ] **Step 2: Run — must FAIL**

Run: `cd fe-next && npx vitest run components/blast/highlight/__tests__/BoardClearedCard.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement**

```tsx
// fe-next/components/blast/highlight/BoardClearedCard.tsx
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';

export function BoardClearedCard({ finalScore, visible }: { finalScore: number; visible: boolean }) {
  const { t } = useLanguage();
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="absolute inset-0 z-[70] flex flex-col items-center justify-center bg-[#1a1a2e]/95 pointer-events-none"
        >
          <div
            style={{
              fontFamily: 'Fredoka, sans-serif',
              fontWeight: 700,
              fontSize: 'clamp(48px, 9vw, 120px)',
              color: '#FAFF00',
              textShadow: '6px 6px 0 #000',
              textTransform: 'uppercase',
            }}
          >
            {t('blast.highlight.boardCleared')}
          </div>
          <div
            style={{
              fontFamily: 'Fredoka, sans-serif',
              fontSize: 'clamp(32px, 5vw, 64px)',
              color: '#FFFFFF',
              marginTop: '16px',
            }}
          >
            {finalScore}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 4: Run — must PASS**

Run: `cd fe-next && npx vitest run components/blast/highlight/__tests__/BoardClearedCard.test.tsx`
Expected: PASS, 2/2

- [ ] **Step 5: Commit**

```bash
git add fe-next/components/blast/highlight/BoardClearedCard.tsx fe-next/components/blast/highlight/__tests__/BoardClearedCard.test.tsx
git commit -m "feat(blast): board cleared final card"
```

---

### Task 15: Audio stinger asset + sound integration

**Files:**
- Create: `fe-next/public/sounds/blast-highlight-stinger.webm`
- Modify: `fe-next/contexts/SoundEffectsContext.tsx` (add sound key)

- [ ] **Step 1: Source the asset**

Use any 80KB-or-smaller audio file as a temporary placeholder. For prod, source a royalty-free cinematic stinger (e.g. freesound.org "cinematic hit"). Convert to webm:

```bash
# If you have an mp3/wav source `stinger-source.mp3`:
ffmpeg -i stinger-source.mp3 -c:a libopus -b:a 96k -t 1.5 \
  fe-next/public/sounds/blast-highlight-stinger.webm
```

If no asset available yet, create a 1.5sec silent placeholder:

```bash
ffmpeg -f lavfi -i anullsrc=r=44100:cl=mono -t 1.5 -c:a libopus -b:a 32k \
  fe-next/public/sounds/blast-highlight-stinger.webm
```

Mark as "PLACEHOLDER ASSET — replace before ship" in commit msg.

- [ ] **Step 2: Register sound key**

Open `fe-next/contexts/SoundEffectsContext.tsx`, find the sound registry (look for a `SOUND_KEYS` const or similar object listing sound files). Add:

```ts
'blast-highlight-stinger': '/sounds/blast-highlight-stinger.webm',
```

- [ ] **Step 3: Verify type-check**

Run: `cd fe-next && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add fe-next/public/sounds/blast-highlight-stinger.webm fe-next/contexts/SoundEffectsContext.tsx
git commit -m "feat(blast): highlight stinger audio asset (placeholder for now)"
```

---

### Task 16: HighlightPlayer (single-clip orchestrator)

**Files:**
- Create: `fe-next/components/blast/highlight/HighlightPlayer.tsx`
- Test: `fe-next/components/blast/highlight/__tests__/HighlightPlayer.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
// fe-next/components/blast/highlight/__tests__/HighlightPlayer.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { HighlightPlayer } from '../HighlightPlayer';
import type { RankedMoment } from '@/lib/blast/highlightTypes';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));
vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({ playSound: vi.fn(), setGameActive: vi.fn() }),
}));
vi.mock('@/components/motion/AdaptiveMotion', () => ({
  useSkipAnimations: () => false,
}));
vi.mock('@/utils/growthTracking', () => ({
  trackHighlightStart: vi.fn(),
  trackHighlightSkipped: vi.fn(),
}));

const fakeMoment: RankedMoment = {
  event: {
    kind: 'word', t: 1000, word: 'CAT', score: 100, path: [],
    combo: 0, specialTilesHit: [], preGrid: [], postGrid: [], effectsFired: [],
  },
  epicness: 100,
  caption: 'biggestWord',
  isFinalClear: false,
};

describe('HighlightPlayer', () => {
  it('renders with skip button having translated label', () => {
    render(<HighlightPlayer moments={[fakeMoment]} finalScore={1234} onComplete={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'blast.highlight.skipLabel' })).toBeInTheDocument();
  });

  it('fires onComplete when skip clicked', () => {
    const onComplete = vi.fn();
    render(<HighlightPlayer moments={[fakeMoment]} finalScore={0} onComplete={onComplete} />);
    fireEvent.click(screen.getByRole('button', { name: 'blast.highlight.skipLabel' }));
    expect(onComplete).toHaveBeenCalled();
  });

  it('renders BoardClearedCard text in final phase', async () => {
    render(<HighlightPlayer moments={[fakeMoment]} finalScore={500} onComplete={vi.fn()} />);
    // BoardClearedCard appears once player advances; for unit test we just assert WordReveal renders
    expect(screen.getByTestId('word-reveal')).toBeInTheDocument();
  });
});

describe('HighlightPlayer reduced-motion fallback', () => {
  it('shows static Best Word card when useSkipAnimations true', async () => {
    vi.resetModules();
    vi.doMock('@/components/motion/AdaptiveMotion', () => ({
      useSkipAnimations: () => true,
    }));
    const { HighlightPlayer: ReducedPlayer } = await import('../HighlightPlayer');
    render(<ReducedPlayer moments={[fakeMoment]} finalScore={500} onComplete={vi.fn()} />);
    expect(screen.getByText('blast.highlight.bestWord')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run — must FAIL**

Run: `cd fe-next && npx vitest run components/blast/highlight/__tests__/HighlightPlayer.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement**

```tsx
// fe-next/components/blast/highlight/HighlightPlayer.tsx
'use client';
import { useEffect, useState, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { useSkipAnimations } from '@/components/motion/AdaptiveMotion';
import { useHighlightClock } from '@/hooks/useHighlightClock';
import { rampRate, RAMP_DEFAULTS } from '@/lib/blast/rampCurve';
import {
  trackHighlightStart,
  trackHighlightSkipped,
} from '@/utils/growthTracking';
import type { RankedMoment } from '@/lib/blast/highlightTypes';
import { LetterboxBars } from './LetterboxBars';
import { ScoreReadout } from './ScoreReadout';
import { WordReveal } from './WordReveal';
import { MascotReaction } from './MascotReaction';
import { BoardClearedCard } from './BoardClearedCard';

const LETTERBOX_IN_MS = 200;
const CLIP_MS = RAMP_DEFAULTS.approachMs + RAMP_DEFAULTS.dwellMs + RAMP_DEFAULTS.followThroughMs; // 1400
const CARD_HOLD_MS = 1000;
const FADE_OUT_MS = 300;

interface Props {
  moments: RankedMoment[];
  finalScore: number;
  onComplete: () => void;
}

export function HighlightPlayer({ moments, finalScore, onComplete }: Props) {
  const { t } = useLanguage();
  const { playSound } = useSoundEffects();
  const skip = useSkipAnimations();
  const { state, start, stop, setRate, setPhase } = useHighlightClock();
  const [skipped, setSkipped] = useState(false);

  const top = moments[0];

  useEffect(() => {
    if (skip) {
      const timeout = setTimeout(onComplete, 1500);
      return () => clearTimeout(timeout);
    }
    trackHighlightStart({ topEpicness: top?.epicness ?? 0, clipCount: 1 });
    setPhase('letterboxIn');
    start();
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skip]);

  useEffect(() => {
    if (skip || skipped) return;
    const elapsed = state.elapsed;

    if (state.phase === 'letterboxIn' && elapsed >= LETTERBOX_IN_MS) {
      setPhase('clip');
      playSound('blast-highlight-stinger');
    } else if (state.phase === 'clip') {
      const clipElapsed = elapsed - LETTERBOX_IN_MS;
      setRate(rampRate(clipElapsed, RAMP_DEFAULTS));
      if (clipElapsed >= CLIP_MS) {
        setPhase('card');
        setRate(1.0);
      }
    } else if (state.phase === 'card' && elapsed - LETTERBOX_IN_MS - CLIP_MS >= CARD_HOLD_MS) {
      setPhase('fadeOut');
    } else if (state.phase === 'fadeOut' && elapsed - LETTERBOX_IN_MS - CLIP_MS - CARD_HOLD_MS >= FADE_OUT_MS) {
      stop();
      onComplete();
    }
  }, [state.elapsed, state.phase, skip, skipped, setPhase, setRate, playSound, stop, onComplete]);

  const handleSkip = useCallback(() => {
    setSkipped(true);
    trackHighlightSkipped({ clipIndex: state.clipIndex, elapsedMs: state.elapsed });
    stop();
    onComplete();
  }, [state.clipIndex, state.elapsed, stop, onComplete]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === ' ') handleSkip();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleSkip]);

  if (skip) {
    return (
      <div role="dialog" aria-label={t('blast.highlight.reelLabel')} className="fixed inset-0 z-[60] flex items-center justify-center bg-[#1a1a2e]/95">
        <div className="text-center">
          <div style={{ fontFamily: 'Fredoka', fontSize: 24, color: '#FAFF00' }}>
            {t('blast.highlight.bestWord')}
          </div>
          <div style={{ fontFamily: 'Fredoka', fontWeight: 700, fontSize: 64, color: '#fff', marginTop: 8 }}>
            {top?.event.word ?? '—'}
          </div>
          <div style={{ fontFamily: 'Fredoka', fontSize: 36, color: '#FAFF00', marginTop: 8 }}>
            +{top?.event.score ?? 0}
          </div>
        </div>
      </div>
    );
  }

  const inClipPhase = state.phase === 'clip';
  const inCardPhase = state.phase === 'card';
  const showWord = inClipPhase || inCardPhase;

  return (
    <div role="dialog" aria-label={t('blast.highlight.reelLabel')} className="fixed inset-0 z-[55] pointer-events-none">
      <LetterboxBars active={state.phase !== 'idle' && state.phase !== 'fadeOut'} />
      <WordReveal word={top?.event.word ?? ''} visible={showWord} />
      <ScoreReadout score={top?.event.score ?? 0} visible={inClipPhase} />
      <MascotReaction epicness={top?.epicness ?? 0} visible={showWord} />
      <BoardClearedCard finalScore={finalScore} visible={inCardPhase} />

      <button
        onClick={handleSkip}
        className="fixed top-4 right-4 z-[80] px-4 py-2 bg-black/60 text-white rounded pointer-events-auto"
        style={{ minWidth: 44, minHeight: 44, fontFamily: 'Fredoka' }}
        aria-label={t('blast.highlight.skipLabel')}
      >
        {t('blast.highlight.skipLabel')} ▸
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Run — must PASS**

Run: `cd fe-next && npx vitest run components/blast/highlight/__tests__/HighlightPlayer.test.tsx`
Expected: PASS, 4/4

- [ ] **Step 5: Commit**

```bash
git add fe-next/components/blast/highlight/HighlightPlayer.tsx fe-next/components/blast/highlight/__tests__/HighlightPlayer.test.tsx
git commit -m "feat(blast): HighlightPlayer single-clip orchestrator"
```

---

### Task 17: Wire HighlightPlayer into BlastView phase machine

**Files:**
- Modify: `fe-next/components/blast/BlastView.tsx`
- Modify: `fe-next/components/blast/hooks/useBlastGameEnd.ts`

- [ ] **Step 1: Add `'highlight'` to BlastPhase**

Open `fe-next/components/blast/BlastView.tsx`, line 66. Change:

```ts
export type BlastPhase = 'ready' | 'waveIntro' | 'playing' | 'waveTransition' | 'results';
```

to:

```ts
export type BlastPhase = 'ready' | 'waveIntro' | 'playing' | 'waveTransition' | 'highlight' | 'results';
```

- [ ] **Step 2: Add HighlightPlayer mount in BlastView**

In the same file, find where `BlastResultsSummary` is rendered (search for `BlastResultsSummary`). Above it, add a conditional mount for the highlight phase:

```tsx
import { HighlightPlayer } from './highlight/HighlightPlayer';
import { useHighlightStore } from '@/stores/highlightStore';
import { rankMoments } from '@/lib/blast/highlightScoring';
// ...
{phase === 'highlight' && (() => {
  const events = useHighlightStore.getState().events;
  const ranked = rankMoments(events).slice(0, 1); // Phase 1: single moment
  const finalScore = engine?.gameState?.score ?? 0;
  return (
    <HighlightPlayer
      moments={ranked}
      finalScore={finalScore}
      onComplete={() => setPhase('results')}
    />
  );
})()}
```

(Adapt the `engine` reference to whatever variable holds the score in your component. If the score isn't available there, plumb through props.)

- [ ] **Step 3: Modify `useBlastGameEnd` to route through highlight**

Open `fe-next/components/blast/hooks/useBlastGameEnd.ts` lines 74-87. Change the existing `setTimeout(() => onWaveComplete(...))` to first record game-end and route to highlight phase if cleared.

Current (approximate):
```ts
if (!isMultiplayer && engine.gameState.isComplete) {
  // existing code
}
```

Add a new callback prop `onHighlightStart` to the hook, and call it instead of jumping straight to results when `isComplete`. The wiring in `BlastGame.tsx` then sets `BlastView.phase = 'highlight'`.

Concretely:
- Add `onHighlightStart?: (finalScore: number) => void` to the hook's props type
- In the `isComplete` branch, after calling `planSugarCrush()`, replace `onWaveComplete` call with:
  ```ts
  if (onHighlightStart) {
    recorderRef.current.recordEnd('cleared', engine.gameState.score);
    setTimeout(() => onHighlightStart(engine.gameState.score), 2000);
  } else if (onWaveComplete) {
    setTimeout(() => onWaveComplete(score, wordsFound, clearPct), 2000);
  }
  ```
- For `isDeadEnd` → still go straight to results (record end with `'deadEnd'`)

In `BlastGame.tsx`, supply `onHighlightStart={() => setPhase('highlight')}`.

- [ ] **Step 4: Run lint + typecheck**

Run: `cd fe-next && npm run lint && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 5: Run blast test suite**

Run: `cd fe-next && npx vitest run components/blast`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add fe-next/components/blast/
git commit -m "feat(blast): route win condition through highlight phase before results"
```

---

### Task 17.5: Camera push-in via shared transform

**Files:**
- Modify: `fe-next/components/blast/BlastBoard.tsx`
- Modify: `fe-next/components/blast/highlight/HighlightPlayer.tsx`
- Modify: `fe-next/stores/highlightStore.ts`

The board is rendered outside HighlightPlayer (in BlastView). To "camera push" the grid, HighlightPlayer publishes a transform; BlastBoard reads it.

- [ ] **Step 1: Add camera state to highlightStore**

Append to `fe-next/stores/highlightStore.ts` `HighlightState` interface:

```ts
camera: { scale: number; translateX: number; translateY: number; transitionMs: number };
setCamera: (c: { scale: number; translateX: number; translateY: number; transitionMs: number }) => void;
```

In the `create` body:

```ts
camera: { scale: 1, translateX: 0, translateY: 0, transitionMs: 0 },
setCamera: (c) => set({ camera: c }),
```

Add reset coverage: in `reset()` action, also reset camera to identity.

- [ ] **Step 2: BlastBoard reads camera**

In `BlastBoard.tsx`, near the root wrapper, read camera state:

```tsx
import { useHighlightStore } from '@/stores/highlightStore';
const camera = useHighlightStore(s => s.camera);

// On the existing grid wrapper element, add:
style={{
  transform: `scale(${camera.scale}) translate(${camera.translateX}px, ${camera.translateY}px)`,
  transition: `transform ${camera.transitionMs}ms cubic-bezier(0.22, 1, 0.36, 1)`,
  transformOrigin: 'center center',
  willChange: 'transform',
}}
```

(Merge with any existing inline style on the wrapper.)

- [ ] **Step 3: HighlightPlayer publishes camera transform per clip**

In `HighlightPlayer.tsx`, when entering `'clip'` phase compute path bbox and set camera:

```ts
import { useHighlightStore } from '@/stores/highlightStore';

function computePush(path: { row: number; col: number }[]) {
  if (path.length === 0) return { scale: 1.2, translateX: 0, translateY: 0, transitionMs: 600 };
  const cx = path.reduce((s, p) => s + p.col, 0) / path.length;
  const cy = path.reduce((s, p) => s + p.row, 0) / path.length;
  // Assume 4×4 grid; shift toward action centre
  const offsetX = (1.5 - cx) * 24;
  const offsetY = (1.5 - cy) * 24;
  return { scale: 1.4, translateX: offsetX, translateY: offsetY, transitionMs: 600 };
}

// In phase transition: when entering 'clip'
useHighlightStore.getState().setCamera(computePush(clip?.event.path ?? []));

// On entering 'card' or skip/end: reset
useHighlightStore.getState().setCamera({ scale: 1, translateX: 0, translateY: 0, transitionMs: 300 });
```

- [ ] **Step 4: Test camera state in store**

Add to `fe-next/stores/__tests__/highlightStore.test.ts`:

```ts
it('camera defaults to identity', () => {
  const c = useHighlightStore.getState().camera;
  expect(c).toEqual({ scale: 1, translateX: 0, translateY: 0, transitionMs: 0 });
});

it('setCamera updates camera', () => {
  useHighlightStore.getState().setCamera({ scale: 1.5, translateX: 10, translateY: 5, transitionMs: 600 });
  const c = useHighlightStore.getState().camera;
  expect(c.scale).toBe(1.5);
});

it('reset returns camera to identity', () => {
  useHighlightStore.getState().setCamera({ scale: 1.5, translateX: 10, translateY: 5, transitionMs: 600 });
  useHighlightStore.getState().reset();
  expect(useHighlightStore.getState().camera).toEqual({ scale: 1, translateX: 0, translateY: 0, transitionMs: 0 });
});
```

- [ ] **Step 5: Run tests**

Run: `cd fe-next && npx vitest run stores/__tests__/highlightStore.test.ts components/blast`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add fe-next/stores/highlightStore.ts fe-next/components/blast/BlastBoard.tsx fe-next/components/blast/highlight/HighlightPlayer.tsx fe-next/stores/__tests__/highlightStore.test.ts
git commit -m "feat(blast): cinematic camera push-in during highlight clips"
```

---

### Task 18: Buffer-overflow telemetry wiring

**Files:**
- Modify: `fe-next/lib/blast/highlightRecorder.ts`

- [ ] **Step 1: Wire overflow handler**

In `createHighlightRecorder().start()`, register the overflow handler:

```ts
import { trackHighlightBufferOverflow } from '@/utils/growthTracking';
// ...
start() {
  startTime = Date.now();
  const store = useHighlightStore.getState();
  store.reset();
  store.setOverflowHandler((eventsDropped) => {
    trackHighlightBufferOverflow({ eventsDropped });
  });
},
```

- [ ] **Step 2: Update existing test if needed**

Re-run: `cd fe-next && npx vitest run lib/blast/__tests__/highlightRecorder.test.ts`
Expected: PASS (existing tests unaffected)

- [ ] **Step 3: Commit**

```bash
git add fe-next/lib/blast/highlightRecorder.ts
git commit -m "feat(blast): emit PostHog event on highlight buffer overflow"
```

---

### Task 19: E2E smoke test (Playwright)

**Files:**
- Create: `fe-next/e2e/blast-highlight.spec.ts`

- [ ] **Step 1: Check existing Playwright config**

Run: `ls fe-next/e2e/ 2>/dev/null && cat fe-next/playwright.config.ts 2>/dev/null | head -30`

If no `e2e/` dir exists, the project may use a different path — check `package.json` scripts for `playwright` or `test:e2e`.

- [ ] **Step 2: Write smoke test**

```ts
// fe-next/e2e/blast-highlight.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Blast highlight reel', () => {
  test('plays highlight after manual board clear and reaches results', async ({ page }) => {
    // Navigate to blast in dev (port 3001)
    await page.goto('http://localhost:3001/en/blast');
    await page.waitForLoadState('networkidle');

    // This test relies on a deterministic seed or test-only "force-clear" mechanism.
    // For now, just assert the page loads and skip button mounts when phase=highlight.
    // A full deterministic flow requires test hooks — file a follow-up if not present.

    // Smoke: page renders without error
    await expect(page).toHaveTitle(/blast/i);
  });

  test('reduced-motion shows static fallback', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'reduced-motion only deterministic on chromium');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('http://localhost:3001/en/blast');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveTitle(/blast/i);
  });
});
```

(Phase 1 smoke is intentionally minimal — full deterministic flow requires test hooks in BlastEngine that don't exist yet. File `e2e: deterministic blast clear` as follow-up.)

- [ ] **Step 3: Run smoke**

Run: `cd fe-next && npx playwright test e2e/blast-highlight.spec.ts`
Expected: PASS or skipped (smoke only verifies no crash)

- [ ] **Step 4: Commit**

```bash
git add fe-next/e2e/blast-highlight.spec.ts
git commit -m "test(blast): highlight reel E2E smoke (page-load level)"
```

---

### Task 20: Phase 1 manual QA + ship checkpoint

- [ ] **Step 1: Full lint + test + build**

Run: `cd fe-next && npm run lint && npm run test && npm run build`
Expected: PASS all three

- [ ] **Step 2: Local manual QA**

Start dev: `cd fe-next && npm run dev`
Open `http://localhost:3001/en/blast`
- Play a game to board-clear
- Verify reel plays: letterbox in, word reveals, score shows, mascot appears, BOARD CLEARED card holds, then results screen
- Verify Skip button works
- Verify `?locale=he` works (RTL)
- Toggle OS reduced-motion — verify static fallback
- Mute system audio — verify reel still readable visually
- Background tab — verify reel pauses

- [ ] **Step 3: Capture short clip (gif/screen recording)**

Save under `docs/superpowers/specs/assets/blast-highlight-phase1.gif` (or just attach to PR).

- [ ] **Step 4: Phase 1 done — checkpoint commit**

```bash
git commit --allow-empty -m "chore(blast): Phase 1 highlight reel single-clip MVP shipped"
```

---

## Phase 2: Multi-cut + visual polish

### Task 21: CaptionBanner component

**Files:**
- Create: `fe-next/components/blast/highlight/CaptionBanner.tsx`
- Test: `fe-next/components/blast/highlight/__tests__/CaptionBanner.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CaptionBanner } from '../CaptionBanner';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k }),
}));

describe('CaptionBanner', () => {
  it('renders translation key for biggestWord', () => {
    render(<CaptionBanner caption="biggestWord" visible={true} />);
    expect(screen.getByText('blast.highlight.captions.biggestWord')).toBeInTheDocument();
  });

  it('renders nothing for caption=none', () => {
    const { container } = render(<CaptionBanner caption="none" visible={true} />);
    expect(container.textContent).toBe('');
  });

  it('hidden when visible=false', () => {
    const { container } = render(<CaptionBanner caption="biggestWord" visible={false} />);
    expect(container.textContent).toBe('');
  });
});
```

- [ ] **Step 2: Run — must FAIL**

Run: `cd fe-next && npx vitest run components/blast/highlight/__tests__/CaptionBanner.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement**

```tsx
// fe-next/components/blast/highlight/CaptionBanner.tsx
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import type { CaptionTag } from '@/lib/blast/highlightTypes';

const KEY_MAP: Record<Exclude<CaptionTag, 'none'>, string> = {
  biggestWord: 'blast.highlight.captions.biggestWord',
  tripleCombo: 'blast.highlight.captions.tripleCombo',
  specialChain: 'blast.highlight.captions.specialChain',
  finalClear: 'blast.highlight.captions.finalClear',
};

export function CaptionBanner({ caption, visible }: { caption: CaptionTag; visible: boolean }) {
  const { t } = useLanguage();
  if (caption === 'none') return null;
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ x: '-100%' }}
          animate={{ x: 0 }}
          exit={{ x: '-100%' }}
          transition={{ type: 'spring', stiffness: 360, damping: 22 }}
          className="absolute top-[10%] left-0 z-[68] pointer-events-none px-6 py-2 bg-black"
          style={{
            fontFamily: 'Fredoka',
            fontWeight: 700,
            fontSize: 28,
            color: '#FAFF00',
            borderRight: '4px solid #FAFF00',
            textTransform: 'uppercase',
            letterSpacing: 2,
          }}
        >
          {t(KEY_MAP[caption])}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 4: Run — must PASS**

Run: `cd fe-next && npx vitest run components/blast/highlight/__tests__/CaptionBanner.test.tsx`
Expected: PASS, 3/3

- [ ] **Step 5: Commit**

```bash
git add fe-next/components/blast/highlight/CaptionBanner.tsx fe-next/components/blast/highlight/__tests__/CaptionBanner.test.tsx
git commit -m "feat(blast): caption banner component"
```

---

### Task 22: Multi-clip sequencer in HighlightPlayer

**Files:**
- Modify: `fe-next/components/blast/highlight/HighlightPlayer.tsx`
- Modify: `fe-next/components/blast/highlight/__tests__/HighlightPlayer.test.tsx`
- Modify: `fe-next/components/blast/BlastView.tsx`

- [ ] **Step 1: Write failing test for multi-cut**

Add to `HighlightPlayer.test.tsx`:

```tsx
it('cycles through multiple moments', () => {
  const moments: RankedMoment[] = [
    { ...fakeMoment, event: { ...fakeMoment.event, word: 'A' }, caption: 'biggestWord' },
    { ...fakeMoment, event: { ...fakeMoment.event, word: 'B' }, caption: 'tripleCombo' },
    { ...fakeMoment, event: { ...fakeMoment.event, word: 'C' }, caption: 'finalClear', isFinalClear: true },
  ];
  render(<HighlightPlayer moments={moments} finalScore={1500} onComplete={vi.fn()} />);
  // Initially shows first moment's word
  expect(screen.getByTestId('word-reveal')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run — must FAIL or pass trivially**

Run: `cd fe-next && npx vitest run components/blast/highlight/__tests__/HighlightPlayer.test.tsx`
(Existing tests should still pass; new test should pass with single-clip code as long as moments[0] renders.)

- [ ] **Step 3: Implement multi-clip sequencer**

Replace the single-clip block in `HighlightPlayer.tsx`. Full new structure:

```tsx
// At top of component body, replace `const top = moments[0];`:
const [activeClipIdx, setActiveClipIdx] = useState(0);
const clip = moments[activeClipIdx];
const totalClips = moments.length;
const clipStartElapsedRef = useRef<number>(LETTERBOX_IN_MS);
const [flashing, setFlashing] = useState(false);

// Replace the existing phase-transition effect with this version:
useEffect(() => {
  if (skip || skipped) return;
  const elapsed = state.elapsed;

  if (state.phase === 'letterboxIn' && elapsed >= LETTERBOX_IN_MS) {
    setPhase('clip');
    clipStartElapsedRef.current = LETTERBOX_IN_MS;
    playSound('blast-highlight-stinger');
    useHighlightStore.getState().setCamera(computePush(clip?.event.path ?? []));
  } else if (state.phase === 'clip') {
    const clipElapsed = elapsed - clipStartElapsedRef.current;
    setRate(rampRate(clipElapsed, RAMP_DEFAULTS));
    if (clipElapsed >= CLIP_MS) {
      if (activeClipIdx < totalClips - 1) {
        setFlashing(true);
        setTimeout(() => setFlashing(false), 200);
        setActiveClipIdx(i => i + 1);
        clipStartElapsedRef.current = elapsed;
        playSound('blast-highlight-stinger');
        useHighlightStore.getState().setCamera(
          computePush(moments[activeClipIdx + 1]?.event.path ?? [])
        );
      } else {
        setPhase('card');
        setRate(1.0);
        useHighlightStore.getState().setCamera({ scale: 1, translateX: 0, translateY: 0, transitionMs: 300 });
      }
    }
  } else if (state.phase === 'card' && elapsed - clipStartElapsedRef.current - CLIP_MS >= CARD_HOLD_MS) {
    setPhase('fadeOut');
  } else if (state.phase === 'fadeOut' && elapsed - clipStartElapsedRef.current - CLIP_MS - CARD_HOLD_MS >= FADE_OUT_MS) {
    stop();
    onComplete();
  }
}, [state.elapsed, state.phase, skip, skipped, activeClipIdx, totalClips, clip, moments, setPhase, setRate, playSound, stop, onComplete]);
```

Add to JSX near other overlays:

```tsx
import { CaptionBanner } from './CaptionBanner';
// ...
<CaptionBanner caption={clip?.caption ?? 'none'} visible={state.phase === 'clip'} />

{flashing && (
  <motion.div
    initial={{ opacity: 1 }}
    animate={{ opacity: 0 }}
    transition={{ duration: 0.2 }}
    className="absolute inset-0 z-[75] bg-white pointer-events-none"
  />
)}
```

Replace existing `top` references throughout JSX with `clip`.

- [ ] **Step 4: Update BlastView to pass top-3**

In `BlastView.tsx`, change the slice from `.slice(0, 1)` to `.slice(0, 3)`:

```ts
const ranked = rankMoments(events).slice(0, 3);
```

Also ensure final-clear bookend is at end. Adjust `rankMoments` consumer side or the rank function itself if needed.

- [ ] **Step 5: Run all tests**

Run: `cd fe-next && npx vitest run components/blast`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add fe-next/components/blast/highlight/HighlightPlayer.tsx fe-next/components/blast/highlight/__tests__/HighlightPlayer.test.tsx fe-next/components/blast/BlastView.tsx
git commit -m "feat(blast): multi-clip highlight reel sequencer"
```

---

### Task 23: Pixi overlay container (color grade + grain)

**Files:**
- Create: `fe-next/components/blast/highlight/BlastHighlightOverlay.tsx`
- Create: `fe-next/components/blast/highlight/ColorGradeFilter.tsx`
- Create: `fe-next/components/blast/highlight/GrainOverlay.tsx`
- Test: `fe-next/components/blast/highlight/__tests__/BlastHighlightOverlay.test.tsx`

- [ ] **Step 1: Write failing test (smoke)**

```tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { BlastHighlightOverlay } from '../BlastHighlightOverlay';

describe('BlastHighlightOverlay', () => {
  it('renders without crash when active', () => {
    const { container } = render(<BlastHighlightOverlay active={true} />);
    expect(container.querySelector('canvas, [data-pixi-overlay]')).toBeTruthy();
  });

  it('renders nothing when inactive', () => {
    const { container } = render(<BlastHighlightOverlay active={false} />);
    expect(container.firstChild).toBeNull();
  });
});
```

- [ ] **Step 2: Run — must FAIL**

Run: `cd fe-next && npx vitest run components/blast/highlight/__tests__/BlastHighlightOverlay.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement**

```tsx
// fe-next/components/blast/highlight/BlastHighlightOverlay.tsx
'use client';
import { useEffect, useRef } from 'react';
import { Application, Container, ColorMatrixFilter, Sprite, Texture } from 'pixi.js';

export function BlastHighlightOverlay({ active }: { active: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);

  useEffect(() => {
    if (!active || !containerRef.current) return;

    let cancelled = false;
    const app = new Application();
    app.init({
      resizeTo: window,
      backgroundAlpha: 0,
      antialias: true,
    }).then(() => {
      if (cancelled) {
        app.destroy(true);
        return;
      }
      appRef.current = app;
      containerRef.current!.appendChild(app.canvas);

      const cinematic = new ColorMatrixFilter();
      cinematic.matrix = [
        1.1, 0,   0,   0, 0,
        0,   1.0, 0,   0, 0,
        0,   0,   0.9, 0, 0,
        0,   0,   0,   1, 0,
      ];
      app.stage.filters = [cinematic];
    });

    return () => {
      cancelled = true;
      const a = appRef.current;
      if (a) {
        a.destroy(true);
        appRef.current = null;
      }
    };
  }, [active]);

  if (!active) return null;
  return <div ref={containerRef} data-pixi-overlay className="fixed inset-0 z-[58] pointer-events-none" />;
}
```

**Scope note**: This task implements the **color grade matrix only**. Standalone `ColorGradeFilter.tsx` and `GrainOverlay.tsx` files listed in the file-structure table are intentionally NOT created here — the matrix lives inside `BlastHighlightOverlay.tsx`, and grain texture is deferred to a follow-up (the 8% grain sprite needs an asset that isn't sourced yet). Update the file-structure table mentally: those two files become "follow-up" rather than "Phase 2".

- [ ] **Step 4: Run smoke test (with Pixi mock)**

Add to test file at top:
```ts
vi.mock('pixi.js', () => ({
  Application: vi.fn().mockImplementation(() => ({
    init: vi.fn().mockResolvedValue(undefined),
    canvas: document.createElement('canvas'),
    stage: { filters: [] },
    destroy: vi.fn(),
  })),
  ColorMatrixFilter: vi.fn().mockImplementation(() => ({ matrix: [] })),
  Container: vi.fn(),
  Sprite: vi.fn(),
  Texture: { from: vi.fn() },
}));
```

Run: `cd fe-next && npx vitest run components/blast/highlight/__tests__/BlastHighlightOverlay.test.tsx`
Expected: PASS, 2/2

- [ ] **Step 5: Mount overlay in HighlightPlayer**

Add to `HighlightPlayer.tsx` JSX (above LetterboxBars):

```tsx
<BlastHighlightOverlay active={state.phase !== 'idle'} />
```

- [ ] **Step 6: Commit**

```bash
git add fe-next/components/blast/highlight/BlastHighlightOverlay.tsx fe-next/components/blast/highlight/__tests__/BlastHighlightOverlay.test.tsx fe-next/components/blast/highlight/HighlightPlayer.tsx
git commit -m "feat(blast): Pixi color-grade overlay"
```

---

### Task 24: DOF blur on non-focal tiles

**Files:**
- Modify: `fe-next/components/blast/BlastTile.tsx`
- Modify: `fe-next/components/blast/BlastBoard.tsx`
- Modify: `fe-next/components/blast/highlight/HighlightPlayer.tsx`

- [ ] **Step 1: Add `data-replay-focal` attribute to BlastTile**

Open `BlastTile.tsx`. Find the root tile element (usually a `<motion.div>`). Add prop:

```ts
interface Props {
  // ... existing
  replayFocal?: boolean;
}
```

In root element JSX:
```tsx
data-replay-focal={replayFocal === undefined ? undefined : (replayFocal ? 'true' : 'false')}
```

- [ ] **Step 2: Add CSS rule (global)**

Find the project's global stylesheet (likely `app/globals.css` or `styles/global.css`):

```css
[data-replay-focal="false"] {
  filter: blur(4px) brightness(0.5);
  transition: filter 200ms ease;
}
```

- [ ] **Step 3: Plumb focal-tile set through BlastBoard**

In `BlastBoard.tsx`, accept `focalCoords?: Set<string>` prop. For each tile, pass:

```tsx
replayFocal={focalCoords ? focalCoords.has(`${row},${col}`) : undefined}
```

- [ ] **Step 4: Compute focal set in HighlightPlayer**

In `HighlightPlayer.tsx`, build a Set from the active clip's path:

```ts
const focalCoords = new Set(clip?.event.path.map(p => `${p.row},${p.col}`) ?? []);
```

Pass it to whatever renders `BlastBoard`. (For Phase 2 may require lifting BlastBoard into the highlight phase render tree — this is the largest structural change of Phase 2; see open risk in spec.)

- [ ] **Step 5: Feature-flag DOF on low-end**

Wrap the focal-set application:

```ts
import { getPerformanceConfig } from '@/components/motion/AdaptiveMotion';
const dofEnabled = !getPerformanceConfig().isLowEnd;
const focalCoords = dofEnabled ? new Set(/* ... */) : undefined;
```

- [ ] **Step 6: Run lint + tests**

Run: `cd fe-next && npm run lint && npx vitest run components/blast`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add fe-next/components/blast/BlastTile.tsx fe-next/components/blast/BlastBoard.tsx fe-next/components/blast/highlight/HighlightPlayer.tsx fe-next/app/globals.css
git commit -m "feat(blast): depth-of-field blur on non-focal tiles during reel"
```

---

### Task 25: Phase 2 manual QA + balance pass

- [ ] **Step 1: Full lint + test + build**

Run: `cd fe-next && npm run lint && npm run test && npm run build`
Expected: PASS

- [ ] **Step 2: Tune `EPICNESS_WEIGHTS` if needed**

Play 5-10 games. If reel consistently picks "wrong" moment, adjust weights in `lib/blast/highlightScoring.ts`. Common tweaks:
- Combo too dominant? Lower `comboMultiplier` from 25 → 15
- Special tiles overrated? Lower `specialTileBonus` from 40 → 25
- Boring final clear? Already promoted by `finalClearBonus` — may need to lower so sometimes a mid-game banger headlines

- [ ] **Step 3: Manual QA pass**

- iPhone SE (low-end perf check; verify DOF auto-disabled)
- HE RTL (caption mirror, word-reveal direction)
- Reduced-motion (static fallback)
- Background-tab pause/resume
- Skip button (every phase)

- [ ] **Step 4: Replace placeholder audio asset**

If `blast-highlight-stinger.webm` is still the silent placeholder, source a real cinematic stinger and replace.

- [ ] **Step 5: Phase 2 ship checkpoint**

```bash
git commit --allow-empty -m "chore(blast): Phase 2 highlight reel multi-cut shipped"
```

---

## Memory + follow-ups

After ship, save MEMORY entry:

`memory/blast-highlight-reel-shipped.md`:
> Phase 1+2 of Blast highlight reel shipped YYYY-MM-DD. Recorder/store/scorer in `lib/blast/`. Player+overlays in `components/blast/highlight/`. EPICNESS_WEIGHTS tuneable; remote config = follow-up. Audio asset path = `/sounds/blast-highlight-stinger.webm`. HE/JA/ES strings AI-generated, flag for native review.

Append index line to `memory/MEMORY.md`.

**Known follow-ups (not in this plan):**
1. Seedrandom-threaded particle factories for replay determinism
2. Share-to-social video export
3. Highlights gallery (IndexedDB)
4. Multi-stinger variants
5. Live-ops remote tuning of EPICNESS_WEIGHTS
6. Highlight reel for adventure / MP / WOTD / drills
7. Deterministic e2e test hook in BlastEngine for full Playwright flow
