status: shipped
attempted: Add school_lead_form_viewed tracking to SchoolLeadForm for view→submit funnel measurement; add event type to GrowthEvent union
files_touched:
  - fe-next/components/education/SchoolLeadForm.tsx  (useEffect fires school_lead_form_viewed on mount)
  - fe-next/utils/growthTracking.ts                  (added | 'school_lead_form_viewed' to GrowthEvent union)

## What shipped
Added `school_lead_form_viewed` PostHog event firing on mount of `SchoolLeadForm`.
Now the education lead funnel in PostHog will show:
  education_upsell_impression  (DistrictUpsellStrip / DistrictUpsellBanner — already tracked)
  → landing_cta_clicked        (click to /education/for-schools — already tracked)
  → school_lead_form_viewed    (NEW — form rendered/visible to user)
  → school_lead_submitted      (form submitted — already tracked)

This closes the view→submit blind spot: we can now compute conversion rate
and decide whether to optimize form placement, copy, or add a sticky CTA.

## Revenue state (qualitative — raw numbers in revenue-latest.json)
- AdMob (Android, live): eCPM low; rewarded-ad engagement ~1/day from ~694 active users
  → engagement rate very low; likely limited by Android-only surface + small active base
  → exp-practice-wheel-cta-v1 (wired 06-19) is the active lever; watch for data
- AdSense (web): pending approval; re-submit window open (structural bar cleared 06-19)
  → manual op required; no code change possible tonight
- Education upsell: full lead-capture funnel already built
  → SchoolLeadForm → POST /api/education/school-lead → school_leads table → admin email
  → DistrictUpsellBanner on teacher dashboard, DistrictUpsellStrip on education landing
  → TeacherAccessCTA (with district link) on esl-word-games, vocab-games-classroom, games-for-teachers

## What infrastructure is still missing
- No pricing/plans page (what would a district license cost?)
- No email follow-up sequence for submitted leads
- No "For Schools" entry in main mobile nav (MobileDrawer.tsx / MobileTabBar.tsx)
- No hero CTA click-tracking on for-schools page (server component; needs client wrapper)

## next_steps
1. [human] AdSense re-submit — window open, manual console action
2. [lane-09] After 7d data: query PostHog school_lead_form_viewed vs school_lead_submitted;
   if conversion <30% → optimize form placement or add sticky scroll-to-form CTA
3. [lane-09] Add pricing/plans teaser section to for-schools page (what districts pay for
   is already listed in content.ts `coming` array; add a "pricing inquiry" framing)
4. [lane-09] Add "For Schools" link to MobileDrawer.tsx for direct teacher discovery path
5. [watch] exp-practice-wheel-cta-v1 — review rewarded ad engagement after 7d
