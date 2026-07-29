# Spanish dictionary — targeted expansion run

## Why targeted (investigation summary)
- Base list `an-array-of-spanish-words` ≈ 636,598 words — comprehensive on conjugations, plurals, common nouns/adjectives/adverbs, and even slang (guay/vale/chaval).
- The accented-word rejection bug (null gameLanguage → English regex) is FIXED + deployed (`ff9b2803c`); no `UnresolvedGameLanguageError` in Sentry.
- `invalid_word_submissions` (es) is ~90% Boggle-drag noise; verify→promote cron is alive (verified same day).
- Genuine gaps are NARROW + productive: diminutives, augmentatives, colloquial/regional vocab, some derived forms.

## This run
- Generated across 5 gap classes:
  - diminutives: 96 raw
  - augmentatives: 62 raw
  - colloquial-regional: 74 raw
  - derived-forms: 61 raw
  - everyday-gaps: 68 raw
- Unique clean+novel pool: **340**
- Dual-judge survivors (strict editor AND native speaker, both ≥0.75): **273**
- New candidates appended to candidates/es.txt: **235** (total now 428)

## Sample of survivors
casita, perrito, gatito, ratito, poquito, solito, cafecito, panecillo, ventanilla, chiquito, ahorita, cerquita, despacito, momentito, platito, trocito, pinguino, niñito, abuelita, abuelo, vasito, platano, manecilla, mosquito, pajarito, ramita, flotilla, faldilla, chiquilla, zapatilla, rodilla, campanilla, banquillo, moneda, monedilla, mesilla, casilla, banquito, palito, lengueta, boquilla, mañanita, tardecita, noticilla, florecilla, libreta, pececillo, carretilla, barquilla, tortilla, tortillita, chiquita, flaquita, blanquita, limpita, rapidita, chiquillada, osito, cachorrillo, paletilla

## Delivery
Appended to `fe-next/backend/dictionary/candidates/es.txt`. They enter the backend verify→promote→heal pipeline
(Wiktionary-es deterministic verification + offensive filter) via the proactive-discovery cron.
Only externally-verified, non-offensive words are promoted into `word_scores` and become valid in-game.
