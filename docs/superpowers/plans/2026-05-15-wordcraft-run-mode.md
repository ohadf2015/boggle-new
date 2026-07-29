# WordCraft Run Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework WordCraft from a Scrabble-vs-bot clone into a solo, run-based word game with a roguelike power-card twist.

**Architecture:** New run logic lives isolated in `lib/word-craft/run/`. It reuses the existing, working tile-placement core (`board.ts`, `placement.ts`, `moveValidator.ts`, `tileBag.ts`) and the Pixi scene system. A new `RunPageClient` orchestrates a phase state machine (intro → playing → roundResult → cardPick → runResult). The legacy Scrabble-vs-bot path stays intact behind a feature flag for one release, then gets deleted.

**Tech Stack:** Next.js 16 App Router, TypeScript, React `useReducer`, Vitest, Pixi.js + GSAP, PostHog feature flags.

---

## File Structure

**New — `lib/word-craft/run/`**
- `runTypes.ts` — `RunState`, `RoundState`, `RunPhase`, run action types.
- `runTargets.ts` — escalating score-target + bag-size curve.
- `powerCards.ts` — `PowerCard` type, `POWER_CARD_POOL` (12 cards), `drawCardChoices`.
- `cardEffects.ts` — `applyCardEffects` folds active cards into a `{chips, mult, total}` word score.
- `runReducer.ts` — pure reducer + `buildInitialRunState`.
- `useWordCraftRun.ts` — React hook wrapping the reducer; does dictionary validation + scoring.

**Modified lib**
- `lib/word-craft/board.ts` — add 7×7 and 9×9 premium layouts + `BoardSize` union.
- `lib/word-craft/scoring.ts` — add `scoreWordChips` (legacy `scoreWord`/`scoreTurn` untouched).

**New components — `components/word-craft/run/`**
- `PowerCardView.tsx` — single power card, rarity-tiered.
- `CardPickScreen.tsx` — 3-card choice screen.
- `RunHUD.tsx` — round / target / score / active-card chips.
- `RoundResultScene.tsx` — pass/fail summary + proceed CTA.
- `RunResultScene.tsx` — final total, cards taken, shareable summary.

**New Pixi scenes — `lib/word-craft/pixi/scenes/`**
- `cardRevealPop.ts`, `multiplierPop.ts`, `targetHitBurst.ts`.

**New hook — `hooks/useWordCraftRunFlag.ts`** — PostHog-gated flag, dev override.

**Modified**
- `app/[locale]/word-craft/PageClient.tsx` — branch on flag → `RunPageClient` or legacy.
- `app/[locale]/word-craft/RunPageClient.tsx` — NEW orchestrator (< 500 lines).
- `translations/{en,he,sv,ja,es}.js` — `wordcraft.run.*` namespace.

**Conventions**
- Tests: Vitest, co-located in `__tests__/`, `*.spec.ts(x)`.
- Run a single test file: `cd fe-next && npx vitest run <path>`
- Lint: `cd fe-next && npm run lint`
- Build verification: `cd fe-next && npm run build:fast`
- All commits from inside `fe-next/` is fine (git works on the tree); paths below are relative to `fe-next/`.

---

## Task 1: Extend board.ts for 7×7 and 9×9 boards

**Files:**
- Modify: `fe-next/lib/word-craft/board.ts`
- Test: `fe-next/lib/word-craft/__tests__/board.spec.ts` (existing — add cases)

- [ ] **Step 1: Read the existing board.ts**

Read `fe-next/lib/word-craft/board.ts` in full. Identify three things: (a) the `BoardSize` type union, (b) the `createBoard` size guard (`if (size !== 11 && size !== 13 && size !== 15) throw ...`), (c) the function that maps a size to its premium layout (named `getPremiumForSize` or similar, using `PREMIUM_LAYOUT_11/13/15` and `CHAR_TO_PREMIUM`).

- [ ] **Step 2: Write the failing test**

Add to `fe-next/lib/word-craft/__tests__/board.spec.ts`:

```typescript
import { createBoard, PREMIUM_LAYOUT_7, PREMIUM_LAYOUT_9 } from '../board';

describe('small run-mode boards', () => {
  it('creates a 7x7 board with center at (3,3)', () => {
    const board = createBoard(7);
    expect(board.size).toBe(7);
    expect(board.cells.length).toBe(7);
    expect(board.cells[3].length).toBe(7);
  });

  it('creates a 9x9 board with center at (4,4)', () => {
    const board = createBoard(9);
    expect(board.size).toBe(9);
    expect(board.cells.length).toBe(9);
  });

  it('7x7 premium layout is 4-way mirror symmetric', () => {
    const L = PREMIUM_LAYOUT_7;
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        expect(L[r][c]).toBe(L[r][6 - c]); // horizontal mirror
        expect(L[r][c]).toBe(L[6 - r][c]); // vertical mirror
      }
    }
  });

  it('9x9 premium layout is 4-way mirror symmetric', () => {
    const L = PREMIUM_LAYOUT_9;
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        expect(L[r][c]).toBe(L[r][8 - c]);
        expect(L[r][c]).toBe(L[8 - r][c]);
      }
    }
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd fe-next && npx vitest run lib/word-craft/__tests__/board.spec.ts`
Expected: FAIL — `PREMIUM_LAYOUT_7` is not exported / `createBoard(7)` throws.

- [ ] **Step 4: Add the two premium layouts to board.ts**

Add near the existing `PREMIUM_LAYOUT_11` constant:

```typescript
export const PREMIUM_LAYOUT_7: readonly string[] = [
  'T..d..T',
  '.D...D.',
  '..t.t..',
  'd..*..d',
  '..t.t..',
  '.D...D.',
  'T..d..T',
];

export const PREMIUM_LAYOUT_9: readonly string[] = [
  'T...D...T',
  '.d.....d.',
  '..t...t..',
  '...D.D...',
  'D...*...D',
  '...D.D...',
  '..t...t..',
  '.d.....d.',
  'T...D...T',
];
```

- [ ] **Step 5: Extend the BoardSize type and size guard**

Change the `BoardSize` union from `11 | 13 | 15` to:

```typescript
export type BoardSize = 7 | 9 | 11 | 13 | 15;
```

In `createBoard`, change the guard to allow the new sizes:

```typescript
if (size !== 7 && size !== 9 && size !== 11 && size !== 13 && size !== 15) {
  throw new Error(`Board size must be 7, 9, 11, 13, or 15, got ${size}`);
}
```

- [ ] **Step 6: Wire the layouts into the size→layout mapping**

In the layout-selection function found in Step 1 (e.g. `getPremiumForSize` or `layoutForSize`), add cases for the new sizes alongside the existing `11/13/15` cases:

```typescript
case 7: return PREMIUM_LAYOUT_7;
case 9: return PREMIUM_LAYOUT_9;
```

(If the function uses an object map instead of a switch, add `7: PREMIUM_LAYOUT_7, 9: PREMIUM_LAYOUT_9` to the map.)

- [ ] **Step 7: Run tests to verify they pass**

Run: `cd fe-next && npx vitest run lib/word-craft/__tests__/board.spec.ts`
Expected: PASS — all board tests including the 4 new ones.

- [ ] **Step 8: Commit**

```bash
git add fe-next/lib/word-craft/board.ts fe-next/lib/word-craft/__tests__/board.spec.ts
git commit -m "feat(word-craft): add 7x7 and 9x9 premium board layouts for run mode"
```

---

## Task 2: Add scoreWordChips to scoring.ts

**Files:**
- Modify: `fe-next/lib/word-craft/scoring.ts`
- Test: `fe-next/lib/word-craft/__tests__/scoring.spec.ts` (existing — add cases)

- [ ] **Step 1: Write the failing test**

Add to `fe-next/lib/word-craft/__tests__/scoring.spec.ts`:

```typescript
import { scoreWordChips } from '../scoring';
import type { ScoringTile } from '../types';

describe('scoreWordChips', () => {
  const tile = (letter: string, value: number, premium: ScoringTile['premium'] = null): ScoringTile => ({
    letter, value, premium,
  });

  it('sums letter values into chips with baseMult 1 when no premiums', () => {
    const result = scoreWordChips([tile('C', 3), tile('A', 1), tile('T', 1)]);
    expect(result).toEqual({ chips: 5, baseMult: 1 });
  });

  it('applies DL/TL letter multipliers to chips', () => {
    const result = scoreWordChips([tile('C', 3, 'DL'), tile('A', 1, 'TL'), tile('T', 1)]);
    expect(result.chips).toBe(3 * 2 + 1 * 3 + 1); // 10
    expect(result.baseMult).toBe(1);
  });

  it('accumulates DW/TW into baseMult, not chips', () => {
    const result = scoreWordChips([tile('C', 3, 'DW'), tile('A', 1, 'TW'), tile('T', 1)]);
    expect(result.chips).toBe(5);
    expect(result.baseMult).toBe(2 * 3); // 6
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd fe-next && npx vitest run lib/word-craft/__tests__/scoring.spec.ts`
Expected: FAIL — `scoreWordChips` is not exported.

- [ ] **Step 3: Add scoreWordChips to scoring.ts**

Append to `fe-next/lib/word-craft/scoring.ts` (leave `scoreWord`, `scoreTurn`, `BINGO_*` untouched):

```typescript
export function scoreWordChips(tiles: readonly ScoringTile[]): { chips: number; baseMult: number } {
  let chips = 0;
  let baseMult = 1;
  for (const tile of tiles) {
    let letterScore = tile.value;
    if (tile.premium === 'DL') letterScore *= 2;
    else if (tile.premium === 'TL') letterScore *= 3;
    chips += letterScore;
    if (tile.premium === 'DW') baseMult *= 2;
    else if (tile.premium === 'TW') baseMult *= 3;
  }
  return { chips, baseMult };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd fe-next && npx vitest run lib/word-craft/__tests__/scoring.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add fe-next/lib/word-craft/scoring.ts fe-next/lib/word-craft/__tests__/scoring.spec.ts
git commit -m "feat(word-craft): add scoreWordChips for chips x mult scoring"
```

---

## Task 3: Create powerCards.ts (card pool + effects)

**Files:**
- Create: `fe-next/lib/word-craft/run/powerCards.ts`
- Test: `fe-next/lib/word-craft/run/__tests__/powerCards.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `fe-next/lib/word-craft/run/__tests__/powerCards.spec.ts`:

```typescript
import { POWER_CARD_POOL, drawCardChoices } from '../powerCards';
import type { ScoreContext } from '../powerCards';
import type { ScoringTile } from '../../types';

const tile = (letter: string, value: number, premium: ScoringTile['premium'] = null): ScoringTile => ({
  letter, value, premium,
});
const card = (id: string) => {
  const c = POWER_CARD_POOL.find((x) => x.id === id);
  if (!c) throw new Error(`card ${id} missing`);
  return c;
};
const baseCtx = (over: Partial<ScoreContext> = {}): ScoreContext => ({
  wordTiles: [tile('C', 3), tile('A', 1), tile('T', 1)],
  wordLength: 3,
  wordIndexInRound: 0,
  baseChips: 5,
  baseMult: 1,
  ...over,
});

describe('POWER_CARD_POOL', () => {
  it('has 12 cards with unique ids', () => {
    expect(POWER_CARD_POOL.length).toBe(12);
    expect(new Set(POWER_CARD_POOL.map((c) => c.id)).size).toBe(12);
  });

  it('vowelPower adds +2 chips per vowel', () => {
    const mod = card('vowelPower').scoreEffect!(baseCtx());
    expect(mod.addChips).toBe(2); // one vowel: A
  });

  it('longGame doubles mult for 5+ letter words only', () => {
    expect(card('longGame').scoreEffect!(baseCtx({ wordLength: 3 })).mulMult).toBe(1);
    expect(card('longGame').scoreEffect!(baseCtx({ wordLength: 5 })).mulMult).toBe(2);
  });

  it('combo adds +1 mult per word after the first', () => {
    expect(card('combo').scoreEffect!(baseCtx({ wordIndexInRound: 0 })).addMult).toBe(0);
    expect(card('combo').scoreEffect!(baseCtx({ wordIndexInRound: 3 })).addMult).toBe(3);
  });

  it('premiumHunter adds +1 mult per premium tile used', () => {
    const ctx = baseCtx({ wordTiles: [tile('C', 3, 'DL'), tile('A', 1, 'TW'), tile('T', 1)] });
    expect(card('premiumHunter').scoreEffect!(ctx).addMult).toBe(2);
  });

  it('doubleDown triples mult on the first word only', () => {
    expect(card('doubleDown').scoreEffect!(baseCtx({ wordIndexInRound: 0 })).mulMult).toBe(3);
    expect(card('doubleDown').scoreEffect!(baseCtx({ wordIndexInRound: 1 })).mulMult).toBe(1);
  });

  it('rareLetters adds +3 chips per tile worth 4+', () => {
    const ctx = baseCtx({ wordTiles: [tile('Q', 10), tile('A', 1), tile('Z', 10)] });
    expect(card('rareLetters').scoreEffect!(ctx).addChips).toBe(6);
  });

  it('shortSweet adds +15 chips only to 3-letter words', () => {
    expect(card('shortSweet').scoreEffect!(baseCtx({ wordLength: 3 })).addChips).toBe(15);
    expect(card('shortSweet').scoreEffect!(baseCtx({ wordLength: 4 })).addChips).toBe(0);
  });

  it('steadyBuild adds a flat +5 chips', () => {
    expect(card('steadyBuild').scoreEffect!(baseCtx()).addChips).toBe(5);
  });

  it('overflow returns 10% of score above target as a round-end bonus', () => {
    expect(card('overflow').roundEndBonus!(150, 100)).toBe(5);
    expect(card('overflow').roundEndBonus!(80, 100)).toBe(0);
  });

  it('setup cards expose roundSetup', () => {
    expect(card('wildcardStash').roundSetup).toEqual({ extraBlankTiles: 1 });
    expect(card('quickHands').roundSetup).toEqual({ extraBagTiles: 4 });
    expect(card('letterHoard').roundSetup).toEqual({ rackSize: 10 });
  });
});

describe('drawCardChoices', () => {
  it('is deterministic for a given seed', () => {
    const a = drawCardChoices(42, [], 3).map((c) => c.id);
    const b = drawCardChoices(42, [], 3).map((c) => c.id);
    expect(a).toEqual(b);
  });

  it('excludes already-owned card ids', () => {
    const owned = POWER_CARD_POOL.slice(0, 9).map((c) => c.id);
    const drawn = drawCardChoices(7, owned, 3);
    expect(drawn.length).toBe(3);
    drawn.forEach((c) => expect(owned).not.toContain(c.id));
  });

  it('returns at most the available pool size', () => {
    const owned = POWER_CARD_POOL.slice(0, 11).map((c) => c.id);
    expect(drawCardChoices(1, owned, 3).length).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd fe-next && npx vitest run lib/word-craft/run/__tests__/powerCards.spec.ts`
Expected: FAIL — module `../powerCards` does not exist.

- [ ] **Step 3: Create powerCards.ts**

Create `fe-next/lib/word-craft/run/powerCards.ts`:

```typescript
import { mulberry32 } from '@/utils/dailyChallenge/prng';
import type { ScoringTile } from '../types';

export type CardRarity = 'common' | 'rare' | 'legendary';

export interface ScoreContext {
  wordTiles: readonly ScoringTile[];
  wordLength: number;
  wordIndexInRound: number;
  baseChips: number;
  baseMult: number;
}

export interface ScoreModifier {
  addChips: number;
  addMult: number;
  mulMult: number;
}

export interface PowerCardRoundSetup {
  extraBagTiles?: number;
  extraBlankTiles?: number;
  rackSize?: number;
}

export interface PowerCard {
  id: string;
  rarity: CardRarity;
  scoreEffect?: (ctx: ScoreContext) => ScoreModifier;
  roundSetup?: PowerCardRoundSetup;
  roundEndBonus?: (roundScore: number, target: number) => number;
}

const VOWELS = new Set(['A', 'E', 'I', 'O', 'U']);
const NONE: ScoreModifier = { addChips: 0, addMult: 0, mulMult: 1 };

export const POWER_CARD_POOL: readonly PowerCard[] = [
  {
    id: 'vowelPower',
    rarity: 'common',
    scoreEffect: (ctx) => ({
      ...NONE,
      addChips: ctx.wordTiles.filter((t) => VOWELS.has(t.letter.toUpperCase())).length * 2,
    }),
  },
  {
    id: 'longGame',
    rarity: 'common',
    scoreEffect: (ctx) => ({ ...NONE, mulMult: ctx.wordLength >= 5 ? 2 : 1 }),
  },
  {
    id: 'combo',
    rarity: 'common',
    scoreEffect: (ctx) => ({ ...NONE, addMult: ctx.wordIndexInRound }),
  },
  {
    id: 'premiumHunter',
    rarity: 'rare',
    scoreEffect: (ctx) => ({
      ...NONE,
      addMult: ctx.wordTiles.filter((t) => t.premium !== null).length,
    }),
  },
  { id: 'wildcardStash', rarity: 'common', roundSetup: { extraBlankTiles: 1 } },
  { id: 'quickHands', rarity: 'common', roundSetup: { extraBagTiles: 4 } },
  {
    id: 'doubleDown',
    rarity: 'rare',
    scoreEffect: (ctx) => ({ ...NONE, mulMult: ctx.wordIndexInRound === 0 ? 3 : 1 }),
  },
  {
    id: 'rareLetters',
    rarity: 'rare',
    scoreEffect: (ctx) => ({
      ...NONE,
      addChips: ctx.wordTiles.filter((t) => t.value >= 4).length * 3,
    }),
  },
  {
    id: 'shortSweet',
    rarity: 'common',
    scoreEffect: (ctx) => ({ ...NONE, addChips: ctx.wordLength === 3 ? 15 : 0 }),
  },
  {
    id: 'steadyBuild',
    rarity: 'common',
    scoreEffect: () => ({ ...NONE, addChips: 5 }),
  },
  {
    id: 'overflow',
    rarity: 'legendary',
    roundEndBonus: (roundScore, target) =>
      roundScore > target ? Math.round((roundScore - target) * 0.1) : 0,
  },
  { id: 'letterHoard', rarity: 'legendary', roundSetup: { rackSize: 10 } },
];

export function drawCardChoices(
  seed: number,
  excludeIds: readonly string[],
  n: number,
): PowerCard[] {
  const rng = mulberry32(seed);
  const pool = POWER_CARD_POOL.filter((c) => !excludeIds.includes(c.id));
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.min(n, pool.length));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd fe-next && npx vitest run lib/word-craft/run/__tests__/powerCards.spec.ts`
Expected: PASS — all 15 tests.

- [ ] **Step 5: Commit**

```bash
git add fe-next/lib/word-craft/run/powerCards.ts fe-next/lib/word-craft/run/__tests__/powerCards.spec.ts
git commit -m "feat(word-craft): add power card pool and seeded card draw"
```

---

## Task 4: Create cardEffects.ts (fold cards into word score)

**Files:**
- Create: `fe-next/lib/word-craft/run/cardEffects.ts`
- Test: `fe-next/lib/word-craft/run/__tests__/cardEffects.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `fe-next/lib/word-craft/run/__tests__/cardEffects.spec.ts`:

```typescript
import { applyCardEffects } from '../cardEffects';
import { POWER_CARD_POOL } from '../powerCards';
import type { ScoreContext } from '../powerCards';
import type { ScoringTile } from '../../types';

const tile = (letter: string, value: number, premium: ScoringTile['premium'] = null): ScoringTile => ({
  letter, value, premium,
});
const card = (id: string) => POWER_CARD_POOL.find((c) => c.id === id)!;
const ctx = (over: Partial<ScoreContext> = {}): ScoreContext => ({
  wordTiles: [tile('C', 3), tile('A', 1), tile('T', 1)],
  wordLength: 3,
  wordIndexInRound: 0,
  baseChips: 5,
  baseMult: 1,
  ...over,
});

describe('applyCardEffects', () => {
  it('returns base chips x baseMult when no cards active', () => {
    expect(applyCardEffects(ctx(), [])).toEqual({ chips: 5, mult: 1, total: 5 });
  });

  it('adds card chip bonuses before multiplying', () => {
    // steadyBuild +5 chips => (5+5) * 1 = 10
    expect(applyCardEffects(ctx(), [card('steadyBuild')])).toEqual({ chips: 10, mult: 1, total: 10 });
  });

  it('adds addMult into the multiplier sum', () => {
    // combo at wordIndex 2 => addMult 2 => mult (1+2) = 3 => 5*3 = 15
    expect(applyCardEffects(ctx({ wordIndexInRound: 2 }), [card('combo')])).toEqual({
      chips: 5, mult: 3, total: 15,
    });
  });

  it('applies mulMult after the addMult sum', () => {
    // longGame on a 5-letter word: mulMult 2 => mult (1+0)*2 = 2 => 5*2 = 10
    expect(applyCardEffects(ctx({ wordLength: 5 }), [card('longGame')])).toEqual({
      chips: 5, mult: 2, total: 10,
    });
  });

  it('stacks multiple cards: chips add, addMult sums, mulMult multiplies', () => {
    // steadyBuild (+5 chips), combo@idx1 (+1 addMult), longGame@len5 (x2 mulMult)
    // chips = 5+5 = 10; mult = (1 + 1) * 2 = 4; total = 40
    const result = applyCardEffects(
      ctx({ wordIndexInRound: 1, wordLength: 5 }),
      [card('steadyBuild'), card('combo'), card('longGame')],
    );
    expect(result).toEqual({ chips: 10, mult: 4, total: 40 });
  });

  it('ignores cards without a scoreEffect', () => {
    expect(applyCardEffects(ctx(), [card('wildcardStash'), card('letterHoard')])).toEqual({
      chips: 5, mult: 1, total: 5,
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd fe-next && npx vitest run lib/word-craft/run/__tests__/cardEffects.spec.ts`
Expected: FAIL — module `../cardEffects` does not exist.

- [ ] **Step 3: Create cardEffects.ts**

Create `fe-next/lib/word-craft/run/cardEffects.ts`:

```typescript
import type { PowerCard, ScoreContext } from './powerCards';

export interface WordScore {
  chips: number;
  mult: number;
  total: number;
}

export function applyCardEffects(
  ctx: ScoreContext,
  activeCards: readonly PowerCard[],
): WordScore {
  let chips = ctx.baseChips;
  let addMult = 0;
  let mulMult = 1;
  for (const card of activeCards) {
    if (!card.scoreEffect) continue;
    const mod = card.scoreEffect(ctx);
    chips += mod.addChips;
    addMult += mod.addMult;
    mulMult *= mod.mulMult;
  }
  const mult = (ctx.baseMult + addMult) * mulMult;
  return { chips, mult, total: chips * mult };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd fe-next && npx vitest run lib/word-craft/run/__tests__/cardEffects.spec.ts`
Expected: PASS — all 6 tests.

- [ ] **Step 5: Commit**

```bash
git add fe-next/lib/word-craft/run/cardEffects.ts fe-next/lib/word-craft/run/__tests__/cardEffects.spec.ts
git commit -m "feat(word-craft): add applyCardEffects chips x mult folding"
```

---

## Task 5: Create runTargets.ts (difficulty curve)

**Files:**
- Create: `fe-next/lib/word-craft/run/runTargets.ts`
- Test: `fe-next/lib/word-craft/run/__tests__/runTargets.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `fe-next/lib/word-craft/run/__tests__/runTargets.spec.ts`:

```typescript
import { ROUND_COUNT, getRoundTarget, getRoundBagSize } from '../runTargets';

describe('runTargets', () => {
  it('defines a 3-round run', () => {
    expect(ROUND_COUNT).toBe(3);
  });

  it('targets escalate round over round', () => {
    expect(getRoundTarget(1, 7)).toBeLessThan(getRoundTarget(2, 7));
    expect(getRoundTarget(2, 7)).toBeLessThan(getRoundTarget(3, 7));
  });

  it('a 9x9 board has a higher target than 7x7 for the same round', () => {
    expect(getRoundTarget(1, 9)).toBeGreaterThan(getRoundTarget(1, 7));
  });

  it('bag size grows each round', () => {
    expect(getRoundBagSize(1)).toBeLessThan(getRoundBagSize(2));
    expect(getRoundBagSize(2)).toBeLessThan(getRoundBagSize(3));
  });

  it('clamps out-of-range rounds to the last defined value', () => {
    expect(getRoundTarget(99, 7)).toBe(getRoundTarget(3, 7));
    expect(getRoundBagSize(99)).toBe(getRoundBagSize(3));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd fe-next && npx vitest run lib/word-craft/run/__tests__/runTargets.spec.ts`
Expected: FAIL — module `../runTargets` does not exist.

- [ ] **Step 3: Create runTargets.ts**

Create `fe-next/lib/word-craft/run/runTargets.ts`:

```typescript
export const ROUND_COUNT = 3;

const BASE_TARGETS: readonly number[] = [40, 95, 175];
const BAG_SIZES: readonly number[] = [20, 24, 28];

export function getRoundBagSize(round: number): number {
  const idx = Math.min(Math.max(round, 1), BAG_SIZES.length) - 1;
  return BAG_SIZES[idx];
}

export function getRoundTarget(round: number, boardSize: number): number {
  const idx = Math.min(Math.max(round, 1), BASE_TARGETS.length) - 1;
  const base = BASE_TARGETS[idx];
  const sizeFactor = boardSize >= 9 ? 1.3 : 1;
  return Math.round(base * sizeFactor);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd fe-next && npx vitest run lib/word-craft/run/__tests__/runTargets.spec.ts`
Expected: PASS — all 5 tests.

- [ ] **Step 5: Commit**

```bash
git add fe-next/lib/word-craft/run/runTargets.ts fe-next/lib/word-craft/run/__tests__/runTargets.spec.ts
git commit -m "feat(word-craft): add escalating run target and bag-size curve"
```

---

## Task 6: Create runTypes.ts (run state + action types)

**Files:**
- Create: `fe-next/lib/word-craft/run/runTypes.ts`

- [ ] **Step 1: Create runTypes.ts**

Create `fe-next/lib/word-craft/run/runTypes.ts`:

```typescript
import type { Board, BoardSize } from '../board';
import type { TileBag, SupportedLocale } from '../tileBag';
import type { RackTile, PlacedTile } from '../types';
import type { PowerCard } from './powerCards';
import type { WordScore } from './cardEffects';

export type RunPhase = 'intro' | 'playing' | 'roundResult' | 'cardPick' | 'runResult';

export interface RoundState {
  round: number; // 1-based
  target: number;
  score: number;
  wordsPlayedThisRound: number;
}

export interface RunState {
  phase: RunPhase;
  seed: number;
  locale: SupportedLocale;
  boardSize: Extract<BoardSize, 7 | 9>;
  board: Board;
  bag: TileBag;
  rack: RackTile[];
  pendingPlacements: PlacedTile[];
  selectedRackTileId: string | null;
  activeCards: PowerCard[];
  round: RoundState;
  cardChoice: PowerCard[] | null; // populated only during 'cardPick'
  roundPassed: boolean; // set by END_ROUND, read by 'roundResult' UI + PROCEED
  runTotal: number;
  lastWordScore: WordScore | null;
  lastError: string | null;
  cleared: boolean; // true when all 3 rounds passed
}

export type RunAction =
  | { type: 'START_RUN' }
  | { type: 'SELECT_RACK_TILE'; rackTileId: string | null }
  | { type: 'PLACE_TILE'; rackTileId: string; row: number; col: number }
  | { type: 'RECALL_TILE'; rackTileId: string }
  | { type: 'RECALL_ALL' }
  | { type: 'COMMIT_MOVE'; placements: PlacedTile[]; wordScore: number; wordsCount: number; lastWordScore: WordScore }
  | { type: 'SET_ERROR'; message: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'END_ROUND' }
  | { type: 'PROCEED' }
  | { type: 'PICK_CARD'; cardId: string }
  | { type: 'RESTART' };
```

- [ ] **Step 2: Verify it type-checks**

Run: `cd fe-next && npx tsc --noEmit`
Expected: 0 errors (note: imports of not-yet-created `runReducer` won't exist yet — this file imports only already-created modules, so it must pass cleanly).

- [ ] **Step 3: Commit**

```bash
git add fe-next/lib/word-craft/run/runTypes.ts
git commit -m "feat(word-craft): add run-mode state and action types"
```

---

## Task 7: Create runReducer.ts — init + placement actions

**Files:**
- Create: `fe-next/lib/word-craft/run/runReducer.ts`
- Test: `fe-next/lib/word-craft/run/__tests__/runReducer.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `fe-next/lib/word-craft/run/__tests__/runReducer.spec.ts`:

```typescript
import { buildInitialRunState, runReducer } from '../runReducer';
import { getRoundTarget } from '../runTargets';
import type { PlacedTile } from '../../types';

const init = () => buildInitialRunState({ seed: 42, locale: 'en', boardSize: 7 });

describe('buildInitialRunState', () => {
  it('starts in intro phase, round 1, empty cards, 8-tile rack', () => {
    const s = init();
    expect(s.phase).toBe('intro');
    expect(s.round.round).toBe(1);
    expect(s.round.target).toBe(getRoundTarget(1, 7));
    expect(s.activeCards).toEqual([]);
    expect(s.rack.length).toBe(8);
    expect(s.board.size).toBe(7);
    expect(s.runTotal).toBe(0);
  });

  it('is deterministic for a given seed', () => {
    expect(init().rack.map((t) => t.letter)).toEqual(init().rack.map((t) => t.letter));
  });
});

describe('runReducer placement actions', () => {
  it('START_RUN moves intro -> playing', () => {
    const s = runReducer(init(), { type: 'START_RUN' });
    expect(s.phase).toBe('playing');
  });

  it('SELECT_RACK_TILE sets the selected id', () => {
    const s = runReducer(init(), { type: 'SELECT_RACK_TILE', rackTileId: 'abc' });
    expect(s.selectedRackTileId).toBe('abc');
  });

  it('PLACE_TILE moves a rack tile into pendingPlacements', () => {
    const start = runReducer(init(), { type: 'START_RUN' });
    const first = start.rack[0];
    const center = Math.floor(start.board.size / 2);
    const s = runReducer(start, { type: 'PLACE_TILE', rackTileId: first.id, row: center, col: center });
    expect(s.pendingPlacements.length).toBe(1);
    expect(s.rack.find((t) => t.id === first.id)).toBeUndefined();
    expect(s.selectedRackTileId).toBeNull();
  });

  it('RECALL_TILE returns a pending tile to the rack', () => {
    const start = runReducer(init(), { type: 'START_RUN' });
    const first = start.rack[0];
    const center = Math.floor(start.board.size / 2);
    const placed = runReducer(start, { type: 'PLACE_TILE', rackTileId: first.id, row: center, col: center });
    const s = runReducer(placed, { type: 'RECALL_TILE', rackTileId: first.id });
    expect(s.pendingPlacements.length).toBe(0);
    expect(s.rack.find((t) => t.id === first.id)).toBeDefined();
  });

  it('RECALL_ALL clears all pending placements back to the rack', () => {
    const start = runReducer(init(), { type: 'START_RUN' });
    const center = Math.floor(start.board.size / 2);
    const a = runReducer(start, { type: 'PLACE_TILE', rackTileId: start.rack[0].id, row: center, col: center });
    const b = runReducer(a, { type: 'PLACE_TILE', rackTileId: a.rack[0].id, row: center, col: center + 1 });
    const s = runReducer(b, { type: 'RECALL_ALL' });
    expect(s.pendingPlacements.length).toBe(0);
    expect(s.rack.length).toBe(8);
  });

  it('COMMIT_MOVE applies placements to the board, refills the rack, and adds to round score', () => {
    const start = runReducer(init(), { type: 'START_RUN' });
    const center = Math.floor(start.board.size / 2);
    const placements: PlacedTile[] = [
      { row: center, col: center, letter: 'C', value: 3, isBlank: false, rackTileId: start.rack[0].id },
    ];
    const placed = runReducer(start, {
      type: 'PLACE_TILE', rackTileId: start.rack[0].id, row: center, col: center,
    });
    const s = runReducer(placed, {
      type: 'COMMIT_MOVE', placements, wordScore: 12, wordsCount: 1,
      lastWordScore: { chips: 6, mult: 2, total: 12 },
    });
    expect(s.round.score).toBe(12);
    expect(s.round.wordsPlayedThisRound).toBe(1);
    expect(s.pendingPlacements.length).toBe(0);
    expect(s.rack.length).toBe(8); // refilled
    expect(s.board.cells[center][center].tile).not.toBeNull();
    expect(s.lastWordScore).toEqual({ chips: 6, mult: 2, total: 12 });
  });

  it('SET_ERROR / CLEAR_ERROR set and clear lastError', () => {
    const withErr = runReducer(init(), { type: 'SET_ERROR', message: 'INVALID_WORD' });
    expect(withErr.lastError).toBe('INVALID_WORD');
    expect(runReducer(withErr, { type: 'CLEAR_ERROR' }).lastError).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd fe-next && npx vitest run lib/word-craft/run/__tests__/runReducer.spec.ts`
Expected: FAIL — module `../runReducer` does not exist.

- [ ] **Step 3: Create runReducer.ts with init + placement actions**

Create `fe-next/lib/word-craft/run/runReducer.ts`:

```typescript
import { createBoard, placeTiles } from '../board';
import { createBag, draw, type TileBag, type SupportedLocale } from '../tileBag';
import { resolveDrag } from '../placement';
import type { RackTile, PlacedTile } from '../types';
import type { RunState, RunAction } from './runTypes';
import { getRoundBagSize, getRoundTarget } from './runTargets';

export interface BuildRunOptions {
  seed: number;
  locale: SupportedLocale;
  boardSize: 7 | 9;
}

function cloneBag(bag: TileBag): TileBag {
  return { tiles: [...bag.tiles], rng: bag.rng, nextId: bag.nextId };
}

export function buildInitialRunState(opts: BuildRunOptions): RunState {
  const { seed, locale, boardSize } = opts;
  const board = createBoard(boardSize);
  const bag = createBag({ seed: seed + 1, locale, bagSize: getRoundBagSize(1) });
  const rack = draw(bag, 8);
  return {
    phase: 'intro',
    seed,
    locale,
    boardSize,
    board,
    bag,
    rack,
    pendingPlacements: [],
    selectedRackTileId: null,
    activeCards: [],
    round: { round: 1, target: getRoundTarget(1, boardSize), score: 0, wordsPlayedThisRound: 0 },
    cardChoice: null,
    roundPassed: false,
    runTotal: 0,
    lastWordScore: null,
    lastError: null,
    cleared: false,
  };
}

export function runReducer(state: RunState, action: RunAction): RunState {
  switch (action.type) {
    case 'START_RUN':
      return { ...state, phase: 'playing' };

    case 'SELECT_RACK_TILE':
      return { ...state, selectedRackTileId: action.rackTileId };

    case 'PLACE_TILE': {
      const rackTile = state.rack.find((t) => t.id === action.rackTileId);
      if (!rackTile) return state;
      const result = resolveDrag(
        rackTile,
        { row: action.row, col: action.col },
        state.pendingPlacements,
        state.board,
      );
      if ('reason' in result) {
        return { ...state, lastError: result.reason };
      }
      return {
        ...state,
        rack: state.rack.filter((t) => t.id !== action.rackTileId),
        pendingPlacements: [...state.pendingPlacements, result.placement],
        selectedRackTileId: null,
        lastError: null,
      };
    }

    case 'RECALL_TILE': {
      const placement = state.pendingPlacements.find((p) => p.rackTileId === action.rackTileId);
      if (!placement) return state;
      const restored: RackTile = {
        id: placement.rackTileId,
        letter: placement.isBlank ? '_' : placement.letter,
        value: placement.value,
        isBlank: placement.isBlank,
      };
      return {
        ...state,
        pendingPlacements: state.pendingPlacements.filter((p) => p.rackTileId !== action.rackTileId),
        rack: [...state.rack, restored],
        lastError: null,
      };
    }

    case 'RECALL_ALL': {
      const restored: RackTile[] = state.pendingPlacements.map((p) => ({
        id: p.rackTileId,
        letter: p.isBlank ? '_' : p.letter,
        value: p.value,
        isBlank: p.isBlank,
      }));
      return {
        ...state,
        pendingPlacements: [],
        rack: [...state.rack, ...restored],
        lastError: null,
      };
    }

    case 'COMMIT_MOVE': {
      const board = structuredClone(state.board);
      placeTiles(board, action.placements);
      const bag = cloneBag(state.bag);
      const refill = draw(bag, action.placements.length);
      return {
        ...state,
        board,
        bag,
        rack: [...state.rack, ...refill],
        pendingPlacements: [],
        selectedRackTileId: null,
        lastError: null,
        lastWordScore: action.lastWordScore,
        round: {
          ...state.round,
          score: state.round.score + action.wordScore,
          wordsPlayedThisRound: state.round.wordsPlayedThisRound + action.wordsCount,
        },
      };
    }

    case 'SET_ERROR':
      return { ...state, lastError: action.message };

    case 'CLEAR_ERROR':
      return { ...state, lastError: null };

    // END_ROUND, PROCEED, PICK_CARD, RESTART added in Task 8
    default:
      return state;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd fe-next && npx vitest run lib/word-craft/run/__tests__/runReducer.spec.ts`
Expected: PASS — all placement-action tests.

- [ ] **Step 5: Commit**

```bash
git add fe-next/lib/word-craft/run/runReducer.ts fe-next/lib/word-craft/run/__tests__/runReducer.spec.ts
git commit -m "feat(word-craft): add run reducer init and placement actions"
```

---

## Task 8: Extend runReducer.ts — round flow actions

**Files:**
- Modify: `fe-next/lib/word-craft/run/runReducer.ts`
- Test: `fe-next/lib/word-craft/run/__tests__/runReducer.spec.ts` (add cases)

- [ ] **Step 1: Write the failing test**

Append to `fe-next/lib/word-craft/run/__tests__/runReducer.spec.ts`:

```typescript
import { ROUND_COUNT } from '../runTargets';
import { POWER_CARD_POOL } from '../powerCards';

// helper: force a state into 'playing' with a given round score
const playingWith = (score: number, round = 1) => {
  let s = runReducer(init(), { type: 'START_RUN' });
  s = { ...s, round: { ...s.round, round, target: s.round.target, score } };
  return s;
};

describe('runReducer round flow', () => {
  it('END_ROUND with score >= target marks roundPassed true and goes to roundResult', () => {
    const s = playingWith(9999);
    const next = runReducer(s, { type: 'END_ROUND' });
    expect(next.phase).toBe('roundResult');
    expect(next.roundPassed).toBe(true);
  });

  it('END_ROUND with score < target marks roundPassed false', () => {
    const s = playingWith(0);
    const next = runReducer(s, { type: 'END_ROUND' });
    expect(next.phase).toBe('roundResult');
    expect(next.roundPassed).toBe(false);
  });

  it('END_ROUND adds the round score to runTotal when passed', () => {
    const s = playingWith(9999);
    const next = runReducer(s, { type: 'END_ROUND' });
    expect(next.runTotal).toBe(9999);
  });

  it('PROCEED after a failed round goes to runResult, not cleared', () => {
    let s = runReducer(playingWith(0), { type: 'END_ROUND' });
    s = runReducer(s, { type: 'PROCEED' });
    expect(s.phase).toBe('runResult');
    expect(s.cleared).toBe(false);
  });

  it('PROCEED after a passed non-final round goes to cardPick with 3 choices', () => {
    let s = runReducer(playingWith(9999, 1), { type: 'END_ROUND' });
    s = runReducer(s, { type: 'PROCEED' });
    expect(s.phase).toBe('cardPick');
    expect(s.cardChoice?.length).toBe(3);
  });

  it('PROCEED after passing the final round goes to runResult, cleared', () => {
    let s = runReducer(playingWith(9999, ROUND_COUNT), { type: 'END_ROUND' });
    s = runReducer(s, { type: 'PROCEED' });
    expect(s.phase).toBe('runResult');
    expect(s.cleared).toBe(true);
  });

  it('PICK_CARD appends the card, advances the round, and resets the board', () => {
    let s = runReducer(playingWith(9999, 1), { type: 'END_ROUND' });
    s = runReducer(s, { type: 'PROCEED' });
    const chosen = s.cardChoice![0];
    s = runReducer(s, { type: 'PICK_CARD', cardId: chosen.id });
    expect(s.phase).toBe('playing');
    expect(s.activeCards.map((c) => c.id)).toContain(chosen.id);
    expect(s.round.round).toBe(2);
    expect(s.round.score).toBe(0);
    expect(s.pendingPlacements).toEqual([]);
    expect(s.board.cells.every((row) => row.every((cell) => cell.tile === null))).toBe(true);
  });

  it('PICK_CARD applies a rackSize setup card (letterHoard => 10-tile rack)', () => {
    let s = runReducer(playingWith(9999, 1), { type: 'END_ROUND' });
    s = runReducer(s, { type: 'PROCEED' });
    // force letterHoard into the choice set so the test is deterministic
    const letterHoard = POWER_CARD_POOL.find((c) => c.id === 'letterHoard')!;
    s = { ...s, cardChoice: [letterHoard] };
    s = runReducer(s, { type: 'PICK_CARD', cardId: 'letterHoard' });
    expect(s.rack.length).toBe(10);
  });

  it('RESTART returns to a fresh intro state', () => {
    let s = runReducer(playingWith(9999, 1), { type: 'END_ROUND' });
    s = runReducer(s, { type: 'RESTART' });
    expect(s.phase).toBe('intro');
    expect(s.round.round).toBe(1);
    expect(s.activeCards).toEqual([]);
    expect(s.runTotal).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd fe-next && npx vitest run lib/word-craft/run/__tests__/runReducer.spec.ts`
Expected: FAIL — `END_ROUND`/`PROCEED`/`PICK_CARD`/`RESTART` fall through to `default` and return unchanged state.

- [ ] **Step 3: Add round-flow cases + helpers to runReducer.ts**

In `fe-next/lib/word-craft/run/runReducer.ts`, add these imports at the top:

```typescript
import { drawCardChoices, type PowerCard } from './powerCards';
import { ROUND_COUNT } from './runTargets';
import type { RackTile } from '../types';
```

Add this helper above `runReducer`:

```typescript
function buildRoundSetup(cards: readonly PowerCard[]): {
  rackSize: number;
  extraBagTiles: number;
  extraBlankTiles: number;
} {
  let rackSize = 8;
  let extraBagTiles = 0;
  let extraBlankTiles = 0;
  for (const card of cards) {
    if (!card.roundSetup) continue;
    if (card.roundSetup.rackSize) rackSize = Math.max(rackSize, card.roundSetup.rackSize);
    extraBagTiles += card.roundSetup.extraBagTiles ?? 0;
    extraBlankTiles += card.roundSetup.extraBlankTiles ?? 0;
  }
  return { rackSize, extraBagTiles, extraBlankTiles };
}

function startRound(state: RunState, roundNumber: number, activeCards: PowerCard[]): RunState {
  const setup = buildRoundSetup(activeCards);
  const board = createBoard(state.boardSize);
  const bag = createBag({
    seed: state.seed + roundNumber * 101,
    locale: state.locale,
    bagSize: getRoundBagSize(roundNumber) + setup.extraBagTiles,
  });
  const drawn = draw(bag, setup.rackSize);
  const blanks: RackTile[] = [];
  for (let i = 0; i < setup.extraBlankTiles; i++) {
    blanks.push({ id: `blank-r${roundNumber}-${i}`, letter: '_', value: 0, isBlank: true });
  }
  return {
    ...state,
    phase: 'playing',
    board,
    bag,
    rack: [...drawn, ...blanks],
    pendingPlacements: [],
    selectedRackTileId: null,
    activeCards,
    round: {
      round: roundNumber,
      target: getRoundTarget(roundNumber, state.boardSize),
      score: 0,
      wordsPlayedThisRound: 0,
    },
    cardChoice: null,
    roundPassed: false,
    lastWordScore: null,
    lastError: null,
  };
}
```

Replace the `// END_ROUND ...` comment + `default` with these cases (keep `default` last):

```typescript
    case 'END_ROUND': {
      const passed = state.round.score >= state.round.target;
      let runTotal = state.runTotal;
      if (passed) {
        let bonus = 0;
        for (const card of state.activeCards) {
          if (card.roundEndBonus) bonus += card.roundEndBonus(state.round.score, state.round.target);
        }
        runTotal = state.runTotal + state.round.score + bonus;
      }
      return { ...state, phase: 'roundResult', roundPassed: passed, runTotal };
    }

    case 'PROCEED': {
      if (!state.roundPassed) {
        return { ...state, phase: 'runResult', cleared: false };
      }
      if (state.round.round >= ROUND_COUNT) {
        return { ...state, phase: 'runResult', cleared: true };
      }
      const ownedIds = state.activeCards.map((c) => c.id);
      const cardChoice = drawCardChoices(state.seed + state.round.round * 31, ownedIds, 3);
      return { ...state, phase: 'cardPick', cardChoice };
    }

    case 'PICK_CARD': {
      const picked = (state.cardChoice ?? []).find((c) => c.id === action.cardId);
      if (!picked) return state;
      const activeCards = [...state.activeCards, picked];
      return startRound(state, state.round.round + 1, activeCards);
    }

    case 'RESTART':
      return buildInitialRunState({
        seed: state.seed,
        locale: state.locale,
        boardSize: state.boardSize,
      });

    default:
      return state;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd fe-next && npx vitest run lib/word-craft/run/__tests__/runReducer.spec.ts`
Expected: PASS — all placement + round-flow tests.

- [ ] **Step 5: Commit**

```bash
git add fe-next/lib/word-craft/run/runReducer.ts fe-next/lib/word-craft/run/__tests__/runReducer.spec.ts
git commit -m "feat(word-craft): add run reducer round-flow and card-pick actions"
```

---

## Task 9: Create useWordCraftRun hook

**Files:**
- Create: `fe-next/lib/word-craft/run/useWordCraftRun.ts`
- Test: `fe-next/lib/word-craft/run/__tests__/useWordCraftRun.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `fe-next/lib/word-craft/run/__tests__/useWordCraftRun.spec.ts`:

```typescript
import { renderHook, act } from '@testing-library/react';
import { useWordCraftRun } from '../useWordCraftRun';

const DICT = new Set(['cat', 'cats', 'at']);

describe('useWordCraftRun', () => {
  it('exposes run state and starts in intro phase', () => {
    const { result } = renderHook(() => useWordCraftRun({ seed: 1, dict: DICT, locale: 'en', boardSize: 7 }));
    expect(result.current.state.phase).toBe('intro');
    expect(result.current.state.rack.length).toBe(8);
  });

  it('startRun transitions to playing', () => {
    const { result } = renderHook(() => useWordCraftRun({ seed: 1, dict: DICT, locale: 'en', boardSize: 7 }));
    act(() => result.current.startRun());
    expect(result.current.state.phase).toBe('playing');
  });

  it('submitMove with no pending placements sets an error and does not crash', () => {
    const { result } = renderHook(() => useWordCraftRun({ seed: 1, dict: DICT, locale: 'en', boardSize: 7 }));
    act(() => result.current.startRun());
    act(() => result.current.submitMove());
    expect(result.current.state.lastError).toBeTruthy();
    expect(result.current.state.round.score).toBe(0);
  });

  it('endRound routes to roundResult', () => {
    const { result } = renderHook(() => useWordCraftRun({ seed: 1, dict: DICT, locale: 'en', boardSize: 7 }));
    act(() => result.current.startRun());
    act(() => result.current.endRound());
    expect(result.current.state.phase).toBe('roundResult');
  });

  it('tilesRemaining reflects the bag size', () => {
    const { result } = renderHook(() => useWordCraftRun({ seed: 1, dict: DICT, locale: 'en', boardSize: 7 }));
    expect(result.current.tilesRemaining).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd fe-next && npx vitest run lib/word-craft/run/__tests__/useWordCraftRun.spec.ts`
Expected: FAIL — module `../useWordCraftRun` does not exist.

- [ ] **Step 3: Create useWordCraftRun.ts**

Create `fe-next/lib/word-craft/run/useWordCraftRun.ts`:

```typescript
import { useCallback, useMemo, useReducer } from 'react';
import { validateAndScoreMove } from '../moveValidator';
import { scoreWordChips } from '../scoring';
import { remaining } from '../tileBag';
import type { SupportedLocale } from '../tileBag';
import { runReducer, buildInitialRunState } from './runReducer';
import { applyCardEffects, type WordScore } from './cardEffects';
import type { ScoreContext } from './powerCards';

export interface UseWordCraftRunOptions {
  seed?: number;
  dict: Set<string> | null;
  locale?: SupportedLocale;
  boardSize?: 7 | 9;
}

export function useWordCraftRun({
  seed = 1,
  dict,
  locale = 'en',
  boardSize = 7,
}: UseWordCraftRunOptions) {
  const initArg = useMemo(() => ({ seed, locale, boardSize }), [seed, locale, boardSize]);
  const [state, dispatch] = useReducer(runReducer, initArg, buildInitialRunState);

  const isWordValid = useCallback(
    (word: string) => dict?.has(word.toLowerCase()) ?? false,
    [dict],
  );

  const startRun = useCallback(() => dispatch({ type: 'START_RUN' }), []);
  const selectRackTile = useCallback(
    (rackTileId: string | null) => dispatch({ type: 'SELECT_RACK_TILE', rackTileId }),
    [],
  );
  const placeTile = useCallback(
    (rackTileId: string, row: number, col: number) =>
      dispatch({ type: 'PLACE_TILE', rackTileId, row, col }),
    [],
  );
  const recallTile = useCallback(
    (rackTileId: string) => dispatch({ type: 'RECALL_TILE', rackTileId }),
    [],
  );
  const recallAll = useCallback(() => dispatch({ type: 'RECALL_ALL' }), []);
  const clearError = useCallback(() => dispatch({ type: 'CLEAR_ERROR' }), []);
  const endRound = useCallback(() => dispatch({ type: 'END_ROUND' }), []);
  const proceed = useCallback(() => dispatch({ type: 'PROCEED' }), []);
  const pickCard = useCallback((cardId: string) => dispatch({ type: 'PICK_CARD', cardId }), []);
  const restart = useCallback(() => dispatch({ type: 'RESTART' }), []);

  const submitMove = useCallback(() => {
    const result = validateAndScoreMove(state.board, state.pendingPlacements, isWordValid);
    if (!result.ok || !result.words) {
      dispatch({ type: 'SET_ERROR', message: result.reason ?? 'INVALID_WORD' });
      return;
    }
    let moveTotal = 0;
    let lastWordScore: WordScore = { chips: 0, mult: 1, total: 0 };
    result.words.forEach((word, i) => {
      const { chips, baseMult } = scoreWordChips(word.tiles);
      const ctx: ScoreContext = {
        wordTiles: word.tiles,
        wordLength: word.tiles.length,
        wordIndexInRound: state.round.wordsPlayedThisRound + i,
        baseChips: chips,
        baseMult,
      };
      const score = applyCardEffects(ctx, state.activeCards);
      moveTotal += score.total;
      lastWordScore = score;
    });
    dispatch({
      type: 'COMMIT_MOVE',
      placements: state.pendingPlacements,
      wordScore: moveTotal,
      wordsCount: result.words.length,
      lastWordScore,
    });
  }, [state, isWordValid]);

  const tilesRemaining = remaining(state.bag);

  return {
    state,
    startRun,
    selectRackTile,
    placeTile,
    recallTile,
    recallAll,
    submitMove,
    clearError,
    endRound,
    proceed,
    pickCard,
    restart,
    tilesRemaining,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd fe-next && npx vitest run lib/word-craft/run/__tests__/useWordCraftRun.spec.ts`
Expected: PASS — all 5 tests.

- [ ] **Step 5: Commit**

```bash
git add fe-next/lib/word-craft/run/useWordCraftRun.ts fe-next/lib/word-craft/run/__tests__/useWordCraftRun.spec.ts
git commit -m "feat(word-craft): add useWordCraftRun hook with card-aware scoring"
```

---

## Task 10: Create useWordCraftRunFlag hook

**Files:**
- Create: `fe-next/hooks/useWordCraftRunFlag.ts`
- Test: `fe-next/hooks/__tests__/useWordCraftRunFlag.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `fe-next/hooks/__tests__/useWordCraftRunFlag.spec.ts`:

```typescript
import { renderHook } from '@testing-library/react';
import { vi } from 'vitest';

vi.mock('../usePostHogFlag', () => ({
  usePostHogFlag: vi.fn(() => false),
}));

import { usePostHogFlag } from '../usePostHogFlag';
import { useWordCraftRunFlag } from '../useWordCraftRunFlag';

describe('useWordCraftRunFlag', () => {
  const origEnv = process.env.NEXT_PUBLIC_WORDCRAFT_RUN_DEV;
  afterEach(() => {
    process.env.NEXT_PUBLIC_WORDCRAFT_RUN_DEV = origEnv;
    vi.mocked(usePostHogFlag).mockReturnValue(false);
  });

  it('returns true when the PostHog flag is on', () => {
    vi.mocked(usePostHogFlag).mockReturnValue(true);
    process.env.NEXT_PUBLIC_WORDCRAFT_RUN_DEV = '0';
    const { result } = renderHook(() => useWordCraftRunFlag());
    expect(result.current).toBe(true);
  });

  it('returns true when the dev override env var is set', () => {
    vi.mocked(usePostHogFlag).mockReturnValue(false);
    process.env.NEXT_PUBLIC_WORDCRAFT_RUN_DEV = '1';
    const { result } = renderHook(() => useWordCraftRunFlag());
    expect(result.current).toBe(true);
  });

  it('returns false when neither the flag nor the override is set', () => {
    vi.mocked(usePostHogFlag).mockReturnValue(false);
    process.env.NEXT_PUBLIC_WORDCRAFT_RUN_DEV = '0';
    const { result } = renderHook(() => useWordCraftRunFlag());
    expect(result.current).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd fe-next && npx vitest run hooks/__tests__/useWordCraftRunFlag.spec.ts`
Expected: FAIL — module `../useWordCraftRunFlag` does not exist.

- [ ] **Step 3: Create useWordCraftRunFlag.ts**

Create `fe-next/hooks/useWordCraftRunFlag.ts`:

```typescript
import { usePostHogFlag } from './usePostHogFlag';

const FLAG_KEY = 'wordcraft-run-mode';

export function useWordCraftRunFlag(): boolean {
  const remote = usePostHogFlag<boolean>(FLAG_KEY, false);
  const devOverride = process.env.NEXT_PUBLIC_WORDCRAFT_RUN_DEV === '1';
  return devOverride || remote === true;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd fe-next && npx vitest run hooks/__tests__/useWordCraftRunFlag.spec.ts`
Expected: PASS — all 3 tests.

- [ ] **Step 5: Commit**

```bash
git add fe-next/hooks/useWordCraftRunFlag.ts fe-next/hooks/__tests__/useWordCraftRunFlag.spec.ts
git commit -m "feat(word-craft): add useWordCraftRunFlag feature flag hook"
```

---

## Task 11: Create Pixi scenes (cardRevealPop, multiplierPop, targetHitBurst)

**Files:**
- Create: `fe-next/lib/word-craft/pixi/scenes/cardRevealPop.ts`
- Create: `fe-next/lib/word-craft/pixi/scenes/multiplierPop.ts`
- Create: `fe-next/lib/word-craft/pixi/scenes/targetHitBurst.ts`
- Test: `fe-next/lib/word-craft/pixi/scenes/__tests__/runScenes.spec.ts`

- [ ] **Step 1: Write the failing smoke test**

Create `fe-next/lib/word-craft/pixi/scenes/__tests__/runScenes.spec.ts`:

```typescript
import { playCardRevealPop } from '../cardRevealPop';
import { playMultiplierPop } from '../multiplierPop';
import { playTargetHitBurst } from '../targetHitBurst';
import type { SceneCtx } from '../../sceneCtx';

// Minimal ctx with reducedMotion true — scenes must early-return without touching Pixi.
const reducedCtx = (): SceneCtx => ({
  app: {} as SceneCtx['app'],
  ambientLayer: {} as SceneCtx['ambientLayer'],
  eventLayer: {} as SceneCtx['eventLayer'],
  coords: { cellRect: () => null } as unknown as SceneCtx['coords'],
  reducedMotion: true,
});

describe('run-mode pixi scenes', () => {
  it('cardRevealPop resolves immediately under reduced motion', async () => {
    await expect(playCardRevealPop(reducedCtx())).resolves.toBeUndefined();
  });

  it('multiplierPop resolves immediately under reduced motion', async () => {
    await expect(playMultiplierPop(reducedCtx(), { chips: 10, mult: 3 })).resolves.toBeUndefined();
  });

  it('targetHitBurst resolves immediately under reduced motion', async () => {
    await expect(playTargetHitBurst(reducedCtx())).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd fe-next && npx vitest run lib/word-craft/pixi/scenes/__tests__/runScenes.spec.ts`
Expected: FAIL — the three scene modules do not exist.

- [ ] **Step 3: Create cardRevealPop.ts**

Create `fe-next/lib/word-craft/pixi/scenes/cardRevealPop.ts`:

```typescript
import { Graphics } from 'pixi.js';
import gsap from 'gsap';
import type { SceneCtx } from '../sceneCtx';

/** Brief glow sweep across the event layer when the card-pick screen appears. */
export function playCardRevealPop(ctx: SceneCtx): Promise<void> {
  if (ctx.reducedMotion) return Promise.resolve();
  return new Promise((resolve) => {
    const flash = new Graphics();
    flash.rect(-2000, -2000, 4000, 4000).fill({ color: 0xbfff00, alpha: 0.18 });
    ctx.eventLayer.addChild(flash);
    gsap.to(flash, {
      alpha: 0,
      duration: 0.45,
      ease: 'power2.out',
      onComplete: () => {
        flash.destroy();
        resolve();
      },
    });
  });
}
```

- [ ] **Step 4: Create multiplierPop.ts**

Create `fe-next/lib/word-craft/pixi/scenes/multiplierPop.ts`:

```typescript
import { Text } from 'pixi.js';
import gsap from 'gsap';
import type { SceneCtx } from '../sceneCtx';

/** Pops the chips x mult product at screen center on word commit. */
export function playMultiplierPop(
  ctx: SceneCtx,
  args: { chips: number; mult: number },
): Promise<void> {
  if (ctx.reducedMotion) return Promise.resolve();
  return new Promise((resolve) => {
    const label = new Text({
      text: `${args.chips} x ${args.mult}`,
      style: { fill: 0xffe135, fontSize: 48, fontWeight: '700', fontFamily: 'Fredoka' },
    });
    label.anchor.set(0.5);
    label.position.set(ctx.app.screen.width / 2, ctx.app.screen.height / 2);
    label.scale.set(0.4);
    ctx.eventLayer.addChild(label);
    gsap.to(label.scale, { x: 1.2, y: 1.2, duration: 0.3, ease: 'back.out(2)' });
    gsap.to(label, {
      alpha: 0,
      duration: 0.35,
      delay: 0.3,
      ease: 'power2.in',
      onComplete: () => {
        label.destroy();
        resolve();
      },
    });
  });
}
```

- [ ] **Step 5: Create targetHitBurst.ts**

Create `fe-next/lib/word-craft/pixi/scenes/targetHitBurst.ts`:

```typescript
import { Graphics } from 'pixi.js';
import gsap from 'gsap';
import type { SceneCtx } from '../sceneCtx';

/** Radial particle burst from screen center when a round target is cleared. */
export function playTargetHitBurst(ctx: SceneCtx): Promise<void> {
  if (ctx.reducedMotion) return Promise.resolve();
  return new Promise((resolve) => {
    const cx = ctx.app.screen.width / 2;
    const cy = ctx.app.screen.height / 2;
    const particles: Graphics[] = [];
    let settled = 0;
    const COUNT = 24;
    for (let i = 0; i < COUNT; i++) {
      const p = new Graphics();
      p.circle(0, 0, 5).fill({ color: 0xbfff00 });
      p.position.set(cx, cy);
      ctx.eventLayer.addChild(p);
      particles.push(p);
      const angle = (i / COUNT) * Math.PI * 2;
      gsap.to(p, {
        x: cx + Math.cos(angle) * 220,
        y: cy + Math.sin(angle) * 220,
        alpha: 0,
        duration: 0.6,
        ease: 'power2.out',
        onComplete: () => {
          p.destroy();
          settled += 1;
          if (settled === COUNT) resolve();
        },
      });
    }
  });
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd fe-next && npx vitest run lib/word-craft/pixi/scenes/__tests__/runScenes.spec.ts`
Expected: PASS — all 3 smoke tests.

- [ ] **Step 7: Commit**

```bash
git add fe-next/lib/word-craft/pixi/scenes/cardRevealPop.ts fe-next/lib/word-craft/pixi/scenes/multiplierPop.ts fe-next/lib/word-craft/pixi/scenes/targetHitBurst.ts fe-next/lib/word-craft/pixi/scenes/__tests__/runScenes.spec.ts
git commit -m "feat(word-craft): add run-mode pixi scenes (card reveal, mult pop, target burst)"
```

---

## Task 12: Create PowerCardView component

**Files:**
- Create: `fe-next/components/word-craft/run/PowerCardView.tsx`
- Test: `fe-next/components/word-craft/run/__tests__/PowerCardView.spec.tsx`

- [ ] **Step 1: Write the failing test**

Create `fe-next/components/word-craft/run/__tests__/PowerCardView.spec.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { PowerCardView } from '../PowerCardView';
import { POWER_CARD_POOL } from '@/lib/word-craft/run/powerCards';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k }),
}));

const card = POWER_CARD_POOL.find((c) => c.id === 'vowelPower')!;

describe('PowerCardView', () => {
  it('renders the card name and description from i18n keys', () => {
    render(<PowerCardView card={card} />);
    expect(screen.getByText('wordcraft.run.card.vowelPower.name')).toBeInTheDocument();
    expect(screen.getByText('wordcraft.run.card.vowelPower.desc')).toBeInTheDocument();
  });

  it('calls onSelect with the card id when clicked', () => {
    const onSelect = vi.fn();
    render(<PowerCardView card={card} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onSelect).toHaveBeenCalledWith('vowelPower');
  });

  it('does not render a button when onSelect is omitted', () => {
    render(<PowerCardView card={card} />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd fe-next && npx vitest run components/word-craft/run/__tests__/PowerCardView.spec.tsx`
Expected: FAIL — module `../PowerCardView` does not exist.

- [ ] **Step 3: Create PowerCardView.tsx**

Create `fe-next/components/word-craft/run/PowerCardView.tsx`:

```tsx
'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import type { PowerCard } from '@/lib/word-craft/run/powerCards';

const RARITY_BORDER: Record<PowerCard['rarity'], string> = {
  common: 'border-neo-cyan',
  rare: 'border-neo-purple',
  legendary: 'border-neo-yellow',
};

interface PowerCardViewProps {
  card: PowerCard;
  onSelect?: (cardId: string) => void;
  selected?: boolean;
}

export function PowerCardView({ card, onSelect, selected = false }: PowerCardViewProps) {
  const { t } = useLanguage();
  const inner = (
    <>
      <span className="text-xs font-neo-body uppercase tracking-wide opacity-70">
        {t(`wordcraft.run.rarity.${card.rarity}`)}
      </span>
      <span className="text-lg font-neo-display text-neo-cream">
        {t(`wordcraft.run.card.${card.id}.name`)}
      </span>
      <span className="text-sm font-neo-body text-neo-white/80">
        {t(`wordcraft.run.card.${card.id}.desc`)}
      </span>
    </>
  );

  const className = `flex flex-col gap-2 rounded-neo border-neo-thick ${RARITY_BORDER[card.rarity]} bg-neo-navy-light p-4 text-left ${
    selected ? 'shadow-hard-lg' : 'shadow-hard'
  }`;

  if (!onSelect) {
    return <div className={className}>{inner}</div>;
  }
  return (
    <button type="button" className={`${className} animate-neo-press`} onClick={() => onSelect(card.id)}>
      {inner}
    </button>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd fe-next && npx vitest run components/word-craft/run/__tests__/PowerCardView.spec.tsx`
Expected: PASS — all 3 tests.

- [ ] **Step 5: Commit**

```bash
git add fe-next/components/word-craft/run/PowerCardView.tsx fe-next/components/word-craft/run/__tests__/PowerCardView.spec.tsx
git commit -m "feat(word-craft): add PowerCardView component"
```

---

## Task 13: Create CardPickScreen component

**Files:**
- Create: `fe-next/components/word-craft/run/CardPickScreen.tsx`
- Test: `fe-next/components/word-craft/run/__tests__/CardPickScreen.spec.tsx`

- [ ] **Step 1: Write the failing test**

Create `fe-next/components/word-craft/run/__tests__/CardPickScreen.spec.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { CardPickScreen } from '../CardPickScreen';
import { POWER_CARD_POOL } from '@/lib/word-craft/run/powerCards';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k }),
}));

const cards = POWER_CARD_POOL.slice(0, 3);

describe('CardPickScreen', () => {
  it('renders all three offered cards', () => {
    render(<CardPickScreen cards={cards} onPick={vi.fn()} />);
    cards.forEach((c) => {
      expect(screen.getByText(`wordcraft.run.card.${c.id}.name`)).toBeInTheDocument();
    });
  });

  it('calls onPick with the chosen card id', () => {
    const onPick = vi.fn();
    render(<CardPickScreen cards={cards} onPick={onPick} />);
    fireEvent.click(screen.getByText(`wordcraft.run.card.${cards[1].id}.name`));
    expect(onPick).toHaveBeenCalledWith(cards[1].id);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd fe-next && npx vitest run components/word-craft/run/__tests__/CardPickScreen.spec.tsx`
Expected: FAIL — module `../CardPickScreen` does not exist.

- [ ] **Step 3: Create CardPickScreen.tsx**

Create `fe-next/components/word-craft/run/CardPickScreen.tsx`:

```tsx
'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import type { PowerCard } from '@/lib/word-craft/run/powerCards';
import { PowerCardView } from './PowerCardView';

interface CardPickScreenProps {
  cards: PowerCard[];
  onPick: (cardId: string) => void;
}

export function CardPickScreen({ cards, onPick }: CardPickScreenProps) {
  const { t } = useLanguage();
  return (
    <section className="flex flex-col items-center gap-4 p-4">
      <h2 className="text-2xl font-neo-display text-neo-lime">{t('wordcraft.run.cardPick.title')}</h2>
      <p className="text-sm font-neo-body text-neo-white/80">{t('wordcraft.run.cardPick.subtitle')}</p>
      <div className="grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">
        {cards.map((card) => (
          <PowerCardView key={card.id} card={card} onSelect={onPick} />
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd fe-next && npx vitest run components/word-craft/run/__tests__/CardPickScreen.spec.tsx`
Expected: PASS — both tests.

- [ ] **Step 5: Commit**

```bash
git add fe-next/components/word-craft/run/CardPickScreen.tsx fe-next/components/word-craft/run/__tests__/CardPickScreen.spec.tsx
git commit -m "feat(word-craft): add CardPickScreen component"
```

---

## Task 14: Create RunHUD component

**Files:**
- Create: `fe-next/components/word-craft/run/RunHUD.tsx`
- Test: `fe-next/components/word-craft/run/__tests__/RunHUD.spec.tsx`

- [ ] **Step 1: Write the failing test**

Create `fe-next/components/word-craft/run/__tests__/RunHUD.spec.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { RunHUD } from '../RunHUD';
import { POWER_CARD_POOL } from '@/lib/word-craft/run/powerCards';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, vars?: Record<string, unknown>) => (vars ? `${k}:${JSON.stringify(vars)}` : k) }),
}));

describe('RunHUD', () => {
  it('shows the current round, score and target', () => {
    render(
      <RunHUD round={2} target={120} score={45} runTotal={60} activeCards={[]} tilesRemaining={14} />,
    );
    expect(screen.getByText(/wordcraft\.run\.round/)).toBeInTheDocument();
    expect(screen.getByText('45')).toBeInTheDocument();
    expect(screen.getByText('120')).toBeInTheDocument();
  });

  it('renders a chip per active card', () => {
    const cards = POWER_CARD_POOL.slice(0, 2);
    render(
      <RunHUD round={3} target={200} score={10} runTotal={150} activeCards={cards} tilesRemaining={5} />,
    );
    cards.forEach((c) => {
      expect(screen.getByText(`wordcraft.run.card.${c.id}.name`)).toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd fe-next && npx vitest run components/word-craft/run/__tests__/RunHUD.spec.tsx`
Expected: FAIL — module `../RunHUD` does not exist.

- [ ] **Step 3: Create RunHUD.tsx**

Create `fe-next/components/word-craft/run/RunHUD.tsx`:

```tsx
'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import type { PowerCard } from '@/lib/word-craft/run/powerCards';
import { ROUND_COUNT } from '@/lib/word-craft/run/runTargets';

interface RunHUDProps {
  round: number;
  target: number;
  score: number;
  runTotal: number;
  activeCards: PowerCard[];
  tilesRemaining: number;
}

export function RunHUD({ round, target, score, runTotal, activeCards, tilesRemaining }: RunHUDProps) {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col gap-2 rounded-neo border-neo bg-neo-navy-light p-3 shadow-hard">
      <div className="flex items-center justify-between font-neo-display text-neo-cream">
        <span>{t('wordcraft.run.round', { n: round, total: ROUND_COUNT })}</span>
        <span data-wc-run-score>
          {t('wordcraft.run.score')}: <span className="text-neo-lime">{score}</span> / {target}
        </span>
      </div>
      <div className="flex items-center justify-between text-sm font-neo-body text-neo-white/80">
        <span>{t('wordcraft.run.runTotal')}: {runTotal}</span>
        <span>{t('wordcraft.tilesLeft')}: {tilesRemaining}</span>
      </div>
      {activeCards.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {activeCards.map((c) => (
            <span
              key={c.id}
              className="rounded-neo border-neo bg-neo-navy px-2 py-0.5 text-xs font-neo-body text-neo-cyan"
            >
              {t(`wordcraft.run.card.${c.id}.name`)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd fe-next && npx vitest run components/word-craft/run/__tests__/RunHUD.spec.tsx`
Expected: PASS — both tests.

- [ ] **Step 5: Commit**

```bash
git add fe-next/components/word-craft/run/RunHUD.tsx fe-next/components/word-craft/run/__tests__/RunHUD.spec.tsx
git commit -m "feat(word-craft): add RunHUD component"
```

---

## Task 15: Create RoundResultScene component

**Files:**
- Create: `fe-next/components/word-craft/run/RoundResultScene.tsx`
- Test: `fe-next/components/word-craft/run/__tests__/RoundResultScene.spec.tsx`

- [ ] **Step 1: Write the failing test**

Create `fe-next/components/word-craft/run/__tests__/RoundResultScene.spec.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { RoundResultScene } from '../RoundResultScene';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k }),
}));

describe('RoundResultScene', () => {
  it('shows the passed headline when the round was cleared', () => {
    render(<RoundResultScene passed round={1} roundScore={130} target={100} onProceed={vi.fn()} />);
    expect(screen.getByText('wordcraft.run.roundResult.passed')).toBeInTheDocument();
  });

  it('shows the failed headline when the round was missed', () => {
    render(<RoundResultScene passed={false} round={2} roundScore={40} target={100} onProceed={vi.fn()} />);
    expect(screen.getByText('wordcraft.run.roundResult.failed')).toBeInTheDocument();
  });

  it('calls onProceed when the CTA is clicked', () => {
    const onProceed = vi.fn();
    render(<RoundResultScene passed round={1} roundScore={130} target={100} onProceed={onProceed} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onProceed).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd fe-next && npx vitest run components/word-craft/run/__tests__/RoundResultScene.spec.tsx`
Expected: FAIL — module `../RoundResultScene` does not exist.

- [ ] **Step 3: Create RoundResultScene.tsx**

Create `fe-next/components/word-craft/run/RoundResultScene.tsx`:

```tsx
'use client';

import { useLanguage } from '@/contexts/LanguageContext';

interface RoundResultSceneProps {
  passed: boolean;
  round: number;
  roundScore: number;
  target: number;
  onProceed: () => void;
}

export function RoundResultScene({ passed, round, roundScore, target, onProceed }: RoundResultSceneProps) {
  const { t } = useLanguage();
  return (
    <section className="flex flex-col items-center gap-4 p-6 text-center">
      <h2 className={`text-3xl font-neo-display ${passed ? 'text-neo-lime' : 'text-neo-red'}`}>
        {t(passed ? 'wordcraft.run.roundResult.passed' : 'wordcraft.run.roundResult.failed')}
      </h2>
      <p className="font-neo-body text-neo-white/80">
        {t(passed ? 'wordcraft.run.roundResult.passedSub' : 'wordcraft.run.roundResult.failedSub')}
      </p>
      <p className="font-neo-display text-neo-cream">
        {roundScore} / {target}
      </p>
      <button
        type="button"
        onClick={onProceed}
        className="animate-neo-press rounded-neo border-neo-thick border-neo-lime bg-neo-lime px-6 py-2 font-neo-display text-neo-navy shadow-hard"
      >
        {t('wordcraft.run.proceed')}
      </button>
    </section>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd fe-next && npx vitest run components/word-craft/run/__tests__/RoundResultScene.spec.tsx`
Expected: PASS — all 3 tests.

- [ ] **Step 5: Commit**

```bash
git add fe-next/components/word-craft/run/RoundResultScene.tsx fe-next/components/word-craft/run/__tests__/RoundResultScene.spec.tsx
git commit -m "feat(word-craft): add RoundResultScene component"
```

---

## Task 16: Create RunResultScene component

**Files:**
- Create: `fe-next/components/word-craft/run/RunResultScene.tsx`
- Test: `fe-next/components/word-craft/run/__tests__/RunResultScene.spec.tsx`

- [ ] **Step 1: Write the failing test**

Create `fe-next/components/word-craft/run/__tests__/RunResultScene.spec.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { RunResultScene } from '../RunResultScene';
import { POWER_CARD_POOL } from '@/lib/word-craft/run/powerCards';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k }),
}));

describe('RunResultScene', () => {
  it('shows the cleared headline and run total when the run was cleared', () => {
    render(
      <RunResultScene cleared runTotal={420} activeCards={POWER_CARD_POOL.slice(0, 2)} onRestart={vi.fn()} />,
    );
    expect(screen.getByText('wordcraft.run.runResult.cleared')).toBeInTheDocument();
    expect(screen.getByText('420')).toBeInTheDocument();
  });

  it('shows the failed headline when the run ended early', () => {
    render(<RunResultScene cleared={false} runTotal={120} activeCards={[]} onRestart={vi.fn()} />);
    expect(screen.getByText('wordcraft.run.runResult.failed')).toBeInTheDocument();
  });

  it('calls onRestart when the restart CTA is clicked', () => {
    const onRestart = vi.fn();
    render(<RunResultScene cleared runTotal={420} activeCards={[]} onRestart={onRestart} />);
    fireEvent.click(screen.getByRole('button', { name: 'wordcraft.run.restart' }));
    expect(onRestart).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd fe-next && npx vitest run components/word-craft/run/__tests__/RunResultScene.spec.tsx`
Expected: FAIL — module `../RunResultScene` does not exist.

- [ ] **Step 3: Create RunResultScene.tsx**

Create `fe-next/components/word-craft/run/RunResultScene.tsx`:

```tsx
'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import type { PowerCard } from '@/lib/word-craft/run/powerCards';

interface RunResultSceneProps {
  cleared: boolean;
  runTotal: number;
  activeCards: PowerCard[];
  onRestart: () => void;
}

export function RunResultScene({ cleared, runTotal, activeCards, onRestart }: RunResultSceneProps) {
  const { t } = useLanguage();
  return (
    <section className="flex flex-col items-center gap-4 p-6 text-center">
      <h2 className={`text-3xl font-neo-display ${cleared ? 'text-neo-lime' : 'text-neo-red'}`}>
        {t(cleared ? 'wordcraft.run.runResult.cleared' : 'wordcraft.run.runResult.failed')}
      </h2>
      <p className="font-neo-body text-neo-white/80">{t('wordcraft.run.runResult.total')}</p>
      <p className="text-5xl font-neo-display text-neo-yellow">{runTotal}</p>
      {activeCards.length > 0 && (
        <div className="flex flex-col items-center gap-1">
          <span className="text-sm font-neo-body text-neo-white/70">
            {t('wordcraft.run.runResult.cardsTaken')}
          </span>
          <div className="flex flex-wrap justify-center gap-1">
            {activeCards.map((c) => (
              <span
                key={c.id}
                className="rounded-neo border-neo bg-neo-navy-light px-2 py-0.5 text-xs font-neo-body text-neo-cyan"
              >
                {t(`wordcraft.run.card.${c.id}.name`)}
              </span>
            ))}
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={onRestart}
        className="animate-neo-press rounded-neo border-neo-thick border-neo-lime bg-neo-lime px-6 py-2 font-neo-display text-neo-navy shadow-hard"
      >
        {t('wordcraft.run.restart')}
      </button>
    </section>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd fe-next && npx vitest run components/word-craft/run/__tests__/RunResultScene.spec.tsx`
Expected: PASS — all 3 tests.

- [ ] **Step 5: Commit**

```bash
git add fe-next/components/word-craft/run/RunResultScene.tsx fe-next/components/word-craft/run/__tests__/RunResultScene.spec.tsx
git commit -m "feat(word-craft): add RunResultScene component"
```

---

## Task 17: Add English translations for wordcraft.run namespace

**Files:**
- Modify: `fe-next/translations/en.js`

- [ ] **Step 1: Locate the existing wordcraft block**

Open `fe-next/translations/en.js` and find the `"wordcraft": { ... }` object (around line 11652). You will add a nested `"run"` key inside it.

- [ ] **Step 2: Add the run namespace**

Inside the `"wordcraft"` object, add this `"run"` key (as a sibling of `"title"`, `"submit"`, etc.). Mind the trailing comma on whatever key currently precedes it:

```javascript
    "run": {
      "intro": {
        "title": "WordCraft Run",
        "howTo": "Place words to beat each round's target. Clear a round, grab a power card, push your score higher.",
        "start": "Start Run"
      },
      "round": "Round {{n}} / {{total}}",
      "score": "Score",
      "target": "Target",
      "runTotal": "Run total",
      "submit": "Submit word",
      "recall": "Recall",
      "endRound": "End round",
      "proceed": "Continue",
      "restart": "New run",
      "chips": "chips",
      "mult": "mult",
      "rarity": {
        "common": "Common",
        "rare": "Rare",
        "legendary": "Legendary"
      },
      "cardPick": {
        "title": "Pick a Power Card",
        "subtitle": "It stacks for the rest of your run."
      },
      "roundResult": {
        "passed": "Target cleared!",
        "passedSub": "Pick a power card and keep the run going.",
        "failed": "Just short!",
        "failedSub": "You didn't reach the target this round."
      },
      "runResult": {
        "cleared": "Run cleared!",
        "failed": "Run over",
        "total": "Final run score",
        "cardsTaken": "Cards collected",
        "share": "WordCraft Run: {{score}}"
      },
      "card": {
        "vowelPower": { "name": "Vowel Power", "desc": "Vowels are worth +2 chips each." },
        "longGame": { "name": "Long Game", "desc": "Words of 5+ letters score double." },
        "combo": { "name": "Combo Chain", "desc": "Each word after the first this round adds +1 multiplier." },
        "premiumHunter": { "name": "Premium Hunter", "desc": "Every premium square you use adds +1 multiplier." },
        "wildcardStash": { "name": "Wildcard Stash", "desc": "Start every round with a blank tile." },
        "quickHands": { "name": "Quick Hands", "desc": "Adds 4 extra tiles to every round's bag." },
        "doubleDown": { "name": "Double Down", "desc": "Your first word each round scores triple." },
        "rareLetters": { "name": "Rare Letters", "desc": "Tiles worth 4+ points give +3 chips each." },
        "shortSweet": { "name": "Short & Sweet", "desc": "Three-letter words get +15 chips." },
        "steadyBuild": { "name": "Steady Build", "desc": "Every word gets +5 flat chips." },
        "overflow": { "name": "Overflow", "desc": "Score over the target carries 10% as a bonus." },
        "letterHoard": { "name": "Letter Hoard", "desc": "Your rack holds 10 tiles instead of 8." }
      }
    },
```

- [ ] **Step 3: Verify the file still parses**

Run: `cd fe-next && node -e "require('./translations/en.js'); console.log('en.js OK')"`
Expected: prints `en.js OK` (no syntax error).

- [ ] **Step 4: Commit**

```bash
git add fe-next/translations/en.js
git commit -m "feat(word-craft): add English wordcraft.run translations"
```

---

## Task 18: Add he/sv/ja/es translations for wordcraft.run namespace

**Files:**
- Modify: `fe-next/translations/he.js`, `fe-next/translations/sv.js`, `fe-next/translations/ja.js`, `fe-next/translations/es.js`

- [ ] **Step 1: Add the run namespace to each of the four locale files**

For each file, find its `"wordcraft": { ... }` block and add a `"run"` key with the same structure as Task 17. Use the translations below. (HE/SV/JA/ES are AI-generated — the commit message flags them for native review per project convention.)

**`he.js`** (Hebrew, RTL):

```javascript
    "run": {
      "intro": {
        "title": "ריצת WordCraft",
        "howTo": "הניחו מילים כדי לעבור את היעד של כל סבב. עברו סבב, קחו קלף כוח, והעלו את הניקוד.",
        "start": "התחילו ריצה"
      },
      "round": "סבב {{n}} / {{total}}",
      "score": "ניקוד",
      "target": "יעד",
      "runTotal": "ניקוד כולל",
      "submit": "שלחו מילה",
      "recall": "החזרה",
      "endRound": "סיום סבב",
      "proceed": "המשך",
      "restart": "ריצה חדשה",
      "chips": "נקודות",
      "mult": "מכפיל",
      "rarity": {
        "common": "רגיל",
        "rare": "נדיר",
        "legendary": "אגדי"
      },
      "cardPick": {
        "title": "בחרו קלף כוח",
        "subtitle": "הוא נשאר פעיל עד סוף הריצה."
      },
      "roundResult": {
        "passed": "היעד הושג!",
        "passedSub": "בחרו קלף כוח והמשיכו בריצה.",
        "failed": "כמעט!",
        "failedSub": "לא הגעתם ליעד בסבב הזה."
      },
      "runResult": {
        "cleared": "הריצה הושלמה!",
        "failed": "הריצה הסתיימה",
        "total": "ניקוד סופי",
        "cardsTaken": "קלפים שנאספו",
        "share": "ריצת WordCraft: {{score}}"
      },
      "card": {
        "vowelPower": { "name": "כוח התנועות", "desc": "כל אות תנועה שווה +2 נקודות." },
        "longGame": { "name": "המשחק הארוך", "desc": "מילים של 5 אותיות ומעלה מקבלות ניקוד כפול." },
        "combo": { "name": "שרשרת קומבו", "desc": "כל מילה אחרי הראשונה בסבב מוסיפה +1 למכפיל." },
        "premiumHunter": { "name": "צייד הבונוסים", "desc": "כל משבצת בונוס שתשתמשו בה מוסיפה +1 למכפיל." },
        "wildcardStash": { "name": "מאגר ג'וקרים", "desc": "מתחילים כל סבב עם אריח ריק." },
        "quickHands": { "name": "ידיים זריזות", "desc": "מוסיף 4 אריחים לשק של כל סבב." },
        "doubleDown": { "name": "הכפלה", "desc": "המילה הראשונה בכל סבב מקבלת ניקוד משולש." },
        "rareLetters": { "name": "אותיות נדירות", "desc": "אריחים ששווים 4 נקודות ומעלה נותנים +3 נקודות כל אחד." },
        "shortSweet": { "name": "קצר וקולע", "desc": "מילים בנות שלוש אותיות מקבלות +15 נקודות." },
        "steadyBuild": { "name": "בנייה יציבה", "desc": "כל מילה מקבלת +5 נקודות קבועות." },
        "overflow": { "name": "גלישה", "desc": "ניקוד מעל היעד מעניק בונוס של 10%." },
        "letterHoard": { "name": "אוצר אותיות", "desc": "המעמד מחזיק 10 אריחים במקום 8." }
      }
    },
```

**`sv.js`** (Swedish):

```javascript
    "run": {
      "intro": {
        "title": "WordCraft-runda",
        "howTo": "Lägg ord för att slå varje rundas mål. Klara en runda, ta ett kraftkort och höj din poäng.",
        "start": "Starta runda"
      },
      "round": "Runda {{n}} / {{total}}",
      "score": "Poäng",
      "target": "Mål",
      "runTotal": "Total poäng",
      "submit": "Skicka ord",
      "recall": "Ångra",
      "endRound": "Avsluta runda",
      "proceed": "Fortsätt",
      "restart": "Ny runda",
      "chips": "marker",
      "mult": "multiplikator",
      "rarity": {
        "common": "Vanlig",
        "rare": "Sällsynt",
        "legendary": "Legendarisk"
      },
      "cardPick": {
        "title": "Välj ett kraftkort",
        "subtitle": "Det gäller resten av rundan."
      },
      "roundResult": {
        "passed": "Målet klarat!",
        "passedSub": "Välj ett kraftkort och fortsätt.",
        "failed": "Nästan!",
        "failedSub": "Du nådde inte målet den här rundan."
      },
      "runResult": {
        "cleared": "Rundan klar!",
        "failed": "Rundan slut",
        "total": "Slutpoäng",
        "cardsTaken": "Insamlade kort",
        "share": "WordCraft-runda: {{score}}"
      },
      "card": {
        "vowelPower": { "name": "Vokalkraft", "desc": "Vokaler är värda +2 marker styck." },
        "longGame": { "name": "Långt spel", "desc": "Ord med 5+ bokstäver ger dubbel poäng." },
        "combo": { "name": "Combokedja", "desc": "Varje ord efter det första rundan ger +1 multiplikator." },
        "premiumHunter": { "name": "Bonusjägare", "desc": "Varje bonusruta du använder ger +1 multiplikator." },
        "wildcardStash": { "name": "Jokerförråd", "desc": "Börja varje runda med en blank bricka." },
        "quickHands": { "name": "Snabba händer", "desc": "Lägger till 4 extra brickor i varje rundas påse." },
        "doubleDown": { "name": "Dubbla upp", "desc": "Ditt första ord varje runda ger tredubbel poäng." },
        "rareLetters": { "name": "Sällsynta bokstäver", "desc": "Brickor värda 4+ poäng ger +3 marker styck." },
        "shortSweet": { "name": "Kort och gott", "desc": "Treboksstavsord får +15 marker." },
        "steadyBuild": { "name": "Stadig bygge", "desc": "Varje ord får +5 fasta marker." },
        "overflow": { "name": "Överflöd", "desc": "Poäng över målet ger 10% som bonus." },
        "letterHoard": { "name": "Bokstavslager", "desc": "Ditt ställ rymmer 10 brickor istället för 8." }
      }
    },
```

**`ja.js`** (Japanese):

```javascript
    "run": {
      "intro": {
        "title": "WordCraft ラン",
        "howTo": "単語を置いて各ラウンドの目標を超えよう。ラウンドをクリアしてパワーカードを獲得し、スコアを伸ばそう。",
        "start": "ラン開始"
      },
      "round": "ラウンド {{n}} / {{total}}",
      "score": "スコア",
      "target": "目標",
      "runTotal": "ラン合計",
      "submit": "単語を送信",
      "recall": "戻す",
      "endRound": "ラウンド終了",
      "proceed": "続ける",
      "restart": "新しいラン",
      "chips": "チップ",
      "mult": "倍率",
      "rarity": {
        "common": "コモン",
        "rare": "レア",
        "legendary": "レジェンダリー"
      },
      "cardPick": {
        "title": "パワーカードを選択",
        "subtitle": "ランの残り全体で効果が続きます。"
      },
      "roundResult": {
        "passed": "目標達成！",
        "passedSub": "パワーカードを選んでランを続けよう。",
        "failed": "あと少し！",
        "failedSub": "このラウンドは目標に届きませんでした。"
      },
      "runResult": {
        "cleared": "ランクリア！",
        "failed": "ラン終了",
        "total": "最終ランスコア",
        "cardsTaken": "獲得したカード",
        "share": "WordCraft ラン: {{score}}"
      },
      "card": {
        "vowelPower": { "name": "母音パワー", "desc": "母音は1つにつき+2チップ。" },
        "longGame": { "name": "ロングゲーム", "desc": "5文字以上の単語はスコア2倍。" },
        "combo": { "name": "コンボチェーン", "desc": "ラウンド内で最初の単語以降、1語ごとに倍率+1。" },
        "premiumHunter": { "name": "プレミアムハンター", "desc": "使ったプレミアムマスごとに倍率+1。" },
        "wildcardStash": { "name": "ワイルドカード備蓄", "desc": "毎ラウンド、空白タイルを1枚持って開始。" },
        "quickHands": { "name": "クイックハンド", "desc": "毎ラウンドの袋にタイルを4枚追加。" },
        "doubleDown": { "name": "ダブルダウン", "desc": "毎ラウンド最初の単語はスコア3倍。" },
        "rareLetters": { "name": "レアレター", "desc": "4点以上のタイルは1枚につき+3チップ。" },
        "shortSweet": { "name": "ショート＆スイート", "desc": "3文字の単語に+15チップ。" },
        "steadyBuild": { "name": "ステディビルド", "desc": "すべての単語に固定+5チップ。" },
        "overflow": { "name": "オーバーフロー", "desc": "目標を超えたスコアの10%をボーナスとして獲得。" },
        "letterHoard": { "name": "レターホード", "desc": "ラックが8枚ではなく10枚になる。" }
      }
    },
```

**`es.js`** (Spanish):

```javascript
    "run": {
      "intro": {
        "title": "Partida WordCraft",
        "howTo": "Coloca palabras para superar el objetivo de cada ronda. Supera una ronda, toma una carta de poder y sube tu puntuación.",
        "start": "Empezar partida"
      },
      "round": "Ronda {{n}} / {{total}}",
      "score": "Puntos",
      "target": "Objetivo",
      "runTotal": "Total de la partida",
      "submit": "Enviar palabra",
      "recall": "Retirar",
      "endRound": "Terminar ronda",
      "proceed": "Continuar",
      "restart": "Nueva partida",
      "chips": "fichas",
      "mult": "multiplicador",
      "rarity": {
        "common": "Común",
        "rare": "Rara",
        "legendary": "Legendaria"
      },
      "cardPick": {
        "title": "Elige una carta de poder",
        "subtitle": "Se acumula durante el resto de la partida."
      },
      "roundResult": {
        "passed": "¡Objetivo superado!",
        "passedSub": "Elige una carta de poder y sigue jugando.",
        "failed": "¡Por poco!",
        "failedSub": "No alcanzaste el objetivo esta ronda."
      },
      "runResult": {
        "cleared": "¡Partida completada!",
        "failed": "Fin de la partida",
        "total": "Puntuación final",
        "cardsTaken": "Cartas conseguidas",
        "share": "Partida WordCraft: {{score}}"
      },
      "card": {
        "vowelPower": { "name": "Poder Vocal", "desc": "Cada vocal vale +2 fichas." },
        "longGame": { "name": "Juego Largo", "desc": "Las palabras de 5+ letras puntúan el doble." },
        "combo": { "name": "Cadena de Combo", "desc": "Cada palabra después de la primera en la ronda suma +1 al multiplicador." },
        "premiumHunter": { "name": "Cazador de Premios", "desc": "Cada casilla premium que uses suma +1 al multiplicador." },
        "wildcardStash": { "name": "Reserva de Comodines", "desc": "Empieza cada ronda con una ficha en blanco." },
        "quickHands": { "name": "Manos Rápidas", "desc": "Añade 4 fichas extra a la bolsa de cada ronda." },
        "doubleDown": { "name": "Doble o Nada", "desc": "Tu primera palabra de cada ronda puntúa el triple." },
        "rareLetters": { "name": "Letras Raras", "desc": "Las fichas de 4+ puntos dan +3 fichas cada una." },
        "shortSweet": { "name": "Corto y Dulce", "desc": "Las palabras de tres letras reciben +15 fichas." },
        "steadyBuild": { "name": "Construcción Firme", "desc": "Cada palabra recibe +5 fichas fijas." },
        "overflow": { "name": "Desbordamiento", "desc": "Los puntos por encima del objetivo dan un 10% de bonificación." },
        "letterHoard": { "name": "Reserva de Letras", "desc": "Tu atril tiene 10 fichas en lugar de 8." }
      }
    },
```

- [ ] **Step 2: Verify each file still parses**

Run: `cd fe-next && node -e "['he','sv','ja','es'].forEach(l => { require('./translations/'+l+'.js'); console.log(l+'.js OK'); })"`
Expected: prints `he.js OK`, `sv.js OK`, `ja.js OK`, `es.js OK`.

- [ ] **Step 3: Commit**

```bash
git add fe-next/translations/he.js fe-next/translations/sv.js fe-next/translations/ja.js fe-next/translations/es.js
git commit -m "feat(word-craft): add he/sv/ja/es wordcraft.run translations (needs native review)"
```

---

## Task 19: Create RunPageClient orchestrator

**Files:**
- Create: `fe-next/app/[locale]/word-craft/RunPageClient.tsx`
- Test: `fe-next/app/[locale]/word-craft/__tests__/RunPageClient.spec.tsx`

**Context:** This component drives the phase state machine. It reuses the existing `WordCraftBoardSection` and `WordCraftRack` components for the `playing` phase. The dictionary is loaded the same way the legacy `PageClient` does it: via `loadWordCraftDictionary` from `@/lib/word-craft/dictionary`.

- [ ] **Step 1: Confirm the dictionary loader + board section prop shapes**

Read the top of `fe-next/app/[locale]/word-craft/PageClient.tsx` and `fe-next/components/word-craft/WordCraftBoardSection.tsx`. Confirm: (a) `loadWordCraftDictionary()` returns `Promise<Set<string>>`, (b) `WordCraftBoardSection` props include `board`, `pending`, `onCellTap(cell)`, `onSceneCtx(ctx)`. Note exact prop names — adjust the JSX in Step 3 if they differ.

- [ ] **Step 2: Write the failing test**

Create `fe-next/app/[locale]/word-craft/__tests__/RunPageClient.spec.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { RunPageClient } from '../RunPageClient';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));
vi.mock('@/contexts/NavigationContext', () => ({ useHideNavigation: () => {} }));
vi.mock('@/lib/word-craft/dictionary', () => ({
  loadWordCraftDictionary: () => Promise.resolve(new Set(['cat', 'cats'])),
}));
// Board section is heavy + Pixi-bound; stub it for the orchestrator test.
vi.mock('@/components/word-craft/WordCraftBoardSection', () => ({
  WordCraftBoardSection: () => <div data-testid="board-section" />,
}));
vi.mock('@/components/word-craft/WordCraftRack', () => ({
  WordCraftRack: () => <div data-testid="rack" />,
}));

describe('RunPageClient', () => {
  it('renders the intro screen first with a start button', async () => {
    render(<RunPageClient />);
    expect(await screen.findByText('wordcraft.run.intro.title')).toBeInTheDocument();
    expect(screen.getByText('wordcraft.run.intro.start')).toBeInTheDocument();
  });

  it('moves to the playing phase when the run starts', async () => {
    render(<RunPageClient />);
    fireEvent.click(await screen.findByText('wordcraft.run.intro.start'));
    expect(await screen.findByTestId('board-section')).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd fe-next && npx vitest run app/[locale]/word-craft/__tests__/RunPageClient.spec.tsx`
Expected: FAIL — module `../RunPageClient` does not exist.

- [ ] **Step 4: Create RunPageClient.tsx**

Create `fe-next/app/[locale]/word-craft/RunPageClient.tsx`. (If Step 1 found different prop names for `WordCraftBoardSection`/`WordCraftRack`, adjust the two JSX usages accordingly — everything else stays.)

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useHideNavigation } from '@/contexts/NavigationContext';
import { loadWordCraftDictionary } from '@/lib/word-craft/dictionary';
import { useWordCraftRun } from '@/lib/word-craft/run/useWordCraftRun';
import { WordCraftBoardSection } from '@/components/word-craft/WordCraftBoardSection';
import { WordCraftRack } from '@/components/word-craft/WordCraftRack';
import { RunHUD } from '@/components/word-craft/run/RunHUD';
import { CardPickScreen } from '@/components/word-craft/run/CardPickScreen';
import { RoundResultScene } from '@/components/word-craft/run/RoundResultScene';
import { RunResultScene } from '@/components/word-craft/run/RunResultScene';

export function RunPageClient() {
  const { t } = useLanguage();
  useHideNavigation();

  const [dict, setDict] = useState<Set<string> | null>(null);
  useEffect(() => {
    let cancelled = false;
    loadWordCraftDictionary().then((d) => {
      if (!cancelled) setDict(d);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const boardSize: 7 | 9 =
    typeof window !== 'undefined' && window.innerWidth >= 768 ? 9 : 7;

  const run = useWordCraftRun({ seed: 1, dict, locale: 'en', boardSize });
  const { state } = run;

  if (!dict) {
    return <div className="p-6 text-center font-neo-body text-neo-white/70">…</div>;
  }

  if (state.phase === 'intro') {
    return (
      <section className="flex flex-col items-center gap-4 p-6 text-center">
        <h1 className="text-3xl font-neo-display text-neo-lime">{t('wordcraft.run.intro.title')}</h1>
        <p className="max-w-md font-neo-body text-neo-white/80">{t('wordcraft.run.intro.howTo')}</p>
        <button
          type="button"
          onClick={run.startRun}
          className="animate-neo-press rounded-neo border-neo-thick border-neo-lime bg-neo-lime px-6 py-2 font-neo-display text-neo-navy shadow-hard"
        >
          {t('wordcraft.run.intro.start')}
        </button>
      </section>
    );
  }

  if (state.phase === 'cardPick' && state.cardChoice) {
    return <CardPickScreen cards={state.cardChoice} onPick={run.pickCard} />;
  }

  if (state.phase === 'roundResult') {
    return (
      <RoundResultScene
        passed={state.roundPassed}
        round={state.round.round}
        roundScore={state.round.score}
        target={state.round.target}
        onProceed={run.proceed}
      />
    );
  }

  if (state.phase === 'runResult') {
    return (
      <RunResultScene
        cleared={state.cleared}
        runTotal={state.runTotal}
        activeCards={state.activeCards}
        onRestart={run.restart}
      />
    );
  }

  // state.phase === 'playing'
  return (
    <div className="flex flex-col gap-3 p-3">
      <RunHUD
        round={state.round.round}
        target={state.round.target}
        score={state.round.score}
        runTotal={state.runTotal}
        activeCards={state.activeCards}
        tilesRemaining={run.tilesRemaining}
      />
      <WordCraftBoardSection
        board={state.board}
        pending={state.pendingPlacements}
        onCellTap={(cell: { row: number; col: number }) => {
          if (state.selectedRackTileId) {
            run.placeTile(state.selectedRackTileId, cell.row, cell.col);
          }
        }}
      />
      <WordCraftRack
        rack={state.rack}
        selectedRackTileId={state.selectedRackTileId}
        onSelectTile={run.selectRackTile}
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={run.submitMove}
          className="animate-neo-press rounded-neo border-neo border-neo-lime bg-neo-lime px-4 py-2 font-neo-display text-neo-navy shadow-hard"
        >
          {t('wordcraft.run.submit')}
        </button>
        <button
          type="button"
          onClick={run.recallAll}
          className="animate-neo-press rounded-neo border-neo border-neo-cyan bg-neo-navy-light px-4 py-2 font-neo-body text-neo-cyan shadow-hard"
        >
          {t('wordcraft.run.recall')}
        </button>
        <button
          type="button"
          onClick={run.endRound}
          className="animate-neo-press rounded-neo border-neo border-neo-pink bg-neo-navy-light px-4 py-2 font-neo-body text-neo-pink shadow-hard"
        >
          {t('wordcraft.run.endRound')}
        </button>
      </div>
      {state.lastError && (
        <p className="font-neo-body text-sm text-neo-red">{state.lastError}</p>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd fe-next && npx vitest run app/[locale]/word-craft/__tests__/RunPageClient.spec.tsx`
Expected: PASS — both tests.

- [ ] **Step 6: Verify the file is under 500 lines**

Run: `wc -l fe-next/app/[locale]/word-craft/RunPageClient.tsx`
Expected: well under 500 (CLAUDE.md hard limit).

- [ ] **Step 7: Commit**

```bash
git add fe-next/app/[locale]/word-craft/RunPageClient.tsx fe-next/app/[locale]/word-craft/__tests__/RunPageClient.spec.tsx
git commit -m "feat(word-craft): add RunPageClient phase orchestrator"
```

---

## Task 20: Wire the feature flag into PageClient

**Files:**
- Modify: `fe-next/app/[locale]/word-craft/PageClient.tsx`

- [ ] **Step 1: Add the flag branch at the top of PageClient**

In `fe-next/app/[locale]/word-craft/PageClient.tsx`, add these imports near the existing imports:

```typescript
import { useWordCraftRunFlag } from '@/hooks/useWordCraftRunFlag';
import { RunPageClient } from './RunPageClient';
```

Then, as the **very first lines inside the `PageClient` component body** (before any other hooks — `useWordCraftRunFlag` must be called unconditionally, and the early return is fine because it comes before all other hook calls **only if** no hooks precede it; if the component already calls hooks at the top, move this call to sit alongside them and place the early return immediately after the last hook):

```typescript
  const runModeEnabled = useWordCraftRunFlag();
  if (runModeEnabled) {
    return <RunPageClient />;
  }
```

> **Important:** React's rules of hooks require all hooks to run in the same order every render. Place `useWordCraftRunFlag()` with the other top-level hook calls in `PageClient`, and put the `if (runModeEnabled) return ...` immediately after the last hook call but before any other early returns. If `PageClient` has many hooks, the safest spot is: call `useWordCraftRunFlag()` as the first hook, keep all other existing hooks, then add `if (runModeEnabled) return <RunPageClient />;` right after the last hook and before the first piece of conditional render logic.

- [ ] **Step 2: Verify the legacy path still type-checks**

Run: `cd fe-next && npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 3: Run the existing WordCraft test suite to confirm no regression**

Run: `cd fe-next && npx vitest run lib/word-craft components/word-craft app/[locale]/word-craft`
Expected: PASS — all existing + new WordCraft tests green.

- [ ] **Step 4: Commit**

```bash
git add fe-next/app/[locale]/word-craft/PageClient.tsx
git commit -m "feat(word-craft): gate run mode behind useWordCraftRunFlag"
```

---

## Task 21: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Run lint**

Run: `cd fe-next && npm run lint`
Expected: 0 errors. Fix any introduced by the new files.

- [ ] **Step 2: Run the full frontend test suite**

Run: `cd fe-next && npm run test:frontend`
Expected: all green, no new failures vs. the pre-change baseline.

- [ ] **Step 3: Run a fast build**

Run: `cd fe-next && npm run build:fast`
Expected: exit 0.

- [ ] **Step 4: Manual smoke test (dev server already runs on port 3001)**

With `npm run dev` running, set `NEXT_PUBLIC_WORDCRAFT_RUN_DEV=1` in `.env.local`, open `http://localhost:3001/en/word-craft`, and verify: intro screen → start → place a word → submit (chips×mult pop) → End round → round result → card pick → next round → run result → new run. Also open `?locale=he` to confirm RTL renders.

- [ ] **Step 5: Commit any lint/build fixes**

```bash
git add -A
git commit -m "chore(word-craft): fix lint and build issues for run mode"
```

(Skip this commit if Steps 1–3 needed no changes.)

---

## Self-Review Notes

- **Spec coverage:** Core loop → Tasks 6–9, 19. Chips×mult scoring → Tasks 2, 4, 9. Power cards (12) → Task 3. Difficulty curve + seed → Task 5. Small boards → Task 1. Pixi scenes → Task 11. Components → Tasks 12–16. i18n (5 locales) → Tasks 17–18. Feature flag + rollout step 1 → Tasks 10, 20. Error handling (invalid word = no penalty) → Task 9 `submitMove` + Task 7 reducer. Rollout step 3 (delete legacy) is intentionally a **follow-up PR**, not in this plan.
- **Type consistency:** `RunState`/`RunAction` defined in Task 6, consumed identically in Tasks 7–9. `WordScore` defined in Task 4, used in Tasks 6, 9. `ScoreContext`/`PowerCard` defined in Task 3, used in Tasks 4, 6, 9, 12–16.
- **Known integration risk:** Tasks 1, 19, 20 modify or depend on files not fully read during planning (`board.ts` internals, `WordCraftBoardSection` prop names, `PageClient` hook order). Each of those tasks starts with an explicit read/confirm step and notes how to adjust. Verify those prop/signature assumptions during execution.
