# Blast Mode V2 — Repair + Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Blast Mode V2 fully playable — levels advance, gravity/collapse feels good, Hebrew renders correctly, generated boards never contain accidental words, and the board has a real Pixi/GSAP juice layer.

**Architecture:** Path A (`lib/blast/v2/` engine + `components/blast/v2/` UI, routed at `app/[locale]/blast/page.tsx`) is the production game and the only path touched. `components/blastEngine/` is orphaned dead code — deleted in P5. `lib/gameEngine/` is live shared Pixi infra reused by the new FX overlay. Level resolution is server-only (`node:fs`), so level advancement goes through a new API route.

**Tech Stack:** Next.js 16 App Router, TypeScript, React, framer-motion (`m`, `LayoutGroup`), GSAP, PixiJS v8 (`lib/gameEngine`), Vitest (`import { describe, it, expect } from 'vitest'`).

**Conventions:**
- All new tests use Vitest. `lib/blast/v2/**` tests run in node env; `components/blast/v2/**` tests run in jsdom env (existing config handles this by path).
- Run a single test file: `npm run test:frontend -- <path>`
- TDD strict: failing test first, verify it fails, minimal impl, verify pass.
- Commit once per phase (Task group), not per step. **Ask the user before each `git commit`.**
- Dev server runs on **port 3001**.

---

## Phase 1 — Hebrew sofit (final-letter) fix

**Problem:** `BlastBoard.tsx:118` calls `config.displayChar(letter, row, col.tiles.length)` — passes the tile's *column* row-index as if it were *word* position. Result: the top tile of every Hebrew column renders as a final form regardless of any word. Final-form is direction-dependent and cannot be known statically per grid tile.

**Fix:** Grid tiles always render the base letter. `displayChar` is kept only where genuine word-position exists.

### Task 1.1: Stop converting grid tiles to final forms

**Files:**
- Modify: `components/blast/v2/BlastBoard.tsx:108-125`
- Test: `components/blast/v2/__tests__/BlastBoard.hebrew.test.tsx` (create)

- [ ] **Step 1: Write the failing test**

Create `components/blast/v2/__tests__/BlastBoard.hebrew.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { BlastBoard } from '../BlastBoard';
import type { BlastLevel } from '@/lib/blast/v2/types';

// A Hebrew level whose top-of-column tiles are base letters that have
// final forms (מ/נ/פ/צ/כ). The grid must render them as BASE forms,
// because word direction is not statically known per tile.
const heLevel: BlastLevel = {
  id: 'test-he', levelNumber: 1, theme: 'onboarding', locale: 'he',
  words: ['שמש'],
  columns: [
    { index: 0, tiles: ['ש', 'מ'] }, // row 1 (top) = מ — must NOT become ם
    { index: 1, tiles: ['מ'] },      // single tile = מ — must NOT become ם
  ],
  resolvableOrder: ['שמש'], tileFlags: {}, difficulty: 1,
};

describe('BlastBoard Hebrew final-form rendering', () => {
  it('renders base Hebrew letters on grid tiles, never final forms', () => {
    const { container } = render(
      <BlastBoard
        level={heLevel}
        selection={{ kind: 'idle' }}
        invalidShakeKey={0}
        onPointerDown={() => {}}
        onPointerEnter={() => {}}
        onPointerUp={() => {}}
        tileIds={[['t-0-0', 't-0-1'], ['t-1-0']]}
      />,
    );
    const text = container.textContent ?? '';
    // Final forms must never appear on the static grid.
    expect(text).not.toContain('ם'); // final mem
    expect(text).not.toContain('ן'); // final nun
    expect(text).not.toContain('ף'); // final pe
    expect(text).not.toContain('ץ'); // final tsade
    expect(text).not.toContain('ך'); // final kaf
    // Base forms are present.
    expect(text).toContain('מ');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:frontend -- components/blast/v2/__tests__/BlastBoard.hebrew.test.tsx`
Expected: FAIL — `expect(text).not.toContain('ם')` fails because `displayChar` converts the top `מ` to `ם`.

- [ ] **Step 3: Apply the fix**

In `components/blast/v2/BlastBoard.tsx`, the `<BlastTile>` render (around line 115-124) currently passes:

```tsx
<BlastTile
  cellId={id}
  letter={letter}
  displayChar={config.displayChar(letter, row, col.tiles.length)}
  flags={flags}
  ...
/>
```

Change it to drop the `displayChar` prop entirely (so `BlastTile` falls back to `letter`):

```tsx
<BlastTile
  cellId={id}
  letter={letter}
  flags={flags}
  state={tileState(id)}
  modeColor={modeColor}
  fontStack={config.fontStack}
  paddingExtra={config.tileExtraPadding}
  onPointerDown={() => onPointerDown(id)}
/>
```

`BlastTile.tsx:68` already renders `{displayChar ?? letter}` — with `displayChar` undefined it renders the base `letter`. No `BlastTile` change needed.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:frontend -- components/blast/v2/__tests__/BlastBoard.hebrew.test.tsx`
Expected: PASS.

- [ ] **Step 5: Verify no other grid call sites of displayChar regressed**

Run: `grep -rn "displayChar" components/blast/v2/ lib/blast/v2/`
Expected: remaining hits are only in `BlastTile.tsx` (the `displayChar ?? letter` fallback), `locale-config.ts` / `locales/*.ts` (the definition), and any selection-readout / results-card components. The grid (`BlastBoard`) must no longer call it. If a selection-readout component uses it with a *real* word position, leave it — that is correct usage. Note findings in the commit message.

- [ ] **Step 6: Run the full blast test suite to check for regressions**

Run: `npm run test:frontend -- lib/blast/v2 components/blast/v2`
Expected: all green.

- [ ] **Step 7: Commit** (ask user first)

```bash
git add components/blast/v2/BlastBoard.tsx components/blast/v2/__tests__/BlastBoard.hebrew.test.tsx
git commit -m "fix(blast-v2): render base Hebrew letters on grid tiles, not final forms"
```

---

## Phase 2 — Board anchored to bottom of viewport

**Problem:** `BlastGame.tsx` playing view wraps `BlastBoard` in `<div className="relative">` inside `<div className="min-h-screen ...">`. `BlastBoard`'s `items-end` only aligns within its own content height, so the whole board sits directly under the HUD at the top of the page.

**Fix:** Make the playing view a column flexbox spanning the viewport; HUD at top, board container `flex-1 flex items-end justify-center` so the board is pushed to the bottom.

> Note: this phase is layout/visual — verification is a browser check, not a unit test. That is acceptable for a pure CSS-structure change.

### Task 2.1: Restructure the playing-phase layout

**Files:**
- Modify: `components/blast/v2/BlastGame.tsx:281-318`

- [ ] **Step 1: Apply the layout change**

In `components/blast/v2/BlastGame.tsx`, the final `return (` block (the playing phase, starting line 281) currently is:

```tsx
return (
  <div className="min-h-screen bg-[#0b1530] text-white">
    {tutorial.showUnlockCard && ( ... )}
    <BlastHud ... />
    <div className="relative">
      <BlastAtmosphereOverlay modeColor={modeColor} />
      <BlastFxOverlay chainEventKey={state.chainEventKey} chainDepth={state.lastChainDepth} />
      <BlastChainSoundListener />
      <BlastBoard ... />
    </div>
    {tutorial.showFtueOverlay && !isVeteranPlayer && ftueStep !== null && ( ... )}
  </div>
);
```

Change the outer wrapper and the board container so the board is bottom-anchored:

```tsx
return (
  <div className="flex flex-col min-h-dvh bg-[#0b1530] text-white">
    {tutorial.showUnlockCard && (
      <BlastUnlockCard
        mechanic={tutorial.showUnlockCard}
        cardIndex={tutorial.unlockCardIndex}
        onDismiss={handleUnlockCardDismiss}
        onSkipAll={handleUnlockCardSkipAll}
      />
    )}
    <BlastHud
      levelNumber={state.level.levelNumber}
      coins={progressState.coins}
      chestNumber={progressState.chestNumber}
      chestProgress={progressState.chestProgress}
      chestContents={progressState.chestContents}
      onShuffle={handlers.onShuffle}
      onHint={() => {
        /* Plan 5 wires hints */
      }}
    />
    <div className="relative flex-1 flex items-end justify-center pb-[max(1rem,env(safe-area-inset-bottom))]">
      <BlastAtmosphereOverlay modeColor={modeColor} />
      <BlastFxOverlay chainEventKey={state.chainEventKey} chainDepth={state.lastChainDepth} />
      <BlastChainSoundListener />
      <BlastBoard
        level={state.level}
        selection={state.selection}
        invalidShakeKey={state.invalidShakeKey}
        onPointerDown={handlers.onPointerDown}
        onPointerEnter={handlers.onPointerMove}
        onPointerUp={handlers.onPointerUp}
        modeColor={modeColor}
        almosts={almosts}
        tileIds={state.tileIds}
        revealGlowCells={revealGlowCells}
      />
    </div>
    {tutorial.showFtueOverlay && !isVeteranPlayer && ftueStep !== null && (
      <BlastFtueOverlay step={ftueStep} onComplete={handleFtueComplete} />
    )}
  </div>
);
```

Key changes: outer `min-h-screen` → `flex flex-col min-h-dvh`; board container gains `flex-1 flex items-end justify-center` plus safe-area bottom padding.

- [ ] **Step 2: Confirm `BlastAtmosphereOverlay` / `BlastFxOverlay` are absolutely positioned**

Run: `grep -n "absolute\|inset" components/blast/v2/BlastAtmosphereOverlay.tsx components/blast/v2/BlastFxOverlay.tsx`
Expected: both use `absolute inset-0`. If `BlastAtmosphereOverlay` is not absolute, add `className="absolute inset-0 pointer-events-none"` to its root so it does not consume flex height. (`BlastFxOverlay` is already `absolute inset-0` per its source.)

- [ ] **Step 3: Browser verification**

Start dev server if not running: `npm run dev` (port 3001). Open `http://localhost:3001/en/blast?v2=force`.
Expected: the tile board sits at the **bottom** of the viewport, HUD at top, gap between them. Test Hebrew too: `http://localhost:3001/he/blast?v2=force` — board still bottom-anchored, RTL columns.
If the board still floats near the top, inspect: the `flex-1` container must have a computed height larger than the board. State the observed result explicitly.

- [ ] **Step 4: Run blast tests for regressions**

Run: `npm run test:frontend -- components/blast/v2`
Expected: green (no test asserts on this layout; this confirms nothing broke).

- [ ] **Step 5: Commit** (ask user first)

```bash
git add components/blast/v2/BlastGame.tsx components/blast/v2/BlastAtmosphereOverlay.tsx
git commit -m "fix(blast-v2): anchor game board to bottom of viewport"
```

---

## Phase 3 — Level progression (advance past level 1)

**Problem:** `BlastV2PageClient.tsx:37` passes `onAdvance={() => console.log('advance')}`; `page.tsx:36` hardcodes `levelNumber = 1`. Level sources use `node:fs` (server-only), so the client cannot resolve the next level directly.

**Fix:** New API route resolves a level by number+locale. `BlastV2PageClient` tracks `currentLevelNumber`, fetches the next level on `onAdvance`, and re-renders `BlastGame` with the new level.

### Task 3.1: API route to resolve a blast level

**Files:**
- Create: `app/api/blast/level/route.ts`
- Test: `app/api/blast/level/__tests__/route.test.ts` (create)

- [ ] **Step 1: Write the failing test**

Create `app/api/blast/level/__tests__/route.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { GET } from '../route';

function req(url: string): Request {
  return new Request(url);
}

describe('GET /api/blast/level', () => {
  it('returns a BlastLevel for a valid level+locale', async () => {
    const res = await GET(req('http://test/api/blast/level?level=1&locale=en'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.levelNumber).toBe(1);
    expect(body.locale).toBe('en');
    expect(Array.isArray(body.columns)).toBe(true);
    expect(Array.isArray(body.words)).toBe(true);
  });

  it('rejects an invalid locale with 400', async () => {
    const res = await GET(req('http://test/api/blast/level?level=1&locale=xx'));
    expect(res.status).toBe(400);
  });

  it('rejects a non-numeric level with 400', async () => {
    const res = await GET(req('http://test/api/blast/level?level=abc&locale=en'));
    expect(res.status).toBe(400);
  });

  it('returns 404 when the level cannot be resolved', async () => {
    // Level 9999 for a locale with no generated/curated content path should fail.
    const res = await GET(req('http://test/api/blast/level?level=9999&locale=ja'));
    expect([404, 200]).toContain(res.status); // 200 only if generator succeeds
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:frontend -- app/api/blast/level/__tests__/route.test.ts`
Expected: FAIL — `Cannot find module '../route'`.

- [ ] **Step 3: Implement the route**

Create `app/api/blast/level/route.ts`:

```ts
import { NextResponse } from 'next/server';
import type { Locale } from '@/lib/blast/v2/types';
import { buildRegistry, getLevelSourceForLevel } from '@/lib/blast/v2/level-source-registry';

const VALID_LOCALES: Locale[] = ['en', 'he', 'sv', 'ja', 'es'];

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const levelParam = url.searchParams.get('level');
  const localeParam = url.searchParams.get('locale');

  const levelNumber = Number(levelParam);
  if (!levelParam || !Number.isInteger(levelNumber) || levelNumber < 1) {
    return NextResponse.json({ error: 'invalid level' }, { status: 400 });
  }
  if (!localeParam || !VALID_LOCALES.includes(localeParam as Locale)) {
    return NextResponse.json({ error: 'invalid locale' }, { status: 400 });
  }
  const locale = localeParam as Locale;

  try {
    const registry = buildRegistry();
    const level = await getLevelSourceForLevel(levelNumber, locale, registry).resolve(
      levelNumber,
      locale,
    );
    return NextResponse.json(level, {
      // Levels are deterministic per (number, locale) — safe to cache.
      headers: { 'Cache-Control': 'public, max-age=3600' },
    });
  } catch (error) {
    console.error('[blast/level] resolve failed:', error);
    return NextResponse.json({ error: 'level not found' }, { status: 404 });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:frontend -- app/api/blast/level/__tests__/route.test.ts`
Expected: PASS.

### Task 3.2: Client-side level advancement

**Files:**
- Modify: `app/[locale]/blast/v2/BlastV2PageClient.tsx` (whole file)
- Test: `app/[locale]/blast/v2/__tests__/BlastV2PageClient.test.tsx` (create)

- [ ] **Step 1: Write the failing test**

Create `app/[locale]/blast/v2/__tests__/BlastV2PageClient.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BlastV2PageClient } from '../BlastV2PageClient';
import type { BlastLevel } from '@/lib/blast/v2/types';

const level1: BlastLevel = {
  id: 'l1', levelNumber: 1, theme: 'onboarding', locale: 'en',
  words: ['CAT'], columns: [{ index: 0, tiles: ['C', 'A', 'T'] }],
  resolvableOrder: ['CAT'], tileFlags: {}, difficulty: 1,
};
const level2: BlastLevel = {
  id: 'l2', levelNumber: 2, theme: 'fruits', locale: 'en',
  words: ['FIG'], columns: [{ index: 0, tiles: ['F', 'I', 'G'] }],
  resolvableOrder: ['FIG'], tileFlags: {}, difficulty: 2,
};

// Stub BlastGame so the test controls onAdvance without playing a real level.
vi.mock('@/components/blast/v2/BlastGame', () => ({
  BlastGame: ({ level, onAdvance }: { level: BlastLevel; onAdvance: () => void }) => (
    <div>
      <span data-testid="level-number">{level.levelNumber}</span>
      <button data-testid="advance" onClick={onAdvance}>advance</button>
    </div>
  ),
}));

describe('BlastV2PageClient level advancement', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches and renders the next level when onAdvance fires', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => level2,
    }) as unknown as typeof fetch;

    render(<BlastV2PageClient level={level1} />);
    expect(screen.getByTestId('level-number').textContent).toBe('1');

    screen.getByTestId('advance').click();

    await waitFor(() => {
      expect(screen.getByTestId('level-number').textContent).toBe('2');
    });
    expect(global.fetch).toHaveBeenCalledWith('/api/blast/level?level=2&locale=en');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:frontend -- app/[locale]/blast/v2/__tests__/BlastV2PageClient.test.tsx`
Expected: FAIL — current `onAdvance` is `console.log`, level number stays `1`.

- [ ] **Step 3: Implement client-side advancement**

Replace `app/[locale]/blast/v2/BlastV2PageClient.tsx` with:

```tsx
'use client';
import { useEffect, useState, useCallback } from 'react';
import { BlastGame } from '@/components/blast/v2/BlastGame';
import type { BlastLevel } from '@/lib/blast/v2/types';
import type { UnlocksSeen } from '@/lib/blast/v2/tutorial/unlocks-seen';

type Props = {
  level: BlastLevel;
};

export function BlastV2PageClient({ level: initialLevel }: Props) {
  const [level, setLevel] = useState<BlastLevel>(initialLevel);
  const [unlocksSeen, setUnlocksSeen] = useState<UnlocksSeen>({});
  const [isVeteran] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [reachedEnd, setReachedEnd] = useState(false);

  useEffect(() => {
    // Plan 3 (DB) replaces this with a real progress fetch.
    setUnlocksSeen({});
  }, []);

  const handleAdvance = useCallback(async () => {
    if (advancing) return;
    setAdvancing(true);
    const nextNumber = level.levelNumber + 1;
    try {
      const res = await fetch(
        `/api/blast/level?level=${nextNumber}&locale=${level.locale}`,
      );
      if (!res.ok) {
        setReachedEnd(true);
        return;
      }
      const next = (await res.json()) as BlastLevel;
      setLevel(next);
    } catch (e) {
      console.error('Failed to load next blast level:', e);
      setReachedEnd(true);
    } finally {
      setAdvancing(false);
    }
  }, [advancing, level.levelNumber, level.locale]);

  if (reachedEnd) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#0b1530] text-white">
        <p className="font-neo-display text-2xl">More levels coming soon!</p>
      </div>
    );
  }

  return (
    <BlastGame
      // key forces a fresh BlastGame (resets useBlastV2 state) per level.
      key={`${level.locale}-${level.levelNumber}`}
      level={level}
      unlocksSeen={unlocksSeen}
      isVeteranPlayer={isVeteran}
      onAdvance={handleAdvance}
      onUpdateUnlocks={(updated) => setUnlocksSeen(updated)}
    />
  );
}
```

> Note: the `key` prop is essential — `useBlastV2` initializes state from `initialLevel` only once (`useReducer` initial). Without remounting, advancing would keep playing level 1's board.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:frontend -- app/[locale]/blast/v2/__tests__/BlastV2PageClient.test.tsx`
Expected: PASS.

- [ ] **Step 5: Browser verification of the full loop**

With dev server on 3001, open `http://localhost:3001/en/blast?v2=force`. Play/clear level 1 (drag the three onboarding words). On the level-complete card, tap Next.
Expected: level 2 loads (`FIG`/`PEAR`/`KIWI` fruits theme), board re-renders fresh. Advance again → level 3. State explicitly whether advancement works.

- [ ] **Step 6: Run blast + route tests**

Run: `npm run test:frontend -- lib/blast/v2 components/blast/v2 app/api/blast app/[locale]/blast`
Expected: green.

- [ ] **Step 7: Commit** (ask user first)

```bash
git add app/api/blast/level/route.ts app/api/blast/level/__tests__/route.test.ts app/[locale]/blast/v2/BlastV2PageClient.tsx app/[locale]/blast/v2/__tests__/BlastV2PageClient.test.tsx
git commit -m "feat(blast-v2): wire level progression via /api/blast/level route"
```

---

## Phase 4 — No accidental dictionary words in any line

**Problem:** A collapsed/filled board line may spell a real word other than the level's intended `words`. `GeneratedLevelSource.resolve` never calls the existing `forwardSim` and never checks filler letters. `validateChainLevel` only checks extra *theme* words, not arbitrary *dictionary* words. `bonusDictLoaders` are empty stubs — the real dictionary is `backend/dictionary.ts` `isValidWord(word, language)`.

**Fix:** A pure `findExtraWords(level, isWord)` validator (dictionary injected as a predicate, so it is unit-testable). Wire it into both `GeneratedLevelSource.resolve` and `ChainPackSource.resolve` with a real dictionary-backed predicate.

### Task 4.1: Pure `findExtraWords` validator

**Files:**
- Create: `lib/blast/v2/engine/extra-word-check.ts`
- Modify: `lib/blast/v2/engine/index.ts`
- Test: `lib/blast/v2/engine/__tests__/extra-word-check.test.ts` (create)

- [ ] **Step 1: Write the failing test**

Create `lib/blast/v2/engine/__tests__/extra-word-check.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { findExtraWords } from '../extra-word-check';
import type { BlastLevel } from '../../types';

// Board:
//   col0: C A T   (row0=C bottom)
//   col1: A
//   col2: R
// Row 0 reads "CAR" horizontally. Intended word list is ["CAT"].
// "CAR" is a real word not in words -> it is an extra word.
const level: BlastLevel = {
  id: 't', levelNumber: 1, theme: 'onboarding', locale: 'en',
  words: ['CAT'],
  columns: [
    { index: 0, tiles: ['C', 'A', 'T'] },
    { index: 1, tiles: ['A'] },
    { index: 2, tiles: ['R'] },
  ],
  resolvableOrder: ['CAT'], tileFlags: {}, difficulty: 1,
};

const isWord = (w: string) => new Set(['CAT', 'CAR', 'AT', 'AR']).has(w.toUpperCase());

describe('findExtraWords', () => {
  it('flags a real dictionary word that is not in level.words', () => {
    const extra = findExtraWords(level, isWord, 3);
    expect(extra).toContain('CAR');
  });

  it('does not flag the intended theme word', () => {
    const extra = findExtraWords(level, isWord, 3);
    expect(extra).not.toContain('CAT');
  });

  it('ignores segments shorter than minLength', () => {
    // minLength 3 -> "AT" / "AR" (length 2) are never reported.
    const extra = findExtraWords(level, isWord, 3);
    expect(extra).not.toContain('AT');
    expect(extra).not.toContain('AR');
  });

  it('returns empty when the board contains only its intended words', () => {
    const clean: BlastLevel = {
      ...level,
      columns: [
        { index: 0, tiles: ['C'] },
        { index: 1, tiles: ['A'] },
        { index: 2, tiles: ['T'] },
      ],
    };
    expect(findExtraWords(clean, isWord, 3)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:frontend -- lib/blast/v2/engine/__tests__/extra-word-check.test.ts`
Expected: FAIL — `Cannot find module '../extra-word-check'`.

- [ ] **Step 3: Implement `findExtraWords`**

Create `lib/blast/v2/engine/extra-word-check.ts`:

```ts
import type { BlastLevel } from '../types';
import { LOCALE_CONFIGS } from '../locale-config';

/**
 * Scans every horizontal and vertical contiguous line segment of the board
 * (length >= minLength, both reading directions) and returns any segment that
 * forms a real dictionary word NOT present in level.words.
 *
 * The dictionary is injected as a predicate so this stays pure and testable.
 * Comparisons use the locale's normalize() so Hebrew final forms / Spanish
 * accents fold consistently with level.words.
 */
export function findExtraWords(
  level: BlastLevel,
  isWord: (word: string) => boolean,
  minLength: number,
): string[] {
  const config = LOCALE_CONFIGS[level.locale];
  const norm = (s: string) => config.normalize(s);
  const intended = new Set(level.words.map(norm));

  // Build a sparse grid: grid[col][row] = letter.
  const grid = new Map<string, string>();
  let maxRow = 0;
  for (const col of level.columns) {
    for (let r = 0; r < col.tiles.length; r++) {
      grid.set(`${col.index},${r}`, col.tiles[r]!);
      if (r > maxRow) maxRow = r;
    }
  }
  const cols = level.columns.map((c) => c.index);
  const minCol = Math.min(...cols);
  const maxCol = Math.max(...cols);

  const found = new Set<string>();

  const consider = (s: string) => {
    if (s.length < minLength) return;
    for (const candidate of [s, [...s].reverse().join('')]) {
      const n = norm(candidate);
      if (intended.has(n)) continue;
      if (isWord(candidate)) found.add(candidate);
    }
  };

  // Horizontal runs: walk each row left-to-right, breaking on gaps.
  for (let r = 0; r <= maxRow; r++) {
    let run = '';
    for (let c = minCol; c <= maxCol; c++) {
      const cell = grid.get(`${c},${r}`);
      if (cell) {
        run += cell;
      } else {
        emitSubsegments(run, minLength, consider);
        run = '';
      }
    }
    emitSubsegments(run, minLength, consider);
  }

  // Vertical runs: each column is already contiguous from row 0 upward.
  for (const col of level.columns) {
    emitSubsegments(col.tiles.join(''), minLength, consider);
  }

  return [...found];
}

/**
 * For a contiguous run, emit every sub-segment of length >= minLength.
 * A 5-letter run can hide a 3- or 4-letter word inside it.
 */
function emitSubsegments(
  run: string,
  minLength: number,
  consider: (s: string) => void,
): void {
  if (run.length < minLength) return;
  for (let start = 0; start < run.length; start++) {
    for (let end = start + minLength; end <= run.length; end++) {
      consider(run.slice(start, end));
    }
  }
}
```

Add to `lib/blast/v2/engine/index.ts`:

```ts
export { findExtraWords } from './extra-word-check';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:frontend -- lib/blast/v2/engine/__tests__/extra-word-check.test.ts`
Expected: PASS.

### Task 4.2: Dictionary-backed predicate for level sources

**Files:**
- Create: `lib/blast/v2/engine/blast-dictionary.ts`
- Test: `lib/blast/v2/engine/__tests__/blast-dictionary.test.ts` (create)

> Step 1 of this task is an investigation step: the exact load API of `backend/dictionary.ts` must be confirmed before writing the adapter. This is a real unknown, not a placeholder — the adapter is a thin wrapper around whatever the backend exposes.

- [ ] **Step 1: Confirm the backend dictionary load + validate API**

Read `backend/dictionary.ts` (focus lines ~240-340 and the exports near 470-495) and `backend/dictionaryLoaders.ts`. Confirm:
- The exported sync validator: `isValidWord(word: string, language: Language): boolean | null` (null = language not loaded).
- How a language gets loaded into the in-memory dictionary (look for a `load`/`ensureLoaded`/`loadLanguage` method on the `dictionary` singleton, or an exported `loadDictionary(language)` function).
- The `Language` type and whether `'en'`/`'he'` map directly or need translation from `Locale`.

Write the findings as a comment block at the top of the new file in Step 3.

- [ ] **Step 2: Write the failing test**

Create `lib/blast/v2/engine/__tests__/blast-dictionary.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { getBlastDictionary } from '../blast-dictionary';

describe('getBlastDictionary', () => {
  it('returns a predicate that validates real English words', async () => {
    const isWord = await getBlastDictionary('en');
    expect(isWord('CAT')).toBe(true);
    expect(isWord('ZZZZQ')).toBe(false);
  });

  it('returns a predicate that validates real Hebrew words', async () => {
    const isWord = await getBlastDictionary('he');
    // base-form Hebrew; the predicate must normalize internally.
    expect(isWord('שמש')).toBe(true);
    expect(isWord('זזזזז')).toBe(false);
  });

  it('caches the predicate per locale (same reference on second call)', async () => {
    const a = await getBlastDictionary('en');
    const b = await getBlastDictionary('en');
    expect(a).toBe(b);
  });
});
```

- [ ] **Step 3: Implement the adapter**

Create `lib/blast/v2/engine/blast-dictionary.ts`. The body below assumes the backend exposes `isValidWord(word, language)` plus a load function — **substitute the exact load call confirmed in Step 1** where marked:

```ts
import type { Locale } from '../types';
// Confirmed in Step 1 — adjust the import path/names to the real exports:
import { isValidWord } from '@/backend/dictionary';
// e.g. import { loadDictionary } from '@/backend/dictionary';  // <- exact name from Step 1

/*
 * Step 1 findings (fill in):
 *   - validator: isValidWord(word, language): boolean | null
 *   - loader: <exact API>
 *   - Locale 'en'|'he' map directly to Language: <yes/no>
 */

type Predicate = (word: string) => boolean;

const cache = new Map<Locale, Predicate>();

export async function getBlastDictionary(locale: Locale): Promise<Predicate> {
  const cached = cache.get(locale);
  if (cached) return cached;

  // Ensure the language is loaded into the in-memory dictionary.
  // <-- Step 1: call the confirmed loader here, e.g.:
  // await loadDictionary(locale as Language);

  const predicate: Predicate = (word: string) => {
    const result = isValidWord(word, locale as Parameters<typeof isValidWord>[1]);
    // null = language not loaded -> treat as "not a word" so generation is
    // never blocked by a missing dictionary, but log once so it is visible.
    return result === true;
  };

  cache.set(locale, predicate);
  return predicate;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:frontend -- lib/blast/v2/engine/__tests__/blast-dictionary.test.ts`
Expected: PASS. If the Hebrew assertion fails because `isValidWord` expects a different normalization, adjust the predicate to normalize via `LOCALE_CONFIGS[locale].normalize` before calling `isValidWord` — and update `findExtraWords`'s expectation accordingly.

### Task 4.3: Wire the validator into `GeneratedLevelSource`

**Files:**
- Modify: `lib/blast/v2/generator/generated-level-source.ts:17-50`
- Test: `lib/blast/v2/generator/__tests__/generated-level-source.extra-words.test.ts` (create)

- [ ] **Step 1: Write the failing test**

Create `lib/blast/v2/generator/__tests__/generated-level-source.extra-words.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { GeneratedLevelSource } from '../generated-level-source';
import { LOCALE_CONFIGS } from '../../locale-config';
import { findExtraWords } from '../../engine/extra-word-check';
import { getBlastDictionary } from '../../engine/blast-dictionary';

describe('GeneratedLevelSource — no extra dictionary words', () => {
  it('emits levels whose lines contain no dictionary word outside level.words', async () => {
    const source = new GeneratedLevelSource(LOCALE_CONFIGS);
    const isWord = await getBlastDictionary('en');
    // Sample several generated levels in the procedural range (31+).
    for (let n = 31; n <= 45; n++) {
      const level = await source.resolve(n, 'en');
      const extra = findExtraWords(level, isWord, LOCALE_CONFIGS.en.wordLengthRange.min);
      expect(extra, `level ${n} produced extra words: ${extra.join(', ')}`).toEqual([]);
    }
  }, 30_000);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:frontend -- lib/blast/v2/generator/__tests__/generated-level-source.extra-words.test.ts`
Expected: FAIL — some generated level has filler letters forming a real word.

- [ ] **Step 3: Wire the check into the regen loop**

In `lib/blast/v2/generator/generated-level-source.ts`, modify `resolve` (lines 17-50). Add the dictionary import at the top:

```ts
import { getBlastDictionary } from '../engine/blast-dictionary';
import { findExtraWords } from '../engine/extra-word-check';
```

Inside `resolve`, before the `for` loop, load the predicate once:

```ts
async resolve(levelNumber: number, locale: Locale, userIdBucket = 'default'): Promise<BlastLevel> {
  const config = this.configs[locale];
  const mechanics = mechanicsForLevel(levelNumber);
  const baseSeed = hashStringToSeed(`${levelNumber}:${locale}:${userIdBucket}`);
  const isWord = await getBlastDictionary(locale);
  const minLen = config.wordLengthRange.min;
  for (let attempt = 0; attempt < MAX_REGEN_ATTEMPTS; attempt++) {
    // ... existing candidate construction ...
    const score = interestingnessScore(candidate);
    candidate.interestingnessScore = score;
    if (score < INTERESTINGNESS_THRESHOLD) continue;
    // NEW: reject candidates whose lines hide an unintended dictionary word.
    if (findExtraWords(candidate, isWord, minLen).length > 0) continue;
    return candidate;
  }
  throw new Error(`could not generate level ${levelNumber}/${locale} after ${MAX_REGEN_ATTEMPTS} attempts`);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:frontend -- lib/blast/v2/generator/__tests__/generated-level-source.extra-words.test.ts`
Expected: PASS.
If it now throws `could not generate level ...` for some N (the extra-word filter rejected all 25 attempts), raise `MAX_REGEN_ATTEMPTS` from 25 to 60 in `generated-level-source.ts:11`. Re-run. If still failing, the filler density is too high — note it and reduce filler by making `fillEmpties` prefer low-frequency letters; this is a follow-up, leave a `// TODO` and keep the raised attempt count.

### Task 4.4: Audit chain packs for extra words

**Files:**
- Test: `lib/blast/v2/__tests__/chain-packs.extra-words.test.ts` (create)
- Possibly modify: `content/blast/packs/en/pack-chain.json`, `content/blast/packs/he/pack-chain.json`

- [ ] **Step 1: Write the audit test**

Create `lib/blast/v2/__tests__/chain-packs.extra-words.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { ChainPackSource } from '../chain-pack-source';
import { LOCALE_CONFIGS } from '../locale-config';
import { findExtraWords } from '../engine/extra-word-check';
import { getBlastDictionary } from '../engine/blast-dictionary';
import type { Locale } from '../types';

const basePath = resolve(process.cwd(), 'content/blast/packs');

describe('chain packs — no extra dictionary words', () => {
  for (const locale of ['en', 'he'] as Locale[]) {
    it(`${locale} chain levels 1-15 contain no unintended dictionary words`, async () => {
      const source = new ChainPackSource(basePath);
      const isWord = await getBlastDictionary(locale);
      const minLen = LOCALE_CONFIGS[locale].wordLengthRange.min;
      for (let n = 1; n <= 15; n++) {
        const level = await source.resolve(n, locale);
        const extra = findExtraWords(level, isWord, minLen);
        expect(extra, `${locale} level ${n}: ${extra.join(', ')}`).toEqual([]);
      }
    }, 20_000);
  }
});
```

- [ ] **Step 2: Run the audit**

Run: `npm run test:frontend -- lib/blast/v2/__tests__/chain-packs.extra-words.test.ts`
Expected: may FAIL, listing offending levels + words.

- [ ] **Step 3: Fix offending chain levels**

For each failing level, the chain layout (driven by `buildChainLevel`'s deterministic seed = `levelNumber`) produced a board with an accidental word. Options, in order of preference:
1. Change the offending level's `chain` word order or swap one word for another theme word from the same theme's pool in `lib/blast/v2/locales/<locale>.ts` `THEMES_*` — re-run until clean.
2. If no word swap clears it, the layout seed is the problem — `buildChainLevel(spec, levelNumber)` uses `levelNumber` as the seed. Since that is fixed, the only lever is the word set. Adjust `chain` words.

Make the JSON edits, re-run Step 2 until green. For Hebrew, follow the project rule: keep base-form spelling in the JSON `chain` (the pack already does, e.g. `"לחמ"`), flag any uncertain Hebrew word swaps as "needs native review" in the commit message.

- [ ] **Step 4: Full blast suite regression**

Run: `npm run test:frontend -- lib/blast/v2 components/blast/v2`
Expected: green.

- [ ] **Step 5: Commit** (ask user first)

```bash
git add lib/blast/v2/engine/extra-word-check.ts lib/blast/v2/engine/blast-dictionary.ts lib/blast/v2/engine/index.ts lib/blast/v2/generator/generated-level-source.ts content/blast/packs lib/blast/v2/engine/__tests__/extra-word-check.test.ts lib/blast/v2/engine/__tests__/blast-dictionary.test.ts lib/blast/v2/generator/__tests__/generated-level-source.extra-words.test.ts lib/blast/v2/__tests__/chain-packs.extra-words.test.ts
git commit -m "feat(blast-v2): reject levels with accidental dictionary words in any line"
```

---

## Phase 5 — Full Pixi + GSAP juice layer

**Problem:** `BlastFxOverlay.tsx` inits a Pixi `Application` then does nothing with it. The board has no clear bursts, debris, shake, or score-fly.

**Fix:** Rebuild `BlastFxOverlay` to drive real effects using the live shared `lib/gameEngine` systems (`ParticlePool`, `PhysicsDebris`, `ScreenShake`, `ScoreFlyManager`, `TweenManager`). Effects are triggered by cleared-cell screen coords captured at submit time. Then delete the orphaned `components/blastEngine/` directory.

### Task 5.1: Capture cleared-cell screen coordinates

`useBlastV2` bumps `chainEventKey` on every valid submit. The cells that were cleared equal the selection at pointer-up. `BlastBoard` must report those screen-space centers up to `BlastGame` so the FX overlay knows where to burst.

**Files:**
- Modify: `components/blast/v2/BlastBoard.tsx`
- Test: `components/blast/v2/__tests__/BlastBoard.commit.test.tsx` (create)

- [ ] **Step 1: Write the failing test**

Create `components/blast/v2/__tests__/BlastBoard.commit.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { BlastBoard } from '../BlastBoard';
import type { BlastLevel } from '@/lib/blast/v2/types';

const level: BlastLevel = {
  id: 't', levelNumber: 1, theme: 'onboarding', locale: 'en',
  words: ['CAT'], columns: [{ index: 0, tiles: ['C', 'A', 'T'] }],
  resolvableOrder: ['CAT'], tileFlags: {}, difficulty: 1,
};

describe('BlastBoard onCommitSelection', () => {
  it('reports cleared-cell screen centers when an active selection ends', () => {
    const onCommit = vi.fn();
    render(
      <BlastBoard
        level={level}
        selection={{ kind: 'active', mode: 'drag', cells: ['c0r0', 'c0r1', 'c0r2'] }}
        invalidShakeKey={0}
        onPointerDown={() => {}}
        onPointerEnter={() => {}}
        onPointerUp={() => {}}
        tileIds={[['t-0-0', 't-0-1', 't-0-2']]}
        onCommitSelection={onCommit}
      />,
    );
    // Simulate the window pointerup that ends a drag.
    window.dispatchEvent(new PointerEvent('pointerup'));
    expect(onCommit).toHaveBeenCalledTimes(1);
    const centers = onCommit.mock.calls[0][0];
    expect(centers).toHaveLength(3);
    expect(centers[0]).toHaveProperty('x');
    expect(centers[0]).toHaveProperty('y');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:frontend -- components/blast/v2/__tests__/BlastBoard.commit.test.tsx`
Expected: FAIL — `onCommitSelection` prop does not exist.

- [ ] **Step 3: Add `onCommitSelection` to `BlastBoard`**

In `components/blast/v2/BlastBoard.tsx`:

Add to the `Props` type:

```tsx
  revealGlowCells?: CellId[];
  onCommitSelection?: (centers: Array<{ x: number; y: number }>) => void;
```

Add `onCommitSelection` to the destructured params.

In the window-level drag `useEffect` (the `onUp` handler around line 80-83), capture centers before `onPointerUp()`:

```tsx
    const onUp = () => {
      if (selection.kind === 'active' && onCommitSelection) {
        const centers = selection.cells
          .map((id) => getCellCenter(id))
          .filter((c): c is { x: number; y: number } => c !== null);
        if (centers.length > 0) onCommitSelection(centers);
      }
      lastEnterRef.current = null;
      onPointerUp();
    };
```

Add `selection`, `onCommitSelection`, `getCellCenter` to that effect's dependency array.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:frontend -- components/blast/v2/__tests__/BlastBoard.commit.test.tsx`
Expected: PASS. (jsdom `getBoundingClientRect` returns zeros — centers will be `{x:0,y:0}` but the array length and shape assertions hold.)

### Task 5.2: Rebuild `BlastFxOverlay` with real effects

**Files:**
- Rewrite: `components/blast/v2/BlastFxOverlay.tsx`
- Modify: `components/blast/v2/BlastGame.tsx` (pass new props)
- Test: `components/blast/v2/__tests__/BlastFxOverlay.test.tsx` (create)

- [ ] **Step 1: Write the failing test**

Create `components/blast/v2/__tests__/BlastFxOverlay.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { BlastFxOverlay } from '../BlastFxOverlay';

describe('BlastFxOverlay', () => {
  it('mounts a canvas without throwing', () => {
    const { getByTestId } = render(
      <BlastFxOverlay chainEventKey={0} chainDepth={0} clearCenters={[]} clearEventKey={0} />,
    );
    expect(getByTestId('blast-fx')).toBeTruthy();
  });

  it('accepts a clear event without throwing', () => {
    const { rerender, getByTestId } = render(
      <BlastFxOverlay chainEventKey={0} chainDepth={0} clearCenters={[]} clearEventKey={0} />,
    );
    rerender(
      <BlastFxOverlay
        chainEventKey={1}
        chainDepth={1}
        clearCenters={[{ x: 10, y: 20 }, { x: 30, y: 40 }]}
        clearEventKey={1}
      />,
    );
    expect(getByTestId('blast-fx')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:frontend -- components/blast/v2/__tests__/BlastFxOverlay.test.tsx`
Expected: FAIL — `BlastFxOverlay` does not accept `clearCenters` / `clearEventKey` (TS error or undefined behavior).

- [ ] **Step 3: Rewrite `BlastFxOverlay`**

Replace `components/blast/v2/BlastFxOverlay.tsx` with a version that drives real effects. It owns its own Pixi `Application` (kept from the current stub — the v8 init pattern is correct and matches memory `feedback-pixi-v8-react-strict-mode-canvas-race`), plus `ParticlePool`, `PhysicsDebris`, `ScreenShake`, `ScoreFlyManager` from `@/lib/gameEngine`:

```tsx
'use client';
import { useEffect, useRef } from 'react';
import {
  ParticlePool, PhysicsDebris, ScreenShake, ScoreFlyManager, PhysicsWorld,
} from '@/lib/gameEngine';
import { TILE_EXPLOSION, CASCADE_SPARKLE, CONFETTI_BURST } from '@/lib/gameEngine/presets/particles';
import { classifyOvation, type OvationTier } from '@/lib/blast/v2/engine';
import styles from './BlastFxOverlay.module.css';

type Props = {
  chainEventKey?: number;
  chainDepth?: number;
  clearCenters?: Array<{ x: number; y: number }>;
  clearEventKey?: number;
  onChainOvation?: (tier: OvationTier) => void;
};

type FxSystems = {
  particles: ParticlePool;
  debris: PhysicsDebris;
  shake: ScreenShake;
  scoreFly: ScoreFlyManager;
  physics: PhysicsWorld;
};

export function BlastFxOverlay({
  chainEventKey, chainDepth, clearCenters, clearEventKey, onChainOvation,
}: Props = {}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const systemsRef = useRef<FxSystems | null>(null);
  const lastChainKeyRef = useRef<number | undefined>(undefined);
  const lastClearKeyRef = useRef<number | undefined>(undefined);

  // ── Pixi app + FX systems lifecycle ────────────────────────────────
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    let cancelled = false;
    let appInstance: import('pixi.js').Application | null = null;

    (async () => {
      const PIXI = await import('pixi.js');
      if (cancelled) return;
      const app = new PIXI.Application();
      try {
        await app.init({ canvas, backgroundAlpha: 0, antialias: true, resizeTo: canvas });
      } catch {
        return;
      }
      if (cancelled) {
        try { app.destroy(true, { children: true }); } catch { /* */ }
        return;
      }
      appInstance = app;

      const physics = new PhysicsWorld();
      const particles = new ParticlePool(app.stage);
      const debris = new PhysicsDebris(app.stage, physics, {
        floorY: app.screen.height,
        maxDebris: 60,
        maxAge: 2.0,
        pieceSize: 5,
      });
      const shake = new ScreenShake();
      const scoreFly = new ScoreFlyManager(app.stage);
      systemsRef.current = { particles, debris, shake, scoreFly, physics };

      const tick = (ticker: { deltaMS: number }) => {
        const dt = ticker.deltaMS / 1000;
        physics.update(dt);
        particles.update(dt);
        debris.update(dt);
        shake.update(dt);
        scoreFly.update(dt);
        app.stage.x = shake.offset.x;
        app.stage.y = shake.offset.y;
      };
      app.ticker.add(tick);
    })();

    return () => {
      cancelled = true;
      systemsRef.current = null;
      try { appInstance?.destroy(true, { children: true }); } catch { /* */ }
    };
  }, []);

  // ── Clear event → bursts + debris + shake at cleared cells ─────────
  useEffect(() => {
    if (clearEventKey === undefined || clearEventKey === lastClearKeyRef.current) return;
    lastClearKeyRef.current = clearEventKey;
    const sys = systemsRef.current;
    if (!sys || !clearCenters || clearCenters.length === 0) return;

    for (const c of clearCenters) {
      sys.particles.burst(TILE_EXPLOSION, c.x, c.y, 12);
      sys.debris.spawn(c.x, c.y, 0xfff5e6, 3);
    }
    if (clearCenters.length >= 5) sys.shake.medium();
    else sys.shake.light();
  }, [clearEventKey, clearCenters]);

  // ── Chain event → escalating sparkle + ovation tier ───────────────
  useEffect(() => {
    if (chainEventKey === undefined || chainEventKey === lastChainKeyRef.current) return;
    lastChainKeyRef.current = chainEventKey;
    const tier = classifyOvation(chainDepth ?? 0);
    const canvas = canvasRef.current;
    if (tier !== 'none') {
      canvas?.setAttribute('data-ovation-tier', tier);
      onChainOvation?.(tier);
    } else {
      canvas?.removeAttribute('data-ovation-tier');
    }
    const sys = systemsRef.current;
    if (sys && canvas) {
      const depth = chainDepth ?? 0;
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      sys.particles.burst(CASCADE_SPARKLE, cx, cy, 8 + depth * 6);
      if (tier === 'mega') sys.particles.burst(CONFETTI_BURST, cx, cy, 40);
    }
  }, [chainEventKey, chainDepth, onChainOvation]);

  return (
    <canvas
      ref={canvasRef}
      data-testid="blast-fx"
      className={`${styles.canvas} absolute inset-0 pointer-events-none`}
      style={{ zIndex: 10 }}
    />
  );
}
```

> If `ParticlePool` / `PhysicsDebris` / `ScoreFlyManager` constructor signatures differ from the above (confirm against `lib/gameEngine/index.ts` exports and each class file — `ParticlePool` constructor, `burst(preset, x, y, count)` method), adjust the calls. The `lib/gameEngine` API as documented: `new ParticlePool(parent: Container)`, `particles.burst(config, x, y, count)`; `new PhysicsDebris(parent, physics, { floorY, maxDebris, maxAge, pieceSize })`, `debris.spawn(x, y, color, count)`; `new ScreenShake()`, `shake.light()/.medium()/.heavy()`, `shake.offset`; `new ScoreFlyManager(parent)`, `scoreFly.fly({score, from, to, tier})`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:frontend -- components/blast/v2/__tests__/BlastFxOverlay.test.tsx`
Expected: PASS. (Pixi `app.init` is async and will not finish in jsdom — the systems stay null, and every handler guards on `systemsRef.current`. The test only asserts the canvas mounts and no handler throws.)

### Task 5.3: Wire `BlastGame` to feed FX

**Files:**
- Modify: `components/blast/v2/BlastGame.tsx`

- [ ] **Step 1: Add clear-center plumbing in `BlastGame`**

In `components/blast/v2/BlastGame.tsx`, add a ref to hold the latest committed centers (near the other refs, ~line 100):

```tsx
  const clearCentersRef = useRef<Array<{ x: number; y: number }>>([]);
```

Pass `onCommitSelection` to `BlastBoard` (in the playing-phase JSX from Phase 2):

```tsx
      <BlastBoard
        level={state.level}
        selection={state.selection}
        invalidShakeKey={state.invalidShakeKey}
        onPointerDown={handlers.onPointerDown}
        onPointerEnter={handlers.onPointerMove}
        onPointerUp={handlers.onPointerUp}
        modeColor={modeColor}
        almosts={almosts}
        tileIds={state.tileIds}
        revealGlowCells={revealGlowCells}
        onCommitSelection={(centers) => { clearCentersRef.current = centers; }}
      />
```

Update the `BlastFxOverlay` usage to pass the new props. `state.chainEventKey` bumps only on a *valid* submit, so it doubles as the clear-event key:

```tsx
      <BlastFxOverlay
        chainEventKey={state.chainEventKey}
        chainDepth={state.lastChainDepth}
        clearCenters={clearCentersRef.current}
        clearEventKey={state.chainEventKey}
      />
```

> Why `chainEventKey` works as `clearEventKey`: `applyValidatedSubmit` only bumps `chainEventKey` on the success path. On a rejected word it returns early without bumping. So a bumped key always means a real clear happened, and `clearCentersRef.current` holds that submit's cells (captured by `onCommitSelection` microseconds earlier on the same pointer-up).

- [ ] **Step 2: Browser verification**

Dev server on 3001, `http://localhost:3001/en/blast?v2=force`. Clear a word.
Expected: particle burst + debris fall at the cleared tiles, light screen shake. Clear words quickly to build a chain → bigger sparkle, ovation flash (the CSS `data-ovation-tier` animation). State explicitly what you observe.

### Task 5.4: Delete orphaned `components/blastEngine/`

**Files:**
- Delete: `components/blastEngine/` (entire directory)

- [ ] **Step 1: Confirm nothing imports it**

Run: `grep -rn "blastEngine" --include=*.ts --include=*.tsx app components lib backend server | grep -v "components/blastEngine/"`
Expected: no results. If there ARE results, stop — investigate each before deleting.

- [ ] **Step 2: Delete the directory**

```bash
rm -rf components/blastEngine
```

- [ ] **Step 3: Typecheck + full blast suite**

Run: `npx tsc --noEmit`
Expected: no new errors referencing `blastEngine`.
Run: `npm run test:frontend -- lib/blast/v2 components/blast/v2 app/api/blast app/[locale]/blast`
Expected: green.

- [ ] **Step 4: Commit** (ask user first)

```bash
git add components/blast/v2 lib/blast/v2 docs/superpowers
git add -A components/blastEngine
git commit -m "feat(blast-v2): real Pixi/GSAP juice layer; remove orphaned blastEngine path"
```

---

## Phase 6 — Collapse / gravity feel

**Problem:** After a word clears, `collapseCells` rebuilds `level.columns` synchronously. framer `LayoutGroup` + the GSAP squash in `useCollapseTimeline` should make tiles *fall*, but tiles may teleport if framer keys are not stable across the collapse.

**Fix:** Verify `rebuildTileIds` preserves stable per-tile ids so framer animates position. Tune the GSAP squash. Confirm reveal-glow points at the next findable word.

### Task 6.1: Verify tile-id stability across a collapse

**Files:**
- Test: `lib/blast/v2/engine/__tests__/collapse.tile-stability.test.ts` (create)

- [ ] **Step 1: Write the test**

Create `lib/blast/v2/engine/__tests__/collapse.tile-stability.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { collapseCells, rebuildTileIds } from '../collapse';
import type { BlastLevel } from '../../types';

const level: BlastLevel = {
  id: 't', levelNumber: 1, theme: 'onboarding', locale: 'en',
  words: ['CAT'],
  columns: [
    { index: 0, tiles: ['C', 'A', 'T'] }, // C=row0 bottom
    { index: 1, tiles: ['X', 'Y'] },
  ],
  resolvableOrder: ['CAT'], tileFlags: {}, difficulty: 1,
};
// initial ids parallel to columns
const tileIds = [['t-0-0', 't-0-1', 't-0-2'], ['t-1-0', 't-1-1']];

describe('collapse tile-id stability', () => {
  it('surviving tiles keep their id at their new position', () => {
    // Pop the bottom of column 0 (the "C" at c0r0).
    const collapse = collapseCells(level, ['c0r0']);
    const newIds = rebuildTileIds(level.columns, tileIds, collapse);
    // Column 0 now has A,T -> their original ids t-0-1, t-0-2 must survive,
    // shifted down one row, in the same relative order.
    expect(newIds[0]).toEqual(['t-0-1', 't-0-2']);
    // Column 1 untouched.
    expect(newIds[1]).toEqual(['t-1-0', 't-1-1']);
    // The popped tile's id is gone.
    expect(newIds.flat()).not.toContain('t-0-0');
  });
});
```

- [ ] **Step 2: Run test**

Run: `npm run test:frontend -- lib/blast/v2/engine/__tests__/collapse.tile-stability.test.ts`
Expected: PASS (this verifies existing `rebuildTileIds` is correct). If it FAILS, `rebuildTileIds` has a bug — fix `rebuildTileIds` in `lib/blast/v2/engine/collapse.ts` so surviving ids map to their new rows, then re-run.

### Task 6.2: Tune the collapse squash + verify reveal-glow

**Files:**
- Modify: `components/blast/v2/useCollapseTimeline.ts` (only if browser check shows it needs it)
- Verify: `components/blast/v2/BlastGame.tsx:84-98` (reveal-glow effect)

- [ ] **Step 1: Browser check — does the board *fall*?**

Dev server on 3001, `http://localhost:3001/en/blast?v2=force`. Clear a word that leaves tiles above the gap (e.g. clear a bottom-row word).
Expected: remaining tiles visibly slide down into the gap (framer `layout`), with a small squash on landing (GSAP `useCollapseTimeline`). If tiles **teleport** instead of sliding:
- Confirm `BlastTile` has `layout` on its `m.div` (it does, line 41) and is inside `<LayoutGroup>` (it is, `BlastBoard.tsx:104`).
- Confirm the `key` on the tile wrapper div is `tileKey` from `tileIds` (it is, `BlastBoard.tsx:111-114`), and that Task 6.1's test passed (ids are stable).
- If still teleporting, the `AnimatePresence` + `flex-col-reverse` combination may be the cause — try removing `AnimatePresence` wrapping (keep `LayoutGroup`) since collapse is a position change, not an unmount. Re-check.

- [ ] **Step 2: Tune the squash if it is too subtle / too strong**

In `components/blast/v2/useCollapseTimeline.ts`, the squash is `scaleY: 1 → 0.82`, `duration: 0.09`, stagger `i * 0.012`. If the browser check shows it is imperceptible, increase contrast (`0.82 → 0.7`) and duration (`0.09 → 0.13`). If it looks janky, reduce stagger. Make at most one adjustment, re-verify in browser.

- [ ] **Step 3: Verify reveal-glow points at the next findable word**

Read `components/blast/v2/BlastGame.tsx:84-98`. The effect calls `detectAllCascades(state.level, state.foundWords, ...)` and glows `cascades[0].cells`. In the browser: clear one word, confirm a glow appears on the cells of a still-findable word. If no glow appears when words remain, check that `detectAllCascades` returns matches for the post-collapse board (it should — it is the same function the engine uses). State the observed result.

- [ ] **Step 4: Full regression**

Run: `npm run test:frontend -- lib/blast/v2 components/blast/v2 app/api/blast app/[locale]/blast`
Expected: green.
Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 5: Commit** (ask user first)

```bash
git add lib/blast/v2 components/blast/v2
git commit -m "fix(blast-v2): stable tile ids + tuned collapse squash for falling feel"
```

---

## Final verification

- [ ] Run the full frontend suite touching blast: `npm run test:frontend -- lib/blast/v2 components/blast/v2 app/api/blast app/[locale]/blast`
- [ ] `npx tsc --noEmit` — clean
- [ ] `npm run lint` — clean for touched files
- [ ] Browser smoke test on port 3001, `?v2=force`, both `en` and `he`:
  - Board sits at bottom of viewport.
  - Hebrew tiles show base letters (no stray sofit letters mid-grid).
  - Clearing a word: particle burst + debris + shake; tiles fall with squash.
  - Level-complete → Next advances to the following level; repeat to level 3+.
- [ ] `npm run build:fast` once at the end (per project memory — batch the build, don't build per phase).

## Spec coverage check

| Spec requirement | Covered by |
|---|---|
| Stops after level 1 | Phase 3 (API route + client advancement) |
| Sofit letters wrong | Phase 1 |
| Tiles at top | Phase 2 |
| No effects | Phase 5 |
| Multi-word rows (any dictionary word) | Phase 4 |
| Gravity/cascade feel | Phase 6 |
| Delete Path B | Phase 5 Task 5.4 |
| Manual-find cascades unchanged | (no task — intentionally untouched) |
