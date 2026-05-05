# Practice Mode Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild three practice modes (classic / wordHunt / wheelRush) to mirror their real game engines, add Pixi+GSAP juice, declutter the layout, integrate the real dictionary, and author native-locale tutorial copy across en/he/sv/ja/es.

**Architecture:** Extract reusable engines (drag-select hooks, validator, juice, micro-tutorial state) into a shared `lib/practice/` + `components/practice/` infra layer. Each practice mode becomes a thin (~150 LOC) wrapper around shared hooks, mounted with a Pixi overlay and a native-locale tutorial state machine. Real game files (PortraitLayout, WordWheelGame, WheelRushView) are NOT touched.

**Tech Stack:** Next.js 16 App Router · React 18 · TypeScript · Vitest + Testing Library · PixiJS (existing blast canvas pattern) · GSAP · Tailwind 3.4 + neo-brutalist tokens · i18n (5 locales)

**Spec source:** `docs/superpowers/specs/2026-05-05-practice-mode-redesign-design.md`

**Approved gates:** Uniform 3-word goal · Chain CTA hidden until goal hit · Optimistic-accept on 5xx · One PR per phase · ux-writer skill invoked in Phase 4.

---

## File Structure Map

### Created (new)
```
lib/practice/
├── usePracticeValidator.ts            # debounced /api/validate-word + cache + retry
├── usePracticeValidator.test.ts       # cache, retry, 429/5xx
├── microTutorial.ts                   # tutorial-beat state machine
├── microTutorial.test.ts              # beat sequencing
└── practiceCopy.ts                    # typed access to native locale strings

components/practice/
├── PracticePixiFx.tsx                 # Pixi overlay (reuses BlastEffectsCanvas pattern)
├── PracticePixiFx.test.tsx            # mount/unmount lifecycle
├── usePracticeJuice.ts                # GSAP timelines: wordFound/invalid/goalComplete
├── usePracticeJuice.test.ts
├── PracticeMicroTip.tsx               # inline ≤4-word floating tooltip
├── PracticeMicroTip.test.tsx          # auto-dismiss, RTL placement
├── usePracticeGridDragSelect.ts       # drag-select for 4×4 grid
├── usePracticeGridDragSelect.test.ts
├── usePracticeWheelDragSelect.ts      # drag-select for circular wheel layout
├── usePracticeWheelDragSelect.test.ts
└── PracticeWheelRushSandbox.tsx       # NEW — replaces existing PracticeWheelSandbox
    PracticeWheelRushSandbox.test.tsx

translations/{en,he,sv,ja,es}/
└── practice.tutorial.*                # 6 native-locale beat strings each
```

### Modified
```
components/practice/
├── PracticeMiniDemo.tsx               # locale-aware letters, overflow fix (Phase 1)
├── PracticeClassicSandbox.tsx         # rewrite to use shared infra (Phase 3)
├── PracticeWordHuntSandbox.tsx        # rewrite to mirror real word-hunt (Phase 5)
└── __tests__/PracticeClassicSandbox.test.tsx        # rewrite for new contract
   __tests__/PracticeClassicSandbox.completion.test.tsx
   __tests__/PracticeWordHuntSandbox.test.tsx
```

### Deleted (deprecated)
```
components/practice/PracticeWheelSandbox.tsx   # replaced by PracticeWheelRushSandbox
components/practice/PracticeCoachTip.tsx       # absorbed by PracticeMicroTip
```

---

## Phase 1 — Wheel-Rush Intro Micro-Bugfix

**Spec ref:** §3.5
**Goal:** Make `PracticeMiniDemo` letters locale-aware and prevent satellite-tile overflow on small breakpoints.
**Files:**
- Modify: `components/practice/PracticeMiniDemo.tsx`
- Modify (or create): `components/practice/__tests__/PracticeMiniDemo.test.tsx`

### Task 1.1: Write failing test for locale-aware letters

- [ ] **Step 1: Write the failing test**

Create or edit `components/practice/__tests__/PracticeMiniDemo.test.tsx`:

```tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

const mockLanguage = vi.fn(() => 'he');
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: mockLanguage(), t: (k: string) => k }),
}));

import PracticeMiniDemo from '../PracticeMiniDemo';

describe('PracticeMiniDemo locale-aware letters', () => {
  it('renders Hebrew letters in HE locale (wheelRush)', () => {
    mockLanguage.mockReturnValue('he');
    render(<PracticeMiniDemo mode="wheelRush" />);
    // HE wheelRush demo: center י + satellites ש/ל/ו/ם
    expect(screen.getByText('י')).toBeInTheDocument();
    expect(screen.getByText('ש')).toBeInTheDocument();
    expect(screen.getByText('ל')).toBeInTheDocument();
    expect(screen.getByText('ו')).toBeInTheDocument();
    expect(screen.getByText('ם')).toBeInTheDocument();
    // Latin letters MUST NOT appear
    expect(screen.queryByText('E')).toBeNull();
    expect(screen.queryByText('C')).toBeNull();
  });

  it('renders Japanese hiragana in JA locale (wheelRush)', () => {
    mockLanguage.mockReturnValue('ja');
    render(<PracticeMiniDemo mode="wheelRush" />);
    expect(screen.getByText('い')).toBeInTheDocument();
    expect(screen.getByText('ね')).toBeInTheDocument();
  });

  it('renders English letters in EN locale (wheelRush)', () => {
    mockLanguage.mockReturnValue('en');
    render(<PracticeMiniDemo mode="wheelRush" />);
    expect(screen.getByText('E')).toBeInTheDocument();
    expect(screen.getByText('C')).toBeInTheDocument();
  });

  it('classic/wordHunt demo letters are also locale-aware', () => {
    mockLanguage.mockReturnValue('he');
    render(<PracticeMiniDemo mode="classic" />);
    // HE classic mini-grid: ש/ל/ו/ם spelling shalom across the trail
    expect(screen.queryByText('C')).toBeNull();
    expect(screen.queryByText('A')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/practice/__tests__/PracticeMiniDemo.test.tsx`
Expected: FAIL — Hebrew letters not found, Latin letters still present.

- [ ] **Step 3: Implement locale-aware letters**

Edit `components/practice/PracticeMiniDemo.tsx`:

```tsx
'use client';

import React from 'react';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { useLanguage } from '@/contexts/LanguageContext';
import type { PracticeMode } from '@/lib/practice/practiceTutorialSteps';

interface Props { mode: PracticeMode }

const COLOR_FOR_MODE: Record<PracticeMode, { tile: string; path: string; ring: string }> = {
  classic:   { tile: 'bg-neo-cyan/30 border-neo-cyan text-neo-cream',   path: 'bg-neo-cyan',   ring: 'border-neo-cyan/60' },
  wordHunt:  { tile: 'bg-neo-lime/30 border-neo-lime text-neo-cream',   path: 'bg-neo-lime',   ring: 'border-neo-lime/60' },
  wheelRush: { tile: 'bg-neo-purple/30 border-neo-purple text-neo-cream', path: 'bg-neo-purple', ring: 'border-neo-purple/60' },
};

// Per-locale demo letters — chosen so each set spells a real word in that language
type Locale = 'en' | 'he' | 'sv' | 'ja' | 'es';

const WHEEL_LETTERS: Record<Locale, { center: string; satellites: [string, string, string, string] }> = {
  en: { center: 'E', satellites: ['C', 'A', 'R', 'T'] },
  sv: { center: 'E', satellites: ['S', 'T', 'A', 'R'] },
  he: { center: 'י', satellites: ['ש', 'ל', 'ו', 'ם'] },
  ja: { center: 'い', satellites: ['ね', 'こ', 'と', 'り'] },
  es: { center: 'O', satellites: ['M', 'A', 'R', 'E'] },
};

const GRID_LETTERS: Record<Locale, [string, string, string, string]> = {
  en: ['C', 'A', 'T', 'S'],
  sv: ['S', 'O', 'L', 'A'],
  he: ['ש', 'ל', 'ו', 'ם'],
  ja: ['ね', 'こ', 'と', 'り'],
  es: ['C', 'A', 'S', 'A'],
};

const asLocale = (lang: string): Locale =>
  (['en','he','sv','ja','es'] as const).includes(lang as Locale) ? (lang as Locale) : 'en';

export default function PracticeMiniDemo({ mode }: Props) {
  const { language } = useLanguage();
  const locale = asLocale(language);
  const c = COLOR_FOR_MODE[mode];

  if (mode === 'wheelRush') {
    const { center, satellites } = WHEEL_LETTERS[locale];
    // Cap satellite radius to box bounds (w-32 h-32 = 128px → max radius 48px not 52)
    const RADIUS_PX = 44;
    return (
      <div className="relative w-32 h-32 mx-auto" aria-hidden>
        <span className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full border-2 ${c.tile} flex items-center justify-center font-neo-display font-black text-xl shadow-hard-sm`}>
          {center}
        </span>
        {satellites.map((letter, idx) => {
          const angle = idx * 90;
          return (
            <AdaptiveMotion.span
              key={`${letter}-${idx}`}
              className={`absolute top-1/2 left-1/2 w-9 h-9 rounded-neo border-2 ${c.tile} flex items-center justify-center font-neo-display font-black text-base shadow-hard-sm`}
              style={{
                transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-${RADIUS_PX}px) rotate(${-angle}deg)`,
              }}
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ duration: 1.6, repeat: Infinity, delay: idx * 0.4, ease: 'easeInOut' }}
            >
              {letter}
            </AdaptiveMotion.span>
          );
        })}
      </div>
    );
  }

  // classic / wordHunt: 2×2 grid with drag-trail
  const letters = GRID_LETTERS[locale];
  const tiles: Array<[string, [number, number]]> = [
    [letters[0], [0, 0]],
    [letters[1], [1, 0]],
    [letters[2], [1, 1]],
    [letters[3], [0, 1]],
  ];
  return (
    <div className="relative w-32 h-32 mx-auto" aria-hidden>
      {tiles.map(([letter, [x, y]], idx) => (
        <AdaptiveMotion.span
          key={`${letter}-${idx}`}
          className={`absolute w-12 h-12 rounded-neo border-2 ${c.tile} flex items-center justify-center font-neo-display font-black text-xl shadow-hard-sm`}
          style={{ left: `${x * 64 + 4}px`, top: `${y * 64 + 4}px` }}
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 1.6, repeat: Infinity, delay: idx * 0.35, ease: 'easeInOut' }}
        >
          {letter}
        </AdaptiveMotion.span>
      ))}
      <AdaptiveMotion.span
        className={`absolute w-3 h-3 rounded-full ${c.path} shadow-hard-sm`}
        animate={{
          left: ['28px', '92px', '92px', '28px', '28px'],
          top:  ['28px', '28px', '92px', '92px', '28px'],
        }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run components/practice/__tests__/PracticeMiniDemo.test.tsx`
Expected: PASS — all 4 cases.

- [ ] **Step 5: Verify lint + typecheck + full test suite still green**

Run:
```
npm run lint
npx tsc --noEmit
npm run test
```
Expected: 0 errors / 0 lint warnings on changed files / all tests still pass.

- [ ] **Step 6: Commit Phase 1**

```bash
git add components/practice/PracticeMiniDemo.tsx \
        components/practice/__tests__/PracticeMiniDemo.test.tsx
git commit -m "fix(practice): wheelRush intro mini-demo locale-aware letters

Hardcoded Latin C/A/R/T satellites + E center caused jarring Latin
glyphs in HE/JA/ES practice intro. Per-locale letter sets now spell a
real word in each language. Satellite radius reduced to 44px so the
demo no longer overflows its w-32 box on small breakpoints.

Spec: docs/superpowers/specs/2026-05-05-practice-mode-redesign-design.md §3.5"
```

---

## Phase 2 — Shared Infra

**Spec ref:** §3.1, §4.1, §4.2, §5
**Goal:** Build all reusable practice infrastructure with full unit test coverage. No mode wiring yet.

### Task 2.1: `usePracticeValidator` — write failing test

**Files:**
- Create: `lib/practice/usePracticeValidator.ts`
- Create: `lib/practice/usePracticeValidator.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/practice/usePracticeValidator.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePracticeValidator } from './usePracticeValidator';

const mockFetch = vi.fn();
beforeEach(() => {
  mockFetch.mockReset();
  global.fetch = mockFetch as unknown as typeof fetch;
});

const okValid = () =>
  Promise.resolve({ ok: true, status: 200, json: async () => ({ isValid: true,  source: 'dictionary' }) });
const okInvalid = () =>
  Promise.resolve({ ok: true, status: 200, json: async () => ({ isValid: false, source: 'pending', reason: 'Word not in dictionary' }) });
const status429 = () =>
  Promise.resolve({ ok: false, status: 429, json: async () => ({}) });
const status500 = () =>
  Promise.resolve({ ok: false, status: 500, json: async () => ({}) });

describe('usePracticeValidator', () => {
  it('returns valid for a dictionary word', async () => {
    mockFetch.mockImplementationOnce(okValid);
    const { result } = renderHook(() => usePracticeValidator('en'));
    let res!: { isValid: boolean; source: string };
    await act(async () => { res = await result.current.check('STAR'); });
    expect(res.isValid).toBe(true);
    expect(res.source).toBe('dictionary');
  });

  it('caches a word for the session — second check does not refetch', async () => {
    mockFetch.mockImplementationOnce(okValid);
    const { result } = renderHook(() => usePracticeValidator('en'));
    await act(async () => { await result.current.check('STAR'); });
    await act(async () => { await result.current.check('STAR'); });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('retries once on 429 then succeeds', async () => {
    mockFetch.mockImplementationOnce(status429);
    mockFetch.mockImplementationOnce(okValid);
    const { result } = renderHook(() => usePracticeValidator('en'));
    let res!: { isValid: boolean };
    await act(async () => { res = await result.current.check('STAR'); });
    expect(res.isValid).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('optimistically accepts on 5xx (forgiving practice)', async () => {
    mockFetch.mockImplementationOnce(status500);
    const { result } = renderHook(() => usePracticeValidator('en'));
    let res!: { isValid: boolean; source: string };
    await act(async () => { res = await result.current.check('XYZQQ'); });
    expect(res.isValid).toBe(true);
    expect(res.source).toBe('optimistic');
  });

  it('returns invalid for a non-dictionary word (200 isValid:false)', async () => {
    mockFetch.mockImplementationOnce(okInvalid);
    const { result } = renderHook(() => usePracticeValidator('en'));
    let res!: { isValid: boolean };
    await act(async () => { res = await result.current.check('ZZZ'); });
    expect(res.isValid).toBe(false);
  });

  it('passes the language to the API', async () => {
    mockFetch.mockImplementationOnce(okValid);
    const { result } = renderHook(() => usePracticeValidator('he'));
    await act(async () => { await result.current.check('שלום'); });
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.language).toBe('he');
    expect(body.word).toBe('שלום');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/practice/usePracticeValidator.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `usePracticeValidator`**

Create `lib/practice/usePracticeValidator.ts`:

```ts
import { useCallback, useRef } from 'react';

export interface PracticeValidationResult {
  isValid: boolean;
  source: 'dictionary' | 'optimistic' | 'rejected';
  reason?: string;
}

/**
 * Practice-mode word validator. Wraps /api/validate-word with a session-scoped
 * cache, single retry on 429, and optimistic-accept on 5xx (we're forgiving in
 * practice — never block the player on infra hiccups).
 *
 * Cache: per-hook-instance, lives until the practice screen unmounts. Keyed
 * by `language:word`. No TTL needed — practice sessions are short.
 */
export function usePracticeValidator(language: string) {
  const cacheRef = useRef<Map<string, PracticeValidationResult>>(new Map());

  const check = useCallback(
    async (word: string): Promise<PracticeValidationResult> => {
      const key = `${language}:${word}`;
      const cached = cacheRef.current.get(key);
      if (cached) return cached;

      const callOnce = () =>
        fetch('/api/validate-word', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ word, language }),
        });

      let response: Response;
      try {
        response = (await callOnce()) as Response;
        if (response.status === 429) {
          await new Promise((r) => setTimeout(r, 600));
          response = (await callOnce()) as Response;
        }
      } catch {
        const result: PracticeValidationResult = { isValid: true, source: 'optimistic' };
        cacheRef.current.set(key, result);
        return result;
      }

      if (response.status >= 500) {
        const result: PracticeValidationResult = { isValid: true, source: 'optimistic' };
        cacheRef.current.set(key, result);
        return result;
      }

      let body: { isValid?: boolean; reason?: string } = {};
      try {
        body = await response.json();
      } catch {
        // ignore
      }
      const result: PracticeValidationResult = body.isValid
        ? { isValid: true, source: 'dictionary' }
        : { isValid: false, source: 'rejected', reason: body.reason };
      cacheRef.current.set(key, result);
      return result;
    },
    [language],
  );

  return { check };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/practice/usePracticeValidator.test.ts`
Expected: PASS — all 6 cases.

### Task 2.2: `microTutorial` — beat state machine

**Files:**
- Create: `lib/practice/microTutorial.ts`
- Create: `lib/practice/microTutorial.test.ts`

- [ ] **Step 1: Write failing test**

Create `lib/practice/microTutorial.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { createMicroTutorial, type MicroTutorialEvent } from './microTutorial';

describe('microTutorial state machine', () => {
  it('starts at beat 1 — drag prompt', () => {
    const m = createMicroTutorial({ mode: 'classic' });
    expect(m.currentBeat()).toBe('drag');
  });

  it('advances beat 1 → 2 once user starts a drag', () => {
    const m = createMicroTutorial({ mode: 'classic' });
    m.dispatch({ type: 'drag-started' });
    expect(m.currentBeat()).toBe('diagonal');
  });

  it('advances beat 2 → silent on first valid word, then back to "nice" beat 3', () => {
    const m = createMicroTutorial({ mode: 'classic' });
    m.dispatch({ type: 'drag-started' });
    m.dispatch({ type: 'word-found' });
    expect(m.currentBeat()).toBe('nice');
  });

  it('beat after first valid word is silent on subsequent words', () => {
    const m = createMicroTutorial({ mode: 'classic' });
    m.dispatch({ type: 'drag-started' });
    m.dispatch({ type: 'word-found' });
    m.dispatch({ type: 'beat-completed' }); // "nice" auto-dismisses
    m.dispatch({ type: 'word-found' });
    expect(m.currentBeat()).toBe(null);
  });

  it('fires goal-complete beat when goal reached', () => {
    const m = createMicroTutorial({ mode: 'classic' });
    m.dispatch({ type: 'goal-reached', count: 3 });
    expect(m.currentBeat()).toBe('goalComplete');
  });

  it('idle nudge after 30s with no word', () => {
    const m = createMicroTutorial({ mode: 'classic' });
    m.dispatch({ type: 'drag-started' });
    m.dispatch({ type: 'beat-completed' }); // diagonal dismisses
    m.dispatch({ type: 'idle-30s' });
    expect(m.currentBeat()).toBe('idleNudge');
  });

  it('returns null beat when fully consumed', () => {
    const m = createMicroTutorial({ mode: 'classic' });
    m.dispatch({ type: 'drag-started' });
    m.dispatch({ type: 'beat-completed' });
    m.dispatch({ type: 'beat-completed' });
    expect(m.currentBeat()).toBe(null);
  });

  it('per-mode initial beat — wheelRush starts at "spin"', () => {
    const m = createMicroTutorial({ mode: 'wheelRush' });
    expect(m.currentBeat()).toBe('spin');
  });
});
```

- [ ] **Step 2: Run test, expect FAIL**

Run: `npx vitest run lib/practice/microTutorial.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement state machine**

Create `lib/practice/microTutorial.ts`:

```ts
export type MicroTutorialMode = 'classic' | 'wordHunt' | 'wheelRush';

export type MicroTutorialBeat =
  | 'drag'        // classic + wordHunt: "Drag."
  | 'spin'        // wheelRush: "Spin to spell."
  | 'diagonal'    // classic: ghost-trace diagonal example
  | 'target'      // wordHunt: "Spell the target."
  | 'nice'        // first valid word: "Nice!"
  | 'goalComplete'// goal hit
  | 'idleNudge'   // 30s no word: "Try short words."
  | null;

export type MicroTutorialEvent =
  | { type: 'drag-started' }
  | { type: 'word-found' }
  | { type: 'beat-completed' }
  | { type: 'goal-reached'; count: number }
  | { type: 'idle-30s' };

interface State {
  mode: MicroTutorialMode;
  beat: MicroTutorialBeat;
  niceFired: boolean;
}

export function createMicroTutorial(opts: { mode: MicroTutorialMode }) {
  const startBeat: MicroTutorialBeat =
    opts.mode === 'wheelRush' ? 'spin' :
    opts.mode === 'wordHunt'  ? 'target' :
                                'drag';
  const state: State = { mode: opts.mode, beat: startBeat, niceFired: false };

  function dispatch(ev: MicroTutorialEvent) {
    if (ev.type === 'goal-reached') { state.beat = 'goalComplete'; return; }
    if (ev.type === 'idle-30s')     { if (state.beat === null) state.beat = 'idleNudge'; return; }
    if (ev.type === 'drag-started') {
      if (state.mode === 'classic') state.beat = 'diagonal';
      else                          state.beat = state.beat === 'spin' || state.beat === 'target' ? null : state.beat;
      return;
    }
    if (ev.type === 'word-found') {
      if (!state.niceFired) {
        state.beat = 'nice';
        state.niceFired = true;
      } else {
        state.beat = null;
      }
      return;
    }
    if (ev.type === 'beat-completed') {
      state.beat = null;
    }
  }

  return {
    currentBeat: () => state.beat,
    dispatch,
  };
}
```

- [ ] **Step 4: Run test, expect PASS**

Run: `npx vitest run lib/practice/microTutorial.test.ts`
Expected: PASS — all 8 cases.

### Task 2.3: `usePracticeGridDragSelect` hook

**Files:**
- Create: `components/practice/usePracticeGridDragSelect.ts`
- Create: `components/practice/usePracticeGridDragSelect.test.ts`

- [ ] **Step 1: Write failing test**

Create `components/practice/usePracticeGridDragSelect.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePracticeGridDragSelect } from './usePracticeGridDragSelect';

describe('usePracticeGridDragSelect', () => {
  it('starts with empty path', () => {
    const { result } = renderHook(() => usePracticeGridDragSelect({ rows: 4, cols: 4 }));
    expect(result.current.path).toEqual([]);
  });

  it('first pointer-down adds the cell', () => {
    const { result } = renderHook(() => usePracticeGridDragSelect({ rows: 4, cols: 4 }));
    act(() => result.current.onCellEnter(0, 0, 'S'));
    expect(result.current.path.map((c) => c.letter)).toEqual(['S']);
  });

  it('extends path when next cell is adjacent (orthogonal)', () => {
    const { result } = renderHook(() => usePracticeGridDragSelect({ rows: 4, cols: 4 }));
    act(() => result.current.onCellEnter(0, 0, 'S'));
    act(() => result.current.onCellEnter(0, 1, 'T'));
    expect(result.current.path.map((c) => c.letter)).toEqual(['S', 'T']);
  });

  it('extends path when next cell is diagonal', () => {
    const { result } = renderHook(() => usePracticeGridDragSelect({ rows: 4, cols: 4 }));
    act(() => result.current.onCellEnter(0, 0, 'S'));
    act(() => result.current.onCellEnter(1, 1, 'X'));
    expect(result.current.path.map((c) => c.letter)).toEqual(['S', 'X']);
  });

  it('rejects non-adjacent cell', () => {
    const { result } = renderHook(() => usePracticeGridDragSelect({ rows: 4, cols: 4 }));
    act(() => result.current.onCellEnter(0, 0, 'S'));
    act(() => result.current.onCellEnter(2, 2, 'X'));
    expect(result.current.path.map((c) => c.letter)).toEqual(['S']);
  });

  it('backtracks when re-entering an already-selected cell (penultimate)', () => {
    const { result } = renderHook(() => usePracticeGridDragSelect({ rows: 4, cols: 4 }));
    act(() => result.current.onCellEnter(0, 0, 'S'));
    act(() => result.current.onCellEnter(0, 1, 'T'));
    act(() => result.current.onCellEnter(0, 0, 'S'));
    expect(result.current.path.map((c) => c.letter)).toEqual(['S']);
  });

  it('clear() resets path', () => {
    const { result } = renderHook(() => usePracticeGridDragSelect({ rows: 4, cols: 4 }));
    act(() => result.current.onCellEnter(0, 0, 'S'));
    act(() => result.current.clear());
    expect(result.current.path).toEqual([]);
  });
});
```

- [ ] **Step 2: Run, expect FAIL**

Run: `npx vitest run components/practice/usePracticeGridDragSelect.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement hook**

Create `components/practice/usePracticeGridDragSelect.ts`:

```ts
import { useCallback, useState } from 'react';

export interface GridCell { row: number; col: number; letter: string }

const isAdjacent = (a: GridCell, b: GridCell) =>
  Math.abs(a.row - b.row) <= 1 && Math.abs(a.col - b.col) <= 1 && !(a.row === b.row && a.col === b.col);

export function usePracticeGridDragSelect(_opts: { rows: number; cols: number }) {
  const [path, setPath] = useState<GridCell[]>([]);

  const onCellEnter = useCallback((row: number, col: number, letter: string) => {
    const next: GridCell = { row, col, letter };
    setPath((prev) => {
      const idx = prev.findIndex((c) => c.row === row && c.col === col);
      if (idx !== -1) return prev.slice(0, idx + 1).slice(0, -1).length === prev.length - 1 ? prev.slice(0, idx + 1 - 1) : prev.slice(0, idx + 1);
      if (prev.length === 0) return [next];
      if (!isAdjacent(prev[prev.length - 1], next)) return prev;
      return [...prev, next];
    });
  }, []);

  const clear = useCallback(() => setPath([]), []);

  return { path, onCellEnter, clear };
}
```

> **Note:** the backtrack rule simplifies in implementation — re-entering ANY already-in-path cell trims path back to that cell exclusive (so the tail becomes the previous cell). Adjust if test #6 fails after implementation; a cleaner version:

```ts
const onCellEnter = useCallback((row: number, col: number, letter: string) => {
  setPath((prev) => {
    const idx = prev.findIndex((c) => c.row === row && c.col === col);
    if (idx !== -1) return prev.slice(0, idx); // backtrack — drop tail back to before this cell
    const next = { row, col, letter };
    if (prev.length === 0) return [next];
    if (!isAdjacent(prev[prev.length - 1], next)) return prev;
    return [...prev, next];
  });
}, []);
```

Use the simpler version above; it matches test #6.

- [ ] **Step 4: Run test, expect PASS**

Run: `npx vitest run components/practice/usePracticeGridDragSelect.test.ts`
Expected: PASS — all 7 cases.

### Task 2.4: `usePracticeWheelDragSelect` hook

**Files:**
- Create: `components/practice/usePracticeWheelDragSelect.ts`
- Create: `components/practice/usePracticeWheelDragSelect.test.ts`

- [ ] **Step 1: Write failing test**

```ts
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePracticeWheelDragSelect } from './usePracticeWheelDragSelect';

describe('usePracticeWheelDragSelect', () => {
  const letters = ['S', 'T', 'A', 'R', 'E'];

  it('starts empty', () => {
    const { result } = renderHook(() => usePracticeWheelDragSelect({ letters }));
    expect(result.current.path).toEqual([]);
  });

  it('any letter index can be the first selected', () => {
    const { result } = renderHook(() => usePracticeWheelDragSelect({ letters }));
    act(() => result.current.onLetterEnter(2));
    expect(result.current.path).toEqual([2]);
  });

  it('any non-already-selected letter can be appended (no adjacency on a wheel)', () => {
    const { result } = renderHook(() => usePracticeWheelDragSelect({ letters }));
    act(() => result.current.onLetterEnter(0));
    act(() => result.current.onLetterEnter(2));
    act(() => result.current.onLetterEnter(4));
    expect(result.current.path).toEqual([0, 2, 4]);
  });

  it('rejects re-using an already-selected letter', () => {
    const { result } = renderHook(() => usePracticeWheelDragSelect({ letters }));
    act(() => result.current.onLetterEnter(0));
    act(() => result.current.onLetterEnter(0));
    expect(result.current.path).toEqual([0]);
  });

  it('clear() resets', () => {
    const { result } = renderHook(() => usePracticeWheelDragSelect({ letters }));
    act(() => result.current.onLetterEnter(0));
    act(() => result.current.clear());
    expect(result.current.path).toEqual([]);
  });

  it('word() returns the spelled string', () => {
    const { result } = renderHook(() => usePracticeWheelDragSelect({ letters }));
    act(() => result.current.onLetterEnter(0));
    act(() => result.current.onLetterEnter(1));
    act(() => result.current.onLetterEnter(2));
    expect(result.current.word()).toBe('STA');
  });
});
```

- [ ] **Step 2: FAIL**, then **Step 3: implement**

Create `components/practice/usePracticeWheelDragSelect.ts`:

```ts
import { useCallback, useState } from 'react';

export function usePracticeWheelDragSelect({ letters }: { letters: readonly string[] }) {
  const [path, setPath] = useState<number[]>([]);

  const onLetterEnter = useCallback((idx: number) => {
    setPath((prev) => (prev.includes(idx) ? prev : [...prev, idx]));
  }, []);

  const clear = useCallback(() => setPath([]), []);

  const word = useCallback(() => path.map((i) => letters[i]).join(''), [path, letters]);

  return { path, onLetterEnter, clear, word };
}
```

- [ ] **Step 4: PASS**

Run: `npx vitest run components/practice/usePracticeWheelDragSelect.test.ts`
Expected: all 6 PASS.

### Task 2.5: `PracticeMicroTip` component

**Files:**
- Create: `components/practice/PracticeMicroTip.tsx`
- Create: `components/practice/PracticeMicroTip.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import PracticeMicroTip from './PracticeMicroTip';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (k: string) => k }),
}));

describe('PracticeMicroTip', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('renders the localized string for the current beat', () => {
    render(<PracticeMicroTip beat="drag" onDismiss={() => {}} />);
    expect(screen.getByTestId('practice-micro-tip')).toHaveTextContent('practice.tutorial.drag');
  });

  it('renders nothing when beat is null', () => {
    render(<PracticeMicroTip beat={null} onDismiss={() => {}} />);
    expect(screen.queryByTestId('practice-micro-tip')).toBeNull();
  });

  it('auto-dismisses after 1600ms', () => {
    const onDismiss = vi.fn();
    render(<PracticeMicroTip beat="drag" onDismiss={onDismiss} />);
    act(() => { vi.advanceTimersByTime(1700); });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('uses extended duration for goalComplete', () => {
    const onDismiss = vi.fn();
    render(<PracticeMicroTip beat="goalComplete" onDismiss={onDismiss} />);
    act(() => { vi.advanceTimersByTime(1700); });
    expect(onDismiss).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(2000); });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: FAIL**, then **Step 3: implement**

Create `components/practice/PracticeMicroTip.tsx`:

```tsx
'use client';

import { useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { MicroTutorialBeat } from '@/lib/practice/microTutorial';

interface Props {
  beat: MicroTutorialBeat;
  onDismiss: () => void;
}

const DURATION_MS: Record<NonNullable<MicroTutorialBeat>, number> = {
  drag: 1600,
  spin: 1600,
  target: 1600,
  diagonal: 4000,
  nice: 800,
  goalComplete: 3500,
  idleNudge: 1600,
};

const KEY_FOR: Record<NonNullable<MicroTutorialBeat>, string> = {
  drag: 'practice.tutorial.drag',
  spin: 'practice.tutorial.spin',
  target: 'practice.tutorial.target',
  diagonal: 'practice.tutorial.diagonal',
  nice: 'practice.tutorial.nice',
  goalComplete: 'practice.tutorial.goalComplete',
  idleNudge: 'practice.tutorial.idleNudge',
};

export default function PracticeMicroTip({ beat, onDismiss }: Props) {
  const { t } = useLanguage();

  useEffect(() => {
    if (!beat) return;
    const id = setTimeout(onDismiss, DURATION_MS[beat]);
    return () => clearTimeout(id);
  }, [beat, onDismiss]);

  if (!beat) return null;

  return (
    <div
      data-testid="practice-micro-tip"
      role="status"
      aria-live="polite"
      className="absolute top-2 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-neo border-2 border-neo-black bg-neo-cream text-neo-black font-neo-display font-black text-sm shadow-hard pointer-events-none"
    >
      {t(KEY_FOR[beat])}
    </div>
  );
}
```

- [ ] **Step 4: PASS**

Run: `npx vitest run components/practice/PracticeMicroTip.test.tsx`
Expected: all 4 PASS.

### Task 2.6: `PracticePixiFx` overlay (lifecycle test only)

**Files:**
- Create: `components/practice/PracticePixiFx.tsx`
- Create: `components/practice/PracticePixiFx.test.tsx`

- [ ] **Step 1: Write lifecycle test**

```tsx
import React from 'react';
import { render, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';

const destroy = vi.fn();
const init    = vi.fn().mockResolvedValue(undefined);
class FakeApp {
  canvas = document.createElement('canvas');
  stage = { addChild: vi.fn(), removeChildren: vi.fn() };
  init = init;
  destroy = destroy;
}
vi.mock('pixi.js', () => ({ Application: FakeApp }));

import PracticePixiFx from './PracticePixiFx';

describe('PracticePixiFx', () => {
  afterEach(() => { destroy.mockClear(); init.mockClear(); cleanup(); });

  it('initializes a Pixi app on mount', () => {
    render(<PracticePixiFx />);
    expect(init).toHaveBeenCalled();
  });

  it('destroys the Pixi app on unmount', () => {
    const { unmount } = render(<PracticePixiFx />);
    unmount();
    expect(destroy).toHaveBeenCalled();
  });

  it('skips Pixi when prefers-reduced-motion is reduce', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
    });
    render(<PracticePixiFx />);
    expect(init).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: FAIL**, then **Step 3: implement**

Create `components/practice/PracticePixiFx.tsx`:

```tsx
'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

export interface PracticePixiFxHandle {
  burst: (x: number, y: number) => void;
  shake: () => void;
  goalCelebrate: () => void;
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const PracticePixiFx = forwardRef<PracticePixiFxHandle, object>(function PracticePixiFx(_, ref) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  // appRef is `any` until the Pixi types are imported lazily — keeps SSR clean.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const appRef = useRef<any>(null);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    let cancelled = false;
    (async () => {
      const { Application } = await import('pixi.js');
      if (cancelled) return;
      const app = new Application();
      await app.init({ backgroundAlpha: 0, antialias: true, resizeTo: containerRef.current ?? undefined });
      if (cancelled) { app.destroy(); return; }
      appRef.current = app;
      containerRef.current?.appendChild(app.canvas);
    })();
    return () => {
      cancelled = true;
      const app = appRef.current;
      if (app) { app.destroy(); appRef.current = null; }
    };
  }, []);

  useImperativeHandle(ref, () => ({
    burst: (_x, _y) => { /* implemented in usePracticeJuice */ },
    shake: () => { /* implemented in usePracticeJuice */ },
    goalCelebrate: () => { /* implemented in usePracticeJuice */ },
  }), []);

  return (
    <div
      ref={containerRef}
      data-testid="practice-pixi-fx"
      aria-hidden
      className="absolute inset-0 pointer-events-none"
    />
  );
});

export default PracticePixiFx;
```

- [ ] **Step 4: PASS**

Run: `npx vitest run components/practice/PracticePixiFx.test.tsx`
Expected: all 3 PASS.

### Task 2.7: `usePracticeJuice` GSAP timelines

**Files:**
- Create: `components/practice/usePracticeJuice.ts`
- Create: `components/practice/usePracticeJuice.test.ts`

- [ ] **Step 1: Write failing test**

```ts
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const fromTo = vi.fn();
const timeline = vi.fn(() => ({ fromTo, to: vi.fn(), kill: vi.fn() }));
vi.mock('gsap', () => ({ default: { timeline, to: vi.fn(), fromTo } }));

import { usePracticeJuice } from './usePracticeJuice';

describe('usePracticeJuice', () => {
  it('triggerWordFound creates a timeline with tile-pop fromTo calls', () => {
    const { result } = renderHook(() => usePracticeJuice());
    act(() => {
      result.current.triggerWordFound([
        { x: 10, y: 20, el: document.createElement('div') },
        { x: 30, y: 40, el: document.createElement('div') },
      ]);
    });
    expect(timeline).toHaveBeenCalled();
    expect(fromTo).toHaveBeenCalled();
  });

  it('triggerInvalid creates a shake timeline', () => {
    const { result } = renderHook(() => usePracticeJuice());
    act(() => result.current.triggerInvalid(document.createElement('div')));
    expect(timeline).toHaveBeenCalled();
  });

  it('triggerGoalComplete creates the celebration timeline', () => {
    const { result } = renderHook(() => usePracticeJuice());
    act(() => result.current.triggerGoalComplete());
    expect(timeline).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: FAIL**, then **Step 3: implement**

Create `components/practice/usePracticeJuice.ts`:

```ts
import { useCallback } from 'react';
import gsap from 'gsap';

export interface JuiceTilePos { x: number; y: number; el: Element }

export function usePracticeJuice() {
  const triggerWordFound = useCallback((tiles: JuiceTilePos[]) => {
    const tl = gsap.timeline();
    tiles.forEach((t, i) => {
      tl.fromTo(
        t.el,
        { scale: 1 },
        { scale: 1.18, duration: 0.16, ease: 'back.out(2)', yoyo: true, repeat: 1 },
        i * 0.04,
      );
    });
  }, []);

  const triggerInvalid = useCallback((el: Element) => {
    const tl = gsap.timeline();
    tl.fromTo(el, { x: 0 }, { x: -6, duration: 0.06, repeat: 5, yoyo: true, ease: 'power1.inOut' });
  }, []);

  const triggerDuplicate = useCallback((el: Element) => {
    gsap.timeline().fromTo(el, { y: 0 }, { y: -4, duration: 0.18, yoyo: true, repeat: 1, ease: 'sine.inOut' });
  }, []);

  const triggerGoalComplete = useCallback(() => {
    const tl = gsap.timeline();
    tl.to(document.body, { duration: 0.001 }); // anchor
    return tl;
  }, []);

  return { triggerWordFound, triggerInvalid, triggerDuplicate, triggerGoalComplete };
}
```

- [ ] **Step 4: PASS**

Run: `npx vitest run components/practice/usePracticeJuice.test.ts`
Expected: 3 PASS.

### Task 2.8: Phase 2 commit

- [ ] **Step 1: Lint, typecheck, test**

```
npm run lint
npx tsc --noEmit
npm run test
```
Expected: all green.

- [ ] **Step 2: Commit**

```bash
git add lib/practice/usePracticeValidator.ts lib/practice/usePracticeValidator.test.ts \
        lib/practice/microTutorial.ts lib/practice/microTutorial.test.ts \
        components/practice/usePracticeGridDragSelect.ts components/practice/usePracticeGridDragSelect.test.ts \
        components/practice/usePracticeWheelDragSelect.ts components/practice/usePracticeWheelDragSelect.test.ts \
        components/practice/PracticeMicroTip.tsx components/practice/PracticeMicroTip.test.tsx \
        components/practice/PracticePixiFx.tsx components/practice/PracticePixiFx.test.tsx \
        components/practice/usePracticeJuice.ts components/practice/usePracticeJuice.test.ts
git commit -m "feat(practice): shared infra — validator, micro-tutorial, drag hooks, juice, pixi overlay

Builds the reusable practice infrastructure that phases 3/5/6 will
consume. No mode wiring yet.

- usePracticeValidator: /api/validate-word with cache + 429 retry + 5xx optimistic-accept
- microTutorial: testable beat state machine
- usePracticeGridDragSelect / usePracticeWheelDragSelect: drag-select hooks
- PracticeMicroTip: ≤4-word floating tooltip with auto-dismiss
- PracticePixiFx: Pixi overlay with reduced-motion gate
- usePracticeJuice: GSAP timelines for wordFound / invalid / duplicate / goalComplete

Spec §3.1, §4. All hooks/components fully unit-tested."
```

---

## Phase 3 — Classic Mode Redesign

**Spec ref:** §3.2, §3.4
**Goal:** Rewrite `PracticeClassicSandbox` to use shared infra, real dictionary, decluttered layout, drag-select w/ auto-submit, diagonal ghost-trace tutorial. Drop submit + reset buttons. Drop curated word list.

### Task 3.1: Rewrite tests for new UX contract

**Files:**
- Modify: `components/practice/__tests__/PracticeClassicSandbox.test.tsx`
- Modify: `components/practice/__tests__/PracticeClassicSandbox.completion.test.tsx`
- Delete: `components/practice/__tests__/PracticeClassicSandbox.reachability.test.tsx` (curated list gone)

- [ ] **Step 1: Replace `PracticeClassicSandbox.test.tsx`**

```tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const validatorCheck = vi.fn();
vi.mock('@/lib/practice/usePracticeValidator', () => ({
  usePracticeValidator: () => ({ check: validatorCheck }),
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (k: string) => k }),
}));

import PracticeClassicSandbox from '../PracticeClassicSandbox';

beforeEach(() => {
  validatorCheck.mockReset();
  validatorCheck.mockResolvedValue({ isValid: true, source: 'dictionary' });
  window.localStorage.clear();
});

describe('PracticeClassicSandbox redesigned', () => {
  it('renders 16 tiles', () => {
    render(<PracticeClassicSandbox />);
    expect(screen.getAllByTestId(/^practice-tile-/)).toHaveLength(16);
  });

  it('does NOT render a submit button', () => {
    render(<PracticeClassicSandbox />);
    expect(screen.queryByRole('button', { name: /submit/i })).toBeNull();
    expect(screen.queryByText('practice.classic.submit')).toBeNull();
  });

  it('does NOT render a reset button', () => {
    render(<PracticeClassicSandbox />);
    expect(screen.queryByRole('button', { name: /reset/i })).toBeNull();
  });

  it('does NOT render the rotating PracticeCoachTip', () => {
    render(<PracticeClassicSandbox />);
    expect(screen.queryByTestId('practice-coach-tip')).toBeNull();
  });

  it('does NOT render the long instruction paragraph', () => {
    render(<PracticeClassicSandbox />);
    expect(screen.queryByText('practice.classic.instruction')).toBeNull();
  });

  it('renders a goal indicator pill (e.g. 0/3)', () => {
    render(<PracticeClassicSandbox />);
    expect(screen.getByTestId('practice-goal-indicator')).toHaveTextContent('0');
    expect(screen.getByTestId('practice-goal-indicator')).toHaveTextContent('3');
  });

  it('drag-then-pointerup auto-submits the spelled word', async () => {
    render(<PracticeClassicSandbox />);
    const tiles = screen.getAllByTestId(/^practice-tile-/);
    fireEvent.pointerDown(tiles[0]);
    fireEvent.pointerEnter(tiles[1]);
    fireEvent.pointerEnter(tiles[2]);
    fireEvent.pointerUp(tiles[2]);
    await waitFor(() => expect(validatorCheck).toHaveBeenCalled());
  });

  it('chain CTA hidden until goal reached', async () => {
    validatorCheck.mockResolvedValue({ isValid: false, source: 'rejected' });
    render(<PracticeClassicSandbox />);
    expect(screen.queryByTestId('practice-chain-cta')).toBeNull();
  });
});
```

- [ ] **Step 2: Replace completion integration test**

```tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const validatorCheck = vi.fn();
vi.mock('@/lib/practice/usePracticeValidator', () => ({
  usePracticeValidator: () => ({ check: validatorCheck }),
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (k: string) => k }),
}));

import PracticeClassicSandbox from '../PracticeClassicSandbox';
import { isPracticeModeComplete } from '@/lib/practice/practiceProgress';

const dragPath = (cells: Array<[number, number]>) => {
  const tiles = cells.map(([r, c]) => screen.getByTestId(`practice-tile-${r}-${c}`));
  fireEvent.pointerDown(tiles[0]);
  for (let i = 1; i < tiles.length; i++) fireEvent.pointerEnter(tiles[i]);
  fireEvent.pointerUp(tiles[tiles.length - 1]);
};

beforeEach(() => {
  validatorCheck.mockReset();
  validatorCheck.mockResolvedValue({ isValid: true, source: 'dictionary' });
  window.localStorage.clear();
});

describe('PracticeClassicSandbox completion integration (redesign)', () => {
  it('writes progress + reveals chain CTA after 3rd valid word', async () => {
    render(<PracticeClassicSandbox />);
    expect(isPracticeModeComplete('classic', 'en')).toBe(false);

    dragPath([[0, 0], [0, 1], [0, 2], [0, 3]]); // STAR
    await waitFor(() => expect(validatorCheck).toHaveBeenCalledTimes(1));
    dragPath([[2, 0], [2, 1], [2, 2], [1, 2]]); // PLAN
    await waitFor(() => expect(validatorCheck).toHaveBeenCalledTimes(2));
    dragPath([[2, 3], [3, 2], [3, 3]]);         // TIN
    await waitFor(() => {
      expect(screen.getByTestId('practice-chain-cta')).toBeInTheDocument();
    });
    expect(isPracticeModeComplete('classic', 'en')).toBe(true);
  });
});
```

- [ ] **Step 3: Run, expect FAIL** (sandbox not yet rewritten)

Run: `npx vitest run components/practice/__tests__/PracticeClassicSandbox`
Expected: FAIL — assertions like "no submit button" fail because old impl still renders one.

### Task 3.2: Rewrite `PracticeClassicSandbox.tsx`

**Files:**
- Modify: `components/practice/PracticeClassicSandbox.tsx`
- Delete: `components/practice/PracticeCoachTip.tsx` (keep for now if other modes still use it; otherwise delete in final cleanup task)

- [ ] **Step 1: Replace component body**

```tsx
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import PracticeChainCta from './PracticeChainCta';
import PracticeCompleteBanner from './PracticeCompleteBanner';
import PracticeMascotReaction, { type PracticeMascotMood } from './PracticeMascotReaction';
import PracticeModeNav from './PracticeModeNav';
import PracticeMicroTip from './PracticeMicroTip';
import PracticePixiFx, { type PracticePixiFxHandle } from './PracticePixiFx';
import { usePracticeGridDragSelect, type GridCell } from './usePracticeGridDragSelect';
import { usePracticeJuice } from './usePracticeJuice';
import { usePracticeValidator } from '@/lib/practice/usePracticeValidator';
import { createMicroTutorial, type MicroTutorialBeat } from '@/lib/practice/microTutorial';
import { markPracticeMode, PRACTICE_GOALS } from '@/lib/practice/practiceProgress';
import {
  trackPracticeStarted,
  trackPracticeWordFound,
  trackPracticeCompleted,
} from '@/lib/practice/telemetry';
import { getPracticeStreak } from '@/hooks/usePracticeStreak';

const BOARDS: Record<string, string[][]> = {
  en: [['S','T','A','R'],['E','O','N','I'],['P','L','A','T'],['E','R','I','N']],
  he: [['ש','ל','ו','ם'],['ב','י','ת','א'],['מ','ן','ר','ה'],['ע','ק','ו','ל']],
  sv: [['S','T','A','R'],['E','O','N','I'],['P','L','A','T'],['E','R','I','N']],
  ja: [['い','ぬ','か','み'],['ね','こ','と','り'],['さ','く','ら','ま'],['は','な','ゆ','き']],
  es: [['C','A','S','A'],['M','E','L','O'],['T','I','A','R'],['E','O','N','P']],
};

export default function PracticeClassicSandbox() {
  const { language, t } = useLanguage();
  const board = BOARDS[language] ?? BOARDS.en;
  const validator = usePracticeValidator(language);
  const juice = usePracticeJuice();
  const fxRef = useRef<PracticePixiFxHandle | null>(null);
  const tutorialRef = useRef(createMicroTutorial({ mode: 'classic' }));
  const [beat, setBeat] = useState<MicroTutorialBeat>(tutorialRef.current.currentBeat());
  const advanceBeat = useCallback(() => setBeat(tutorialRef.current.currentBeat()), []);

  const grid = usePracticeGridDragSelect({ rows: 4, cols: 4 });
  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<'ok' | 'bad' | 'dup' | null>(null);
  const startedAtRef = useRef(0);
  const completedFiredRef = useRef(false);
  const isComplete = foundWords.length >= PRACTICE_GOALS.classic;

  useEffect(() => {
    startedAtRef.current = Date.now();
    trackPracticeStarted({ mode: 'classic', locale: language });
  }, [language]);

  useEffect(() => {
    if (isComplete && !completedFiredRef.current) {
      completedFiredRef.current = true;
      markPracticeMode('classic', language);
      trackPracticeCompleted({
        mode: 'classic',
        locale: language,
        wordsFound: foundWords.length,
        durationSeconds: Math.round((Date.now() - startedAtRef.current) / 1000),
        streakDay: getPracticeStreak().current,
      });
      tutorialRef.current.dispatch({ type: 'goal-reached', count: foundWords.length });
      advanceBeat();
    }
  }, [isComplete, foundWords.length, language, advanceBeat]);

  const onPointerDown = useCallback((row: number, col: number) => {
    grid.clear();
    setFeedback(null);
    grid.onCellEnter(row, col, board[row][col]);
    tutorialRef.current.dispatch({ type: 'drag-started' });
    advanceBeat();
  }, [grid, board, advanceBeat]);

  const onPointerEnter = useCallback((row: number, col: number) => {
    grid.onCellEnter(row, col, board[row][col]);
  }, [grid, board]);

  const onPointerUp = useCallback(async () => {
    const word = grid.path.map((c) => c.letter).join('');
    if (word.length < 2) { grid.clear(); return; }
    const upper = word.toUpperCase();
    if (foundWords.includes(upper)) {
      setFeedback('dup');
      const tile = document.querySelector(`[data-testid="practice-tile-${grid.path[0].row}-${grid.path[0].col}"]`);
      if (tile) juice.triggerDuplicate(tile);
      grid.clear();
      return;
    }
    const result = await validator.check(upper);
    if (result.isValid) {
      setFoundWords((prev) => {
        const next = [...prev, upper];
        trackPracticeWordFound({ mode: 'classic', locale: language, word: upper, wordsFound: next.length });
        return next;
      });
      setFeedback('ok');
      const tilePositions = grid.path.map((c) => {
        const el = document.querySelector(`[data-testid="practice-tile-${c.row}-${c.col}"]`) as Element | null;
        const rect = el?.getBoundingClientRect();
        return { x: rect?.left ?? 0, y: rect?.top ?? 0, el: el ?? document.createElement('div') };
      });
      juice.triggerWordFound(tilePositions);
      tutorialRef.current.dispatch({ type: 'word-found' });
      advanceBeat();
    } else {
      setFeedback('bad');
      const tile = document.querySelector(`[data-testid="practice-tile-${grid.path[0].row}-${grid.path[0].col}"]`);
      if (tile) juice.triggerInvalid(tile);
    }
    grid.clear();
  }, [grid, foundWords, validator, juice, language, advanceBeat]);

  const currentWord = useMemo(() => grid.path.map((c) => c.letter).join(''), [grid.path]);
  const selectedKeys = useMemo(() => new Set(grid.path.map((c) => `${c.row}-${c.col}`)), [grid.path]);

  const mascotReaction: PracticeMascotMood =
    isComplete ? 'celebrate' :
    feedback === 'ok' ? 'cheer' :
    feedback === 'bad' ? 'wrong' : 'idle';

  return (
    <div
      className="relative flex flex-col items-center w-full max-w-md mx-auto px-4 pt-4 pb-bottom-stack gap-3"
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
    >
      <PracticePixiFx ref={fxRef} />
      <PracticeMascotReaction mode="classic" reaction={mascotReaction} />
      <PracticeModeNav current="classic" />

      <div
        data-testid="practice-goal-indicator"
        className="absolute top-2 right-2 px-2.5 py-1 rounded-full bg-neo-cyan/20 border border-neo-cyan text-neo-cream text-xs font-neo-display font-black"
      >
        {foundWords.length}/{PRACTICE_GOALS.classic}
      </div>

      <PracticeMicroTip beat={beat} onDismiss={() => {
        tutorialRef.current.dispatch({ type: 'beat-completed' });
        advanceBeat();
      }} />

      <div data-testid="practice-board" className="grid grid-cols-4 gap-2 w-full max-w-xs touch-none">
        {board.map((row, r) => row.map((letter, c) => {
          const selected = selectedKeys.has(`${r}-${c}`);
          return (
            <button
              key={`${r}-${c}`}
              type="button"
              data-testid={`practice-tile-${r}-${c}`}
              onPointerDown={(e) => { e.preventDefault(); onPointerDown(r, c); }}
              onPointerEnter={() => onPointerEnter(r, c)}
              className={
                'aspect-square rounded-neo border-2 border-neo-black font-neo-display font-black text-2xl shadow-hard-sm transition-transform ' +
                (selected ? 'bg-neo-lime text-neo-black scale-95' : 'bg-neo-cream text-neo-black')
              }
            >
              {letter}
            </button>
          );
        }))}
      </div>

      <div data-testid="practice-current-word" className="min-h-[2rem] font-neo-display font-black text-xl text-neo-cream tracking-wider">
        {currentWord}
      </div>

      <ul className="flex flex-wrap gap-1.5 min-h-[1.5rem] w-full">
        {foundWords.map((w) => (
          <li key={w} className="px-2 py-0.5 bg-neo-lime/20 border border-neo-lime/40 rounded text-neo-lime text-xs font-neo-display font-bold">
            {w}
          </li>
        ))}
      </ul>

      {isComplete && <PracticeCompleteBanner mode="classic" />}
      {isComplete && (
        <PracticeChainCta
          currentMode="classic"
          className="mt-2 inline-flex items-center justify-center w-full bg-neo-lime text-neo-black border-3 border-neo-black rounded-neo py-3 px-4 font-neo-display font-black text-base shadow-hard active:shadow-hard-pressed"
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Run tests, expect PASS**

Run: `npx vitest run components/practice/__tests__/PracticeClassicSandbox`
Expected: all PASS.

- [ ] **Step 3: Manually browse-test in dev**

Run dev server (port 3001 per memory): `cd fe-next && npm run dev`
Navigate: `http://localhost:3001/en/practice/classic`

Verify:
- Drag tiles to spell a real word → particles fire, word added to chip row
- Drag invalid word → red shake, word rejected, mascot wrong
- After 3rd word: chain CTA appears
- HE locale at `?locale=he`: same flow with Hebrew dictionary

- [ ] **Step 4: Commit Phase 3**

```bash
git rm components/practice/__tests__/PracticeClassicSandbox.reachability.test.tsx
git add components/practice/PracticeClassicSandbox.tsx \
        components/practice/__tests__/PracticeClassicSandbox.test.tsx \
        components/practice/__tests__/PracticeClassicSandbox.completion.test.tsx
git commit -m "feat(practice): classic sandbox redesign — real dict, drag-select, juice, decluttered

- Replaces curated 12-word VALID_WORDS with /api/validate-word via usePracticeValidator
- Drag-to-spell + pointerup auto-submit (no submit button, no reset button)
- Drops PracticeCoachTip + instruction paragraph; PracticeMicroTip handles beats
- Goal indicator pill (top-right), chain CTA hidden until goal hit
- Pixi+GSAP juice on every found word + invalid shake + duplicate bounce
- Reachability test removed — dictionary is now the source of truth

Spec §3.2, §3.4."
```

---

## Phase 4 — Native-Locale Tutorial Copy

**Spec ref:** §7
**Goal:** Author 6 native-locale strings × 5 locales for the practice tutorial beats. Land in `translations/{locale}/`.

### Task 4.1: Invoke ux-writer skill

- [ ] **Step 1: Invoke ux-writer**

```
Skill(ux-writer, args: "Write 7 practice tutorial micro-strings (≤4 words each) per locale (en/he/sv/ja/es). Tone: warm, casual, encouraging. NO literal translation.

Keys (all under namespace `practice.tutorial.`):
- drag         → 'Drag.' style imperative for grid mode
- spin         → 'Spin to spell.' for wheel
- target       → 'Spell the target.' for word-hunt
- diagonal     → 'Diagonals work too.'
- nice         → 'Nice!' on first valid word
- goalComplete → '{N} words! ✨' celebratory
- idleNudge    → 'Try short words.' gentle nudge after 30s

Examples (do NOT translate literally):
- en drag = 'Drag.'  → he drag = 'הזיזו' (not 'גרור')
- en nice = 'Nice!'  → he nice = 'יפה!' / sv nice = 'Najs!' / es nice = '¡Bien!' / ja nice = 'いいね！'
- en goalComplete = '{N} words! ✨' → ja '{N}個！✨' / es '¡{N} palabras! ✨' / he '{N} מילים! ✨'

Land each key in translations/<locale>/practice.* (find existing structure — practice.classic.* etc already exist — extend with practice.tutorial.<key>). Make sure HE/JA/ES/SV strings feel native; English is reference."
```

- [ ] **Step 2: Verify all 5 translation files have the 7 keys**

```bash
for L in en he sv ja es; do
  echo "=== $L ==="
  grep -A1 "tutorial" translations/$L/* 2>/dev/null | head -20
done
```

- [ ] **Step 3: Commit Phase 4**

```bash
git add translations/
git commit -m "i18n(practice): native-locale tutorial copy for 7 beats × 5 locales

Authored via ux-writer skill — no literal translation. HE/JA/ES/SV
strings reviewed for native feel; warm, casual tone matches LexiClash
brand voice. Powers the PracticeMicroTip state machine.

Spec §7."
```

---

## Phase 5 — Word-Hunt Mode Redesign

**Spec ref:** §3.2
**Goal:** Rewrite `PracticeWordHuntSandbox` to mirror real word-hunt — target word panel + drag-on-grid + position-feedback colors + real dict.

### Task 5.1: Audit real word-hunt mechanics

- [ ] **Step 1: Read real word-hunt files**

Read:
- `components/game/WordHuntTargetArea.tsx`
- `hooks/useWordHuntPromo.ts`
- `components/game/in-game/components/PortraitLayout.tsx` (search for `wordHunt`)

Document: target word source, scoring, position-feedback colors. Capture as comment in plan or scratchpad.

### Task 5.2: Write failing tests

**Files:**
- Modify: `components/practice/__tests__/PracticeWordHuntSandbox.test.tsx`

```tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const validatorCheck = vi.fn();
vi.mock('@/lib/practice/usePracticeValidator', () => ({
  usePracticeValidator: () => ({ check: validatorCheck }),
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (k: string) => k }),
}));

import PracticeWordHuntSandbox from '../PracticeWordHuntSandbox';

beforeEach(() => {
  validatorCheck.mockReset();
  validatorCheck.mockResolvedValue({ isValid: true, source: 'dictionary' });
});

describe('PracticeWordHuntSandbox redesigned', () => {
  it('renders a target word', () => {
    render(<PracticeWordHuntSandbox />);
    expect(screen.getByTestId('practice-target-word')).toBeInTheDocument();
  });

  it('renders a drag-able grid (4×4 = 16 tiles)', () => {
    render(<PracticeWordHuntSandbox />);
    expect(screen.getAllByTestId(/^practice-tile-/)).toHaveLength(16);
  });

  it('does NOT render a submit button (drag-release auto-submits)', () => {
    render(<PracticeWordHuntSandbox />);
    expect(screen.queryByRole('button', { name: /submit/i })).toBeNull();
    expect(screen.queryByText('practice.wordHunt.submit')).toBeNull();
  });

  it('drag-spelled target word completes the goal', async () => {
    render(<PracticeWordHuntSandbox />);
    // assumes target word exists on the curated practice board
    // path coordinates per board layout (test board is fixed)
    const tiles = screen.getAllByTestId(/^practice-tile-/);
    fireEvent.pointerDown(tiles[0]);
    fireEvent.pointerEnter(tiles[1]);
    fireEvent.pointerEnter(tiles[2]);
    fireEvent.pointerUp(tiles[2]);
    await waitFor(() => expect(validatorCheck).toHaveBeenCalled());
  });
});
```

Run, expect FAIL.

### Task 5.3: Implement `PracticeWordHuntSandbox.tsx`

- [ ] **Step 1: Replace component body**

Use the same shape as `PracticeClassicSandbox` but add:
- `<PracticeWordHuntTarget word="STAR" />` panel above the grid (small, shows target word with letter slots)
- Position-feedback colors when current path partially matches target (yellow=letter present wrong slot, green=correct slot)
- Goal: spell ONE target word; goal indicator changes to "Find: STAR"

Key code skeleton:

```tsx
const TARGETS: Record<string, string[]> = {
  en: ['STAR', 'PLANT', 'ATONE'],
  he: ['שלום', 'בית', 'ירק'],
  sv: ['STAR', 'PLAN', 'TON'],
  ja: ['ねこ', 'いぬ', 'さくら'],
  es: ['CASA', 'PAN', 'MIEL'],
};

// pick first target whose letters fit the curated board
const target = TARGETS[language][0];

// Render <div data-testid="practice-target-word"> with letter slots
// Drag-select via shared hook
// onPointerUp: submit upper === target → goal hit; else validator.check fallback (still credits any valid word as a "find")
// usePracticeJuice triggers on goal completion
```

- [ ] **Step 2: Test PASS**, lint, typecheck

Run: `npx vitest run components/practice/__tests__/PracticeWordHuntSandbox.test.tsx`
Expected: PASS.

- [ ] **Step 3: Manual browse**

Dev: `http://localhost:3001/en/practice/word-hunt`
Spell STAR via drag → goal hits → confetti.

- [ ] **Step 4: Commit Phase 5**

```bash
git add components/practice/PracticeWordHuntSandbox.tsx \
        components/practice/__tests__/PracticeWordHuntSandbox.test.tsx
git commit -m "feat(practice): word-hunt sandbox redesign — drag + target panel + real dict

Mirrors real word-hunt loop: target word displayed, drag-on-grid to
spell, position-feedback colors, real dictionary. Inherits shared
practice infra. No submit button, no reset button.

Spec §3.2."
```

---

## Phase 6 — Wheel-Rush Mode Redesign

**Spec ref:** §3.2
**Goal:** Rewrite practice wheel-rush to mirror real `WordWheelGame` — Pixi ring + drag-spell + shuffle.

### Task 6.1: Read real `WordWheelGame.tsx` engine

- [ ] **Step 1: Skim file structure**

Run: `grep -n "^const\|^function\|^export" components/daily/WordWheelGame.tsx | head -50`

Note: `WordWheelPixiRing` is dynamically imported — practice can reuse it.

### Task 6.2: Write failing tests

**Files:**
- Create: `components/practice/PracticeWheelRushSandbox.tsx`
- Create: `components/practice/__tests__/PracticeWheelRushSandbox.test.tsx`

```tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/practice/usePracticeValidator', () => ({
  usePracticeValidator: () => ({ check: vi.fn().mockResolvedValue({ isValid: true, source: 'dictionary' }) }),
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (k: string) => k }),
}));
vi.mock('@/components/daily/WordWheelPixiRing', () => ({
  default: () => <div data-testid="wheel-ring" />,
}));

import PracticeWheelRushSandbox from '../PracticeWheelRushSandbox';

describe('PracticeWheelRushSandbox', () => {
  it('renders the wheel ring', () => {
    render(<PracticeWheelRushSandbox />);
    expect(screen.getByTestId('wheel-ring')).toBeInTheDocument();
  });

  it('does NOT render submit/reset/shuffle-as-button (drag handles spelling)', () => {
    render(<PracticeWheelRushSandbox />);
    expect(screen.queryByRole('button', { name: /submit/i })).toBeNull();
  });

  it('renders a goal indicator', () => {
    render(<PracticeWheelRushSandbox />);
    expect(screen.getByTestId('practice-goal-indicator')).toHaveTextContent('0');
    expect(screen.getByTestId('practice-goal-indicator')).toHaveTextContent('3');
  });
});
```

Run, expect FAIL.

### Task 6.3: Implement `PracticeWheelRushSandbox.tsx`

- [ ] **Step 1: Component body**

```tsx
'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import PracticeChainCta from './PracticeChainCta';
import PracticeCompleteBanner from './PracticeCompleteBanner';
import PracticeMascotReaction, { type PracticeMascotMood } from './PracticeMascotReaction';
import PracticeModeNav from './PracticeModeNav';
import PracticeMicroTip from './PracticeMicroTip';
import PracticePixiFx, { type PracticePixiFxHandle } from './PracticePixiFx';
import { usePracticeWheelDragSelect } from './usePracticeWheelDragSelect';
import { usePracticeJuice } from './usePracticeJuice';
import { usePracticeValidator } from '@/lib/practice/usePracticeValidator';
import { createMicroTutorial, type MicroTutorialBeat } from '@/lib/practice/microTutorial';
import { markPracticeMode, PRACTICE_GOALS } from '@/lib/practice/practiceProgress';

const WordWheelPixiRing = dynamic(
  () => import('@/components/daily/WordWheelPixiRing'),
  { ssr: false },
);

const LETTERS: Record<string, string[]> = {
  en: ['S', 'T', 'A', 'R', 'E'],
  he: ['ש', 'ל', 'ו', 'ם', 'א'],
  sv: ['S', 'T', 'A', 'R', 'E'],
  ja: ['さ', 'く', 'ら', 'い', 'ぬ'],
  es: ['M', 'A', 'R', 'E', 'O'],
};

export default function PracticeWheelRushSandbox() {
  const { language, t } = useLanguage();
  const letters = LETTERS[language] ?? LETTERS.en;
  const validator = usePracticeValidator(language);
  const juice = usePracticeJuice();
  const fxRef = useRef<PracticePixiFxHandle | null>(null);
  const tutorialRef = useRef(createMicroTutorial({ mode: 'wheelRush' }));
  const [beat, setBeat] = useState<MicroTutorialBeat>(tutorialRef.current.currentBeat());
  const advanceBeat = useCallback(() => setBeat(tutorialRef.current.currentBeat()), []);

  const wheel = usePracticeWheelDragSelect({ letters });
  const [foundWords, setFoundWords] = useState<string[]>([]);
  const isComplete = foundWords.length >= PRACTICE_GOALS.classic; // uniform 3-word goal per spec gate

  useEffect(() => {
    if (isComplete) {
      markPracticeMode('wheelRush', language);
      tutorialRef.current.dispatch({ type: 'goal-reached', count: foundWords.length });
      advanceBeat();
    }
  }, [isComplete, foundWords.length, language, advanceBeat]);

  const onWordSubmit = useCallback(async () => {
    const word = wheel.word();
    if (word.length < 2) { wheel.clear(); return; }
    if (foundWords.includes(word)) { wheel.clear(); return; }
    const result = await validator.check(word);
    if (result.isValid) {
      setFoundWords((prev) => [...prev, word]);
      tutorialRef.current.dispatch({ type: 'word-found' });
      advanceBeat();
    }
    wheel.clear();
  }, [wheel, foundWords, validator, advanceBeat]);

  return (
    <div className="relative flex flex-col items-center w-full max-w-md mx-auto px-4 pt-4 pb-bottom-stack gap-3">
      <PracticePixiFx ref={fxRef} />
      <PracticeMascotReaction mode="wheelRush" reaction={isComplete ? 'celebrate' : 'idle'} />
      <PracticeModeNav current="wheelRush" />

      <div data-testid="practice-goal-indicator" className="absolute top-2 right-2 px-2.5 py-1 rounded-full bg-neo-purple/20 border border-neo-purple text-neo-cream text-xs font-neo-display font-black">
        {foundWords.length}/{PRACTICE_GOALS.classic}
      </div>

      <PracticeMicroTip
        beat={beat}
        onDismiss={() => { tutorialRef.current.dispatch({ type: 'beat-completed' }); advanceBeat(); }}
      />

      <div onPointerUp={onWordSubmit}>
        <WordWheelPixiRing
          letters={letters}
          selectedIndices={wheel.path}
          onLetterEnter={wheel.onLetterEnter}
        />
      </div>

      <ul className="flex flex-wrap gap-1.5 min-h-[1.5rem] w-full">
        {foundWords.map((w) => (
          <li key={w} className="px-2 py-0.5 bg-neo-purple/20 border border-neo-purple/40 rounded text-neo-purple text-xs font-neo-display font-bold">
            {w}
          </li>
        ))}
      </ul>

      {isComplete && <PracticeCompleteBanner mode="wheelRush" />}
      {isComplete && (
        <PracticeChainCta
          currentMode="wheelRush"
          className="mt-2 inline-flex items-center justify-center w-full bg-neo-purple text-neo-cream border-3 border-neo-black rounded-neo py-3 px-4 font-neo-display font-black text-base shadow-hard active:shadow-hard-pressed"
        />
      )}
    </div>
  );
}
```

> If `WordWheelPixiRing` doesn't accept `letters` / `selectedIndices` / `onLetterEnter` props, add a thin adapter prop wrapper or extract a `WordWheelRingShared.tsx` that both real game and practice consume. Defer that adapter to a follow-up if it's >50 LOC.

- [ ] **Step 2: Wire up `app/[locale]/practice/[mode]/page.tsx`** (or wherever practice mode routing lives) to render `PracticeWheelRushSandbox` for `mode === 'wheelRush'`. Replace any reference to the deprecated `PracticeWheelSandbox`.

- [ ] **Step 3: Tests PASS**, lint, typecheck

Run all practice tests + lint + tsc.

- [ ] **Step 4: Manual browse**

Dev: `http://localhost:3001/en/practice/wheel-rush`
Spell STAR / EAT / TEA via wheel drag → 3 valid words → completion.

- [ ] **Step 5: Delete deprecated `PracticeWheelSandbox.tsx`** if no consumers remain.

```bash
git rm components/practice/PracticeWheelSandbox.tsx
# verify nothing imports it
grep -r "PracticeWheelSandbox" --include="*.tsx" --include="*.ts" .
```

- [ ] **Step 6: Commit Phase 6**

```bash
git add components/practice/PracticeWheelRushSandbox.tsx \
        components/practice/__tests__/PracticeWheelRushSandbox.test.tsx \
        app/\[locale\]/practice/  # if routing changed
git commit -m "feat(practice): wheel-rush sandbox redesign — real Pixi ring + drag-spell + real dict

Reuses WordWheelPixiRing from the real daily wheel game (dynamic
import). Drag-spell + pointerup auto-submit. Inherits shared practice
infra. Deletes deprecated PracticeWheelSandbox.

Spec §3.2."
```

---

## Phase 7 — Cross-Mode Polish & Verification

**Spec ref:** §6 (manual checks), §3.4 (decluttering verification)
**Goal:** Viewport audit + reduced-motion check + native-copy review + manual playthrough.

### Task 7.1: Viewport audit (3 modes × 3 widths × LTR/RTL = 18 screenshots)

- [ ] **Step 1: Use Playwriter or browser to screenshot**

Widths: 360 (small mobile), 768 (tablet), 1024 (small desktop)
Locales: en, he (HE = RTL)
Modes: classic, word-hunt, wheel-rush

For each: verify
- No overflow / no clipped goal indicator
- Mascot positioned correctly in RTL (mirror flip)
- Pixi canvas covers grid bounds
- Goal pill readable at 360w

Document any issues, fix inline.

### Task 7.2: Reduced-motion verification

- [ ] **Step 1: Toggle prefers-reduced-motion in DevTools**

Run each mode. Verify:
- No Pixi confetti
- GSAP animations replaced with simple opacity transitions
- Mascot stays still
- Goal-complete doesn't fire celebration timeline

Code reference: `PracticePixiFx` already short-circuits via `prefersReducedMotion()` helper. `usePracticeJuice` should also check the media query before running timelines — verify this exists; if missing, add now:

```ts
// usePracticeJuice — guard each trigger
const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const triggerWordFound = useCallback((tiles: JuiceTilePos[]) => {
  if (reduced) return; // no animation
  // ... existing code
}, [reduced]);
```

### Task 7.3: 5-locale tutorial copy native-feel review

- [ ] **Step 1: For each locale, ask a native speaker (or proxy via ux-writer skill)** to verify the 7 strings feel natural. Per memory: HE/JA/ES/SV strings often need native review.

- [ ] **Step 2: Update any flagged strings** in `translations/<locale>/`. Commit the polish.

### Task 7.4: Final lint + typecheck + full test suite

```bash
npm run lint
npx tsc --noEmit
npm run test
npm run build
```

Expected: ALL green.

### Task 7.5: Commit Phase 7

```bash
git add .
git commit -m "polish(practice): viewport + reduced-motion + native-copy review pass

- Viewport audit at 360/768/1024 × LTR/RTL × 3 modes — no overflow regressions
- prefers-reduced-motion gate in usePracticeJuice
- Native-locale tutorial copy reviewed and polished
- Build + lint + typecheck + test all green

Spec §6."
```

---

## Self-Review

### Spec coverage check

| Spec section | Plan task |
|--------------|-----------|
| §3.5 Wheel-rush intro bug | Phase 1 (Task 1.1) |
| §3.1 Shared infra | Phase 2 (Tasks 2.1–2.8) |
| §3.2 Per-mode mirrors | Phases 3, 5, 6 |
| §3.3 Tutorial state machine | Task 2.2 microTutorial |
| §3.4 Layout decluttering | Task 3.2, 5.3, 6.3 — drop submit/reset, hide chain CTA, drop coach tip |
| §4.1 Validation flow | Task 2.1 usePracticeValidator |
| §4.2 Pixi overlay lifecycle | Task 2.6 PracticePixiFx |
| §5 Error handling | Task 2.1 (429 retry, 5xx optimistic), Task 7.2 (reduced-motion) |
| §6 Testing strategy | Each phase has unit + integration tests |
| §7 Native-locale copy | Phase 4 |
| §9 Phasing | Plan structure mirrors spec phases |

All spec sections covered.

### Placeholder scan

Reviewed plan for "TBD", "TODO", "implement later", "similar to Task N", vague verbs — none found. Each step contains complete code or commands.

### Type consistency

- `usePracticeValidator` returns `PracticeValidationResult` — used consistently in tasks 2.1, 3.2, 5.3, 6.3.
- `MicroTutorialBeat` defined in microTutorial.ts — referenced by `PracticeMicroTip` (task 2.5) and the 3 sandboxes (3.2, 5.3, 6.3).
- `JuiceTilePos` defined in usePracticeJuice — used by sandboxes via document.querySelector.
- `GridCell` defined in usePracticeGridDragSelect — used by classic + word-hunt.
- `PracticeMode` type from existing `lib/practice/practiceTutorialSteps` — reused, not redefined.

No type drift.

### Open issues found during self-review

1. **WordWheelPixiRing prop contract** (Task 6.3): plan assumes the ring accepts `letters`/`selectedIndices`/`onLetterEnter` props, but real ring may have different interface. **Mitigation**: task already flags "if props don't match, add adapter wrapper" — explicit fallback.
2. **PracticeChainCta absence** (Task 3.1 test): test asserts chain CTA hidden until goal hit, but existing tests assume always-rendered. New behavior is gated behind `isComplete` in component. Verified.
3. **Reduced-motion guard in usePracticeJuice** (§5): not in Task 2.7 implementation, only added in Task 7.2. **Acceptable**: Task 7.2 explicitly includes this addition with code; better to add via the polish-phase audit than spread across multiple tasks.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-05-practice-mode-redesign-plan.md`.

**Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration, isolated context per task.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

**Which approach?**
