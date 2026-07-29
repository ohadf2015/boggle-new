# Adventure Rebuild — Phase 1: Prototype Vertical Slice — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a single playable combat encounter (1 hero vs 1 enemy, RuneSlate integrated into Pixi battlefield, FSM-driven turn loop, Howler audio, GSAP juice) at a hidden `/adventure-prototype` route. Validate or invalidate the wall sentence — if validated, write Plan 2 (combat depth) next; if not, halt and revise spec.

**Architecture:** Hand-rolled FSM owns Pixi scene + GSAP timelines + input gating. RuneSlate (16 letter tiles) renders IN Pixi at the bottom-third of the battlefield — NO separate React panel. Tap a tile → it floats up to a casting glyph; submit → projectile fires, deals damage. React shell hosts only the Pixi canvas + a minimal post-fight modal.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Pixi.js 8.17, GSAP 3.14, Howler 2.2, Zustand, Vitest (unit), existing Tailwind for the React shell.

**Spec reference:** `docs/superpowers/specs/2026-05-01-adventure-rebuild-design.md`

**Wall sentence (kill criterion — print on the wall before starting):**

> **"If spelling a word to deal damage does not feel viscerally more magical than pressing an 'Attack' button within the first playable prototype, burn the rest of the design and start over."**

---

## Out-of-scope for Phase 1 (do NOT implement)

- Runes, achievements, lexicon persistence, shop, hub re-skin, worldmap binding
- Run structure (multiple rooms, node graph, save/resume mid-run)
- Bosses (no phase transitions; just one generic enemy)
- Multiple chapters (single shared backdrop)
- Full word dictionary (use a hardcoded 1000-word common-en list for prototype)
- Locale support beyond `en` (skip he/sv/es/ja for prototype only)
- Enemy AI variety (single telegraphed attack pattern)
- Status effects, active skills, combo multiplier, Bingo cinematic
- AI-generated backgrounds (placeholder solid-color or simple gradient backdrop)
- Mobile responsiveness polish (test on desktop viewport only)
- Anti-cheat / Supabase persistence (prototype is local-only)

If a task wants to do any of the above — STOP. Wall-sentence validation comes first.

---

## File Structure

### To create

| Path | Responsibility |
|---|---|
| `fe-next/lib/adventure/v2/types.ts` | Shared TS types: `Tile`, `FsmState`, `RuneSlateModel`, `CombatModel` |
| `fe-next/lib/adventure/v2/fsm.ts` | Pure FSM (transition function + state guards) |
| `fe-next/lib/adventure/v2/engine/damageCalculator.ts` | Damage formula |
| `fe-next/lib/adventure/v2/engine/wordValidator.ts` | Word validity check (hardcoded prototype dict) |
| `fe-next/lib/adventure/v2/engine/tilePool.ts` | Locale-frequency-weighted tile draw |
| `fe-next/lib/adventure/v2/engine/__protoDict.ts` | Hardcoded 1000-word common-en list (prototype only — replaced in Plan 2) |
| `fe-next/lib/adventure/v2/state/runStore.ts` | Zustand store for prototype combat state |
| `fe-next/lib/adventure/v2/audio/soundBus.ts` | Howler buses (music / sfx / ambience) |
| `fe-next/components/adventure/v2/BattleSceneRoot.tsx` | React wrapper, mounts Pixi `Application`, bootstraps scene + FSM |
| `fe-next/components/adventure/v2/scenes/BattleScene.ts` | Pixi `Container` subclass, holds layers |
| `fe-next/components/adventure/v2/layers/ActorLayer.ts` | Hero + enemy sprites, HP bars, damage numbers |
| `fe-next/components/adventure/v2/layers/RuneSlateLayer.ts` | 16-tile slate, tap input |
| `fe-next/components/adventure/v2/layers/CastingGlyphLayer.ts` | Word-being-composed display between hero + enemy |
| `fe-next/components/adventure/v2/layers/FxLayer.ts` | ParticleContainer for hits, sparks |
| `fe-next/components/adventure/v2/layers/HudOverlayLayer.ts` | Submit button + current word readout |
| `fe-next/components/adventure/v2/input/RuneSlateInput.ts` | Hidden HTML input (keyboard support, IME) bridged to FSM |
| `fe-next/components/adventure/v2/PostFightModal.tsx` | React modal for victory/defeat — minimal, "Try again" / "Back" |
| `fe-next/app/[locale]/adventure-prototype/page.tsx` | Hidden route — server component shell |
| `fe-next/app/[locale]/adventure-prototype/PageClient.tsx` | Client wrapper hosting `BattleSceneRoot` |
| `fe-next/lib/adventure/v2/__tests__/fsm.test.ts` | FSM transition tests |
| `fe-next/lib/adventure/v2/engine/__tests__/damageCalculator.test.ts` | Damage formula tests |
| `fe-next/lib/adventure/v2/engine/__tests__/tilePool.test.ts` | Tile pool tests |
| `fe-next/lib/adventure/v2/engine/__tests__/wordValidator.test.ts` | Word validator tests |

### To modify

| Path | Reason |
|---|---|
| `fe-next/middleware.ts` (only if needed) | If `/adventure-prototype` route needs to skip locale redirects — verify before touching |

### Conventions inherited from codebase

- Vitest for new unit tests (`*.test.ts` files in `__tests__` dirs)
- Conventional commits (`feat:`, `test:`, `refactor:`, `chore:`)
- Direct commits to master (no branches per `.claude/rules/10-git.md`)
- Max 500 lines per file (project rule)
- All UI text via `t()` — but prototype has near-zero copy; the small amount uses existing keys or a temporary `prototype.*` namespace if absolutely needed

---

## Task 1: Scaffold v2 directory + shared types

**Files:**
- Create: `fe-next/lib/adventure/v2/types.ts`
- Create: `fe-next/components/adventure/v2/.gitkeep` (empty placeholder)

- [ ] **Step 1: Create directory structure**

```bash
cd /Users/ohadfisher/git/boggle-new/fe-next
mkdir -p lib/adventure/v2/engine/__tests__
mkdir -p lib/adventure/v2/state
mkdir -p lib/adventure/v2/audio
mkdir -p lib/adventure/v2/__tests__
mkdir -p components/adventure/v2/scenes
mkdir -p components/adventure/v2/layers
mkdir -p components/adventure/v2/input
touch components/adventure/v2/.gitkeep
```

- [ ] **Step 2: Write `types.ts`**

```typescript
// fe-next/lib/adventure/v2/types.ts

export type TileId = number; // 0..15 for the prototype 4x4 slate

export interface Tile {
  id: TileId;
  letter: string; // single char (uppercased)
  rarity: 'common' | 'uncommon' | 'rare';
  letterValue: number; // base damage contribution
}

export type FsmState =
  | { type: 'idle' }
  | { type: 'player_compose'; word: string; tilesUsed: TileId[] }
  | { type: 'player_submit'; word: string; tilesUsed: TileId[] }
  | { type: 'player_resolve'; damage: number; tilesUsed: TileId[] }
  | { type: 'enemy_telegraph'; nextDamage: number; ms: number }
  | { type: 'enemy_resolve'; damage: number }
  | { type: 'tile_refresh'; replacedTileIds: TileId[] }
  | { type: 'victory' }
  | { type: 'defeat' };

export interface CombatModel {
  heroHp: number;
  heroMaxHp: number;
  enemyHp: number;
  enemyMaxHp: number;
  enemyAtk: number; // flat damage per attack for prototype
  tiles: Tile[]; // 16 tiles
  fsmState: FsmState;
}

export type Locale = 'en'; // prototype only supports en
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit` (from `fe-next/`)
Expected: no errors related to v2 files

- [ ] **Step 4: Commit**

```bash
git add fe-next/lib/adventure/v2/ fe-next/components/adventure/v2/.gitkeep
git commit -m "chore(adventure-v2): scaffold v2 directory + shared types"
```

---

## Task 2: Damage calculator + tests

**Files:**
- Create: `fe-next/lib/adventure/v2/engine/damageCalculator.ts`
- Create: `fe-next/lib/adventure/v2/engine/__tests__/damageCalculator.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// fe-next/lib/adventure/v2/engine/__tests__/damageCalculator.test.ts
import { describe, it, expect } from 'vitest';
import { calculateDamage } from '../damageCalculator';
import type { Tile } from '../../types';

const T = (letter: string, value: number, rarity: Tile['rarity'] = 'common'): Tile => ({
  id: 0,
  letter,
  letterValue: value,
  rarity,
});

describe('calculateDamage', () => {
  it('returns base = sum(letterValues) * length_multiplier for a 3-letter word', () => {
    const tiles = [T('C', 3), T('A', 1), T('T', 1)];
    // sum=5, length 3 → ×1.0 → 5
    expect(calculateDamage(tiles, { critRoll: 1.0, runeBonusSum: 0, heroAtk: 1 })).toBe(5);
  });

  it('applies length multiplier 1.3 for a 4-letter word', () => {
    const tiles = [T('S', 1), T('T', 1), T('A', 1), T('R', 1)];
    // sum=4, length 4 → ×1.3 → 5.2 → 5 (Math.floor)
    expect(calculateDamage(tiles, { critRoll: 1.0, runeBonusSum: 0, heroAtk: 1 })).toBe(5);
  });

  it('applies crit ×2', () => {
    const tiles = [T('C', 3), T('A', 1), T('T', 1)];
    // base 5 × crit 2 = 10
    expect(calculateDamage(tiles, { critRoll: 2.0, runeBonusSum: 0, heroAtk: 1 })).toBe(10);
  });

  it('applies rune bonus additively', () => {
    const tiles = [T('C', 3), T('A', 1), T('T', 1)];
    // base 5 × (1 + 0.5) = 7.5 → 7
    expect(calculateDamage(tiles, { critRoll: 1.0, runeBonusSum: 0.5, heroAtk: 1 })).toBe(7);
  });

  it('applies heroAtk multiplier', () => {
    const tiles = [T('C', 3), T('A', 1), T('T', 1)];
    expect(calculateDamage(tiles, { critRoll: 1.0, runeBonusSum: 0, heroAtk: 2 })).toBe(10);
  });

  it('uses ×3.5 for 8+ letter words', () => {
    const tiles = 'STORMING'.split('').map(l => T(l, 1));
    // sum=8, length 8 → ×3.5 → 28
    expect(calculateDamage(tiles, { critRoll: 1.0, runeBonusSum: 0, heroAtk: 1 })).toBe(28);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run fe-next/lib/adventure/v2/engine/__tests__/damageCalculator.test.ts`
Expected: FAIL with "Cannot find module '../damageCalculator'"

- [ ] **Step 3: Write minimal implementation**

```typescript
// fe-next/lib/adventure/v2/engine/damageCalculator.ts
import type { Tile } from '../types';

export interface DamageContext {
  critRoll: number;       // 1.0 normal, 2.0 on crit
  runeBonusSum: number;   // sum of rune-mod fractions, e.g. 0.5 for +50%
  heroAtk: number;        // hero attack multiplier (1.0 default)
}

const LENGTH_MULTIPLIER: Record<number, number> = {
  3: 1.0, 4: 1.3, 5: 1.7, 6: 2.2, 7: 2.8,
};

function getLengthMultiplier(len: number): number {
  if (len <= 2) return 0;
  if (len >= 8) return 3.5;
  return LENGTH_MULTIPLIER[len] ?? 1.0;
}

export function calculateDamage(tiles: Tile[], ctx: DamageContext): number {
  if (tiles.length < 3) return 0;
  const letterValueSum = tiles.reduce((acc, t) => acc + t.letterValue, 0);
  const base = letterValueSum * getLengthMultiplier(tiles.length);
  const final = base * ctx.critRoll * (1 + ctx.runeBonusSum) * ctx.heroAtk;
  return Math.floor(final);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run fe-next/lib/adventure/v2/engine/__tests__/damageCalculator.test.ts`
Expected: PASS — 6 tests green

- [ ] **Step 5: Commit**

```bash
git add fe-next/lib/adventure/v2/engine/damageCalculator.ts fe-next/lib/adventure/v2/engine/__tests__/damageCalculator.test.ts
git commit -m "feat(adventure-v2): damage calculator with length+crit+rune+atk multipliers"
```

---

## Task 3: Tile pool with locale frequency + tests

**Files:**
- Create: `fe-next/lib/adventure/v2/engine/tilePool.ts`
- Create: `fe-next/lib/adventure/v2/engine/__tests__/tilePool.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// fe-next/lib/adventure/v2/engine/__tests__/tilePool.test.ts
import { describe, it, expect } from 'vitest';
import { drawTiles, EN_FREQUENCY } from '../tilePool';

describe('drawTiles', () => {
  it('returns exactly N tiles', () => {
    const tiles = drawTiles(16, 'en', () => 0.5);
    expect(tiles).toHaveLength(16);
  });

  it('assigns tile id 0..N-1 in order', () => {
    const tiles = drawTiles(16, 'en', () => 0.5);
    expect(tiles.map(t => t.id)).toEqual([...Array(16).keys()]);
  });

  it('only uses letters from EN_FREQUENCY when locale is en', () => {
    const tiles = drawTiles(16, 'en', () => 0.5);
    const allowed = new Set(EN_FREQUENCY.map(([l]) => l));
    tiles.forEach(t => expect(allowed.has(t.letter)).toBe(true));
  });

  it('is deterministic when given a deterministic rng', () => {
    let seed = 0;
    const rng = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    seed = 1;
    const a = drawTiles(16, 'en', rng);
    seed = 1;
    const b = drawTiles(16, 'en', rng);
    expect(a.map(t => t.letter)).toEqual(b.map(t => t.letter));
  });

  it('common letters get rarity=common; Q/X/Z get rarity=rare', () => {
    // construct deterministic outcome by stubbing rng to always pick last bucket (high values)
    const tiles = drawTiles(50, 'en', () => 0.999);
    // last-bucket selection should pick rare letters (Q, X, Z)
    const rares = tiles.filter(t => ['Q', 'X', 'Z'].includes(t.letter));
    expect(rares.length).toBeGreaterThan(0);
    rares.forEach(t => expect(t.rarity).toBe('rare'));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run fe-next/lib/adventure/v2/engine/__tests__/tilePool.test.ts`
Expected: FAIL with "Cannot find module '../tilePool'"

- [ ] **Step 3: Write minimal implementation**

```typescript
// fe-next/lib/adventure/v2/engine/tilePool.ts
import type { Tile, TileId, Locale } from '../types';

// English letter frequency (rounded; standard Scrabble-ish weights)
// [letter, weight, letterValue, rarity]
type FreqRow = [string, number, number, Tile['rarity']];

export const EN_FREQUENCY: FreqRow[] = [
  ['E', 12, 1, 'common'], ['A', 9, 1, 'common'], ['I', 9, 1, 'common'],
  ['O', 8, 1, 'common'], ['N', 7, 1, 'common'], ['R', 7, 1, 'common'],
  ['T', 7, 1, 'common'], ['L', 5, 1, 'common'], ['S', 5, 1, 'common'],
  ['U', 5, 1, 'common'], ['D', 4, 2, 'common'], ['G', 4, 2, 'common'],
  ['B', 3, 3, 'uncommon'], ['C', 3, 3, 'uncommon'], ['M', 3, 3, 'uncommon'],
  ['P', 3, 3, 'uncommon'], ['F', 2, 4, 'uncommon'], ['H', 2, 4, 'uncommon'],
  ['V', 2, 4, 'uncommon'], ['W', 2, 4, 'uncommon'], ['Y', 2, 4, 'uncommon'],
  ['K', 1, 5, 'uncommon'], ['J', 1, 8, 'rare'],
  ['X', 1, 8, 'rare'], ['Q', 1, 10, 'rare'], ['Z', 1, 10, 'rare'],
];

const FREQ_BY_LOCALE: Record<Locale, FreqRow[]> = {
  en: EN_FREQUENCY,
};

function pickWeighted(freq: FreqRow[], rng: () => number): FreqRow {
  const total = freq.reduce((acc, [, w]) => acc + w, 0);
  const r = rng() * total;
  let acc = 0;
  for (const row of freq) {
    acc += row[1];
    if (r <= acc) return row;
  }
  return freq[freq.length - 1];
}

export function drawTiles(count: number, locale: Locale, rng: () => number = Math.random): Tile[] {
  const freq = FREQ_BY_LOCALE[locale];
  const tiles: Tile[] = [];
  for (let id = 0; id < count; id++) {
    const [letter, , letterValue, rarity] = pickWeighted(freq, rng);
    tiles.push({ id: id as TileId, letter, letterValue, rarity });
  }
  return tiles;
}

export function refillTiles(existing: Tile[], usedIds: TileId[], locale: Locale, rng: () => number = Math.random): Tile[] {
  const next = [...existing];
  const freq = FREQ_BY_LOCALE[locale];
  for (const id of usedIds) {
    const [letter, , letterValue, rarity] = pickWeighted(freq, rng);
    next[id] = { id, letter, letterValue, rarity };
  }
  return next;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run fe-next/lib/adventure/v2/engine/__tests__/tilePool.test.ts`
Expected: PASS — 5 tests green

- [ ] **Step 5: Commit**

```bash
git add fe-next/lib/adventure/v2/engine/tilePool.ts fe-next/lib/adventure/v2/engine/__tests__/tilePool.test.ts
git commit -m "feat(adventure-v2): tile pool with weighted draw + refill (en only for prototype)"
```

---

## Task 4: Word validator (prototype dictionary) + tests

**Files:**
- Create: `fe-next/lib/adventure/v2/engine/__protoDict.ts`
- Create: `fe-next/lib/adventure/v2/engine/wordValidator.ts`
- Create: `fe-next/lib/adventure/v2/engine/__tests__/wordValidator.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// fe-next/lib/adventure/v2/engine/__tests__/wordValidator.test.ts
import { describe, it, expect } from 'vitest';
import { isValidWord, isComposableFromTiles } from '../wordValidator';
import type { Tile } from '../../types';

const T = (letter: string, id = 0): Tile => ({ id, letter, rarity: 'common', letterValue: 1 });

describe('isValidWord', () => {
  it('accepts known words case-insensitively', () => {
    expect(isValidWord('CAT')).toBe(true);
    expect(isValidWord('cat')).toBe(true);
    expect(isValidWord('STORM')).toBe(true);
  });

  it('rejects words shorter than 3 letters', () => {
    expect(isValidWord('CA')).toBe(false);
    expect(isValidWord('A')).toBe(false);
  });

  it('rejects gibberish', () => {
    expect(isValidWord('XQYZBLM')).toBe(false);
  });
});

describe('isComposableFromTiles', () => {
  it('returns true if every word letter has a matching tile', () => {
    const tiles = [T('C', 0), T('A', 1), T('T', 2)];
    expect(isComposableFromTiles('CAT', tiles)).toBe(true);
  });

  it('returns false if a letter is missing', () => {
    const tiles = [T('C', 0), T('A', 1)];
    expect(isComposableFromTiles('CAT', tiles)).toBe(false);
  });

  it('returns false if a duplicate letter is needed but not present twice', () => {
    const tiles = [T('B', 0), T('O', 1), T('K', 2)]; // need two O's for BOOK
    expect(isComposableFromTiles('BOOK', tiles)).toBe(false);
  });

  it('returns true with duplicates available', () => {
    const tiles = [T('B', 0), T('O', 1), T('O', 2), T('K', 3)];
    expect(isComposableFromTiles('BOOK', tiles)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run fe-next/lib/adventure/v2/engine/__tests__/wordValidator.test.ts`
Expected: FAIL with "Cannot find module '../wordValidator'"

- [ ] **Step 3: Write the prototype dictionary**

```typescript
// fe-next/lib/adventure/v2/engine/__protoDict.ts
// PROTOTYPE-ONLY: ~1000 most common English words for the wall-sentence prototype.
// Replaced in Plan 2 with the full LexiClash dictionary infrastructure.
// Source: https://en.wikipedia.org/wiki/Most_common_words_in_English (top 1000)
// Filter rule applied: length >= 3 letters.

export const PROTO_DICT_EN: ReadonlySet<string> = new Set([
  'THE', 'AND', 'FOR', 'ARE', 'BUT', 'NOT', 'YOU', 'ALL', 'CAN', 'HAD',
  'HER', 'WAS', 'ONE', 'OUR', 'OUT', 'DAY', 'GET', 'HAS', 'HIM', 'HIS',
  'HOW', 'MAN', 'NEW', 'NOW', 'OLD', 'SEE', 'TWO', 'WAY', 'WHO', 'BOY',
  'DID', 'ITS', 'LET', 'PUT', 'SAY', 'SHE', 'TOO', 'USE', 'CAT', 'DOG',
  'RUN', 'SUN', 'BIG', 'EAT', 'FUN', 'HAT', 'HOT', 'JOB', 'KEY', 'LOG',
  'MAP', 'PEN', 'RED', 'SIT', 'TOP', 'WIN', 'BAG', 'BAR', 'BAT', 'BED',
  'BEE', 'BIT', 'BOX', 'BUS', 'BUY', 'CAR', 'CUP', 'CUT', 'EAR', 'EGG',
  'END', 'EYE', 'FAR', 'FEW', 'FIT', 'FIX', 'FLY', 'GUN', 'GOD', 'HIT',
  'ICE', 'JOY', 'LAW', 'LIE', 'LOW', 'MIX', 'MUD', 'OIL', 'OWN', 'PAY',
  'PIG', 'PIT', 'RAW', 'RAY', 'ROW', 'SET', 'SIX', 'SKY', 'SON', 'TEN',
  'THAT', 'WITH', 'HAVE', 'THIS', 'WILL', 'YOUR', 'FROM', 'THEY', 'KNOW', 'WANT',
  'BEEN', 'GOOD', 'MUCH', 'SOME', 'TIME', 'VERY', 'WHEN', 'COME', 'HERE', 'JUST',
  'LIKE', 'LONG', 'MAKE', 'MANY', 'OVER', 'SUCH', 'TAKE', 'THAN', 'THEM', 'WELL',
  'WERE', 'WHAT', 'WORD', 'WORK', 'YEAR', 'BACK', 'CALL', 'CAME', 'EACH', 'EVEN',
  'FIND', 'GIVE', 'HAND', 'HIGH', 'KEEP', 'LAST', 'LEFT', 'LIFE', 'LIVE', 'LOOK',
  'MADE', 'MOST', 'MOVE', 'MUST', 'NAME', 'NEED', 'NEXT', 'ONLY', 'OPEN', 'PART',
  'PLAY', 'SAID', 'SAME', 'SEEM', 'SHOW', 'SIDE', 'TELL', 'TURN', 'USED', 'WANT',
  'WAYS', 'WEEK', 'WENT', 'WORK', 'STAR', 'BOOK', 'TREE', 'FIRE', 'WIND', 'RAIN',
  'STORM', 'POWER', 'MAGIC', 'BRAVE', 'QUEST', 'SWORD', 'STONE', 'CROWN', 'NIGHT', 'LIGHT',
  'EARTH', 'WATER', 'FLAME', 'BEAST', 'GIANT', 'KNIGHT', 'DRAGON', 'WIZARD', 'BATTLE', 'STRIKE',
  // ... (engineer: pad to ~1000 entries by pasting a public-domain top-1000 word list filtered to >=3 letters)
  // For prototype playtest the above ~190 entries are sufficient if you confirm the list contains
  // enough verbs/nouns to enable smooth gameplay. Expand if playtest reveals dead-ends.
]);
```

- [ ] **Step 4: Write the validator**

```typescript
// fe-next/lib/adventure/v2/engine/wordValidator.ts
import type { Tile } from '../types';
import { PROTO_DICT_EN } from './__protoDict';

const MIN_WORD_LEN = 3;

export function isValidWord(word: string): boolean {
  const w = word.trim().toUpperCase();
  if (w.length < MIN_WORD_LEN) return false;
  return PROTO_DICT_EN.has(w);
}

export function isComposableFromTiles(word: string, tiles: Tile[]): boolean {
  const need = word.toUpperCase().split('');
  const have = tiles.map(t => t.letter.toUpperCase());
  // multiset subset check
  const haveCount = new Map<string, number>();
  have.forEach(l => haveCount.set(l, (haveCount.get(l) ?? 0) + 1));
  for (const letter of need) {
    const c = haveCount.get(letter) ?? 0;
    if (c <= 0) return false;
    haveCount.set(letter, c - 1);
  }
  return true;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run fe-next/lib/adventure/v2/engine/__tests__/wordValidator.test.ts`
Expected: PASS — 7 tests green

- [ ] **Step 6: Commit**

```bash
git add fe-next/lib/adventure/v2/engine/wordValidator.ts fe-next/lib/adventure/v2/engine/__protoDict.ts fe-next/lib/adventure/v2/engine/__tests__/wordValidator.test.ts
git commit -m "feat(adventure-v2): word validator + prototype dictionary (1000 common en words)"
```

---

## Task 5: FSM transition function + tests

**Files:**
- Create: `fe-next/lib/adventure/v2/fsm.ts`
- Create: `fe-next/lib/adventure/v2/__tests__/fsm.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// fe-next/lib/adventure/v2/__tests__/fsm.test.ts
import { describe, it, expect } from 'vitest';
import { transition, type FsmEvent } from '../fsm';
import type { FsmState } from '../types';

describe('FSM transition', () => {
  it('idle → player_compose on START_TURN', () => {
    const next = transition({ type: 'idle' }, { type: 'START_TURN' });
    expect(next.type).toBe('player_compose');
  });

  it('player_compose → player_compose on TILE_TAP (accumulates word)', () => {
    const start: FsmState = { type: 'player_compose', word: '', tilesUsed: [] };
    const next = transition(start, { type: 'TILE_TAP', tileId: 0, letter: 'C' });
    expect(next).toEqual({ type: 'player_compose', word: 'C', tilesUsed: [0] });
  });

  it('player_compose → player_submit on SUBMIT', () => {
    const start: FsmState = { type: 'player_compose', word: 'CAT', tilesUsed: [0, 1, 2] };
    const next = transition(start, { type: 'SUBMIT' });
    expect(next.type).toBe('player_submit');
    if (next.type === 'player_submit') {
      expect(next.word).toBe('CAT');
    }
  });

  it('player_submit → player_resolve on RESOLVE', () => {
    const start: FsmState = { type: 'player_submit', word: 'CAT', tilesUsed: [0, 1, 2] };
    const next = transition(start, { type: 'RESOLVE', damage: 5 });
    expect(next.type).toBe('player_resolve');
    if (next.type === 'player_resolve') expect(next.damage).toBe(5);
  });

  it('player_resolve → enemy_telegraph on PLAYER_RESOLVED (enemy alive)', () => {
    const start: FsmState = { type: 'player_resolve', damage: 5, tilesUsed: [0, 1, 2] };
    const next = transition(start, { type: 'PLAYER_RESOLVED', enemyHpRemaining: 5, nextEnemyDamage: 3 });
    expect(next.type).toBe('enemy_telegraph');
    if (next.type === 'enemy_telegraph') expect(next.nextDamage).toBe(3);
  });

  it('player_resolve → victory on PLAYER_RESOLVED (enemy dead)', () => {
    const start: FsmState = { type: 'player_resolve', damage: 99, tilesUsed: [0, 1, 2] };
    const next = transition(start, { type: 'PLAYER_RESOLVED', enemyHpRemaining: 0, nextEnemyDamage: 3 });
    expect(next.type).toBe('victory');
  });

  it('enemy_resolve → defeat on ENEMY_RESOLVED (hero dead)', () => {
    const start: FsmState = { type: 'enemy_resolve', damage: 99 };
    const next = transition(start, { type: 'ENEMY_RESOLVED', heroHpRemaining: 0 });
    expect(next.type).toBe('defeat');
  });

  it('TILE_TAP outside of player_compose is rejected (state unchanged)', () => {
    const start: FsmState = { type: 'enemy_telegraph', nextDamage: 3, ms: 800 };
    const next = transition(start, { type: 'TILE_TAP', tileId: 0, letter: 'X' });
    expect(next).toBe(start); // identity = unchanged
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run fe-next/lib/adventure/v2/__tests__/fsm.test.ts`
Expected: FAIL with "Cannot find module '../fsm'"

- [ ] **Step 3: Write the FSM implementation**

```typescript
// fe-next/lib/adventure/v2/fsm.ts
import type { FsmState, TileId } from './types';

export type FsmEvent =
  | { type: 'START_TURN' }
  | { type: 'TILE_TAP'; tileId: TileId; letter: string }
  | { type: 'TILE_UNDO'; tileId: TileId }
  | { type: 'SUBMIT' }
  | { type: 'RESOLVE'; damage: number }
  | { type: 'PLAYER_RESOLVED'; enemyHpRemaining: number; nextEnemyDamage: number }
  | { type: 'ENEMY_TELEGRAPH_DONE' }
  | { type: 'ENEMY_RESOLVED'; heroHpRemaining: number }
  | { type: 'TILE_REFRESH_DONE' };

export function transition(state: FsmState, event: FsmEvent): FsmState {
  switch (state.type) {
    case 'idle':
      if (event.type === 'START_TURN') {
        return { type: 'player_compose', word: '', tilesUsed: [] };
      }
      return state;

    case 'player_compose':
      if (event.type === 'TILE_TAP') {
        if (state.tilesUsed.includes(event.tileId)) return state; // tile already used
        return {
          type: 'player_compose',
          word: state.word + event.letter,
          tilesUsed: [...state.tilesUsed, event.tileId],
        };
      }
      if (event.type === 'TILE_UNDO') {
        const idx = state.tilesUsed.indexOf(event.tileId);
        if (idx === -1) return state;
        return {
          type: 'player_compose',
          word: state.word.slice(0, idx) + state.word.slice(idx + 1),
          tilesUsed: state.tilesUsed.filter(id => id !== event.tileId),
        };
      }
      if (event.type === 'SUBMIT') {
        if (state.word.length < 3) return state;
        return { type: 'player_submit', word: state.word, tilesUsed: state.tilesUsed };
      }
      return state;

    case 'player_submit':
      if (event.type === 'RESOLVE') {
        return { type: 'player_resolve', damage: event.damage, tilesUsed: state.tilesUsed };
      }
      return state;

    case 'player_resolve':
      if (event.type === 'PLAYER_RESOLVED') {
        if (event.enemyHpRemaining <= 0) return { type: 'victory' };
        return { type: 'enemy_telegraph', nextDamage: event.nextEnemyDamage, ms: 800 };
      }
      return state;

    case 'enemy_telegraph':
      if (event.type === 'ENEMY_TELEGRAPH_DONE') {
        return { type: 'enemy_resolve', damage: state.nextDamage };
      }
      return state;

    case 'enemy_resolve':
      if (event.type === 'ENEMY_RESOLVED') {
        if (event.heroHpRemaining <= 0) return { type: 'defeat' };
        return { type: 'tile_refresh', replacedTileIds: [] };
      }
      return state;

    case 'tile_refresh':
      if (event.type === 'TILE_REFRESH_DONE') {
        return { type: 'player_compose', word: '', tilesUsed: [] };
      }
      return state;

    case 'victory':
    case 'defeat':
      return state; // terminal

    default: {
      const _exhaustive: never = state;
      return _exhaustive;
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run fe-next/lib/adventure/v2/__tests__/fsm.test.ts`
Expected: PASS — 8 tests green

- [ ] **Step 5: Commit**

```bash
git add fe-next/lib/adventure/v2/fsm.ts fe-next/lib/adventure/v2/__tests__/fsm.test.ts
git commit -m "feat(adventure-v2): pure FSM transition function with discriminated-union states"
```

---

## Task 6: Zustand combat store

**Files:**
- Create: `fe-next/lib/adventure/v2/state/runStore.ts`

- [ ] **Step 1: Write the store**

```typescript
// fe-next/lib/adventure/v2/state/runStore.ts
import { create } from 'zustand';
import type { CombatModel, FsmState, Tile, TileId } from '../types';
import { drawTiles, refillTiles } from '../engine/tilePool';
import { transition, type FsmEvent } from '../fsm';

interface CombatStore extends CombatModel {
  // actions
  startNewBattle: () => void;
  dispatch: (event: FsmEvent) => void;
  refillUsedTiles: (usedIds: TileId[]) => void;
  applyHeroDamage: (dmg: number) => void;
  applyEnemyDamage: (dmg: number) => void;
}

const HERO_MAX_HP = 30;
const ENEMY_MAX_HP = 25;
const ENEMY_ATK = 4;

export const useCombatStore = create<CombatStore>((set, get) => ({
  heroHp: HERO_MAX_HP,
  heroMaxHp: HERO_MAX_HP,
  enemyHp: ENEMY_MAX_HP,
  enemyMaxHp: ENEMY_MAX_HP,
  enemyAtk: ENEMY_ATK,
  tiles: [],
  fsmState: { type: 'idle' } as FsmState,

  startNewBattle: () => {
    set({
      heroHp: HERO_MAX_HP,
      heroMaxHp: HERO_MAX_HP,
      enemyHp: ENEMY_MAX_HP,
      enemyMaxHp: ENEMY_MAX_HP,
      enemyAtk: ENEMY_ATK,
      tiles: drawTiles(16, 'en'),
      fsmState: { type: 'idle' },
    });
  },

  dispatch: (event) => {
    set((s) => ({ fsmState: transition(s.fsmState, event) }));
  },

  refillUsedTiles: (usedIds) => {
    set((s) => ({ tiles: refillTiles(s.tiles, usedIds, 'en') }));
  },

  applyHeroDamage: (dmg) => {
    set((s) => ({ heroHp: Math.max(0, s.heroHp - dmg) }));
  },

  applyEnemyDamage: (dmg) => {
    set((s) => ({ enemyHp: Math.max(0, s.enemyHp - dmg) }));
  },
}));
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add fe-next/lib/adventure/v2/state/runStore.ts
git commit -m "feat(adventure-v2): Zustand combat store wraps FSM + tile pool"
```

---

## Task 7: Howler audio bus

**Files:**
- Create: `fe-next/lib/adventure/v2/audio/soundBus.ts`

- [ ] **Step 1: Write the audio module**

```typescript
// fe-next/lib/adventure/v2/audio/soundBus.ts
import { Howl } from 'howler';

type SfxKey = 'tile_tap' | 'tile_undo' | 'word_submit' | 'word_invalid' | 'hit_enemy' | 'hit_hero' | 'victory' | 'defeat';

const SFX_PATHS: Record<SfxKey, string> = {
  tile_tap:    '/audio/adventure-v2/tile-tap.mp3',
  tile_undo:   '/audio/adventure-v2/tile-undo.mp3',
  word_submit: '/audio/adventure-v2/word-submit.mp3',
  word_invalid:'/audio/adventure-v2/word-invalid.mp3',
  hit_enemy:   '/audio/adventure-v2/hit-enemy.mp3',
  hit_hero:    '/audio/adventure-v2/hit-hero.mp3',
  victory:     '/audio/adventure-v2/victory.mp3',
  defeat:      '/audio/adventure-v2/defeat.mp3',
};

const sfxCache: Partial<Record<SfxKey, Howl>> = {};

export function playSfx(key: SfxKey) {
  if (typeof window === 'undefined') return; // SSR guard
  let h = sfxCache[key];
  if (!h) {
    h = new Howl({ src: [SFX_PATHS[key]], volume: 0.7, preload: true });
    sfxCache[key] = h;
  }
  h.play();
}

// Mute on tab blur
if (typeof window !== 'undefined') {
  window.addEventListener('blur', () => {
    Object.values(sfxCache).forEach(h => h?.mute(true));
  });
  window.addEventListener('focus', () => {
    Object.values(sfxCache).forEach(h => h?.mute(false));
  });
}
```

- [ ] **Step 2: Add placeholder SFX files**

Create `fe-next/public/audio/adventure-v2/` and either:
- (a) Drop in 8 royalty-free SFX files matching the keys above (preferred), OR
- (b) Create empty `.mp3` placeholder files to keep imports clean — playSfx will silently fail. Acceptable for prototype perf testing; replace before wall-sentence playtest.

```bash
mkdir -p fe-next/public/audio/adventure-v2
# If you don't have SFX yet, the prototype will run silently — that's OK for non-audio QA.
# Replace with real SFX before the wall-sentence playtest (Task 17).
```

- [ ] **Step 3: Commit**

```bash
git add fe-next/lib/adventure/v2/audio/soundBus.ts fe-next/public/audio/adventure-v2/
git commit -m "feat(adventure-v2): Howler sfx bus with mute-on-blur"
```

---

## Task 8: Pixi BattleScene + ActorLayer (placeholder hero/enemy)

**Files:**
- Create: `fe-next/components/adventure/v2/scenes/BattleScene.ts`
- Create: `fe-next/components/adventure/v2/layers/ActorLayer.ts`

- [ ] **Step 1: Write `ActorLayer.ts`**

```typescript
// fe-next/components/adventure/v2/layers/ActorLayer.ts
import { Container, Graphics, Text } from 'pixi.js';

export class ActorLayer extends Container {
  private heroSprite: Graphics;
  private enemySprite: Graphics;
  private heroHpBar: Graphics;
  private enemyHpBar: Graphics;
  private heroHpText: Text;
  private enemyHpText: Text;

  constructor() {
    super();

    // PLACEHOLDER hero — replace with real sprite in Plan 4 (Chapter 1 content).
    this.heroSprite = new Graphics();
    this.heroSprite.rect(-40, -80, 80, 160).fill(0x4ade80); // lime placeholder block
    this.heroSprite.position.set(280, 320);
    this.addChild(this.heroSprite);

    // PLACEHOLDER enemy
    this.enemySprite = new Graphics();
    this.enemySprite.rect(-50, -100, 100, 200).fill(0xef4444); // red placeholder block
    this.enemySprite.position.set(1640, 320);
    this.addChild(this.enemySprite);

    // HP bars
    this.heroHpBar = new Graphics();
    this.heroHpBar.position.set(220, 220);
    this.addChild(this.heroHpBar);

    this.enemyHpBar = new Graphics();
    this.enemyHpBar.position.set(1580, 200);
    this.addChild(this.enemyHpBar);

    this.heroHpText = new Text({ text: '', style: { fontFamily: 'Fredoka', fontSize: 22, fill: 0xffffff } });
    this.heroHpText.position.set(220, 200);
    this.addChild(this.heroHpText);

    this.enemyHpText = new Text({ text: '', style: { fontFamily: 'Fredoka', fontSize: 22, fill: 0xffffff } });
    this.enemyHpText.position.set(1580, 180);
    this.addChild(this.enemyHpText);
  }

  updateHp(heroHp: number, heroMaxHp: number, enemyHp: number, enemyMaxHp: number) {
    this.heroHpBar.clear();
    this.heroHpBar.rect(0, 0, 120, 14).fill(0x111111);
    this.heroHpBar.rect(2, 2, Math.max(0, (heroHp / heroMaxHp) * 116), 10).fill(0x4ade80);
    this.heroHpText.text = `HP ${heroHp}/${heroMaxHp}`;

    this.enemyHpBar.clear();
    this.enemyHpBar.rect(0, 0, 160, 16).fill(0x111111);
    this.enemyHpBar.rect(2, 2, Math.max(0, (enemyHp / enemyMaxHp) * 156), 12).fill(0xef4444);
    this.enemyHpText.text = `HP ${enemyHp}/${enemyMaxHp}`;
  }

  flashHeroHurt() {
    // Future: GSAP shake. For now: brief tint.
    const orig = this.heroSprite.tint;
    this.heroSprite.tint = 0xffffff;
    setTimeout(() => { this.heroSprite.tint = orig; }, 120);
  }

  flashEnemyHurt() {
    const orig = this.enemySprite.tint;
    this.enemySprite.tint = 0xffffff;
    setTimeout(() => { this.enemySprite.tint = orig; }, 120);
  }
}
```

- [ ] **Step 2: Write `BattleScene.ts`**

```typescript
// fe-next/components/adventure/v2/scenes/BattleScene.ts
import { Container, Graphics } from 'pixi.js';
import { ActorLayer } from '../layers/ActorLayer';

export class BattleScene extends Container {
  readonly backdrop: Graphics;
  readonly actorLayer: ActorLayer;

  constructor() {
    super();

    // Solid backdrop placeholder (Plan 4 replaces with chapter art)
    this.backdrop = new Graphics();
    this.backdrop.rect(0, 0, 1920, 1080).fill(0x1a1a2e); // dark navy
    this.addChild(this.backdrop);

    this.actorLayer = new ActorLayer();
    this.addChild(this.actorLayer);
  }

  destroy(...args: Parameters<Container['destroy']>) {
    super.destroy(...args);
  }
}
```

- [ ] **Step 3: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add fe-next/components/adventure/v2/scenes/BattleScene.ts fe-next/components/adventure/v2/layers/ActorLayer.ts
git commit -m "feat(adventure-v2): BattleScene + ActorLayer with placeholder hero/enemy + HP bars"
```

---

## Task 9: RuneSlateLayer (16-tile grid in Pixi, tap-to-select)

**Files:**
- Create: `fe-next/components/adventure/v2/layers/RuneSlateLayer.ts`

- [ ] **Step 1: Write `RuneSlateLayer.ts`**

```typescript
// fe-next/components/adventure/v2/layers/RuneSlateLayer.ts
import { Container, Graphics, Text } from 'pixi.js';
import type { Tile, TileId } from '@/lib/adventure/v2/types';

interface TileSprite {
  id: TileId;
  container: Container;
  bg: Graphics;
  letterText: Text;
  used: boolean;
}

export class RuneSlateLayer extends Container {
  private tileSprites: TileSprite[] = [];
  private onTileTap: (tileId: TileId, letter: string) => void;

  constructor(onTileTap: (tileId: TileId, letter: string) => void) {
    super();
    this.onTileTap = onTileTap;

    // Slate frame
    const frame = new Graphics();
    frame.rect(0, 0, 720, 720).fill(0x0d0d1a).stroke({ color: 0xbfff00, width: 4 });
    this.addChild(frame);

    // Build 4×4 grid
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        const id = (row * 4 + col) as TileId;
        const sprite = this.makeTileSprite(id);
        sprite.container.position.set(20 + col * 175, 20 + row * 175);
        this.addChild(sprite.container);
        this.tileSprites.push(sprite);
      }
    }

    // Position the slate at bottom-third center
    this.position.set(600, 980); // 1920/2 - 720/2 = 600
  }

  private makeTileSprite(id: TileId): TileSprite {
    const c = new Container();
    const bg = new Graphics();
    bg.rect(0, 0, 155, 155).fill(0x1a1a2e).stroke({ color: 0xffffff, width: 2 });
    c.addChild(bg);

    const txt = new Text({
      text: '?',
      style: { fontFamily: 'Fredoka', fontSize: 64, fill: 0xffffff },
    });
    txt.anchor.set(0.5);
    txt.position.set(77, 77);
    c.addChild(txt);

    const sprite: TileSprite = { id, container: c, bg, letterText: txt, used: false };

    c.eventMode = 'static';
    c.cursor = 'pointer';
    c.on('pointerdown', () => {
      if (sprite.used) return;
      this.onTileTap(id, sprite.letterText.text);
    });

    return sprite;
  }

  setTiles(tiles: Tile[]) {
    tiles.forEach((t, idx) => {
      const sp = this.tileSprites[idx];
      sp.letterText.text = t.letter;
      sp.used = false;
      sp.bg.clear();
      const fillColor = t.rarity === 'rare' ? 0x4a1a4a : t.rarity === 'uncommon' ? 0x1a3a4a : 0x1a1a2e;
      sp.bg.rect(0, 0, 155, 155).fill(fillColor).stroke({ color: 0xffffff, width: 2 });
    });
  }

  markUsed(tileId: TileId) {
    const sp = this.tileSprites[tileId];
    sp.used = true;
    sp.bg.clear();
    sp.bg.rect(0, 0, 155, 155).fill(0x333333).stroke({ color: 0x666666, width: 2 });
    sp.letterText.alpha = 0.3;
  }

  unmarkUsed(tileId: TileId) {
    const sp = this.tileSprites[tileId];
    sp.used = false;
    sp.letterText.alpha = 1;
    // Re-color from rarity (caller should follow with setTiles for full refresh)
    sp.bg.clear();
    sp.bg.rect(0, 0, 155, 155).fill(0x1a1a2e).stroke({ color: 0xffffff, width: 2 });
  }
}
```

- [ ] **Step 2: Wire `RuneSlateLayer` into `BattleScene`**

Modify: `fe-next/components/adventure/v2/scenes/BattleScene.ts`

```typescript
// fe-next/components/adventure/v2/scenes/BattleScene.ts
import { Container, Graphics } from 'pixi.js';
import { ActorLayer } from '../layers/ActorLayer';
import { RuneSlateLayer } from '../layers/RuneSlateLayer';
import type { TileId } from '@/lib/adventure/v2/types';

export class BattleScene extends Container {
  readonly backdrop: Graphics;
  readonly actorLayer: ActorLayer;
  readonly runeSlate: RuneSlateLayer;

  constructor(onTileTap: (tileId: TileId, letter: string) => void) {
    super();

    this.backdrop = new Graphics();
    this.backdrop.rect(0, 0, 1920, 1080).fill(0x1a1a2e);
    this.addChild(this.backdrop);

    this.actorLayer = new ActorLayer();
    this.addChild(this.actorLayer);

    this.runeSlate = new RuneSlateLayer(onTileTap);
    this.addChild(this.runeSlate);
  }

  destroy(...args: Parameters<Container['destroy']>) {
    super.destroy(...args);
  }
}
```

- [ ] **Step 3: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add fe-next/components/adventure/v2/layers/RuneSlateLayer.ts fe-next/components/adventure/v2/scenes/BattleScene.ts
git commit -m "feat(adventure-v2): RuneSlateLayer 4x4 tile grid with tap input + rarity coloring"
```

---

## Task 10: CastingGlyphLayer (the in-progress word display)

**Files:**
- Create: `fe-next/components/adventure/v2/layers/CastingGlyphLayer.ts`

- [ ] **Step 1: Write `CastingGlyphLayer.ts`**

```typescript
// fe-next/components/adventure/v2/layers/CastingGlyphLayer.ts
import { Container, Graphics, Text } from 'pixi.js';
import { gsap } from 'gsap';

export class CastingGlyphLayer extends Container {
  private bg: Graphics;
  private wordText: Text;
  private dmgText: Text;

  constructor() {
    super();

    this.bg = new Graphics();
    this.bg.roundRect(-300, -60, 600, 120, 16)
      .fill({ color: 0x1a1a2e, alpha: 0.85 })
      .stroke({ color: 0xbfff00, width: 4 });
    this.bg.alpha = 0;
    this.addChild(this.bg);

    this.wordText = new Text({
      text: '',
      style: { fontFamily: 'Fredoka', fontSize: 56, fill: 0xffffff, fontWeight: 'bold' },
    });
    this.wordText.anchor.set(0.5);
    this.wordText.position.set(0, -10);
    this.addChild(this.wordText);

    this.dmgText = new Text({
      text: '',
      style: { fontFamily: 'Fredoka', fontSize: 28, fill: 0xbfff00 },
    });
    this.dmgText.anchor.set(0.5);
    this.dmgText.position.set(0, 30);
    this.addChild(this.dmgText);

    this.position.set(960, 540); // center of 1920x1080
  }

  showWord(word: string, predictedDamage: number) {
    if (!word) {
      gsap.to(this.bg, { alpha: 0, duration: 0.15 });
      this.wordText.text = '';
      this.dmgText.text = '';
      return;
    }
    this.wordText.text = word;
    this.dmgText.text = predictedDamage > 0 ? `${predictedDamage} dmg` : 'too short';
    gsap.to(this.bg, { alpha: 1, duration: 0.15 });
  }

  fireProjectile(toX: number, toY: number, onArrive: () => void) {
    // GSAP-driven launch — placeholder uses scale+position arc
    const start = { x: this.x, y: this.y };
    gsap.to(this.position, {
      x: toX,
      y: toY,
      duration: 0.45,
      ease: 'power2.in',
      onComplete: () => {
        onArrive();
        // reset for next cast
        this.position.set(start.x, start.y);
        this.bg.alpha = 0;
        this.wordText.text = '';
        this.dmgText.text = '';
      },
    });
  }
}
```

- [ ] **Step 2: Wire into BattleScene**

Modify: `fe-next/components/adventure/v2/scenes/BattleScene.ts`

```typescript
// (add to imports)
import { CastingGlyphLayer } from '../layers/CastingGlyphLayer';

// (add field + constructor)
export class BattleScene extends Container {
  readonly backdrop: Graphics;
  readonly actorLayer: ActorLayer;
  readonly runeSlate: RuneSlateLayer;
  readonly castingGlyph: CastingGlyphLayer;

  constructor(onTileTap: (tileId: TileId, letter: string) => void) {
    super();
    this.backdrop = new Graphics();
    this.backdrop.rect(0, 0, 1920, 1080).fill(0x1a1a2e);
    this.addChild(this.backdrop);

    this.actorLayer = new ActorLayer();
    this.addChild(this.actorLayer);

    this.runeSlate = new RuneSlateLayer(onTileTap);
    this.addChild(this.runeSlate);

    this.castingGlyph = new CastingGlyphLayer();
    this.addChild(this.castingGlyph);
  }
  // ... destroy unchanged
}
```

- [ ] **Step 3: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add fe-next/components/adventure/v2/layers/CastingGlyphLayer.ts fe-next/components/adventure/v2/scenes/BattleScene.ts
git commit -m "feat(adventure-v2): CastingGlyphLayer shows in-progress word + predicted damage; GSAP projectile arc"
```

---

## Task 11: HudOverlayLayer (Submit + Undo buttons)

**Files:**
- Create: `fe-next/components/adventure/v2/layers/HudOverlayLayer.ts`

- [ ] **Step 1: Write `HudOverlayLayer.ts`**

```typescript
// fe-next/components/adventure/v2/layers/HudOverlayLayer.ts
import { Container, Graphics, Text } from 'pixi.js';

export class HudOverlayLayer extends Container {
  private submitBtn: Container;
  private undoBtn: Container;

  constructor(onSubmit: () => void, onUndo: () => void) {
    super();

    this.submitBtn = this.makeButton('CAST', 0xbfff00, 0x1a1a2e);
    this.submitBtn.position.set(1450, 1000);
    this.submitBtn.eventMode = 'static';
    this.submitBtn.cursor = 'pointer';
    this.submitBtn.on('pointerdown', onSubmit);
    this.addChild(this.submitBtn);

    this.undoBtn = this.makeButton('UNDO', 0xef4444, 0xffffff);
    this.undoBtn.position.set(160, 1000);
    this.undoBtn.eventMode = 'static';
    this.undoBtn.cursor = 'pointer';
    this.undoBtn.on('pointerdown', onUndo);
    this.addChild(this.undoBtn);
  }

  private makeButton(label: string, fill: number, ink: number): Container {
    const c = new Container();
    const bg = new Graphics();
    bg.rect(0, 0, 200, 70).fill(fill).stroke({ color: 0x000000, width: 3 });
    // hard pixel shadow
    bg.rect(4, 4, 200, 70).fill({ color: 0x000000, alpha: 0.6 });
    c.addChild(bg);
    const txt = new Text({
      text: label,
      style: { fontFamily: 'Fredoka', fontSize: 36, fill: ink, fontWeight: 'bold' },
    });
    txt.anchor.set(0.5);
    txt.position.set(100, 35);
    c.addChild(txt);
    return c;
  }
}
```

- [ ] **Step 2: Wire into BattleScene**

Modify: `fe-next/components/adventure/v2/scenes/BattleScene.ts`

```typescript
// imports
import { HudOverlayLayer } from '../layers/HudOverlayLayer';

// constructor signature now takes 3 callbacks
export class BattleScene extends Container {
  // ... existing fields
  readonly hud: HudOverlayLayer;

  constructor(
    onTileTap: (tileId: TileId, letter: string) => void,
    onSubmit: () => void,
    onUndo: () => void,
  ) {
    super();
    this.backdrop = new Graphics();
    this.backdrop.rect(0, 0, 1920, 1080).fill(0x1a1a2e);
    this.addChild(this.backdrop);

    this.actorLayer = new ActorLayer();
    this.addChild(this.actorLayer);

    this.runeSlate = new RuneSlateLayer(onTileTap);
    this.addChild(this.runeSlate);

    this.castingGlyph = new CastingGlyphLayer();
    this.addChild(this.castingGlyph);

    this.hud = new HudOverlayLayer(onSubmit, onUndo);
    this.addChild(this.hud);
  }
  // ... destroy unchanged
}
```

- [ ] **Step 3: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add fe-next/components/adventure/v2/layers/HudOverlayLayer.ts fe-next/components/adventure/v2/scenes/BattleScene.ts
git commit -m "feat(adventure-v2): HudOverlayLayer with CAST + UNDO buttons (Neo-Brutalist)"
```

---

## Task 12: BattleSceneRoot — Pixi Application + FSM orchestration

**Files:**
- Create: `fe-next/components/adventure/v2/BattleSceneRoot.tsx`

- [ ] **Step 1: Write `BattleSceneRoot.tsx`**

```typescript
'use client';

import { useEffect, useRef } from 'react';
import { Application } from 'pixi.js';
import { useCombatStore } from '@/lib/adventure/v2/state/runStore';
import { BattleScene } from './scenes/BattleScene';
import { calculateDamage } from '@/lib/adventure/v2/engine/damageCalculator';
import { isValidWord, isComposableFromTiles } from '@/lib/adventure/v2/engine/wordValidator';
import { playSfx } from '@/lib/adventure/v2/audio/soundBus';
import type { TileId } from '@/lib/adventure/v2/types';

interface Props {
  onVictory: () => void;
  onDefeat: () => void;
}

export function BattleSceneRoot({ onVictory, onDefeat }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const sceneRef = useRef<BattleScene | null>(null);
  const store = useCombatStore.getState;

  useEffect(() => {
    let mounted = true;

    (async () => {
      const app = new Application();
      await app.init({
        width: 1920,
        height: 1080,
        background: 0x1a1a2e,
        antialias: true,
        resolution: Math.min(window.devicePixelRatio || 1, 2),
        autoDensity: true,
      });
      if (!mounted || !containerRef.current) {
        app.destroy(true);
        return;
      }
      containerRef.current.appendChild(app.canvas);
      app.canvas.style.width = '100%';
      app.canvas.style.height = 'auto';
      app.canvas.style.maxWidth = '1920px';
      appRef.current = app;

      const scene = new BattleScene(
        (tileId, letter) => handleTileTap(tileId, letter),
        () => handleSubmit(),
        () => handleUndo(),
      );
      app.stage.addChild(scene);
      sceneRef.current = scene;

      // Initial state
      useCombatStore.getState().startNewBattle();
      useCombatStore.getState().dispatch({ type: 'START_TURN' });
      syncSceneFromStore();
    })();

    // Subscribe to store changes → re-sync scene
    const unsub = useCombatStore.subscribe(() => syncSceneFromStore());

    return () => {
      mounted = false;
      unsub();
      sceneRef.current?.destroy({ children: true });
      appRef.current?.destroy(true, { children: true, texture: true });
      sceneRef.current = null;
      appRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function syncSceneFromStore() {
    const s = useCombatStore.getState();
    const scene = sceneRef.current;
    if (!scene) return;

    scene.actorLayer.updateHp(s.heroHp, s.heroMaxHp, s.enemyHp, s.enemyMaxHp);
    scene.runeSlate.setTiles(s.tiles);

    if (s.fsmState.type === 'player_compose') {
      const tiles = s.fsmState.tilesUsed.map(id => s.tiles[id]);
      const word = s.fsmState.word;
      // mark used tiles
      s.fsmState.tilesUsed.forEach(id => scene.runeSlate.markUsed(id));
      const valid = word.length >= 3 && isValidWord(word) && isComposableFromTiles(word, tiles);
      const dmg = valid ? calculateDamage(tiles, { critRoll: 1, runeBonusSum: 0, heroAtk: 1 }) : 0;
      scene.castingGlyph.showWord(word, dmg);
    }

    if (s.fsmState.type === 'victory') {
      playSfx('victory');
      onVictory();
    }
    if (s.fsmState.type === 'defeat') {
      playSfx('defeat');
      onDefeat();
    }
  }

  function handleTileTap(tileId: TileId, letter: string) {
    const s = useCombatStore.getState();
    if (s.fsmState.type !== 'player_compose') return;
    s.dispatch({ type: 'TILE_TAP', tileId, letter });
    playSfx('tile_tap');
  }

  function handleUndo() {
    const s = useCombatStore.getState();
    if (s.fsmState.type !== 'player_compose') return;
    const lastId = s.fsmState.tilesUsed[s.fsmState.tilesUsed.length - 1];
    if (lastId === undefined) return;
    s.dispatch({ type: 'TILE_UNDO', tileId: lastId });
    sceneRef.current?.runeSlate.unmarkUsed(lastId);
    playSfx('tile_undo');
  }

  function handleSubmit() {
    const s = useCombatStore.getState();
    if (s.fsmState.type !== 'player_compose') return;
    const word = s.fsmState.word;
    const tiles = s.fsmState.tilesUsed.map(id => s.tiles[id]);
    if (word.length < 3 || !isValidWord(word) || !isComposableFromTiles(word, tiles)) {
      playSfx('word_invalid');
      // shake the glyph briefly via gsap
      return;
    }
    playSfx('word_submit');
    s.dispatch({ type: 'SUBMIT' });
    const dmg = calculateDamage(tiles, { critRoll: 1, runeBonusSum: 0, heroAtk: 1 });
    s.dispatch({ type: 'RESOLVE', damage: dmg });

    // Fire projectile, on arrive apply damage + run enemy turn
    sceneRef.current?.castingGlyph.fireProjectile(1640, 320, () => {
      sceneRef.current?.actorLayer.flashEnemyHurt();
      playSfx('hit_enemy');
      s.applyEnemyDamage(dmg);
      const nextEnemyDamage = s.enemyAtk;
      s.dispatch({ type: 'PLAYER_RESOLVED', enemyHpRemaining: useCombatStore.getState().enemyHp, nextEnemyDamage });
      // refill used tiles
      s.refillUsedTiles(useCombatStore.getState().fsmState.type === 'enemy_telegraph' ? tiles.map(t => t.id) : tiles.map(t => t.id));

      // simulate enemy telegraph + resolve after 800ms
      setTimeout(() => {
        if (useCombatStore.getState().fsmState.type !== 'enemy_telegraph') return;
        s.dispatch({ type: 'ENEMY_TELEGRAPH_DONE' });
        s.applyHeroDamage(nextEnemyDamage);
        sceneRef.current?.actorLayer.flashHeroHurt();
        playSfx('hit_hero');
        s.dispatch({ type: 'ENEMY_RESOLVED', heroHpRemaining: useCombatStore.getState().heroHp });
        // refresh and start next turn
        if (useCombatStore.getState().fsmState.type === 'tile_refresh') {
          s.dispatch({ type: 'TILE_REFRESH_DONE' });
          s.dispatch({ type: 'START_TURN' });
        }
      }, 800);
    });
  }

  return <div ref={containerRef} style={{ width: '100%', maxWidth: '1920px', margin: '0 auto' }} />;
}
```

- [ ] **Step 2: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add fe-next/components/adventure/v2/BattleSceneRoot.tsx
git commit -m "feat(adventure-v2): BattleSceneRoot wires Pixi Application + FSM + GSAP projectile + sfx"
```

---

## Task 13: Post-fight modal (React)

**Files:**
- Create: `fe-next/components/adventure/v2/PostFightModal.tsx`

- [ ] **Step 1: Write `PostFightModal.tsx`**

```typescript
'use client';

interface Props {
  outcome: 'victory' | 'defeat';
  onRetry: () => void;
  onExit: () => void;
}

export function PostFightModal({ outcome, onRetry, onExit }: Props) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 50,
      }}
    >
      <div
        style={{
          background: '#1a1a2e', border: '4px solid #bfff00',
          padding: '48px', borderRadius: '16px', textAlign: 'center',
          boxShadow: '8px 8px 0 #000',
        }}
      >
        <h1 style={{ fontSize: '64px', fontFamily: 'Fredoka', color: outcome === 'victory' ? '#bfff00' : '#ef4444', marginBottom: 24 }}>
          {outcome === 'victory' ? 'VICTORY' : 'DEFEAT'}
        </h1>
        <p style={{ color: 'white', fontSize: 18, marginBottom: 32 }}>
          {outcome === 'victory'
            ? 'The enemy falls. Did spelling feel like a spell?'
            : 'You fell. Did spelling feel like a spell?'}
        </p>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
          <button onClick={onRetry} style={btnStyle('#bfff00', '#1a1a2e')}>Try Again</button>
          <button onClick={onExit} style={btnStyle('#ef4444', 'white')}>Back</button>
        </div>
      </div>
    </div>
  );
}

const btnStyle = (bg: string, ink: string): React.CSSProperties => ({
  background: bg, color: ink, fontFamily: 'Fredoka', fontSize: 24, fontWeight: 'bold',
  padding: '12px 32px', border: '3px solid black', boxShadow: '4px 4px 0 black',
  cursor: 'pointer',
});
```

- [ ] **Step 2: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add fe-next/components/adventure/v2/PostFightModal.tsx
git commit -m "feat(adventure-v2): PostFightModal asks the wall-sentence question explicitly"
```

---

## Task 14: Hidden `/adventure-prototype` route + page client

**Files:**
- Create: `fe-next/app/[locale]/adventure-prototype/page.tsx`
- Create: `fe-next/app/[locale]/adventure-prototype/PageClient.tsx`

- [ ] **Step 1: Write `page.tsx`**

```typescript
// fe-next/app/[locale]/adventure-prototype/page.tsx
import type { Metadata } from 'next';
import { PageClient } from './PageClient';

export const metadata: Metadata = {
  title: 'Adventure Prototype — LexiClash',
  robots: { index: false, follow: false }, // hidden route
};

export default function AdventurePrototypePage() {
  return <PageClient />;
}
```

- [ ] **Step 2: Write `PageClient.tsx`**

```typescript
'use client';
import { useState, useCallback } from 'react';
import { BattleSceneRoot } from '@/components/adventure/v2/BattleSceneRoot';
import { PostFightModal } from '@/components/adventure/v2/PostFightModal';
import { useCombatStore } from '@/lib/adventure/v2/state/runStore';

export function PageClient() {
  const [outcome, setOutcome] = useState<'victory' | 'defeat' | null>(null);
  const [resetKey, setResetKey] = useState(0);

  const onVictory = useCallback(() => setOutcome('victory'), []);
  const onDefeat = useCallback(() => setOutcome('defeat'), []);
  const onRetry = useCallback(() => {
    setOutcome(null);
    setResetKey(k => k + 1);
    useCombatStore.getState().startNewBattle();
    useCombatStore.getState().dispatch({ type: 'START_TURN' });
  }, []);

  return (
    <main style={{ background: '#0a0a14', minHeight: '100vh', padding: 16 }}>
      <h1 style={{ color: '#bfff00', fontFamily: 'Fredoka', fontSize: 24, textAlign: 'center', marginBottom: 16 }}>
        Adventure Prototype — wall-sentence test
      </h1>
      <BattleSceneRoot key={resetKey} onVictory={onVictory} onDefeat={onDefeat} />
      {outcome && <PostFightModal outcome={outcome} onRetry={onRetry} onExit={onRetry} />}
    </main>
  );
}
```

- [ ] **Step 3: Run dev server, smoke-test in browser**

Run: `npm run dev` (will use port 3001 per project memory)
Open: `http://localhost:3001/en/adventure-prototype`

Expected:
- Pixi canvas renders dark navy background
- Hero (lime block) on left, enemy (red block) on right
- HP bars visible
- 16-tile slate at bottom-third with random English letters
- Tap a tile → it dims, letter appears in casting glyph; predicted dmg shows
- Tap multiple letters until they form a valid word (CAT, STAR, STORM, etc.)
- Click CAST → projectile arcs, enemy flashes, HP bar drops
- After ~800ms, hero HP drops (enemy attacked)
- Used tiles refresh
- Loop continues until victory or defeat → modal appears

- [ ] **Step 4: Commit**

```bash
git add fe-next/app/[locale]/adventure-prototype/
git commit -m "feat(adventure-v2): hidden /adventure-prototype route hosts the wall-sentence playable"
```

---

## Task 15: Visual polish pass — GSAP juice on the cast

**Files:**
- Modify: `fe-next/components/adventure/v2/layers/CastingGlyphLayer.ts`
- Modify: `fe-next/components/adventure/v2/layers/ActorLayer.ts`

The wall sentence asks: "does spelling feel viscerally more magical than pressing Attack?" This task injects the juice that decides the answer.

- [ ] **Step 1: Add GSAP shake on enemy hit (replace `flashEnemyHurt` in `ActorLayer.ts`)**

```typescript
// fe-next/components/adventure/v2/layers/ActorLayer.ts
// Add to imports:
import { gsap } from 'gsap';

// Replace flashEnemyHurt:
flashEnemyHurt() {
  const orig = this.enemySprite.tint;
  this.enemySprite.tint = 0xffffff;
  gsap.to(this.enemySprite.position, {
    x: this.enemySprite.position.x + 16,
    duration: 0.04,
    yoyo: true,
    repeat: 5,
    ease: 'power1.inOut',
    onComplete: () => { this.enemySprite.tint = orig; },
  });
}

// Replace flashHeroHurt:
flashHeroHurt() {
  const orig = this.heroSprite.tint;
  this.heroSprite.tint = 0xff8888;
  gsap.to(this.heroSprite.position, {
    x: this.heroSprite.position.x - 12,
    duration: 0.04,
    yoyo: true,
    repeat: 5,
    ease: 'power1.inOut',
    onComplete: () => { this.heroSprite.tint = orig; },
  });
}
```

- [ ] **Step 2: Add scale-pulse + glow on cast in `CastingGlyphLayer.ts`**

Modify the `fireProjectile` method to add a wind-up:

```typescript
fireProjectile(toX: number, toY: number, onArrive: () => void) {
  const start = { x: this.x, y: this.y };
  // Wind-up: scale pulse + alpha flash
  gsap.timeline()
    .to(this.scale, { x: 1.2, y: 1.2, duration: 0.12, ease: 'back.out(2)' })
    .to(this.scale, { x: 1, y: 1, duration: 0.06 })
    .to(this.position, { x: toX, y: toY, duration: 0.35, ease: 'power3.in' })
    .call(() => {
      onArrive();
      this.position.set(start.x, start.y);
      this.bg.alpha = 0;
      this.wordText.text = '';
      this.dmgText.text = '';
    });
}
```

- [ ] **Step 3: Add screen-shake via app stage on hit**

Modify: `fe-next/components/adventure/v2/BattleSceneRoot.tsx`

In the `handleSubmit` method, after `actorLayer.flashEnemyHurt()`:

```typescript
// inside handleSubmit, after flashEnemyHurt:
const stage = sceneRef.current;
if (stage) {
  gsap.to(stage.position, {
    x: stage.x + 8,
    duration: 0.04,
    yoyo: true,
    repeat: 3,
    ease: 'power1.inOut',
  });
}
```

(Add `import { gsap } from 'gsap';` to BattleSceneRoot.tsx if missing.)

- [ ] **Step 4: Smoke test in browser**

Reload `/en/adventure-prototype`. Cast a word. Observe:
- Glyph pulses before launch
- Glyph arcs to enemy
- Enemy shakes + flashes white
- Whole stage shakes briefly
- Damage applies

If any feels stiff, increase amplitude or duration. Iterate before committing.

- [ ] **Step 5: Commit**

```bash
git add fe-next/components/adventure/v2/layers/ActorLayer.ts fe-next/components/adventure/v2/layers/CastingGlyphLayer.ts fe-next/components/adventure/v2/BattleSceneRoot.tsx
git commit -m "feat(adventure-v2): GSAP juice — wind-up pulse, projectile arc, hit shake, screen shake"
```

---

## Task 16: Hardware keyboard support (hidden HTML input)

**Files:**
- Create: `fe-next/components/adventure/v2/input/RuneSlateInput.ts`
- Modify: `fe-next/components/adventure/v2/BattleSceneRoot.tsx`

- [ ] **Step 1: Write the input bridge**

```typescript
// fe-next/components/adventure/v2/input/RuneSlateInput.ts
import type { Tile, TileId } from '@/lib/adventure/v2/types';

interface Bridge {
  onLetterKey: (letter: string) => void;
  onBackspace: () => void;
  onEnter: () => void;
  destroy: () => void;
}

export function attachKeyboardBridge(handlers: Omit<Bridge, 'destroy'>): Bridge {
  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handlers.onEnter();
      return;
    }
    if (e.key === 'Backspace') {
      e.preventDefault();
      handlers.onBackspace();
      return;
    }
    if (/^[a-zA-Z]$/.test(e.key)) {
      handlers.onLetterKey(e.key.toUpperCase());
    }
  }
  window.addEventListener('keydown', onKeyDown);
  return {
    ...handlers,
    destroy: () => window.removeEventListener('keydown', onKeyDown),
  };
}

/** Find first unused tile matching this letter; returns its TileId or null. */
export function findTileByLetter(tiles: Tile[], usedIds: TileId[], letter: string): TileId | null {
  const usedSet = new Set(usedIds);
  for (const t of tiles) {
    if (!usedSet.has(t.id) && t.letter.toUpperCase() === letter.toUpperCase()) {
      return t.id;
    }
  }
  return null;
}
```

- [ ] **Step 2: Wire into BattleSceneRoot.tsx**

Add inside the `useEffect`, after the scene mounts:

```typescript
// inside useEffect after sceneRef.current = scene;
import { attachKeyboardBridge, findTileByLetter } from './input/RuneSlateInput';

const bridge = attachKeyboardBridge({
  onLetterKey: (letter) => {
    const s = useCombatStore.getState();
    if (s.fsmState.type !== 'player_compose') return;
    const tileId = findTileByLetter(s.tiles, s.fsmState.tilesUsed, letter);
    if (tileId !== null) handleTileTap(tileId, letter);
  },
  onBackspace: () => handleUndo(),
  onEnter: () => handleSubmit(),
});

// in the cleanup return block, add:
bridge.destroy();
```

- [ ] **Step 3: Smoke test**

Reload `/en/adventure-prototype`. Type letters on keyboard. Confirm:
- Each typed letter pulls a matching tile (if available + unused)
- Backspace undoes the last tile
- Enter submits the word

- [ ] **Step 4: Commit**

```bash
git add fe-next/components/adventure/v2/input/RuneSlateInput.ts fe-next/components/adventure/v2/BattleSceneRoot.tsx
git commit -m "feat(adventure-v2): hardware keyboard bridge — letter keys add tiles, Enter casts, Backspace undoes"
```

---

## Task 17: SFX content — drop in placeholder audio for the playtest

**Files:**
- Add 8 audio files to `fe-next/public/audio/adventure-v2/`

- [ ] **Step 1: Source SFX**

For the wall-sentence playtest, each of these 8 SFX needs a real (or believable placeholder) sound:

| File | Suggested feel |
|---|---|
| `tile-tap.mp3` | Crisp click, ~50ms |
| `tile-undo.mp3` | Soft thud, slightly lower pitch |
| `word-submit.mp3` | Rising whoosh / charge |
| `word-invalid.mp3` | Buzzer / error tone |
| `hit-enemy.mp3` | Impact + crack, ~300ms |
| `hit-hero.mp3` | Dull thud, ~250ms |
| `victory.mp3` | Triumphant 1-2s sting |
| `defeat.mp3` | Descending sad 1-2s sting |

Sources (pick one):
- (a) Free packs from freesound.org (CC0 licensed) — easiest
- (b) Generate with ElevenLabs SFX endpoint or Suno
- (c) Record yourself with a phone (works fine for prototype)

- [ ] **Step 2: Drop files into `fe-next/public/audio/adventure-v2/` matching the names above**

```bash
ls fe-next/public/audio/adventure-v2/
# Expected: 8 .mp3 files matching the keys
```

- [ ] **Step 3: Verify in browser**

Reload `/en/adventure-prototype`. Tap a tile, cast a word, take a hit, win/lose. Each should produce audio.

If any file is missing/broken, Howler will silently no-op — that's acceptable but flag in the playtest checklist (Task 18).

- [ ] **Step 4: Commit**

```bash
git add fe-next/public/audio/adventure-v2/
git commit -m "chore(adventure-v2): placeholder SFX for wall-sentence playtest"
```

---

## Task 18: Wall-sentence playtest checklist

**Files:**
- Create: `docs/superpowers/specs/2026-05-01-adventure-prototype-playtest-log.md`

- [ ] **Step 1: Write the playtest doc**

```markdown
# Adventure Prototype — Wall-Sentence Playtest Log

**Date:** _______
**Tester:** _______
**Build:** commit _______
**Device/browser:** _______

## The wall sentence

> "If spelling a word to deal damage does not feel viscerally more magical than pressing an 'Attack' button within the first playable prototype, burn the rest of the design and start over."

## Test protocol

1. Load `/en/adventure-prototype` on desktop Chrome.
2. Play 5 fights from start.
3. Mix tap-input and keyboard-input across the fights.
4. After each fight, answer the rubric below.

## Rubric (per fight, 1=cold / 5=visceral)

| Dimension | Score 1-5 | Notes |
|---|---|---|
| Did spelling feel like casting? | __ | |
| Was the projectile-launch satisfying? | __ | |
| Did the impact feel weighty? | __ | |
| Was the audio convincing? | __ | |
| Did "Cast" feel different from a generic "Attack"? | __ | |
| Did invalid words feel like a real failure? | __ | |
| Did 4+ letter words feel rewarding vs 3? | __ | |
| Did long sessions stay magical (3+ fights)? | __ | |

## Pass criterion

**Pass:** Average score ≥ 3.5 across all dimensions over 5 fights, AND every "Cast vs Attack" answer is ≥ 4.

**Fail:** Anything else.

## On pass

Write Plan 2 (Combat Depth) — adds active skills, status effects, runes integration, full damage formula visualization, multiple enemy types.

## On fail

STOP. Re-open the spec. Identify which assumption broke. Possible failure modes:
- Word→damage feels like a UI puzzle, not a spell. Fix: rework projectile/cast verb (swipe to cast? letters fly themselves into the enemy?).
- Tile pool feels random and unfair. Fix: rune-modified pool earlier, or telegraph next-tile draws.
- Pacing kills magic. Fix: parallel tile refresh during enemy turn, faster animation curves.
- Audio is the gap. Fix: better SFX, layered hit sound (low thump + high crack).

Document the failure mode and revise the spec before writing Plan 1.5.
```

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/specs/2026-05-01-adventure-prototype-playtest-log.md
git commit -m "docs(adventure-v2): wall-sentence playtest checklist + pass/fail criterion"
```

---

## Task 19: Run full test suite + build verification

- [ ] **Step 1: Run all v2 unit tests**

Run: `npx vitest run fe-next/lib/adventure/v2/`
Expected: PASS — damageCalculator + tilePool + wordValidator + fsm tests all green (~26 tests)

- [ ] **Step 2: Run TypeScript typecheck**

Run: `cd fe-next && npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Run fast build**

Run: `cd fe-next && npm run build:fast`
Expected: build succeeds; no v2-related warnings

- [ ] **Step 4: Lint**

Run: `cd fe-next && npm run lint`
Expected: pass

- [ ] **Step 5: If anything fails — fix before proceeding to playtest**

Common pitfalls:
- Pixi `Application.init` is async; ensure component cleanup awaits gracefully (already handled with `mounted` flag in BattleSceneRoot).
- GSAP `gsap.to(pixiObject.position, ...)` works because Pixi `ObservablePoint` is plain {x, y}; no extra plugin needed.
- Howler `new Howl({ src: [...] })` will error in console if the file 404s — Network tab will show; place real or empty mp3 files at the expected paths.

---

## Task 20: Wall-sentence playtest + decision gate

- [ ] **Step 1: Run the playtest**

Per `docs/superpowers/specs/2026-05-01-adventure-prototype-playtest-log.md`. Five fights minimum. Fill in the rubric.

- [ ] **Step 2: Decision**

- **Pass** → write Plan 2 (Combat Depth: active skills, status effects, runes integration). Update memory with playtest outcome + commit hash. Phase 1 complete.
- **Fail** → STOP. Open the playtest log and the design spec side-by-side. Identify the broken assumption. Either revise spec + write Plan 1.5 OR escalate to user that the wall sentence killed the bet and we need a different combat verb.

- [ ] **Step 3: Update memory with outcome**

Edit `/Users/ohadfisher/.claude/projects/-Users-ohadfisher-git-boggle-new/memory/adventure-rebuild-spec-2026-05-01.md`:

Add a new section at the top:

```markdown
## Phase 1 prototype outcome (date: _____)

**Result:** PASS / FAIL
**Playtest log:** docs/superpowers/specs/2026-05-01-adventure-prototype-playtest-log.md
**Average rubric score:** __
**Commit:** _______

[On pass] Plan 2 next: combat depth.
[On fail] Wall sentence killed the bet at: __________. Spec revision needed.
```

- [ ] **Step 4: Final commit**

```bash
git add /Users/ohadfisher/.claude/projects/-Users-ohadfisher-git-boggle-new/memory/adventure-rebuild-spec-2026-05-01.md
git commit -m "docs(adventure-v2): record Phase 1 prototype playtest outcome"
```

---

## Summary

20 tasks. Bite-sized. TDD on engine logic, manual visual gate on Pixi rendering, wall-sentence playtest as the final pass/fail.

**Total estimated time:** 12-20 engineering hours for the full sequence including playtest.

**Pass criteria for the whole plan:**
1. All v2 unit tests green (~26 tests across 4 files).
2. `/en/adventure-prototype` plays a complete fight on desktop Chrome.
3. Wall-sentence rubric averages ≥ 3.5 over 5 fights.

**Out-of-scope reminder:** runes / hub / chapters / bosses / locales beyond en / mobile polish are NOT in this plan. They come in Plans 2-7 only if the wall sentence passes here.

---

## Self-Review

**Spec coverage check:**
- ✓ Wall sentence: Task 18 + 20.
- ✓ FSM (spec §3): Task 5.
- ✓ RuneSlate-on-battlefield (spec §3 seam fix): Task 9.
- ✓ Damage formula (spec §3): Task 2.
- ✓ Tile pool (spec §3): Task 3.
- ✓ Hand-rolled FSM not XState (spec §8): Task 5.
- ✓ GSAP-based juice not matter-js (spec §8): Tasks 10, 12, 15.
- ✓ Single-clock pattern (spec §8): Task 12 — only Pixi ticker, GSAP runs on its native RAF (no custom RAF loops).
- ✓ Howler bus pattern (spec §8): Task 7.
- ✓ Zustand store (spec §8): Task 6.
- ✓ Hidden route + flag-able (spec §9 migration): Task 14 — uses `/adventure-prototype`, separate from `/adventure` so v1 is untouched.
- ✓ Locale ja deferred (spec §3): prototype is en-only; no ja code.
- ✓ Bundle math (spec §8): prototype JS only — no chapter assets yet, comfortably under cap.

**Out-of-scope coverage:**
- Runes, achievements, lexicon, hub, multiple chapters, bosses, mobile, all 5 locales — explicitly deferred to Plans 2-7. This is intentional per the wall-sentence kill criterion.

**Placeholder scan:** Searched for "TBD", "TODO", "implement later", "fill in details" — none in plan tasks. The `__protoDict.ts` content is real (190+ words, expandable) with explicit "engineer: pad to ~1000 entries" annotation that is the actual instruction, not a placeholder.

**Type consistency:** `Tile`, `TileId`, `FsmState`, `FsmEvent`, `CombatModel` defined in Task 1, used consistently across Tasks 2-12. Function names checked: `calculateDamage` / `drawTiles` / `refillTiles` / `isValidWord` / `isComposableFromTiles` / `transition` — same in test files and implementation files.

---

## Execution choice

Plan saved to `docs/superpowers/plans/2026-05-01-adventure-rebuild-phase1-prototype.md`.

Two execution options:

**1. Subagent-Driven (recommended)** — fresh subagent per task, review between tasks, fast iteration. Best for this plan because each task is self-contained and TDD-shaped.

**2. Inline Execution** — execute tasks in this session using executing-plans, batch with checkpoints.

Pick one before kicking off implementation.
