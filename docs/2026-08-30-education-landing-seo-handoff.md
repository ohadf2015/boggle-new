# Education landing pages + SEO/GEO — handoff (2026-08-30)

Branch `worktree-edu-landing-seo`, 4 commits, **not pushed**.
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

## OPEN — needs a decision, do not guess

1. **~90 "4-digit code" claims across the older education pages.**
   Two generators exist: `backend/utils/gameUtils.ts:143` returns a 4-digit number;
   `utils/utils.ts:118` and SQL `generate_join_code()` return 6 alphanumeric chars.
   Neither is reachable from the `/education/classroom-game` flow via
   `backend/modules/classroomGameManager.ts` — it receives `gameCode`, never generates it.
   **Find who generates the code the classroom flow shows**, then either delete the claims or
   let new copy state the length too. New pages currently say only "a join code".
   `educationClaims.test.ts` deliberately does NOT guard this yet.

2. **Watch GSC coverage on `/education/*` for ~2 weeks.**
   The cluster went from 6 sitemapped URLs to 72, plus regional hreflang (en-GB, es-MX, ru-RU…).
   The pages all `index`, so this should be correct — but `addForLocaleOnly` exists because a
   similar widening on 2026-05-20 sent Google into ~900 noindexed URLs. If coverage errors spike
   on /education/*, this change is the cause.

3. **Student role card on the education hub has no CTA** (`app/[locale]/education/PageClient.tsx`,
   "Student card"). Dead end. Not fixed because the right destination is unknown —
   `/join?code=X` 308s then 404s; only `/join/X` resolves.

4. **Non-English word lists on `middle-school-word-games` are translated English**, not sourced
   from each country's curriculum. Now idiomatic and valid (12 Hebrew + 1 Swedish word corrected)
   but not what a Swedish or Japanese teacher sees in their own materials. No page claims
   curriculum alignment, so this is a quality ceiling, not a false claim.

5. **Hub structural redesign not attempted.** Reserved-accent violations (`neo-yellow` on generic
   CTAs) and a two-lime CTA collision were fixed; the stacked card-grid structure was left alone.

6. **Competitor free-tier numbers conflict between sources.** Only "Kahoot ≈ 10 free participants"
   is corroborated across searches. Verify each vendor's own pricing page before publishing any
   comparison content.

7. **Topics researched but not built** (deliberately — publish in batches, watch 2-4 weeks first):
   phonics K-2 (biggest remaining gap), SAT/ACT vocabulary, partner/pair-work games,
   reading comprehension. Hebrew rated the strongest market (~90% win likelihood).

## Verification status

- 890 tests green across 98 files at commit `43cf99a94`; 57 on the content guard after `4127d0ee3`.
- lint clean on all touched files.
- **`next build` was still running when the session ended.** It failed once and caught a real
  defect (`kind: 'faqs'`) that vitest could not see, because vitest strips types. That is fixed
  and guarded. **Re-run one build to confirm the six routes appear in the route table** and to
  see whether `/[locale]/education` renders `ƒ` or `●` after the `force-dynamic` → `revalidate`
  change. Log pattern: `/tmp/edu-rebuild-*.log`.
- Do NOT gate a build on `pgrep -f "next build"` — another session in this repo almost always has
  one running, so the guard never exits. Use `NEXT_BUILD_DIR` to isolate instead.
