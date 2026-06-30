# Dictionary-sourced word meanings — research + spec

**Date:** 2026-06-30
**Goal:** enrich daily-word meanings with real dictionaries (authoritative, native-language
definitions) instead of relying only on the LLM judge — and document which online sources
are usable per language.

## Problem

Today the only meaning surface is `daily_target_words.meaning`, shown on the daily results
page. It is filled by the LLM judge (`judgeDailyWord`, Vertex) which emits a short
definition *in the puzzle's own language*. Two issues:

1. **Hebrew has NO meaning at all** — `wordMeaningPolicy.NO_MEANING_LANGUAGES = {'he'}`
   suppresses it because the LLM's Hebrew definitions were consistently low-quality.
2. LLM definitions are unsourced (possible hallucination) and cost Vertex time
   (~0.7 words/s serialized).

A real dictionary fixes both — *if* it provides a **native-language** gloss (a Hebrew word
needs a Hebrew definition, not English).

## Research — what's online, per language

The hard constraint is **native-language glosses**. That eliminates most "multilingual
dictionary APIs", which gloss every language **in English** (they all source the *English*
Wiktionary).

| Source | Coverage | Gloss language | Access | License | Verdict |
|---|---|---|---|---|---|
| **freedictionaryapi.com** | en/he/sv/ja/es/ru + more | **English only** (en-Wiktionary) | REST, no key, 1000/hr | CC BY-SA 4.0 | ❌ non-native for he/es/ja/ru/sv |
| **dictionaryapi.dev** | en | English | REST, no key | CC BY-SA | en only |
| **en.wiktionary `/api/rest_v1/page/definition`** | en (+ translingual) | English, **structured** (POS + senses) | REST, no key | CC BY-SA 3.0 | ✅ **en** (needs POS filter + HTML strip) |
| **`<lang>.wiktionary.org` action API `prop=extracts`** | per edition | **native** | REST, no key | CC BY-SA 3.0 | ✅ **he** (clean); ❌ es/ja/ru/sv/en (extract returns etymology/morphology headers, not the gloss — structure differs per edition) |
| **kaikki.org / wiktextract** (bulk JSONL) | en/es/ja/ru editions published; he/sv NOT published | native, structured `senses[].glosses` | bulk download (100s MB) + lemma map | CC BY-SA | ✅ reliable for es/ja/ru/en — **phase 2** (data-engineering: download + inflection→lemma) |
| **JMdict** (EDRDG) | ja | JP→**English** (not native) | bulk XML | CC BY-SA 3.0 | ❌ non-native for our use |
| Lexicala / PONS / Merriam-Webster | multi | native | paid / non-commercial | proprietary | ❌ license/cost |

### Key findings (verified live)

- `he.wiktionary` extracts are **uniformly clean**: page intro is
  `== HEADWORD ==\n\n<definition>`. Verified on window/book/tree/water/child — each returns
  one native Hebrew sentence. `exsentences=1` truncates. This is the high-value slice: it's
  the *only* zero-meaning language and the on-demand source is clean.
- `en.wiktionary` rest_v1 gives structured senses but the first POS block is often
  `Symbol`/`Letter` (translingual junk) and definitions carry HTML — filter to lexical POS
  (Noun/Verb/…) + strip tags.
- `es/ja/ru/sv`: the **intro** extract (`exsentences`) returns Etimología / 漢字 / Морфология,
  NOT the gloss — but the **full** plaintext extract has a learnable section structure, so
  walking `== lang ==` → POS subsection → first real line recovers the native gloss reliably
  (see Scope below; 48/48 live). No bulk download needed.
- No single uniform free *API* gives native glosses for all 6 languages — but a per-edition
  parser over the action API's full extract does.

## Decision

**On-demand, dictionary-first → LLM-fallback.** Meanings are only displayed for the tiny set
of *served* daily words (~1/day/lang), so per-word on-demand fetch is the right tool — no
bulk download, no lemmatization infra. `daily_target_words.meaning` is the cache (only
re-fetched when a slot's meaning is (re)filled).

Resolution order at every meaning write site:
1. `fetchWiktionaryMeaning(word, lang)` — native dictionary gloss.
2. else LLM `verdict.meaning` (existing) — keeps Hebrew suppression (bad LLM Hebrew).

Dictionary meanings **bypass** the Hebrew suppression (verified good); LLM meanings keep it.

### Scope — all 6 languages (on-demand, fail-soft)
Each edition's plaintext extract has a learnable structure, so a single section-tree walker
(`== lang ==` → first POS subsection → first non-noise line) + small per-edition rules covers
all of them. Live smoke (8 common words/lang, 2026-06-30): **48/48 native definitions**.

- `he` → `he.wiktionary` extract: line after the `== HEADWORD ==` header (`exsentences=1`).
- `en` → `English` → `Noun/Verb/…`; skip headword/`Terms relating to…` nym/`Synonyms:`; strip
  `(countable)` labels + `[from 9th c.]` tags.
- `es` → `Español` → `Sustantivo/Verbo/…`; the gloss is the line **after** the first `N <topic>`
  numbered sense.
- `sv` → `Svenska` → `Substantiv/…`; skip headword + `uttal:`; first prose line.
- `ja` → `日本語` (not `漢字`) → `名詞/…`; strip leading `（reading）` groups.
- `ru` → `Русский` → explicit `Значение` section; strip `зоол.`-style domain labels; cut at `◆`.

Anything uncertain → null → LLM fallback. `daily_target_words.meaning` caches the result, so a
Wiktionary call fires only when a slot's meaning is (re)filled.

### Backfill note
The validator is idempotent (skips already-validated rows), so existing rows keep their old LLM
meaning until re-validated. New/changed slots get dictionary meanings on the nightly cron; run a
one-off `runUpcomingWordValidation` (or clear `validated_at`) to backfill near-term slots.

### Phase 2 (deferred)
If on-demand quality/coverage proves insufficient for a language, swap that language's source to
bulk **wiktextract** (kaikki, structured `senses[].glosses`) behind the same
`fetchWiktionaryMeaning` seam — local file instead of HTTP.

> Note: this lookup runs **server-side** (Node/undici), where a custom `User-Agent` and
> cross-origin fetch are allowed. It returns null in a browser-like env (jsdom/happy-dom forbids
> setting `User-Agent`) — so the network smoke must run in a node test env.

### Attribution
CC BY-SA credit (`wordHunt.results.meaningSource` ×6 locales) shows under every displayed
meaning on the results card. Since served daily words are common base forms, dictionary hit-rate
is ~total; the rare LLM fallback shares the generic source credit (acceptable de minimis — for
strict per-row provenance, add a `meaning_source` column and gate on it).

## Implementation

- **New** `lib/dictionary/wiktionaryMeaning.ts`
  - `fetchWiktionaryMeaning(word, lang): Promise<string|null>` (he + en; others null).
  - Pure, tested: `parseHebrewExtract`, `parseEnglishRestDefinition`, `cleanMeaning`,
    `stripHtml`.
  - Polite MediaWiki etiquette: descriptive `User-Agent`, 8s timeout, fail-soft → null.
- **Wire** `backend/modules/dailyWordValidator.ts` runner (impure layer; pure orchestrator
  `validateUpcomingWords` stays network-free). A shared `resolveMeaning(word, lang, llm)`
  helper does dict-first + policy; used by `saveMeaning`, `saveReplacement`, and suggestion
  `placeWord`.
  - `saveMeaning` gains a `word` param (it couldn't know its own word before).

## Attribution

CC BY-SA requires attribution. Add a one-line "definitions from Wiktionary (CC BY-SA)"
credit near where meanings are shown on the daily results card.

## Non-goals
- Enriching the full 142k/301k word banks (not displayed anywhere; only served words show a
  meaning). Revisit only if a meaning surface is added for non-daily words.
