# Spanish Locale Audit — 2026-05-04

**Scope:** translation, dictionary/validator, SEO/GEO, runtime/UX
**Method:** 4 parallel Explore-agent lanes + main-thread cross-verification
**Status:** 2 fixes shipped; 7 items deferred to scoped sprints

---

## TL;DR

Spanish is **registered as tier-1 (equal `locales` config)** but executes at **tier-2** across the stack. Not a single ship-blocker; aggregate it suppresses Spanish acquisition + retention.

Highest leverage now (≤1 day each):
1. Add 66 missing translation keys with native-review marker
2. Sweep bare `.toLocaleString()` to `safeToLocaleString()` (60+ sites)
3. Scaffold Wiktionary-ES definition verifier (mimic `wiktionaryEnVerifier.ts`)

Highest leverage later (multi-day):
4. Expand approved Spanish word list 1,486 → 10k+
5. Translate `/es/words/*` + `/es/anagram/*` content (currently English under ES URL)
6. Regional landings (`es-MX`, `es-AR`)

---

## Lane 1 — Translation Completeness

**Counts:** en=5,384 keys · es=5,412 keys (66 missing in es, 94 orphans)

**P0 — Runtime fallback to English** (priority: HIGH)
- 49 empty-valued keys (key present, value `""`)
- 6,400+ `t()` callsites without matching es entry
- Concentration: `accessibility.*` (fireRoundLights, earthquakeEffects, reduceMotion, disableSounds, highContrast, largerText) at [accessibility/PageClient.tsx:94-234](fe-next/app/[locale]/accessibility/PageClient.tsx)

**P1 — Untranslated UI** (~80 user-facing strings identical en==es)
- penalty `"-${points} pts"`, points `"{{count}} pts"`, brand brand-adjacent strings
- 113 short strings <20 chars: "Chat", "Admin", "Combos", "+{{amount}} XP"

**P2 — Orphans** (94 es-only keys, no en counterpart) → cleanup debt

**Sample 30-string spot-check:**
- ✅ Good: hunter→Cazador, contactUs→Contáctanos, dailyQuests→Misiones diarias
- ❌ Identical to EN: penalty, name

**Deferred:** dedicated TDD sprint to add native-review-flagged values.

---

## Lane 2 — Dictionary & Validator

**P0 — No Spanish definition verifier** (SHIP-BLOCKER for ES launch)
- Only `milogWordVerifier.ts` (HE) + `wiktionaryEnVerifier.ts` (EN) exist
- ES words queued in `invalid_word_submissions` with `verification_status=null` never auto-promote on definition match
- [autoPromotion.ts:68-74](fe-next/backend/modules/autoPromotion.ts) routes only HE+EN; ES falls through to submission-count

**P1 — Dictionary size disparity**
- ES approved: **1,486 words** ([backend/spanish_words_approved.txt](fe-next/backend/spanish_words_approved.txt))
- EN approved: **142,309 words**
- Ratio ~96:1

**P1 — Normalization gap**
- [shared/utils/wordNormalization.ts:100-116](fe-next/shared/utils/wordNormalization.ts) maps á→a, ó→o, ü→u
- `Ñ` not mapped explicitly — preserved through `normalizeSpanishLetter` map; needs case-fold audit on user input "NIÑO" → "niño"
- Anagram input filter at [anagram/lib/anagramLogic.ts:40](fe-next/app/[locale]/anagram/lib/anagramLogic.ts) is `[^a-z]` — strips ñ + accents silently. Spanish anagrams effectively unsupported.

**P2 — No ES profanity list**
- [backend/utils/profanityFilter.ts](fe-next/backend/utils/profanityFilter.ts) loads `bad-words` (English only)
- Spanish slurs unfiltered

**P2 — No ES rules in AI generation**
- [lib/ai-service/generation.ts:130](fe-next/lib/ai-service/generation.ts) `es: ''` (empty constraint string)
- HE has guards; ES has none

**P2 — Moderator queue lacks RAE/Wiktionary URL for ES**
- [admin/invalidWordRoutes.ts:35-48](fe-next/backend/routes/admin/invalidWordRoutes.ts) shows `milog_status` but no `wiktionary_es_status`

**Recommendation:** Wiktionary-ES verifier sprint = scaffold mirror of `wiktionaryEnVerifier.ts` (~100 lines + tests).

---

## Lane 3 — SEO & GEO

### What's GOOD ✅
- Home `/es` + `/es/juego-de-palabras-multijugador` + `/es/juegos-vocabulario-aula` — full Spanish meta, hreflang for es-ES/MX/AR/CO/US, og-image-es.webp, JSON-LD
- llms.txt has full Spanish section with regional variants ([content.ts buildEs()](fe-next/app/[locale]/llms.txt/content.ts))
- robots.txt neutral for Spanish (no locale-disallow)
- Sitemap includes ES URLs incl. per-date `/es/daily/archive/{date}` (audit's "missing P2" was false positive — see [sitemap.ts:104-111](fe-next/app/sitemap.ts))
- `/es/lexiclash-vs-apalabrados` correctly uses `isTargetLocale = locale === 'es'` ([page.tsx:14](fe-next/app/[locale]/lexiclash-vs-apalabrados/page.tsx))

### What was FALSE-POSITIVE ❌→✓
- **NOT** "P0 noindex on /es/words/*" — `/es/words/[n]-letter-words` renders English wordlist + English strategy prose. `index: locale === 'en'` is correct: don't index a duplicate of EN content under /es. Real bug = self-canonical.
- **NOT** "P0 noindex on /es/anagram/*" — `parseLetters` strips to a-z (English alphabet); content is English. Same logic.
- **NOT** sitemap missing per-date archive — already generated for all locales.

### What's actually wrong ⚠️
- **P1 — Self-canonical on EN-content pages under /es** ([SHIPPED THIS SESSION ✅])
  - Was: `/es/words/5-letter-words` had `canonical: self`
  - Now: non-EN canonical → `/en/words/5-letter-words` ([page.tsx:84](fe-next/app/[locale]/words/[n]-letter-words/page.tsx))
  - Same fix at [anagram/[letters]/page.tsx](fe-next/app/[locale]/anagram/[letters]/page.tsx)
- **P1 — No EN counterpart for `/lexiclash-vs-apalabrados`**
  - Apalabrados is huge in ES markets, but EN searches "Apalabrados alternative" find nothing
- **P2 — No region-specific landings (es-ES vs es-MX vs es-AR)**
  - All ES traffic converges to single landing; missing regional keyword clustering

### Deferred work
- Translate or short-circuit `/es/words/*` + `/es/anagram/*` to localized Spanish content (or 301 to /en until then)
- Build `/es/lexiclash-vs-apalabrados` EN variant
- Per-region landings

---

## Lane 4 — Runtime & UX

### Working correctly ✅
- Locale routing fallback: [not-found.tsx](fe-next/app/[locale]/not-found.tsx) redirects `/${language}` (no hardcoded /en)
- Language switcher: native label "Español" present, flag 🇪🇸
- PostHog: locale tagged as super-prop ([growthTracking.ts:233-235](fe-next/utils/growthTracking.ts))
- No hardcoded English plural logic (`count === 1 ? 'word' : 'words'`)
- RTL: only `he` in `rtlLocales` ([i18n/config.ts:11](fe-next/i18n/config.ts)); ES correctly LTR

### P1 — Number/date formatting bug (60+ sites)
**Pattern:** `value.toLocaleString()` without locale arg → browser default → typically "1,000" (en-US) instead of "1.000" / "1 000" (es-ES)

Helper exists at [utils/bcp47Locale.ts:27](fe-next/utils/bcp47Locale.ts):
```ts
export function safeToLocaleString(value, language, options) { ... }
```

**Top offenders:**
- [components/CoinBalance.tsx:64,119](fe-next/components/CoinBalance.tsx) — coin counter visible globally
- [app/[locale]/leaderboard/PageClient.tsx](fe-next/app/[locale]/leaderboard/PageClient.tsx) — 4 instances
- [app/[locale]/player/[id]/PageClient.tsx](fe-next/app/[locale]/player/[id]/PageClient.tsx) — 3 instances
- [components/gift/AdminGiftModal.tsx](fe-next/components/gift/AdminGiftModal.tsx) — 10+ instances

**Server-side hardcoded `'en-US'`:**
- [api/admin/games-diagnostic/route.ts:35](fe-next/app/api/admin/games-diagnostic/route.ts)
- [api/email/preferences/route.ts:112](fe-next/app/api/email/preferences/route.ts)
- [api/og/challenge/route.tsx:127](fe-next/app/api/og/challenge/route.tsx) (edge-runtime, OG image)

**Recommendation:** TDD sprint:
1. Add lint rule blocking bare `.toLocaleString()` outside `utils/`, `__tests__/`
2. Codemod replace bare calls with `safeToLocaleString(v, language)` where `language` reaches via `useLanguage()` or prop
3. Server routes: thread locale from request (header or session)

### P2 — Text overflow audit gap
- [docs/audits/viewport-2026-05-02.md](fe-next/docs/audits/viewport-2026-05-02.md) covered HE-RTL but unclear ES coverage
- ES strings often run +20-30% vs EN; tight buttons/headings at risk

---

## Shipped This Session ✅

### SEO canonical fixes
| File | Description |
|------|-------------|
| [app/[locale]/words/[n]-letter-words/page.tsx](fe-next/app/[locale]/words/[n]-letter-words/page.tsx) | Non-EN locales canonical → `/en/words/{n}-letter-words` (was self-canonical, mixed signals with `noindex`) |
| [app/[locale]/anagram/[letters]/page.tsx](fe-next/app/[locale]/anagram/[letters]/page.tsx) | Same pattern |

### Sprint C partial — locale-aware number formatting (9 sites in 5 files)
Helper [safeToLocaleString()](fe-next/utils/bcp47Locale.ts) wired into top-visibility sites:
| File | Sites | Notes |
|------|-------|-------|
| [components/CoinBalance.tsx](fe-next/components/CoinBalance.tsx) | 2 | New optional `language?: string` prop, default `'en'` (backward compat). Aria-label + visible counter both formatted. |
| [components/ui/CoinBalanceBadge.tsx](fe-next/components/ui/CoinBalanceBadge.tsx) | 2 | Same prop pattern. Tests still pass with default. |
| [components/HeaderMenuDropdown.tsx](fe-next/components/HeaderMenuDropdown.tsx) | 1 | Threads `language` to header CoinBalance — global header now formats correctly for ES/HE/SV/JA users. |
| [app/[locale]/leaderboard/PageClient.tsx](fe-next/app/[locale]/leaderboard/PageClient.tsx) | 4 | All `total_score` displays. |
| [app/[locale]/player/[id]/PageClient.tsx](fe-next/app/[locale]/player/[id]/PageClient.tsx) | 3 | totalGames, totalScore, totalWords stats. |

**Remaining ~50+ sites** (gift modal, og-image, admin diagnostic, server routes) deferred — same mechanical pattern, but server-side need locale threaded from headers/session.

### Sprint A partial — 19 missing translation keys across 5 sub-trees
Added to [translations/es.js](fe-next/translations/es.js):

**common.\*** (6 keys): search, searchPlaceholder, noResults, navigation, copiedToClipboard, toClose

**auth.otp.\*** (2 keys): codeSent ("¡Código enviado!"), enterCode ("Ingresa tu código")

**adventure.bosses.\*** (2 keys): tutorialGotIt ("¡Entendido!"), newMechanic ("¡Nueva mecánica desbloqueada!")

**adventure.loot.\*** (2 keys): fragment ("Fragmento"), luckyBonus ("¡Bonus de la suerte!")

**adventure.game.\*** (4 keys): wordsYouMissed, missedWordsSummary, showMore, showLess

**avatar.builder.\*** (3 keys): expressions ("Expresiones"), nose ("Nariz"), eyeColor ("Color de ojos")

These were globally-visible keys (login OTP flow, post-game summaries, boss tutorials, loot reveals, avatar editor) — each falling back to English at runtime. Verified via Node dynamic import.

**~89 missing keys remain** — adventure.* consumable/mutator/ascension/share names, connections.*, blast.tile.*, etc. Translation diff with proposed Spanish (TODO(native-review)-marked) generated by audit agent — handed off to next-session sprint.

**Why partial:** keys live in a deeply nested object literal; each insertion = nested-path edit. Sustainable only at sub-tree granularity; full backfill requires either a dedicated translator pass or a JS codemod that walks both files.

### Sprint SEO-Scrabble — GSC-driven keyword expansion
**Trigger:** GSC data showed 9 of 10 top Spanish queries contain "scrabble" — a generic for word games in ES markets that current site undertargeted.

| File | Change |
|------|--------|
| [translations/es.js](fe-next/translations/es.js) `seo.*` | Title: "Alternativa a Scrabble Online en Español…" — propagates via `app/[locale]/layout.tsx` to all /es/* without override. Description, keywords, ogTitle, twitter all reframed with "alternativa al estilo Scrabble" + GSC cluster keywords (8 new). |
| [app/[locale]/juego-de-palabras-multijugador/page.tsx](fe-next/app/[locale]/juego-de-palabras-multijugador/page.tsx) | Hardcoded metadata + visible body retitled. H1, hero paragraph, FAQ Q1, "Sobre" section, breadcrumb, VideoGameJsonLd name+description all softened. |

**TM-safety rule (now durable in memory):** Hasbro tolerates "alternativa a Scrabble" / "al estilo Scrabble", but NOT "Scrabble Online en Español" (claims to BE Scrabble). Aligns with how `Words With Friends` markets itself.

**Why not split into new `/es/scrabble-online-multijugador` page:** would split authority across two ES landings competing for the same query cluster. Single canonical accumulates rank signals faster.

**Open:** A few body sentences still mention "Scrabble" without qualifier — sweep next session. Spanish home page (`/es`) inherits new `seo.*` but has no dedicated scrabble-positioned hero copy; separate sprint.

---

## Next-Sprint Backlog (prioritized)

| Sprint | Effort | Impact | Notes |
|--------|--------|--------|-------|
| **A — Translation gap fill** | M | HIGH | 66 missing keys, 49 empty-value, ~80 identical-to-en. Native-speaker review pass. Add `// TODO(native-review)` markers. |
| **B — Wiktionary-ES verifier** | M | HIGH | Mirror `wiktionaryEnVerifier.ts`. Add `wiktionary_es_status` column to `invalid_word_submissions`. Wire in `autoPromotion.ts:68-74`. |
| **C — toLocaleString codemod** | M | MED | 60+ sites. Add lint rule + replacement. Server-side thread locale via headers. |
| **D — ES wordlist expansion** | L | HIGH | 1,486 → 10k+ words. Source: RAE common-word lists, Spanish Wikipedia top-N, validator-reviewed user submissions. |
| **E — `/es/words/*` localization** | L | MED | Either: (a) build Spanish wordlist + translate strategy/funFact prose, OR (b) 301 `/es/words/*` → `/en/words/*` until (a) ships. |
| **F — `/es/lexiclash-vs-apalabrados` EN variant** | S | MED | Mirror existing competitor pages; ES players already covered. |
| **G — ES profanity list** | S | LOW | Add `bad-words-es` or curated list to [profanityFilter.ts](fe-next/backend/utils/profanityFilter.ts). |
| **H — ES AI-generation rules** | S | LOW | Fill empty `es: ''` at [generation.ts:130](fe-next/lib/ai-service/generation.ts) with quality constraints. |
| **I — Regional landings** | L | LOW | `/es/juegos-aula-mexico`, `/es/juegos-aula-espana`, `/es/juegos-aula-argentina`. Need product call. |

---

## Red Flags from Cross-Verification

Two of the four agent reports overstated severity. Both were SEO findings:

1. **"P0 noindex on /es/words"** — agent didn't trace data path. Content IS English; noindex is correct.
2. **"P2 sitemap missing per-date /es/daily/archive"** — already generated via `addForAllLocales` loop.

**Lesson:** sub-audit findings tagged P0 deserve a 2-minute trace before shipping a flip. The flip would have been worse than the bug.

---

## Approval Asks

Before sprint A starts, decide:
- **Spanish word list strategy:** crowdsource via app submissions vs. ingest RAE common-words vs. Spanish Wiktionary scrape?
- **Regional split:** target neutral es-LATAM or split es-ES (Spain) / es-MX (LatAm)?
- **`/es/words/*` future:** localize content (sprint E-a) or redirect to /en (sprint E-b)?
