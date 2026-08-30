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

2. **Non-English word lists on `middle-school-word-games` are translated English**, not sourced
   from each country's curriculum. Now idiomatic and valid (12 Hebrew + 1 Swedish word corrected)
   but not what a Swedish or Japanese teacher sees in their own materials. No page claims
   curriculum alignment, so this is a quality ceiling, not a false claim.

3. **Hub structural redesign not attempted.** Reserved-accent violations (`neo-yellow` on generic
   CTAs) and a two-lime CTA collision were fixed; the stacked card-grid structure was left alone.

4. **Competitor free-tier numbers conflict between sources.** Only "Kahoot ≈ 10 free participants"
   is corroborated across searches. Verify each vendor's own pricing page before publishing any
   comparison content.

5. **Topics researched but not built** (deliberately — publish in batches, watch 2-4 weeks first):
   phonics K-2 (biggest remaining gap), SAT/ACT vocabulary, partner/pair-work games,
   reading comprehension. Hebrew rated the strongest market (~90% win likelihood).

## Verification status

- 890 tests green across 98 files at commit `43cf99a94`; 57 on the content guard after `4127d0ee3`.
- lint clean on all touched files.
- **`next build` VERIFIED.** All six new routes appear in the route table; zero type errors;
  fresh `.next/BUILD_ID`; 469 routes total (was 456). It failed once first and caught a real
  defect (`kind: 'faqs'`) that vitest could not see because vitest strips types — fixed and
  now guarded by a runtime section-kind assertion.
- **Perf claim corrected.** `/[locale]/education` still builds `ƒ (Dynamic)`, not `●`. So does
  everything else: **461 of 465 routes are ƒ, 3 static, 1 SSG.** Dropping `force-dynamic` is
  still a real gain (the route no longer opts out of caching entirely), but the pages cannot
  prerender because **`app/[locale]` has no `generateStaticParams`** — a repo-wide condition,
  not something these pages can fix. Making the locale segment static is the actual lever for
  site-wide render performance, and it is a separate, higher-blast-radius change.
- Do NOT gate a build on `pgrep -f "next build"` — another session in this repo almost always has
  one running, so the guard never exits. Use `NEXT_BUILD_DIR` to isolate instead.
