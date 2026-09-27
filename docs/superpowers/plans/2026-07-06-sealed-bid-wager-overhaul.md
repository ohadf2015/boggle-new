# Sealed Bid Wager Overhaul — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn solo Sealed Bid into a poker-flavored betting game — spell a word on a word wheel, stake mode-local chips on whether it's unique against hidden bots, pay out at rarity-scaled odds — with PixiJS/GSAP juice, then ungate it for all users.

**Architecture:** Pure logic first (chip wallet, rack pool from a pre-verified generated word pool, wager settlement), then UI surfaces (wheel, odds board, chip tray, showdown) reusing the existing `useWheelDragSpell` hook + `WordWheelPixiRing` + `SharedFxApp` coin FX, then page rework + ungate. Solo only; MP protocol untouched.

**Tech Stack:** Next.js 16, TypeScript, Tailwind (neo-brutalist tokens), PixiJS 8, GSAP 3, Vitest, React.

## Global Constraints

- All UI text via `t('key')` — NO hardcoded strings. 5 languages: en, he (RTL), sv, ja, es.
- TDD mandatory: failing test FIRST, then minimal code.
- Max 500 lines per file.
- Reduced-motion: gate all GSAP/Pixi motion behind `useReducedMotion()` / `gsap.matchMedia`.
- Solo Sealed Bid is client-only. Client dictionary check = `POST /api/dictionary/check` only.
- Chips are mode-local; only final cash-out touches `CoinContext` via `addCoins` (never `spendCoins`).
- he: emit/store base letter forms; display applies sofits via existing `toDisplay`. Do NOT trust model-authored he words — verify against dictionary.
- Existing `sbEngine`/`rackBuilder`/MP tests must stay green.
- Aesthetic: neo-brutalist poker table (felt navy, hard shadows, chip denominations color-coded, gold for payout). Use frontend-design skill + `.claude/docs/design-system.md` per surface.

**Run tests:** `cd fe-next && npx vitest run <path>` (unit). Lint: `npm run lint`. Types: `npx tsc --noEmit`.

---

## Phase 1 — Rack pool (guaranteed full-rack word)

### Task 1: Build-time rack generator + verified pool JSON

**Files:**
- Create: `fe-next/scripts/genSealedBidRacks.ts`
- Create: `fe-next/lib/sealedBid/sp/data/sealedBidRacks.generated.json`
- Test: `fe-next/lib/sealedBid/sp/data/__tests__/racksInvariant.test.ts`

**Interfaces:**
- Consumes: `backend/modules/boggleSolver.ts` → `getCachedTrie(lang)`, `getTrieNode`, and the language dictionary loader the trie builds from (read the file at impl time to find how a Node script loads a lang word set standalone). `lib/sealedBid/sp/sbEngine.ts` → `canFormFromRack(word, rack)`, `letterScore(word)`.
- Produces: JSON shape below, consumed by Task 2.

```json
{
  "en": [
    {
      "letters": "AEINRST",
      "bingoWords": ["RETINAS", "RETSINA", "STAINER"],
      "wordsByLen": { "3": ["ANT","RAT"], "4": ["RAIN","TINS"], "5": ["TRAIN","RESIN"], "6": ["RETAIN"], "7": ["RETINAS"] },
      "botPicks": ["TRAIN", "RESIN", "RETAIN"]
    }
  ],
  "he": []
}
```

- [ ] **Step 1: Write the failing invariant test**

```typescript
// racksInvariant.test.ts
import { describe, it, expect } from 'vitest';
import racks from '../sealedBidRacks.generated.json';
import { canFormFromRack } from '../../sbEngine';

const LANGS = ['en', 'he'] as const;

describe('sealedBidRacks.generated.json invariants', () => {
  for (const lang of LANGS) {
    const pool = (racks as Record<string, any[]>)[lang] ?? [];
    it(`${lang}: pool is non-empty`, () => {
      expect(pool.length).toBeGreaterThanOrEqual(8);
    });
    for (const [i, r] of pool.entries()) {
      it(`${lang}[${i}] ${r.letters}: 7 letters`, () => {
        expect(r.letters).toHaveLength(7);
      });
      it(`${lang}[${i}] ${r.letters}: >=1 bingo word, all use all 7 letters & are formable`, () => {
        expect(r.bingoWords.length).toBeGreaterThanOrEqual(1);
        for (const w of r.bingoWords) {
          expect(w.length).toBe(7);
          expect(canFormFromRack(w, r.letters)).toBe(true);
        }
      });
      it(`${lang}[${i}] ${r.letters}: >=6 total words spanning >=2 length buckets`, () => {
        const buckets = Object.keys(r.wordsByLen).filter(k => r.wordsByLen[k].length > 0);
        const total = Object.values(r.wordsByLen).reduce((a: number, b: any) => a + b.length, 0);
        expect(total).toBeGreaterThanOrEqual(6);
        expect(buckets.length).toBeGreaterThanOrEqual(2);
      });
      it(`${lang}[${i}] ${r.letters}: botPicks are formable & non-empty`, () => {
        expect(r.botPicks.length).toBeGreaterThanOrEqual(1);
        for (const w of r.botPicks) expect(canFormFromRack(w, r.letters)).toBe(true);
      });
    }
  }
});
```

- [ ] **Step 2: Run test — verify it fails** (JSON missing / empty)

`cd fe-next && npx vitest run lib/sealedBid/sp/data/__tests__/racksInvariant.test.ts`
Expected: FAIL (cannot import json or empty pool).

- [ ] **Step 3: Write the generator script**

`genSealedBidRacks.ts` logic (read boggleSolver + dict loader for exact load call):
1. For each lang in `['en','he']`: load the language word set (uppercase, base forms for he).
2. Candidate racks = every dictionary word of length exactly 7 → `letters = sorted(unique-not, keep multiset) of the word`. Dedup racks by sorted-letters key.
3. For each candidate rack, scan the full word set; keep words where `canFormFromRack(word, letters)`. Group by length into `wordsByLen`. `bingoWords` = the length-7 ones.
4. Keep rack iff: `bingoWords.length >= 1` AND total words `>= 6` AND `>= 2` non-empty length buckets.
5. `botPicks` = top 3 by "commonness" heuristic: prefer length 4–6 words with lowest `letterScore` (common letters) — pick 3 distinct. (Bots bias to safe common words so rare long bids stay unique.)
6. Sort racks by number of bingoWords desc; cap pool at ~40/lang.
7. **Self-verify before writing**: assert each emitted rack passes the same invariant as the test; throw if any fails.
8. Write pretty JSON to `lib/sealedBid/sp/data/sealedBidRacks.generated.json`.

Run: `cd fe-next && npx tsx scripts/genSealedBidRacks.ts` (or `ts-node`; check repo's script runner). If the backend dict loader can't run standalone, fall back: hand-seed ~12 racks/lang from `SEALED_BID_ROUNDS` + `rounds.ts` he racks, compute `wordsByLen` by scanning a shipped `wordHuntTargets.<lang>.json`, and verify each rack's player words via `canFormFromRack`.

- [ ] **Step 4: Run generator, then run the invariant test — verify it passes**

`cd fe-next && npx tsx scripts/genSealedBidRacks.ts && npx vitest run lib/sealedBid/sp/data/__tests__/racksInvariant.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add fe-next/scripts/genSealedBidRacks.ts fe-next/lib/sealedBid/sp/data/sealedBidRacks.generated.json fe-next/lib/sealedBid/sp/data/__tests__/racksInvariant.test.ts
git commit -m "feat(sealed-bid): generate verified rack pool with guaranteed full-rack words"
```

---

### Task 2: Deterministic rack pool selection + shuffle

**Files:**
- Create: `fe-next/lib/sealedBid/sp/rackPool.ts`
- Test: `fe-next/lib/sealedBid/sp/__tests__/rackPool.test.ts`

**Interfaces:**
- Consumes: `sealedBidRacks.generated.json`; `utils/dailyChallenge/prng.ts` → `mulberry32(seed)`, `hashString(str)`.
- Produces:
  ```typescript
  export interface SbRackDeal { rack: string; displayLetters: string[]; bingoWords: string[]; botPicks: string[]; }
  export function dealRounds(count: number, lang: string, seed: string): SbRackDeal[]
  ```

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from 'vitest';
import { dealRounds } from '../rackPool';

describe('dealRounds', () => {
  it('is deterministic for same seed', () => {
    const a = dealRounds(5, 'en', '2026-07-06');
    const b = dealRounds(5, 'en', '2026-07-06');
    expect(a.map(r => r.rack)).toEqual(b.map(r => r.rack));
  });
  it('returns requested count with 7 display letters each', () => {
    const rounds = dealRounds(5, 'en', 'seed-x');
    expect(rounds).toHaveLength(5);
    for (const r of rounds) expect(r.displayLetters).toHaveLength(7);
  });
  it('displayLetters is a permutation of rack letters (shuffled, no info lost)', () => {
    const [r] = dealRounds(1, 'en', 'seed-y');
    expect([...r.displayLetters].sort().join('')).toEqual([...r.rack].sort().join(''));
  });
  it('different seeds usually give different first rack', () => {
    const a = dealRounds(1, 'en', 'aaa')[0].rack;
    const b = dealRounds(1, 'en', 'zzz')[0].rack;
    expect(typeof a).toBe('string'); expect(typeof b).toBe('string');
  });
  it('falls back to en pool for unsupported lang', () => {
    expect(dealRounds(3, 'sv', 's')).toHaveLength(3);
  });
});
```

- [ ] **Step 2: Run — verify fail.** `npx vitest run lib/sealedBid/sp/__tests__/rackPool.test.ts` → FAIL (no module).

- [ ] **Step 3: Implement**

```typescript
import racksJson from './data/sealedBidRacks.generated.json';
import { mulberry32, hashString } from '../../../utils/dailyChallenge/prng';

export interface SbRackDeal { rack: string; displayLetters: string[]; bingoWords: string[]; botPicks: string[]; }
type Raw = { letters: string; bingoWords: string[]; botPicks: string[]; wordsByLen: Record<string, string[]> };
const POOLS = racksJson as Record<string, Raw[]>;

function shuffle<T>(arr: T[], rnd: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

export function dealRounds(count: number, lang: string, seed: string): SbRackDeal[] {
  const pool = POOLS[lang]?.length ? POOLS[lang] : POOLS.en;
  const rnd = mulberry32(hashString(`${lang}:${seed}`));
  const order = shuffle(pool.map((_, i) => i), rnd);
  const picks = order.slice(0, Math.min(count, pool.length));
  // if pool smaller than count, wrap
  while (picks.length < count) picks.push(order[picks.length % order.length]);
  return picks.map((idx) => {
    const raw = pool[idx];
    return {
      rack: raw.letters,
      displayLetters: shuffle([...raw.letters], rnd),
      bingoWords: raw.bingoWords,
      botPicks: raw.botPicks,
    };
  });
}
```

- [ ] **Step 4: Run — verify pass.**
- [ ] **Step 5: Commit** `feat(sealed-bid): deterministic rack dealing with shuffled display letters`

---

## Phase 2 — Chip wallet + wager settlement

### Task 3: Chip wallet (pure)

**Files:**
- Create: `fe-next/lib/sealedBid/sp/chipWallet.ts`
- Test: `fe-next/lib/sealedBid/sp/__tests__/chipWallet.test.ts`

**Interfaces:**
- Produces:
  ```typescript
  export const START_CHIPS = 100;
  export const MIN_STAKE = 5;
  export const CHIPS_PER_COIN = 10;
  export interface ChipWallet { chips: number; busted: boolean; }
  export function initWallet(start?: number): ChipWallet
  export function clampStake(w: ChipWallet, desired: number): number
  export function applyDelta(w: ChipWallet, delta: number): ChipWallet   // never < 0; sets busted at 0
  export function cashOutCoins(chips: number): number                    // floor(chips / CHIPS_PER_COIN)
  ```

- [ ] **Step 1: Failing test**

```typescript
import { describe, it, expect } from 'vitest';
import { initWallet, clampStake, applyDelta, cashOutCoins, START_CHIPS, MIN_STAKE } from '../chipWallet';

describe('chipWallet', () => {
  it('inits with START_CHIPS, not busted', () => {
    expect(initWallet()).toEqual({ chips: START_CHIPS, busted: false });
  });
  it('clampStake floors at MIN_STAKE and caps at balance', () => {
    const w = initWallet(30);
    expect(clampStake(w, 0)).toBe(MIN_STAKE);
    expect(clampStake(w, 500)).toBe(30);
    expect(clampStake(w, 20)).toBe(20);
  });
  it('applyDelta adds winnings', () => {
    expect(applyDelta(initWallet(50), 25)).toEqual({ chips: 75, busted: false });
  });
  it('applyDelta never goes below 0 and marks busted at 0', () => {
    expect(applyDelta(initWallet(20), -50)).toEqual({ chips: 0, busted: true });
    expect(applyDelta(initWallet(20), -20)).toEqual({ chips: 0, busted: true });
  });
  it('cashOutCoins floors chips/CHIPS_PER_COIN', () => {
    expect(cashOutCoins(95)).toBe(9);
    expect(cashOutCoins(9)).toBe(0);
  });
});
```

- [ ] **Step 2: Run — fail.**
- [ ] **Step 3: Implement** the module per the interfaces (min-stake floor, cap at chips, `Math.max(0, ...)`, busted when result is 0).
- [ ] **Step 4: Run — pass.**
- [ ] **Step 5: Commit** `feat(sealed-bid): mode-local chip wallet`

---

### Task 4: Wager settlement + odds multiplier (extend engine)

**Files:**
- Create: `fe-next/lib/sealedBid/sp/wager.ts`
- Test: `fe-next/lib/sealedBid/sp/__tests__/wager.test.ts`

**Interfaces:**
- Consumes: `sbEngine.ts` → `letterScore(word)`, `canFormFromRack(word, rack)`, `BidOutcome` type.
- Produces:
  ```typescript
  export function oddsMultiplier(word: string): number   // rarity/length scaled, 1.5..6, monotonic-ish in length+letterScore
  export interface Settlement { outcome: BidOutcome; stake: number; multiplier: number; delta: number; }
  export function settleBid(args: {
    playerWord: string | null; botWords: string[]; dictOk: boolean; rack: string; stake: number;
  }): Settlement
  ```
  Rules: `none` (null/invalid/not-formable) → delta `-Math.min(stake, 5)` ante if a stake was placed on invalid, else 0 for a deliberate pass (playerWord null); `clash` (formable+dictOk & word ∈ botWords) → delta `-stake`; `unique` → delta `+Math.round(stake * (multiplier - 1))`.

- [ ] **Step 1: Failing test**

```typescript
import { describe, it, expect } from 'vitest';
import { oddsMultiplier, settleBid } from '../wager';

describe('oddsMultiplier', () => {
  it('rarer/longer word pays more than common short word', () => {
    expect(oddsMultiplier('QUIZ')).toBeGreaterThan(oddsMultiplier('CAT'));
    expect(oddsMultiplier('RETINAS')).toBeGreaterThan(oddsMultiplier('RAIN'));
  });
  it('is bounded 1.5..6', () => {
    expect(oddsMultiplier('CAT')).toBeGreaterThanOrEqual(1.5);
    expect(oddsMultiplier('QUIZZERS')).toBeLessThanOrEqual(6);
  });
});

describe('settleBid', () => {
  const rack = 'AEINRST';
  it('unique pays stake*(mult-1)', () => {
    const s = settleBid({ playerWord: 'RETINAS', botWords: ['TRAIN'], dictOk: true, rack, stake: 20 });
    expect(s.outcome).toBe('unique');
    expect(s.delta).toBe(Math.round(20 * (oddsMultiplier('RETINAS') - 1)));
  });
  it('clash loses stake', () => {
    const s = settleBid({ playerWord: 'TRAIN', botWords: ['TRAIN'], dictOk: true, rack, stake: 20 });
    expect(s.outcome).toBe('clash');
    expect(s.delta).toBe(-20);
  });
  it('deliberate pass (null word) risks nothing', () => {
    const s = settleBid({ playerWord: null, botWords: ['TRAIN'], dictOk: false, rack, stake: 20 });
    expect(s.outcome).toBe('none');
    expect(s.delta).toBe(0);
  });
  it('invalid word (staked) loses small ante', () => {
    const s = settleBid({ playerWord: 'ZZZZ', botWords: [], dictOk: false, rack, stake: 20 });
    expect(s.outcome).toBe('none');
    expect(s.delta).toBe(-5);
  });
});
```

- [ ] **Step 2: Run — fail.**
- [ ] **Step 3: Implement.** `oddsMultiplier`: `clamp(1.5 + word.length*0.4 + letterScore(word)*0.12, 1.5, 6)` (rounded to 1 decimal). `settleBid`: normalize case; if `playerWord == null` → none, delta 0; else if `!dictOk || !canFormFromRack` → none, delta `-Math.min(stake,5)`; else if botWords (upper) includes playerWord(upper) → clash, delta `-stake`; else unique, delta `Math.round(stake*(mult-1))`.
- [ ] **Step 4: Run — pass.**
- [ ] **Step 5: Commit** `feat(sealed-bid): wager settlement and rarity odds`

---

## Phase 3 — UI surfaces (use frontend-design skill per surface)

> Before Phase 3, invoke `frontend-design:frontend-design` and read `.claude/docs/design-system.md` for neo-brutalist poker tokens. Every surface: `t()` copy, reduced-motion gating, RTL-safe (use `DirectionalIcon` for arrows).

### Task 5: SealedBidWheel (word wheel input, no center)

**Files:**
- Create: `fe-next/components/sealedBid/SealedBidWheel.tsx`
- Test: `fe-next/components/sealedBid/__tests__/SealedBidWheel.test.tsx`

**Interfaces:**
- Consumes: `hooks/useWheelDragSpell.ts` (`useWheelDragSpell`, options interface as extracted), `components/daily/WordWheelParts.tsx` (`WheelLetter` with `isCenter={false}` for all), `components/daily/WordWheelPixiRing` (props: `selectedIndices, radius, combo, pointerPosRef, isDraggingRef`).
- Produces:
  ```typescript
  export interface SealedBidWheelProps {
    letters: string[];                 // 7 shuffled display letters (base forms)
    disabled?: boolean;
    onChange: (word: string, indices: number[]) => void;  // live built word
    onSubmit: (word: string, indices: number[]) => void;   // drag-release / lock
    reducedMotion?: boolean;
    dir?: 'ltr' | 'rtl';
  }
  export default function SealedBidWheel(props: SealedBidWheelProps): JSX.Element
  ```

- [ ] **Step 1: Failing test** (jsdom; pointer events are hard — test the tap path + word assembly, not full drag):

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SealedBidWheel from '../SealedBidWheel';

describe('SealedBidWheel', () => {
  it('renders one tile per letter', () => {
    render(<SealedBidWheel letters={['A','E','I','N','R','S','T']} onChange={()=>{}} onSubmit={()=>{}} />);
    expect(screen.getAllByRole('button', { name: /letter/i }).length).toBeGreaterThanOrEqual(7);
  });
  it('tapping tiles builds a word and calls onChange', () => {
    const onChange = vi.fn();
    render(<SealedBidWheel letters={['R','A','T','X','X','X','X']} onChange={onChange} onSubmit={()=>{}} />);
    const tiles = screen.getAllByRole('button', { name: /letter/i });
    fireEvent.click(tiles[0]); fireEvent.click(tiles[1]); fireEvent.click(tiles[2]);
    expect(onChange).toHaveBeenLastCalledWith('RAT', [0,1,2]);
  });
});
```

- [ ] **Step 2: Run — fail.**
- [ ] **Step 3: Implement.** State `picks: number[]`. `word = picks.map(i => letters[i]).join('')`. Refs `draggingRef`, `pointerPosRef`. Wire `useWheelDragSpell({ draggingRef, pointerPosRef, minLength: 3, isIndexUsed: i => picks.includes(i), addLetter: (i,l) => setPicks(p => [...p, i]), getBuiltLength: () => picks.length, submit: () => onSubmit(word, picks) })`. Also support tap: `WheelLetter.onPress` pushes index. Arrange 7 tiles on a circle (angle `i*(360/7)`, all `isCenter={false}`). Mount `WordWheelPixiRing` behind with `selectedIndices={picks}`. Clear button resets picks. `aria-label` includes "letter" for each tile. Call `onChange(word, picks)` in an effect on picks change.
- [ ] **Step 4: Run — pass.**
- [ ] **Step 5: Commit** `feat(sealed-bid): word-wheel input component`

---

### Task 6: OddsBoard

**Files:**
- Create: `fe-next/components/sealedBid/OddsBoard.tsx`
- Test: `fe-next/components/sealedBid/__tests__/OddsBoard.test.tsx`

**Interfaces:**
- Consumes: `wager.ts` → `oddsMultiplier`. GSAP for the odometer (import `gsap`, guard reduced-motion).
- Produces:
  ```typescript
  export interface OddsBoardProps { word: string; stake: number; reducedMotion?: boolean; }
  export default function OddsBoard(props: OddsBoardProps): JSX.Element
  ```
  Shows `t('sealedBid.uniquePays', { mult })` and potential payout `stake * mult`.

- [ ] **Step 1: Failing test**

```typescript
import { render, screen } from '@testing-library/react';
import OddsBoard from '../OddsBoard';
it('shows multiplier and potential payout for the word', () => {
  render(<OddsBoard word="RETINAS" stake={20} reducedMotion />);
  expect(screen.getByTestId('odds-mult')).toBeInTheDocument();
  expect(screen.getByTestId('odds-payout')).toBeInTheDocument();
});
it('empty word shows dashes, no NaN', () => {
  render(<OddsBoard word="" stake={20} reducedMotion />);
  expect(screen.getByTestId('odds-mult').textContent).not.toMatch(/NaN/);
});
```

- [ ] **Step 2–4:** fail → implement (word.length<3 → show "—"; else compute mult; when `!reducedMotion`, `gsap.to` a ref-held number from old→new mult on change; testIds `odds-mult`, `odds-payout`) → pass.
- [ ] **Step 5: Commit** `feat(sealed-bid): live odds board with GSAP odometer`

---

### Task 7: ChipTray

**Files:**
- Create: `fe-next/components/sealedBid/ChipTray.tsx`
- Test: `fe-next/components/sealedBid/__tests__/ChipTray.test.tsx`

**Interfaces:**
- Consumes: `chipWallet.ts` → `clampStake`, `MIN_STAKE`. GSAP chip-toss (reduced-motion gated).
- Produces:
  ```typescript
  export interface ChipTrayProps {
    balance: number; stake: number; disabled?: boolean;
    onStakeChange: (stake: number) => void; reducedMotion?: boolean;
  }
  export default function ChipTray(props: ChipTrayProps): JSX.Element
  ```

- [ ] **Step 1: Failing test**

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import ChipTray from '../ChipTray';
it('chip buttons add to stake, clamped to balance', () => {
  const onStakeChange = vi.fn();
  render(<ChipTray balance={30} stake={5} onStakeChange={onStakeChange} reducedMotion />);
  fireEvent.click(screen.getByRole('button', { name: /\+10/i }));
  expect(onStakeChange).toHaveBeenCalledWith(15);
});
it('all-in sets stake to balance', () => {
  const onStakeChange = vi.fn();
  render(<ChipTray balance={42} stake={5} onStakeChange={onStakeChange} reducedMotion />);
  fireEvent.click(screen.getByRole('button', { name: /all.?in/i }));
  expect(onStakeChange).toHaveBeenCalledWith(42);
});
```

- [ ] **Step 2–4:** fail → implement (denomination buttons +5/+10/+25, All-in, Clear→MIN_STAKE; each uses `clampStake`; chip visuals = neo hard-shadow circles color-coded; GSAP toss on add when `!reducedMotion`) → pass.
- [ ] **Step 5: Commit** `feat(sealed-bid): chip tray staking control`

---

### Task 8: Showdown (reveal + FX)

**Files:**
- Create: `fe-next/components/sealedBid/Showdown.tsx`
- Test: `fe-next/components/sealedBid/__tests__/Showdown.test.tsx`

**Interfaces:**
- Consumes: `wager.ts` `Settlement`, `lib/pixiFx/SharedFxApp.ts` → `spawnCoinStream({ source, target, count, duration })` on unique win. GSAP card-flip.
- Produces:
  ```typescript
  export interface ShowdownProps {
    playerWord: string | null;
    bots: { name: string; word: string }[];
    settlement: Settlement;
    reducedMotion?: boolean;
    onDone: () => void;
    payoutTargetRef?: React.RefObject<HTMLElement>;  // where coins fly (chip HUD)
  }
  export default function Showdown(props: ShowdownProps): JSX.Element
  ```

- [ ] **Step 1: Failing test**

```typescript
import { render, screen } from '@testing-library/react';
import Showdown from '../Showdown';
const base = { onDone: () => {}, reducedMotion: true, bots: [{name:'Bot A', word:'TRAIN'}] };
it('unique shows win + payout', () => {
  render(<Showdown {...base} playerWord="RETINAS" settlement={{outcome:'unique',stake:20,multiplier:4,delta:60}} />);
  expect(screen.getByText(/\+60/)).toBeInTheDocument();
});
it('clash shows loss', () => {
  render(<Showdown {...base} playerWord="TRAIN" settlement={{outcome:'clash',stake:20,multiplier:2,delta:-20}} />);
  expect(screen.getByText(/-20/)).toBeInTheDocument();
});
```

- [ ] **Step 2–4:** fail → implement (opponent cards face-down → GSAP staggered flip when `!reducedMotion` else static; outcome banner with delta; on `unique` + `!reducedMotion` call `SharedFxApp.spawnCoinStream` from card center → `payoutTargetRef`; jackpot burst if `playerWord.length===7`; clash → red flash + shatter; `onDone` after reveal window via timeout, immediate button too) → pass.
- [ ] **Step 5: Commit** `feat(sealed-bid): showdown reveal with coin-stream and flip FX`

---

## Phase 4 — Page rework, copy, ungate

### Task 9: Translations for all new copy

**Files:**
- Modify: `fe-next/translations/{en,he,sv,ja,es}.js` (add `sealedBid.*` keys: `uniquePays`, `potentialPayout`, `stake`, `allIn`, `lockBid`, `pass`, `unique`, `clash`, `busted`, `cashOut`, `chips`, `showdown`, `round`, bot names, cash-out summary, etc.)

**Interfaces:** none (data). Use `fe-next:ux-writer` skill for native non-literal copy. he/ru authored carefully; verify no `{brace}` mistakes (single-brace interpolation pattern used in repo).

- [ ] **Step 1:** Write a test asserting keys resolve in all langs:

```typescript
import { describe, it, expect } from 'vitest';
const langs = ['en','he','sv','ja','es'];
describe('sealedBid new keys present in all locales', () => {
  const keys = ['sealedBid.uniquePays','sealedBid.stake','sealedBid.allIn','sealedBid.lockBid','sealedBid.busted','sealedBid.cashOut','sealedBid.showdown'];
  for (const l of langs) {
    it(`${l} has all keys`, async () => {
      const mod = await import(`../../translations/${l}.js`);
      const t = (mod as any)[l] ?? (mod as any).default;
      for (const k of keys) {
        const val = k.split('.').reduce((o: any, p) => o?.[p], t);
        expect(val, `${l}:${k}`).toBeTruthy();
      }
    });
  }
});
```
(Place at `fe-next/lib/sealedBid/sp/__tests__/i18n.test.ts`; adjust import base path.)

- [ ] **Step 2:** Run — fail.
- [ ] **Step 3:** Add keys to all 5 files (native copy via ux-writer skill).
- [ ] **Step 4:** Run — pass. Also `node -e "require('./translations/he.js')"` to catch syntax errors.
- [ ] **Step 5: Commit** `feat(sealed-bid): i18n copy for wager UI (5 langs)`

---

### Task 10: Rework solo page into the betting table + ungate

**Files:**
- Modify: `fe-next/app/[locale]/sealed-bid/page.tsx`
- Modify: `fe-next/components/sealedBid/SealedBidSessionSummary.tsx` (chips→coins cash-out tally)
- Test: `fe-next/app/[locale]/sealed-bid/__tests__/sealedBidFlow.test.tsx` (round flow smoke)

**Interfaces:**
- Consumes: `rackPool.dealRounds`, `chipWallet.*`, `wager.settleBid`, `SealedBidWheel`, `OddsBoard`, `ChipTray`, `Showdown`, `useCoinActions().addCoins`, existing `/api/dictionary/check` fetch. Reuse existing daily-modifier + `awardSoloDaily` once/day guard for cash-out.

**State machine per round:** `bidding` → (lock) validate word via `/api/dictionary/check` → `settleBid({playerWord, botWords: deal.botPicks, dictOk, rack, stake})` → `applyDelta(wallet, delta)` → `revealed` (mount Showdown) → `onDone` → next round or (busted/last) → `done` (cash out `cashOutCoins(chips)` → `addCoins`, guarded once/day) → summary.

- [ ] **Step 1: Failing smoke test** — render page (mock fetch → `{isValid:true}`, mock CoinContext, mock SharedFxApp/Pixi, `reducedMotion`), assert wheel + chip tray render in bidding phase and locking a word advances to a reveal with a delta shown.

```typescript
// sealedBidFlow.test.tsx — mock heavy deps
vi.mock('../../../../lib/pixiFx/SharedFxApp', () => ({ SharedFxApp: { spawnCoinStream: vi.fn(), mount: vi.fn(), unmount: vi.fn() } }));
vi.mock('../../../../components/daily/WordWheelPixiRing', () => ({ default: () => null }));
// ...render, assert ChipTray + wheel present; simulate lock; assert Showdown delta text appears.
```

- [ ] **Step 2:** Run — fail.
- [ ] **Step 3:** Implement the reworked page (felt layout: header round/chips HUD, wheel center, OddsBoard + ChipTray below, Lock/Pass buttons; Showdown overlay on reveal; busted + done states). **Remove the `canSeeInWorkModes` admin guard at ~line 226** — render for all users (keep `isDev` path harmless). Extend `SealedBidSessionSummary` with chips→coins line.
- [ ] **Step 4:** Run — pass. Then full gate: `npx tsc --noEmit && npm run lint && npx vitest run lib/sealedBid components/sealedBid app/[locale]/sealed-bid`.
- [ ] **Step 5: Commit** `feat(sealed-bid): poker betting table solo page + ungate for all users`

---

### Task 11: Assets (optional, only if CSS/Graphics insufficient)

**Files:** `fe-next/public/sealed-bid/*` (only if generated)

- [ ] Evaluate chips/seal as CSS/Pixi Graphics first (ponytail: prefer no asset). If a mascot "high-roller" personality beat is wanted, generate ONE PNG via higgsfield (kawaii mascot, poker visor/chips, neo palette, transparent bg), optimize, place in `public/sealed-bid/`, reference in the done/summary state. Skip entirely if the table reads well without it.
- [ ] Commit only if assets added: `chore(sealed-bid): high-roller mascot asset`.

---

## Phase 5 — Verify & ship

### Task 12: Full verification + optional MP input parity

- [ ] Run full scoped gate: `cd fe-next && npx tsc --noEmit && npm run lint && npx vitest run lib/sealedBid components/sealedBid app/[locale]/sealed-bid`.
- [ ] Drive the flow (use `run` / `verify` skill): play a solo game, confirm wheel drag, staking, unique payout coin-stream, clash shatter, busted path, cash-out awards coins once.
- [ ] RTL: `?locale=he` — wheel letters show sofits, layout mirrors, arrows via `DirectionalIcon`.
- [ ] **Optional MP parity (only if zero protocol change):** swap `components/multiplayer/sealedBid/SealedBidVersus.tsx` tile input for `SealedBidWheel` (display-only; MP scoring/socket untouched). If it needs protocol/engine changes, SKIP and note deferral.
- [ ] Commit any fixes. Final: verify build not broken (`.next/BUILD_ID` fresh after `npm run build:fast` if run).

---

## Self-Review (done)

- **Spec coverage:** wheel input (T5), guaranteed full-rack word (T1 gen + invariant test), random-looking shuffle (T2), bet/risk chips (T3,T4,T7), odds/uniqueness (T4,T6), showdown juice Pixi+GSAP (T6,T8), poker/Claude design (Phase 3 frontend-design), assets (T11), ungate (T10), i18n (T9), MP deferral (T12). ✓
- **Placeholders:** none — pure-logic tasks have full code + tests; UI tasks give exact props (from extracted signatures) + wiring + real test code.
- **Type consistency:** `SbRackDeal.botPicks` → `settleBid.botWords`; `Settlement` shape shared T4→T8→T10; `chipWallet` names consistent T3→T7→T10. ✓
- **Risk:** T1 generator dict-load has an explicit hand-seed fallback if standalone load fails.
