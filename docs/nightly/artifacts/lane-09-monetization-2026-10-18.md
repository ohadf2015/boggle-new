status: research-only
files_touched: none
findings:
  - Brief's "Known surface" claim (education free, NO pricing/lead-capture/contact-sales) is STALE.
    Verified by reading code, not brief: app/[locale]/education/for-schools/page.tsx already ships
    ForSchoolsPackages (components/education/EducationPackages.tsx) with full pricing cards
    (Teacher Pro $9/mo, School $49/teacher/yr) + SchoolLeadForm lead capture at #lead anchor,
    plus org/offer JSON-LD. Teacher-side upsell is ALSO built out: ClassLimitUpsellModal,
    AssignmentLimitUpsell, TeacherProAskBanner, TeacherProUsagePromptCard, HomeProCard,
    StudentCapMeter, teacher/upgrade route. This matches memory teacher-activation-root-cause-2026-10-16
    (shipped 21b017b0b) — Pro asks already gated to wait for value, not spammed.
  - Ad-UX option: intel brief's only signal is rewarded_ad_watched 0/24h, 7d avg also 0 — flat zero,
    not a drop. No actionable delta to chase without live AdMob/PostHog access (search+supabase
    collectors stale this run per brief). Event names (rewarded_ad_offered/watched/declined) are
    already wired in utils/growthTracking.ts and called from hooks/useRewardedAd.ts — instrumentation
    gap is NOT the issue.
  - IAP demand-probe: CONFIRMED already shipped too — components/monetization/SupporterInterestCard.tsx
    and components/ads/RemoveAdsProbe.tsx both call iap_viewed, each with their own test file. Prompt's
    option 3 ("remove ads / supporter interest probe behind a flag") is not a gap, it's done.
next_steps:
  - Lane 09 (or lane 07/self-learn): correct the stale "no pricing/lead-capture" + "IAP probe" lines in
    this lane's prompt / brief's "Known surface" section — cost tonight's first ~8 min re-discovering
    work already shipped (2026-10-16 teacher activation + an unlogged monetization/ads probe lane).
  - All 3 of the prompt's suggested actions (education lead-gen, IAP probe, ad-event wiring) are
    already live. Tomorrow's lane 09 needs genuinely NEW candidates, not a rerun of this list —
    e.g. check SupporterInterestCard/RemoveAdsProbe CONVERSION data (iap_viewed vs any
    downstream signal) to see if the probe itself needs tuning, rather than re-proposing it.
  - Founder: provision ADMOB_API_TOKEN or run pull-revenue-snapshot.sh so rewarded_ad_watched=0 can
    be distinguished from "no data" vs "genuinely zero plays".
