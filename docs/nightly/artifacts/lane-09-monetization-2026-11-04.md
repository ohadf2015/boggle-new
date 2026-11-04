status: research-only
files_touched: none
findings:
  - School lead-gen CTA (priority-1 candidate) ALREADY SHIPPED: components/education/landing/LandingSchoolLead.tsx
    has SchoolLeadForm, trackGrowthEvent('landing_cta_clicked'), useUpsellImpression. Brief's "no lead capture
    on education pages" is stale — do not re-build.
  - Rewarded-ad flow (hooks/useAdMob.ts) is already deeply hardened (immersive-mode fix, visibility-reconcile
    grace, interstitial-vs-video dual path, stuck-at-30s fixes all documented inline). Too high blast-radius to
    touch without a real repro in an 8-min window — deferred, not attempted.
  - Intel brief's only signal (ad_event_rewarded_ad_watched 0/24h, score 0.1) explicitly flags revenue/impact/
    search/supabase sources as STALE this run — not enough confidence to act on.
next_steps:
  - Lane 09 tomorrow: check LandingSchoolLead mobile breakpoints (components/education/landing/LandingSchoolLead.tsx:22-54)
    — eyebrow/body/bullets/form-teaser/form-note are ALL `hidden sm:block`, so phone visitors (the stated 15-40
    phone-heavy audience) see only a title + bare CTA button with zero context before the form. Candidate fix:
    unhide eg2Land.school.body on mobile (one line, low risk) and A/B via landing_cta_clicked.
  - Founder: provision ADMOB_API_TOKEN or re-run scripts/nightly/lib/pull-revenue-snapshot.sh so lane 09 gets a
    live revenue signal instead of a stale/zero-reach one.
  - Do not re-propose school-lead-gen or contact-sales scaffolding — it exists and is wired.
