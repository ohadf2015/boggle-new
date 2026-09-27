# Japanese dictionary coverage expansion — 2026-06-20

Goal: "improve our japanese dict make it cover more."

## Baseline (measured)
- Validation set = `backend/japanese_words.txt` (9,629 base) + `backend/japanese_words_approved.txt` (200,792, JMdict import) = **210,357 hiragana words**.
- Boards are **hiragana-only**; kanji compounds seed hints only, never validated as plays.

## Two data-justified gaps

### Gap A — Android-fallback validator rejects the entire base corpus (bug)
`app/api/dictionary/check/route.ts` (Capacitor/Android fallback when IndexedDB cache is unavailable)
loads `kanji_compounds.txt` + `japanese_words_approved.txt` for `ja` — but **NOT** `japanese_words.txt`.
- Measured: **9,565 / 9,629** base words are absent from approved → silently rejected on that path.
- Kanji compounds can never appear on a hiragana board → loading them is pure waste (and a theoretical false-accept).
- Primary loader (`backend/dictionaryLoaders.ts loadJapaneseDictionary`) correctly loads base + approved → the two paths disagree.

**Fix:** load `japanese_words.txt` + `japanese_words_approved.txt`; drop `kanji_compounds.txt`. Matches the primary loader.

### Gap B — conjugated forms missing (systematic)
JMdict is a **lemma** dictionary; the import kept only `<reb>` readings, discarding `<pos>`.
So inflected forms are absent. Measured probe: **23 / 39** common conjugations missing
(たべた ate, のんだ drank, たべます, たかかった …). Trivially formable on a hiragana board.

**Fix:** derive conjugations deterministically from JMdict POS:
- `lib/jmdict/conjugate.ts` — pure conjugator. Ichidan (`v1`), godan (`v5u/k/g/s/t/n/b/m/r`), i-adjective (`adj-i`).
  Conservative core forms only (past, neg, polite, polite-past, te, past-neg; adj: past/neg/te/adv/past-neg).
- **Skip irregular/special POS** (`v5k-s`, `v5r-i`, `v5aru`, `vs-i`, `vs-s`, `vk`, `adj-ix`) → mint zero junk.
- Guard: reading must end in the okurigana expected for its class (blocks conjugating noun readings on `vs` compounds).
- `lib/jmdict/readings.ts` — add `parseJmdictInflectables(xml)` → `{reading, posClass}[]` from each entry.
- `scripts/derive-japanese-conjugations.ts` — download JMdict, derive, dedup vs existing 210k, append to approved, report.
- Then `scripts/build-dict-assets.ts` regenerates `public/dicts/ja.dict.gz`.

## Safety
- Conjugations are generated from authority (lemma + declared verb class), not guessed.
- All output re-checked `isHiraganaWord`.
- Skipping special POS = conservative coverage, no pollution.
- The `dictionary-improvement` skill workflow runs in parallel: a small colloquial top-up into the
  `backend/dictionary/candidates/ja.txt` queue, gated by the backend verify→promote→heal pipeline.

### Trust-gate decision (deliberate deviation)
Derived conjugations are written **directly** to `japanese_words_approved.txt`, BYPASSING the
candidate→verify→promote→heal pipeline (Jisho/Wiktionary) that the LLM-generated candidates flow
through. This is intentional and matches the existing **JMdict-import precedent**
(`import-jmdict-readings.ts` also appends straight to approved): a deterministic derivation from an
authoritative lemma + its declared verb class is the same trust tier as the raw JMdict reading import —
not an LLM guess that needs external corroboration. The for-validation-only nature also makes the
asymmetry favourable: a rare-but-real false-accept costs ~nothing (unformable / merely accepted if
typed), whereas the false-rejects we removed are what actually frustrated players.

## Verification
- TDD on the conjugator (textbook examples per class).
- Dry-run derive against current dict; report new-word count + dedup rate.
- `npm run lint`, `tsc --noEmit`, conjugator tests green before commit.

## Results (shipped 2026-06-20)
- **Conjugations:** 15,614 conjugatable JMdict entries → 14,846 lemmas → 79,751 distinct forms;
  after dedup vs the existing 207,939, **+79,113 NEW** validation words.
  Approved file: 200,792 → 279,905 lines. `ja.dict.gz`: 888 KB → 1.14 MB (287,113 words).
- **Probe gap closed:** 21/23 previously-missing common forms now derived by rule;
  the remaining 2 (します, いかない) covered by the explicit irregular table (する/くる/いく).
  0 non-hiragana forms emitted. POS disambiguation verified (v1 かえる→かえた vs v5r かえる→かえった both correct).
- **Bug fix:** `/api/dictionary/check` ja branch now loads base + approved (drops kanji) → ~9,565
  base-only hiragana words no longer rejected on the Capacitor/Android fallback path. 3 integration tests.
- **Skill workflow** (`dictionary-improvement`, lang=ja): generated 67 → dual-judge kept 60 → 34 appended
  to `backend/dictionary/candidates/ja.txt` (queue feed for the verify→promote→heal cron).
- Tests: 34 new green (31 jmdict + 3 route). Full dict/japanese risk surface green:
  backend 74, frontend 126. Full backend suite 3203 pass (1 unrelated `test.supabase.co` DNS flake).
  Full frontend suite 27,518 pass; 31 fails are all pre-existing baseline-red in unrelated areas
  (CookieConsent, loading-layout, achievements, growthTracking, blast tile-gen, i18n keys) — zero
  overlap with the 7 touched files. Lint + tsc clean on touched files.

## Re-run
```
npx tsx scripts/derive-japanese-conjugations.ts        # idempotent; dedups vs existing
npx tsx scripts/build-dict-assets.ts                   # regenerate public/dicts/ja.dict.gz
```
