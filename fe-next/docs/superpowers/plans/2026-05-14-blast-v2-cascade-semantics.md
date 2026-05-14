# Blast v2 Cascade Semantics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Blast v2 levels playable by removing auto-claim of target words — the player finds every word manually; a collapse only *reveals* further words, it never claims them.

**Architecture:** `applyValidatedSubmit` in `lib/blast/v2/useBlastV2.ts` currently runs a synchronous `while` loop that calls `detectCascade` and auto-adds every target word it can find on the board to `foundWords`. Because the onboarding level packs lay every target word out pre-formed, dragging one word claims all of them and the level completes in a single move. This plan replaces that loop with *reveal detection*: compute which unfound target words are formable on the board **before** vs **after** the single collapse; the newly-formable ("revealed") words increment `cascadeCount` (used by chain FX + telemetry) but are **not** added to `foundWords`. The win condition `level.words.every(w => found.has(w))` is unchanged and now only becomes true after the player has manually dragged every word.

**Tech Stack:** TypeScript, React `useReducer`, Vitest + `@testing-library/react`.

**Scope note:** This is Plan A of a 5-plan roadmap (see bottom). It is self-contained and shippable: after it lands, Blast v2 level 1 requires the player to find all three words manually instead of completing on the first drag. Plans B–E (collapse animation, theme banner, level progression, locale packs) are separate and build on this one.

**Out of scope / unchanged:**
- The v2 access gate stays restricted to `ohadf2015@gmail.com` + `?v2=force` dev bypass (`app/[locale]/blast/page.tsx:10,31`). Do not touch it.
- `detectCascade` / `detectAllCascades` in `lib/blast/v2/engine/cascade.ts` are **not** modified — `detectAllCascades` is reused as-is for reveal detection; `detectCascade` (singular) is left exported and tested for future use (hint system).
- Coin scoring per word is unchanged. The removed `while` loop's per-cascade coin bonus is intentionally dropped — revealed words score normally as theme words when the player later finds them manually.
- `BlastGame.tsx` needs no change: `state.cascadeCount` still flows into `BlastLevelCompleteCard` and the clear submission as a sensible "words revealed by collapses" count, and `revealed.length` per submit is always `≤ wordsFound.length - 1`, so `validateChainBounds` in `anti-cheat.ts` still passes.

---

### Task 1: Update `useBlastV2` tests to assert the new contract (RED)

**Files:**
- Test: `lib/blast/v2/__tests__/useBlastV2.test.tsx`

The current file has two tests that assert the *old* auto-claim behavior (`'drag-select CAT: foundWords includes CAT, cascades triggered'` expecting `coins === 180` / `cascadeCount === 2`, and `'exposes per-submission chain depth ...'` expecting `lastChainDepth === 2`). Those assertions are wrong under the new mechanic. Rewrite them and add a level fixture that actually exercises reveal detection.

- [ ] **Step 1: Add the `revealLevel` fixture below the existing `mockLevel` declaration**

Insert immediately after the `mockLevel` object (before `describe(...)`):

```tsx
// Level designed so collapsing CAT reveals DOG.
//   col0 = [C,A,T,D] bottom-up, col1 = [O], col2 = [G]
//   initial grid (r = row index from bottom):
//     r3: D . .
//     r2: T . .
//     r1: A . .
//     r0: C O G
//   CAT is the vertical column-0 run; DOG is NOT a straight line yet.
//   After CAT is cleared, D falls to r0 → DOG spans row 0 (c0r0=D, c1r0=O, c2r0=G).
const revealLevel: BlastLevel = {
  id: 'useBlastV2-reveal-test',
  levelNumber: 1,
  locale: 'en',
  theme: 'onboarding',
  columns: [
    { index: 0, tiles: ['C', 'A', 'T', 'D'] },
    { index: 1, tiles: ['O'] },
    { index: 2, tiles: ['G'] },
  ],
  words: ['CAT', 'DOG'],
  resolvableOrder: ['CAT', 'DOG'],
  tileFlags: {},
  gravityMode: 'standard',
  difficulty: 1,
};
```

- [ ] **Step 2: Replace the `'drag-select CAT: foundWords includes CAT, cascades triggered'` test**

Delete that entire `it(...)` block and replace it with:

```tsx
  it('drag-select CAT claims only CAT — no auto-claim of other words', () => {
    const { result } = renderHook(() => useBlastV2(mockLevel));

    act(() => {
      result.current.handlers.onPointerDown(cellId(0, 0));
      result.current.handlers.onPointerMove(cellId(0, 1));
      result.current.handlers.onPointerMove(cellId(0, 2));
      result.current.handlers.onPointerUp();
    });

    expect(result.current.state.foundWords.has('CAT')).toBe(true);
    // SUN + EGG are still on the board untouched — player must find them manually.
    expect(result.current.state.foundWords.has('SUN')).toBe(false);
    expect(result.current.state.foundWords.has('EGG')).toBe(false);
    // Only CAT scored: 3 letters x 10 (theme). No cascade bonus.
    expect(result.current.state.coins).toBe(30);
    // Collapsing column 0 reveals nothing — SUN/EGG were already formable.
    expect(result.current.state.cascadeCount).toBe(0);
    expect(result.current.state.status).toBe('playing');
  });
```

- [ ] **Step 3: Replace the `'exposes per-submission chain depth + monotonic chain event key for FX'` test**

Delete that entire `it(...)` block and replace it with these two tests:

```tsx
  it('counts collapse-revealed words as cascades for FX (revealLevel)', () => {
    const { result } = renderHook(() => useBlastV2(revealLevel));
    expect(result.current.state.lastChainDepth).toBe(0);
    expect(result.current.state.chainEventKey).toBe(0);

    // Drag CAT up column 0. Collapsing C/A/T drops D to row 0,
    // making DOG (D-O-G across row 0) formable for the first time.
    act(() => {
      result.current.handlers.onPointerDown(cellId(0, 0));
      result.current.handlers.onPointerMove(cellId(0, 1));
      result.current.handlers.onPointerMove(cellId(0, 2));
      result.current.handlers.onPointerUp();
    });

    expect(result.current.state.foundWords.has('CAT')).toBe(true);
    // DOG was REVEALED, not claimed — player still has to drag it.
    expect(result.current.state.foundWords.has('DOG')).toBe(false);
    expect(result.current.state.cascadeCount).toBe(1);
    expect(result.current.state.lastChainDepth).toBe(1);
    expect(result.current.state.chainEventKey).toBe(1);
    expect(result.current.state.status).toBe('playing');
  });

  it('manually finding the revealed word completes the level', () => {
    const { result } = renderHook(() => useBlastV2(revealLevel));

    act(() => {
      result.current.handlers.onPointerDown(cellId(0, 0));
      result.current.handlers.onPointerMove(cellId(0, 1));
      result.current.handlers.onPointerMove(cellId(0, 2));
      result.current.handlers.onPointerUp();
    });

    // After CAT collapses, DOG sits across row 0: c0r0=D, c1r0=O, c2r0=G.
    act(() => {
      result.current.handlers.onPointerDown(cellId(0, 0));
      result.current.handlers.onPointerMove(cellId(1, 0));
      result.current.handlers.onPointerMove(cellId(2, 0));
      result.current.handlers.onPointerUp();
    });

    expect(result.current.state.foundWords.has('DOG')).toBe(true);
    expect(result.current.state.status).toBe('levelComplete');
  });
```

Leave the `'invalid selection triggers invalidShakeKey increment'` and `'completing all words sets status to levelComplete'` tests untouched — they remain correct.

- [ ] **Step 4: Run the test file to verify it fails**

Run: `npm run test:frontend -- lib/blast/v2/__tests__/useBlastV2.test.tsx`
Expected: FAIL. `'drag-select CAT claims only CAT'` fails because the current reducer auto-claims SUN+EGG (`foundWords.has('SUN')` is `true`, `coins` is `180`, `cascadeCount` is `2`). `'counts collapse-revealed words as cascades'` fails because the current reducer auto-claims DOG (`foundWords.has('DOG')` is `true`) and `lastChainDepth` is `1` via the old loop path rather than via reveal detection. The two untouched tests should still pass.

---

### Task 2: Rewrite the reducer cascade block (GREEN)

**Files:**
- Modify: `lib/blast/v2/useBlastV2.ts:6` (import) and `lib/blast/v2/useBlastV2.ts:71-95` (the `kind === 'theme'` block)

- [ ] **Step 1: Swap the `detectCascade` import for `detectAllCascades`**

In the engine import block at the top of the file, change line 6 (the second line of the `import { ... } from './engine'` statement). Current:

```ts
  reduceSelection, validateSelection, collapseCells, detectCascade, scoreForWord,
```

New:

```ts
  reduceSelection, validateSelection, collapseCells, detectAllCascades, scoreForWord,
```

- [ ] **Step 2: Replace the auto-claim `while` loop with reveal detection**

Replace this exact block (currently `useBlastV2.ts:71-95`):

```ts
  if (kind === 'theme') {
    newLevel = collapseCells(state.level, cells).level;
    while (true) {
      const cascade = detectCascade(newLevel, newFound, config);
      if (!cascade) break;
      newFound.add(cascade.word);
      newCascadeCount += 1;

      // Track cascade word
      trackBlastWordFound({
        level: state.level.levelNumber,
        word: cascade.word,
        axis: 'H', // Cascades are typically horizontal
        length: cascade.word.length,
        isCascade: true,
        isBonus: false,
      });

      const cOut = scoreForWord(newLevel, cascade.cells, 'cascade', newCascadeCount);
      newCoins += cOut.coinsBase + cOut.coinsFromOverlays;
      newChestProgress += cOut.chestProgressDelta;
      newLevel = collapseCells(newLevel, cascade.cells).level;
    }
  }
  const allFound = state.level.words.every((w) => newFound.has(w));
```

with:

```ts
  if (kind === 'theme') {
    // Target words formable on the board BEFORE this collapse (already-found excluded).
    const formableBefore = new Set(
      detectAllCascades(state.level, newFound, config).map((c) => c.word),
    );
    newLevel = collapseCells(state.level, cells).level;
    // Words the collapse newly REVEALED. The player still finds these manually —
    // they are counted only for chain FX + telemetry, NOT added to foundWords.
    const revealed = detectAllCascades(newLevel, newFound, config)
      .map((c) => c.word)
      .filter((w) => !formableBefore.has(w));
    newCascadeCount += revealed.length;
  }
  const allFound = state.level.words.every((w) => newFound.has(w));
```

Note: `newCoins`, `newChestProgress`, `newFound`, `newCascadeCount` are all still declared above this block (lines 54-59) — leave those declarations as-is. After this change `newFound` only ever grows by the single player-found word, `newCoins`/`newChestProgress` only reflect that one word, and `newCascadeCount` grows by the count of words the collapse revealed. `lastChainDepth` (computed at line 96 as `newCascadeCount - state.cascadeCount`) therefore equals `revealed.length` for this submission, so chain FX fires on the reveal — which is the intended "satisfying moment".

- [ ] **Step 3: Run the test file to verify it passes**

Run: `npm run test:frontend -- lib/blast/v2/__tests__/useBlastV2.test.tsx`
Expected: PASS — all five tests green (`drag-select CAT claims only CAT`, `counts collapse-revealed words as cascades`, `manually finding the revealed word completes the level`, `invalid selection ...`, `completing all words ...`).

---

### Task 3: Regression check — engine + full Blast v2 suite + lint

**Files:** none modified — verification only.

- [ ] **Step 1: Confirm the cascade engine tests still pass unchanged**

Run: `npm run test:frontend -- lib/blast/v2/engine/__tests__/cascade.test.ts`
Expected: PASS — `detectCascade` / `detectAllCascades` were not modified, so this suite is unaffected.

- [ ] **Step 2: Run the full Blast v2 frontend suite and triage any other failures**

Run: `npm run test:frontend -- lib/blast/v2 components/blast/v2`
Expected: PASS. If any test outside `useBlastV2.test.tsx` fails, it is asserting the old auto-claim contract — read it, confirm it was testing the removed behavior, and rewrite the assertion to match the new mechanic (player finds words manually; collapses only reveal). Do **not** weaken a test to make it pass; if a failure reveals a real regression in the reducer change, fix `useBlastV2.ts`. Expected scope of fallout is zero outside `useBlastV2.test.tsx` (anti-cheat tests drive `validateChainBounds` with synthetic submissions and are unaffected; `useBlastProgress` tests do not run the reducer).

- [ ] **Step 3: Lint the changed files**

Run: `npm run lint`
Expected: PASS, no new warnings in `lib/blast/v2/useBlastV2.ts` or `lib/blast/v2/__tests__/useBlastV2.test.tsx`.

---

### Task 4: Commit

- [ ] **Step 1: Stage and commit**

```bash
git add lib/blast/v2/useBlastV2.ts lib/blast/v2/__tests__/useBlastV2.test.tsx
git commit -m "$(cat <<'EOF'
fix(blast): stop auto-claiming target words in v2 cascade loop

The v2 reducer auto-added every target word detectCascade could find on
the board to foundWords, so dragging one word completed the whole level.
Replace the auto-claim while-loop with reveal detection: collapse once,
count target words the collapse newly made formable as cascades for
chain FX/telemetry, but leave them for the player to find manually.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 2: Verify the commit**

Run: `git status`
Expected: clean working tree (for these two files), commit present in `git log -1`.

---

## Known limitation after this slice

The English onboarding pack (`content/blast/packs/en/pack-onboarding.json`) still lays all three target words out pre-formed as straight rows, so level 1 is now *playable* but trivial — the player just drags three obvious lines. True progressive-reveal level design is **Plan E**. This plan only fixes the engine contract; it does not re-author content.

## Roadmap — remaining plans (write each after the previous ships)

- **Plan B — Collapse animation.** Add a `collapsing` intermediate reducer status that holds the pre-collapse level + popped cells; `BlastGame` renders the pre-collapse board, drives the existing `playGravityCollapseFx` PixiJS overlay (`lib/blast/v2/fx/burst.ts:252`), then dispatches a `commit` action to swap in the collapsed level. State-machine driven, no `setTimeout` fragility. Do **not** pursue tile-identity keys — changing `BlastColumn.tiles` to `{id,letter}[]` has too large a blast radius (collapse, validation, generator, every pack JSON, 466 tests).
- **Plan C — Persistent theme banner.** `BlastLevelIntroCard` shows the theme then auto-dismisses after 1500ms; `BlastHud` renders no theme. Add a persistent theme label to `BlastHud` (`components/blast/v2/BlastHud.tsx`), translated via `t('blast.themes.<key>')`.
- **Plan D — Level progression.** `onAdvance` is a `console.log` stub (`app/[locale]/blast/v2/BlastV2PageClient.tsx:37`) and `page.tsx:36` hardcodes `resolve(1, locale)`. Wire real progression: fetch `max_level_cleared` from DB, resolve the correct level, persist progress on clear. This is the explicitly-deferred "Plan 3" work referenced in `BlastV2PageClient.tsx` comments.
- **Plan E — Locale packs + progressive-reveal authoring.** Only `content/blast/packs/en/` exists, so `he/sv/ja/es` silently fall back to English (`page.tsx:37`). Author locale packs for all four languages, and re-author the onboarding packs so words become formable only *after* collapses (depends on Plan A's reveal semantics).
