status: research-only
attempted: education upsell lead-gen CTA on teacher/education page — honest "for schools/bulk pricing, contact us" link, i18n'd, TDD
files_touched: none

findings:
- Verified (grep, not assumption) that every candidate in tonight's ranked-action list is ALREADY built and wired:
  1. Education lead-gen: `/education/for-schools` has a full lead form (`SchoolLeadForm.tsx` -> `app/api/education/school-lead/route.ts`, rate-limited, Resend admin email). `DistrictUpsellStrip` + `TeacherAccessCTA` are rendered on ALL 16 `EducationLandingTemplate` pages (default `showUpsell`/`showTeacherCta` = true) plus the hub page and `/education/access` — both track `education_upsell_impression` + `landing_cta_clicked` via growthTracking. Not a gap.
  2. Ad-UX instrumentation: `rewarded_ad_offered/watched/declined` all fire from `utils/growthTracking.ts` + `hooks/useAdMob.ts`; the "offered with zero downstream" failure mode is already diagnosed and handled inline (useAdMob.ts:91-99 comment + fix).
  3. IAP/subscription interest probe: `components/ads/RemoveAdsProbe.tsx` (settings page) and `components/monetization/SupporterInterestCard.tsx` (profile page) already exist, are mounted, and emit `iap_viewed`/`iap_purchased`-family events. Not a gap.
- Net: this lane's known backlog (per prior-nights' skill table "lane 09 kept exactly 1 file every night") appears low-yield NOT because the prompt is wrong, but because prior nights already shipped the obvious wins — tonight found nothing left to wire without inventing new surface area, which the guardrails correctly discourage doing carelessly under time pressure.
- Intelligence brief signal (rewarded_ad_watched 2/24h vs 7d-avg 3.4) is too thin/stale (search+supabase sources stale-reused) to act on blindly — needs a fresh, non-stale pull before treating it as real.

next_steps:
- Before lane 09 claims another "obvious CTA" action: pull actual conversion counts (school_leads row count/day, RemoveAdsProbe/SupporterInterestCard click-through in PostHog) via a FRESH (non-stale) query — if a fully-wired funnel is converting at ~0, THAT's the real, specific, actionable finding (matches prior "silent failure" pattern in project memory), not "CTA missing".
- Founder action still open: run `scripts/nightly/lib/pull-revenue-snapshot.sh` (Playwriter) and/or provision `ADMOB_API_TOKEN` so future briefs aren't stale on search/supabase.
- Reconsider lane 09's prompt: its top-3 ranked actions are now all "already exists" — the prompt should route toward funnel-conversion analysis / real ad-UX A/B ideas rather than re-checking for missing CTAs each night.
