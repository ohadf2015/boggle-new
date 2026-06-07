# Crossword Real-Clues + Visual Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace hand-typed crossword clues with a real lexicon-driven pipeline (Datamuse definition → LLM-crafted clue → judge gate → committed clue bank), generate a large frequency-biased puzzle bank from it, and give the grid an NYT-Mini-grade brand-skinned visual overhaul.

**Architecture:** Build-time Node script fetches Datamuse definitions (cached to disk) and owns all deterministic/pure logic (clean, gate, assemble). LLM clue-crafting + dual-judge runs via a Claude Code Workflow (like `.claude/workflows/dictionary-improvement-*.js`), emitting `clueBank.en.json`. The CSP filler is constrained to cluable words and frequency-biased; it emits `puzzles.en.json`. Runtime stays fully offline (JSON baked in). EN gets the overhaul; HE stays curated.

**Tech Stack:** TypeScript, Node (tsx), Vitest, Datamuse API (build-time only), Claude Code Workflow/Agent for LLM steps, GSAP, Tailwind, Next.js App Router.

**Spec:** `docs/2026-06-07-crossword-real-clues-spec.md`

---

## File Structure

**Phase 1 — Clue bank infra**
- Create `fe-next/scripts/crossword/clues/clueText.ts` — pure clue-cleaning + gate helpers (no network).
- Create `fe-next/scripts/crossword/clues/clueText.test.ts` — Vitest unit tests for the above.
- Create `fe-next/scripts/crossword/clues/datamuse.ts` — thin async Datamuse adapter + disk cache.
- Create `fe-next/scripts/crossword/clues/buildPool.ts` — frequency-ranked EN word-pool builder (3–7 letters).
- Create `fe-next/scripts/crossword/clues/enrich.ts` — runs pool → Datamuse → raw enriched JSON (cached).
- Create `.claude/workflows/crossword-clue-craft.js` — Workflow: craft clue + dual-judge per word, emit clue bank.
- Create `fe-next/lib/crossword/data/clueBank.en.json` — committed output `{ word: { clue, pos, score, alts? } }`.
- Create `fe-next/lib/crossword/clueBank.ts` — typed runtime loader for the JSON.

**Phase 2 — Puzzle generation**
- Modify `fe-next/scripts/crossword/build.ts` — constrain filler to clueBank words, frequency-bias, auto-clue, midi templates, emit bank.
- Create `fe-next/lib/crossword/data/puzzles.en.json` — committed generated EN puzzle bank.
- Create `fe-next/scripts/crossword/build.test.ts` (or extend `quality.test.ts`) — generator gates.

**Phase 3 — Runtime wiring**
- Modify `fe-next/lib/crossword/puzzles/seed.ts` — merge generated EN bank + curated HE seeds into pool.
- Modify `fe-next/lib/crossword/daily.ts` — difficulty/size rotation in daily pick (if needed).
- Test: `fe-next/lib/crossword/loader.test.ts`.

**Phase 4 — Visual overhaul**
- Modify `fe-next/components/crossword/CrosswordCell.tsx`, `CrosswordGrid.tsx`, `CrosswordClueList.tsx`, `ClueBar.tsx`, `CrosswordView.tsx`, `CrosswordFx.tsx`.
- Tests: reduced-motion gating where animation added.

**Phase 5 — Validation** — lint/test/build + browser play-test.

---

## Phase 1 — Clue Bank Infrastructure

### Task 1: Pure clue-text helpers (TDD)

**Files:**
- Create: `fe-next/scripts/crossword/clues/clueText.ts`
- Test: `fe-next/scripts/crossword/clues/clueText.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// clueText.test.ts
import { describe, it, expect } from 'vitest';
import { cleanDefinition, isCircularClue, clueLengthOk, normalizeClue } from './clueText';

describe('cleanDefinition', () => {
  it('strips the Datamuse POS prefix and parentheticals', () => {
    expect(cleanDefinition('n\t(countable) One of the large bodies of water separating the continents. '))
      .toBe('One of the large bodies of water separating the continents');
  });
  it('strips leading "A/An/The"', () => {
    expect(cleanDefinition('n\tA blue colour, like that of the ocean')).toBe('Blue colour, like that of the ocean');
  });
  it('collapses whitespace and trims trailing period', () => {
    expect(cleanDefinition('v\tTo   move  swiftly.')).toBe('To move swiftly');
  });
});

describe('isCircularClue', () => {
  it('flags the answer appearing verbatim', () => {
    expect(isCircularClue('A large ocean body', 'ocean')).toBe(true);
  });
  it('flags a stem/derivative of the answer', () => {
    expect(isCircularClue('One who runs', 'running')).toBe(true); // shares run stem
  });
  it('passes a clean clue', () => {
    expect(isCircularClue('Atlantic or Pacific', 'ocean')).toBe(false);
  });
});

describe('clueLengthOk', () => {
  it('rejects clues over the cap', () => {
    expect(clueLengthOk('x'.repeat(80))).toBe(false);
  });
  it('accepts a tight clue', () => {
    expect(clueLengthOk('Atlantic or Pacific')).toBe(true);
  });
  it('rejects empty', () => {
    expect(clueLengthOk('')).toBe(false);
  });
});

describe('normalizeClue', () => {
  it('sentence-cases and trims', () => {
    expect(normalizeClue('  atlantic or pacific ')).toBe('Atlantic or Pacific');
  });
});
```

- [ ] **Step 2: Run, verify fail**

Run: `cd fe-next && npx vitest run scripts/crossword/clues/clueText.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `clueText.ts`**

```typescript
// Pure helpers for turning raw dictionary definitions into clue text and gating quality.
// No network. Unit-tested.

const LEADING_ARTICLE = /^(a|an|the)\s+/i;
const POS_PREFIX = /^[a-z]+\t/; // Datamuse "n\t...", "v\t..."
const PARENS = /\([^)]*\)/g;

export function cleanDefinition(raw: string): string {
  let s = raw.replace(POS_PREFIX, '');
  s = s.replace(PARENS, ' ');
  s = s.replace(/\s+/g, ' ').trim();
  s = s.replace(/\.+$/, '').trim();
  s = s.replace(LEADING_ARTICLE, '');
  // re-capitalize first letter after article strip
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Shared 4+ char prefix => same stem (cheap derivative check). */
function sharesStem(a: string, b: string): boolean {
  const x = a.toLowerCase(), y = b.toLowerCase();
  const n = Math.min(x.length, y.length, 4);
  return n >= 4 && x.slice(0, n) === y.slice(0, n);
}

export function isCircularClue(clue: string, answer: string): boolean {
  const ans = answer.toLowerCase();
  const words = clue.toLowerCase().match(/[a-z]+/g) ?? [];
  return words.some((w) => w === ans || w.includes(ans) || sharesStem(w, ans));
}

const CLUE_MAX = 64;
export function clueLengthOk(clue: string): boolean {
  const t = clue.trim();
  return t.length > 0 && t.length <= CLUE_MAX;
}

export function normalizeClue(clue: string): string {
  const t = clue.replace(/\s+/g, ' ').trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
}
```

- [ ] **Step 4: Run, verify pass**

Run: `cd fe-next && npx vitest run scripts/crossword/clues/clueText.test.ts`
Expected: PASS (all green). Adjust `sharesStem` threshold if the `running`/`run` case needs n>=3 — verify the test drives it.

- [ ] **Step 5: Commit** (ask user first)

### Task 2: Datamuse adapter + disk cache

**Files:**
- Create: `fe-next/scripts/crossword/clues/datamuse.ts`

- [ ] **Step 1: Implement adapter** (no unit test — it's I/O; covered by the pure helpers + manual run)

```typescript
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

export interface DatamuseEntry { word: string; defs: string[]; pos: string; score: number; }

const CACHE_DIR = join(__dirname, '.cache');

export async function fetchDatamuse(word: string): Promise<DatamuseEntry | null> {
  if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });
  const cachePath = join(CACHE_DIR, `${word}.json`);
  if (existsSync(cachePath)) return JSON.parse(readFileSync(cachePath, 'utf8'));

  const url = `https://api.datamuse.com/words?sp=${encodeURIComponent(word)}&md=dp&max=1`;
  const res = await fetch(url);
  const arr = (await res.json()) as Array<{ word: string; defs?: string[]; tags?: string[]; score?: number }>;
  const hit = arr.find((a) => a.word === word) ?? arr[0];
  if (!hit || !hit.defs?.length) { writeFileSync(cachePath, 'null'); return null; }
  const pos = (hit.tags ?? []).find((t) => /^(n|v|adj|adv)$/.test(t)) ?? 'n';
  const entry: DatamuseEntry = { word, defs: hit.defs, pos, score: hit.score ?? 0 };
  writeFileSync(cachePath, JSON.stringify(entry));
  return entry;
}
```

- [ ] **Step 2: Smoke-run** `cd fe-next && npx tsx -e "import('./scripts/crossword/clues/datamuse').then(m=>m.fetchDatamuse('ocean').then(console.log))"` → expect entry with defs.

### Task 3: Frequency-ranked pool builder

**Files:**
- Create: `fe-next/scripts/crossword/clues/buildPool.ts`

- [ ] **Step 1: Implement** — read `an-array-of-english-words`, filter to `[a-z]{3,7}`, fetch Datamuse score per word (cached), keep top ~3000 by score with `defs`, write `pool.en.json` (array of `{word, score, pos, defs}`). Rate-limit ~10 req/s.

```typescript
import words from 'an-array-of-english-words';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fetchDatamuse } from './datamuse';

const TARGET = 3000;
async function main() {
  const cands = (words as string[]).filter((w) => /^[a-z]{3,7}$/.test(w));
  const out: any[] = [];
  for (const w of cands) {
    const e = await fetchDatamuse(w);
    if (e && e.defs.length) out.push(e);
    if (out.length % 200 === 0) console.log(out.length, 'enriched');
    await new Promise((r) => setTimeout(r, 90)); // ~11 req/s polite
  }
  out.sort((a, b) => b.score - a.score);
  const top = out.slice(0, TARGET);
  writeFileSync(join(__dirname, 'pool.en.json'), JSON.stringify(top, null, 0));
  console.log('wrote', top.length);
}
main();
```

Note: `an-array-of-english-words` is large; the Datamuse `sp=` lookup already filters to real-word hits. To bound runtime, pre-filter candidates against the existing `commonWords.ts` EN pool + a frequency wordlist if available, else cap candidate scan. **Decision at run time:** start from the existing ~800 pool + expand with high-score Datamuse neighbors (`rel_trg`) of seed words to reach ~3000 without scanning all 200k.

- [ ] **Step 2: Run** `cd fe-next && npx tsx scripts/crossword/clues/buildPool.ts` → `pool.en.json` (~3000 entries). This is the cache-warming run; reruns are free.

### Task 4: LLM clue-craft + dual-judge Workflow

**Files:**
- Create: `.claude/workflows/crossword-clue-craft.js`

- [ ] **Step 1: Author the workflow.** Input: `pool.en.json`. For each word, ONE agent crafts a clue from `{word, defs, pos, score}` under the clue rules; TWO judge agents (strict + solver-persona) score 0–1; keep clue if both ≥ 0.75 AND it passes pure gates (`isCircularClue` false, `clueLengthOk` true). Pipeline over words (not barrier). Emit `clueBank.en.json` (`{ word: { clue, pos, score, alts } }`). Craft agent = Sonnet; judges = Sonnet.

Workflow shape (abbrev — full code written at execution):
```javascript
export const meta = { name: 'crossword-clue-craft', description: 'Craft + judge crossword clues from definitions', phases: [{title:'Craft'},{title:'Judge'}] };
const pool = JSON.parse(/* read pool.en.json via args path */ args.poolJson);
const CRAFT_SCHEMA = { /* {clue, alt} */ };
const JUDGE_SCHEMA = { /* {score, reason} */ };
const results = await pipeline(pool,
  e => agent(craftPrompt(e), {phase:'Craft', schema: CRAFT_SCHEMA, model:'sonnet'}).then(c => ({...e, ...c})),
  c => parallel([ () => agent(strictJudge(c), {phase:'Judge', schema: JUDGE_SCHEMA, model:'sonnet'}),
                  () => agent(solverJudge(c), {phase:'Judge', schema: JUDGE_SCHEMA, model:'sonnet'}) ])
        .then(([j1,j2]) => ({...c, ok: j1?.score>=0.75 && j2?.score>=0.75})));
// pure-gate + assemble clueBank, return it
```

Clue-craft prompt rules (verbatim into the prompt): "Write ONE crossword clue for ANSWER. Never include the answer or any word sharing its first 4 letters. ≤60 chars. No leading article. Strip parentheticals. Definitional or synonym style, solver-friendly, sentence-case. Given definitions: …". 

- [ ] **Step 2: Run the workflow on a 30-word slice first** (the advisor's de-risk gate). Read the 30 clues by hand. They MUST read like clues, not Wiktionary. If not, fix the prompt and rerun. **Do not scale until this passes.**

- [ ] **Step 3: Run on the full pool**, write `fe-next/lib/crossword/data/clueBank.en.json`.

### Task 5: Runtime clue-bank loader

**Files:**
- Create: `fe-next/lib/crossword/clueBank.ts`

- [ ] **Step 1: Test** `clueBank.test.ts` — `getClue('ocean')` returns a non-empty string; unknown word returns undefined; bank size > 1000.
- [ ] **Step 2: Implement** — `import bank from './data/clueBank.en.json'; export function getClue(w){return bank[w]?.clue}` + `hasClue`, `clueScore`.
- [ ] **Step 3: Run tests, commit phase 1** (ask first).

---

## Phase 2 — Puzzle Generation

### Task 6: Constrain filler to clue bank + frequency bias

**Files:**
- Modify: `fe-next/scripts/crossword/build.ts`

- [ ] **Step 1: Test** (extend `quality.test.ts`): generate a puzzle and assert every answer is in clueBank AND avg clueScore ≥ floor. RED first (build.ts not yet constrained).
- [ ] **Step 2: Implement** — feed only clueBank words to `buildDictIndex`; order candidates by descending score in `fillGrid` options; after fill, map each slot answer → `getClue`; reject puzzle if any answer lacks a clue.
- [ ] **Step 3: Add 7×7 midi templates** (180° symmetric, no run < 3) alongside existing 5×5 set.
- [ ] **Step 4: Generate bank** — run build.ts to emit `puzzles.en.json` (~60–120 puzzles, tiered by avg score + size). **Gate: read one full puzzle's clues by hand.**
- [ ] **Step 5: Run tests, commit phase 2** (ask first).

---

## Phase 3 — Runtime Wiring

### Task 7: Merge EN bank + HE seeds into daily pool

**Files:**
- Modify: `fe-next/lib/crossword/puzzles/seed.ts`
- Test: `fe-next/lib/crossword/loader.test.ts`

- [ ] **Step 1: Test** — pool includes generated EN puzzles + curated HE; `pickDaily` deterministic per date+locale; EN picks from generated bank, HE from curated.
- [ ] **Step 2: Implement** — load `puzzles.en.json` and convert to `SeedPuzzle[]`, concat with HE seeds; expose via existing `getDailyPuzzle`.
- [ ] **Step 3: Run tests, commit phase 3** (ask first).

---

## Phase 4 — Visual Overhaul

### Task 8: NYT-Mini-grade grid + clue UI (impeccable + frontend-design + GSAP)

**Files:**
- Modify: `CrosswordCell.tsx`, `CrosswordGrid.tsx`, `CrosswordClueList.tsx`, `ClueBar.tsx`, `CrosswordView.tsx`, `CrosswordFx.tsx`

- [ ] **Step 1:** Invoke `impeccable:impeccable` + `frontend-design:frontend-design` for the grid/clue redesign within brand (neo-brutalist: hard pixel shadows, solid borders, electric accents, Fredoka/Rubik). Crisp cells, bold corner numbers, active-clue + cross highlight.
- [ ] **Step 2:** GSAP (`gsap-core` + `gsap-react`): smooth focus-cell motion, active-slot sweep, solved burst. `useReducedMotion`-gated (test the gate).
- [ ] **Step 3:** Clue list auto-scroll active clue into view; mobile ClueBar prev/next/toggle polish. RTL verified for HE.
- [ ] **Step 4:** Run reduced-motion tests, commit phase 4 (ask first).

---

## Phase 5 — Validation

### Task 9: Full validation + browser play-test

- [ ] **Step 1:** `cd fe-next && npm run lint && npx tsc --noEmit && npm run test`.
- [ ] **Step 2:** `npm run build`.
- [ ] **Step 3:** Browser play-test (PORT=3007) an EN puzzle end-to-end + a HE puzzle (RTL). **Read the clues — they must feel real.** Verify focus motion, solve celebration, responsive.
- [ ] **Step 4:** Update memory file. Commit phase 5 (ask first).

---

## Self-Review notes

- **Spec coverage:** Part A → Tasks 1–5; Part B → Task 6; runtime → Task 7; Part C → Task 8; verification bar → Task 9 (hand-read clues + play-test). HE deferral honored (Task 7 keeps curated HE). Admin gate untouched.
- **Type consistency:** `DatamuseEntry`, `clueBank.en.json` shape `{word:{clue,pos,score,alts}}`, `getClue` used in Tasks 4/5/6 consistently. `SeedPuzzle.clues` shape unchanged.
- **Key risk:** clue feel. Mitigated by the two hand-read gates (Task 4 Step 2, Task 6 Step 4) before scaling — the changed verification bar that catches prior rejections.
