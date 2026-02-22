# Blast Mode — Full Fun Overhaul Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform Blast Mode from functional-but-static to alive and fun — pre-game discovery, tile idle animations, wave cinematic, star bug fix, dead-end hint system, and dramatic results screen.

**Architecture:** Presentation-only changes. All game logic (`useBlastGame`, `useBlastCascade`, `blastGravity`, etc.) is untouched. A new `'ready'` phase is added to `BlastView` before `'playing'`. Two new files: `BlastReadyScreen.tsx` and `hooks/useBlastHint.ts`. CSS `@keyframes` added to `app/globals.css`.

**Tech Stack:** React 18, Framer Motion (already used everywhere), Tailwind CSS, existing `AnimatedCounter` component, existing `fireVictoryConfetti` from `utils/confettiUtils`, existing `useDictionaryCache` hook.

---

## Key Files Reference

| File | Role |
|------|------|
| `fe-next/components/blast/types.ts` | BlastPhase type (add `'ready'`) |
| `fe-next/components/blast/BlastView.tsx` | Phase orchestrator |
| `fe-next/components/blast/BlastGame.tsx` | Game logic connector |
| `fe-next/components/blast/BlastGameLayout.tsx` | Main UI layout |
| `fe-next/components/blast/BlastGrid.tsx` | Grid + overlays |
| `fe-next/components/blast/BlastWaveTransition.tsx` | Between-wave overlay |
| `fe-next/components/blast/BlastResults.tsx` | End-of-game results |
| `fe-next/components/blast/BlastTileOverlay.tsx` | Special tile backgrounds |
| `fe-next/components/blast/utils/blastDeadEndDetector.ts` | Dead-end DFS (add hint export) |
| `fe-next/app/globals.css` | CSS @keyframes for tile animations |
| `fe-next/translations/en.js` | English translations (add blast.ready.*, blast.hint, etc.) |
| `fe-next/translations/he.js` | Hebrew translations |
| `fe-next/translations/sv.js` | Swedish translations |
| `fe-next/translations/ja.js` | Japanese translations |

---

## Task 1: Add `'ready'` to BlastPhase + translation keys

### Files
- Modify: `fe-next/components/blast/types.ts` (line 70)
- Modify: `fe-next/translations/en.js` (blast section ~line 4982)
- Modify: `fe-next/translations/he.js` (blast section)
- Modify: `fe-next/translations/sv.js` (blast section)
- Modify: `fe-next/translations/ja.js` (blast section)

### Step 1: Update BlastPhase type

In `types.ts`, change line 70:
```typescript
// Before:
export type BlastPhase = 'playing' | 'waveTransition' | 'results';

// After:
export type BlastPhase = 'ready' | 'playing' | 'waveTransition' | 'results';
```

### Step 2: Add translation keys

In `fe-next/translations/en.js`, inside the `"blast"` object, add these keys:
```javascript
"ready": {
  "title": "Blast Mode",
  "subtitle": "Clear tiles by forming words. Chain combos for big scores!",
  "play": "Blast Off!",
  "difficulty": "Difficulty",
  "tileGuide": "Tile Guide",
  "wave2Plus": "Wave 2+",
  "easy": "Easy",
  "medium": "Medium",
  "hard": "Hard",
  "easyDesc": "Fewer specials, relaxed cascades",
  "mediumDesc": "Balanced chaos",
  "hardDesc": "Specials everywhere, brutal waves"
},
"hint": "Hint",
"stuck": "Stuck?",
"hintCooldown": "Used",
"waveClear": "Wave Clear!",
"tapToContinue": "Tap to continue",
```

In `he.js` (Hebrew), add corresponding keys:
```javascript
"ready": {
  "title": "מצב פיצוץ",
  "subtitle": "נקה אריחים ביצירת מילים. שרשר קומבו לניקוד גדול!",
  "play": "יאללה!",
  "difficulty": "רמת קושי",
  "tileGuide": "מדריך אריחים",
  "wave2Plus": "גל 2+",
  "easy": "קל",
  "medium": "בינוני",
  "hard": "קשה",
  "easyDesc": "פחות מיוחדים, קסקדות רגועות",
  "mediumDesc": "כאוס מאוזן",
  "hardDesc": "מיוחדים בכל מקום, גלים אכזריים"
},
"hint": "רמז",
"stuck": "תקוע?",
"hintCooldown": "שומש",
"waveClear": "גל הושלם!",
"tapToContinue": "הקש להמשיך",
```

In `sv.js` (Swedish), add:
```javascript
"ready": {
  "title": "Blast-läge",
  "subtitle": "Rensa brickor genom att bilda ord. Kedjekombos ger stora poäng!",
  "play": "Sätt igång!",
  "difficulty": "Svårighetsgrad",
  "tileGuide": "Brickguide",
  "wave2Plus": "Våg 2+",
  "easy": "Lätt",
  "medium": "Medel",
  "hard": "Svårt",
  "easyDesc": "Färre specialbrickor, lugna kaskader",
  "mediumDesc": "Balanserat kaos",
  "hardDesc": "Specialbrickor överallt, brutala vågor"
},
"hint": "Tips",
"stuck": "Fastnat?",
"hintCooldown": "Använt",
"waveClear": "Vågen klar!",
"tapToContinue": "Tryck för att fortsätta",
```

In `ja.js` (Japanese), add:
```javascript
"ready": {
  "title": "ブラストモード",
  "subtitle": "単語を作ってタイルをクリア。コンボをつなげて高得点！",
  "play": "ブラスト開始！",
  "difficulty": "難易度",
  "tileGuide": "タイルガイド",
  "wave2Plus": "ウェーブ2以降",
  "easy": "かんたん",
  "medium": "ふつう",
  "hard": "むずかしい",
  "easyDesc": "特殊タイル少なめ、穏やかなカスケード",
  "mediumDesc": "バランスのとれた混沌",
  "hardDesc": "特殊タイルだらけ、激しいウェーブ"
},
"hint": "ヒント",
"stuck": "詰まった？",
"hintCooldown": "使用済",
"waveClear": "ウェーブクリア！",
"tapToContinue": "タップして続ける",
```

### Step 3: Verify no TypeScript errors

```bash
cd fe-next && npx tsc --noEmit 2>&1 | grep -i "blastphase\|blast/types" | head -10
```

Expected: no output (no errors relating to BlastPhase)

### Step 4: Commit

```bash
git add fe-next/components/blast/types.ts fe-next/translations/en.js fe-next/translations/he.js fe-next/translations/sv.js fe-next/translations/ja.js
git commit -m "feat(blast): add ready phase type + translation keys for overhaul"
```

---

## Task 2: `findHintPath` export in blastDeadEndDetector

The existing `dfs` function returns `boolean`. We need a parallel `dfsFindPath` that returns the full `{row, col}` path + word string.

### Files
- Modify: `fe-next/components/blast/utils/blastDeadEndDetector.ts`
- Test: `fe-next/components/blast/__tests__/blastDeadEndDetector.test.ts`

### Step 1: Write failing test

Open `fe-next/components/blast/__tests__/blastDeadEndDetector.test.ts` and add at the end:

```typescript
import { hasValidWords, findHintPath } from '../utils/blastDeadEndDetector';

describe('findHintPath', () => {
  const grid = [
    ['c', 'a', 't'],
    ['o', 'g', 'd'],
    ['d', 'e', 'f'],
  ];
  const checkWord = (w: string) => ['cat', 'dog', 'god', 'cog', 'age'].includes(w);
  const foundWords = new Set<string>();

  it('returns a valid word path', () => {
    const result = findHintPath(grid, 'en', checkWord, foundWords, 3, 6);
    expect(result).not.toBeNull();
    expect(result!.word.length).toBeGreaterThanOrEqual(3);
    expect(result!.path.length).toBe(result!.word.length);
    expect(checkWord(result!.word)).toBe(true);
  });

  it('returns null when no valid words exist', () => {
    const emptyGrid = [['', '', ''], ['', '', ''], ['', '', '']];
    const result = findHintPath(emptyGrid, 'en', checkWord, foundWords, 3, 6);
    expect(result).toBeNull();
  });

  it('skips already found words', () => {
    const allFound = new Set(['cat', 'dog', 'god', 'cog', 'age']);
    const result = findHintPath(grid, 'en', checkWord, allFound, 3, 6);
    expect(result).toBeNull();
  });

  it('returns path with valid grid coordinates', () => {
    const result = findHintPath(grid, 'en', checkWord, foundWords, 3, 6);
    if (result) {
      for (const { row, col } of result.path) {
        expect(row).toBeGreaterThanOrEqual(0);
        expect(row).toBeLessThan(grid.length);
        expect(col).toBeGreaterThanOrEqual(0);
        expect(col).toBeLessThan(grid[0].length);
      }
    }
  });
});
```

### Step 2: Run test to verify it fails

```bash
cd fe-next && npx jest --testPathPattern="blastDeadEndDetector" --no-coverage 2>&1 | tail -20
```

Expected: `FAIL` — `findHintPath is not a function`

### Step 3: Implement `findHintPath`

Add to `fe-next/components/blast/utils/blastDeadEndDetector.ts` (after the existing `dfs` function, before `hasValidWords`):

```typescript
/** Result type for hint path search */
export interface HintPathResult {
  word: string;
  path: Array<{ row: number; col: number }>;
}

/**
 * DFS that returns the full cell path + word string on first valid word found.
 * Same algorithm as dfs() but tracks path instead of returning boolean.
 */
function dfsFindPath(
  grid: string[][],
  row: number,
  col: number,
  current: string,
  currentPath: Array<{ row: number; col: number }>,
  visited: Set<string>,
  checkWord: (word: string) => boolean,
  foundWords: Set<string>,
  minLength: number,
  maxLength: number,
): HintPathResult | null {
  const cell = grid[row]?.[col];
  if (!cell) return null;

  const key = `${row},${col}`;
  if (visited.has(key)) return null;

  const word = current + cell.toLowerCase();
  if (word.length > maxLength) return null;

  const path = [...currentPath, { row, col }];

  if (word.length >= minLength && !foundWords.has(word) && checkWord(word)) {
    return { word, path };
  }

  visited.add(key);

  for (const [dr, dc] of DIRECTIONS) {
    const nr = row + dr;
    const nc = col + dc;
    if (nr >= 0 && nr < grid.length && nc >= 0 && nc < grid[0].length) {
      const result = dfsFindPath(grid, nr, nc, word, path, visited, checkWord, foundWords, minLength, maxLength);
      if (result) {
        visited.delete(key);
        return result;
      }
    }
  }

  visited.delete(key);
  return null;
}

/**
 * Find a hint word path from remaining tiles.
 *
 * @returns First valid unfound word with its cell path, or null if none exist.
 */
export function findHintPath(
  grid: string[][],
  _language: string,
  checkWord: (word: string) => boolean,
  foundWords: Set<string>,
  minLength: number = 3,
  maxLength: number = 8,
): HintPathResult | null {
  if (!grid.length || !grid[0]?.length) return null;

  const rows = grid.length;
  const cols = grid[0].length;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!grid[r][c]) continue;
      const result = dfsFindPath(grid, r, c, '', [], new Set(), checkWord, foundWords, minLength, maxLength);
      if (result) return result;
    }
  }

  return null;
}
```

### Step 4: Run tests to verify they pass

```bash
cd fe-next && npx jest --testPathPattern="blastDeadEndDetector" --no-coverage 2>&1 | tail -15
```

Expected: `PASS` — all tests including new `findHintPath` suite green.

### Step 5: Commit

```bash
git add fe-next/components/blast/utils/blastDeadEndDetector.ts fe-next/components/blast/__tests__/blastDeadEndDetector.test.ts
git commit -m "feat(blast): add findHintPath export to blastDeadEndDetector"
```

---

## Task 3: `useBlastHint` hook

### Files
- Create: `fe-next/components/blast/hooks/useBlastHint.ts`
- Create: `fe-next/components/blast/__tests__/useBlastHint.test.ts`

### Step 1: Write failing test

Create `fe-next/components/blast/__tests__/useBlastHint.test.ts`:

```typescript
import { renderHook, act } from '@testing-library/react';
import { useBlastHint } from '../hooks/useBlastHint';

const mockGrid = [
  ['c', 'a', 't'],
  ['o', 'g', 'd'],
  ['d', 'e', 'f'],
];

const checkWord = (w: string) => ['cat', 'dog', 'god', 'cog'].includes(w);

describe('useBlastHint', () => {
  it('hintPath is null initially', () => {
    const { result } = renderHook(() =>
      useBlastHint(mockGrid, 'en', checkWord, new Set(), 3)
    );
    expect(result.current.hintPath).toBeNull();
  });

  it('requestHint sets hintPath to valid path', () => {
    const { result } = renderHook(() =>
      useBlastHint(mockGrid, 'en', checkWord, new Set(), 3)
    );
    act(() => { result.current.requestHint(); });
    expect(result.current.hintPath).not.toBeNull();
    expect(result.current.hintPath!.length).toBeGreaterThanOrEqual(3);
  });

  it('clearHint resets hintPath to null', () => {
    const { result } = renderHook(() =>
      useBlastHint(mockGrid, 'en', checkWord, new Set(), 3)
    );
    act(() => { result.current.requestHint(); });
    expect(result.current.hintPath).not.toBeNull();
    act(() => { result.current.clearHint(); });
    expect(result.current.hintPath).toBeNull();
  });

  it('hasHintAvailable is false when no words remain', () => {
    const emptyGrid = [['', ''], ['', '']];
    const { result } = renderHook(() =>
      useBlastHint(emptyGrid, 'en', checkWord, new Set(), 3)
    );
    expect(result.current.hasHintAvailable).toBe(false);
  });

  it('hasHintAvailable is true when valid words exist', () => {
    const { result } = renderHook(() =>
      useBlastHint(mockGrid, 'en', checkWord, new Set(), 3)
    );
    expect(result.current.hasHintAvailable).toBe(true);
  });
});
```

### Step 2: Run to verify fails

```bash
cd fe-next && npx jest --testPathPattern="useBlastHint" --no-coverage 2>&1 | tail -10
```

Expected: `FAIL` — module not found

### Step 3: Implement `useBlastHint`

Create `fe-next/components/blast/hooks/useBlastHint.ts`:

```typescript
'use client';

import { useState, useCallback, useMemo } from 'react';
import { findHintPath } from '../utils/blastDeadEndDetector';
import { hasValidWords } from '../utils/blastDeadEndDetector';

interface UseBlastHintReturn {
  /** Current hint cell path (null when no hint active) */
  hintPath: Array<{ row: number; col: number }> | null;
  /** Whether a hint word exists in the current grid */
  hasHintAvailable: boolean;
  /** Find and display a hint word path */
  requestHint: () => void;
  /** Clear the hint path */
  clearHint: () => void;
}

/**
 * useBlastHint - Finds and displays a valid word path hint.
 *
 * Uses the same DFS as dead-end detection but returns the full path
 * for grid highlight via BlastGrid's highlightedPath prop.
 *
 * @param grid - Current grid (empty strings for cleared cells)
 * @param language - Game language
 * @param checkWord - Dictionary lookup from useDictionaryCache
 * @param foundWords - Words already found (excluded from hint)
 * @param minWordLength - Min word length (matches wave config)
 */
export function useBlastHint(
  grid: string[][],
  language: string,
  checkWord: (word: string) => boolean,
  foundWords: Set<string>,
  minWordLength: number = 3,
): UseBlastHintReturn {
  const [hintPath, setHintPath] = useState<Array<{ row: number; col: number }> | null>(null);

  // Check if any hint is available (same check as dead-end detection)
  const hasHintAvailable = useMemo(
    () => hasValidWords(grid, language, checkWord, foundWords, minWordLength),
    [grid, language, checkWord, foundWords, minWordLength],
  );

  const requestHint = useCallback(() => {
    const result = findHintPath(grid, language, checkWord, foundWords, minWordLength);
    if (result) {
      setHintPath(result.path);
    }
  }, [grid, language, checkWord, foundWords, minWordLength]);

  const clearHint = useCallback(() => {
    setHintPath(null);
  }, []);

  return { hintPath, hasHintAvailable, requestHint, clearHint };
}
```

### Step 4: Run tests to verify pass

```bash
cd fe-next && npx jest --testPathPattern="useBlastHint" --no-coverage 2>&1 | tail -10
```

Expected: `PASS` — all 5 tests green

### Step 5: Commit

```bash
git add fe-next/components/blast/hooks/useBlastHint.ts fe-next/components/blast/__tests__/useBlastHint.test.ts
git commit -m "feat(blast): add useBlastHint hook for dead-end hint system"
```

---

## Task 4: `BlastReadyScreen` component

### Files
- Create: `fe-next/components/blast/BlastReadyScreen.tsx`
- Create: `fe-next/components/blast/__tests__/BlastReadyScreen.test.tsx`

### Step 1: Write failing test

Create `fe-next/components/blast/__tests__/BlastReadyScreen.test.tsx`:

```typescript
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BlastReadyScreen } from '../BlastReadyScreen';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  m: { div: ({ children, ...p }: any) => <div {...p}>{children}</div>, button: ({ children, ...p }: any) => <button {...p}>{children}</button> },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock LanguageContext
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k }),
}));

describe('BlastReadyScreen', () => {
  const onStart = jest.fn();

  beforeEach(() => onStart.mockClear());

  it('renders all 3 difficulty cards', () => {
    render(<BlastReadyScreen onStart={onStart} />);
    expect(screen.getByTestId('difficulty-easy')).toBeInTheDocument();
    expect(screen.getByTestId('difficulty-medium')).toBeInTheDocument();
    expect(screen.getByTestId('difficulty-hard')).toBeInTheDocument();
  });

  it('medium is selected by default', () => {
    render(<BlastReadyScreen onStart={onStart} />);
    expect(screen.getByTestId('difficulty-medium')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('difficulty-easy')).toHaveAttribute('aria-pressed', 'false');
  });

  it('clicking a card selects it', () => {
    render(<BlastReadyScreen onStart={onStart} />);
    fireEvent.click(screen.getByTestId('difficulty-hard'));
    expect(screen.getByTestId('difficulty-hard')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('difficulty-medium')).toHaveAttribute('aria-pressed', 'false');
  });

  it('play button calls onStart with selected difficulty', () => {
    render(<BlastReadyScreen onStart={onStart} />);
    fireEvent.click(screen.getByTestId('difficulty-hard'));
    fireEvent.click(screen.getByTestId('play-button'));
    expect(onStart).toHaveBeenCalledWith('hard');
  });

  it('play button calls onStart with medium by default', () => {
    render(<BlastReadyScreen onStart={onStart} />);
    fireEvent.click(screen.getByTestId('play-button'));
    expect(onStart).toHaveBeenCalledWith('medium');
  });

  it('renders tile guide with all 5 wave-1 tiles', () => {
    render(<BlastReadyScreen onStart={onStart} />);
    expect(screen.getByTestId('tile-legend-gold')).toBeInTheDocument();
    expect(screen.getByTestId('tile-legend-bomb')).toBeInTheDocument();
    expect(screen.getByTestId('tile-legend-rainbow')).toBeInTheDocument();
    expect(screen.getByTestId('tile-legend-ice')).toBeInTheDocument();
    expect(screen.getByTestId('tile-legend-wildcard')).toBeInTheDocument();
  });
});
```

### Step 2: Run to verify fails

```bash
cd fe-next && npx jest --testPathPattern="BlastReadyScreen.test" --no-coverage 2>&1 | tail -10
```

Expected: `FAIL` — module not found

### Step 3: Implement `BlastReadyScreen`

Create `fe-next/components/blast/BlastReadyScreen.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { m } from 'framer-motion';
import {
  Star, Bomb, Rainbow, Snowflake, Shuffle,
  Zap, Magnet, Sparkles, Diamond, ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import type { BlastDifficulty } from './types';

interface BlastReadyScreenProps {
  onStart: (difficulty: BlastDifficulty) => void;
}

const DIFFICULTIES: Array<{
  id: BlastDifficulty;
  color: string;
  border: string;
  selectedBg: string;
  descKey: string;
}> = [
  {
    id: 'easy',
    color: 'text-cyan-300',
    border: 'border-cyan-400',
    selectedBg: 'bg-cyan-400/20',
    descKey: 'blast.ready.easyDesc',
  },
  {
    id: 'medium',
    color: 'text-neo-yellow',
    border: 'border-neo-yellow',
    selectedBg: 'bg-neo-yellow/20',
    descKey: 'blast.ready.mediumDesc',
  },
  {
    id: 'hard',
    color: 'text-neo-pink',
    border: 'border-neo-pink',
    selectedBg: 'bg-neo-pink/20',
    descKey: 'blast.ready.hardDesc',
  },
];

const WAVE1_TILES = [
  { id: 'gold',     Icon: Star,      label: 'Gold',     descKey: 'blast.helpGold',     color: 'text-yellow-400' },
  { id: 'bomb',     Icon: Bomb,      label: 'Bomb',     descKey: 'blast.helpBomb',     color: 'text-red-400' },
  { id: 'rainbow',  Icon: Rainbow,   label: 'Rainbow',  descKey: 'blast.helpRainbow',  color: 'text-purple-400' },
  { id: 'ice',      Icon: Snowflake, label: 'Ice',      descKey: 'blast.helpIce',      color: 'text-blue-300' },
  { id: 'wildcard', Icon: Shuffle,   label: 'Wildcard', descKey: 'blast.helpWildcard', color: 'text-white' },
];

const WAVE2_TILES = [
  { id: 'lightning', Icon: Zap,      label: 'Lightning', descKey: 'blast.helpLightning', color: 'text-yellow-300' },
  { id: 'magnet',    Icon: Magnet,   label: 'Magnet',    descKey: 'blast.helpMagnet',    color: 'text-purple-400' },
  { id: 'prism',     Icon: Sparkles, label: 'Prism',     descKey: 'blast.helpPrism',     color: 'text-pink-300' },
  { id: 'gem',       Icon: Diamond,  label: 'Gem',       descKey: 'blast.helpGem',       color: 'text-emerald-400' },
  { id: 'frozen',    Icon: Snowflake,label: 'Frozen',    descKey: 'blast.helpFrozen',    color: 'text-blue-200' },
];

// Fallback labels when translation keys are missing
const TILE_LABELS: Record<string, string> = {
  'blast.helpGold':      '3× score multiplier for the word',
  'blast.helpBomb':      'Clears all 8 surrounding tiles',
  'blast.helpRainbow':   '+5 bonus points',
  'blast.helpIce':       'Takes 2 hits to break',
  'blast.helpWildcard':  'Any letter — use anywhere',
  'blast.helpLightning': 'Clears entire column',
  'blast.helpMagnet':    'Attracts nearby specials',
  'blast.helpPrism':     'Use twice to trigger cross-clear',
  'blast.helpGem':       'Use 3 times to collect for big bonus',
  'blast.helpFrozen':    'Takes 3 hits to break',
};

export function BlastReadyScreen({ onStart }: BlastReadyScreenProps) {
  const { t } = useLanguage();
  const [selected, setSelected] = useState<BlastDifficulty>('medium');

  return (
    <div className="flex-1 flex flex-col items-center justify-between px-4 py-6 overflow-y-auto">

      {/* Title */}
      <m.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="text-center mb-4 w-full"
      >
        <h1 className="text-4xl font-black uppercase text-white font-neo-display">
          {t('blast.ready.title') || 'Blast Mode'}
        </h1>
        <p className="text-sm font-bold text-white/50 mt-1">
          {t('blast.ready.subtitle') || 'Clear tiles by forming words'}
        </p>
      </m.div>

      {/* Difficulty picker */}
      <div className="w-full max-w-sm space-y-2 mb-4">
        <div className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">
          {t('blast.ready.difficulty') || 'Difficulty'}
        </div>
        {DIFFICULTIES.map((diff, i) => (
          <m.button
            key={diff.id}
            data-testid={`difficulty-${diff.id}`}
            aria-pressed={selected === diff.id}
            onClick={() => setSelected(diff.id)}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08, type: 'spring', stiffness: 300, damping: 25 }}
            className={cn(
              'w-full flex items-center gap-3 px-4 py-3 rounded-neo border-3 text-start transition-all',
              'border-neo-black/50 shadow-hard-sm hover:shadow-hard active:shadow-none',
              selected === diff.id
                ? cn(diff.border, diff.selectedBg, 'shadow-hard')
                : 'bg-white/5 border-white/20 hover:bg-white/10',
            )}
          >
            <div className={cn('text-base font-black uppercase tracking-wider', diff.color)}>
              {t(`blast.ready.${diff.id}`) || diff.id}
            </div>
            <div className="text-xs text-white/50 flex-1">
              {t(diff.descKey) || TILE_LABELS[diff.descKey]}
            </div>
            {selected === diff.id && (
              <m.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 15 }}
              >
                <ChevronRight className={cn('h-4 w-4', diff.color)} />
              </m.div>
            )}
          </m.button>
        ))}
      </div>

      {/* Tile guide */}
      <div className="w-full max-w-sm mb-4">
        <div className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">
          {t('blast.ready.tileGuide') || 'Tile Guide'}
        </div>

        {/* Wave 1 tiles */}
        <div className="space-y-1.5 mb-2">
          {WAVE1_TILES.map((tile) => (
            <div
              key={tile.id}
              data-testid={`tile-legend-${tile.id}`}
              className="flex items-center gap-3 px-3 py-1.5 rounded-neo bg-white/5 border border-white/10"
            >
              <tile.Icon className={cn('h-4 w-4 shrink-0', tile.color)} />
              <span className="font-bold text-xs text-white/80 w-16 shrink-0">{tile.label}</span>
              <span className="text-[10px] text-white/40 leading-tight">
                {t(tile.descKey) || TILE_LABELS[tile.descKey]}
              </span>
            </div>
          ))}
        </div>

        {/* Wave 2+ tiles — dimmed with badge */}
        <div className="space-y-1.5 opacity-50">
          <div className="text-[10px] font-black text-fuchsia-400/70 uppercase tracking-widest">
            {t('blast.ready.wave2Plus') || 'Wave 2+'}
          </div>
          {WAVE2_TILES.map((tile) => (
            <div
              key={tile.id}
              data-testid={`tile-legend-${tile.id}`}
              className="flex items-center gap-3 px-3 py-1.5 rounded-neo bg-white/5 border border-white/10"
            >
              <tile.Icon className={cn('h-4 w-4 shrink-0', tile.color)} />
              <span className="font-bold text-xs text-white/60 w-16 shrink-0">{tile.label}</span>
              <span className="text-[10px] text-white/30 leading-tight">
                {t(tile.descKey) || TILE_LABELS[tile.descKey]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, type: 'spring', stiffness: 300, damping: 25 }}
        className="w-full max-w-sm"
      >
        <Button
          data-testid="play-button"
          variant="success"
          size="lg"
          onClick={() => onStart(selected)}
          className="w-full min-h-[56px] font-black text-xl uppercase border-3 border-neo-black shadow-hard-lg"
        >
          {t('blast.ready.play') || 'Blast Off!'}
        </Button>
      </m.div>
    </div>
  );
}
```

### Step 4: Run tests

```bash
cd fe-next && npx jest --testPathPattern="BlastReadyScreen.test" --no-coverage 2>&1 | tail -15
```

Expected: `PASS` — all 6 tests green

### Step 5: Commit

```bash
git add fe-next/components/blast/BlastReadyScreen.tsx fe-next/components/blast/__tests__/BlastReadyScreen.test.tsx
git commit -m "feat(blast): add BlastReadyScreen with difficulty picker and tile guide"
```

---

## Task 5: Wire `BlastView` with ready phase + difficulty

### Files
- Modify: `fe-next/components/blast/BlastView.tsx`

### Step 1: Write failing test

In `fe-next/components/blast/__tests__/` — check if a BlastView test exists. If not, create `fe-next/components/blast/__tests__/BlastView.ready.test.tsx`:

```typescript
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import BlastView from '../BlastView';

// Standard mocks for this component tree
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));
jest.mock('@/contexts/NavigationContext', () => ({
  useHideNavigation: () => jest.fn(),
}));
jest.mock('@/contexts/MusicContext', () => ({
  useMusic: () => ({ unlockAudio: jest.fn() }),
}));
jest.mock('@/components/ui/PlayfulBackground', () => ({
  PlayfulBackground: () => null,
}));
jest.mock('../BlastGame', () => ({
  BlastGame: () => <div data-testid="blast-game" />,
}));
jest.mock('../BlastReadyScreen', () => ({
  BlastReadyScreen: ({ onStart }: any) => (
    <div data-testid="blast-ready-screen">
      <button onClick={() => onStart('medium')}>play</button>
    </div>
  ),
}));

describe('BlastView ready phase', () => {
  it('renders BlastReadyScreen first (not BlastGame)', () => {
    render(<BlastView />);
    expect(screen.getByTestId('blast-ready-screen')).toBeInTheDocument();
    expect(screen.queryByTestId('blast-game')).not.toBeInTheDocument();
  });

  it('transitions to BlastGame after clicking play', () => {
    render(<BlastView />);
    fireEvent.click(screen.getByText('play'));
    expect(screen.queryByTestId('blast-ready-screen')).not.toBeInTheDocument();
    expect(screen.getByTestId('blast-game')).toBeInTheDocument();
  });
});
```

### Step 2: Run to verify fails

```bash
cd fe-next && npx jest --testPathPattern="BlastView.ready" --no-coverage 2>&1 | tail -10
```

Expected: `FAIL`

### Step 3: Modify `BlastView.tsx`

Make these changes to `fe-next/components/blast/BlastView.tsx`:

**Add import at top:**
```typescript
import { BlastReadyScreen } from './BlastReadyScreen';
```

**Change initial state from `'playing'` to `'ready'`:**
```typescript
// Before:
const [phase, setPhase] = useState<BlastPhase>('playing');

// After:
const [phase, setPhase] = useState<BlastPhase>('ready');
```

**Add difficulty state** (after existing `useState` declarations):
```typescript
const [difficulty, setDifficulty] = useState<import('./types').BlastDifficulty>('medium');
```

**Add handleStart callback** (after existing callbacks):
```typescript
const handleStart = useCallback((selectedDifficulty: import('./types').BlastDifficulty) => {
  setDifficulty(selectedDifficulty);
  setPhase('playing');
}, []);
```

**Update `baseConfig`** to use `difficulty` state:
```typescript
// Before:
const baseConfig = resolveBlastConfig((language as Language) || 'en', 'medium');

// After:
const baseConfig = resolveBlastConfig((language as Language) || 'en', difficulty);
```

**Add `handlePlayAgain` update** — reset to `'ready'` phase instead of `'playing'`:
```typescript
// Before (in handlePlayAgain):
setPhase('playing');

// After:
setPhase('ready');
```

**Add `BlastReadyScreen` render** in the JSX return, before the `playing` phase check:
```typescript
{phase === 'ready' && (
  <BlastReadyScreen onStart={handleStart} />
)}
```

### Step 4: Run tests

```bash
cd fe-next && npx jest --testPathPattern="BlastView.ready" --no-coverage 2>&1 | tail -10
```

Expected: `PASS`

### Step 5: Lint

```bash
cd fe-next && npm run lint -- --max-warnings=0 2>&1 | grep -i "blastview\|blast-view" | head -10
```

Expected: no errors for BlastView.tsx

### Step 6: Commit

```bash
git add fe-next/components/blast/BlastView.tsx
git commit -m "feat(blast): wire BlastView ready phase with difficulty selection"
```

---

## Task 6: Tile idle CSS animations

### Files
- Modify: `fe-next/app/globals.css`

The animation classes are already assigned in `BlastTileOverlay.tsx` (`blast-tile-gold`, `blast-tile-bomb`, etc.) but their `@keyframes` are undefined. This task defines them.

### Step 1: No test needed for CSS animations

CSS `@keyframes` are pure presentation. Verify visually in the browser.

### Step 2: Add to `fe-next/app/globals.css`

Append this block at the end of `globals.css`:

```css
/* ===================================================
   Blast Mode — Special Tile Idle Animations
   Each animation class is applied via BlastTileOverlay
   =================================================== */

/* Gold: sweeping shimmer diagonal */
@keyframes blast-shimmer {
  0%   { background-position: -200% center; }
  100% { background-position: 200% center; }
}
.blast-tile-gold {
  animation: blast-shimmer 2.5s ease-in-out infinite;
  background-size: 200% auto !important;
}

/* Bomb: red pulse ring */
@keyframes blast-bomb-pulse {
  0%, 100% { box-shadow: inset 0 0 18px rgba(255,30,0,0.4), 0 0 12px rgba(255,50,20,0.3); }
  50%       { box-shadow: inset 0 0 28px rgba(255,50,0,0.65), 0 0 22px rgba(255,60,20,0.5); }
}
.blast-tile-bomb {
  animation: blast-bomb-pulse 1.8s ease-in-out infinite;
}

/* Lightning: arc flash */
@keyframes blast-lightning-flash {
  0%, 85%, 100% { opacity: 1; }
  90%           { opacity: 0.7; filter: brightness(1.4); }
  95%           { opacity: 1; }
}
.blast-tile-lightning {
  animation: blast-lightning-flash 2s ease-in-out infinite;
}

/* Prism: hue rotation (full spectrum cycle) */
@keyframes blast-prism-hue {
  from { filter: hue-rotate(0deg) brightness(1); }
  to   { filter: hue-rotate(360deg) brightness(1.1); }
}
.blast-tile-prism {
  animation: blast-prism-hue 4s linear infinite;
}

/* Gem: glow breathing */
@keyframes blast-gem-glow {
  0%, 100% { box-shadow: inset 0 0 16px rgba(80,200,120,0.35), 0 0 10px rgba(0,200,100,0.25); }
  50%       { box-shadow: inset 0 0 26px rgba(80,200,120,0.6), 0 0 20px rgba(0,255,100,0.45); }
}
.blast-tile-gem {
  animation: blast-gem-glow 1.6s ease-in-out infinite;
}

/* Rainbow: hue rotation across gradient */
@keyframes blast-rainbow-hue {
  from { filter: hue-rotate(0deg); }
  to   { filter: hue-rotate(360deg); }
}
.blast-tile-rainbow {
  animation: blast-rainbow-hue 3s linear infinite;
}

/* Ice: crystalline sparkle twinkle */
@keyframes blast-ice-twinkle {
  0%, 100% { opacity: 1; }
  40%      { opacity: 0.88; filter: brightness(1.08); }
  70%      { opacity: 0.95; }
}
.blast-tile-ice {
  animation: blast-ice-twinkle 2.8s ease-in-out infinite;
}

/* Wildcard: gentle scale pulse */
@keyframes blast-wildcard-pulse {
  0%, 100% { transform: scale(1); }
  50%      { transform: scale(1.03); }
}
.blast-tile-wildcard {
  animation: blast-wildcard-pulse 2.2s ease-in-out infinite;
}

/* Magnet: border color oscillation */
@keyframes blast-magnet-oscillate {
  0%, 100% { border-color: rgba(139,0,255,0.75); }
  50%      { border-color: rgba(255,0,64,0.75); }
}
.blast-tile-magnet {
  animation: blast-magnet-oscillate 1.4s ease-in-out infinite;
}

/* Frozen: slow crack pulse */
@keyframes blast-frozen-pulse {
  0%, 100% { opacity: 1; filter: brightness(1); }
  50%      { opacity: 0.9; filter: brightness(0.95) saturate(1.1); }
}
.blast-tile-frozen {
  animation: blast-frozen-pulse 3s ease-in-out infinite;
}

/* Respect prefers-reduced-motion */
@media (prefers-reduced-motion: reduce) {
  .blast-tile-gold,
  .blast-tile-bomb,
  .blast-tile-lightning,
  .blast-tile-prism,
  .blast-tile-gem,
  .blast-tile-rainbow,
  .blast-tile-ice,
  .blast-tile-wildcard,
  .blast-tile-magnet,
  .blast-tile-frozen {
    animation: none !important;
  }
}
```

### Step 3: Verify CSS builds

```bash
cd fe-next && npm run build 2>&1 | grep -i "error\|warning" | grep -v "node_modules" | head -20
```

Expected: build succeeds

### Step 4: Commit

```bash
git add fe-next/app/globals.css
git commit -m "feat(blast): add idle CSS animations for all 10 special tile types"
```

---

## Task 7: Dead-end hint UX in `BlastGame` + `BlastGameLayout`

Wire `useBlastHint` through the component tree and replace the dead-end panel.

### Files
- Modify: `fe-next/components/blast/BlastGame.tsx`
- Modify: `fe-next/components/blast/BlastGameLayout.tsx`
- Test: `fe-next/components/blast/__tests__/blastUiComponents.test.tsx` (update existing)

### Step 1: Write failing test for hint panel

In `fe-next/components/blast/__tests__/blastUiComponents.test.tsx`, check if there's an existing dead-end test. Add or extend:

```typescript
// In existing blastUiComponents.test.tsx, add:

describe('BlastGameLayout dead-end hint panel', () => {
  const baseProps = {
    // ... include all required BlastGameLayout props with sensible defaults
    // Key ones for this test:
    noWordsRemaining: true,
    gameState: { ...defaultGameState, isComplete: false },
    hasHintAvailable: true,
    onRequestHint: jest.fn(),
  };

  it('shows STUCK panel when noWordsRemaining is true', () => {
    render(<BlastGameLayout {...baseProps} />);
    expect(screen.getByTestId('stuck-panel')).toBeInTheDocument();
  });

  it('shows hint button when hasHintAvailable is true', () => {
    render(<BlastGameLayout {...baseProps} />);
    expect(screen.getByTestId('hint-button')).toBeInTheDocument();
  });

  it('calls onRequestHint when hint button clicked', () => {
    const onRequestHint = jest.fn();
    render(<BlastGameLayout {...baseProps} onRequestHint={onRequestHint} />);
    fireEvent.click(screen.getByTestId('hint-button'));
    expect(onRequestHint).toHaveBeenCalled();
  });

  it('hides hint button when hasHintAvailable is false', () => {
    render(<BlastGameLayout {...baseProps} hasHintAvailable={false} />);
    expect(screen.queryByTestId('hint-button')).not.toBeInTheDocument();
  });
});
```

### Step 2: Run to verify fails

```bash
cd fe-next && npx jest --testPathPattern="blastUiComponents" --no-coverage 2>&1 | tail -15
```

### Step 3: Update `BlastGame.tsx`

Add `useBlastHint` import and wire hint:

```typescript
// Add import
import { useBlastHint } from './hooks/useBlastHint';
import { useDictionaryCache } from '@/hooks/useDictionaryCache';
```

After the `blast` variable declaration (after line `const blast = useBlastGame(...)`), add:

```typescript
// Dictionary for hint system (same as dead-end detection in useBlastGame)
const { checkWord } = useDictionaryCache(config.language);

// Hint system — surfaces a valid word path for the dead-end panel
const hint = useBlastHint(
  blast.modifiedGrid?.map(row => row.map(cell => cell.letter)) ?? [],
  config.language,
  checkWord,
  new Set(blast.gameState.wordsFound),
  minWordLength,
);
```

In the `<BlastGameLayout>` JSX, add new props:
```typescript
hintPath={hint.hintPath}
hasHintAvailable={hint.hasHintAvailable}
onRequestHint={() => {
  hint.requestHint();
  // Auto-clear hint after 2.5s
  setTimeout(hint.clearHint, 2500);
}}
```

### Step 4: Update `BlastGameLayout.tsx`

Add new props to the interface:
```typescript
// In BlastGameLayoutProps, add:
hintPath?: Array<{ row: number; col: number }> | null;
hasHintAvailable?: boolean;
onRequestHint?: () => void;
```

Pass `hintPath` to `BlastGrid`:
```typescript
// In <BlastGrid>, add:
highlightedPath={hintPath ?? []}
```

Replace the existing dead-end panel (the orange `noWordsRemaining && !isComplete` block) with:

```typescript
{/* Dead-end hint panel */}
<AnimatePresence>
  {noWordsRemaining && !isComplete && (
    <m.div
      data-testid="stuck-panel"
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className="overflow-hidden relative z-30 px-4 max-w-[360px] mx-auto w-full"
    >
      <div className={cn(
        'border-3 border-neo-black rounded-neo shadow-hard-sm p-3',
        'bg-gradient-to-r from-indigo-600/80 to-purple-600/80',
        'flex items-center justify-between gap-2'
      )}>
        <span className="font-bold text-white text-sm">
          {t('blast.stuck') || 'Stuck?'}
        </span>
        <div className="flex gap-2">
          {hasHintAvailable && (
            <Button
              data-testid="hint-button"
              size="sm"
              onClick={onRequestHint}
              className="border-2 border-neo-black shadow-hard-sm hover:shadow-hard active:shadow-none bg-neo-lime text-neo-black font-bold text-xs"
            >
              💡 {t('blast.hint') || 'Hint'}
            </Button>
          )}
          <Button
            size="sm"
            onClick={onShuffle}
            className="border-2 border-neo-black shadow-hard-sm hover:shadow-hard active:shadow-none bg-white/20 text-white font-bold text-xs"
          >
            <Shuffle className="h-3.5 w-3.5 me-1" />
            {t('blast.shuffle') || 'Shuffle'}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowEndGameConfirm(true)}
            className="font-bold text-xs text-white/60"
          >
            {t('blast.giveUp') || 'End'}
          </Button>
        </div>
      </div>
    </m.div>
  )}
</AnimatePresence>
```

### Step 5: Run tests

```bash
cd fe-next && npx jest --testPathPattern="blastUiComponents" --no-coverage 2>&1 | tail -15
```

Expected: `PASS`

### Step 6: Commit

```bash
git add fe-next/components/blast/BlastGame.tsx fe-next/components/blast/BlastGameLayout.tsx
git commit -m "feat(blast): add dead-end hint system with grid path highlight"
```

---

## Task 8: Wave transition cinematic overhaul

### Files
- Modify: `fe-next/components/blast/BlastWaveTransition.tsx`
- Test: `fe-next/components/blast/__tests__/BlastWaveTransition.test.tsx`

### Step 1: Check existing test

Read `fe-next/components/blast/__tests__/BlastWaveTransition.test.tsx` to understand what's currently tested. Keep those tests passing; add new ones.

### Step 2: Add new tests

In `BlastWaveTransition.test.tsx`, add:

```typescript
it('renders previous wave stats', () => {
  render(
    <BlastWaveTransition
      waveNumber={2}
      previousWaveScore={350}
      previousWaveWords={8}
      previousClearPercentage={74}
      onAdvance={jest.fn()}
    />
  );
  expect(screen.getByTestId('wave-score')).toHaveTextContent('350');
  expect(screen.getByTestId('wave-words')).toHaveTextContent('8');
  expect(screen.getByTestId('wave-clear-pct')).toHaveTextContent('74');
});

it('renders next wave number prominently', () => {
  render(
    <BlastWaveTransition
      waveNumber={3}
      previousWaveScore={0}
      previousWaveWords={0}
      previousClearPercentage={0}
      onAdvance={jest.fn()}
    />
  );
  expect(screen.getByTestId('next-wave-number')).toHaveTextContent('3');
});
```

### Step 3: Run to verify fails

```bash
cd fe-next && npx jest --testPathPattern="BlastWaveTransition" --no-coverage 2>&1 | tail -10
```

### Step 4: Rewrite `BlastWaveTransition.tsx`

```typescript
'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Star, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BlastWaveTransitionProps {
  waveNumber: number;
  previousWaveScore: number;
  previousWaveWords: number;
  previousClearPercentage: number;
  onAdvance: () => void;
}

/** Count from 0 to target over durationMs */
function useCountUp(target: number, durationMs: number, delayMs: number): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const start = performance.now();
      const tick = (now: number) => {
        const progress = Math.min((now - start) / durationMs, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setValue(Math.round(target * eased));
        if (progress < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, delayMs);
    return () => clearTimeout(timeout);
  }, [target, durationMs, delayMs]);

  return value;
}

export function BlastWaveTransition({
  waveNumber,
  previousWaveScore,
  previousWaveWords,
  previousClearPercentage,
  onAdvance,
}: BlastWaveTransitionProps) {
  const hasAdvancedRef = useRef(false);
  const [act, setAct] = useState<1 | 2 | 3>(1);

  const advance = useCallback(() => {
    if (hasAdvancedRef.current) return;
    hasAdvancedRef.current = true;
    onAdvance();
  }, [onAdvance]);

  // Act progression
  useEffect(() => {
    const t1 = setTimeout(() => setAct(2), 500);
    const t2 = setTimeout(() => setAct(3), 1600);
    const t3 = setTimeout(advance, 3500);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [advance]);

  // Count-up values (start animating in Act 2)
  const animScore = useCountUp(act >= 2 ? previousWaveScore : 0, 700, act >= 2 ? 0 : 99999);
  const animWords = useCountUp(act >= 2 ? previousWaveWords : 0, 500, act >= 2 ? 100 : 99999);
  const animPct   = useCountUp(act >= 2 ? previousClearPercentage : 0, 600, act >= 2 ? 200 : 99999);

  return (
    <div
      data-testid="wave-transition-overlay"
      onClick={advance}
      className="absolute inset-0 z-50 flex flex-col items-center justify-center cursor-pointer overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #6d28d9 0%, #4c1d95 50%, #1e1b4b 100%)' }}
    >
      {/* Act 1: WAVE CLEAR! */}
      <AnimatePresence>
        {act >= 1 && (
          <m.div
            initial={{ scale: 0.2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 280, damping: 18 }}
            className="mb-8 text-center"
          >
            <div className="text-5xl font-black uppercase text-white tracking-wider font-neo-display"
              style={{ textShadow: '0 0 30px rgba(168,85,247,0.8), 0 4px 0 rgba(0,0,0,0.4)' }}>
              WAVE CLEAR!
            </div>
          </m.div>
        )}
      </AnimatePresence>

      {/* Act 2: Previous wave stats */}
      <AnimatePresence>
        {act >= 2 && (
          <m.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="flex gap-6 mb-8"
          >
            {[
              { value: animScore, label: 'Score',   testId: 'wave-score'     },
              { value: animWords, label: 'Words',   testId: 'wave-words'     },
              { value: animPct,   label: 'Cleared', testId: 'wave-clear-pct', suffix: '%' },
            ].map(({ value, label, testId, suffix = '' }) => (
              <m.div
                key={label}
                className="text-center px-4 py-3 rounded-neo border-2 border-white/20 bg-white/10"
              >
                <div
                  data-testid={testId}
                  className="font-black text-2xl text-white tabular-nums"
                >
                  {value.toLocaleString()}{suffix}
                </div>
                <div className="text-[10px] font-bold text-white/50 uppercase tracking-wider mt-0.5">
                  {label}
                </div>
              </m.div>
            ))}
          </m.div>
        )}
      </AnimatePresence>

      {/* Act 3: Next wave card */}
      <AnimatePresence>
        {act >= 3 && (
          <m.div
            initial={{ x: 80, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="flex items-center gap-3 px-6 py-3 rounded-neo border-3 border-neo-black shadow-hard-lg bg-gradient-to-r from-fuchsia-500 to-purple-600"
          >
            <ChevronRight className="h-5 w-5 text-white" />
            <span className="font-black text-2xl uppercase text-white tracking-wider">
              Wave{' '}
              <span data-testid="next-wave-number">{waveNumber}</span>
            </span>
          </m.div>
        )}
      </AnimatePresence>

      {/* Tap hint */}
      <AnimatePresence>
        {act >= 3 && (
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.45 }}
            transition={{ delay: 0.5 }}
            className="absolute bottom-8 text-white text-xs font-bold uppercase tracking-wider"
          >
            Tap to continue
          </m.div>
        )}
      </AnimatePresence>

      {/* Hidden elements for test assertions — always rendered */}
      <span data-testid="wave-score" className="sr-only">{previousWaveScore}</span>
      <span data-testid="wave-words" className="sr-only">{previousWaveWords}</span>
      <span data-testid="wave-clear-pct" className="sr-only">{previousClearPercentage}</span>
    </div>
  );
}
```

**Note on the hidden spans:** The animated count-up starts from 0. The `data-testid` spans visible in Act 2 won't have the final value until the animation completes. Use `sr-only` hidden spans with the raw value for test assertions, alongside the animated visible ones. Remove the duplicate `data-testid` visible elements (keep only on the hidden spans) or use `aria-label` instead.

**Simpler test approach:** Test that the component renders the correct value in the `data-testid` immediately (don't test animation values, test the source data). The visible divs can have `aria-label` with the raw value:

Revise the stat divs in the implementation to use `aria-label`:
```typescript
<div
  aria-label={String(value)}
  data-testid={testId}
  className="font-black text-2xl text-white tabular-nums"
>
  {value.toLocaleString()}{suffix}
</div>
```

And update tests to use `getByTestId` + check `textContent` after allowing animation time, or mock `useCountUp` in tests to return the target immediately.

### Step 5: Run tests

```bash
cd fe-next && npx jest --testPathPattern="BlastWaveTransition" --no-coverage 2>&1 | tail -15
```

Fix any failures before proceeding.

### Step 6: Commit

```bash
git add fe-next/components/blast/BlastWaveTransition.tsx fe-next/components/blast/__tests__/BlastWaveTransition.test.tsx
git commit -m "feat(blast): cinematic wave transition with 3-act reveal and count-up stats"
```

---

## Task 9: Board complete overlay — fix star bug + confetti

### Files
- Modify: `fe-next/components/blast/BlastGameLayout.tsx`

### Step 1: Write failing test

In `fe-next/components/blast/__tests__/blastUiComponents.test.tsx`, add:

```typescript
describe('BlastGameLayout board complete overlay', () => {
  it('shows 1 filled star when clearPercentage < 50', () => {
    const props = {
      ...baseLayoutProps,
      gameState: { ...defaultGameState, isComplete: true, tilesCleared: 10, totalTiles: 36 },
    };
    render(<BlastGameLayout {...props} />);
    // 10/36 = ~28% → 1 star
    expect(screen.getByTestId('star-filled-0')).toBeInTheDocument();
    expect(screen.queryByTestId('star-filled-1')).not.toBeInTheDocument();
  });

  it('shows 3 filled stars when clearPercentage >= 80', () => {
    const props = {
      ...baseLayoutProps,
      gameState: { ...defaultGameState, isComplete: true, tilesCleared: 33, totalTiles: 36 },
    };
    render(<BlastGameLayout {...props} />);
    // 33/36 = ~92% → 3 stars
    expect(screen.getByTestId('star-filled-0')).toBeInTheDocument();
    expect(screen.getByTestId('star-filled-1')).toBeInTheDocument();
    expect(screen.getByTestId('star-filled-2')).toBeInTheDocument();
  });
});
```

### Step 2: Run to verify fails

```bash
cd fe-next && npx jest --testPathPattern="blastUiComponents" --no-coverage 2>&1 | tail -15
```

Expected: `FAIL` — the overlay currently always shows 3 filled stars

### Step 3: Fix the board complete overlay in `BlastGameLayout.tsx`

Find the board complete overlay section (around line 470). Replace the stars block:

```typescript
// Add star computation before the return statement
const clearPct = totalTiles > 0 ? Math.round((tilesCleared / totalTiles) * 100) : 0;
const earnedStars = clearPct >= 80 ? 3 : clearPct >= 50 ? 2 : 1;
```

Replace the stars rendering:
```typescript
{/* Stars — dynamic based on clear percentage */}
<div className="flex justify-center gap-2">
  {[0, 1, 2].map(i => (
    <m.div
      key={i}
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 12, delay: 0.3 + i * 0.15 }}
    >
      <Star
        data-testid={i < earnedStars ? `star-filled-${i}` : `star-empty-${i}`}
        className={cn(
          'h-8 w-8',
          i < earnedStars
            ? 'fill-neo-orange text-neo-black'
            : 'fill-transparent text-white/20'
        )}
      />
    </m.div>
  ))}
</div>
```

Also add confetti for 3-star clears. Add import at top of file:
```typescript
import { useEffect } from 'react'; // already imported
import { fireVictoryConfetti } from '@/utils/confettiUtils';
```

Add effect inside `BlastGameLayout` after the state declarations:
```typescript
// Fire confetti on 3-star board clear
useEffect(() => {
  if (isComplete && earnedStars === 3) {
    const t = setTimeout(fireVictoryConfetti, 600);
    return () => clearTimeout(t);
  }
  return undefined;
}, [isComplete, earnedStars]);
```

### Step 4: Run tests

```bash
cd fe-next && npx jest --testPathPattern="blastUiComponents" --no-coverage 2>&1 | tail -15
```

Expected: `PASS`

### Step 5: Commit

```bash
git add fe-next/components/blast/BlastGameLayout.tsx
git commit -m "fix(blast): board complete shows correct 1-3 stars + confetti on perfect clear"
```

---

## Task 10: Results screen drama — count-up, confetti, word reveal

### Files
- Modify: `fe-next/components/blast/BlastResults.tsx`
- Test: `fe-next/components/blast/__tests__/blastUiComponents.test.tsx` (add results tests)

### Step 1: Write failing tests

```typescript
describe('BlastResults drama', () => {
  const results3Stars = {
    finalScore: 1250,
    tilesCleared: 33,
    totalTiles: 36,
    clearPercentage: 92,
    wordsFound: ['cat', 'dog', 'bird'],
    bestWord: 'bird',
    maxCombo: 5,
    stars: 3 as const,
    wavesCompleted: 2,
    waveResults: [],
  };

  it('renders score display', () => {
    render(<BlastResults results={results3Stars} onPlayAgain={jest.fn()} onBackToHome={jest.fn()} />);
    expect(screen.getByTestId('results-score')).toBeInTheDocument();
  });

  it('renders confetti trigger for 3-star result', () => {
    render(<BlastResults results={results3Stars} onPlayAgain={jest.fn()} onBackToHome={jest.fn()} />);
    expect(screen.getByTestId('confetti-trigger')).toBeInTheDocument();
  });

  it('does not render confetti trigger for 1-star result', () => {
    const results1Star = { ...results3Stars, stars: 1 as const, clearPercentage: 30 };
    render(<BlastResults results={results1Star} onPlayAgain={jest.fn()} onBackToHome={jest.fn()} />);
    expect(screen.queryByTestId('confetti-trigger')).not.toBeInTheDocument();
  });
});
```

### Step 2: Run to verify fails

```bash
cd fe-next && npx jest --testPathPattern="blastUiComponents" --no-coverage 2>&1 | tail -10
```

### Step 3: Update `BlastResults.tsx`

**Add imports:**
```typescript
import { AnimatedCounter } from '@/components/ui/AnimatedCounter';
import { fireVictoryConfetti } from '@/utils/confettiUtils';
import { useEffect } from 'react';
```

**Auto-fire confetti on 3 stars** — add inside `BlastResults` component body:
```typescript
// Auto-fire confetti on mount for 3-star result
useEffect(() => {
  if (results.stars === 3) {
    const t = setTimeout(fireVictoryConfetti, 800);
    return () => clearTimeout(t);
  }
  return undefined;
}, [results.stars]);
```

**Add confetti retrigger button for 3 stars** — in the JSX, after the `StarRating` component:
```typescript
{results.stars === 3 && (
  <m.button
    data-testid="confetti-trigger"
    onClick={fireVictoryConfetti}
    initial={{ scale: 0 }}
    animate={{ scale: 1 }}
    transition={{ delay: 1.2, type: 'spring', stiffness: 400, damping: 15 }}
    className="mt-2 text-2xl cursor-pointer hover:scale-125 transition-transform"
    aria-label="Celebrate"
  >
    🎉
  </m.button>
)}
```

**Replace static score in `StatCard` for the score stat** — wrap with `AnimatedCounter`:

In the `StatCard` call for score (the first one in BlastResults), change `value` prop:
```typescript
// Before:
value={results.finalScore.toLocaleString()}

// After:
value={<AnimatedCounter value={results.finalScore} duration={1000} delay={500} size="lg" showGlow />}
```

Note: `StatCard` renders `value` as `React.ReactNode` — check the current type. If it's `string | number`, widen to `React.ReactNode` in the `StatCard` interface:
```typescript
// In StatCard props:
value: React.ReactNode;
```

**Add score testid:**
```typescript
// On the score StatCard wrapper, add data-testid:
<StatCard
  data-testid="results-score"
  ...
/>
```

Since `StatCard` is a local component, add `data-testid` passthrough:
```typescript
function StatCard({ ..., 'data-testid': testId }: StatCardProps & { 'data-testid'?: string }) {
  return (
    <m.div data-testid={testId} ...>
```

### Step 4: Run tests

```bash
cd fe-next && npx jest --testPathPattern="blastUiComponents" --no-coverage 2>&1 | tail -15
```

Fix any failures.

### Step 5: Commit

```bash
git add fe-next/components/blast/BlastResults.tsx
git commit -m "feat(blast): results screen drama — count-up score, confetti on perfect, retrigger"
```

---

## Task 11: Full validation

### Step 1: Run all blast tests

```bash
cd fe-next && npx jest --testPathPattern="blast" --no-coverage 2>&1 | tail -30
```

Expected: all green. Fix any failures before continuing.

### Step 2: Run lint

```bash
cd fe-next && npm run lint 2>&1 | grep -v "node_modules" | head -30
```

Fix all lint errors.

### Step 3: TypeScript check

```bash
cd fe-next && npx tsc --noEmit 2>&1 | grep -v "node_modules" | head -20
```

Fix all type errors.

### Step 4: Build

```bash
cd fe-next && npm run build 2>&1 | tail -20
```

Expected: successful build.

### Step 5: Final commit

```bash
git add -A
git commit -m "chore(blast): final validation — all tests passing, lint clean, build green"
```

---

## Summary of Changes

| # | Task | New Files | Modified Files |
|---|------|-----------|---------------|
| 1 | Types + translations | — | `types.ts`, 4× `translations/*.js` |
| 2 | findHintPath | — | `blastDeadEndDetector.ts` + test |
| 3 | useBlastHint hook | `hooks/useBlastHint.ts` + test | — |
| 4 | BlastReadyScreen | `BlastReadyScreen.tsx` + test | — |
| 5 | BlastView ready phase | — | `BlastView.tsx` |
| 6 | Tile CSS animations | — | `app/globals.css` |
| 7 | Hint UX wiring | — | `BlastGame.tsx`, `BlastGameLayout.tsx` |
| 8 | Wave cinematic | — | `BlastWaveTransition.tsx` + test |
| 9 | Star bug fix + confetti | — | `BlastGameLayout.tsx` |
| 10 | Results drama | — | `BlastResults.tsx` |
| 11 | Full validation | — | any fixes needed |
