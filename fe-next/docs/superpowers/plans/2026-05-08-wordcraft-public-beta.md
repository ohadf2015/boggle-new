# WordCraft Public Beta Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move WordCraft from admin-only sandbox to email-gated public beta with 5-locale dictionaries, 13×13 mobile board, Heat Meter overdrive twist, PixiJS+GSAP effects, mode card, and achievements.

**Architecture:** Extend the existing `useWordCraftGame` reducer with heat state; add per-locale tile bags and a new dictionary loader (npm packages for EN/SV, API route for HE/ES/JA); new public route at `/[locale]/word-craft` gated by email whitelist; PixiJS overlay for overdrive/burnout particle effects, GSAP for DOM animations.

**Tech Stack:** Next.js App Router, PixiJS 8, GSAP 3.14, Vitest, TypeScript, Tailwind, existing `an-array-of-english-words` + `@arvidbt/swedish-words`

---

## Task 1: Types extension + beta access util

**Files:**
- Modify: `lib/word-craft/types.ts`
- Create: `lib/word-craft/betaAccess.ts`
- Create: `lib/word-craft/__tests__/betaAccess.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// lib/word-craft/__tests__/betaAccess.test.ts
import { describe, it, expect } from 'vitest'
import { isWordCraftBetaUser } from '../betaAccess'

describe('isWordCraftBetaUser', () => {
  it('returns true for whitelisted emails', () => {
    expect(isWordCraftBetaUser('ohadf2015@gmail.com')).toBe(true)
    expect(isWordCraftBetaUser('eden320@gmail.com')).toBe(true)
  })
  it('returns false for unknown email', () => {
    expect(isWordCraftBetaUser('other@example.com')).toBe(false)
  })
  it('returns false for undefined', () => {
    expect(isWordCraftBetaUser(undefined)).toBe(false)
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**
```bash
cd fe-next && npx vitest run lib/word-craft/__tests__/betaAccess.test.ts
```

- [ ] **Step 3: Create betaAccess.ts**

```ts
// lib/word-craft/betaAccess.ts
const BETA_EMAILS = ['ohadf2015@gmail.com', 'eden320@gmail.com'] as const

export function isWordCraftBetaUser(email: string | undefined): boolean {
  return !!email && (BETA_EMAILS as readonly string[]).includes(email)
}
```

- [ ] **Step 4: Extend types.ts** — add heat fields to `WordCraftState` (the interface lives in `useWordCraftGame.ts`, not `types.ts` — check the file and add to the `WordCraftState` interface there):

```ts
// Add these 4 fields to WordCraftState in useWordCraftGame.ts:
heat: number           // 0–100
overdrive: boolean
overdriveWarns: number // turns at 100 without playing (max 2 → burnout)
burnout: boolean       // true = auto-skip this player turn
```

Also add new actions to the `Action` union in `useWordCraftGame.ts`:

```ts
| { type: 'BURNOUT_SKIP' }
```

- [ ] **Step 5: Run tests — expect PASS**
```bash
npx vitest run lib/word-craft/__tests__/betaAccess.test.ts
```

- [ ] **Step 6: Commit**
```bash
git add lib/word-craft/betaAccess.ts lib/word-craft/__tests__/betaAccess.test.ts lib/word-craft/useWordCraftGame.ts
git commit -m "feat(wordcraft): beta access whitelist + heat state types"
```

---

## Task 2: Board size param — 13×13 layout

**Files:**
- Modify: `lib/word-craft/board.ts`
- Create: `lib/word-craft/__tests__/boardSize.test.ts`

- [ ] **Step 1: Read existing board.ts** to understand the premium layout encoding pattern before modifying.

- [ ] **Step 2: Write failing tests**

```ts
// lib/word-craft/__tests__/boardSize.test.ts
import { describe, it, expect } from 'vitest'
import { createBoard } from '../board'

describe('createBoard sizes', () => {
  it('creates 15x15 by default', () => {
    const b = createBoard()
    expect(b.cells.length).toBe(15)
    expect(b.cells[0].length).toBe(15)
  })
  it('creates 13x13 when size=13', () => {
    const b = createBoard(13)
    expect(b.cells.length).toBe(13)
    expect(b.cells[0].length).toBe(13)
  })
  it('13x13 center cell is CENTER', () => {
    const b = createBoard(13)
    expect(b.cells[6][6].kind).toBe('CENTER')
  })
  it('13x13 top-left corner is TW', () => {
    const b = createBoard(13)
    expect(b.cells[0][0].kind).toBe('TW')
  })
  it('13x13 has rotational symmetry: (0,3) === (12,9)', () => {
    const b = createBoard(13)
    expect(b.cells[0][3].kind).toBe(b.cells[12][9].kind)
  })
})
```

- [ ] **Step 3: Run — expect FAIL**
```bash
npx vitest run lib/word-craft/__tests__/boardSize.test.ts
```

- [ ] **Step 4: Add 13×13 layout to board.ts**

Add a second layout constant and make `createBoard` accept an optional size param. The 13×13 encoding (13 chars/row, same legend as existing 15×15):

```ts
// Add to board.ts alongside existing LAYOUT constant
const LAYOUT_13: readonly string[] = [
  '3..d..3..d..3', // row 0
  '.2..t..t..2..',  // row 1
  '..2..d.d..2..',  // row 2
  'd..2.....2..d',  // row 3
  '.t..2...2..t.',  // row 4
  '..d..t.t..d..',  // row 5
  '3.....*....3',   // row 6 — NOTE: 13 chars: 3=0,.=1,.=2,.=3,.=4,.=5,*=6,.=7,.=8,.=9,.=10,.=11,3=12
  '..d..t.t..d..',  // row 7
  '.t..2...2..t.',  // row 8
  'd..2.....2..d',  // row 9
  '..2..d.d..2..',  // row 10
  '.2..t..t..2..',  // row 11
  '3..d..3..d..3',  // row 12
]
```

Modify `createBoard` signature:
```ts
export function createBoard(size: 13 | 15 = 15): Board {
  const layout = size === 13 ? LAYOUT_13 : LAYOUT_15 // rename existing to LAYOUT_15
  // ... existing parsing logic, just use `layout` and `size`
}
```

- [ ] **Step 5: Run — expect PASS**
```bash
npx vitest run lib/word-craft/__tests__/boardSize.test.ts
```

- [ ] **Step 6: Commit**
```bash
git add lib/word-craft/board.ts lib/word-craft/__tests__/boardSize.test.ts
git commit -m "feat(wordcraft): 13x13 board layout for mobile"
```

---

## Task 3: Locale tile bags

**Files:**
- Create: `lib/word-craft/tileBags/en.ts`
- Create: `lib/word-craft/tileBags/sv.ts`
- Create: `lib/word-craft/tileBags/he.ts`
- Create: `lib/word-craft/tileBags/es.ts`
- Create: `lib/word-craft/tileBags/ja.ts`
- Modify: `lib/word-craft/tileBag.ts`
- Create: `lib/word-craft/__tests__/tileBags.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// lib/word-craft/__tests__/tileBags.test.ts
import { describe, it, expect } from 'vitest'
import { getTileBag } from '../tileBag'

describe('locale tile bags', () => {
  it('en bag total = 100', () => {
    const { distribution } = getTileBag('en')
    const total = Object.values(distribution).reduce((s, n) => s + n, 0)
    expect(total).toBe(100)
  })
  it('sv bag contains å', () => {
    const { distribution } = getTileBag('sv')
    expect(distribution['Å']).toBeGreaterThan(0)
  })
  it('he bag contains alef (א)', () => {
    const { distribution } = getTileBag('he')
    expect(distribution['א']).toBeGreaterThan(0)
  })
  it('es bag contains ñ', () => {
    const { distribution } = getTileBag('es')
    expect(distribution['Ñ']).toBeGreaterThan(0)
  })
  it('ja bag contains あ', () => {
    const { distribution } = getTileBag('ja')
    expect(distribution['あ']).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run — expect FAIL**
```bash
npx vitest run lib/word-craft/__tests__/tileBags.test.ts
```

- [ ] **Step 3: Create en.ts** (extract from existing tileBag.ts)

```ts
// lib/word-craft/tileBags/en.ts
export const values: Record<string, number> = {
  A:1,B:3,C:3,D:2,E:1,F:4,G:2,H:4,I:1,J:8,K:5,L:1,M:3,N:1,O:1,P:3,Q:10,R:1,S:1,T:1,U:1,V:4,W:4,X:8,Y:4,Z:10,'_':0,
}
export const distribution: Record<string, number> = {
  A:9,B:2,C:2,D:4,E:12,F:2,G:3,H:2,I:9,J:1,K:1,L:4,M:2,N:6,O:8,P:2,Q:1,R:6,S:4,T:6,U:4,V:2,W:2,X:1,Y:2,Z:1,'_':2,
}
```

- [ ] **Step 4: Create sv.ts**

```ts
// lib/word-craft/tileBags/sv.ts
export const values: Record<string, number> = {
  A:1,B:3,C:8,D:1,E:1,F:3,G:2,H:2,I:1,J:7,K:2,L:1,M:2,N:1,O:2,P:4,R:1,S:1,T:1,U:3,V:3,X:8,Y:7,Z:10,
  'Å':4,'Ä':3,'Ö':4,'_':0,
}
export const distribution: Record<string, number> = {
  A:8,B:2,C:1,D:5,E:7,F:2,G:3,H:2,I:5,J:1,K:3,L:5,M:3,N:6,O:5,P:2,R:8,S:8,T:8,U:3,V:2,X:1,Y:1,Z:1,
  'Å':2,'Ä':2,'Ö':2,'_':2,
}
```

- [ ] **Step 5: Create he.ts** (Hebrew Aleph-Bet, 100 tiles)

```ts
// lib/word-craft/tileBags/he.ts
// Standard Israeli Scrabble-style distribution
export const values: Record<string, number> = {
  'א':1,'ב':3,'ג':4,'ד':3,'ה':2,'ו':1,'ז':6,'ח':4,'ט':6,'י':1,
  'כ':4,'ך':4,'ל':2,'מ':2,'ם':2,'נ':3,'ן':3,'ס':5,'ע':2,'פ':5,
  'ף':5,'צ':6,'ץ':6,'ק':6,'ר':2,'ש':2,'ת':2,'_':0,
}
export const distribution: Record<string, number> = {
  'א':6,'ב':4,'ג':2,'ד':3,'ה':6,'ו':10,'ז':2,'ח':2,'ט':1,'י':10,
  'כ':2,'ך':2,'ל':6,'מ':3,'ם':2,'נ':3,'ן':2,'ס':2,'ע':4,'פ':2,
  'ף':1,'צ':2,'ץ':1,'ק':2,'ר':6,'ש':5,'ת':5,'_':2,
}
```

- [ ] **Step 6: Create es.ts**

```ts
// lib/word-craft/tileBags/es.ts
export const values: Record<string, number> = {
  A:1,B:3,C:3,D:2,E:1,F:4,G:2,H:4,I:1,J:8,L:1,M:3,N:1,'Ñ':8,O:1,P:3,Q:5,R:1,S:1,T:1,U:1,V:4,X:8,Y:4,Z:10,'_':0,
}
export const distribution: Record<string, number> = {
  A:12,B:2,C:4,D:5,E:12,F:1,G:2,H:2,I:6,J:1,L:4,M:2,N:5,'Ñ':1,O:9,P:2,Q:1,R:5,S:6,T:4,U:5,V:1,X:1,Y:1,Z:1,'_':2,
}
```

- [ ] **Step 7: Create ja.ts** (46 basic hiragana, frequency-based)

```ts
// lib/word-craft/tileBags/ja.ts
// Hiragana tiles weighted by Japanese text frequency
export const values: Record<string, number> = {
  'あ':1,'い':1,'う':1,'え':2,'お':1,
  'か':2,'き':2,'く':2,'け':3,'こ':1,
  'さ':2,'し':1,'す':2,'せ':3,'そ':3,
  'た':2,'ち':3,'つ':2,'て':1,'と':1,
  'な':2,'に':1,'ぬ':5,'ね':4,'の':1,
  'は':1,'ひ':3,'ふ':4,'へ':3,'ほ':4,
  'ま':2,'み':3,'む':4,'め':4,'も':1,
  'や':3,'ゆ':4,'よ':2,
  'ら':3,'り':2,'る':1,'れ':3,'ろ':4,
  'わ':4,'を':3,'ん':1,'_':0,
}
export const distribution: Record<string, number> = {
  'あ':5,'い':6,'う':5,'え':3,'お':5,
  'か':4,'き':3,'く':4,'け':2,'こ':4,
  'さ':3,'し':5,'す':3,'せ':2,'そ':2,
  'た':4,'ち':2,'つ':3,'て':5,'と':5,
  'な':3,'に':5,'ぬ':1,'ね':1,'の':6,
  'は':3,'ひ':1,'ふ':1,'へ':1,'ほ':1,
  'ま':2,'み':2,'む':1,'め':1,'も':3,
  'や':2,'ゆ':1,'よ':2,
  'ら':2,'り':3,'る':4,'れ':2,'ろ':1,
  'わ':1,'を':1,'ん':4,'_':2,
}
```

- [ ] **Step 8: Add `getTileBag` to tileBag.ts**

```ts
// Add to lib/word-craft/tileBag.ts (keep existing ENGLISH_TILE_VALUES/DISTRIBUTION for backward compat)
import * as en from './tileBags/en'
import * as sv from './tileBags/sv'
import * as he from './tileBags/he'
import * as es from './tileBags/es'
import * as ja from './tileBags/ja'

export type SupportedLocale = 'en' | 'sv' | 'he' | 'es' | 'ja'

const BAGS: Record<SupportedLocale, { values: Record<string,number>; distribution: Record<string,number> }> = {
  en, sv, he, es, ja,
}

export function getTileBag(locale: SupportedLocale) {
  return BAGS[locale] ?? BAGS['en']
}

// Update createBag to accept locale:
export function createBag(options: CreateBagOptions & { locale?: SupportedLocale }): TileBag {
  const { values: tileValues, distribution } = getTileBag(options.locale ?? 'en')
  const rng = mulberry32(options.seed)
  const tiles: RackTile[] = []
  let nextId = 0
  for (const [letter, count] of Object.entries(distribution)) {
    for (let i = 0; i < count; i++) {
      tiles.push({ id: `t-${nextId++}`, letter, value: tileValues[letter] ?? 0, isBlank: letter === '_' })
    }
  }
  shuffleInPlace(tiles, rng)
  return { tiles, rng, nextId }
}
```

- [ ] **Step 9: Run tests — expect PASS**
```bash
npx vitest run lib/word-craft/__tests__/tileBags.test.ts
```

- [ ] **Step 10: Commit**
```bash
git add lib/word-craft/tileBags/ lib/word-craft/tileBag.ts lib/word-craft/__tests__/tileBags.test.ts
git commit -m "feat(wordcraft): locale tile bags — EN/SV/HE/ES/JA"
```

---

## Task 4: Dictionary loader + wordlist API route

**Files:**
- Create: `lib/word-craft/dictionary.ts`
- Create: `app/api/word-craft/wordlist/route.ts`
- Create: `lib/word-craft/__tests__/dictionary.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// lib/word-craft/__tests__/dictionary.test.ts
import { describe, it, expect } from 'vitest'
import { isValidWord } from '../dictionary'

describe('isValidWord', () => {
  it('returns true for word in set', () => {
    const dict = new Set(['HELLO', 'WORLD'])
    expect(isValidWord('hello', dict)).toBe(true)
    expect(isValidWord('HELLO', dict)).toBe(true)
  })
  it('returns false for missing word', () => {
    const dict = new Set(['HELLO'])
    expect(isValidWord('xyz', dict)).toBe(false)
  })
  it('returns false for null dict', () => {
    expect(isValidWord('hello', null)).toBe(false)
  })
})
```

- [ ] **Step 2: Run — expect FAIL**
```bash
npx vitest run lib/word-craft/__tests__/dictionary.test.ts
```

- [ ] **Step 3: Create dictionary.ts**

```ts
// lib/word-craft/dictionary.ts
import type { SupportedLocale } from './tileBag'

export function isValidWord(word: string, dict: Set<string> | null): boolean {
  if (!dict) return false
  return dict.has(word.toUpperCase()) || dict.has(word.toLowerCase())
}

export async function loadWordCraftDictionary(locale: SupportedLocale): Promise<Set<string>> {
  if (locale === 'en') {
    const mod = await import('an-array-of-english-words')
    const list = (mod.default ?? mod) as string[]
    return new Set(list.map((w) => w.toUpperCase()))
  }
  if (locale === 'sv') {
    const mod = await import('@arvidbt/swedish-words')
    const list = (mod.default ?? mod) as string[]
    return new Set(list.map((w) => w.toUpperCase()))
  }
  // HE / ES / JA: fetch from server
  const resp = await fetch(`/api/word-craft/wordlist?locale=${locale}`)
  if (!resp.ok) return new Set()
  const words = (await resp.json()) as string[]
  return new Set(words.map((w) => w.toUpperCase()))
}
```

- [ ] **Step 4: Create the wordlist API route**

```ts
// app/api/word-craft/wordlist/route.ts
import { NextRequest, NextResponse } from 'next/server'

// Cache word lists in module scope (survives warm Lambda invocations)
const cache = new Map<string, string[]>()

async function getWords(locale: string): Promise<string[]> {
  if (cache.has(locale)) return cache.get(locale)!

  if (locale === 'he') {
    // Check app/api/dictionary for existing Hebrew loader — adapt if found.
    // Fallback: return a curated starter list.
    const words = await loadHebrewWords()
    cache.set('he', words)
    return words
  }
  if (locale === 'es') {
    const words = await loadSpanishWords()
    cache.set('es', words)
    return words
  }
  if (locale === 'ja') {
    const words = await loadJapaneseWords()
    cache.set('ja', words)
    return words
  }
  return []
}

async function loadHebrewWords(): Promise<string[]> {
  // IMPLEMENTATION NOTE: Check app/api/dictionary/ for existing Hebrew dictionary
  // loader (look for Milog/approved.txt references). If found, import and use it.
  // If not, this returns a minimal curated list sufficient for beta testing.
  return ['שלום','בית','ספר','מים','אור','יום','לילה','ילד','אמא','אבא','כלב','חתול','עץ','פרח','שיר']
}

async function loadSpanishWords(): Promise<string[]> {
  // IMPLEMENTATION NOTE: Check app/api/dictionary/ for existing ES verifier Set.
  // If found, convert to array. Otherwise use curated starter list for beta.
  return ['hola','casa','libro','agua','sol','luna','perro','gato','mesa','silla','amor','ciudad','tiempo','mundo','vida']
}

async function loadJapaneseWords(): Promise<string[]> {
  // Hiragana words for JMdict-style validation.
  // IMPLEMENTATION NOTE: Check app/api/dictionary/ for JMdict/jisho loader.
  return ['あおい','いえ','うみ','えき','おか','かお','きし','くに','けむり','こえ']
}

export async function GET(req: NextRequest) {
  const locale = req.nextUrl.searchParams.get('locale') ?? ''
  if (!['he','es','ja'].includes(locale)) {
    return NextResponse.json({ error: 'unsupported locale' }, { status: 400 })
  }
  const words = await getWords(locale)
  return NextResponse.json(words, {
    headers: { 'Cache-Control': 'public, max-age=3600' },
  })
}
```

- [ ] **Step 5: Run dictionary tests — expect PASS**
```bash
npx vitest run lib/word-craft/__tests__/dictionary.test.ts
```

- [ ] **Step 6: Commit**
```bash
git add lib/word-craft/dictionary.ts lib/word-craft/__tests__/dictionary.test.ts app/api/word-craft/wordlist/route.ts
git commit -m "feat(wordcraft): per-locale dictionary loader + wordlist API"
```

---

## Task 5: Heat Meter state in reducer

**Files:**
- Modify: `lib/word-craft/useWordCraftGame.ts`
- Create: `lib/word-craft/__tests__/heat.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// lib/word-craft/__tests__/heat.test.ts
import { describe, it, expect } from 'vitest'
// We'll test the reducer directly by importing it.
// Since it's not currently exported, we'll export it in Step 3.
import { wordCraftReducer, buildInitialState } from '../useWordCraftGame'

describe('heat meter', () => {
  it('heat starts at 0', () => {
    const state = buildInitialState(1)
    expect(state.heat).toBe(0)
    expect(state.overdrive).toBe(false)
    expect(state.burnout).toBe(false)
  })

  it('heat increases after player commits a word', () => {
    const state = buildInitialState(1)
    const next = wordCraftReducer(state, {
      type: 'COMMIT_PLAYER', placements: [], score: 50, words: ['TEST'],
    })
    // heatGain = min(floor(50/5), 25) = 10
    expect(next.heat).toBe(10)
  })

  it('overdrive activates when heat reaches 100', () => {
    const state = { ...buildInitialState(1), heat: 95 }
    const next = wordCraftReducer(state, {
      type: 'COMMIT_PLAYER', placements: [], score: 50, words: ['TEST'],
    })
    expect(next.overdrive).toBe(true)
  })

  it('heat resets to 60 and overdrive clears after cashing overdrive', () => {
    const state = { ...buildInitialState(1), heat: 100, overdrive: true }
    const next = wordCraftReducer(state, {
      type: 'COMMIT_PLAYER', placements: [], score: 30, words: ['TEST'],
    })
    expect(next.overdrive).toBe(false)
    expect(next.heat).toBe(60)
  })

  it('overdriveWarns increments on PASS while overdrive active', () => {
    const state = { ...buildInitialState(1), heat: 100, overdrive: true, overdriveWarns: 0 }
    const next = wordCraftReducer(state, { type: 'PASS' })
    expect(next.overdriveWarns).toBe(1)
  })

  it('burnout triggers on second PASS while overdrive active', () => {
    const state = { ...buildInitialState(1), heat: 100, overdrive: true, overdriveWarns: 1 }
    const next = wordCraftReducer(state, { type: 'PASS' })
    expect(next.burnout).toBe(true)
  })

  it('BURNOUT_SKIP resets heat to 40 and switches turn to bot', () => {
    const state = { ...buildInitialState(1), burnout: true, heat: 100, overdrive: true, overdriveWarns: 2, turn: 'player' as const }
    const next = wordCraftReducer(state, { type: 'BURNOUT_SKIP' })
    expect(next.burnout).toBe(false)
    expect(next.heat).toBe(40)
    expect(next.overdrive).toBe(false)
    expect(next.turn).toBe('bot')
  })
})
```

- [ ] **Step 2: Run — expect FAIL**
```bash
npx vitest run lib/word-craft/__tests__/heat.test.ts
```

- [ ] **Step 3: Modify useWordCraftGame.ts**

Export `wordCraftReducer` and `buildInitialState` for testability. Add heat fields to `WordCraftState`. Update `buildInitial`, `commitMove`, reducer cases:

```ts
// In WordCraftState interface, add:
heat: number
overdrive: boolean
overdriveWarns: number
burnout: boolean

// In buildInitial():
heat: 0,
overdrive: false,
overdriveWarns: 0,
burnout: false,

// In commitMove(), after computing 'next':
// When player commits, compute heat gain:
// (This is called for both player and bot — only update heat for player moves)
```

Add heat logic to `COMMIT_PLAYER` case in reducer:

```ts
case 'COMMIT_PLAYER': {
  const base = commitMove(state, 'player', action.placements, action.score, action.words)
  const heatGain = Math.min(Math.floor(action.score / 5), 25)
  const waOverdrive = state.overdrive
  const newHeat = waOverdrive ? 60 : Math.min(state.heat + heatGain, 100)
  const newOverdrive = !waOverdrive && newHeat >= 100
  return {
    ...base,
    heat: newHeat,
    overdrive: newOverdrive,
    overdriveWarns: waOverdrive ? 0 : state.overdriveWarns,
    burnout: false,
  }
}
```

Update `PASS` case:

```ts
case 'PASS': {
  const passes = state.consecutivePasses + 1
  const turn: Turn = passes >= 2 ? 'over' : state.turn === 'player' ? 'bot' : 'player'
  // Overdrive warn logic
  const newWarns = state.overdrive ? state.overdriveWarns + 1 : state.overdriveWarns
  const burnout = state.overdrive && newWarns >= 2
  return {
    ...state,
    pendingPlacements: [],
    selectedRackTileId: null,
    consecutivePasses: passes,
    turn,
    overdriveWarns: newWarns,
    burnout,
    history: [...state.history, { who: state.turn === 'player' ? 'player' : 'bot', words: [], score: 0, placedTileIds: [] }],
  }
}
```

Add `BURNOUT_SKIP` case:

```ts
case 'BURNOUT_SKIP':
  return {
    ...state,
    burnout: false,
    heat: 40,
    overdrive: false,
    overdriveWarns: 0,
    turn: 'bot',
  }
```

Export reducer and buildInitial for tests:
```ts
export { reducer as wordCraftReducer, buildInitial as buildInitialState }
```

Update `UseWordCraftGameOptions` to include `locale` and `boardSize`:
```ts
export interface UseWordCraftGameOptions {
  seed?: number
  dict: Set<string> | null
  locale?: SupportedLocale
  boardSize?: 13 | 15
}
```

Pass `boardSize` to `buildInitial` → `createBoard(boardSize ?? 15)`.
Pass `locale` to `createBag({ seed, locale })`.

- [ ] **Step 4: Run — expect PASS**
```bash
npx vitest run lib/word-craft/__tests__/heat.test.ts
```

- [ ] **Step 5: Run all word-craft tests**
```bash
npx vitest run lib/word-craft/__tests__/
```

- [ ] **Step 6: Commit**
```bash
git add lib/word-craft/useWordCraftGame.ts lib/word-craft/__tests__/heat.test.ts
git commit -m "feat(wordcraft): heat meter / overdrive / burnout state in reducer"
```

---

## Task 6: HeatMeter UI component (GSAP)

**Files:**
- Create: `components/word-craft/HeatMeter.tsx`

No separate unit test (visual component — tested via PageClient integration).

- [ ] **Step 1: Create HeatMeter.tsx**

```tsx
// components/word-craft/HeatMeter.tsx
'use client'

import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { cn } from '@/lib/utils'

interface HeatMeterProps {
  heat: number          // 0–100
  overdrive: boolean
  burnout: boolean
  label: string         // i18n: t('wordcraft.heatLabel')
}

export function HeatMeter({ heat, overdrive, burnout, label }: HeatMeterProps) {
  const fillRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const pulseRef = useRef<gsap.core.Tween | null>(null)

  useEffect(() => {
    if (!fillRef.current) return
    const color =
      heat >= 100 ? '#FFE135'   // gold overdrive
      : heat >= 85 ? '#FF3333'  // red danger
      : heat >= 60 ? '#FF6B35'  // orange warning
      : '#BFFF00'               // lime normal

    gsap.to(fillRef.current, {
      width: `${heat}%`,
      backgroundColor: color,
      duration: 0.4,
      ease: 'power2.out',
    })

    // Pulse when overdrive active
    if (overdrive && !pulseRef.current) {
      pulseRef.current = gsap.to(fillRef.current, {
        scaleY: 1.1,
        yoyo: true,
        repeat: -1,
        duration: 0.45,
        ease: 'sine.inOut',
      })
    } else if (!overdrive && pulseRef.current) {
      pulseRef.current.kill()
      pulseRef.current = null
      gsap.set(fillRef.current, { scaleY: 1 })
    }
  }, [heat, overdrive])

  // Shake on burnout
  useEffect(() => {
    if (!burnout || !containerRef.current) return
    gsap.to(containerRef.current, {
      x: [-5, 5, -5, 5, 0],
      duration: 0.3,
      ease: 'power2.out',
    })
  }, [burnout])

  return (
    <div ref={containerRef} className="w-full" aria-label={`${label}: ${heat}%`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-neo-display uppercase tracking-widest text-neo-white/60">
          {label}
        </span>
        {overdrive && (
          <span className="text-[10px] font-neo-display font-black text-neo-yellow animate-pulse uppercase">
            OVERDRIVE!
          </span>
        )}
        {burnout && (
          <span className="text-[10px] font-neo-display font-black text-neo-red uppercase">
            BURNED OUT
          </span>
        )}
      </div>
      <div className="relative h-3 bg-neo-navy-light border-2 border-black rounded-sm overflow-hidden">
        <div
          ref={fillRef}
          className={cn(
            'absolute left-0 top-0 h-full rounded-sm origin-left',
            overdrive && 'shadow-[0_0_8px_rgba(255,225,53,0.8)]',
          )}
          style={{ width: `${heat}%`, backgroundColor: '#BFFF00' }}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**
```bash
git add components/word-craft/HeatMeter.tsx
git commit -m "feat(wordcraft): HeatMeter component with GSAP animations"
```

---

## Task 7: ScoreFloat + Encouragement (GSAP)

**Files:**
- Create: `components/word-craft/ScoreFloat.tsx`

- [ ] **Step 1: Create ScoreFloat.tsx**

```tsx
// components/word-craft/ScoreFloat.tsx
'use client'

import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'

interface ScoreFloatProps {
  score: number
  overdrive: boolean
  isBingo: boolean
  encouragement: string   // random phrase from t('wordcraft.encouragement.N')
  // Trigger re-fire by changing key prop on parent
}

export function ScoreFloat({ score, overdrive, isBingo, encouragement }: ScoreFloatProps) {
  const scoreRef = useRef<HTMLDivElement>(null)
  const encRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!scoreRef.current) return
    gsap.fromTo(
      scoreRef.current,
      { y: 0, opacity: 1 },
      { y: -50, opacity: 0, duration: 0.9, ease: 'power1.out' },
    )
  }, [])

  useEffect(() => {
    if (!encRef.current) return
    gsap.fromTo(
      encRef.current,
      { y: 0, opacity: 1 },
      { y: -35, opacity: 0, duration: 1.2, delay: 0.15, ease: 'power1.out' },
    )
  }, [])

  const scoreColor = isBingo ? '#FFE135' : overdrive ? '#BFFF00' : '#FFFFFF'

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center" aria-hidden>
      <div
        ref={scoreRef}
        className="font-neo-display font-black text-3xl drop-shadow-[2px_2px_0_#000]"
        style={{ color: scoreColor }}
      >
        +{score}
      </div>
      {encouragement && (
        <div
          ref={encRef}
          className="font-neo-body text-sm text-neo-white drop-shadow-[1px_1px_0_#000] mt-1"
        >
          {encouragement}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**
```bash
git add components/word-craft/ScoreFloat.tsx
git commit -m "feat(wordcraft): ScoreFloat GSAP float-up with encouragement"
```

---

## Task 8: WordCraftEffects — PixiJS overdrive/burnout

**Files:**
- Modify: `components/word-craft/WordCraftCelebration.tsx`

- [ ] **Step 1: Extend `CelebrationKind`**

Change the type at the top of `WordCraftCelebration.tsx`:

```ts
// Was:
export type CelebrationKind = 'bingo' | 'gameOver' | null

// Becomes:
export type CelebrationKind = 'bingo' | 'gameOver' | 'overdrive' | 'burnout' | null
```

- [ ] **Step 2: Add overdrive effect to `spawnBurst` call in the `tryFire` useEffect**

Find the `if (kind === 'bingo')` block and add after `gameOver` case:

```ts
} else if (kind === 'overdrive') {
  // 120 lime sparks burst from bottom-center (where heat meter sits)
  const x = origin?.x ?? api.width() / 2
  const y = origin?.y ?? api.height() * 0.85
  api.spawnBurst(x, y, 120)
} else if (kind === 'burnout') {
  // 30 red sparks + brief inward implosion feel (spawn near center)
  api.spawnBurst(api.width() / 2, api.height() / 2, 30)
}
```

- [ ] **Step 3: Add a lime color tint to overdrive bursts**

The existing `spawnBurst` uses `TILE_TINTS` randomly. Add a dedicated overdrive spawn that forces lime tint:

```ts
// Add apiRef method: spawnOverdriveBurst
apiRef.current.spawnOverdriveBurst = (x: number, y: number) => {
  for (let i = 0; i < 120; i++) {
    const angle = Math.random() * Math.PI * 2
    const speed = 4 + Math.random() * 8
    const particle = new PIXI.Particle({
      texture: tileTexture,
      x, y,
      tint: 0xbfff00,  // always lime for overdrive
      scaleX: 0.7 + Math.random() * 0.5,
      scaleY: 0.7 + Math.random() * 0.5,
      rotation: Math.random() * Math.PI * 2,
      alpha: 1,
    })
    particles.addParticle(particle)
    tiles.push({
      particle,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 3,
      vr: (Math.random() - 0.5) * 0.2,
      life: 1,
      maxLife: 1.2 + Math.random() * 0.5,
    })
  }
}
```

Update the `apiRef` type to include `spawnOverdriveBurst`:
```ts
spawnOverdriveBurst: ((x: number, y: number) => void) | null;
```
Initialize to `null` alongside other refs.

Update `tryFire` to use it:
```ts
} else if (kind === 'overdrive') {
  const x = origin?.x ?? api.width() / 2
  const y = origin?.y ?? api.height() * 0.85
  api.spawnOverdriveBurst?.(x, y)
```

- [ ] **Step 4: Commit**
```bash
git add components/word-craft/WordCraftCelebration.tsx
git commit -m "feat(wordcraft): PixiJS overdrive lime burst + burnout effects"
```

---

## Task 9: Translations — all 5 locales

**Files:**
- Modify: `translations/en.js` + `translations/he.js` + `translations/sv.js` + `translations/ja.js` + `translations/es.js`

- [ ] **Step 1: Add keys to en.js** — merge into existing `wordcraft` object:

```js
// Add to the existing wordcraft:{} object in translations/en.js:
modeTitle: 'WordCraft',
modeDesc: 'Tile-placement word strategy. Build words on the board, rack up heat, unleash OVERDRIVE.',
betaLocked: 'Beta access required',
overdrive: 'OVERDRIVE!',
burnout: 'BURNED OUT!',
heatLabel: 'Heat',
encouragement: {
  0: 'Nice word!',
  1: 'Beautiful!',
  2: 'Unstoppable!',
  3: 'Sizzling!',
  4: 'On fire!',
  5: 'Magnificent!',
  6: 'Brilliant!',
  7: 'Keep it up!',
},
```

- [ ] **Step 2: Add keys to he.js** (LLM-generated — flag for native review):

```js
modeTitle: 'וורדקראפט',
modeDesc: 'משחק אסטרטגיית מילים. בנה מילים על הלוח, צבור חום, שחרר אוברדרייב.',
betaLocked: 'נדרשת גישת בטא',
overdrive: 'אוברדרייב!',
burnout: 'נשרפת!',
heatLabel: 'חום',
encouragement: { 0:'מילה יפה!',1:'מדהים!',2:'עצור!',3:'בוער!',4:'אש!',5:'מרהיב!',6:'נהדר!',7:'המשך!' },
```

- [ ] **Step 3: Add keys to sv.js** (LLM-generated):

```js
modeTitle: 'WordCraft',
modeDesc: 'Strategiskt ordbrettspel. Bygg ord på brädet, samla värme, utlösa OVERDRIVE.',
betaLocked: 'Betatillgång krävs',
overdrive: 'OVERDRIVE!',
burnout: 'UTBRÄND!',
heatLabel: 'Värme',
encouragement: { 0:'Fint ord!',1:'Fantastiskt!',2:'Ostoppbar!',3:'Glödande!',4:'I brand!',5:'Magnifikt!',6:'Briljant!',7:'Fortsätt!' },
```

- [ ] **Step 4: Add keys to ja.js** (LLM-generated):

```js
modeTitle: 'ワードクラフト',
modeDesc: 'タイル配置の言葉ゲーム。ボードに言葉を作り、熱を蓄え、オーバードライブを解放。',
betaLocked: 'ベータアクセスが必要',
overdrive: 'オーバードライブ!',
burnout: 'バーンアウト!',
heatLabel: '熱',
encouragement: { 0:'良い言葉!',1:'素晴らしい!',2:'止まらない!',3:'熱い!',4:'燃えている!',5:'見事!',6:'素敵!',7:'続けて!' },
```

- [ ] **Step 5: Add keys to es.js** (LLM-generated):

```js
modeTitle: 'WordCraft',
modeDesc: 'Estrategia de palabras con fichas. Construye palabras en el tablero, acumula calor, desata el OVERDRIVE.',
betaLocked: 'Acceso beta requerido',
overdrive: '¡OVERDRIVE!',
burnout: '¡AGOTADO!',
heatLabel: 'Calor',
encouragement: { 0:'¡Buena palabra!',1:'¡Hermoso!',2:'¡Imparable!',3:'¡En llamas!',4:'¡Ardiente!',5:'¡Magnífico!',6:'¡Brillante!',7:'¡Sigue así!' },
```

- [ ] **Step 6: Commit**
```bash
git add translations/
git commit -m "feat(wordcraft): 5-locale translations for public beta UI"
```

---

## Task 10: Public PageClient

**Files:**
- Create: `app/[locale]/word-craft/PageClient.tsx`

This adapts the admin `PageClient.tsx` with: email gate, locale-aware dictionary loading, board size detection, HeatMeter, ScoreFloat, overdrive/burnout effects, and achievements.

- [ ] **Step 1: Create PageClient.tsx**

```tsx
// app/[locale]/word-craft/PageClient.tsx
'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Layers } from 'lucide-react'
import Header from '@/components/Header'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/contexts/AuthContext'
import { PageLoader } from '@/components/ui/PageLoader'
import { useWordCraftGame } from '@/lib/word-craft/useWordCraftGame'
import { loadWordCraftDictionary } from '@/lib/word-craft/dictionary'
import { isWordCraftBetaUser } from '@/lib/word-craft/betaAccess'
import { WordCraftBoard } from '@/components/word-craft/WordCraftBoard'
import { WordCraftRack } from '@/components/word-craft/WordCraftRack'
import { WordCraftScoreboard } from '@/components/word-craft/WordCraftScoreboard'
import { WordCraftControls } from '@/components/word-craft/WordCraftControls'
import { WordCraftCelebration, type CelebrationKind } from '@/components/word-craft/WordCraftCelebration'
import { HeatMeter } from '@/components/word-craft/HeatMeter'
import { ScoreFloat } from '@/components/word-craft/ScoreFloat'
import { useWordCraftJuice } from '@/components/word-craft/useWordCraftJuice'
import { cn } from '@/lib/utils'
import type { SupportedLocale } from '@/lib/word-craft/tileBag'

const LOCALE_MAP: Record<string, SupportedLocale> = {
  en: 'en', sv: 'sv', he: 'he', es: 'es', ja: 'ja',
}
const ENCOURAGEMENTS_COUNT = 8

export default function WordCraftPageClient() {
  const router = useRouter()
  const { t, language } = useLanguage()
  const { user, profile, loading: authLoading } = useAuth()
  const isRTL = language === 'he'
  const locale: SupportedLocale = LOCALE_MAP[language] ?? 'en'

  const isBetaUser = isWordCraftBetaUser(profile?.email ?? undefined)

  const [dict, setDict] = useState<Set<string> | null>(null)
  const boardSize: 13 | 15 = typeof window !== 'undefined' && window.innerWidth < 768 ? 13 : 15

  const seed = useMemo(() => {
    if (typeof window === 'undefined') return 1
    const fromUrl = new URLSearchParams(window.location.search).get('seed')
    return fromUrl ? Number(fromUrl) : Math.floor(Math.random() * 1_000_000)
  }, [])

  useEffect(() => {
    if (!isBetaUser) return
    let cancelled = false
    loadWordCraftDictionary(locale).then((d) => {
      if (!cancelled) setDict(d)
    })
    return () => { cancelled = true }
  }, [isBetaUser, locale])

  const game = useWordCraftGame({ seed, dict, locale, boardSize })
  const juice = useWordCraftJuice()

  // Gate: redirect non-beta users
  useEffect(() => {
    if (!authLoading && !isBetaUser) {
      router.replace(`/${language}`)
    }
  }, [authLoading, isBetaUser, language, router])

  // Burnout auto-skip
  useEffect(() => {
    if (!game.state.burnout || game.state.turn !== 'player') return
    const t = setTimeout(() => game.burnoutSkip?.(), 1500)
    return () => clearTimeout(t)
  }, [game.state.burnout, game.state.turn, game])

  const [celebration, setCelebration] = useState<{ kind: CelebrationKind; burstId: number; origin?: { x: number; y: number } }>({ kind: null, burstId: 0 })
  const [scoreFloat, setScoreFloat] = useState<{ score: number; overdrive: boolean; isBingo: boolean; encouragement: string; key: number } | null>(null)
  const heatMeterRef = useRef<HTMLDivElement>(null)

  // Tile-place juice (same as admin version)
  const prevPendingIdsRef = useRef<Set<string>>(new Set())
  useEffect(() => {
    const next = new Set(game.state.pendingPlacements.map((p) => p.rackTileId))
    for (const p of game.state.pendingPlacements) {
      if (!prevPendingIdsRef.current.has(p.rackTileId)) {
        const el = document.querySelector(`[data-tile-id="${p.rackTileId}"]`)
        juice.tilePlace(el)
      }
    }
    prevPendingIdsRef.current = next
  }, [game.state.pendingPlacements, juice])

  const prevSelectedRef = useRef<string | null>(null)
  useEffect(() => {
    const id = game.state.selectedRackTileId
    if (id && id !== prevSelectedRef.current) {
      const el = document.querySelector(`[data-rack-tile-id="${id}"]`)
      juice.rackSelect(el)
    }
    prevSelectedRef.current = id
  }, [game.state.selectedRackTileId, juice])

  // History-driven effects (score float, celebrations, overdrive burst)
  const prevHistoryLenRef = useRef(0)
  useEffect(() => {
    const len = game.state.history.length
    if (len === prevHistoryLenRef.current) return
    const newest = game.state.history[len - 1]
    prevHistoryLenRef.current = len
    if (!newest || newest.score === 0) return

    const encIdx = Math.floor(Math.random() * ENCOURAGEMENTS_COUNT)
    const isBingo = newest.placedTileIds.length >= 7
    const wasOverdrive = game.state.overdrive  // after commit, state updated — check prev turn
    setScoreFloat({ score: newest.score, overdrive: wasOverdrive, isBingo, encouragement: t(`wordcraft.encouragement.${encIdx}`), key: len })

    if (isBingo) {
      const placedEls = newest.placedTileIds.map((id) => document.querySelector(`[data-tile-id="${id}"]`)).filter(Boolean)
      const midEl = placedEls[Math.floor(placedEls.length / 2)] as HTMLElement | undefined
      const rect = midEl?.getBoundingClientRect()
      setCelebration((prev) => ({ kind: 'bingo', burstId: prev.burstId + 1, origin: rect ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : undefined }))
    }

    const botEls = newest.who === 'bot'
      ? newest.placedTileIds.map((id) => document.querySelector(`[data-tile-id="${id}"]`)).filter((n): n is Element => Boolean(n))
      : []
    if (botEls.length > 0) juice.botReveal(botEls)
  }, [game.state.history, game.state.overdrive, juice, t])

  // Overdrive activate effect
  const prevOverdriveRef = useRef(false)
  useEffect(() => {
    if (game.state.overdrive && !prevOverdriveRef.current) {
      const rect = heatMeterRef.current?.getBoundingClientRect()
      setCelebration((prev) => ({ kind: 'overdrive', burstId: prev.burstId + 1, origin: rect ? { x: rect.left + rect.width / 2, y: rect.top } : undefined }))
    }
    prevOverdriveRef.current = game.state.overdrive
  }, [game.state.overdrive])

  // Burnout effect
  useEffect(() => {
    if (game.state.burnout) {
      setCelebration((prev) => ({ kind: 'burnout', burstId: prev.burstId + 1 }))
    }
  }, [game.state.burnout])

  // Game over
  useEffect(() => {
    if (game.state.turn === 'over') {
      setCelebration((prev) => ({ kind: 'gameOver', burstId: prev.burstId + 1 }))
    }
  }, [game.state.turn])

  // Error shake
  const lastErrorRef = useRef<string | null>(null)
  useEffect(() => {
    const e = game.state.lastError
    if (!e || e === lastErrorRef.current) { lastErrorRef.current = e; return }
    lastErrorRef.current = e
    const cellEls = game.state.pendingPlacements
      .map((p) => document.querySelector(`[data-tile-id="${p.rackTileId}"]`))
      .filter((n): n is Element => Boolean(n))
    juice.invalidShake(cellEls)
  }, [game.state.lastError, game.state.pendingPlacements, juice])

  if (authLoading) return <div className="flex-1 bg-neo-navy flex items-center justify-center"><PageLoader size="lg" /></div>
  if (!isBetaUser) return null  // redirect fires via useEffect

  const pendingIds = new Set(game.state.pendingPlacements.map((p) => p.rackTileId))
  const winner = game.state.player.score > game.state.bot.score
    ? t('wordcraft.you')
    : game.state.bot.score > game.state.player.score
    ? t('wordcraft.bot')
    : t('wordcraft.tied')

  const errorMessage = (() => {
    const e = game.state.lastError
    if (!e) return null
    if (e === 'DICT_LOADING') return t('wordcraft.error.dictLoading')
    if (e.startsWith('INVALID_WORD:')) return t('wordcraft.error.invalidWord', { word: e.slice('INVALID_WORD:'.length) })
    if (e === 'FIRST_MOVE_MUST_COVER_CENTER') return t('wordcraft.error.mustCoverCenter')
    if (e === 'FIRST_MOVE_TOO_SHORT') return t('wordcraft.error.tooShort')
    if (e === 'NOT_LINEAR') return t('wordcraft.error.notLinear')
    if (e === 'NOT_CONTIGUOUS') return t('wordcraft.error.notContiguous')
    if (e === 'DISCONNECTED') return t('wordcraft.error.disconnected')
    if (e === 'BAG_TOO_SMALL_TO_SWAP') return t('wordcraft.error.bagTooSmallToSwap')
    return e
  })()

  return (
    <div className={cn('flex-1 flex flex-col w-full overflow-x-hidden min-h-screen bg-neo-navy', isRTL && 'rtl')}>
      <Header />
      <WordCraftCelebration kind={celebration.kind} burstId={celebration.burstId} origin={celebration.origin} />

      <main className="flex-1 px-3 sm:px-6 py-4 sm:py-6 pb-24 max-w-[820px] mx-auto w-full space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => router.push(`/${language}`)}>
            <ArrowLeft className="w-4 h-4 me-1" />
            {t('common.backToHome')}
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-neo-display text-neo-white flex items-center gap-2">
              <Layers className="w-6 h-6 text-neo-purple" />
              {t('wordcraft.modeTitle')}
            </h1>
          </div>
        </div>

        {!dict && (
          <div className="flex items-center gap-3 p-3 bg-neo-navy-light border-neo border-black rounded-neo">
            <PageLoader size="sm" />
            <span className="text-sm text-neo-cream">{t('wordcraft.loadingDict')}</span>
          </div>
        )}

        <WordCraftScoreboard
          player={game.state.player}
          bot={game.state.bot}
          turn={game.state.turn}
          tilesRemaining={game.tilesRemaining}
          labels={{
            you: t('wordcraft.you'), bot: t('wordcraft.bot'),
            yourTurn: t('wordcraft.yourTurn'), botTurn: t('wordcraft.botTurn'),
            gameOver: t('wordcraft.gameOver'), bagRemaining: t('wordcraft.bagRemaining'),
          }}
        />

        <div
          className={cn(
            'relative',
            game.state.overdrive && 'ring-2 ring-neo-lime ring-offset-2 ring-offset-neo-navy rounded-neo',
          )}
        >
          <WordCraftBoard
            board={game.state.board}
            pendingPlacements={game.state.pendingPlacements}
            onCellClick={game.placeOnBoard}
            disabled={game.state.turn !== 'player'}
          />
          {scoreFloat && (
            <ScoreFloat
              key={scoreFloat.key}
              score={scoreFloat.score}
              overdrive={scoreFloat.overdrive}
              isBingo={scoreFloat.isBingo}
              encouragement={scoreFloat.encouragement}
            />
          )}
        </div>

        <div ref={heatMeterRef}>
          <HeatMeter
            heat={game.state.heat}
            overdrive={game.state.overdrive}
            burnout={game.state.burnout}
            label={t('wordcraft.heatLabel')}
          />
        </div>

        <WordCraftRack
          tiles={game.state.player.rack}
          selectedId={game.state.selectedRackTileId}
          pendingIds={pendingIds}
          onSelect={game.selectRackTile}
          disabled={game.state.turn !== 'player' || !dict || game.state.burnout}
          ariaLabel={t('wordcraft.yourRack')}
        />

        <WordCraftControls
          canSubmit={game.state.pendingPlacements.length > 0 && !!dict && game.state.turn === 'player' && !game.state.burnout}
          canRecall={game.state.pendingPlacements.length > 0}
          canSwap={game.state.player.rack.length > 0 && game.state.turn === 'player'}
          disabled={game.state.turn !== 'player' || !dict || game.state.burnout}
          onSubmit={game.submitMove}
          onRecall={game.recallAll}
          onPass={game.pass}
          onSwap={() => { const toReturn = game.state.player.rack.filter((tile) => !pendingIds.has(tile.id)); game.swap(toReturn) }}
          labels={{ submit: t('wordcraft.submit'), recall: t('wordcraft.recall'), pass: t('wordcraft.pass'), swap: t('wordcraft.swap') }}
        />

        {errorMessage && (
          <div role="alert" className="px-3 py-2 bg-neo-red/20 border-neo border-neo-red text-neo-red text-sm rounded-neo">
            {errorMessage}
          </div>
        )}

        {game.state.turn === 'over' && (
          <div className="text-center py-4 bg-neo-navy-light border-neo border-black rounded-neo">
            <p className="text-lg font-neo-display text-neo-white">{t('wordcraft.winnerLabel', { name: winner })}</p>
            <Button className="mt-3" onClick={() => window.location.reload()}>{t('common.playAgain') || 'Play Again'}</Button>
          </div>
        )}

        {game.state.history.length > 0 && (
          <div className="text-xs text-neo-cream/70 space-y-1">
            <h2 className="font-neo-display uppercase tracking-wide text-neo-white">{t('wordcraft.history')}</h2>
            <ul className="space-y-1">
              {game.state.history.slice(-5).reverse().map((h, i) => (
                <li key={i} className="flex justify-between">
                  <span>{h.who === 'player' ? t('wordcraft.you') : t('wordcraft.bot')}: {h.words.join(', ') || t('wordcraft.passed')}</span>
                  <span className={cn('font-mono', h.score > 0 ? 'text-neo-lime' : 'text-neo-white/40')}>+{h.score}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </div>
  )
}
```

**Note:** Add `burnoutSkip` to the return value of `useWordCraftGame`:
```ts
// In useWordCraftGame.ts, add:
const burnoutSkip = useCallback(() => dispatch({ type: 'BURNOUT_SKIP' }), [])
// And return it:
return { ..., burnoutSkip }
```

- [ ] **Step 2: Commit**
```bash
git add app/[locale]/word-craft/PageClient.tsx lib/word-craft/useWordCraftGame.ts
git commit -m "feat(wordcraft): public beta PageClient with heat meter, effects, overdrive"
```

---

## Task 11: Public page.tsx + metadata

**Files:**
- Create: `app/[locale]/word-craft/page.tsx`

- [ ] **Step 1: Create page.tsx**

```tsx
// app/[locale]/word-craft/page.tsx
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { PageLoader } from '@/components/ui/PageLoader'
import WordCraftPageClient from './PageClient'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: 'WordCraft Beta',
}

export default function WordCraftPage() {
  return (
    <Suspense fallback={<div className="flex-1 bg-neo-navy flex items-center justify-center"><PageLoader size="lg" /></div>}>
      <WordCraftPageClient />
    </Suspense>
  )
}
```

- [ ] **Step 2: Commit**
```bash
git add app/[locale]/word-craft/page.tsx
git commit -m "feat(wordcraft): public beta page route (noindex)"
```

---

## Task 12: Mode card on hub

**Files:**
- Modify: `components/landing/LandingChallengeCards.tsx`

- [ ] **Step 1: Add `'wordCraft'` to types and constants**

In `LandingChallengeCards.tsx`, change:
```ts
// Was:
type LandingCardKey = LandingGameMode | 'quickPlay' | 'connections' | 'brainGym'

// Becomes:
type LandingCardKey = LandingGameMode | 'quickPlay' | 'connections' | 'brainGym' | 'wordCraft'
```

Add to `DEFAULT_ORDER` and `FEATURED_MODES`:
```ts
const DEFAULT_ORDER: LandingCardKey[] = ['daily','quickPlay','arena','practice','blast','connections','brainGym','wordCraft']

const FEATURED_MODES = new Set<LandingCardKey>([
  'daily','arena','blast','practice','quickPlay','connections','brainGym','wordCraft',
])
```

Add `'wordCraft'` to `SP_MODES`:
```ts
const SP_MODES = new Set<LandingCardKey>(['practice','blast','adventure','connections','brainGym','wordCraft'])
```

- [ ] **Step 2: Add email check to component props + hook**

Add to the `LandingChallengeCardsProps` interface:
```ts
userEmail?: string
```

Pass it from the landing page caller. Then in the component:
```ts
import { isWordCraftBetaUser } from '@/lib/word-craft/betaAccess'
// ...
const isWordCraftBeta = isWordCraftBetaUser(userEmail)
```

- [ ] **Step 3: Add renderCard case**

```ts
case 'wordCraft':
  return (
    <div key="wordCraft" className="w-full h-full animate-[fadeInUp_0.4s_ease-out_both]" style={style}>
      <ModeCard
        title={t('wordcraft.modeTitle')}
        description={t('wordcraft.modeDesc')}
        href={`/${language}/word-craft`}
        icon={<Layers className="w-6 h-6" />}
        modeImage="/modes/practice.png"
        variant="purple"
        badge="BETA"
        locked={!isWordCraftBeta}
        lockedMessage={t('wordcraft.betaLocked')}
        onClick={() => { if (isWordCraftBeta) { trackModeSelected('wordCraft', 'home'); trackLandingCtaClick('mode_card', { mode: 'wordCraft', variant: 'purple' }) } }}
      />
    </div>
  )
```

Add `Layers` to the lucide-react imports at the top of the file.

- [ ] **Step 4: Wire `userEmail` in the landing page caller**

Find where `LandingChallengeCards` is rendered (likely in `components/landing/LandingView.tsx` or `app/[locale]/PageClient.tsx`) and pass `userEmail={profile?.email ?? undefined}`.

- [ ] **Step 5: Build check**
```bash
npx tsc --noEmit
```

- [ ] **Step 6: Commit**
```bash
git add components/landing/LandingChallengeCards.tsx
git commit -m "feat(wordcraft): mode card on hub — purple/BETA, email-gated locked state"
```

---

## Task 13: Achievement wiring

**Files:**
- Modify: `app/[locale]/word-craft/PageClient.tsx`

Achievements fire via the existing `AchievementQueue` pattern. Find how other modes dispatch achievements (grep for `AchievementQueue` or `useAchievements` in the codebase) and follow the same pattern.

- [ ] **Step 1: Find achievement dispatch pattern**
```bash
grep -r "AchievementQueue\|triggerAchievement\|useAchievements" fe-next/components --include="*.tsx" -l
```

- [ ] **Step 2: Add achievement keys to localStorage tracking**

In PageClient.tsx, add after the history-driven effects `useEffect`:

```ts
// Achievement tracking refs
const achievementsRef = useRef({ firstWord: false, overdrive: false, overdriveCount: 0, linguist: false })

useEffect(() => {
  const len = game.state.history.length
  if (len === 0) return
  const newest = game.state.history[len - 1]
  if (newest?.who !== 'player' || newest.score === 0) return
  const a = achievementsRef.current

  // First word
  if (!a.firstWord) {
    a.firstWord = true
    triggerAchievement?.('wordcraft_first_word')   // replace with actual dispatch pattern
  }
  // Bingo
  if (newest.placedTileIds.length >= 7) {
    triggerAchievement?.('wordcraft_bingo')
  }
  // Overdrive cash
  if (game.state.overdrive) {  // was overdrive before this commit
    triggerAchievement?.('wordcraft_overdrive_cash')
  }
}, [game.state.history])

// Overdrive enter
useEffect(() => {
  if (!game.state.overdrive) return
  const a = achievementsRef.current
  if (!a.overdrive) { a.overdrive = true; triggerAchievement?.('wordcraft_overdrive_enter') }
  a.overdriveCount++
  if (a.overdriveCount >= 3) triggerAchievement?.('wordcraft_heat_streak')
}, [game.state.overdrive])

// Linguist: track locales played
useEffect(() => {
  const key = 'wc_locales_played'
  const stored = JSON.parse(localStorage.getItem(key) ?? '[]') as string[]
  if (!stored.includes(locale)) {
    const updated = [...stored, locale]
    localStorage.setItem(key, JSON.stringify(updated))
    if (updated.length >= 3) triggerAchievement?.('wordcraft_linguist')
  }
}, [locale])
```

Replace `triggerAchievement?.('key')` with the actual achievement dispatch function once found in step 1.

- [ ] **Step 3: Commit**
```bash
git add app/[locale]/word-craft/PageClient.tsx
git commit -m "feat(wordcraft): achievement triggers — first word, bingo, overdrive, linguist"
```

---

## Task 14: Lint + type check + full test suite

- [ ] **Step 1: Run all word-craft tests**
```bash
cd fe-next && npx vitest run lib/word-craft/__tests__/
```
Expected: all existing 74 tests + new heat/board/tilebag/dictionary tests pass.

- [ ] **Step 2: TypeScript check**
```bash
npx tsc --noEmit
```
Fix any type errors before proceeding.

- [ ] **Step 3: Lint**
```bash
npm run lint
```

- [ ] **Step 4: Build**
```bash
npm run build
```

- [ ] **Step 5: Manual smoke test**

Navigate to `http://localhost:3001/en/word-craft` (as ohadf2015@gmail.com):
- [ ] Mode card visible on hub with purple/BETA badge
- [ ] Non-beta user sees locked card (test by logging out)
- [ ] Dictionary loads, board renders (13×13 on mobile)
- [ ] Heat meter fills as words are played
- [ ] Overdrive activates at 100%, board gets lime ring
- [ ] PixiJS lime sparks fire on overdrive
- [ ] Burnout triggers after 2 passes in overdrive
- [ ] Bingo triggers star shower
- [ ] Score float-up appears after each word
- [ ] HE/SV/ES locale: different tiles in rack (å for SV, ñ for ES, Hebrew chars for HE)

- [ ] **Step 6: Final commit**
```bash
git add -A
git commit -m "feat(wordcraft): public beta — 5-locale, heat meter, GSAP+PixiJS effects, mode card"
```

---

## Self-Review Checklist

**Spec coverage:**
- ✅ Email gate (betaAccess.ts) — Task 1
- ✅ Mode card (hub) — Task 12
- ✅ 5-locale dictionaries — Tasks 3+4
- ✅ Responsive board 13×13 — Task 2
- ✅ Heat Meter twist — Tasks 5+6
- ✅ PixiJS overdrive/burnout effects — Task 8
- ✅ GSAP tile animations (reused from juice hook)
- ✅ ScoreFloat + encouragement — Task 7
- ✅ Achievements (6 keys) — Task 13
- ✅ All 5 locale translations — Task 9
- ✅ noindex metadata — Task 11

**Gaps addressed:**
- `burnoutSkip` must be added to `useWordCraftGame` return (noted in Task 10)
- `userEmail` prop wiring in LandingView/PageClient (noted in Task 12 Step 4)
- Actual achievement dispatch pattern depends on existing pattern in codebase (Task 13 Step 1)
- HE/ES/JA wordlist API uses curated starters — real dictionary integration requires checking `app/api/dictionary` (noted in Task 4 route comments)

**Type consistency:** `SupportedLocale` defined in `tileBag.ts`, imported everywhere consistently. `CelebrationKind` extended in Task 8 used in Task 10. `boardSize: 13 | 15` flows from PageClient → useWordCraftGame → createBoard.
