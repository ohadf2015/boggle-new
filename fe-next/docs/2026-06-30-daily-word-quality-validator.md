# Daily Word Quality Validator + Word Meaning

> 2026-06-30. Trigger: Hebrew daily Word Hunt served `קובורג` (Coburg, a German city). History shows ~40% of recent he words were proper nouns / inflected fragments. Root cause: `daily_target_words` are picked from `daily_challenge_word_bank`, which the nightly `wikipedia-words` job seeds from Wikipedia/current-events titles (cities, people, countries, deities) with no familiarity gate. The single-word AI validator explicitly ACCEPTS proper nouns.

## Goals
1. **Selection fix** — a daily target must be a common, familiar, fun-to-reveal word; never a proper noun / niche / inflected fragment / broken orthography.
2. **Nightly validation** of the next 7 days per language; replace bad words automatically.
3. **Word meaning** shown on the daily results page (win + fail states), all 6 locales, RTL-safe.
4. Today + current week-ahead fixed immediately.

## Design

### Bad-word definition (single source of truth)
Reuse the criteria already in the bulk-generation prompt (`lib/ai-service/generation.ts:150-151` — "NO proper nouns/brand/person/place names", "NO transliterations/loanwords"). The judge and the generator MUST share these. A daily word is GOOD iff:
- Common vocabulary a casual native speaker knows (not technical/archaic/niche).
- A base dictionary form, not an inflected fragment (`יעילותו`, `מטוסי`, `הדרומית`).
- Correct orthography (no nikud, correct Hebrew final letters).
- NOT a proper noun: city/country/person/brand/deity/mythological name.
- Length 5–7 (ja 2–4) — already enforced upstream.
- "Fun to reveal" — concrete, evocable, picturable where possible.
- **No repeats** — replacement must not equal any word used in the last 30 days (extend window if needed) and must not duplicate another word in the same 7-day batch.

### New AI judge — `judgeDailyWord(word, language) → { ok, reason, meaning }`
- In `gameAIService` (Vertex AI), new strict prompt. Returns verdict + a short (≤8-word) kid-friendly **meaning in the word's own language** (byproduct → feeds Goal 3).
- `ok=false` for any rejection reason above.

### Nightly job — `validate-upcoming-daily-words` (BullMQ, `backend/queues/cronQueue.ts`, `30 1 * * *`, after `daily-word-selector`)
For each language × puzzle_date in [today .. today+7]:
1. Load served word (`override_word || target_word`). **Skip rows with a human override** (`override_by IS NOT NULL`) — never stomp admin fixes.
2. If already validated (`validated_at` set & `meaning` present) and word unchanged → skip (idempotent).
3. Judge it.
   - **GOOD** → store `meaning`, set `validated_at`. Done.
   - **BAD** → block it in the bank (`status='blocked'`), then find a replacement:
     a. Pull N active bank candidates for the language (length-correct, not used last 30 days).
     b. dict-validate each against the game dictionary (cheap, kills broken-orthography & non-words). Memory: generated/scraped words hallucinate — dict-validate is mandatory.
     c. judge survivors; take the first GOOD one. Block the judged-out ones (cleans bank).
     d. **Generate the grid for the replacement and confirm success BEFORE committing** (serve-time silently falls through to a different word for ungriddable/over-length overrides → would desync meaning↔word — Class 4).
     e. Commit: `override_word`, `meaning`, `validated_at`, `word_source='validator'`, `override_by=NULL` (distinguishes from human), null+regenerate grid (or persist the grid we just generated).
   - If no bank passer → fallback `generateBulkWords` (dict-validate + judge + grid-check the same way); if still none → leave word, **alert** (no silent no-op — Class 4).
4. Alert (telegram/log) on any failure; assert plausible row counts.

### Word meaning storage + display
- Migration: `daily_target_words.meaning text`, `daily_target_words.validated_at timestamptz`.
- Plumb `meaning` through the runtime path that already carries `targetWord` to the result screen (path TBD — see Phase D).
- Result page: show meaning under the revealed target word. Win: `components/daily/results/ResultDisplay.tsx`. Fail: `components/daily/WordHuntResultsContent.tsx`. New key `wordHunt.results.meaning` in all 6 locales.

### Immediate fix
- DONE: today he `קובורג`→`גלידה` (override_word).
- Run the validator over the current 7-day window (manual trigger endpoint) to fix the rest + backfill meanings.

### Player word suggestions
- `daily_word_suggestions` table (pending/approved/rejected/duplicate). RLS on, no policies — service-role API only.
- `POST /api/daily-challenge/suggest-word` (Express, `backend/routes/dailyChallenge.ts`): validates language + length (5–7 / ja 2–4) + `validateGameWord`, caps pending per submitter, inserts pending (unique partial index dedupes).
- `SuggestWordCard` on the Word Hunt results page (6 locales).
- Nightly: `processSuggestions` (pure, DI) judges pending suggestions with the SAME `judgeDailyWord` gate (+ length + recency); approved ones are placed on the furthest open future slot (today+2..+7, machine-owned only), marked approved with `used_date`+`meaning`; bad ones marked rejected with reason. Runs BEFORE the window validation so placed words are skipped idempotently. Capped per language per night.

## Out of scope (follow-ups)
- One-time full bank sweep (blocking-on-encounter converges it gradually).
- Gating/cleaning the `wikipedia-words` populator at source.
- LLM-authored meanings can be imperfect; acceptable for a casual game, gated by the same judge. `ponytail:` known ceiling.
