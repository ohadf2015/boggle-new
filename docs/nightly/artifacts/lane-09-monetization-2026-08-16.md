status: research-only
files_touched: none
next_steps: |
  Verified (not just brief-assumed) that all 3 top-priority playbook actions are
  ALREADY SHIPPED by prior nights — re-auditing tonight would have duplicated work:
    1. Education lead-gen: /education/for-schools has a full SchoolLeadForm wired to
       a real API route (app/api/education/school-lead), pricing JSON-LD, FAQ, and is
       linked from Footer, EducationHero, TeacherAccessCTA, DistrictUpsellBanner,
       ClassLimitUpsellModal, and the education hub — not an orphan page.
    2. IAP/subscription demand probe: components/monetization/SupporterInterestCard.tsx
       is rendered on /profile (PageClient.tsx:505) and fires `iap_viewed`.
       components/ads/RemoveAdsProbe.tsx is rendered on /settings, fires `iap_viewed` +
       `iap_tapped`, correctly shows "coming soon" (no fake purchase path — guardrail-safe).
    3. Ad-event instrumentation: rewarded_ad_offered/watched/declined all wired in
       utils/growthTracking.ts + hooks/useAdMob.ts, with hardened Android-suspend/
       visibility-reconcile handling already in place (heavily commented, clearly the
       product of several past incident fixes — correctly left untouched tonight).

  Intel brief signal ("rewarded_ad_watched 0/24h") is too thin to act on (score 0.1,
  reach 0, brief itself flags search sources as stale) — not evidence of a real drop,
  just a quiet-traffic window.

  Genuinely open item (not shipped anywhere): `iap_purchased` is declared as a
  GrowthEventName in utils/growthTracking.ts:134 but has ZERO call sites — this is
  correct for now (no real purchase path exists yet, RemoveAdsProbe intentionally
  shows "coming soon"), so firing it would be premature, not a bug. Flag for whichever
  night ships an actual IAP purchase flow: wire `iap_purchased` at that point, don't
  add it speculatively.

  Ranked backlog for tomorrow's lane 09:
    1. If SupporterInterestCard/RemoveAdsProbe have accumulated iap_tapped volume by
       now, that's the actual signal for whether to greenlight a real remove-ads IAP
       build (out of scope for an autonomous lane — human queue).
    2. Revenue snapshot (docs/nightly/intel/revenue-latest.json) — check if still
       stale; if so, prompt founder to re-run scripts/nightly/lib/pull-revenue-snapshot.sh
       or provision ADMOB_API_TOKEN so the brief has real reach numbers instead of a
       0.1-score placeholder.
    3. Check school-lead conversion: query Supabase for school_lead submissions volume
       since for-schools shipped — if near-zero after real traffic, the gap is
       discoverability/SEO (lane 06/08 territory) not the form itself.
