status: research-only
attempted: add education school-lead CTA / ad-UX tweak / IAP interest probe per brief's standard playbook.
files_touched: none

## Finding: the brief's standard playbook is stale — all 3 default levers already shipped by prior nights
Checked each STEP-3 option before writing code. All three are already built AND wired (not orphaned):

1. **Education lead-gen** — contradicts the brief line "NO pricing, NO lead capture, NO contact-sales
   anywhere" on `app/[locale]/education/*`. Reality: `components/education/DistrictUpsellStrip.tsx`
   (mounted in `EducationLandingTemplate.tsx` + `education/access/PageClient.tsx`),
   `components/education/SchoolLeadForm.tsx`, `components/teacher/pro/SchoolQuoteForm.tsx`,
   `app/api/education/school-lead/route.ts`, admin queue `components/admin/SchoolLeadsQueue.tsx`,
   weekly digest cron `app/api/cron/school-leads-digest/route.ts`. Full funnel exists.
2. **Ad-UX / rewarded-ad instrumentation** — `rewarded_ad_offered/watched/declined` already emitted
   (`utils/growthTracking.ts:1842-1864`), native stuck-watchdog + visibility-reconcile race already
   hardened (`hooks/useAdMob.ts` — extensive comments document prior incidents, e.g. "native
   rewarded_ad_offered events with ZERO downstream breadcrumbs" already fixed with an onError settle).
3. **IAP/subscription interest probe** — `components/ads/RemoveAdsProbe.tsx` (mounted in
   `settings/PageClient.tsx`) and `components/monetization/SupporterInterestCard.tsx` (mounted in
   `profile/PageClient.tsx`) both already fire `iap_viewed`. Teacher Pro upsell has ~10 separate
   `iap_viewed` call sites across cards/banners/gates — an exhaustive surface already.

PostHog brief signal (`rewarded_ad_watched: 0/24h, reach=0`) is too low-reach/stale to act on blind —
could be traffic sparsity, not a code regression; not safe to diagnose further in a 10-min lane window.

## Ranked backlog for tomorrow (none of these are quick — flag as real lane-09 work, not a 10-min pick)
1. **Audit the shipped lead-gen funnel for conversion, not existence.** 9+ nights of "shipped" lead-gen
   components exist; nobody has measured `iap_viewed` → `school-lead submitted` → admin-contacted rate.
   Query `app/api/admin/school-leads/export` data + PostHog `iap_viewed` counts by surface; the real
   lever now is CONVERSION tuning (copy, placement, timing) of EXISTING CTAs, not more CTAs.
2. **`rewarded_ad_declined` reason breakdown** — if `reason` values cluster on one surface, that's a
   same-night, single-file copy/timing fix (still TDD, still flagged). Needs a PostHog query first.
3. Update the lane-09 brief's STEP-3 playbook (`run.sh` prompt) — it describes a pre-lead-gen state that
   no longer matches the repo; every lane-09 run after this one will waste its first 10-15 min
   rediscovering this unless the prompt itself is corrected to point at the conversion-audit task above.

next_steps: tomorrow's lane-09 should start from the ranked backlog above, not the STEP-3 default list — point it at school-lead funnel conversion data (PostHog iap_viewed + admin school-leads export) instead of re-checking for missing CTAs that already exist.
