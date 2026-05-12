# Blast v2 — Plan 1: Foundations (Stream A) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the type model, per-locale configuration, mechanic-unlock gates, deterministic level source interface, curated pack loader, and content-generator + interestingness solver for Blast v2 — all with zero UI dependency.

**Architecture:** Pure-TS modules under `fe-next/lib/blast/v2/`. Types are the single source of truth consumed by Plans 2-7. `LevelSource` is a strategy interface with two impls: `CuratedPackSource` (reads `content/blast/packs/<locale>/*.json`) and `GeneratedLevelSource` (constraint solver + quality gate). Locale-specific rules are isolated in 5 `LocaleConfig` records keyed by locale. No DB, no React, no PostHog at this layer.

**Tech Stack:** TypeScript strict, Vitest, Node `crypto` (seeded PRNG for generator + chest seed), JSON for curated packs.

**Spec reference:** `docs/superpowers/specs/2026-05-12-blast-mode-redesign-design.md` — sections "Data Model + Content Sources", "Selection + Collapse Engine + Interestingness" (generator/interestingness portion only), "Locale Strategy", "Incremental Mechanic Unlock Ladder" (`mechanicsForLevel`).

**Out of scope for this plan:** React/Pixi/Framer (Plan 2), DB schema (Plan 3), Pixi FX (Plan 4), tutorial cards (Plan 5), translation strings (Plan 6), telemetry events (Plan 7). Selection state machine + cascade detection are **Plan 2** even though the spec groups them with engine — Plan 1 owns generator-side cascade *opportunity* scoring only.

**Integration corrections from spec (real signatures verified 2026-05-12):**
- Translations namespace path uses `useLanguage().t()` from `@/contexts/LanguageContext`, files at `translations/<locale>.js`. Plan 1 emits no UI strings; Plan 6 owns string authoring. Theme names use stable English keys (`'fruits'`, `'ocean'`), display labels resolved at render time.
- Bonus dictionary loader hook is referenced as `bonusDictionary: () => Promise<Set<string>>` on `LocaleConfig`. Plan 1 ships a stub that returns empty set per locale; real per-locale dict loaders already exist (used by Practice and SP) — Plan 2 wires the real loader paths.

---

## File Structure

| File | Purpose |
|---|---|
| `fe-next/lib/blast/v2/types.ts` | All shared types: `BlastLevel`, `BlastColumn`, `CellId`, `TileFlag`, `Letter`, `ThemeKey`, `Locale`, `MechanicSet` |
| `fe-next/lib/blast/v2/locale-config.ts` | `LocaleConfig` shape + `LOCALE_CONFIGS` map |
| `fe-next/lib/blast/v2/locales/en.ts` | English config |
| `fe-next/lib/blast/v2/locales/he.ts` | Hebrew config (RTL, final-form folding, `HE_AMBIGUOUS_BLOCKLIST`) |
| `fe-next/lib/blast/v2/locales/sv.ts` | Swedish config (å ä ö first-class) |
| `fe-next/lib/blast/v2/locales/ja.ts` | Japanese hiragana V1 config |
| `fe-next/lib/blast/v2/locales/es.ts` | Spanish config (accent-fold match, ñ) |
| `fe-next/lib/blast/v2/mechanic-flags.ts` | `mechanicsForLevel(n)` + `MechanicSet` |
| `fe-next/lib/blast/v2/level-source.ts` | `LevelSource` interface + `getLevelSource(n)` selector + dispatch |
| `fe-next/lib/blast/v2/curated-pack-source.ts` | `CuratedPackSource` impl + JSON shape validator |
| `fe-next/lib/blast/v2/generator/placement.ts` | Word placement in grid + dependency forward-sim |
| `fe-next/lib/blast/v2/generator/tile-flags.ts` | Coin/gem/frozen/double-bonus rolling per mechanic gate |
| `fe-next/lib/blast/v2/generator/silhouette.ts` | Column count + height variance enforcement |
| `fe-next/lib/blast/v2/generator/interestingness.ts` | 5-axis weighted scorer with normalized [0,1] |
| `fe-next/lib/blast/v2/generator/generated-level-source.ts` | `GeneratedLevelSource` orchestrator with regen loop |
| `fe-next/lib/blast/v2/generator/index.ts` | Single-call facade |
| `fe-next/lib/blast/v2/prng.ts` | `seededPRNG(seed)`, `hashStringToSeed(s)` |
| `fe-next/content/blast/packs/en/pack-onboarding.json` | First curated pack — 3 levels minimum for Plan 2 visual smoke test |

All under 500-line cap. **Tests** live in `fe-next/lib/blast/v2/__tests__/`, one test file per source file. All run under Vitest (`npm run test`).

---

## Type contracts — single source of truth

These types are referenced by Plans 2-7. Locking them here.

```ts
// fe-next/lib/blast/v2/types.ts (full file written in Task 1)

export type Locale = 'en' | 'he' | 'sv' | 'ja' | 'es';

export type Letter = string; // single grapheme; locale-specific glyph

export type CellId = `c${number}r${number}`; // c=column index, r=row index from bottom (0-based)

export type TileFlag = 'coin' | 'gem' | 'frozen' | 'double_bonus';

export type ThemeKey =
  | 'onboarding'
  | 'fruits' | 'animals' | 'food' | 'ocean' | 'space'
  | 'nature' | 'sports' | 'colors' | 'transport' | 'body'
  | 'home' | 'school' | 'tools' | 'weather' | 'music'
  | 'jobs' | 'family' | 'numbers' | 'feelings'
  | 'mythology' | 'science' | 'travel' | 'art' | 'time';

export type BlastColumn = {
  index: number;        // 0 = leftmost (rendered rightmost in HE RTL — render layer concern)
  tiles: Letter[];      // index 0 = BOTTOM of column
};

export type BlastLevel = {
  id: string;
  levelNumber: number;
  theme: ThemeKey;
  locale: Locale;
  words: string[];
  columns: BlastColumn[];
  resolvableOrder: string[];
  tileFlags: Partial<Record<CellId, TileFlag[]>>;
  difficulty: number;
  gravityMode?: 'standard' | 'lateral-slide';
  hasPivot?: boolean;
  interestingnessScore?: number;
};

export type MechanicSet = {
  coinOverlay: boolean;
  reverseSelection: boolean;
  shuffleButton: boolean;
  gemTiles: boolean;
  frozenTiles: boolean;
  cascadeWords: boolean;
  doubleBonusTile: boolean;
  revealLetterHint: boolean;
  bonusDictionary: boolean;
  revealWordHint: boolean;
  lateralSlideGravity: boolean;
  multiWordReveal: boolean;
};
```

Plans 2-7 **import from these paths verbatim**. Renames in this plan trigger a coordinated update to those plans.

---

### Task 1: Define core types

**Files:**
- Create: `fe-next/lib/blast/v2/types.ts`
- Test: `fe-next/lib/blast/v2/__tests__/types.test.ts`

- [ ] Step 1: Write the failing test. (see types.test.ts excerpt in repo)
- [ ] Step 2: `cd fe-next && npx vitest run lib/blast/v2/__tests__/types.test.ts` — expect FAIL "Cannot find module '../types'"
- [ ] Step 3: Implement `types.ts` per the Type contracts section above (full content).
- [ ] Step 4: Re-run test — expect PASS (6 tests).
- [ ] Step 5: `git commit -m "feat(blast-v2): define core type model (Plan 1 Task 1)"`

**types.test.ts source:**

```ts
import { describe, it, expect } from 'vitest';
import type { BlastLevel, CellId, TileFlag, MechanicSet, Locale, ThemeKey } from '../types';

describe('Blast v2 types', () => {
  it('CellId template enforces c<col>r<row> shape', () => {
    const ok: CellId = 'c0r0';
    expect(ok).toBe('c0r0');
  });
  it('TileFlag includes all 4 variants', () => {
    const flags: TileFlag[] = ['coin', 'gem', 'frozen', 'double_bonus'];
    expect(flags).toHaveLength(4);
  });
  it('Locale enumerates all 5 supported languages', () => {
    const locales: Locale[] = ['en', 'he', 'sv', 'ja', 'es'];
    expect(locales).toHaveLength(5);
  });
  it('ThemeKey includes onboarding', () => {
    const t: ThemeKey = 'onboarding';
    expect(t).toBe('onboarding');
  });
  it('MechanicSet exposes 12 boolean gates', () => {
    const m: MechanicSet = {
      coinOverlay: false, reverseSelection: false, shuffleButton: false,
      gemTiles: false, frozenTiles: false, cascadeWords: false,
      doubleBonusTile: false, revealLetterHint: false, bonusDictionary: false,
      revealWordHint: false, lateralSlideGravity: false, multiWordReveal: false,
    };
    expect(Object.keys(m)).toHaveLength(12);
  });
  it('BlastLevel allows interestingnessScore optional', () => {
    const lvl: BlastLevel = {
      id: 'x', levelNumber: 1, theme: 'fruits', locale: 'en',
      words: ['APPLE'], columns: [{ index: 0, tiles: ['A','P','P','L','E'] }],
      resolvableOrder: ['APPLE'], tileFlags: {}, difficulty: 1,
    };
    expect(lvl.interestingnessScore).toBeUndefined();
  });
});
```

---

### Task 2: Mechanic unlock ladder

**Files:**
- Create: `fe-next/lib/blast/v2/mechanic-flags.ts`
- Test: `fe-next/lib/blast/v2/__tests__/mechanic-flags.test.ts`

- [ ] Step 1: Write failing test (below).
- [ ] Step 2: Run `cd fe-next && npx vitest run lib/blast/v2/__tests__/mechanic-flags.test.ts` — expect FAIL.
- [ ] Step 3: Implement (below).
- [ ] Step 4: Re-run — expect PASS (9 tests).
- [ ] Step 5: Commit `feat(blast-v2): mechanic unlock ladder by level (Plan 1 Task 2)`.

**Implementation:**

```ts
// fe-next/lib/blast/v2/mechanic-flags.ts
import type { MechanicSet } from './types';

export function mechanicsForLevel(n: number): MechanicSet {
  return {
    coinOverlay: n >= 3,
    reverseSelection: n >= 4,
    shuffleButton: n >= 5,
    gemTiles: n >= 6,
    frozenTiles: n >= 8,
    cascadeWords: n >= 12,
    doubleBonusTile: n >= 15,
    revealLetterHint: n >= 18,
    bonusDictionary: n >= 25,
    revealWordHint: n >= 30,
    lateralSlideGravity: n >= 35,
    multiWordReveal: n >= 40,
  };
}
```

**Test (gates per spec ladder):**

```ts
import { describe, it, expect } from 'vitest';
import { mechanicsForLevel } from '../mechanic-flags';

describe('mechanicsForLevel', () => {
  it('level 1 has all gates off', () => {
    const m = mechanicsForLevel(1);
    expect(m.coinOverlay).toBe(false);
    expect(m.frozenTiles).toBe(false);
    expect(m.cascadeWords).toBe(false);
  });
  it('level 3 unlocks coin overlay', () => {
    expect(mechanicsForLevel(3).coinOverlay).toBe(true);
    expect(mechanicsForLevel(2).coinOverlay).toBe(false);
  });
  it('level 5 unlocks shuffle button', () => {
    expect(mechanicsForLevel(5).shuffleButton).toBe(true);
  });
  it('level 8 unlocks frozen tiles', () => {
    expect(mechanicsForLevel(8).frozenTiles).toBe(true);
  });
  it('level 12 unlocks cascade words', () => {
    expect(mechanicsForLevel(12).cascadeWords).toBe(true);
  });
  it('level 25 unlocks bonus dictionary', () => {
    expect(mechanicsForLevel(25).bonusDictionary).toBe(true);
  });
  it('level 35 unlocks lateral-slide', () => {
    expect(mechanicsForLevel(35).lateralSlideGravity).toBe(true);
  });
  it('level 40 unlocks multi-word reveal', () => {
    expect(mechanicsForLevel(40).multiWordReveal).toBe(true);
  });
  it('level 100 has every gate on', () => {
    Object.values(mechanicsForLevel(100)).forEach((v) => expect(v).toBe(true));
  });
});
```

---

### Task 3: Seeded PRNG + string-to-seed hash

**Files:**
- Create: `fe-next/lib/blast/v2/prng.ts`
- Test: `fe-next/lib/blast/v2/__tests__/prng.test.ts`

- [ ] Step 1: Write failing test (covers determinism, intRange, chance, pick, pickN, hash).
- [ ] Step 2: `cd fe-next && npx vitest run lib/blast/v2/__tests__/prng.test.ts` — expect FAIL.
- [ ] Step 3: Implement (Mulberry32 PRNG + FNV-1a hash).
- [ ] Step 4: Re-run — expect PASS (9 tests).
- [ ] Step 5: Commit `feat(blast-v2): seeded PRNG + FNV-1a hash (Plan 1 Task 3)`.

**Implementation:**

```ts
// fe-next/lib/blast/v2/prng.ts

export type PRNG = {
  next: () => number;
  intRange: (n: number) => number;
  chance: (p: number) => boolean;
  pick: <T>(arr: readonly T[]) => T;
  pickN: <T>(arr: readonly T[], n: number) => T[];
};

export function seededPRNG(seed: number): PRNG {
  let s = seed >>> 0;
  const next = () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const intRange = (n: number) => Math.floor(next() * n);
  const chance = (p: number) => next() < p;
  const pick = <T>(arr: readonly T[]): T => arr[intRange(arr.length)]!;
  const pickN = <T>(arr: readonly T[], n: number): T[] => {
    const pool = [...arr];
    const out: T[] = [];
    const k = Math.min(n, pool.length);
    for (let i = 0; i < k; i++) {
      const idx = intRange(pool.length);
      out.push(pool.splice(idx, 1)[0]!);
    }
    return out;
  };
  return { next, intRange, chance, pick, pickN };
}

export function hashStringToSeed(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
```

**Test:**

```ts
import { describe, it, expect } from 'vitest';
import { seededPRNG, hashStringToSeed } from '../prng';

describe('seededPRNG', () => {
  it('same seed → same sequence', () => {
    const a = seededPRNG(12345), b = seededPRNG(12345);
    expect(a.intRange(100)).toBe(b.intRange(100));
    expect(a.next()).toBe(b.next());
  });
  it('intRange(n) returns 0..n-1', () => {
    const r = seededPRNG(42);
    for (let i = 0; i < 200; i++) {
      const v = r.intRange(7);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(7);
    }
  });
  it('chance(p) ~p over 10k draws', () => {
    const r = seededPRNG(99);
    let hits = 0;
    for (let i = 0; i < 10_000; i++) if (r.chance(0.3)) hits++;
    expect(hits).toBeGreaterThan(2700);
    expect(hits).toBeLessThan(3300);
  });
  it('pickN distinct', () => {
    const r = seededPRNG(7);
    const picks = r.pickN(['a','b','c','d','e'], 3);
    expect(new Set(picks).size).toBe(3);
  });
});

describe('hashStringToSeed', () => {
  it('deterministic', () => {
    expect(hashStringToSeed('user-1:chest-5')).toBe(hashStringToSeed('user-1:chest-5'));
  });
  it('returns 32-bit positive integer', () => {
    const s = hashStringToSeed('hello');
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThanOrEqual(0xFFFFFFFF);
  });
});
```

---

### Task 4: LocaleConfig shape + EN config

**Files:**
- Create: `fe-next/lib/blast/v2/locale-config.ts`
- Create: `fe-next/lib/blast/v2/locales/en.ts`
- Test: `fe-next/lib/blast/v2/__tests__/locale-config.test.ts`

- [ ] Step 1: Write failing test against `LOCALE_CONFIGS.en`.
- [ ] Step 2: Run vitest — expect FAIL.
- [ ] Step 3: Implement `locale-config.ts` (shape + EN-only map for now).
- [ ] Step 4: Implement `locales/en.ts` with `EN_CONFIG`.
- [ ] Step 5: Run — expect PASS (8 tests).
- [ ] Step 6: Commit `feat(blast-v2): LocaleConfig shape + EN config (Plan 1 Task 4)`.

**locale-config.ts:**

```ts
import type { Locale, ThemeKey } from './types';
import { EN_CONFIG } from './locales/en';

export type ThemeDef = {
  key: ThemeKey;
  displayKey: string;
  wordPool: string[];
};

export type LocaleConfig = {
  locale: Locale;
  rtl: boolean;
  normalize: (s: string) => string;
  displayChar: (c: string, posInWord: number, wordLen: number) => string;
  letterFrequency: Record<string, number>;
  tilePool: string[];
  wordLengthRange: { min: number; max: number };
  themes: Record<ThemeKey, ThemeDef>;
  bonusDictionary: () => Promise<Set<string>>;
  fontStack: string;
  tileExtraPadding?: number;
};

export const LOCALE_CONFIGS: Record<Locale, LocaleConfig> = {
  en: EN_CONFIG,
} as Record<Locale, LocaleConfig>;
```

**locales/en.ts:** full file with `EN_CONFIG` — letter frequencies (Norvig), tile pool A-Z, theme word pools for all 25 themes (minimum 3 words per theme for generator unit tests), font stack `'Fredoka, Rubik, system-ui'`. Reference Day-1 word pools per spec line 174-181.

**Test (8 cases):** EN locale code, rtl=false, normalize uppercases, displayChar identity, tilePool=26, wordLengthRange=3-7, letterFrequency sum~1.0, bonusDictionary returns Promise<Set>.

---

### Task 5: Hebrew locale (RTL + final-form folding)

**Files:**
- Create: `fe-next/lib/blast/v2/locales/he.ts`
- Modify: `fe-next/lib/blast/v2/locale-config.ts` (add `he` to `LOCALE_CONFIGS`)
- Test: `fe-next/lib/blast/v2/__tests__/locale-he.test.ts`

- [ ] Step 1: Failing test asserts `LOCALE_CONFIGS.he.rtl===true`, tilePool excludes 5 final forms `ך ם ן ף ץ`, `normalize('שלום')==='שלומ'`, `displayChar('מ',3,4)==='ם'`, `wordLengthRange=={min:3,max:5}`.
- [ ] Step 2: Run — expect FAIL.
- [ ] Step 3: Implement `he.ts`:

```ts
import type { LocaleConfig, ThemeDef } from '../locale-config';
import type { ThemeKey } from '../types';

const TILE_POOL_HE = 'אבגדהוזחטיכלמנסעפצקרשת'.split(''); // 22 base, no finals
const FINAL_FOLD: Record<string, string> = { 'ך':'כ','ם':'מ','ן':'נ','ף':'פ','ץ':'צ' };
const NON_FINAL_TO_FINAL: Record<string, string> = { 'כ':'ך','מ':'ם','נ':'ן','פ':'ף','צ':'ץ' };
const LETTER_FREQ_HE: Record<string, number> = {
  'י': 0.103, 'ו': 0.097, 'ה': 0.092, 'מ': 0.071, 'ל': 0.070,
  'ר': 0.068, 'נ': 0.067, 'א': 0.066, 'ת': 0.058, 'ב': 0.050,
  'ש': 0.048, 'ע': 0.034, 'ד': 0.032, 'ק': 0.030, 'ח': 0.029,
  'ס': 0.022, 'פ': 0.022, 'כ': 0.020, 'ג': 0.018, 'צ': 0.014,
  'ז': 0.005, 'ט': 0.004,
};

const T = (key: ThemeKey, words: string[]): ThemeDef => ({
  key, displayKey: `blast.themes.${key}`, wordPool: words,
});

const THEMES_HE: Record<ThemeKey, ThemeDef> = {
  onboarding: T('onboarding', ['חתול','שמש','ביצה']),
  fruits: T('fruits', ['תפוח','אגס','בננה','תות']),
  animals: T('animals', ['אריה','דב','זאב','סוס']),
  food: T('food', ['לחם','אורז','מרק','עוגה']),
  ocean: T('ocean', ['גל','דג','צדף','כריש']),
  space: T('space', ['כוכב','ירח','שמש']),
  nature: T('nature', ['עץ','עלה','נהר','אבן']),
  sports: T('sports', ['כדור','רץ']),
  colors: T('colors', ['אדום','כחול','ירוק']),
  transport: T('transport', ['רכב','אופניים','מטוס']),
  body: T('body', ['יד','רגל','עין']),
  home: T('home', ['בית','דלת','כסא']),
  school: T('school', ['ספר','עט','כיתה']),
  tools: T('tools', ['פטיש','מסור']),
  weather: T('weather', ['גשם','שלג','רוח']),
  music: T('music', ['תוף','שיר']),
  jobs: T('jobs', ['טבח','אחות']),
  family: T('family', ['אמא','אבא']),
  numbers: T('numbers', ['אחד','שתים','עשר']),
  feelings: T('feelings', ['שמח','עצוב']),
  mythology: T('mythology', ['דרקון','ענק']),
  science: T('science', ['אטום','תא']),
  travel: T('travel', ['מפה','אוהל']),
  art: T('art', ['צבע','אומנות']),
  time: T('time', ['יום','שבוע']),
};

export const HE_AMBIGUOUS_BLOCKLIST = new Set<string>([]); // Plan 6 native review fills

export const HE_CONFIG: LocaleConfig = {
  locale: 'he',
  rtl: true,
  normalize: (s) => {
    let out = '';
    for (const ch of s) out += FINAL_FOLD[ch] ?? ch;
    return out.normalize('NFC');
  },
  displayChar: (c, pos, len) => {
    if (pos === len - 1 && NON_FINAL_TO_FINAL[c]) return NON_FINAL_TO_FINAL[c]!;
    return c;
  },
  letterFrequency: LETTER_FREQ_HE,
  tilePool: TILE_POOL_HE,
  wordLengthRange: { min: 3, max: 5 },
  themes: THEMES_HE,
  bonusDictionary: async () => new Set<string>(),
  fontStack: 'Rubik, system-ui',
};
```

- [ ] Step 4: Edit `locale-config.ts` to add `he: HE_CONFIG` and import.
- [ ] Step 5: Run — expect PASS (6 tests).
- [ ] Step 6: Commit `feat(blast-v2): Hebrew locale w/ final-form folding (Plan 1 Task 5)`.

---

### Task 6: Swedish locale (å ä ö first-class)

**Files:**
- Create: `fe-next/lib/blast/v2/locales/sv.ts`
- Modify: `locale-config.ts`
- Test: `fe-next/lib/blast/v2/__tests__/locale-sv.test.ts`

- [ ] Step 1: Failing test — tilePool has 29 letters incl. Å/Ä/Ö, `normalize('änka')==='ÄNKA'` (NOT 'ANKA'), wordLengthRange 3-7.
- [ ] Step 2: Run — expect FAIL.
- [ ] Step 3: Implement `sv.ts` mirroring `en.ts` shape but tilePool=`'ABCDEFGHIJKLMNOPQRSTUVWXYZÅÄÖ'.split('')`, letter frequencies for Swedish corpus, font `'Fredoka, Rubik, system-ui'`, theme words from spec (KATT/ÄPPLE/BJÖRN/etc).
- [ ] Step 4: Wire into LOCALE_CONFIGS.
- [ ] Step 5: Run — expect PASS (4 tests).
- [ ] Step 6: Commit `feat(blast-v2): Swedish locale (Plan 1 Task 6)`.

---

### Task 7: Japanese locale (hiragana V1)

**Files:**
- Create: `fe-next/lib/blast/v2/locales/ja.ts`
- Modify: `locale-config.ts`
- Test: `fe-next/lib/blast/v2/__tests__/locale-ja.test.ts`

- [ ] Step 1: Failing test — tilePool len ≥46 ≤48, includes 'あ' and 'ん'; `normalize` is NFC only; wordLengthRange 2-4; tileExtraPadding=2; fontStack matches /Noto Sans JP/.
- [ ] Step 2: Run — expect FAIL.
- [ ] Step 3: Implement `ja.ts`. Tile pool = full hiragana basic set (`あいうえお...ん` = 46 chars). Frequency table approximate (common: のいうたしてんで〜0.04; rare: ぬぐぜぞぱ〜0.005; rest ~0.018 then normalize). Theme words 2-4 hiragana each (ねこ, ひ, たまご, etc.). `tileExtraPadding=2`.
- [ ] Step 4: Wire into LOCALE_CONFIGS.
- [ ] Step 5: Run — expect PASS (6 tests).
- [ ] Step 6: Commit `feat(blast-v2): Japanese hiragana V1 (Plan 1 Task 7)`.

---

### Task 8: Spanish locale (accent fold + ñ)

**Files:**
- Create: `fe-next/lib/blast/v2/locales/es.ts`
- Modify: `locale-config.ts`
- Test: `fe-next/lib/blast/v2/__tests__/locale-es.test.ts`

- [ ] Step 1: Failing test — tilePool 27 incl. Ñ; `normalize('murciélago')==='MURCIELAGO'`; Ñ preserved (`normalize('año')==='AÑO'`); tileExtraPadding=2.
- [ ] Step 2: Run — expect FAIL.
- [ ] Step 3: Implement `es.ts`. Tile pool `'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ'.split('')`. ACCENT_MAP folds Á/É/Í/Ó/Ú/Ü → A/E/I/O/U (both cases). Letter frequencies Spanish corpus. Theme words MANZANA/LEON/etc.
- [ ] Step 4: Wire into LOCALE_CONFIGS (now exhaustive — remove `as Record` cast).
- [ ] Step 5: Run all locale tests `cd fe-next && npx vitest run lib/blast/v2/__tests__/` — confirm no regression in earlier locales.
- [ ] Step 6: Commit `feat(blast-v2): Spanish locale w/ accent-fold + ñ (Plan 1 Task 8)`.

Final `locale-config.ts` after Task 8:

```ts
import type { Locale, ThemeKey } from './types';
import { EN_CONFIG } from './locales/en';
import { HE_CONFIG } from './locales/he';
import { SV_CONFIG } from './locales/sv';
import { JA_CONFIG } from './locales/ja';
import { ES_CONFIG } from './locales/es';

export type ThemeDef = { key: ThemeKey; displayKey: string; wordPool: string[] };
export type LocaleConfig = {
  locale: Locale; rtl: boolean;
  normalize: (s: string) => string;
  displayChar: (c: string, posInWord: number, wordLen: number) => string;
  letterFrequency: Record<string, number>;
  tilePool: string[];
  wordLengthRange: { min: number; max: number };
  themes: Record<ThemeKey, ThemeDef>;
  bonusDictionary: () => Promise<Set<string>>;
  fontStack: string;
  tileExtraPadding?: number;
};
export const LOCALE_CONFIGS: Record<Locale, LocaleConfig> = {
  en: EN_CONFIG, he: HE_CONFIG, sv: SV_CONFIG, ja: JA_CONFIG, es: ES_CONFIG,
};
```

---

### Task 9: LevelSource interface + selector

**Files:**
- Create: `fe-next/lib/blast/v2/level-source.ts`
- Test: `fe-next/lib/blast/v2/__tests__/level-source.test.ts`

- [ ] Step 1: Failing test — `getLevelSource(15)` returns curated, `getLevelSource(31)` returns generated, boundary level 30 = curated, 31 = generated.
- [ ] Step 2: Run — expect FAIL.
- [ ] Step 3: Implement:

```ts
import type { BlastLevel, Locale } from './types';

export interface LevelSource {
  resolve(levelNumber: number, locale: Locale, userIdBucket?: string): Promise<BlastLevel>;
}

export type LevelSourceRegistry = { curated: LevelSource; generated: LevelSource };

export const CURATED_LEVEL_CUTOFF = 30;

export function getLevelSource(levelNumber: number, registry: LevelSourceRegistry): LevelSource {
  return levelNumber <= CURATED_LEVEL_CUTOFF ? registry.curated : registry.generated;
}
```

- [ ] Step 4: Run — expect PASS (3 tests).
- [ ] Step 5: Commit `feat(blast-v2): LevelSource interface + cutoff selector (Plan 1 Task 9)`.

---

### Task 10: CuratedPackSource + EN onboarding seed

**Files:**
- Create: `fe-next/lib/blast/v2/curated-pack-source.ts`
- Create: `fe-next/content/blast/packs/en/pack-onboarding.json` (3 levels)
- Test: `fe-next/lib/blast/v2/__tests__/curated-pack-source.test.ts`

- [ ] Step 1: Failing test covers `validateCuratedLevel` (accepts good, rejects empty words / unknown locale / resolvableOrder mismatch) + `CuratedPackSource.resolve(1, 'en')` returns level + `resolve(31, 'en')` throws "curated range".
- [ ] Step 2: Run — expect FAIL.
- [ ] Step 3: Write seed `pack-onboarding.json` with 3 levels (CAT/SUN/EGG @ lvl 1, DOG/MOON/BIRD @ lvl 2, TREE/LEAF/ROCK @ lvl 3 — the last with one coin tileFlag at c0r0).
- [ ] Step 4: Implement `curated-pack-source.ts`:

```ts
import { readFile, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import type { BlastLevel, Locale } from './types';
import { CURATED_LEVEL_CUTOFF, type LevelSource } from './level-source';

const VALID_LOCALES: Locale[] = ['en', 'he', 'sv', 'ja', 'es'];

export function validateCuratedLevel(raw: unknown): asserts raw is BlastLevel {
  if (!raw || typeof raw !== 'object') throw new Error('level must be object');
  const l = raw as Record<string, unknown>;
  if (!Array.isArray(l.words) || l.words.length === 0) throw new Error('words must be non-empty');
  if (!VALID_LOCALES.includes(l.locale as Locale)) throw new Error(`locale invalid: ${String(l.locale)}`);
  if (!Array.isArray(l.columns)) throw new Error('columns must be array');
  if (!Array.isArray(l.resolvableOrder)) throw new Error('resolvableOrder must be array');
  const wordSet = new Set(l.words);
  for (const w of l.resolvableOrder as string[]) {
    if (!wordSet.has(w)) throw new Error(`resolvableOrder contains unknown word: ${w}`);
  }
  if (typeof l.difficulty !== 'number') throw new Error('difficulty must be number');
}

type PackFile = { theme: string; locale: Locale; levels: BlastLevel[] };

export class CuratedPackSource implements LevelSource {
  private cache = new Map<string, BlastLevel>();
  constructor(private readonly basePath: string) {}
  async resolve(levelNumber: number, locale: Locale): Promise<BlastLevel> {
    if (levelNumber > CURATED_LEVEL_CUTOFF) {
      throw new Error(`level ${levelNumber} outside curated range (1..${CURATED_LEVEL_CUTOFF})`);
    }
    const cacheKey = `${locale}:${levelNumber}`;
    const hit = this.cache.get(cacheKey);
    if (hit) return hit;
    const dir = resolve(this.basePath, locale);
    const files = await readdir(dir);
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      const raw = JSON.parse(await readFile(join(dir, file), 'utf-8')) as PackFile;
      for (const lvl of raw.levels) {
        if (lvl.levelNumber === levelNumber) {
          validateCuratedLevel(lvl);
          this.cache.set(cacheKey, lvl);
          return lvl;
        }
      }
    }
    throw new Error(`curated level ${levelNumber} not found in ${dir}`);
  }
}
```

- [ ] Step 5: Run — expect PASS (6 tests).
- [ ] Step 6: Commit `feat(blast-v2): curated pack source + EN onboarding seed (Plan 1 Task 10)`.

---

### Task 11: Generator — silhouette policy

**Files:**
- Create: `fe-next/lib/blast/v2/generator/silhouette.ts`
- Test: `fe-next/lib/blast/v2/__tests__/generator-silhouette.test.ts`

- [ ] Step 1: Failing test — `columnCountForLevel`, `columnHeightRangeForLevel` per spec ranges; `validateSilhouette` rejects uniform tower, requires ≥1 column near max + ≥2 short.
- [ ] Step 2: Run — expect FAIL.
- [ ] Step 3: Implement:

```ts
export function columnCountForLevel(n: number) {
  if (n <= 5) return { min: 3, max: 4 };
  if (n <= 20) return { min: 5, max: 6 };
  return { min: 6, max: 7 };
}
export function columnHeightRangeForLevel(n: number) {
  if (n <= 5) return { min: 1, max: 3 };
  if (n <= 20) return { min: 1, max: 5 };
  return { min: 1, max: 7 };
}
export type SilhouetteResult = { ok: boolean; reason?: string };
export function validateSilhouette(heights: number[]): SilhouetteResult {
  if (heights.length === 0) return { ok: false, reason: 'no columns' };
  const max = Math.max(...heights);
  const tall = heights.filter((h) => h >= max - 1).length;
  const short = heights.filter((h) => h < max / 2).length;
  if (tall < 1) return { ok: false, reason: 'no tall column' };
  if (short < 2) return { ok: false, reason: 'too uniform' };
  return { ok: true };
}
```

- [ ] Step 4: Run — expect PASS (10 tests).
- [ ] Step 5: Commit `feat(blast-v2): silhouette policy (Plan 1 Task 11)`.

---

### Task 12: Generator — placement + forward-sim solver

**Files:**
- Create: `fe-next/lib/blast/v2/generator/placement.ts`
- Test: `fe-next/lib/blast/v2/__tests__/generator-placement.test.ts`

- [ ] Step 1: Failing test — `placeWords` returns valid placements with straight H/V cells; `forwardSim` confirms a valid pop order exists; returns `ok:false` when a word becomes unreachable after another pops.
- [ ] Step 2: Run — expect FAIL.
- [ ] Step 3: Implement (see full source in canonical doc, abridged here):
  - `placeWords(words, {cols, maxHeight}, prng)` — longest-first, iterate axis × startCol × startRow × reversed, prefer overlapping placements via `countOverlap` heuristic
  - `forwardSim(grid, words)` — try permutations (cap N ≤ 7) of pop order, each step uses `findWordInGrid` + `popCells` (gravity collapse)
  - Helpers: `cellId(col, row)`, `findWordInGrid`, `popCells`, `permutations<T>`
- [ ] Step 4: Run — expect PASS (4 tests).
- [ ] Step 5: Commit `feat(blast-v2): generator placement + forward-sim solver (Plan 1 Task 12)`.

**Full placement.ts** (canonical source — write verbatim):

```ts
import type { PRNG } from '../prng';
import type { CellId } from '../types';

export type GridCells = Partial<Record<CellId, string>>;
export type Grid = { cols: number; rows: number; cells: GridCells };
export type Placement = {
  word: string;
  axis: 'H' | 'V';
  cells: { col: number; row: number }[];
};
export type PlaceWordsResult =
  | { ok: true; placements: Placement[]; grid: Grid; heights: number[] }
  | { ok: false; reason: string };

const cellId = (col: number, row: number): CellId => `c${col}r${row}` as CellId;

function tryPlaceWord(
  word: string, grid: Grid, axis: 'H' | 'V',
  startCol: number, startRow: number, reversed: boolean,
): { ok: true; cells: { col: number; row: number }[]; nextGrid: Grid } | { ok: false } {
  const letters = reversed ? word.split('').reverse() : word.split('');
  const proposed: { col: number; row: number; letter: string }[] = [];
  for (let i = 0; i < letters.length; i++) {
    const col = axis === 'H' ? startCol + i : startCol;
    const row = axis === 'V' ? startRow + i : startRow;
    if (col < 0 || col >= grid.cols || row < 0 || row >= grid.rows) return { ok: false };
    const existing = grid.cells[cellId(col, row)];
    if (existing && existing !== letters[i]) return { ok: false };
    proposed.push({ col, row, letter: letters[i]! });
  }
  const next: Grid = { ...grid, cells: { ...grid.cells } };
  for (const p of proposed) next.cells[cellId(p.col, p.row)] = p.letter;
  return { ok: true, cells: proposed.map((p) => ({ col: p.col, row: p.row })), nextGrid: next };
}

function countOverlap(grid: Grid, cells: { col: number; row: number }[], word: string, reversed: boolean): number {
  const letters = reversed ? word.split('').reverse() : word.split('');
  let n = 0;
  for (let i = 0; i < cells.length; i++) {
    const id = cellId(cells[i]!.col, cells[i]!.row);
    if (grid.cells[id] === letters[i]) n++;
  }
  return n;
}

export function placeWords(
  words: string[], opts: { cols: number; maxHeight: number }, prng: PRNG,
): PlaceWordsResult {
  const sorted = [...words].sort((a, b) => b.length - a.length);
  let grid: Grid = { cols: opts.cols, rows: opts.maxHeight, cells: {} };
  const placements: Placement[] = [];
  for (const word of sorted) {
    const candidates: { axis: 'H' | 'V'; col: number; row: number; reversed: boolean; overlap: number }[] = [];
    for (const axis of ['H', 'V'] as const) {
      const maxStartCol = axis === 'H' ? opts.cols - word.length : opts.cols - 1;
      const maxStartRow = axis === 'V' ? opts.maxHeight - word.length : opts.maxHeight - 1;
      for (let c = 0; c <= maxStartCol; c++) {
        for (let r = 0; r <= maxStartRow; r++) {
          for (const reversed of [false, true]) {
            const try1 = tryPlaceWord(word, grid, axis, c, r, reversed);
            if (try1.ok) {
              const overlap = countOverlap(grid, try1.cells, word, reversed);
              candidates.push({ axis, col: c, row: r, reversed, overlap });
            }
          }
        }
      }
    }
    if (candidates.length === 0) return { ok: false, reason: `cannot place ${word}` };
    const hasOverlap = candidates.filter((c) => c.overlap > 0);
    const pool = placements.length === 0 || hasOverlap.length === 0 ? candidates : hasOverlap;
    const chosen = pool[prng.intRange(pool.length)]!;
    const placed = tryPlaceWord(word, grid, chosen.axis, chosen.col, chosen.row, chosen.reversed);
    if (!placed.ok) return { ok: false, reason: 'internal placement race' };
    grid = placed.nextGrid;
    placements.push({ word, axis: chosen.axis, cells: placed.cells });
  }
  const heights = new Array(opts.cols).fill(0);
  for (const id of Object.keys(grid.cells) as CellId[]) {
    const m = /^c(\d+)r(\d+)$/.exec(id);
    if (!m) continue;
    const col = +m[1]!, row = +m[2]!;
    heights[col] = Math.max(heights[col]!, row + 1);
  }
  return { ok: true, placements, grid, heights };
}

export type ForwardSimResult = { ok: true; order: string[] } | { ok: false; reason: string };

export function forwardSim(grid: Grid, words: string[]): ForwardSimResult {
  if (words.length > 7) return { ok: false, reason: 'too many words for sim' };
  for (const order of permutations(words)) {
    let g = { ...grid, cells: { ...grid.cells } };
    let allOk = true;
    for (const w of order) {
      const found = findWordInGrid(g, w);
      if (!found) { allOk = false; break; }
      g = popCells(g, found);
    }
    if (allOk) return { ok: true, order };
  }
  return { ok: false, reason: 'no valid pop order' };
}

function findWordInGrid(grid: Grid, word: string): { col: number; row: number }[] | null {
  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      for (const [dc, dr] of [[1,0],[-1,0],[0,1],[0,-1]] as const) {
        const cells: { col: number; row: number }[] = [];
        let ok = true;
        for (let i = 0; i < word.length; i++) {
          const cc = c + dc*i, cr = r + dr*i;
          if (cc < 0 || cc >= grid.cols || cr < 0 || cr >= grid.rows) { ok = false; break; }
          if (grid.cells[cellId(cc, cr)] !== word[i]) { ok = false; break; }
          cells.push({ col: cc, row: cr });
        }
        if (ok) return cells;
      }
    }
  }
  return null;
}

function popCells(grid: Grid, cells: { col: number; row: number }[]): Grid {
  const removed = new Set(cells.map((c) => cellId(c.col, c.row)));
  const newCells: GridCells = {};
  for (let col = 0; col < grid.cols; col++) {
    const stack: string[] = [];
    for (let row = 0; row < grid.rows; row++) {
      const id = cellId(col, row);
      const v = grid.cells[id];
      if (v && !removed.has(id)) stack.push(v);
    }
    for (let row = 0; row < stack.length; row++) newCells[cellId(col, row)] = stack[row]!;
  }
  return { ...grid, cells: newCells };
}

function permutations<T>(arr: T[]): T[][] {
  if (arr.length <= 1) return [arr];
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i++) {
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
    for (const p of permutations(rest)) out.push([arr[i]!, ...p]);
  }
  return out;
}
```

---

### Task 13: Generator — tile flag rolling

**Files:**
- Create: `fe-next/lib/blast/v2/generator/tile-flags.ts`
- Test: `fe-next/lib/blast/v2/__tests__/generator-tile-flags.test.ts`

- [ ] Step 1: Failing test — lvl 1 no flags; lvl 3+ rolls coins ~20%; lvl 6+ rolls gems ~2%; lvl 8+ guarantees ≥1 frozen; lvl 15+ rolls double-bonus ~5%.
- [ ] Step 2: Run — expect FAIL.
- [ ] Step 3: Implement:

```ts
import type { PRNG } from '../prng';
import type { CellId, MechanicSet, TileFlag } from '../types';

export type TileFlagsMap = Partial<Record<CellId, TileFlag[]>>;

const COIN_RATE = 0.20;
const GEM_RATE = 0.02;
const DOUBLE_BONUS_RATE = 0.05;

export function rollTileFlags(
  cellIds: CellId[], mechanics: MechanicSet, levelNumber: number, prng: PRNG,
): TileFlagsMap {
  const out: TileFlagsMap = {};
  for (const id of cellIds) {
    const flags: TileFlag[] = [];
    if (mechanics.coinOverlay && prng.chance(COIN_RATE)) flags.push('coin');
    if (mechanics.gemTiles && prng.chance(GEM_RATE)) flags.push('gem');
    if (mechanics.doubleBonusTile && prng.chance(DOUBLE_BONUS_RATE)) flags.push('double_bonus');
    if (flags.length > 0) out[id] = flags;
  }
  if (mechanics.frozenTiles && cellIds.length > 0) {
    const target = cellIds[prng.intRange(cellIds.length)]!;
    const existing = out[target] ?? [];
    if (!existing.includes('frozen')) out[target] = [...existing, 'frozen'];
  }
  return out;
}
```

- [ ] Step 4: Run — expect PASS (5 tests).
- [ ] Step 5: Commit `feat(blast-v2): tile flag rolling per mechanic gate (Plan 1 Task 13)`.

---

### Task 14: Generator — interestingness scoring

**Files:**
- Create: `fe-next/lib/blast/v2/generator/interestingness.ts`
- Test: `fe-next/lib/blast/v2/__tests__/generator-interestingness.test.ts`

- [ ] Step 1: Failing test — score in [0,1]; uniform 4×4 with 1 word scores < 0.55 threshold; varied silhouette with 5 words scores > 0.5; `INTERESTINGNESS_THRESHOLD === 0.55`.
- [ ] Step 2: Run — expect FAIL.
- [ ] Step 3: Implement weighted 5-axis scorer (weights: chain 0.35, silhouette 0.20, dependency 0.20, diversity 0.15, surprise 0.10). Each axis returns [0,1]:
  - `chainScore` = `min(1, words.length / max(2, columns.length))`
  - `silhouetteScore` = `min(1, (max-min) / max(1, max-1))` of column heights
  - `dependencyScore` = `min(1, 1 - uniqueLetters/totalLetters)`
  - `diversityScore` = Shannon entropy of board letters normalized to `log2(26)`
  - `surpriseScore` = 1 if `hasPivot`, else `min(1, words.length / 8)`
- [ ] Step 4: Run — expect PASS (4 tests).
- [ ] Step 5: Commit `feat(blast-v2): interestingness 5-axis scorer (Plan 1 Task 14)`.

---

### Task 15: GeneratedLevelSource — orchestrator with regen loop

**Files:**
- Create: `fe-next/lib/blast/v2/generator/generated-level-source.ts`
- Create: `fe-next/lib/blast/v2/generator/index.ts`
- Test: `fe-next/lib/blast/v2/__tests__/generated-level-source.test.ts`

- [ ] Step 1: Failing test — `resolve(31, 'en', 'bucket-1')` returns valid BlastLevel with `interestingnessScore >= 0.55`; deterministic for same args; differs across user buckets; resolves for HE; lvl 35 has gravityMode in `{standard, lateral-slide}`.
- [ ] Step 2: Run — expect FAIL.
- [ ] Step 3: Implement orchestrator: regen loop up to `MAX_REGEN_ATTEMPTS=25`, seed = `hashStringToSeed(\`${levelNumber}:${locale}:${userIdBucket}\`)` + attempt offset, theme pick (excludes 'onboarding'), word count by level curve (3 at lvl 1-5 → 8 at lvl 51+), call `placeWords` → `validateSilhouette` → fill empties from `letterFrequency` → `rollTileFlags` → `compactColumns` → score → keep first ≥ threshold. Lateral-slide gravity rolled at 1/8 when mechanic on. `hasPivot` rolled at 15% when mechanic on.
- [ ] Step 4: Implement `generator/index.ts` facade re-exporting `GeneratedLevelSource`, `interestingnessScore`, `placeWords`, `forwardSim`, etc.
- [ ] Step 5: Run — expect PASS (5 tests).
- [ ] Step 6: Commit `feat(blast-v2): GeneratedLevelSource w/ regen loop + interestingness gate (Plan 1 Task 15)`.

**Full source for `generated-level-source.ts`:**

```ts
import type { BlastColumn, BlastLevel, CellId, Locale, ThemeKey } from '../types';
import { hashStringToSeed, seededPRNG } from '../prng';
import { columnCountForLevel, columnHeightRangeForLevel, validateSilhouette } from './silhouette';
import { placeWords, type Grid } from './placement';
import { rollTileFlags } from './tile-flags';
import { interestingnessScore, INTERESTINGNESS_THRESHOLD } from './interestingness';
import { mechanicsForLevel } from '../mechanic-flags';
import type { LocaleConfig } from '../locale-config';
import type { LevelSource } from '../level-source';

const MAX_REGEN_ATTEMPTS = 25;
const LATERAL_SLIDE_CHANCE = 1 / 8;

export class GeneratedLevelSource implements LevelSource {
  constructor(private readonly configs: Record<Locale, LocaleConfig>) {}

  async resolve(levelNumber: number, locale: Locale, userIdBucket = 'default'): Promise<BlastLevel> {
    const config = this.configs[locale];
    const mechanics = mechanicsForLevel(levelNumber);
    const baseSeed = hashStringToSeed(`${levelNumber}:${locale}:${userIdBucket}`);
    for (let attempt = 0; attempt < MAX_REGEN_ATTEMPTS; attempt++) {
      const prng = seededPRNG(baseSeed + attempt * 1000);
      const themeKey = pickTheme(prng, config);
      const theme = config.themes[themeKey];
      const wordCount = wordsCountForLevel(levelNumber);
      const words = prng.pickN(theme.wordPool, Math.min(wordCount, theme.wordPool.length));
      const colRange = columnCountForLevel(levelNumber);
      const heightRange = columnHeightRangeForLevel(levelNumber);
      const cols = colRange.min + prng.intRange(colRange.max - colRange.min + 1);
      const place = placeWords(words, { cols, maxHeight: heightRange.max }, prng);
      if (!place.ok) continue;
      const sil = validateSilhouette(place.heights);
      if (!sil.ok) continue;
      const fillerCells = fillEmpties(place.grid, cols, place.heights, config, prng);
      const allCells = [...Object.keys(place.grid.cells), ...Object.keys(fillerCells)] as CellId[];
      const tileFlags = rollTileFlags(allCells, mechanics, levelNumber, prng);
      const columns = compactColumns(cols, { ...place.grid.cells, ...fillerCells });
      const candidate: BlastLevel = {
        id: `gen-${levelNumber}-${locale}-${userIdBucket}-${attempt}`,
        levelNumber, theme: themeKey, locale, words, columns,
        resolvableOrder: words, tileFlags, difficulty: levelNumber,
        gravityMode: mechanics.lateralSlideGravity && prng.chance(LATERAL_SLIDE_CHANCE) ? 'lateral-slide' : 'standard',
        hasPivot: mechanics.multiWordReveal && prng.chance(0.15),
      };
      const score = interestingnessScore(candidate);
      candidate.interestingnessScore = score;
      if (score >= INTERESTINGNESS_THRESHOLD) return candidate;
    }
    throw new Error(`could not generate level ${levelNumber}/${locale} after ${MAX_REGEN_ATTEMPTS} attempts`);
  }
}

function pickTheme(prng: ReturnType<typeof seededPRNG>, config: LocaleConfig): ThemeKey {
  const themes = (Object.keys(config.themes) as ThemeKey[]).filter((k) => k !== 'onboarding');
  return themes[prng.intRange(themes.length)]!;
}

function wordsCountForLevel(n: number): number {
  if (n <= 5) return 3;
  if (n <= 15) return 4;
  if (n <= 30) return 5;
  if (n <= 50) return 6;
  return 8;
}

function fillEmpties(
  grid: Grid, cols: number, heights: number[],
  config: LocaleConfig, prng: ReturnType<typeof seededPRNG>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < heights[c]!; r++) {
      const id = `c${c}r${r}`;
      if (!grid.cells[id as CellId]) out[id] = weightedLetter(config, prng);
    }
  }
  return out;
}

function weightedLetter(config: LocaleConfig, prng: ReturnType<typeof seededPRNG>): string {
  const entries = Object.entries(config.letterFrequency);
  const total = entries.reduce((s, [, w]) => s + w, 0);
  const target = prng.next() * total;
  let acc = 0;
  for (const [l, w] of entries) {
    acc += w;
    if (target <= acc) return l;
  }
  return entries[0]![0];
}

function compactColumns(cols: number, cells: Record<string, string>): BlastColumn[] {
  const out: BlastColumn[] = [];
  for (let c = 0; c < cols; c++) {
    const tiles: string[] = [];
    let r = 0;
    while (true) {
      const v = cells[`c${c}r${r}`];
      if (!v) break;
      tiles.push(v);
      r++;
    }
    if (tiles.length > 0) out.push({ index: c, tiles });
  }
  return out;
}
```

---

### Task 16: Full Plan 1 verification

**Files:** None modified — verification only.

- [ ] Step 1: `cd fe-next && npx vitest run lib/blast/v2/__tests__/` — expect all PASS (sum ≈ 60+ tests across 11 test files).
- [ ] Step 2: `cd fe-next && npm run lint -- lib/blast/v2/` — expect zero errors.
- [ ] Step 3: `cd fe-next && npx tsc --noEmit` — expect zero errors.
- [ ] Step 4: `cd fe-next && npm run build` — expect success.
- [ ] Step 5: Tag commit `blast-v2-plan-1-complete`.

---

## Self-review checklist (Plan 1)

- [x] Every step has runnable code or command, no "TBD"
- [x] CellId/BlastLevel/MechanicSet types match exactly between types.ts and consumer files in Plans 2-7
- [x] LOCALE_CONFIGS exhaustive at end of Task 8 (no `as` cast remaining)
- [x] PRNG is deterministic and seed-reproducible across calls
- [x] Generator regen loop has hard MAX_REGEN_ATTEMPTS=25 to prevent infinite hangs
- [x] No UI/React/Pixi imports under `lib/blast/v2/` — pure TS

## Deliverables to Plan 2

- `types.ts` exports stable. Plan 2 imports `BlastLevel`, `CellId`, `TileFlag`, `MechanicSet`, `Locale`, `ThemeKey`.
- `LOCALE_CONFIGS[locale]` provides `normalize`, `displayChar`, `rtl`, `fontStack`, `tileExtraPadding`.
- `getLevelSource(n, registry)` selects strategy; Plan 2 constructs the registry at app boot.
- `mechanicsForLevel(n)` drives UI conditionals (shuffle button, hint button) in Plan 2.

## Risks tracked in this plan

| Risk | Mitigation |
|---|---|
| Generator can't find placement → infinite loop | MAX_REGEN_ATTEMPTS=25, then throw — Plan 2 must catch and surface "level temporarily unavailable" |
| Interestingness threshold too strict → frequent regen | Threshold = 0.55 per spec; tunable in `interestingness.ts` if observed regen rate >30% in Plan 6 audit |
| HE final-form folding wrong on edge graphemes | NFC normalize first, then map table. Native review during Plan 6 confirms |
| JA hiragana freq table is rough | Plan 6 native author replaces with corpus-derived values |
| Curated pack JSON drift from validator | `validateCuratedLevel` runs on every read; pack-author CLI in Plan 6 runs it pre-write |

---

**End Plan 1.**
