# Dictionary improvement run

Languages: en, es, sv, he, ja (ru has no committed candidates) · per-language cap: 60

Counts below are from `git diff` on the candidate files, not from the run's own summary. The run summary reported 0 new candidates for every language, which does not match the working tree.

- **en**: 81 uncommitted candidate lines added (e.g. okayed, apps, anyway, chill)
- **es**: 90 added (e.g. quiero, parte, tienes, atras, publico)
- **sv**: 74 added (e.g. död, dagar, färg, förlora)
- **he**: 90 added (e.g. אות, אותה, אותי)
- **ja**: 21 added (e.g. のり, ことば, かぎ)
- **ru**: 0 in the repo. `fe-next/backend/dictionary/candidates/ru.txt` is empty. A 149-word list (`ru_new.txt`) sits in the session scratchpad and was never merged.

Total new candidate lines in the working tree: 356 (uncommitted).

## Special-letter check (requested)

- **es: failing.** 88 of the 90 added words have no accent or ñ. Words that need one, such as atrás, público, añejo and anémona, were added unaccented. Across the whole es.txt only 19 of 1415 lines carry an accent. These entries need the accented spelling before they are committed.
- **ru: not yet produced in the repo.** The scratchpad list is pure Cyrillic (0 non-Cyrillic lines), so it is correct for the letters, but it has not been merged into ru.txt.
- **sv, he, ja:** added entries use the native script and the Swedish å/ä/ö where expected.
- **en:** ASCII, as expected.

## Next

- Re-generate es with accented forms, or correct the 88 unaccented entries, before any commit.
- Merge ru_new.txt into ru.txt after a Cyrillic-only check.
- Commit candidate files only after the es fix; the backend verify→promote→heal pipeline takes it from there, and only externally verified, non-offensive words reach gameplay.
