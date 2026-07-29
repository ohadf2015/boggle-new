# Blast v2 — Plan 6: Content Authoring (Stream G) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. This is a content-heavy plan; tasks run in parallel (5 locales × 3 content types + asset generation). Content validation replaces unit-test cycles; manifest assertions verify output integrity.

**Goal:** Author 150 hand-curated level JSON files (30 levels × 5 locales), generate 25 theme background images via fal-ai/flux, create ~1200 translation entries across 5 language files, expand theme word pools from seeds to ~50 words per theme per locale, wire real bonus-dictionary loaders, and establish Hebrew ambiguous-word blocklist. **This is the content milestone — day-1Blast v2 ships fully playable in all 5 locales with authored levels 1-30, theme art, and native-review-ready strings.**

**Architecture:** Mostly async work: scripts generate/author content, then write to committed JSON/JS files or fal-ai CDN. No runtime code changes. Plan 6 tasks are **content production** (not engineering), so acceptance criteria are file assertions + manifest validation rather than TDD cycles. However, admin CLI (`scripts/blast-author.ts`) and generator-audit (`scripts/blast-generator-audit.ts`) get full TDD. Native-review markers (`// native-review-pending: 2026-05-12`) flag non-EN translations for async approval before Plan 7 rollout.

**Tech Stack:** TypeScript, Node.js, Zod (validation), fal-ai/flux (image gen), existing dict loaders from Practice/SP modes, mcp-image (brand-style asset generation). Commit strategy: 1 commit per locale per content type, e.g. `feat(blast-v2): EN curated pack levels 1-30 (Plan 6 Task 7)`.

**Spec reference:** `docs/superpowers/specs/2026-05-12-blast-mode-redesign-design.md` — sections "Data Model + Content Sources" (day-1 footprint, CuratedPackSource JSON shape, generator algorithm), "Visual Identity + Backgrounds" (theme art pipeline, fal-ai/flux), "Locale Strategy" (per-locale rules, authoring strategy, ~80 keys × 5 locales = ~400 translation strings), "Tutorial Implementation" (~175 tutorial strings), "Incremental Mechanic Unlock Ladder" (mechanic gates for unlocking, inform level design).

**Plan 1 reference:** `LOCALE_CONFIGS[locale]` with `themes: Record<ThemeKey, ThemeDef>` and theme seed pools, `bonusDictionary: () => Promise<Set<string>>` stub (to be wired), `HE_AMBIGUOUS_BLOCKLIST` empty set (to be filled). Generator quality gate: `interestingnessScore >= 0.55`.

**Plan 2 reference:** Placeholder i18n calls like `t('blast.intro.title', fallback)` scattered in components — Plan 6 authors the keys in `translations/<locale>.js` to replace fallbacks.

**Out of scope:**
- Engineering new systems or refactoring existing code — Plan 6 is pure content + integration of existing loaders
- Pixi FX asset production for Plan 4 (assigned to Plan 4 Task 0)
- Avatar grant + boost grant pipeline (no implementation; chest preview only)
- Curated packs beyond level 30 (generator handles 31+)
- PostHog dashboard SQL (Plan 7 responsibility)

**Integration corrections from spec (real paths verified 2026-05-12):**
- Translation file format: `translations/<locale>.js` exports `export default { ... }` (NOT `.json`). Structure: nested object `{ blast: { intro: { ... }, ... } }`, accessed via `useLanguage().t('blast.intro.title')`. HE/SV/JA/ES files use native-review marker comment at top of new sections.
- Per-locale dict loaders: confirmed exist in `lib/dict/` or `lib/dictionary/` (used by Practice, SP). Plan 6 imports and wires into `LocaleConfig.bonusDictionary` for each locale.
- mcp-image usage: see memory `practice-friendly-polish-2026-05-05` shipped 7 kawaii images via mcp-image. Use same pattern for theme art + FX assets.
- CuratedPackSource JSON path: `content/blast/packs/<locale>/pack-<theme>.json`. Example: `content/blast/packs/en/pack-fruits.json`.
- Deterministic seeding for generator audit: Plan 1's `hashStringToSeed(s)` → `seededPRNG(seed)` for reproducible level generation.

---

## File Structure

| File | Purpose |
|---|---|
| `scripts/blast-author.ts` | Admin wizard CLI: interactive level authoring + batch mode |
| `scripts/gen-blast-theme-art.ts` | Offline fal-ai/flux theme image generator (25 themes) |
| `scripts/blast-generator-audit.ts` | Generator quality audit: regen rate, interestingness distribution |
| `content/blast/packs/en/pack-*.json` | 6+ curated EN packs (onboarding, fruits, animals, food, ocean, space…) |
| `content/blast/packs/he/pack-*.json` | 6+ curated HE packs (RTL, final-form, ambiguous-blocklist applied) |
| `content/blast/packs/sv/pack-*.json` | 6+ curated SV packs |
| `content/blast/packs/ja/pack-*.json` | 6+ curated JA packs (hiragana only) |
| `content/blast/packs/es/pack-*.json` | 6+ curated ES packs |
| `lib/blast/v2/locales/en.ts` | Extend THEMES pool from seeds (~3-8 words) to ~50 per theme |
| `lib/blast/v2/locales/he.ts` | Expand theme pools + fill `HE_AMBIGUOUS_BLOCKLIST` |
| `lib/blast/v2/locales/sv.ts` | Expand theme pools |
| `lib/blast/v2/locales/ja.ts` | Expand theme pools (hiragana only, V1) |
| `lib/blast/v2/locales/es.ts` | Expand theme pools |
| `lib/blast/v2/bonus-dict-loaders.ts` | NEW: wire per-locale dict loaders; exports `bonusDictLoaders: Record<Locale, () => Promise<Set<string>>>` |
| `translations/en.js` | Add ~240 new keys under `blast.*` namespace |
| `translations/he.js` | Add ~240 keys, tagged `// native-review-pending: 2026-05-12` |
| `translations/sv.js` | Add ~240 keys, tagged `// native-review-pending: 2026-05-12` |
| `translations/ja.js` | Add ~240 keys, tagged `// native-review-pending: 2026-05-12` |
| `translations/es.js` | Add ~240 keys, tagged `// native-review-pending: 2026-05-12` |
| `public/blast/themes/*.webp` | 25 theme backgrounds (fal-ai/flux generated) |
| `public/blast/v2/fx/shatter.png` | 8-frame spritesheet ~12KB (mode-tintable) |
| `public/blast/v2/fx/frozen-crack.png` | 6-frame spritesheet ~8KB |
| `public/blast/v2/fx/coin-chip.png` | Tile overlay ~4KB |
| `public/blast/v2/fx/gem-chip.png` | Tile overlay ~4KB |
| `public/blast/v2/fx/chest-*.png` | 8 chest sprites (4 tiers × 2 states) ~40KB |
| `public/blast/v2/fx/particle-*.png` | 3 particle textures (dust, sparkle, prism) ~9KB |
| `e2e/blast-rtl.spec.ts` | Hebrew RTL screenshot regression test |
| `e2e/blast-ja-glyph.spec.ts` | JA hiragana tile-glyph regression test |
| `docs/audits/blast-v2-generator-quality-2026-05-XX.md` | Generator audit report |

All JSON/JS files under 500 lines (may span multiple packs for en/he/sv/ja/es). FX assets committed to `public/blast/v2/fx/`. Translation files expanded in-place (keep existing keys intact).

---

## Task 0: Admin Authoring CLI (`scripts/blast-author.ts`)

**Files:**
- Create: `scripts/blast-author.ts`
- Test: `scripts/__tests__/blast-author.test.ts`

**Usage:**
```bash
# Interactive single level
npx tsx scripts/blast-author.ts --locale en --theme fruits --level 3

# Batch mode: generate 30 curated levels for a locale
npx tsx scripts/blast-author.ts --locale en --batch --count 30
```

**Scope:** Wizard prompts user to:
1. Pick theme from `LOCALE_CONFIGS[locale].themes` keys
2. Pick word count (informed by mechanic gate at `mechanicsForLevel(level)`)
3. Auto-generate candidate board via `GeneratedLevelSource` (Plan 1) or manually place words
4. For auto-gen: show candidate, user reviews tile flags (coin %, gem %, frozen count, double-bonus), accept/retry
5. Run `validateCuratedLevel()` + `forwardSim()` (Plan 1 exports) to ensure solvability
6. Write to `content/blast/packs/<locale>/pack-<theme>.json` (append or create)
7. Print confirmation: "Level <n> saved to pack-<theme>.json"

**TDD Tasks within Task 0:**

- [ ] **Task 0a: Failing test** — test CLI input/output mocking:
  - Mock `fs.writeFile` to capture JSON writes
  - Mock `GeneratedLevelSource.resolve()` to return fixed level
  - Call `authorizeLevel({ locale: 'en', theme: 'fruits', level: 3, ... })`
  - Assert output JSON validates against `BlastLevel` schema + passes `validateCuratedLevel`

- [ ] **Task 0b: Run test, expect FAIL** — `Cannot find module '../scripts/blast-author'`

- [ ] **Task 0c: Implement `blast-author.ts`:**
  - Parse CLI args: `--locale`, `--theme`, `--level`, `--batch`, `--count`
  - Interactive mode: prompts via `readline` or similar
  - Auto-gen mode: call `GeneratedLevelSource.resolve()` in loop, filter by interestingness threshold
  - Validation: call Plan 1's `validateCuratedLevel(level)` + `forwardSim(level)` before write
  - JSON shape: `BlastLevel` with `id: 'pack-<theme>-<levelOffsetInPack>'`
  - Export for testing: `export async function authorizeLevel(...): Promise<BlastLevel>`

- [ ] **Task 0d: Run test, expect PASS**

- [ ] **Task 0e: Manual smoke test** — run `npx tsx scripts/blast-author.ts --locale en --theme fruits --level 3` interactively, verify EN onboarding level 1-3 can be authored + written to `content/blast/packs/en/pack-onboarding.json`

- [ ] **Task 0f: Commit** — `feat(blast-v2): admin authoring CLI (Plan 6 Task 0)`

---

## Task 1: Theme Background Art Generation (`scripts/gen-blast-theme-art.ts`)

**Files:**
- Create: `scripts/gen-blast-theme-art.ts`
- Validate: `public/blast/themes/*.webp` (25 files exist, resolve in manifest)

**Prompt template per theme (spec lines 168, 174-181):**
```
A stylized flat-color illustration of a {{THEME_DISPLAY_NAME}}, 
inspired by LexiClash's neo-brutalist brand (dark navy #0b1530, 
electric mode colors, bold sans-serif typography). 
Edges soft, center vignetted to keep focus on game tiles. 
1920×1080 max, PNG or WebP. 
NO text, NO people, NO realistic photography.
```

Example instantiations:
- fruits → "A stylized flat-color illustration of a fruit orchard..."
- ocean → "A stylized flat-color illustration of underwater coral..."
- space → "A stylized flat-color illustration of a starfield with nebula..."

**Implementation (no TDD for asset generation, but command validation):**

- [ ] **Step 1:** Implement `gen-blast-theme-art.ts`:
  - Read `ThemeKey` list from `lib/blast/v2/types.ts` (25 themes)
  - For each theme: call `mcp__fal_ai__run_model` or `mcp__mcp_image__generate_image` with brand-style prompt
  - Write output to `public/blast/themes/<theme>.webp` (e.g., `fruits.webp`)
  - Idempotent: skip if file exists, `--force` to regen
  - Retry logic: up to 3 retries on transient API errors
  - Post-process: add vignette overlay (CSS post-render not needed here if fal-ai handles it)
  - CLI usage: `npx tsx scripts/gen-blast-theme-art.ts [--force]`

- [ ] **Step 2:** Run manually or via CI:
  ```bash
  npx tsx scripts/gen-blast-theme-art.ts
  # Generates 25 theme WebP files (~3-4 MB total)
  # Output: "✓ fruits.webp (142 KB)"
  ```

- [ ] **Step 3:** Verify all 25 files exist:
  ```bash
  ls public/blast/themes/*.webp | wc -l  # Should be 25
  ```

- [ ] **Step 4:** Commit:
  ```bash
  git add public/blast/themes/
  git commit -m "feat(blast-v2): theme background art × 25 (Plan 6 Task 1)"
  ```

---

## Task 2: FX Asset Generation

**Files:**
- Create manually or via mcp-image:
  - `public/blast/v2/fx/shatter.png` (8 frames, ~12KB)
  - `public/blast/v2/fx/frozen-crack.png` (6 frames, ~8KB)
  - `public/blast/v2/fx/coin-chip.png` (~4KB)
  - `public/blast/v2/fx/gem-chip.png` (~4KB)
  - `public/blast/v2/fx/chest-wood-closed.png`, `chest-wood-open.png`, `chest-silver-closed.png`, ... (8 sprites)
  - `public/blast/v2/fx/particle-dust.png`, `particle-sparkle.png`, `particle-prism.png`

**Acceptance criterion:** All 16 assets exist, `public/blast/v2/fx/manifest.json` lists them with checksums for integrity validation.

- [ ] **Step 1:** Design prompt template per asset type (neo-brutalist, mode-tinted, lightweight)

- [ ] **Step 2:** Generate via mcp-image or fal-ai/flux in batch:
  ```bash
  npx tsx scripts/gen-blast-fx-assets.ts
  # Writes to public/blast/v2/fx/
  # Generates manifest: public/blast/v2/fx/manifest.json
  ```

- [ ] **Step 3:** Verify manifest and asset sizes:
  ```bash
  npx vitest run --reporter=verbose | grep "public/blast/v2/fx"
  ```

- [ ] **Step 4:** Commit:
  ```bash
  git add public/blast/v2/fx/
  git commit -m "feat(blast-v2): FX sprite assets (Plan 6 Task 2)"
  ```

---

## Task 3: English Theme Word Pool Expansion

**Files:**
- Edit: `lib/blast/v2/locales/en.ts`
- Validate: each theme pool 40-60 words, no duplicates

**Scope:** Expand each of 25 themes from seed (3-8 words in Plan 1) to ~50 words per theme. Source: Common Crawl noun frequency lists, MIT 10k word list, or curated manually.

**Process:**
- [ ] **Step 1:** Read Plan 1's EN locale config; identify seed pools per theme
- [ ] **Step 2:** For each theme, source 40-50 relevant nouns (e.g., fruits: apple, banana, orange, mango, kiwi, grape, cherry, pear, plum, peach, lemon, lime, melon, papaya, pineapple, coconut, avocado, berry, blueberry, strawberry, raspberry, blackberry, cranberry, fig, date, prune, apricot, tangerine, clementine, grapefruit, pomegranate, ...)
- [ ] **Step 3:** Deduplicate, ensure all words 3-7 letters, no proper nouns, no accent marks
- [ ] **Step 4:** Update `THEMES.fruits.words = [...]` in en.ts
- [ ] **Step 5:** Repeat for all 25 themes
- [ ] **Step 6:** Run generator audit (Task 11) to verify quality gates pass

**Acceptance:** EN config exports 25 theme pools, each with 40-60 words, no duplicates, all valid per `isValidWord(word, 'en')`.

- [ ] **Commit:** `feat(blast-v2): EN theme word pools × 25 (Plan 6 Task 3)`

---

## Task 4: Hebrew Theme Expansion + HE_AMBIGUOUS_BLOCKLIST

**Files:**
- Edit: `lib/blast/v2/locales/he.ts`
- Native review required before commit

**Scope:** Expand HE theme pools from seeds to ~40-50 words per theme (HE word length is shorter due to morphology). Fill `HE_AMBIGUOUS_BLOCKLIST` with visually ambiguous stacked words (words where letters could be misread when stacked vertically).

**Process:**
- [ ] **Step 1:** Source HE noun pools per theme (curated or AI-translated from EN with native review)
- [ ] **Step 2:** Validate using `LocaleConfig.normalize()` (final-form folding)
- [ ] **Step 3:** Native HE speaker reviews pools for authenticity + cultural fit
- [ ] **Step 4:** Build `HE_AMBIGUOUS_BLOCKLIST` from native review: flag words where letters stack ambiguously (e.g., pairs like ט/י that look similar vertically). Initial guess: ~50-100 words flagged by native reviewer.
- [ ] **Step 5:** Test: generate 100 sample levels, verify generator rejects blocked words during placement

**Acceptance:** HE config exports 25 theme pools (30-50 words each), `HE_AMBIGUOUS_BLOCKLIST` populated, native review sign-off documented in file header.

- [ ] **Comment in file:** `// native-review-pending: 2026-05-12 — HE pools + blocklist reviewed by [name]`

- [ ] **Commit:** `feat(blast-v2): HE theme pools + ambiguous-blocklist (Plan 6 Task 4)` — waits for native review before push

---

## Task 5: Swedish, Japanese, Spanish Theme Expansion

**Files:**
- Edit: `lib/blast/v2/locales/sv.ts`, `ja.ts`, `es.ts`
- Native review required for SV/JA/ES before push

**Process (same as Task 4, parallel per locale):**

- [ ] **SV:** Source nouns from Swedish frequency lists; validate å/ä/ö preservation; ~40-60 words per theme; native SV speaker review
- [ ] **JA:** Source hiragana-only nouns (V1 constraint, no kanji/katakana); ~30-40 words per theme (shorter pool due to hiragana-only); native JA speaker review
- [ ] **ES:** Source nouns; validate accent-folding in match (MURCIELAGO matches MURCIÉLAGO); ~40-60 words per theme; native ES speaker review

**Acceptance:** All 3 locale configs export expanded theme pools, each theme 30-60 words (JA shorter due to script constraint), native review sign-offs in file headers.

- [ ] **Commit (3 separate):**
  ```bash
  git commit -m "feat(blast-v2): SV theme word pools × 25 (Plan 6 Task 5a) — native-review-pending"
  git commit -m "feat(blast-v2): JA theme word pools × 25 (Plan 6 Task 5b) — native-review-pending"
  git commit -m "feat(blast-v2): ES theme word pools × 25 (Plan 6 Task 5c) — native-review-pending"
  ```

---

## Task 6: Bonus Dictionary Loader Wiring

**Files:**
- Create: `lib/blast/v2/bonus-dict-loaders.ts`
- Edit: `lib/blast/v2/locales/{en,he,sv,ja,es}.ts` to wire loaders
- Test: `lib/blast/v2/__tests__/bonus-dict-loaders.test.ts`

**Scope:** Locate existing per-locale dict loaders (used by Practice/SP modes), import them, and wire into each `LocaleConfig.bonusDictionary` field.

**Process:**
- [ ] **Step 1:** Search codebase for dict loader paths: likely `lib/dict/[locale].ts` or `lib/dictionary/[locale].ts`
- [ ] **Step 2:** Verify loader signature: `() => Promise<Set<string>>`
- [ ] **Step 3:** Create `bonus-dict-loaders.ts`:
  ```ts
  export const bonusDictLoaders: Record<Locale, () => Promise<Set<string>>> = {
    en: () => import('lib/dict/en').then(m => m.loadDictionary()),
    he: () => import('lib/dict/he').then(m => m.loadDictionary()),
    // ...
  };
  ```
- [ ] **Step 4:** Update each locale config:
  ```ts
  // lib/blast/v2/locales/en.ts
  export const EN_CONFIG: LocaleConfig = {
    // ...
    bonusDictionary: bonusDictLoaders.en,
  };
  ```
- [ ] **Step 5:** Test: on level 25+, selecting a non-theme word validates against bonus dict; accepted words award +10 coins
- [ ] **Step 6:** Smoke test: play EN level 25+, try selecting a real English word not in theme → should award bonus coins

**Acceptance:** All 5 locales have `LocaleConfig.bonusDictionary` wired to real loaders, bonus dict words validate correctly on lvl 25+.

- [ ] **Commit:** `feat(blast-v2): bonus dictionary loader wiring (Plan 6 Task 6)`

---

## Task 7: Curated EN Packs (Levels 1-30)

**Files:**
- Create: `content/blast/packs/en/pack-onboarding.json` (levels 1-3)
- Create: `content/blast/packs/en/pack-fruits.json` (levels 4-8)
- Create: ... (5-6 total EN packs covering 30 levels)

**Scope:** Author 30 EN curated levels following the mechanic unlock ladder (Task 1 mechanicsForLevel(n)). Use admin CLI (Task 0) in batch mode to generate candidates, then manually review/tweak.

**Process:**
- [ ] **Step 1:** Design level progression per theme:
  - Levels 1-3: ONBOARDING theme (simple 3-word, 3×3 grid, easy)
  - Levels 4-8: FRUITS theme (introduce mechanics: coin overlay at lvl 3, reverse selection at lvl 4, shuffle at lvl 5, gems at lvl 6)
  - Levels 9-15: Mix themes, introduce frozen tiles (lvl 8), cascades (lvl 12), double-bonus (lvl 15)
  - Levels 16-20: Increase difficulty, more mechanics active
  - Levels 21-30: Full mechanic suite active, introduce bonus dict (lvl 25), advanced layouts

- [ ] **Step 2:** Run batch authoring:
  ```bash
  npx tsx scripts/blast-author.ts --locale en --batch --count 30
  # Interactive prompts for word selection, tile flags, validation
  ```

- [ ] **Step 3:** Verify all 30 levels pass `validateCuratedLevel()` + `forwardSim()`

- [ ] **Step 4:** Spot-check: play level 1 in browser, verify intro card + board render correctly

- [ ] **Step 5:** Commit:
  ```bash
  git add content/blast/packs/en/
  git commit -m "feat(blast-v2): EN curated pack levels 1-30 (Plan 6 Task 7)"
  ```

---

## Task 8: Curated Packs — Hebrew, Swedish, Japanese, Spanish (Levels 1-30 × 4 Locales)

**Files:**
- Create: `content/blast/packs/he/pack-*.json`, `sv/`, `ja/`, `es/` (4 × 6-7 packs per locale = ~30 levels each)

**Scope:** Author 30 levels per non-EN locale, respecting locale-specific rules (HE RTL, JA hiragana-only, ES accent-folding, SV special chars).

**Process (parallel per locale):**

- [ ] **HE:** 
  - Batch author 30 levels via CLI, ensure `HE_AMBIGUOUS_BLOCKLIST` words never placed
  - Test RTL rendering: `/he/blast?force_v2=on`, screenshot intro card + level 1 board
  - Verify final-form tiles render correctly (engine selects non-final for tile, final for match)
  - Commit: `feat(blast-v2): HE curated pack levels 1-30 (Plan 6 Task 8a)`

- [ ] **SV:**
  - Batch author 30 levels, ensure å/ä/ö tile pools are used
  - Test: level with ä-containing word validates correctly
  - Commit: `feat(blast-v2): SV curated pack levels 1-30 (Plan 6 Task 8b)`

- [ ] **JA:**
  - Batch author 30 levels, hiragana-only (V1 constraint)
  - Word length 2-4 (shorter than other locales)
  - Test: tile glyph matches expected hiragana Unicode (regression test in Task 10)
  - Commit: `feat(blast-v2): JA curated pack levels 1-30 (Plan 6 Task 8c)`

- [ ] **ES:**
  - Batch author 30 levels, validate accent-folding
  - Test: level with ñ word, level with accented word (café matches CAFE via fold)
  - Commit: `feat(blast-v2): ES curated pack levels 1-30 (Plan 6 Task 8d)`

---

## Task 9: Translation Key Authoring (EN) — ~240 Keys

**Files:**
- Edit: `translations/en.js`

**Scope:** Author all ~240 new keys under `blast.*` namespace. Breakdown:
- ~30 keys: Plan 2 inline fallbacks (blast.intro.title, blast.complete.title, blast.level, blast.shuffle, blast.hint, blast.chest.pill, theme labels × 25)
- ~25 keys: Plan 3 chest UI (blast.chest.tier.wood, blast.chest.preview.*, blast.chest.open.*, blast.chest.veteran)
- ~5 keys: Plan 4 FX callouts (cascade, double-bonus, frozen-thaw)
- ~175 keys: Plan 5 tutorial (blast.ftue.step.{1-6}.{title,body}, blast.tutorial.mechanic.<key>.{title,body} × 12 mechanics, blast.tutorial.replay.{title,body}, blast.tutorial.skipAll, blast.tutorial.veteran.welcomeBack)
- ~5 keys: Plan 7 telemetry copy (banner text, duplicate-avatar-merge payout text)

**Process:**
- [ ] **Step 1:** Map out key hierarchy: `{ blast: { intro: { ... }, tutorial: { ... }, chest: { ... } } }`
- [ ] **Step 2:** Author EN copy for all 240 keys, following brand voice (quirky, electric, party energy)
- [ ] **Step 3:** Run linter: `npm run lint` — verify no unused keys, no syntax errors
- [ ] **Step 4:** Test: `import { blast } from './translations/en.js'` in test file, verify all nested keys exist
- [ ] **Step 5:** Commit:
  ```bash
  git commit -m "feat(blast-v2): EN translation keys × 240 (Plan 6 Task 9)"
  ```

---

## Task 10: Translation Key Authoring — Hebrew, Swedish, Japanese, Spanish (× 4 Locales, ~240 Keys Each)

**Files:**
- Edit: `translations/he.js`, `sv.js`, `ja.js`, `es.js`

**Scope:** Translate/author all 240 keys in 4 non-EN locales. Parallel tasks, each locale gets native review before push.

**Process (parallel per locale):**

- [ ] **HE (~240 keys):**
  - AI-translate EN copy using Claude, then native HE speaker review + manual tweaks
  - RTL considerations: no emoji/special chars that break bidi
  - Add comment at top of blast section: `// native-review-pending: 2026-05-12`
  - Commit: `feat(blast-v2): HE translation keys × 240 (Plan 6 Task 10a) — native-review-pending`

- [ ] **SV (~240 keys):**
  - AI-translate, SV native review
  - Comment: `// native-review-pending: 2026-05-12`
  - Commit: `feat(blast-v2): SV translation keys × 240 (Plan 6 Task 10b) — native-review-pending`

- [ ] **JA (~240 keys):**
  - AI-translate to Japanese, JA native review + cultural fit check
  - Comment: `// native-review-pending: 2026-05-12`
  - Commit: `feat(blast-v2): JA translation keys × 240 (Plan 6 Task 10c) — native-review-pending`

- [ ] **ES (~240 keys):**
  - AI-translate, ES native review
  - Comment: `// native-review-pending: 2026-05-12`
  - Commit: `feat(blast-v2): ES translation keys × 240 (Plan 6 Task 10d) — native-review-pending`

---

## Task 11: Generator Quality Audit (`scripts/blast-generator-audit.ts`)

**Files:**
- Create: `scripts/blast-generator-audit.ts`
- Test: `scripts/__tests__/blast-generator-audit.test.ts`
- Output: `docs/audits/blast-v2-generator-quality-2026-05-12.md`

**Scope:** Run `GeneratedLevelSource.resolve(n, locale, bucket)` for n=31..80 × 5 locales × 100 user-buckets, measure regen rate, interestingness distribution, cascade opportunity rate. Fail if any metric exceeds thresholds.

**Thresholds (per spec + risk register):**
- Regen rate (levels rejected due to low interestingness) < 30%
- Mean interestingness score ≥ 0.6
- Cascade opportunity count ≥ 0.3 per level (30% of levels have at least one cascade)

**TDD Tasks within Task 11:**

- [ ] **Task 11a: Failing test** — mock Plan 1's `GeneratedLevelSource.resolve()` to return fixed interestingness scores, verify audit computes mean + regen rate correctly

- [ ] **Task 11b: Implement audit script:**
  ```ts
  for each locale in ['en', 'he', 'sv', 'ja', 'es']:
    for level in [31..80]:
      for bucket in [0..99]:
        generated = await GeneratedLevelSource.resolve(level, locale, bucket)
        track: interestingness, regen (if retry loop exceeded), cascades
    compute: mean interestingness, regen %, cascade rate
    assert: all metrics pass thresholds
  ```

- [ ] **Task 11c: Run audit:**
  ```bash
  npx tsx scripts/blast-generator-audit.ts --output docs/audits/
  # Generates report: "Generator quality audit 2026-05-12"
  # Regen rate: 18% (PASS < 30%)
  # Mean interestingness: 0.71 (PASS >= 0.6)
  # Cascade rate: 0.42 (PASS >= 0.3)
  ```

- [ ] **Task 11d: Commit report:**
  ```bash
  git add docs/audits/blast-v2-generator-quality-2026-05-12.md
  git commit -m "docs(blast-v2): generator quality audit 2026-05-12 (Plan 6 Task 11)"
  ```

---

## Task 12: Hebrew RTL Screenshot Regression Test

**Files:**
- Create: `e2e/blast-rtl.spec.ts`

**Scope:** Playwright test: load `/he/blast?force_v2=on&force_level=5`, render level 5 (post-intro), screenshot board + HUD, compare against baseline. Catches layout/rendering regressions specific to RTL.

- [ ] **Step 1: Failing test** — test file tries to load baseline image, fails because none exists yet

- [ ] **Step 2: Implement test:**
  ```ts
  test('HE Blast board renders RTL correctly', async ({ page }) => {
    await page.goto('/he/blast?force_v2=on&force_level=5');
    // Wait for level to render
    await page.waitForSelector('[data-testid="blast-board"]');
    // Screenshot
    const screenshot = await page.screenshot();
    expect(screenshot).toMatchSnapshot('he-blast-board-rtl.png');
  });
  ```

- [ ] **Step 3: Run test to generate baseline:**
  ```bash
  npx playwright test e2e/blast-rtl.spec.ts --update-snapshots
  ```

- [ ] **Step 4: Verify baseline screenshot shows:**
  - Board columns right-to-left (HE RTL)
  - Tiles render non-final form
  - HUD labels in Hebrew (right-aligned)

- [ ] **Step 5: Commit:**
  ```bash
  git add e2e/blast-rtl.spec.ts e2e/__snapshots__/
  git commit -m "test(blast-v2): HE RTL screenshot regression (Plan 6 Task 12)"
  ```

---

## Task 13: Japanese Hiragana Glyph Regression Test

**Files:**
- Create: `e2e/blast-ja-glyph.spec.ts`

**Scope:** Playwright test: load `/ja/blast?force_v2=on&force_level=5`, extract one tile glyph, verify it matches expected hiragana Unicode. Catches font load failures or rendering issues specific to JA.

- [ ] **Step 1: Implement test:**
  ```ts
  test('JA Blast hiragana glyphs render correctly', async ({ page }) => {
    await page.goto('/ja/blast?force_v2=on&force_level=5');
    await page.waitForSelector('[data-testid="blast-tile"]');
    const tileText = await page.locator('[data-testid="blast-tile"]').first().textContent();
    expect(/[぀-ゟ]/).test(tileText); // Hiragana Unicode range
  });
  ```

- [ ] **Step 2: Run test:**
  ```bash
  npx playwright test e2e/blast-ja-glyph.spec.ts
  # Should PASS if Noto Sans JP loads correctly
  ```

- [ ] **Step 3: Commit:**
  ```bash
  git add e2e/blast-ja-glyph.spec.ts
  git commit -m "test(blast-v2): JA hiragana glyph regression (Plan 6 Task 13)"
  ```

---

## Task 14: Manifest Assertion + Smoke Test

**Files:**
- Create: `lib/blast/v2/__tests__/content-manifest.test.ts`

**Scope:** Verify all content files exist and are valid:
- 150 curated packs (30 levels × 5 locales)
- 25 theme images
- 16 FX assets + manifest
- 5 translation files with all 240 keys

- [ ] **Step 1: Implement test:**
  ```ts
  describe('Blast v2 content manifest', () => {
    it('all 25 theme images exist', async () => {
      const themes = ['fruits', 'animals', 'food', ...];
      for (const theme of themes) {
        const path = `public/blast/themes/${theme}.webp`;
        expect(fs.existsSync(path)).toBe(true);
      }
    });
    it('all 150 curated packs exist + pass schema validation', async () => {
      const locales = ['en', 'he', 'sv', 'ja', 'es'];
      for (const locale of locales) {
        const packDir = `content/blast/packs/${locale}`;
        const packFiles = fs.readdirSync(packDir).filter(f => f.endsWith('.json'));
        expect(packFiles.length).toBeGreaterThanOrEqual(6);
        for (const file of packFiles) {
          const pack = JSON.parse(fs.readFileSync(`${packDir}/${file}`, 'utf-8'));
          expect(BlastLevelSchema.array().parse(pack)).toBeDefined();
        }
      }
    });
    it('all 5 translation files have ~240 blast.* keys each', async () => {
      const locales = ['en', 'he', 'sv', 'ja', 'es'];
      for (const locale of locales) {
        const mod = await import(`../../translations/${locale}.js`);
        const keys = Object.keys(mod.default.blast || {}).length;
        expect(keys).toBeGreaterThanOrEqual(240);
      }
    });
  });
  ```

- [ ] **Step 2: Run test:**
  ```bash
  npx vitest run lib/blast/v2/__tests__/content-manifest.test.ts
  ```

- [ ] **Step 3: Commit:**
  ```bash
  git commit -m "test(blast-v2): content manifest assertions (Plan 6 Task 14)"
  ```

---

## Task 15: Browser Smoke Test — EN/HE/JA/ES

**Manual multi-locale playthrough:**

- [ ] **EN:** Open `http://localhost:3001/en/blast?force_v2=on`, play levels 1-5:
  - Level 1: FTUE overlay appears, theme = onboarding, board 3×3, 3 words (CAT, SUN, EGG or equivalent)
  - Level 2: tap-tap + doubletap intro card appears + works
  - Level 3: coin overlay tiles appear, selecting one awards coin chip to HUD
  - Level 4: reverse selection card appears, selecting word backward works
  - Level 5: shuffle button visible, free shuffle works

- [ ] **HE:** Open `http://localhost:3001/he/blast?force_v2=on`, verify:
  - Board direction RTL (columns right-to-left)
  - Hebrew text renders correctly in intro card + HUD
  - Tiles show non-final form
  - Selection path draws correctly RTL

- [ ] **JA:** Open `http://localhost:3001/ja/blast?force_v2=on`, verify:
  - Hiragana glyphs render (not boxes)
  - Word length 2-4 (shorter levels)
  - Theme labels in Japanese

- [ ] **ES:** Open `http://localhost:3001/es/blast?force_v2=on`, verify:
  - Spanish theme labels + intro text
  - Accent-folded words (CAFÉ matches CAFE in selection)

---

## Self-Review Checklist

- [ ] All 150 curated packs created, validated, committed
- [ ] 25 theme images generated, validated, committed
- [ ] 16 FX assets created/sourced, manifest validated, committed
- [ ] 240 translation keys authored in 5 locales, HE/SV/JA/ES tagged native-review-pending
- [ ] Bonus dict loaders wired for all 5 locales
- [ ] HE_AMBIGUOUS_BLOCKLIST populated, generator rejects blocked words
- [ ] Generator audit run, report committed, all thresholds PASS
- [ ] RTL + JA glyph regression tests implemented, baseline snapshots created
- [ ] Content manifest test PASSES (all files exist, schema valid, key counts correct)
- [ ] Manual smoke test on 4 locales PASSES (levels 1-5 playable, mechanics unlock correctly)
- [ ] All commits follow conventional format: `feat(blast-v2): <description> (Plan 6 Task <N>)`
- [ ] Build succeeds: `npm run build`
- [ ] Tests pass: `npm run test -- lib/blast/v2`
- [ ] Lint passes: `npm run lint`

---

## Deliverables

1. **Curated packs:** 150 JSON files across 5 locales, levels 1-30 per locale, all pass validation + forward-sim
2. **Theme art:** 25 WebP images (3-4 MB total), lazy-loaded, vignette-optimized
3. **FX assets:** 16 PNG/WebP sprites (80 KB total), manifest with checksums
4. **Theme word pools:** All 25 themes expanded from seeds to 40-60 words per locale (JA 30-40)
5. **Bonus dict wiring:** 5 locale configs wired to real dict loaders, lvl 25+ bonus validation working
6. **HE_AMBIGUOUS_BLOCKLIST:** Populated with 50-100 words, generator respects during placement
7. **Translation keys:** ~240 keys per locale (1200 total entries), EN complete, HE/SV/JA/ES pending native review
8. **Regression tests:** RTL screenshot + JA glyph baseline snapshots, CI-integrated
9. **Audit report:** Generator quality audit 2026-05-12, all thresholds PASS
10. **Admin CLI:** `scripts/blast-author.ts` + tests, runnable in batch mode

---

## Risks + Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Curated authoring is slow (150 levels × 5 locales) | Day-1 content not ready | Batch CLI (Task 0) with guided generation; generator (Plan 1) handles all 31+ so day-1 game is playable even if only L1-10 curated |
| Generator flat boring boards on non-EN locales | Retention drop | Audit (Task 11) validates per-locale; expand theme pools if regen rate >30% or score <0.6 |
| Native review misses HE ambiguous words | Silent failure on certain puzzles | HE blocklist (Task 4) authored by native speaker, enforced at generator placement; manual spot-check on 20+ HE levels |
| Translation keys incomplete or missing in non-EN | Fallback strings in UI during rollout | Plan 6 tags all non-EN with native-review-pending; Plan 7 gates rollout Phase 2 on review completion |
| Theme art gen fails for certain themes | Visual inconsistency | Retry logic (3 attempts) + manual override (seed fal-ai with fixed prompt) for failures; commit partial set if needed |
| JA hiragana font fails to load in production | Glyphs render as boxes | Regression test (Task 13) catches in CI; fallback to system font if needed (design decision) |

---

## Timeline Estimate

**Parallel work capacity:** 1 main contributor, 4 locale-async contributors (HE, SV, JA, ES native reviewers)

| Task | Duration | Blocker | Owner |
|---|---|---|---|
| Task 0 (Admin CLI) | 3-4 hours | Plan 1 complete | Main |
| Task 1 (Theme art) | 2-3 hours | fal-ai access | Main |
| Task 2 (FX assets) | 2-3 hours | mcp-image | Main |
| Task 3 (EN pools) | 2 hours | — | Main |
| Tasks 4-5 (HE/SV/JA/ES pools) | 4-6 hours | Native reviewers | Locale reviewers (parallel) |
| Task 6 (Dict wiring) | 1 hour | Plan 1 + existing loaders | Main |
| Task 7 (EN packs) | 4-6 hours | Task 0 + Task 3 | Main |
| Tasks 8 (Non-EN packs) | 8-12 hours | Task 7 + Tasks 4-5 | Main (batch) |
| Task 9 (EN strings) | 2-3 hours | — | Main |
| Task 10 (Non-EN strings) | 4-6 hours | Task 9 + natives | Locale reviewers (parallel) |
| Task 11 (Audit) | 1-2 hours | Plan 1 + all pools | Main |
| Tasks 12-13 (Regression tests) | 2-3 hours | Task 7 | Main |
| Task 14 (Manifest) | 1 hour | All above | Main |
| Task 15 (Smoke test) | 1-2 hours | All above | Main |
| **Total:** | **40-50 hours** | Parallel: 20-30 actual days | 1 main + 4 reviewers |

---

## Out-of-Scope / Deferred

- Plan 6 ships EN fully complete. HE/SV/JA/ES marked native-review-pending; formal sign-off in Plan 7 or follow-up PR.
- Curated packs beyond level 30: generator handles 31+, covers infinite play
- Premium seasonal packs (monetization): CLI designed to support, defer to live-ops
- Avatar grant + boost grant implementation: chest preview only, grant APIs deferred
- Pixi FX assets for Plan 4 (Plan 4 owns those)
- Sound design (V1.5 per spec): reuse existing Practice + Adventure SFX
