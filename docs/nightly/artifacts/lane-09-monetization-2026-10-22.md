status: research-only
attempted: add honest "for schools / bulk pricing" contact-sales CTA on teacher HQ page, lead-gen capture, TDD
files_touched: none
findings:
  - Education upsell (STEP3 priority 1) is ALREADY fully built, not a gap:
    for-schools page (full pricing/FAQ/compare/JSON-LD) -> SchoolLeadForm ->
    POST /api/education/school-lead -> school_leads table -> admin review
    (/api/admin/school-leads + export) -> instant notify -> weekly digest
    cron (pg_cron scheduled, supabase/migrations/20260911140000). Also
    mounted: DistrictUpsellStrip, TeacherAccessCTA, ClassLimitUpsellModal,
    TeacherProAskBanner, HomeProCard, ProGate, LobbyPressureDials — all
    emit iap_viewed with distinct `source` tags already.
  - IAP/subscription demand-probe (STEP3 priority 3) also already shipped:
    RemoveAdsProbe mounted in settings/PageClient.tsx, SupporterInterestCard
    mounted in profile/PageClient.tsx. Both emit iap_viewed/iap_tapped.
  - Ad-UX (STEP3 priority 2): rewarded_ad_offered/watched/declined fully
    instrumented in utils/growthTracking.ts (dual-emit for collect-revenue.sh
    noted in a comment there). Brief's "0/24h, 7d avg 0.14" signal is too
    thin (near-zero baseline either way) to localize a root cause without
    segmenting native-vs-web and checking H5 ads gate state — guessing at a
    fix here risks the "silent failure" class (rule 60-recurring-pitfalls
    Class 4) if the real cause is just low night traffic, not a bug.
  - 184 files already modified in the working tree tonight (other lanes'
    in-flight work spans admin/, education/, teacher/) — avoided touching
    any file in that set to prevent collision; none of the lead-gen/IAP
    files above were in it, so they were safe to inspect but nothing there
    needed a change.
next_steps:
  - Segment rewarded_ad_watched by platform (native vs web) before concluding
    anything is broken — H5 ads are still pending AdSense approval, so a
    near-zero web number may be fully expected.
  - If a future night wants a genuinely new lever: audit whether for-schools
    page CTAs reach teachers who are NOT yet at the free-tier class limit
    (today's upsell surfaces mostly trigger at-limit) — a softer mid-funnel
    nudge for active-but-not-blocked teachers is unexplored.
  - Re-check docs/nightly/intel/revenue-latest.json freshness; brief flagged
    revenue + search collectors as stale this run.
