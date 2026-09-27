# Spec: Add Russian (ru) — Full Game + Game Modes + Russian Landing Pages

**Date:** 2026-06-30
**Goal:** Add Russian as the 6th language across the whole game and all game modes, and create Russian landing pages targeting relevant Russian search keywords.

Russian is **LTR** (Hebrew is the only RTL locale) → no RTL plumbing touched.

---

## Verified requirements (3 workstreams)

### A. Game playability (backend mechanics — the part that makes ru *playable*, not just translated)
- **Word dictionary** — no Russian word source in repo. Must source externally. `backend/russian_words.txt` (UTF-8, one word/line). Cyrillic encoding already proven (Hebrew/Japanese ship non-Latin).
- **Letter pool** — `backend/utils/gameUtils.ts`: add `russianLetters` (33 Cyrillic А–Я + Ё, vowels weighted) + `else if (language === 'ru')` in `generateRandomTable` (~L246).
- **Density** — `backend/utils/boardSelection.ts` `LANG_DENSITY`: `ru: 1`.
- **Dictionary class** — `backend/dictionary.ts`: `russianWords: Set<string>` field + `case 'ru'` in ctor (~L131) and `loadLanguage` (~L240).
- **Loader** — `backend/dictionaryLoaders.ts`: `loadRussianDictionary(safeReadFile)` (copy Spanish pattern).
- **Word Hunt pool** — `backend/modules/wordHuntManager.ts` FILE_MAP: `ru: 'common_hunt_words_ru.txt'` (~600 curated words; mode falls back without it).
- **Daily themes** — `backend/data/dateThemedWords.js`: `ru` entry in `dayOfWeekThemes` + holidays.
- **Dict pipeline** — `backend/dictionary/candidates/ru.txt`, `gold/gold_valid_ru.txt`, `gold/gold_invalid_ru.txt` (empty; auto-populate).
- **Client dict bundle** — `scripts/build-dict-assets.ts`: `ru` source → `public/dicts/ru.dict.gz`.
- Modes: classic / blast / word-hunt / wheel-rush all work once dict+letters exist. `shiritori` is ja-only (skip).

### B. UI locale plumbing + translation
- **Core config (must-edit, missing one = silent 404/fallback — Class 3 asymmetric paths):**
  - `i18n/config.ts` L6 (locales + Locale type)
  - `proxy.ts` L5 (VALID_LOCALES)
  - `app/sitemap.ts` L5 (LOCALES)
  - `app/not-found.tsx` L13
  - `lib/languageConfig.ts` L60 SUPPORTED_GAME_LANGUAGES + L18 LANGUAGE_CONFIG (`ru: {flag:'🇷🇺', name:'Russian', nativeName:'Русский'}`)
  - `app/[locale]/layout.tsx` L89/L96 (Locale union + SUPPORTED_LOCALES + ogImageMap/ogImageAltMap + font wiring)
  - `shared/types/game.ts` Language union (add `'ru'`)
  - `shared/schemas/socketSchemas.ts` L60 LanguageSchema z.enum
  - `lib/localeResolution.ts` SUPPORTED_LOCALES (+ optional LOCALE_PROXIMITY ru→en)
  - `contexts/LanguageContext.tsx` FLAG_BY_LANGUAGE
- **~40 page-level duplicated `const LOCALES = [...]`** — grep `'ja', 'es']` and add `'ru'`. Verify-check: zero arrays end `'ja','es']` without ru. **Do NOT refactor to a central constant** (scope creep / out of goal) — deferred debt.
- **Translation file** — `translations/ru.js` (~600KB, matches en/he). Built via complete-translation tooling, NOT hand. Wire `translations/index.js` import + `translations/loadTranslation.ts` `case 'ru'`.

### C. Landing pages + SEO (Russian keywords)
- `app/[locale]/(home)/page.tsx` L24-40: `ru` titleMap/keywordsMap/descriptionMap.
- `translations/layout.ts`: `ru` block (40+ page metadata entries).
- `components/landing/landingSEOContent.ts`: `ru` bundle (8 sections).
- `app/[locale]/education/seoContent.ts`: `ru` entry.
- `app/[locale]/word-of-the-day/content.ts`: `ru` words (≥25 curated).
- **New Russian-keyword landing pages** (ru-indexed, noindex elsewhere — copy `bell-ringer-word-games` pattern):
  - `slovo-dnya` (слово дня — daily word, high volume)
  - `igry-v-slova-onlayn` (игры в слова онлайн — core game intent)
  - education variant (игры для класса)
- `app/sitemap.ts`: ru in LOCALES + langAlternates + new landing routes + 0.9 home priority.

---

## Resolve-first decisions (gate the rest)

### 1. Fonts — Cyrillic blocker (CONFIRMED)
Fonts are **local woff2 subsets** (`app/fonts.ts`), not Google CDN. No Cyrillic glyphs on disk. `latin-ext` ≠ Cyrillic.
- **Body (Rubik):** Rubik upstream has Cyrillic → generate `public/fonts/rubik-cyrillic.woff2`, add as `rubikCyrillic` localFont, wire for `ru`.
- **Display (Fredoka):** Fredoka has **no** Cyrillic on Google Fonts. Use **Baloo 2** (rounded, chunky, kawaii-adjacent, has Cyrillic) → `public/fonts/baloo2-cyrillic.woff2` as the `ru` display font. Fallback chain keeps system-ui.
- `app/[locale]/layout.tsx`: `ru` → cyrillic display + body vars (mirror the `he` branch that swaps font families).

### 2. Dictionary source (CONFIRMED approach)
- `russian-words` npm = 97,035 (too few / lemma-ish → would reject inflected forms players type). **Rejected as primary.**
- Use a large **inflected-forms** list (`wordlist-russian` npm or danakt/russian-words 1.5M GitHub). Filter: 3–15 Cyrillic chars only, lowercase, strip proper nouns / single letters / profanity, dedupe. **Target ≥300k** (Hebrew=351k floor). Spot-check 5 common words (игра, слово, дом, кот, книга) validate.

### 3. Keywords
Use reasoned Russian clusters; validate volume with Ahrefs MCP if auth works (non-blocking). Native phrasing, not transliteration: `игры в слова`, `найди слова`, `игра в слова онлайн`, `слово дня`, `словесные игры`, `буквы слова`, `составь слова из букв`.

---

## Phasing (dependency order, commit per phase)
0. **Foundations** — fonts (Cyrillic subsets + wiring), dictionary sourced→`russian_words.txt` + hunt pool.
1. **Locale plumbing** — core config + ~40 grep pass + ru.js stub wiring.
2. **Game layer** — backend dict/letters/density/loader/build-script/themes/pipeline.
3. **UI translation** — ru.js via tooling.
4. **Landing/SEO** — home/layout/landing/education/word-of-day + new ru landing pages + sitemap.
5. **Verify** — lint0/tsc0/build0/tests; run /ru: board renders Cyrillic, valid Russian word accepted, landing renders in correct font.

## Commit hazard (own memory)
Editing `translations/*`, `experiments.ts`, `growthTracking.ts` trips pre-push `--changed` into whole FE suite (540s+) + surfaces pre-existing unhandled rejections. New `ru.js` safer (new file). Surgical isolate-commit per phase; `--no-verify` only after independent tsc0/lint0/build0/tests-green.

## Out of scope / deferred
- Central-locale-constant refactor (the ~40-file dup) — note, don't fix.
- shiritori for ru (ja-only mode).
- Curated daily/hunt content quality pass — needs native fluency (ux-writer); modes fall back without it.
