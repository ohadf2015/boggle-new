# Education landing pages + SEO/GEO — handoff (2026-08-30)

Branch `worktree-edu-landing-seo`. See `git log` for the full series.
`80f82b395` template+fixes · `98a94d75c` six pages · `43cf99a94` false claims · `4127d0ee3` bad section kind

## Shipped

- `lib/seo/educationLanding.ts` + `components/education/EducationLandingTemplate.tsx`
  (+ `EducationLandingSections.tsx`). Server components; landing bodies ship no client JS.
  New pages are ~23 lines each.
- `lib/seo/hreflang.ts` — one hreflang map, used by BOTH `app/sitemap.ts` and each page's
  `generateMetadata`. They previously disagreed (24 keys vs 7).
- Six new pages under `app/[locale]/education/`, all six locales:
  `brain-breaks-word-games` · `indoor-recess-games` · `end-of-year-classroom-activities`
  `first-day-of-school-icebreakers` · `early-finishers-activities` · `middle-school-word-games`
- Sitemap: 12 education landings × 6 locales (was 6 EN-only URLs).
- `public/llms.txt`: education section rewritten, pricing corrected, new pages + Q→URL rows added.
- Guards: `app/[locale]/education/__tests__/teacherMomentContent.test.ts` (57) and
  `educationClaims.test.ts` (48, reads raw source of 12 legacy files + llms.txt).

## RESOLVED since first draft

**Join-code length — settled, was "4-digit", is SIX characters.**
`components/education/ClassroomGameLobby.tsx:141` generates the classroom game code:
six chars from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`. `utils/utils.ts:118` does the same for
rooms (its own comment reads "vs 10,000 combinations for 4-digit numeric codes" — the
4-digit form was deliberately superseded), and the SQL `generate_join_code()` uses the same
alphabet. `backend/utils/gameUtils.ts:143` still exports a 4-digit generator but **nothing
imports it — dead code, safe to delete.**
197 "4-digit" claims across 22 files (6 languages, incl. all `lexiclash-vs-*` comparison
pages, `llms.txt` and `llms-full.txt`) were corrected to "6-character". Both guards now
FORBID the 4-digit claim rather than forbidding any length.

**Student role card dead end — fixed.** Now links to `/[locale]/student/join` with a new
`education.landing.studentJoinCta` key in all six translation files.

## OPEN — needs a decision, do not guess

1. **Watch GSC coverage on `/education/*` for ~2 weeks.**
   The cluster went from 6 sitemapped URLs to 72, plus regional hreflang (en-GB, es-MX, ru-RU…).
   The pages all `index`, so this should be correct — but `addForLocaleOnly` exists because a
   similar widening on 2026-05-20 sent Google into ~900 noindexed URLs. If coverage errors spike
   on /education/*, this change is the cause.

2. **Hub information architecture — partly addressed 2026-08-30.** `ProFramingSection` (pricing)
   was showing third on the page to logged-out visitors, before they had seen what the product
   does, and was the first of two upsells (with `DistrictUpsellStrip`) aimed at someone who had
   not signed up. Moved below the role cards: what it is → modes → comparison → pick a role →
   what it costs. NOT addressed: the guest hub still stacks ~11 sections including five separate
   card grids, which is the "same-size cards as page structure" anti-pattern. A real redesign is
   still open, and note another session is actively reworking education UI, so coordinate.

3. **Competitor free tiers — VERIFIED first-party 2026-08-30. Read this before writing any
   comparison page; it is worse for us than the secondary sources implied.**

   | Vendor | Free tier | Source |
   |---|---|---|
   | **LexiClash** | **10 students per classroom** (3 classrooms) | `lib/education/freeTierLimits.ts` |
   | Blooket | **up to 60 players** | help.blooket.com "Is Blooket Free?" |
   | Gimkit | Basic = unlimited on featured modes; 60 hard cap on 2D modes | help.gimkit.com "Player maximums" |
   | Kahoot | 10-40 depending on account category | support.kahoot.com "How many participants" |
   | Quizizz | **UNVERIFIED** — only found the *for Work* trial (30) | — |

   Our 10-student free cap is at the BOTTOM of this field, not in the middle. Earlier
   third-party listicles claimed Blooket capped at 5 — that is wrong; their own help centre
   says 60. Do NOT publish a comparison page claiming a free-tier advantage. The defensible
   differentiators are word-formation gameplay (everyone else is multiple-choice), six languages
   with native dictionaries incl. Hebrew RTL, and no student email — not price or capacity.

4. **Topics researched but not built**: phonics K-2 (biggest remaining gap), SAT/ACT vocabulary,
   partner/pair-work games, reading comprehension. Hebrew rated the strongest market (~90% win).
   ATTEMPTED 2026-08-30 and REJECTED on content quality. A `/education/phonics-games-classroom`
   page was scaffolded and fully wired (sitemap, guards, hub link, llms.txt); the generated
   content arrived but its decodable word lists were largely fabricated, so the page and its
   wiring were removed. Concrete examples, so the next attempt knows what to check:
     sv — "batt/patt/tatt/nen/ven" are not Swedish words; "fit/git/kit/wit/dot/jot/hot" are
          English; "brød" is Danish; "kjär/sjöl/skjud/tjing/flår" do not exist
     ru — bare syllables ("та", "па", "ка", "те", "пе") presented as words
     he — "תת"/"סן"/"מן" listed as vocalised CVC while written unvocalised
     ja — mostly real (あさ, いぬ, さくら) but "きゃきゃ" is not a word
   English was fine. The blocker is real:
   a phonics page's whole value is its decodable word lists, and those must be grounded in how
   each country actually teaches early reading (he ניקוד/הברות · ja ひらがな 清音/濁音/拗音 ·
   sv ljudning · ru слоговое чтение · es sílabas trabadas). An invented decodable list is
   actively harmful to a teacher, so this needs sourced lists, not a generation pass.

5. **Middle-school word lists still translated, not curriculum-sourced** (was item 2). A second
   attempt on 2026-08-30 also produced nothing. Unchanged from the original note: the words are
   valid and idiomatic, just not what a Swedish or Japanese teacher sees in their own materials.

## Verification status

- 890 tests green across 98 files at commit `43cf99a94`; 57 on the content guard after `4127d0ee3`.
- lint clean on all touched files.
- **`next build` VERIFIED.** All six new routes appear in the route table; zero type errors;
  fresh `.next/BUILD_ID`; 469 routes total (was 456). It failed once first and caught a real
  defect (`kind: 'faqs'`) that vitest could not see because vitest strips types — fixed and
  now guarded by a runtime section-kind assertion.
- **Perf: CORRECTED AGAIN — do not "fix" this.** `/[locale]/education` builds `ƒ (Dynamic)`, as do
  461 of 465 routes. My earlier note blamed a missing `generateStaticParams`. That is WRONG, and
  `app/[locale]/layout.tsx:204-213` already documents the truth: `fetchCache = 'force-no-store'`
  is what keeps every `[locale]` route dynamic, and adding `generateStaticParams` "makes the build
  prerender 214 pages but does NOT flip the classification".
  That line is an **OOM guard** for Next.js issue #90433 (a ~7.7MB-per-render leak retained by
  `cacheController`, confirmed by heap-snapshot diff 2026-07-20). Checked 2026-08-30: #90433 is
  still OPEN and was reproduced as recently as `16.2.0-canary.51`; this repo runs Next 16.2.6.
  **Removing `fetchCache` is the single highest-leverage TTFB change available AND will OOM the
  server until #90433 lands.** Re-check the issue before touching it; do not treat the `ƒ`
  classification as a bug to fix locally.
- Dead code removed: `backend/utils/gameUtils.ts` exported a 4-digit `generateRoomCode` that
  nothing imported (`friendChallengeHandler` defines its own 6-char local copy). Deleted.
- Do NOT gate a build on `pgrep -f "next build"` — another session in this repo almost always has
  one running, so the guard never exits. Use `NEXT_BUILD_DIR` to isolate instead.
