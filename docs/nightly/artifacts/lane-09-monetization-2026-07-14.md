status: shipped
attempted: Add honest education upsell CTA (school pricing inquiry) to /education hub role cards for unauthenticated visitors
files_touched:
  - fe-next/app/[locale]/education/PageClient.tsx
  - fe-next/app/[locale]/education/__tests__/EducationLanding.authShortcut.test.tsx
next_steps: |
  - Monitor growth:landing_cta_clicked{cta:"district_role_card"} in PostHog to measure click-through
  - SEO traffic to /education/for-schools is the real bottleneck (1 visit in 30 days);
    hand off to Lane 06 to target "school word game" / "classroom vocabulary game" keywords
  - Revenue-data hygiene: AdMob only 1.57 rewarded_ad_watched/day (7d avg); manual revenue
    snapshot needed — run scripts/nightly/lib/pull-revenue-snapshot.sh or provision ADMOB_API_TOKEN

## Intelligence summary
- Education hub: ~10-27 pageviews/week (real users)
- For-schools lead form page: 1 pageview in 30 days (critical discovery gap)
- school_lead_submitted / school_lead_form_viewed: 0 events in PostHog — zero leads captured
- education_upsell_impression: 0 events — DistrictUpsellStrip buried below 5 scroll sections
- Rewarded ads: avg 1.57/day (extremely low), ad system fully built but under-trafficked

## Change shipped
Added a "For schools & districts →" link (data-testid="district-role-card-link") directly
in the teacher role card on the education hub's non-teacher view. Previously the only path
to /education/for-schools for unauthenticated visitors was a buried DistrictUpsellStrip
after MoatTrifectaSection + SixModeTour + ComparisonStrip + role cards + social proof.
Now it appears inside the teacher card, immediately visible after minimal scroll.
Reuses existing education.landing.districtCta.* translation keys (all 5 locales covered,
no new strings). Fires growth:landing_cta_clicked{cta:"district_role_card"} on click.
TDD: test added first (district-role-card-link present for unauthenticated users).
