status: research-only
attempted: education upsell lead-gen CTA on /education hub -> for-schools
files_touched: none

findings:
- for-schools page (app/[locale]/education/for-schools/page.tsx) already ships full
  lead-capture: hero_tell_us CTA, ForSchoolsPackages component with #lead anchor,
  closing CTA, schema.org Offer nodes for Free/Pro/Schools tiers. The brief's
  "education free, NO pricing, NO lead capture anywhere" premise is stale for this
  page — it's a solved problem, not an opportunity.
- education hub (app/[locale]/education/page.tsx:92,147) already links to for-schools
  with a dedicated PostHog capture attribute (edu_hub_for_schools_card). Funnel entry
  is wired.
- rewarded_ad_offered/watched/declined (utils/growthTracking.ts:1917-1939) are all
  instrumented and dual-emitted. hooks/useAdMob.ts:93-101 has a resolved comment about
  a prior offered-with-no-downstream-breadcrumb bug (settles caller immediately on
  early exit) -- already fixed, not an open gap.
- Intel brief signal (rewarded_ad_watched 0/24h, severity 0.4, reach=0) is too thin to
  act on blind; revenue/search/supabase collectors were stale this run.

next_steps (ranked backlog for tomorrow):
1. Re-run revenue collector / provision ADMOB_API_TOKEN so lane 09 gets real signal
   instead of a 0-reach stub.
2. Audit whether /education/for-schools's existing lead form actually reaches a human
   (check Supabase table or email target behind ForSchoolsPackages' lead submit) --
   if the form writes somewhere nobody reads, that's the real unlock, not building
   a new CTA.
3. IAP/subscription interest probe (iap_viewed on a flagged "remove ads" teaser) still
   unbuilt -- pure-analytics demand signal, no billing path, low risk, good size for a
   future lane-09 run once step 1 gives real numbers to act on.
