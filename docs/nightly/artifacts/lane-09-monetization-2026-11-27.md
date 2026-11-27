status: research-only
attempted: add an honest "For schools / bulk pricing" contact-sales lead-capture CTA to a teacher/education page
files_touched: none

## Finding: the brief's "known surface" for education was stale — lead-gen already shipped
The lane-09 prompt claims education pages have "NO pricing, NO lead capture, NO contact-sales
anywhere." That is false today. Verified by reading the actual code (not the brief):
- `/[locale]/education/for-schools` has a full qualified lead form (`SchoolLeadForm.tsx`) posting
  to `/api/education/school-lead`, backed by `school_leads` table (migration `20260608190000`).
- `DistrictUpsellStrip.tsx` (teacher-individual + district CTA pair) is already mounted on
  `education/access` and the education landing template.
- `ClassLimitUpsellModal.tsx` (shown on class-limit / student-limit / trial-expired) already
  footers a "need more than Pro? → for-schools quote" link with its own tracked click event.
- `ResultsSchoolQuoteLink.tsx`, `ForSchoolsLink.tsx`, `TeacherAccessCTA.tsx` cover more surfaces.
This is a mature, multi-surface funnel already instrumented with `school_lead_form_viewed`/
`school_lead_submitted`/`landing_cta_clicked`/`education_upsell_impression` growth events.
**Lane 09's "known surface" block needs lane 7 to refresh it** — it still describes a 2026-era
state that ~128 commits of `origin/master` have since outgrown, same class of staleness Headline
8 in learnings.md already flags for other lanes.

## Why no code shipped tonight
1. The one lever the prompt pointed at (education lead-gen) turned out already built — building
   it again would be pure duplication, and the actual gap (is the funnel *converting*, is it
   reachable from enough teacher surfaces) needs real usage data, not a guess at 11pm.
2. `fe-next/node_modules/.bin` is empty in this tree (0 entries, `node_modules` not even present at
   depth-check time) — this is the same infra issue learnings.md Headline 0 describes. A lane must
   not `npm ci` the tree mid-run, so I could not self-verify any code change (no eslint/tsc), and
   with the gate equally unable to provision, any change tonight ships unverified. Given the
   explicit "least code that works" + "never begin an edit you can't finish and verify" rules,
   the safer call was to not edit, rather than gamble a monetization-adjacent file untested.
3. The next candidate (ad-UX instrumentation: `rewarded_ad_offered` tracking is per-component —
   confirmed only 2 of the "6 rewarded surfaces" named in the brief (`HintButton`, reveal-answer)
   have their own offered-event tests; `hooks/useRewardedAd.ts` itself has zero `rewarded_ad_`
   tracking calls) is real but touches a shared hook + multiple call sites — too large a surface
   to land and verify in the remaining budget without a build/test runner available.

## Ranked backlog for tomorrow (or once `.bin` is fixed)
1. **(effort S, real)** Audit whether `rewarded_ad_offered` fires consistently across all 6
   rewarded-ad surfaces (brief: 0 `rewarded_ad_watched`/24h — can't tell demand-starved from
   instrumentation gap without this). Start at `hooks/useRewardedAd.ts` — it has no centralized
   offered-event; `HintButton`/reveal-answer track it locally per-surface, so coverage is
   per-caller discipline, not guaranteed. Grep every `useRewardedAd(` call site, confirm each
   pairs with a `trackGrowthEvent('rewarded_ad_offered', ...)`.
2. **(effort S)** Confirm the for-schools/district funnel is actually *reachable* from enough
   traffic: is `DistrictUpsellStrip` or the for-schools link surfaced in the signed-in Teacher
   Dashboard itself (not just marketing/landing pages + limit modals)? A teacher running several
   classrooms (proxy signal for "whole school") hits the class-limit modal only at the Pro
   ceiling — check `FREE_TIER_LIMITS.classes` vs typical multi-class teacher behavior to see if
   that ceiling is ever reached before they churn.
3. **(effort M)** Once `.bin`/`npm ci` is fixed (human queue, tracked in learnings.md Headline 0),
   re-attempt an IAP-interest probe (`iap_viewed` on a "remove ads" surface, analytics-only, no
   purchase path) per the original Step 3 option 3 — still untried, still low-risk.
next_steps: fix node_modules/.bin (human queue, blocks self-verification for every lane);
refresh lane-09's "known surface" education block (lead-gen is built, not missing); audit
rewarded_ad_offered coverage across all 6 ad surfaces before concluding demand is zero.
