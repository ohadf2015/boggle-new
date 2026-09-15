status: research-only
attempted: education upsell lead-capture CTA on teacher/education page — found already fully shipped, pivoted to ad-UX audit, found that also fully instrumented, no safe new lever found in budget
files_touched: none
findings:
  - education upsell (STEP-3 option 1) is NOT missing. app/[locale]/education/for-schools/page.tsx
    already has NoAccountCta + ForSchoolsPackages + #lead anchor; components/education/SchoolLeadForm.tsx
    posts + fires school_lead_submitted/school_lead_form_viewed growth events. Hub page links to it
    (app/[locale]/education/page.tsx:282).
  - in-app upsell path (teacher hits free-tier class limit) also already wired end-to-end:
    components/teacher/ClassLimitUpsellModal.tsx shows Teacher Pro $9/mo (routes to /teacher/upgrade,
    the single checkout owner per its own code comment) AND a district/school lead-capture link
    (education.landing.districtCta.*) with its own landing_cta_clicked tracking. This is a mature,
    well-built funnel already — nothing obviously missing to add without duplicating existing UI.
  - ad-UX (STEP-3 option 2): trackRewardedAdOffered/Watched/Declined already called from every
    surface I could find — WatchAdButton, WatchAdForFreezeButton, RewardedAdGoldButton,
    DoubleGoldAdButton, TimeLowAdPrompt, BossRushResults, RetryAssistModal, MemoryHuntCluePanel,
    useRewardedFeatureUnlock. No surface found missing the offered/watched/declined instrumentation
    the brief asked me to check for.
  - brief signal (rewarded_ad_watched 0/24h, 7d avg 2.29, score 0.15, severity 0.6) is LOW-confidence:
    brief itself flags posthog/supabase sources as stale this run. Given full instrumentation already
    exists, this reads as a genuine low-volume event (small live surface count) rather than a wiring gap.
    Did not chase further — would need a live PostHog query, out of scope for a code lane.
next_steps: |
  Tomorrow: don't re-attempt "wire up education lead capture" or "instrument rewarded ads" — both are
  done, verified by code read tonight. If revenue lane continues to get those STEP-3 defaults, the
  static prompt options need updating (they describe a gap that closed already, possibly weeks ago).
  Better targets for a future monetization lane, none attempted tonight (ran out of safe/verifiable
  scope, not time):
    1. Query PostHog directly for rewarded_ad_offered vs rewarded_ad_watched over 7d to see if the
       drop-off is at the offer→watch step (real ad-UX friction, fixable) or just low offer volume
       (traffic issue, not ad-UX). The brief's 0/24h number can't tell these apart.
    2. Audit whether ClassLimitUpsellModal / district CTA actually get impressions (landing_cta_clicked
       volume) — the funnel is built but may be getting zero traffic if few teachers ever hit the
       3-class free-tier ceiling.
    3. Revenue snapshot pipeline is stale this run per the brief (revenue-latest.json / AdMob token) —
       founder should run scripts/nightly/lib/pull-revenue-snapshot.sh or provision ADMOB_API_TOKEN so
       this lane gets real signal instead of a thin PostHog-only brief.
