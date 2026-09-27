# Crossword: real dictionaries, sane clues, 5-language coverage, UX glowup

**Date:** 2026-06-24
**Goal:** Stop the "nonsense riddles", give every supported language real clue dictionaries so the
endless generator produces quality puzzles, and glow up the crossword UX/UI to feel unique.

## Problem (evidence, not guesses)

Sampled the live banks + read the gate + the runtime generator:

1. **Keystone bug — `isCircularClue` is English-only.** `lib/crossword/clues/clueText.ts:32`
   matches `/[a-z]+/g`, which matches **zero** Hebrew / accented-Spanish / Japanese characters.
   `words` is always `[]` → returns `false` for every non-English clue. The purity gate is a silent
   **no-op for 4 of 5 languages.**
2. **Hebrew bank is ~20% circular.** 146/749 clues are true token-exact circular; 138 follow the
   pattern `"ANSWER; synonym"` — the answer is literally the first word of its own clue
   (`רחב→"רחב; גדול"`, `קור→"קור; צונן"`, `כעס→"כעס; זעם"`). This is the user's "nonsense" (user is
   Hebrew-primary).
3. **Hebrew sofit corruption in clue TEXT.** 9 clues show non-final letter forms mid-display
   (`דג→"בעל חיים במימ"` should be `במים`). The answer-matching normalizer (sofit→regular) leaked
   onto the displayed clue string. Reads as typos to a Hebrew speaker.
4. **es / sv / ja have no clue bank.** `genLocaleFor` (`generate.daily.ts:28`) routes every
   non-`he` locale to the **English** bank → a Spanish player gets English words+clues. True
   nonsense for them.
5. **The runtime does zero gating** (`generate.runtime.ts:111`) — it trusts the bank verbatim. So
   whatever defect is in the JSON renders as-is. The bank is the single source of truth.

## Non-problems (do NOT touch)

- **"Infinite" already works.** The CSP filler (`generate.core.ts`) produces unbounded puzzles from
  a bank + deterministic seed. The work is **bank coverage + clue quality**, not the generator.
  Only integration seam is `genLocaleFor` + `templatesFor` + adding banks.
- **English clues are good** (Datamuse + LLM-refined). Leave en alone except the shared gate fix.

## Existing assets to reuse (ponytail: don't rebuild)

- Skill `crossword-clue-craft` — crafts + dual-judges clues from definitions. Use for re-cluing HE
  defects and building es/sv banks.
- Skill `dictionary-improvement` — generates common missing words per language (for pool expansion
  if a language's fill pool is too thin).
- Fill pools already exist: `backend/common_hunt_words_{es,sv,ja}.txt` (es 313 / sv 449 / ja 97
  words of 3-5 chars).
- es/sv are Latin 5-letter → reuse `EN_TEMPLATES_5`. No new grid model.

## Plan (commit per phase, ask before each commit)

### P1 — Keystone fix + Hebrew repair (the user's actual pain). HIGHEST PRIORITY.
- Make `isCircularClue` Unicode-aware: tokenize on non-letter via `\p{L}+/gu`, lowercase, compare
  whole tokens + substring + shared-stem. Now fires for he/es/sv/ja.
- TDD: failing test proving Hebrew circular passes today → fix → green.
- Re-clue the 146 circular + 9 sofit Hebrew entries via `crossword-clue-craft` (proper definitions
  that never contain the answer; correct sofit forms in display text). Re-run the gate over the
  whole HE bank; assert 0 circular, 0 sofit-corrupt remain.
- Find & fix the build step that normalized clue *text* (sofit leak) so regeneration can't
  reintroduce it.

### P2 — Spanish + Swedish clue banks (high ROI, reuses everything).
- Build `clueBank.es.json` / `clueBank.sv.json` via `crossword-clue-craft` from the existing word
  pools (expand via `dictionary-improvement` only if generator success rate is too low).
- Wire `genLocaleFor` to route es→es, sv→sv (load the new banks). Templates: try `EN_TEMPLATES_5`;
  drop to 4×4 if the pool is too thin to fill a doubly-checked 5×5 (measure: generate 40 puzzles,
  want >90% success like en).
- Charset: confirm CSP filler treats ñ/å/ä/ö as opaque single cells (it's charset-agnostic — Hebrew
  proves it). One accented letter = one cell.

### P3 — Japanese decision.
- ja pool is hiragana, only 97 words 3-5 kana — thin + different cell model (one kana/cell).
- Attempt: hiragana on 4×4; expand pool via `dictionary-improvement` if needed. If quality puzzles
  don't materialize cheaply, keep EN fallback **documented as known gap** rather than ship garbage.
  Decision recorded in the phase commit.

### P4 — UX/UI glowup (impeccable + frontend-design skills, claude design).
- Apply to `components/crossword/*`. Neo-brutalist house style (cyan = single-player family).
- Keep RTL correct for Hebrew. Mobile + TV/party screen. Unique, not generic crossword chrome.

### P5 — Tests.
- Unicode gate tests (he/es/sv circular caught).
- Per-language generation smoke: `generateDailyPuzzle` for each shipped locale returns a fully-clued
  puzzle whose clues pass the gate (no clue contains its answer).
- Bank invariant test extended to all banks: 0 circular, 0 over-length, 0 sofit-corrupt (he).

## Findings update (during implementation)

- **Real-data requirement (user):** clues must be grounded in real datasets, not LLM-invented. The
  organized multilingual source is **kaikki.org** (machine-readable Wiktextract of Wiktionary) —
  clean POS-tagged glosses per word (verified es/sv/he). Pipeline: real gloss → LLM *rephrases* into
  a native clue → dual-judge → gate. Mirrors the existing EN Datamuse pipeline. Every clue traces to
  a Wiktionary sense. (Wiktionary `/page/definition/` REST is EN-only — 501 elsewhere; the action
  API `extracts` works but mixes etymology in, so kaikki is preferred.)
- **HE reground = verify-pass, not redo.** P1's LLM-crafted HE clues are tested-clean; reground only
  replaces clues that don't match the real gloss (cheaper, keeps validated work).
- **H/V switch is a discoverability gap, not functional.** `gameState.ts:75` already flips
  across↔down on re-tapping the active cell; arrow keys + `onToggleDir` are wired. P4 adds a
  *visible, labeled* direction-toggle control.
- **Key-normalization bug fixed (bonus):** the HE bank had 132 keys ending in final (sofit) form vs
  44 folded — duplicates of the same word. A final-form key yields a final-form grid solution that
  never matches the player's normalized input. Deduped all keys to folded canonical form (754→736);
  `displayLetter()` re-applies finals at render. Fixes latent answer-checking breakage.
- **ja deferred:** hiragana entries soft-redirect to kanji in Wiktextract; kana-grid model
  unverified; 97 words. Keep EN fallback, documented.

## Definition of done
- Hebrew daily/freeplay: 0 circular, 0 sofit-typo clues.
- es + sv: own banks, generator >90% success, clues pass the Unicode gate.
- ja: shipped or explicitly documented defer with a follow-up.
- Crossword UI visibly glowed up, RTL intact, lint+test+build green.
