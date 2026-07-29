# Word Vault Magic Grid — Phase 0+1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land the `VaultGrid` primitive end-to-end and wire Tutorial Room 1.1 (`r1.1` Cracked Door) through the new architecture behind a `word-vault.magic-grid` feature flag. Validates the architecture before rebuilding rooms 1.2–1.6.

**Architecture:** A single `VaultGrid` React component drives every word puzzle. Its config (size, letter source, traversal, modifiers, semantic gate, targets) is data per beat. Rooms become declarative `RoomBeat[]`. A `Notebook` HUD accumulates `ClueLine` fragments scattered by scene taps. Player synthesizes → summons grid → submits word. Submit classifier returns target-hit / bonus-hit / invalid. Old scene-bespoke puzzle layers stay live for non-1.1 rooms; the `word-vault.magic-grid` flag swaps RoomShell rendering for 1.1 only.

**Tech Stack:** Next.js 16 + TypeScript, Zustand store (`createGameStore`), Vitest (`@vitest-environment happy-dom`), Playwright E2E, PostHog feature flags + event capture, Tailwind, existing `EmberOverlay` Pixi component for cue visuals.

**Spec source:** `fe-next/docs/specs/2026-05-03-word-vault-magic-grid-design.md`. Sections 1–8 cover the contract this plan implements (Phase 0+1 only; Phases 2–7 follow in a separate plan once Tutorial validates).

**Scope cut for this plan:**
- ONE semantic class (`'name-male'` for r1.1 — accepts אש; future plans add the rest)
- ONE modifier (`frozen(n)` rule + visual; the seven other modifiers ship alongside their first-using room in later plans)
- ONE traversal mode wired live (`anytap` for r1.1; `adjacent` written + tested but unused live until r1.4)
- NO carry-clue cross-room dependencies (first one lands with r1.3)
- NO codex story-fragment viewer (lands with r1.5)
- Items unaffected — existing `grantItem` action stays
- HE strings inline per existing convention; native HE review deferred

---

## File Structure

### Create
- `fe-next/lib/word-vault/grid/types.ts` — VaultGridConfig, GridModifier, SemanticGate, SubmitResult, TargetWord, BonusBucket
- `fe-next/lib/word-vault/grid/letterSource.ts` — pool / pangram / forced generators
- `fe-next/lib/word-vault/grid/semanticGate.ts` — class → acceptList lookup, single class registered
- `fe-next/lib/word-vault/grid/submit.ts` — classifier (target/bonus/invalid)
- `fe-next/lib/word-vault/grid/modifiers/frozen.ts` — frozen(n) rule + thaw transition
- `fe-next/lib/word-vault/grid/index.ts` — barrel
- `fe-next/lib/word-vault/grid/__tests__/letterSource.test.ts`
- `fe-next/lib/word-vault/grid/__tests__/semanticGate.test.ts`
- `fe-next/lib/word-vault/grid/__tests__/submit.test.ts`
- `fe-next/lib/word-vault/grid/__tests__/frozen.test.ts`
- `fe-next/components/word-vault/grid/VaultGrid.tsx` — the component
- `fe-next/components/word-vault/grid/GridTile.tsx` — single tile renderer
- `fe-next/components/word-vault/grid/__tests__/VaultGrid.test.tsx`
- `fe-next/components/word-vault/Notebook.tsx` — HUD clue panel
- `fe-next/components/word-vault/__tests__/Notebook.test.tsx`
- `fe-next/lib/word-vault/state/notebookSlice.ts` — Zustand slice for clues
- `fe-next/lib/word-vault/state/beatProgressSlice.ts` — per-beat solved state
- `fe-next/lib/word-vault/state/__tests__/notebookSlice.test.ts`
- `fe-next/lib/word-vault/state/__tests__/beatProgressSlice.test.ts`
- `fe-next/lib/word-vault/beats/types.ts` — RoomBeat, Room, ClueLine, ClueSet, SceneTransform
- `fe-next/lib/word-vault/beats/r1.1.ts` — beat data for Tutorial
- `fe-next/lib/word-vault/beats/__tests__/r1.1.test.ts`
- `fe-next/components/word-vault/BeatRunner.tsx` — orchestrates clue tap routing + grid summon for a Room
- `fe-next/components/word-vault/__tests__/BeatRunner.test.tsx`
- `fe-next/app/dev/vault-grid/page.tsx` — dev-only smoke page (gated by `NODE_ENV !== 'production'`)
- `fe-next/e2e/word-vault-magic-grid.spec.ts` — Playwright happy-path

### Modify
- `fe-next/lib/word-vault/state/gameStore.ts` — wire notebookSlice + beatProgressSlice into `createGameStore`
- `fe-next/components/word-vault/RoomShell.tsx` — add feature-flag branch routing r1.1 to `BeatRunner` instead of `DarkDoorScene`
- `fe-next/components/word-vault/scenes/DarkDoorScene.tsx` — extract its tap-hotspot data + Pixi cues into a `r1.1Scene` shape consumed by BeatRunner; legacy export kept until flag flip

### Untouched
- `HubFoyer.tsx`, all other scene files, `EmberOverlay.tsx`, `gameStore` persistence layer, item system, ItemId union

---

## Task 1 — Module scaffolding + grid types

**Files:**
- Create: `fe-next/lib/word-vault/grid/types.ts`
- Create: `fe-next/lib/word-vault/grid/index.ts`

- [ ] **Step 1: Write the types file**

```ts
// fe-next/lib/word-vault/grid/types.ts
export type GridSize = 3 | 4 | 5;
export type Traversal = 'adjacent' | 'anytap';
export type LetterSourceMode = 'pool' | 'pangram' | 'forced';
export type ThemeBias = 'kitchen' | 'cold' | 'soot' | 'memory' | 'final';

export type SemanticClass = 'name-male' | 'warmth' | 'fuel' | 'food' | 'family';

export type SemanticGate = {
  class: SemanticClass;
  acceptList: string[];          // valid HE words for this class
  rareBonusList?: string[];      // poetic/rare; same solve, bonus reward
};

export type TargetWord = {
  word: string;                  // exact HE word that solves the beat
  bonus?: number;                // extra coins on solve
};

export type BonusBucket = {
  baseCoinsPerWord: number;
  rarityMultiplier?: (word: string) => 1 | 2 | 3;
};

export type FrozenModifier = { kind: 'frozen'; n: number };
export type GridModifier = FrozenModifier; // expand later

export type VaultGridConfig = {
  size: GridSize;
  letterSource: LetterSourceMode;
  letters?: string[];            // when letterSource='forced'
  themeBias?: ThemeBias;
  traversal: Traversal;
  modifiers?: GridModifier[];
  targets: TargetWord[];
  bonusBucket?: BonusBucket;
  semanticGate?: SemanticGate;
};

export type SubmitResult =
  | { kind: 'target-hit'; target: TargetWord; coins: number }
  | { kind: 'bonus-hit'; word: string; rarity: 1 | 2 | 3; coins: number }
  | { kind: 'invalid'; reason: 'not-word' | 'wrong-class' | 'used' | 'too-short' };

export type TileState = {
  index: number;
  letter: string;
  frozen: boolean;
  selected: boolean;
};
```

- [ ] **Step 2: Write barrel**

```ts
// fe-next/lib/word-vault/grid/index.ts
export * from './types';
export * from './letterSource';
export * from './semanticGate';
export * from './submit';
```

- [ ] **Step 3: Verify tsc clean**

Run: `cd fe-next && npx tsc --noEmit`
Expected: no errors related to the new files (errors listing letterSource/semanticGate/submit not yet existing are fine — placeholder for next tasks). Comment out the barrel re-exports for now.

```ts
// fe-next/lib/word-vault/grid/index.ts
export * from './types';
// re-exports will be added as files land in tasks 2-5
```

Re-run tsc: must be clean.

- [ ] **Step 4: Commit**

```bash
git add fe-next/lib/word-vault/grid/types.ts fe-next/lib/word-vault/grid/index.ts
git commit -m "$(cat <<'EOF'
feat(word-vault): magic-grid types + module scaffolding

Phase 0 task 1 of plan 2026-05-03-word-vault-magic-grid-phase-0-1.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2 — Letter source generators + tests

**Files:**
- Create: `fe-next/lib/word-vault/grid/letterSource.ts`
- Create: `fe-next/lib/word-vault/grid/__tests__/letterSource.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// fe-next/lib/word-vault/grid/__tests__/letterSource.test.ts
// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { generateLetters } from '../letterSource';
import type { TargetWord } from '../types';

const targets = (words: string[]): TargetWord[] => words.map((word) => ({ word }));

describe('generateLetters', () => {
  it('forced mode returns the exact letters provided', () => {
    const letters = generateLetters({
      size: 3,
      letterSource: 'forced',
      letters: ['א', 'ש', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח'],
      traversal: 'anytap',
      targets: targets(['אש']),
    });
    expect(letters).toEqual(['א', 'ש', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח']);
  });

  it('pangram mode covers every target letter at least once', () => {
    const letters = generateLetters({
      size: 4,
      letterSource: 'pangram',
      traversal: 'anytap',
      targets: targets(['אש', 'אבא']),
    });
    expect(letters).toContain('א');
    expect(letters).toContain('ש');
    expect(letters).toContain('ב');
    expect(letters).toHaveLength(16);
  });

  it('pool mode covers all target letters and fills with HE letters', () => {
    const letters = generateLetters({
      size: 3,
      letterSource: 'pool',
      themeBias: 'kitchen',
      traversal: 'anytap',
      targets: targets(['אש']),
    });
    expect(letters).toHaveLength(9);
    expect(letters).toContain('א');
    expect(letters).toContain('ש');
    letters.forEach((ch) => expect(ch.length).toBe(1));
  });

  it('forced mode throws when letter count does not match size*size', () => {
    expect(() =>
      generateLetters({
        size: 3,
        letterSource: 'forced',
        letters: ['א', 'ש'],
        traversal: 'anytap',
        targets: targets(['אש']),
      }),
    ).toThrow(/letter count/);
  });
});
```

- [ ] **Step 2: Run test, verify fail**

Run: `cd fe-next && npx vitest run lib/word-vault/grid/__tests__/letterSource.test.ts`
Expected: FAIL (`Cannot find module '../letterSource'`)

- [ ] **Step 3: Implement**

```ts
// fe-next/lib/word-vault/grid/letterSource.ts
import type { VaultGridConfig } from './types';

const HE_LETTERS = 'אבגדהוזחטיכלמנסעפצקרשת'.split('');

const THEME_BIAS_BAG: Record<string, string[]> = {
  kitchen: ['א', 'ש', 'ב', 'ל', 'ח', 'מ', 'ק', 'ע', 'ד'],
  cold:    ['ק', 'ר', 'פ', 'ז', 'ב', 'ר', 'ד', 'צ', 'נ'],
  soot:    ['א', 'פ', 'ח', 'ש', 'ל', 'מ', 'ר', 'ע', 'ב'],
  memory:  ['ז', 'כ', 'ר', 'ו', 'נ', 'ת', 'א', 'ב', 'ה'],
  final:   ['א', 'ש', 'ג', 'ח', 'ל', 'ת', 'מ', 'ר', 'ב'],
};

const uniqueChars = (words: string[]): string[] => {
  const set = new Set<string>();
  words.forEach((w) => w.split('').forEach((c) => set.add(c)));
  return Array.from(set);
};

const themedFiller = (bias: string | undefined, count: number): string[] => {
  const bag = (bias && THEME_BIAS_BAG[bias]) || HE_LETTERS;
  const out: string[] = [];
  for (let i = 0; i < count; i++) out.push(bag[Math.floor(Math.random() * bag.length)]);
  return out;
};

export function generateLetters(cfg: VaultGridConfig): string[] {
  const total = cfg.size * cfg.size;

  if (cfg.letterSource === 'forced') {
    if (!cfg.letters || cfg.letters.length !== total) {
      throw new Error(`forced letter count ${cfg.letters?.length ?? 0} must equal size*size = ${total}`);
    }
    return [...cfg.letters];
  }

  const targetWords = cfg.targets.map((t) => t.word);
  const required = uniqueChars(targetWords);

  if (cfg.letterSource === 'pangram') {
    if (required.length > total) {
      throw new Error(`pangram needs ${required.length} unique letters but grid has ${total}`);
    }
    const out = [...required];
    while (out.length < total) out.push(required[Math.floor(Math.random() * required.length)]);
    return shuffle(out);
  }

  // pool
  const filler = themedFiller(cfg.themeBias, total - required.length);
  return shuffle([...required, ...filler]);
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
```

- [ ] **Step 4: Run tests, verify pass**

Run: `cd fe-next && npx vitest run lib/word-vault/grid/__tests__/letterSource.test.ts`
Expected: 4 passing.

- [ ] **Step 5: Re-enable barrel export**

Edit `fe-next/lib/word-vault/grid/index.ts`:

```ts
export * from './types';
export * from './letterSource';
```

- [ ] **Step 6: Commit**

```bash
git add fe-next/lib/word-vault/grid/letterSource.ts fe-next/lib/word-vault/grid/__tests__/letterSource.test.ts fe-next/lib/word-vault/grid/index.ts
git commit -m "$(cat <<'EOF'
feat(word-vault): letter source generators (pool/pangram/forced)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3 — SemanticGate with `name-male` class + tests

**Files:**
- Create: `fe-next/lib/word-vault/grid/semanticGate.ts`
- Create: `fe-next/lib/word-vault/grid/__tests__/semanticGate.test.ts`

- [ ] **Step 1: Failing test**

```ts
// fe-next/lib/word-vault/grid/__tests__/semanticGate.test.ts
import { describe, it, expect } from 'vitest';
import { gateAccepts, gateBonusFor, getSemanticClass } from '../semanticGate';

describe('semanticGate', () => {
  it('name-male accepts אש (the protagonist symbol-name in r1.1 context)', () => {
    expect(gateAccepts('name-male', 'אש')).toBe(true);
  });

  it('name-male rejects an unrelated word like בית', () => {
    expect(gateAccepts('name-male', 'בית')).toBe(false);
  });

  it('returns rare-bonus rarity when word is in rareBonusList', () => {
    const cls = getSemanticClass('name-male');
    expect(cls.rareBonusList ?? []).toContain('להבה');
    expect(gateBonusFor('name-male', 'להבה')).toBe(2);
  });

  it('returns 1 for plain accept-list hit', () => {
    expect(gateBonusFor('name-male', 'אש')).toBe(1);
  });

  it('returns 0 for non-accepted word', () => {
    expect(gateBonusFor('name-male', 'בית')).toBe(0);
  });
});
```

- [ ] **Step 2: Verify fail**

Run: `cd fe-next && npx vitest run lib/word-vault/grid/__tests__/semanticGate.test.ts`
Expected: FAIL (module missing).

- [ ] **Step 3: Implement**

```ts
// fe-next/lib/word-vault/grid/semanticGate.ts
import type { SemanticClass, SemanticGate } from './types';

// Phase 0+1 ships ONE class. r1.1 frames אש as the symbolic name of the
// protagonist that opens the cracked door. Future rooms register more classes.
const REGISTRY: Record<SemanticClass, SemanticGate> = {
  'name-male': {
    class: 'name-male',
    acceptList: ['אש', 'אורי', 'אבי'],
    rareBonusList: ['להבה'],
  },
  // Stubs — bodies come with the rooms that need them. Keeps types satisfied.
  warmth:  { class: 'warmth',  acceptList: [] },
  fuel:    { class: 'fuel',    acceptList: [] },
  food:    { class: 'food',    acceptList: [] },
  family:  { class: 'family',  acceptList: [] },
};

export function getSemanticClass(cls: SemanticClass): SemanticGate {
  return REGISTRY[cls];
}

export function gateAccepts(cls: SemanticClass, word: string): boolean {
  const g = REGISTRY[cls];
  return g.acceptList.includes(word) || (g.rareBonusList ?? []).includes(word);
}

export function gateBonusFor(cls: SemanticClass, word: string): 0 | 1 | 2 {
  const g = REGISTRY[cls];
  if ((g.rareBonusList ?? []).includes(word)) return 2;
  if (g.acceptList.includes(word)) return 1;
  return 0;
}
```

- [ ] **Step 4: Pass**

Run: `cd fe-next && npx vitest run lib/word-vault/grid/__tests__/semanticGate.test.ts`
Expected: 5 passing.

- [ ] **Step 5: Barrel export**

Edit `fe-next/lib/word-vault/grid/index.ts`:

```ts
export * from './types';
export * from './letterSource';
export * from './semanticGate';
```

- [ ] **Step 6: Commit**

```bash
git add fe-next/lib/word-vault/grid/semanticGate.ts fe-next/lib/word-vault/grid/__tests__/semanticGate.test.ts fe-next/lib/word-vault/grid/index.ts
git commit -m "$(cat <<'EOF'
feat(word-vault): semantic-gate registry with name-male class

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4 — Submit classifier + tests

**Files:**
- Create: `fe-next/lib/word-vault/grid/submit.ts`
- Create: `fe-next/lib/word-vault/grid/__tests__/submit.test.ts`

- [ ] **Step 1: Failing test**

```ts
// fe-next/lib/word-vault/grid/__tests__/submit.test.ts
import { describe, it, expect } from 'vitest';
import { classifySubmit } from '../submit';
import type { VaultGridConfig } from '../types';

const baseCfg: VaultGridConfig = {
  size: 3,
  letterSource: 'pangram',
  traversal: 'anytap',
  targets: [{ word: 'אש' }],
  bonusBucket: { baseCoinsPerWord: 2 },
  semanticGate: { class: 'name-male', acceptList: ['אש', 'אורי'], rareBonusList: ['להבה'] },
};

describe('classifySubmit', () => {
  it('returns target-hit for a target word', () => {
    const r = classifySubmit('אש', baseCfg, new Set());
    expect(r.kind).toBe('target-hit');
    if (r.kind === 'target-hit') expect(r.target.word).toBe('אש');
  });

  it('returns bonus-hit for an off-target accept-list word', () => {
    const r = classifySubmit('אורי', baseCfg, new Set());
    expect(r.kind).toBe('bonus-hit');
    if (r.kind === 'bonus-hit') {
      expect(r.word).toBe('אורי');
      expect(r.rarity).toBe(1);
      expect(r.coins).toBe(2);
    }
  });

  it('rare-bonus word doubles rarity and coins', () => {
    const r = classifySubmit('להבה', baseCfg, new Set());
    expect(r.kind).toBe('bonus-hit');
    if (r.kind === 'bonus-hit') {
      expect(r.rarity).toBe(2);
      expect(r.coins).toBe(4);
    }
  });

  it('returns invalid wrong-class for unrelated valid HE word when gate set', () => {
    const r = classifySubmit('בית', baseCfg, new Set());
    expect(r.kind).toBe('invalid');
    if (r.kind === 'invalid') expect(r.reason).toBe('wrong-class');
  });

  it('returns invalid too-short for length < 2', () => {
    const r = classifySubmit('א', baseCfg, new Set());
    expect(r.kind).toBe('invalid');
    if (r.kind === 'invalid') expect(r.reason).toBe('too-short');
  });

  it('returns invalid used when word already submitted in this beat', () => {
    const r = classifySubmit('אורי', baseCfg, new Set(['אורי']));
    expect(r.kind).toBe('invalid');
    if (r.kind === 'invalid') expect(r.reason).toBe('used');
  });
});
```

- [ ] **Step 2: Fail**

Run: `cd fe-next && npx vitest run lib/word-vault/grid/__tests__/submit.test.ts`
Expected: FAIL (module missing).

- [ ] **Step 3: Implement**

```ts
// fe-next/lib/word-vault/grid/submit.ts
import type { SubmitResult, VaultGridConfig } from './types';
import { gateAccepts, gateBonusFor } from './semanticGate';

const MIN_LENGTH = 2;

export function classifySubmit(
  word: string,
  cfg: VaultGridConfig,
  alreadySubmitted: Set<string>,
): SubmitResult {
  if (word.length < MIN_LENGTH) {
    return { kind: 'invalid', reason: 'too-short' };
  }

  if (alreadySubmitted.has(word)) {
    return { kind: 'invalid', reason: 'used' };
  }

  const target = cfg.targets.find((t) => t.word === word);
  if (target) {
    return { kind: 'target-hit', target, coins: target.bonus ?? 0 };
  }

  if (cfg.semanticGate) {
    if (!gateAccepts(cfg.semanticGate.class, word)) {
      return { kind: 'invalid', reason: 'wrong-class' };
    }
    const rarity = gateBonusFor(cfg.semanticGate.class, word) as 1 | 2;
    const base = cfg.bonusBucket?.baseCoinsPerWord ?? 1;
    return { kind: 'bonus-hit', word, rarity, coins: base * rarity };
  }

  // No gate, no target match → fall through as invalid not-word.
  // Real HE-dictionary lookup deferred (uses isValidHebrewWordForBoard later).
  return { kind: 'invalid', reason: 'not-word' };
}
```

- [ ] **Step 4: Pass**

Run: `cd fe-next && npx vitest run lib/word-vault/grid/__tests__/submit.test.ts`
Expected: 6 passing.

- [ ] **Step 5: Commit**

```bash
git add fe-next/lib/word-vault/grid/submit.ts fe-next/lib/word-vault/grid/__tests__/submit.test.ts
git commit -m "$(cat <<'EOF'
feat(word-vault): submit classifier (target/bonus/invalid)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5 — `frozen(n)` modifier rule + tests

**Files:**
- Create: `fe-next/lib/word-vault/grid/modifiers/frozen.ts`
- Create: `fe-next/lib/word-vault/grid/__tests__/frozen.test.ts`

- [ ] **Step 1: Failing test**

```ts
// fe-next/lib/word-vault/grid/__tests__/frozen.test.ts
import { describe, it, expect } from 'vitest';
import { applyFrozen, isSelectable, thawOnTargetHit } from '../modifiers/frozen';
import type { TileState } from '../types';

const tile = (i: number, letter: string, frozen = false): TileState => ({
  index: i, letter, frozen, selected: false,
});

describe('frozen modifier', () => {
  it('applyFrozen ices exactly n random tiles', () => {
    const tiles = Array.from({ length: 9 }, (_, i) => tile(i, 'א'));
    const out = applyFrozen(tiles, { kind: 'frozen', n: 3 }, () => 0); // deterministic rng
    expect(out.filter((t) => t.frozen)).toHaveLength(3);
  });

  it('applyFrozen with n > tile count caps at tile count', () => {
    const tiles = Array.from({ length: 4 }, (_, i) => tile(i, 'א'));
    const out = applyFrozen(tiles, { kind: 'frozen', n: 99 }, () => 0);
    expect(out.filter((t) => t.frozen)).toHaveLength(4);
  });

  it('isSelectable returns false for a frozen tile', () => {
    expect(isSelectable(tile(0, 'א', true))).toBe(false);
    expect(isSelectable(tile(0, 'א', false))).toBe(true);
  });

  it('thawOnTargetHit thaws every tile after a target-hit', () => {
    const tiles = Array.from({ length: 4 }, (_, i) => tile(i, 'א', true));
    const thawed = thawOnTargetHit(tiles);
    expect(thawed.every((t) => !t.frozen)).toBe(true);
  });
});
```

- [ ] **Step 2: Fail**

Run: `cd fe-next && npx vitest run lib/word-vault/grid/__tests__/frozen.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
// fe-next/lib/word-vault/grid/modifiers/frozen.ts
import type { FrozenModifier, TileState } from '../types';

type Rng = () => number; // 0..1

export function applyFrozen(
  tiles: TileState[],
  mod: FrozenModifier,
  rng: Rng = Math.random,
): TileState[] {
  const n = Math.min(mod.n, tiles.length);
  const indices = tiles.map((_, i) => i);
  // Fisher-Yates with provided rng for determinism in tests
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  const frozenIdx = new Set(indices.slice(0, n));
  return tiles.map((t) => (frozenIdx.has(t.index) ? { ...t, frozen: true } : t));
}

export function isSelectable(tile: TileState): boolean {
  return !tile.frozen;
}

export function thawOnTargetHit(tiles: TileState[]): TileState[] {
  return tiles.map((t) => (t.frozen ? { ...t, frozen: false } : t));
}
```

- [ ] **Step 4: Pass**

Run: `cd fe-next && npx vitest run lib/word-vault/grid/__tests__/frozen.test.ts`
Expected: 4 passing.

- [ ] **Step 5: Commit**

```bash
git add fe-next/lib/word-vault/grid/modifiers/frozen.ts fe-next/lib/word-vault/grid/__tests__/frozen.test.ts
git commit -m "$(cat <<'EOF'
feat(word-vault): frozen(n) grid modifier rule + thaw

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6 — VaultGrid component skeleton (renders tiles + tracks selection)

**Files:**
- Create: `fe-next/components/word-vault/grid/GridTile.tsx`
- Create: `fe-next/components/word-vault/grid/VaultGrid.tsx`
- Create: `fe-next/components/word-vault/grid/__tests__/VaultGrid.test.tsx`

- [ ] **Step 1: Failing test**

```tsx
// fe-next/components/word-vault/grid/__tests__/VaultGrid.test.tsx
// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VaultGrid } from '../VaultGrid';
import type { VaultGridConfig } from '@/lib/word-vault/grid/types';

const cfg: VaultGridConfig = {
  size: 3,
  letterSource: 'forced',
  letters: ['א', 'ש', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח'],
  traversal: 'anytap',
  targets: [{ word: 'אש' }],
  semanticGate: { class: 'name-male', acceptList: ['אש'] },
};

describe('VaultGrid (skeleton)', () => {
  it('renders 9 tiles for size 3', () => {
    render(<VaultGrid config={cfg} onSubmit={() => undefined} />);
    expect(screen.getAllByRole('button', { name: /vault-tile/i })).toHaveLength(9);
  });

  it('tapping tiles in anytap mode builds the selection in tap order', () => {
    const onSubmit = vi.fn();
    render(<VaultGrid config={cfg} onSubmit={onSubmit} />);
    const tiles = screen.getAllByRole('button', { name: /vault-tile/i });
    fireEvent.click(tiles[0]); // א
    fireEvent.click(tiles[1]); // ש
    fireEvent.click(screen.getByRole('button', { name: /vault-submit/i }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0]).toBe('אש');
  });

  it('clear button resets selection', () => {
    const onSubmit = vi.fn();
    render(<VaultGrid config={cfg} onSubmit={onSubmit} />);
    const tiles = screen.getAllByRole('button', { name: /vault-tile/i });
    fireEvent.click(tiles[0]);
    fireEvent.click(screen.getByRole('button', { name: /vault-clear/i }));
    fireEvent.click(screen.getByRole('button', { name: /vault-submit/i }));
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Fail**

Run: `cd fe-next && npx vitest run components/word-vault/grid/__tests__/VaultGrid.test.tsx`
Expected: FAIL (component missing).

- [ ] **Step 3: Implement GridTile**

```tsx
// fe-next/components/word-vault/grid/GridTile.tsx
'use client';
import { memo } from 'react';
import type { TileState } from '@/lib/word-vault/grid/types';

type Props = {
  tile: TileState;
  onTap: (index: number) => void;
};

export const GridTile = memo(function GridTile({ tile, onTap }: Props) {
  const disabled = tile.frozen;
  return (
    <button
      type="button"
      role="button"
      aria-label={`vault-tile-${tile.index}`}
      onClick={() => !disabled && onTap(tile.index)}
      data-frozen={tile.frozen}
      data-selected={tile.selected}
      className={[
        'aspect-square w-full text-2xl font-bold rounded-md border-2 transition',
        tile.selected ? 'border-yellow-400 bg-yellow-200/30' : 'border-stone-600 bg-stone-800',
        tile.frozen ? 'opacity-60 cursor-not-allowed bg-cyan-900/40' : 'hover:bg-stone-700',
      ].join(' ')}
      disabled={disabled}
    >
      {tile.letter}
    </button>
  );
});
```

- [ ] **Step 4: Implement VaultGrid skeleton**

```tsx
// fe-next/components/word-vault/grid/VaultGrid.tsx
'use client';
import { useMemo, useState } from 'react';
import { generateLetters } from '@/lib/word-vault/grid/letterSource';
import { applyFrozen } from '@/lib/word-vault/grid/modifiers/frozen';
import type { TileState, VaultGridConfig } from '@/lib/word-vault/grid/types';
import { GridTile } from './GridTile';

type Props = {
  config: VaultGridConfig;
  onSubmit: (word: string) => void;
};

export function VaultGrid({ config, onSubmit }: Props) {
  const initialTiles: TileState[] = useMemo(() => {
    const letters = generateLetters(config);
    let tiles: TileState[] = letters.map((letter, index) => ({
      index, letter, frozen: false, selected: false,
    }));
    (config.modifiers ?? []).forEach((m) => {
      if (m.kind === 'frozen') tiles = applyFrozen(tiles, m);
    });
    return tiles;
  }, [config]);

  const [tiles, setTiles] = useState<TileState[]>(initialTiles);
  const [selected, setSelected] = useState<number[]>([]);

  const handleTap = (index: number) => {
    if (tiles[index].frozen) return;
    if (selected.includes(index)) return;
    setSelected((s) => [...s, index]);
    setTiles((t) =>
      t.map((tile) => (tile.index === index ? { ...tile, selected: true } : tile)),
    );
  };

  const clear = () => {
    setSelected([]);
    setTiles((t) => t.map((tile) => ({ ...tile, selected: false })));
  };

  const submit = () => {
    if (selected.length === 0) return;
    const word = selected.map((i) => tiles[i].letter).join('');
    onSubmit(word);
    clear();
  };

  return (
    <div className="rounded-lg bg-stone-900/90 p-4">
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${config.size}, minmax(0, 1fr))` }}
      >
        {tiles.map((tile) => (
          <GridTile key={tile.index} tile={tile} onTap={handleTap} />
        ))}
      </div>
      <div className="mt-3 flex justify-between gap-2">
        <button
          type="button"
          aria-label="vault-clear"
          onClick={clear}
          className="rounded px-3 py-1 bg-stone-700 text-stone-200"
        >
          נקה
        </button>
        <div className="text-xl font-bold tracking-widest text-yellow-200">
          {selected.map((i) => tiles[i].letter).join('')}
        </div>
        <button
          type="button"
          aria-label="vault-submit"
          onClick={submit}
          className="rounded px-3 py-1 bg-yellow-500 text-stone-900 font-bold"
        >
          אשר
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Pass**

Run: `cd fe-next && npx vitest run components/word-vault/grid/__tests__/VaultGrid.test.tsx`
Expected: 3 passing.

If `@testing-library/react` is missing, run `npm i -D @testing-library/react @testing-library/dom` first. (Project already uses RTL elsewhere — verify with `grep -l '@testing-library/react' package.json`.)

- [ ] **Step 6: Commit**

```bash
git add fe-next/components/word-vault/grid/VaultGrid.tsx fe-next/components/word-vault/grid/GridTile.tsx fe-next/components/word-vault/grid/__tests__/VaultGrid.test.tsx
git commit -m "$(cat <<'EOF'
feat(word-vault): VaultGrid skeleton — tile render + anytap selection

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7 — Adjacent traversal mode + tests

**Files:**
- Modify: `fe-next/components/word-vault/grid/VaultGrid.tsx`
- Modify: `fe-next/components/word-vault/grid/__tests__/VaultGrid.test.tsx`

- [ ] **Step 1: Add failing test**

Append to test file:

```tsx
const adjacentCfg: VaultGridConfig = { ...cfg, traversal: 'adjacent' };

describe('VaultGrid adjacent mode', () => {
  it('rejects non-adjacent tap chain', () => {
    const onSubmit = vi.fn();
    render(<VaultGrid config={adjacentCfg} onSubmit={onSubmit} />);
    const tiles = screen.getAllByRole('button', { name: /vault-tile/i });
    // size=3 grid; index 0 (top-left) and index 2 (top-right) are NOT adjacent
    fireEvent.click(tiles[0]);
    fireEvent.click(tiles[2]); // should be rejected
    fireEvent.click(screen.getByRole('button', { name: /vault-submit/i }));
    // Only first letter selected → too-short → onSubmit fires with single letter
    expect(onSubmit).toHaveBeenCalledWith('א');
  });

  it('accepts adjacent diagonal taps', () => {
    const onSubmit = vi.fn();
    render(<VaultGrid config={adjacentCfg} onSubmit={onSubmit} />);
    const tiles = screen.getAllByRole('button', { name: /vault-tile/i });
    fireEvent.click(tiles[0]); // (0,0) א
    fireEvent.click(tiles[4]); // (1,1) ד — diagonal adjacent
    fireEvent.click(screen.getByRole('button', { name: /vault-submit/i }));
    expect(onSubmit).toHaveBeenCalledWith('אד');
  });
});
```

- [ ] **Step 2: Fail**

Run: `cd fe-next && npx vitest run components/word-vault/grid/__tests__/VaultGrid.test.tsx`
Expected: 2 new tests fail.

- [ ] **Step 3: Implement adjacency check**

Edit `VaultGrid.tsx`. Replace `handleTap` and add helper:

```tsx
const isAdjacent = (a: number, b: number, size: number): boolean => {
  const ra = Math.floor(a / size); const ca = a % size;
  const rb = Math.floor(b / size); const cb = b % size;
  return Math.abs(ra - rb) <= 1 && Math.abs(ca - cb) <= 1 && (a !== b);
};

const handleTap = (index: number) => {
  if (tiles[index].frozen) return;
  if (selected.includes(index)) return;
  if (config.traversal === 'adjacent' && selected.length > 0) {
    const last = selected[selected.length - 1];
    if (!isAdjacent(last, index, config.size)) return;
  }
  setSelected((s) => [...s, index]);
  setTiles((t) =>
    t.map((tile) => (tile.index === index ? { ...tile, selected: true } : tile)),
  );
};
```

- [ ] **Step 4: Pass**

Run: `cd fe-next && npx vitest run components/word-vault/grid/__tests__/VaultGrid.test.tsx`
Expected: 5 passing total.

- [ ] **Step 5: Commit**

```bash
git add fe-next/components/word-vault/grid/VaultGrid.tsx fe-next/components/word-vault/grid/__tests__/VaultGrid.test.tsx
git commit -m "$(cat <<'EOF'
feat(word-vault): VaultGrid adjacent traversal (Boggle-trace)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8 — Wire submit classifier into VaultGrid + emit SubmitResult

**Files:**
- Modify: `fe-next/components/word-vault/grid/VaultGrid.tsx`
- Modify: `fe-next/components/word-vault/grid/__tests__/VaultGrid.test.tsx`

- [ ] **Step 1: Failing test (replaces onSubmit signature)**

Replace the existing test file's anytap second test with this and add new tests:

```tsx
// At top of file, change test imports:
import { classifySubmit } from '@/lib/word-vault/grid/submit';

describe('VaultGrid + classifier integration', () => {
  it('emits target-hit SubmitResult when target word is built', () => {
    const onResult = vi.fn();
    render(<VaultGrid config={cfg} onResult={onResult} />);
    const tiles = screen.getAllByRole('button', { name: /vault-tile/i });
    fireEvent.click(tiles[0]); // א
    fireEvent.click(tiles[1]); // ש
    fireEvent.click(screen.getByRole('button', { name: /vault-submit/i }));
    expect(onResult).toHaveBeenCalledTimes(1);
    expect(onResult.mock.calls[0][0].kind).toBe('target-hit');
  });

  it('emits invalid too-short for single tile submit', () => {
    const onResult = vi.fn();
    render(<VaultGrid config={cfg} onResult={onResult} />);
    const tiles = screen.getAllByRole('button', { name: /vault-tile/i });
    fireEvent.click(tiles[0]);
    fireEvent.click(screen.getByRole('button', { name: /vault-submit/i }));
    expect(onResult.mock.calls[0][0]).toEqual({ kind: 'invalid', reason: 'too-short' });
  });

  it('clears submitted-set across distinct grid mounts (per-beat scope)', () => {
    const onResult = vi.fn();
    const { unmount } = render(<VaultGrid config={cfg} onResult={onResult} />);
    let tiles = screen.getAllByRole('button', { name: /vault-tile/i });
    fireEvent.click(tiles[0]); fireEvent.click(tiles[1]);
    fireEvent.click(screen.getByRole('button', { name: /vault-submit/i }));
    unmount();
    render(<VaultGrid config={cfg} onResult={onResult} />);
    tiles = screen.getAllByRole('button', { name: /vault-tile/i });
    fireEvent.click(tiles[0]); fireEvent.click(tiles[1]);
    fireEvent.click(screen.getByRole('button', { name: /vault-submit/i }));
    expect(onResult.mock.calls[1][0].kind).toBe('target-hit'); // not 'used'
  });
});
```

Drop the old tests that referenced `onSubmit` — they're superseded.

- [ ] **Step 2: Fail**

Run: `cd fe-next && npx vitest run components/word-vault/grid/__tests__/VaultGrid.test.tsx`
Expected: FAIL — onResult prop missing.

- [ ] **Step 3: Wire classifier**

Edit `VaultGrid.tsx` — replace `onSubmit` prop with `onResult`, swap `submit()`:

```tsx
import { classifySubmit } from '@/lib/word-vault/grid/submit';
import { thawOnTargetHit } from '@/lib/word-vault/grid/modifiers/frozen';
import type { SubmitResult } from '@/lib/word-vault/grid/types';

type Props = {
  config: VaultGridConfig;
  onResult: (result: SubmitResult) => void;
};

// inside component:
const [submitted, setSubmitted] = useState<Set<string>>(new Set());

const submit = () => {
  if (selected.length === 0) return;
  const word = selected.map((i) => tiles[i].letter).join('');
  const result = classifySubmit(word, config, submitted);
  if (result.kind !== 'invalid' || result.reason !== 'too-short') {
    setSubmitted((s) => new Set(s).add(word));
  }
  if (result.kind === 'target-hit') {
    setTiles((t) => thawOnTargetHit(t));
  }
  onResult(result);
  clear();
};
```

- [ ] **Step 4: Pass**

Run: `cd fe-next && npx vitest run components/word-vault/grid/__tests__/VaultGrid.test.tsx`
Expected: all VaultGrid tests pass.

- [ ] **Step 5: Commit**

```bash
git add fe-next/components/word-vault/grid/VaultGrid.tsx fe-next/components/word-vault/grid/__tests__/VaultGrid.test.tsx
git commit -m "$(cat <<'EOF'
feat(word-vault): VaultGrid emits classified SubmitResult + dedupe

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9 — Dev smoke page for VaultGrid

**Files:**
- Create: `fe-next/app/dev/vault-grid/page.tsx`

- [ ] **Step 1: Implement dev-only page (no test — manual smoke)**

```tsx
// fe-next/app/dev/vault-grid/page.tsx
'use client';
import { useState } from 'react';
import { VaultGrid } from '@/components/word-vault/grid/VaultGrid';
import type { SubmitResult, VaultGridConfig } from '@/lib/word-vault/grid/types';

const r1_1: VaultGridConfig = {
  size: 3,
  letterSource: 'pangram',
  traversal: 'anytap',
  targets: [{ word: 'אש' }],
  semanticGate: { class: 'name-male', acceptList: ['אש', 'אורי', 'אבי'], rareBonusList: ['להבה'] },
  bonusBucket: { baseCoinsPerWord: 2 },
};

const r1_4_thaw: VaultGridConfig = {
  size: 4,
  letterSource: 'pangram',
  traversal: 'adjacent',
  targets: [{ word: 'אש' }, { word: 'חום' }],
  modifiers: [{ kind: 'frozen', n: 6 }],
  semanticGate: { class: 'warmth', acceptList: ['אש', 'חום', 'דבש', 'שמש'] },
  bonusBucket: { baseCoinsPerWord: 2 },
};

export default function DevVaultGridPage() {
  if (process.env.NODE_ENV === 'production') return null;
  const [log, setLog] = useState<SubmitResult[]>([]);
  const handle = (r: SubmitResult) => setLog((l) => [r, ...l].slice(0, 20));

  return (
    <div dir="rtl" className="min-h-screen bg-stone-950 text-stone-100 p-6 max-w-md mx-auto space-y-8">
      <h1 className="text-2xl font-bold">VaultGrid dev smoke</h1>
      <section>
        <h2 className="text-lg mb-2">r1.1 (tutorial — anytap, no modifiers)</h2>
        <VaultGrid config={r1_1} onResult={handle} />
      </section>
      <section>
        <h2 className="text-lg mb-2">r1.4 thaw (adjacent + frozen(6))</h2>
        <VaultGrid config={r1_4_thaw} onResult={handle} />
      </section>
      <section>
        <h2 className="text-lg mb-2">log</h2>
        <pre className="text-xs bg-stone-900 p-2 rounded overflow-auto">
          {log.map((r, i) => JSON.stringify(r) + '\n').join('')}
        </pre>
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Manual smoke**

Run: `cd fe-next && npm run dev` (port 3001 per project memory).
Open `http://localhost:3001/dev/vault-grid` in browser.
Verify: both grids render, taps select tiles, submit fires, frozen tiles render with cyan tint and don't accept taps. Check log shows correct SubmitResult shapes.

If anything looks wrong → fix in component, re-test, no commit until smoke clean.

- [ ] **Step 3: Commit (Phase 0 done marker)**

```bash
git add fe-next/app/dev/vault-grid/page.tsx
git commit -m "$(cat <<'EOF'
feat(word-vault): dev smoke page for VaultGrid (Phase 0 done)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 10 — ClueLine/ClueSet types + Notebook component + notebookSlice

**Files:**
- Create: `fe-next/lib/word-vault/beats/types.ts`
- Create: `fe-next/lib/word-vault/state/notebookSlice.ts`
- Create: `fe-next/components/word-vault/Notebook.tsx`
- Create: `fe-next/lib/word-vault/state/__tests__/notebookSlice.test.ts`
- Create: `fe-next/components/word-vault/__tests__/Notebook.test.tsx`

- [ ] **Step 1: Beats types (no test — pure types)**

```ts
// fe-next/lib/word-vault/beats/types.ts
import type { VaultGridConfig } from '../grid/types';

export type RoomId = 'r1.1' | 'r1.2' | 'r1.3' | 'r1.4' | 'r1.5' | 'r1.6';
export type BeatId = string;
export type SceneObjectId = string;
export type ClueFragmentId = string;

export type ClueLine =
  | { kind: 'whisper'; text: string }
  | { kind: 'sense'; icon: 'cold' | 'dark' | 'empty' | 'name' | 'echo' }
  | { kind: 'memory'; text: string }
  | { kind: 'glyph'; glyph: string };

export type ClueFragment = ClueLine & { id: ClueFragmentId; roomId: RoomId };

export type ClueSet = {
  ambient: string;
  objects: Array<{
    sceneObjectId: SceneObjectId;
    onTap: ClueLine;
    fragmentId: ClueFragmentId;
  }>;
  notebookHint?: string;
};

export type SceneTransform = {
  cue?: 'ember-bloom' | 'ice-crack' | 'glyph-flare';
  storyBeats?: string[];
  unlocksDoor?: boolean;
};

export type RoomBeat = {
  id: BeatId;
  hint: ClueSet;
  grid: VaultGridConfig;
  onSolve: SceneTransform;
  unlocks?: BeatId[];
};

export type Room = {
  id: RoomId;
  beats: RoomBeat[];
  beatOrder: 'sequential' | 'free' | 'graph';
  exitCondition: 'all-beats' | 'final-beat-only';
};
```

- [ ] **Step 2: Failing test for notebookSlice**

```ts
// fe-next/lib/word-vault/state/__tests__/notebookSlice.test.ts
// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { createNotebookSlice } from '../notebookSlice';
import type { ClueFragment } from '../../beats/types';

const fragment = (id: string): ClueFragment => ({
  id, roomId: 'r1.1', kind: 'whisper', text: id,
});

describe('notebookSlice', () => {
  it('addClue stores by roomId', () => {
    const slice = createNotebookSlice();
    slice.addClue('r1.1', fragment('door'));
    expect(slice.cluesFor('r1.1')).toHaveLength(1);
  });

  it('addClue is idempotent on fragment id', () => {
    const slice = createNotebookSlice();
    slice.addClue('r1.1', fragment('door'));
    slice.addClue('r1.1', fragment('door'));
    expect(slice.cluesFor('r1.1')).toHaveLength(1);
  });

  it('hasClue returns true after add', () => {
    const slice = createNotebookSlice();
    expect(slice.hasClue('r1.1', 'door')).toBe(false);
    slice.addClue('r1.1', fragment('door'));
    expect(slice.hasClue('r1.1', 'door')).toBe(true);
  });

  it('clueCountSinceTap returns 0 then increments per add', () => {
    const slice = createNotebookSlice();
    expect(slice.snapshot().lastTapAt).toBe(0);
    slice.addClue('r1.1', fragment('a'));
    expect(slice.snapshot().lastTapAt).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 3: Fail**

Run: `cd fe-next && npx vitest run lib/word-vault/state/__tests__/notebookSlice.test.ts`
Expected: FAIL.

- [ ] **Step 4: Implement notebookSlice (vanilla object — Zustand wiring in Task 12)**

```ts
// fe-next/lib/word-vault/state/notebookSlice.ts
import type { ClueFragment, RoomId } from '../beats/types';

export type NotebookSnapshot = {
  byRoom: Record<RoomId, ClueFragment[]>;
  lastTapAt: number;
};

export type NotebookSlice = {
  addClue: (roomId: RoomId, fragment: ClueFragment) => void;
  hasClue: (roomId: RoomId, fragmentId: string) => boolean;
  cluesFor: (roomId: RoomId) => ClueFragment[];
  clearRoom: (roomId: RoomId) => void;
  snapshot: () => NotebookSnapshot;
};

export function createNotebookSlice(): NotebookSlice {
  const state: NotebookSnapshot = { byRoom: {} as Record<RoomId, ClueFragment[]>, lastTapAt: 0 };

  return {
    addClue(roomId, fragment) {
      const existing = state.byRoom[roomId] ?? [];
      if (existing.some((f) => f.id === fragment.id)) return;
      state.byRoom[roomId] = [...existing, fragment];
      state.lastTapAt = Date.now();
    },
    hasClue(roomId, fragmentId) {
      return (state.byRoom[roomId] ?? []).some((f) => f.id === fragmentId);
    },
    cluesFor(roomId) {
      return state.byRoom[roomId] ?? [];
    },
    clearRoom(roomId) {
      delete state.byRoom[roomId];
    },
    snapshot() {
      return { byRoom: { ...state.byRoom }, lastTapAt: state.lastTapAt };
    },
  };
}
```

- [ ] **Step 5: Pass**

Run: `cd fe-next && npx vitest run lib/word-vault/state/__tests__/notebookSlice.test.ts`
Expected: 4 passing.

- [ ] **Step 6: Failing test for Notebook component**

```tsx
// fe-next/components/word-vault/__tests__/Notebook.test.tsx
// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Notebook } from '../Notebook';
import type { ClueFragment } from '@/lib/word-vault/beats/types';

const fragments: ClueFragment[] = [
  { id: 'a', roomId: 'r1.1', kind: 'whisper', text: 'הדלת חרוקה' },
  { id: 'b', roomId: 'r1.1', kind: 'sense', icon: 'name' },
  { id: 'c', roomId: 'r1.1', kind: 'glyph', glyph: 'א' },
];

describe('Notebook', () => {
  it('renders empty state when no clues', () => {
    render(<Notebook fragments={[]} />);
    expect(screen.getByText(/הפנקס ריק/)).toBeTruthy();
  });

  it('renders one row per fragment', () => {
    render(<Notebook fragments={fragments} />);
    expect(screen.getByText('הדלת חרוקה')).toBeTruthy();
    expect(screen.getByText('א')).toBeTruthy();
    expect(screen.getByLabelText('clue-icon-name')).toBeTruthy();
  });
});
```

- [ ] **Step 7: Fail**

Run: `cd fe-next && npx vitest run components/word-vault/__tests__/Notebook.test.tsx`
Expected: FAIL.

- [ ] **Step 8: Implement Notebook**

```tsx
// fe-next/components/word-vault/Notebook.tsx
'use client';
import type { ClueFragment } from '@/lib/word-vault/beats/types';

const ICON_LABEL: Record<string, string> = {
  cold: '❄', dark: '🌑', empty: '∅', name: '✦', echo: '〰',
};

export function Notebook({ fragments }: { fragments: ClueFragment[] }) {
  if (fragments.length === 0) {
    return (
      <aside dir="rtl" className="rounded border border-stone-700 bg-stone-900/80 p-3 text-stone-400 text-sm">
        הפנקס ריק. גע בעצמים בחדר כדי לאסוף רמזים.
      </aside>
    );
  }
  return (
    <aside dir="rtl" className="rounded border border-stone-700 bg-stone-900/80 p-3 text-sm space-y-1 max-h-48 overflow-y-auto">
      <h3 className="text-stone-300 font-bold mb-1">פנקס</h3>
      <ul className="space-y-1">
        {fragments.map((f) => (
          <li key={f.id} className="text-stone-200">
            {f.kind === 'whisper' && <span>«{f.text}»</span>}
            {f.kind === 'memory' && <span className="italic">{f.text}</span>}
            {f.kind === 'glyph' && <span className="text-yellow-300 text-xl">{f.glyph}</span>}
            {f.kind === 'sense' && (
              <span aria-label={`clue-icon-${f.icon}`} title={f.icon}>{ICON_LABEL[f.icon]}</span>
            )}
          </li>
        ))}
      </ul>
    </aside>
  );
}
```

- [ ] **Step 9: Pass**

Run: `cd fe-next && npx vitest run components/word-vault/__tests__/Notebook.test.tsx`
Expected: 2 passing.

- [ ] **Step 10: Commit**

```bash
git add fe-next/lib/word-vault/beats/types.ts fe-next/lib/word-vault/state/notebookSlice.ts fe-next/lib/word-vault/state/__tests__/notebookSlice.test.ts fe-next/components/word-vault/Notebook.tsx fe-next/components/word-vault/__tests__/Notebook.test.tsx
git commit -m "$(cat <<'EOF'
feat(word-vault): Notebook HUD + notebookSlice + beats types

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 11 — Beat-progress slice + tests

**Files:**
- Create: `fe-next/lib/word-vault/state/beatProgressSlice.ts`
- Create: `fe-next/lib/word-vault/state/__tests__/beatProgressSlice.test.ts`

- [ ] **Step 1: Failing test**

```ts
// fe-next/lib/word-vault/state/__tests__/beatProgressSlice.test.ts
// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { createBeatProgressSlice } from '../beatProgressSlice';

describe('beatProgressSlice', () => {
  it('isSolved is false by default', () => {
    const s = createBeatProgressSlice();
    expect(s.isSolved('r1.1', 'open-door')).toBe(false);
  });

  it('markSolved persists across reads', () => {
    const s = createBeatProgressSlice();
    s.markSolved('r1.1', 'open-door');
    expect(s.isSolved('r1.1', 'open-door')).toBe(true);
  });

  it('solvedBeats lists per-room ids', () => {
    const s = createBeatProgressSlice();
    s.markSolved('r1.1', 'open-door');
    s.markSolved('r1.4', 'thaw');
    s.markSolved('r1.4', 'fuel');
    expect(s.solvedBeats('r1.4').sort()).toEqual(['fuel', 'thaw']);
  });

  it('clearRoom wipes that room only', () => {
    const s = createBeatProgressSlice();
    s.markSolved('r1.1', 'a'); s.markSolved('r1.4', 'b');
    s.clearRoom('r1.1');
    expect(s.isSolved('r1.1', 'a')).toBe(false);
    expect(s.isSolved('r1.4', 'b')).toBe(true);
  });
});
```

- [ ] **Step 2: Fail, implement, pass**

```ts
// fe-next/lib/word-vault/state/beatProgressSlice.ts
import type { BeatId, RoomId } from '../beats/types';

export type BeatProgressSlice = {
  isSolved: (roomId: RoomId, beatId: BeatId) => boolean;
  markSolved: (roomId: RoomId, beatId: BeatId) => void;
  solvedBeats: (roomId: RoomId) => BeatId[];
  clearRoom: (roomId: RoomId) => void;
};

export function createBeatProgressSlice(): BeatProgressSlice {
  const state: Record<RoomId, Set<BeatId>> = {} as Record<RoomId, Set<BeatId>>;
  const ensure = (r: RoomId) => (state[r] ??= new Set());
  return {
    isSolved: (r, b) => ensure(r).has(b),
    markSolved: (r, b) => { ensure(r).add(b); },
    solvedBeats: (r) => Array.from(ensure(r)),
    clearRoom: (r) => { delete state[r]; },
  };
}
```

Run: `cd fe-next && npx vitest run lib/word-vault/state/__tests__/beatProgressSlice.test.ts`
Expected: 4 passing.

- [ ] **Step 3: Commit**

```bash
git add fe-next/lib/word-vault/state/beatProgressSlice.ts fe-next/lib/word-vault/state/__tests__/beatProgressSlice.test.ts
git commit -m "$(cat <<'EOF'
feat(word-vault): beat-progress slice (per-room solved set)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 12 — r1.1 beat data + tests

**Files:**
- Create: `fe-next/lib/word-vault/beats/r1.1.ts`
- Create: `fe-next/lib/word-vault/beats/__tests__/r1.1.test.ts`

- [ ] **Step 1: Failing test**

```ts
// fe-next/lib/word-vault/beats/__tests__/r1.1.test.ts
import { describe, it, expect } from 'vitest';
import { ROOM_R1_1 } from '../r1.1';

describe('ROOM_R1_1', () => {
  it('has id r1.1, single beat, sequential, all-beats exit', () => {
    expect(ROOM_R1_1.id).toBe('r1.1');
    expect(ROOM_R1_1.beats).toHaveLength(1);
    expect(ROOM_R1_1.beatOrder).toBe('sequential');
    expect(ROOM_R1_1.exitCondition).toBe('all-beats');
  });

  it('open-door beat has 2 scene objects scattering clues', () => {
    const beat = ROOM_R1_1.beats[0];
    expect(beat.id).toBe('open-door');
    expect(beat.hint.objects).toHaveLength(2);
    const ids = beat.hint.objects.map((o) => o.sceneObjectId);
    expect(ids).toEqual(expect.arrayContaining(['door', 'lantern']));
  });

  it('grid is size-3 anytap pangram with single target אש and name-male gate', () => {
    const grid = ROOM_R1_1.beats[0].grid;
    expect(grid.size).toBe(3);
    expect(grid.traversal).toBe('anytap');
    expect(grid.letterSource).toBe('pangram');
    expect(grid.targets).toEqual([{ word: 'אש' }]);
    expect(grid.semanticGate?.class).toBe('name-male');
  });

  it('onSolve unlocks the door', () => {
    expect(ROOM_R1_1.beats[0].onSolve.unlocksDoor).toBe(true);
  });
});
```

- [ ] **Step 2: Fail, implement, pass**

```ts
// fe-next/lib/word-vault/beats/r1.1.ts
import type { Room } from './types';

export const ROOM_R1_1: Room = {
  id: 'r1.1',
  beatOrder: 'sequential',
  exitCondition: 'all-beats',
  beats: [
    {
      id: 'open-door',
      hint: {
        ambient: 'דלת סדוקה. משב חמים מבעד לסדק.',
        objects: [
          {
            sceneObjectId: 'door',
            fragmentId: 'door-needs-name',
            onTap: { kind: 'whisper', text: 'הדלת מבקשת שם' },
          },
          {
            sceneObjectId: 'lantern',
            fragmentId: 'lantern-glyph-aleph',
            onTap: { kind: 'glyph', glyph: 'א' },
          },
        ],
        notebookHint: 'שם קצר, אות אחת מתגלה.',
      },
      grid: {
        size: 3,
        letterSource: 'pangram',
        traversal: 'anytap',
        targets: [{ word: 'אש' }],
        semanticGate: {
          class: 'name-male',
          acceptList: ['אש', 'אורי', 'אבי'],
          rareBonusList: ['להבה'],
        },
        bonusBucket: { baseCoinsPerWord: 2 },
      },
      onSolve: {
        cue: 'ember-bloom',
        unlocksDoor: true,
        storyBeats: ['r1.1.opened'],
      },
    },
  ],
};
```

Run: `cd fe-next && npx vitest run lib/word-vault/beats/__tests__/r1.1.test.ts`
Expected: 4 passing.

- [ ] **Step 3: Commit**

```bash
git add fe-next/lib/word-vault/beats/r1.1.ts fe-next/lib/word-vault/beats/__tests__/r1.1.test.ts
git commit -m "$(cat <<'EOF'
feat(word-vault): r1.1 Tutorial beat data (open-door)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 13 — Wire notebookSlice + beatProgressSlice into gameStore

**Files:**
- Modify: `fe-next/lib/word-vault/state/gameStore.ts`
- Modify: `fe-next/lib/word-vault/__tests__/gameStore.test.ts`

- [ ] **Step 1: Read current gameStore to find insertion points**

Run: `cd fe-next && wc -l lib/word-vault/state/gameStore.ts`
Verify it's the ~224-line file. Open it. Identify:
- The `WordVaultState` type (state shape)
- The `WordVaultActions` type (action signatures)
- The `createGameStore` factory body

You will:
- Add to `WordVaultState`: `notebook: NotebookSnapshot` and `beatProgress: Record<RoomId, BeatId[]>`
- Add to `WordVaultActions`: `addClue(roomId, fragment)`, `markBeatSolved(roomId, beatId)`, `cluesFor(roomId)`, `isBeatSolved(roomId, beatId)`
- Inside `createGameStore`, instantiate the two slices and expose their methods + their snapshots in state

- [ ] **Step 2: Failing test**

Append to `fe-next/lib/word-vault/__tests__/gameStore.test.ts`:

```ts
import type { ClueFragment } from '../beats/types';

describe('gameStore notebook + beat progress', () => {
  it('addClue persists into state.notebook', () => {
    const store = createGameStore();
    const fragment: ClueFragment = { id: 'door', roomId: 'r1.1', kind: 'whisper', text: 'x' };
    store.getState().addClue('r1.1', fragment);
    expect(store.getState().notebook.byRoom['r1.1']).toHaveLength(1);
  });

  it('markBeatSolved + isBeatSolved roundtrip', () => {
    const store = createGameStore();
    expect(store.getState().isBeatSolved('r1.1', 'open-door')).toBe(false);
    store.getState().markBeatSolved('r1.1', 'open-door');
    expect(store.getState().isBeatSolved('r1.1', 'open-door')).toBe(true);
  });
});
```

- [ ] **Step 3: Fail**

Run: `cd fe-next && npx vitest run lib/word-vault/__tests__/gameStore.test.ts`
Expected: 2 new tests fail.

- [ ] **Step 4: Implement (modify gameStore.ts)**

At the top of the file, add imports:

```ts
import { createNotebookSlice, type NotebookSnapshot } from './notebookSlice';
import { createBeatProgressSlice } from './beatProgressSlice';
import type { ClueFragment, RoomId, BeatId } from '../beats/types';
```

Extend the state type:

```ts
// inside WordVaultState type, add:
notebook: NotebookSnapshot;
beatProgress: Record<RoomId, BeatId[]>;
```

Extend the actions type:

```ts
// inside WordVaultActions type, add:
addClue: (roomId: RoomId, fragment: ClueFragment) => void;
markBeatSolved: (roomId: RoomId, beatId: BeatId) => void;
isBeatSolved: (roomId: RoomId, beatId: BeatId) => boolean;
cluesFor: (roomId: RoomId) => ClueFragment[];
```

Inside `createGameStore`, before the `set/get` returns:

```ts
const notebookSlice = createNotebookSlice();
const beatProgress = createBeatProgressSlice();

const refreshNotebook = (set: any) =>
  set((s: any) => ({ ...s, notebook: notebookSlice.snapshot() }));
const refreshBeatProgress = (set: any, roomId: RoomId) =>
  set((s: any) => ({
    ...s,
    beatProgress: { ...s.beatProgress, [roomId]: beatProgress.solvedBeats(roomId) },
  }));
```

Initial state additions:

```ts
notebook: notebookSlice.snapshot(),
beatProgress: {} as Record<RoomId, BeatId[]>,
```

New action implementations (placed alongside existing actions inside the store factory, with access to its `set`):

```ts
addClue: (roomId, fragment) => {
  notebookSlice.addClue(roomId, fragment);
  refreshNotebook(set);
},
markBeatSolved: (roomId, beatId) => {
  beatProgress.markSolved(roomId, beatId);
  refreshBeatProgress(set, roomId);
},
isBeatSolved: (roomId, beatId) => beatProgress.isSolved(roomId, beatId),
cluesFor: (roomId) => notebookSlice.cluesFor(roomId),
```

- [ ] **Step 5: Pass**

Run: `cd fe-next && npx vitest run lib/word-vault/__tests__/gameStore.test.ts`
Expected: all gameStore tests pass.

- [ ] **Step 6: tsc + lint**

Run: `cd fe-next && npx tsc --noEmit && npm run lint -- --max-warnings 0 2>&1 | tail -20`
Expected: clean (or only the 1 preexisting unrelated warning noted in memory).

- [ ] **Step 7: Commit**

```bash
git add fe-next/lib/word-vault/state/gameStore.ts fe-next/lib/word-vault/__tests__/gameStore.test.ts
git commit -m "$(cat <<'EOF'
feat(word-vault): wire notebook + beat-progress slices into gameStore

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 14 — BeatRunner component + tests

**Files:**
- Create: `fe-next/components/word-vault/BeatRunner.tsx`
- Create: `fe-next/components/word-vault/__tests__/BeatRunner.test.tsx`

- [ ] **Step 1: Failing test**

```tsx
// fe-next/components/word-vault/__tests__/BeatRunner.test.tsx
// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BeatRunner } from '../BeatRunner';
import { ROOM_R1_1 } from '@/lib/word-vault/beats/r1.1';

describe('BeatRunner (r1.1)', () => {
  it('renders one tap-clue button per scene object', () => {
    render(<BeatRunner room={ROOM_R1_1} onRoomComplete={() => undefined} />);
    expect(screen.getByRole('button', { name: /clue-tap-door/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /clue-tap-lantern/ })).toBeTruthy();
  });

  it('tapping a clue adds a fragment to the Notebook', () => {
    render(<BeatRunner room={ROOM_R1_1} onRoomComplete={() => undefined} />);
    fireEvent.click(screen.getByRole('button', { name: /clue-tap-lantern/ }));
    expect(screen.getByText('א')).toBeTruthy();
  });

  it('vault button summons the grid', () => {
    render(<BeatRunner room={ROOM_R1_1} onRoomComplete={() => undefined} />);
    expect(screen.queryAllByRole('button', { name: /vault-tile/ })).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: /summon-vault/ }));
    expect(screen.getAllByRole('button', { name: /vault-tile/ })).toHaveLength(9);
  });

  it('target-hit on the only beat fires onRoomComplete', () => {
    const onRoomComplete = vi.fn();
    render(<BeatRunner room={ROOM_R1_1} onRoomComplete={onRoomComplete} />);
    fireEvent.click(screen.getByRole('button', { name: /summon-vault/ }));

    // pangram of אש = grid contains א and ש; locate them
    const tiles = screen.getAllByRole('button', { name: /vault-tile/ });
    const aIdx = tiles.findIndex((t) => t.textContent === 'א');
    const shIdx = tiles.findIndex((t) => t.textContent === 'ש');
    expect(aIdx).toBeGreaterThanOrEqual(0);
    expect(shIdx).toBeGreaterThanOrEqual(0);
    fireEvent.click(tiles[aIdx]);
    fireEvent.click(tiles[shIdx]);
    fireEvent.click(screen.getByRole('button', { name: /vault-submit/ }));

    expect(onRoomComplete).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Fail**

Run: `cd fe-next && npx vitest run components/word-vault/__tests__/BeatRunner.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement BeatRunner**

```tsx
// fe-next/components/word-vault/BeatRunner.tsx
'use client';
import { useState, useMemo } from 'react';
import type { ClueFragment, Room, RoomBeat } from '@/lib/word-vault/beats/types';
import type { SubmitResult } from '@/lib/word-vault/grid/types';
import { VaultGrid } from './grid/VaultGrid';
import { Notebook } from './Notebook';

type Props = {
  room: Room;
  onRoomComplete: () => void;
  onResult?: (r: SubmitResult) => void;
};

export function BeatRunner({ room, onRoomComplete, onResult }: Props) {
  const [solved, setSolved] = useState<Set<string>>(new Set());
  const [fragments, setFragments] = useState<ClueFragment[]>([]);
  const [vaultOpen, setVaultOpen] = useState(false);

  const currentBeat: RoomBeat | undefined = useMemo(() => {
    if (room.beatOrder === 'free') return room.beats.find((b) => !solved.has(b.id));
    // sequential / graph (graph not used in r1.1)
    return room.beats.find((b) => !solved.has(b.id));
  }, [room, solved]);

  if (!currentBeat) return null;

  const handleClueTap = (sceneObjectId: string) => {
    const obj = currentBeat.hint.objects.find((o) => o.sceneObjectId === sceneObjectId);
    if (!obj) return;
    setFragments((arr) =>
      arr.some((f) => f.id === obj.fragmentId)
        ? arr
        : [...arr, { ...obj.onTap, id: obj.fragmentId, roomId: room.id }],
    );
  };

  const handleResult = (r: SubmitResult) => {
    onResult?.(r);
    if (r.kind !== 'target-hit') return;
    const next = new Set(solved); next.add(currentBeat.id);
    setSolved(next);
    setVaultOpen(false);
    if (next.size === room.beats.length) onRoomComplete();
  };

  return (
    <div dir="rtl" className="space-y-4 p-4">
      <p className="text-stone-300 italic">{currentBeat.hint.ambient}</p>
      <div className="flex gap-2 flex-wrap">
        {currentBeat.hint.objects.map((obj) => (
          <button
            key={obj.sceneObjectId}
            type="button"
            aria-label={`clue-tap-${obj.sceneObjectId}`}
            onClick={() => handleClueTap(obj.sceneObjectId)}
            className="rounded-md border-2 border-stone-600 bg-stone-800 px-3 py-2 text-stone-100 hover:bg-stone-700"
          >
            {obj.sceneObjectId}
          </button>
        ))}
      </div>
      <Notebook fragments={fragments} />
      {!vaultOpen && (
        <button
          type="button"
          aria-label="summon-vault"
          onClick={() => setVaultOpen(true)}
          className="rounded-md bg-yellow-500 text-stone-900 font-bold px-4 py-2"
        >
          פתח את הכספת
        </button>
      )}
      {vaultOpen && (
        <VaultGrid config={currentBeat.grid} onResult={handleResult} />
      )}
    </div>
  );
}
```

- [ ] **Step 4: Pass**

Run: `cd fe-next && npx vitest run components/word-vault/__tests__/BeatRunner.test.tsx`
Expected: 4 passing.

- [ ] **Step 5: Commit**

```bash
git add fe-next/components/word-vault/BeatRunner.tsx fe-next/components/word-vault/__tests__/BeatRunner.test.tsx
git commit -m "$(cat <<'EOF'
feat(word-vault): BeatRunner — clue routing + grid summon orchestrator

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 15 — Wire RoomShell behind feature flag, with PostHog events

**Files:**
- Modify: `fe-next/components/word-vault/RoomShell.tsx`

- [ ] **Step 1: Inspect current RoomShell**

Run: `cd fe-next && head -80 components/word-vault/RoomShell.tsx`
Identify the per-room render switch (currently picks one of 6 scene components based on roomId). Locate the props passed to scenes (`onSolved`, `onExit`).

- [ ] **Step 2: Add feature-flag branch (no test — covered by E2E in Task 16)**

Add at top of `RoomShell.tsx`:

```tsx
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { BeatRunner } from './BeatRunner';
import { ROOM_R1_1 } from '@/lib/word-vault/beats/r1.1';
import posthog from 'posthog-js';
```

Inside the component body (before the existing scene switch):

```tsx
const { enabled: magicGridEnabled } = useFeatureFlag('word-vault.magic-grid');

if (magicGridEnabled && roomId === 'r1.1') {
  return (
    <BeatRunner
      room={ROOM_R1_1}
      onRoomComplete={() => {
        posthog.capture('word_vault_beat_solved', { roomId: 'r1.1', beatId: 'open-door' });
        store.getState().solveRoom('r1.1', { coins: 5 });
        store.getState().markBeatSolved('r1.1', 'open-door');
        onSolved?.();
      }}
      onResult={(r) => {
        if (r.kind === 'invalid') {
          posthog.capture('word_vault_invalid_attempt', { roomId: 'r1.1', reason: r.reason });
        } else if (r.kind === 'bonus-hit') {
          posthog.capture('word_vault_bonus_word_found', {
            roomId: 'r1.1', word: r.word, rarity: r.rarity, coins: r.coins,
          });
          store.getState().earnCoins(r.coins);
        } else if (r.kind === 'target-hit') {
          posthog.capture('word_vault_grid_summon_target_hit', { roomId: 'r1.1' });
        }
      }}
    />
  );
}

// fall through to existing scene switch
```

The scenes import block stays, and the legacy `DarkDoorScene` render path remains the default when the flag is off or the room id is not r1.1.

- [ ] **Step 3: tsc + existing tests**

Run: `cd fe-next && npx tsc --noEmit && npx vitest run lib/word-vault components/word-vault`
Expected: all green.

- [ ] **Step 4: Commit**

```bash
git add fe-next/components/word-vault/RoomShell.tsx
git commit -m "$(cat <<'EOF'
feat(word-vault): RoomShell flag-gated routing for r1.1 → BeatRunner

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 16 — Playwright E2E + manual smoke + Phase 1 ship marker

**Files:**
- Create: `fe-next/e2e/word-vault-magic-grid.spec.ts`

- [ ] **Step 1: Inspect existing E2E pattern**

Run: `cd fe-next && head -40 e2e/daily-word-hunt.spec.ts`
Identify the helpers used (`goto`, `waitForHydration`, fixture loaders). Note the Playwright config base URL.

- [ ] **Step 2: Write E2E happy-path**

```ts
// fe-next/e2e/word-vault-magic-grid.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Word Vault — magic grid r1.1 happy path', () => {
  test.beforeEach(async ({ page }) => {
    // Force the flag on for the test session
    await page.addInitScript(() => {
      window.localStorage.setItem('feature_flag_overrides', JSON.stringify({ 'word-vault.magic-grid': true }));
    });
  });

  test('open vault, find אש, door opens', async ({ page }) => {
    await page.goto('/he/word-vault?room=r1.1');
    await page.getByRole('button', { name: /clue-tap-lantern/ }).click();
    await expect(page.getByText('א')).toBeVisible();
    await page.getByRole('button', { name: /summon-vault/ }).click();

    const tiles = page.getByRole('button', { name: /vault-tile/ });
    const count = await tiles.count();
    let aIdx = -1, shIdx = -1;
    for (let i = 0; i < count; i++) {
      const txt = (await tiles.nth(i).textContent())?.trim();
      if (txt === 'א' && aIdx < 0) aIdx = i;
      else if (txt === 'ש' && shIdx < 0) shIdx = i;
    }
    expect(aIdx).toBeGreaterThanOrEqual(0);
    expect(shIdx).toBeGreaterThanOrEqual(0);

    await tiles.nth(aIdx).click();
    await tiles.nth(shIdx).click();
    await page.getByRole('button', { name: /vault-submit/ }).click();

    // Door opens → BeatRunner unmounts → onRoomComplete propagates
    await expect(page.getByRole('button', { name: /summon-vault/ })).toHaveCount(0);
  });
});
```

If the project's `useFeatureFlag` does not honor a `localStorage.feature_flag_overrides` shortcut, replace the `addInitScript` with whatever override mechanism the codebase exposes. (Search: `grep -rn 'feature_flag_override' fe-next/hooks fe-next/lib` to confirm. If none exists, add one in `useFeatureFlag.ts`: a 5-line dev-only check that reads `localStorage` first.)

- [ ] **Step 3: Run E2E**

Run: `cd fe-next && npx playwright test e2e/word-vault-magic-grid.spec.ts`
Expected: 1 test passing.
If the page route is different from `/he/word-vault?room=r1.1`, find the actual route (`grep -rn "'/word-vault'" fe-next/app` → likely `app/[locale]/word-vault/`) and adjust.

- [ ] **Step 4: Manual smoke**

Run: `cd fe-next && npm run dev` (port 3001).
Open `http://localhost:3001/he/word-vault?room=r1.1`. Toggle the flag via `localStorage.feature_flag_overrides = '{"word-vault.magic-grid":true}'` in console, then refresh. Play through r1.1: tap clues → notebook fills → summon vault → spell אש → door opens, coins added, room marked solved.
Toggle flag OFF → reload → confirm legacy `DarkDoorScene` renders. (Regression guard: existing players unaffected.)

- [ ] **Step 5: Final tsc + full vitest**

Run: `cd fe-next && npx tsc --noEmit && npx vitest run`
Expected: clean.

- [ ] **Step 6: Commit Phase 0+1 ship marker**

```bash
git add fe-next/e2e/word-vault-magic-grid.spec.ts
git commit -m "$(cat <<'EOF'
feat(word-vault): r1.1 magic-grid e2e + Phase 0+1 ship marker

Phase 0 (VaultGrid primitive) + Phase 1 (Notebook + r1.1 wiring) complete
behind word-vault.magic-grid PostHog flag. Legacy DarkDoorScene unchanged
when flag is off. Next: validate via internal playtest, then write
follow-up plan covering Phases 2-7 (rooms 1.2-1.6 + cross-room callbacks).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review Notes

**Spec coverage** (each spec section → task that implements it):
- §2 Concept / Core loop → Tasks 14 (BeatRunner), 15 (RoomShell wiring)
- §3 VaultGrid component → Tasks 1 (types), 2 (letter source), 5 (frozen), 6–8 (component)
- §3 SemanticGate → Task 3
- §4 Room Needs / ClueSet → Tasks 10 (types + Notebook), 12 (r1.1 data)
- §4 Notebook HUD → Task 10
- §5 Item system — **NOT in this plan** (deferred per scope cut; existing `grantItem` unchanged)
- §6 Per-room sketches — only r1.1 implemented; r1.2–1.6 in follow-up plan
- §7 Architecture / file structure → matches plan File Structure section
- §8 Build sequence → this plan covers Phase 0 (Tasks 1–9) + Phase 1 (Tasks 10–16)
- §9 Testing strategy → vitest contract tests per task; E2E in Task 16
- §10 Risks → mitigations baked into modifier API (deterministic rng for tests), feature flag isolation, rare-bonus opt-in, scene-route fall-through
- §11 Out-of-scope → respected (no carry-clue, no codex, no daily, no i18n, no item modifier-disabler wiring yet)

**Type consistency** — verified across tasks:
- `VaultGridConfig`, `SubmitResult`, `TileState`, `RoomBeat`, `Room`, `ClueLine`, `ClueFragment` used identically wherever they appear.
- `onResult` is the prop name on `VaultGrid` (Task 8 onward); `onRoomComplete` on `BeatRunner`.
- `markBeatSolved` action name consistent across Tasks 11, 13, 15.

**Placeholder scan** — none. Every step contains the actual code or the exact command + expected output.

**Open assumption to verify in Task 15** — `useFeatureFlag('word-vault.magic-grid')` returns `{ enabled: boolean }` per the explore report. If the actual return shape differs, adjust the destructure. The PostHog flag must be created in the PostHog UI before live use, but local dev/E2E uses the localStorage override path.

---

## Plan complete

Saved to `fe-next/docs/plans/2026-05-03-word-vault-magic-grid-phase-0-1-plan.md`. Two execution options:

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** — I execute tasks in this session using executing-plans, batch with checkpoints.

Which approach?
