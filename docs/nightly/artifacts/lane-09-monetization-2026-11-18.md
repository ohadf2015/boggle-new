status: research-only
attempted: checked top-3 revenue plays from brief; all already shipped, no safe gap found tonight

findings (ranked):
1. Education upsell is NOT a gap. for-schools/page.tsx + content.ts (6 locales) already has
   full lead-capture: EducationPackages (pricing cards) + SchoolLeadForm wired via
   ForSchoolsPackages. EducationLandingTemplate (shared by ALL education landing pages:
   spelling-bee-practice, esl-word-games, vocabulary-games-classroom, etc) already renders
   DistrictUpsellStrip + TeacherProCompareCheckoutStrip unconditionally for every page using
   it. My planned "add a for-schools CTA to content landing pages" would have duplicated
   shipped infra — stopped before writing it.
2. Ad event instrumentation is NOT a gap either. utils/growthTracking.ts already emits
   rewarded_ad_offered/watched/declined (lines ~2001-2023), dual-emitted for
   collect-revenue.sh. Brief's "0/24h rewarded_ad_watched" is a usage/traffic signal, not a
   missing-instrumentation bug — nothing to wire.
3. Trial/billing surface (brief option 3, IAP demand probe) is superseded: master already
   shipped real trial + one-tap checkout in the last 48h (dae168fa5, 3cfb2ba04, e2d80c81d) —
   a demand-probe behind a flag would be stale the moment it ships.
4. Revenue snapshot (docs/nightly/intel/revenue-latest.json) is stale/thin this run — only
   PostHog ad-event signal came through, both marked stale (search, supabase sources). No
   AdMob API token read this run either.

next_steps:
- Founder: run scripts/nightly/lib/pull-revenue-snapshot.sh (Playwriter) or provision
  ADMOB_API_TOKEN so tomorrow's brief has real eCPM/fill signal instead of a single flat
  PostHog line.
- Next real gap to audit (not done tonight, needs a live click-through, not just grep):
  whether DistrictUpsellStrip / TeacherProCompareCheckoutStrip actually render correctly in
  browser on a non-teacher-logged-in visitor (never opened the page, only read the component
  tree) — worth a Playwriter pass before assuming the upsell funnel converts.
- No code touched. No files changed.
