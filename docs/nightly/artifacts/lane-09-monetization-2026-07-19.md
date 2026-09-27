status: shipped
attempted: Add DistrictUpsellStrip to education/access page to funnel highest-traffic education page → for-schools lead form
files_touched:
  - fe-next/app/[locale]/education/access/PageClient.tsx (+2 lines: import + render DistrictUpsellStrip)
findings:
  - Education funnel stack is COMPLETE (for-schools page, SchoolLeadForm, API, all 6 locale translations, DistrictUpsellBanner on teacher dashboard, DistrictUpsellStrip on education sub-pages)
  - TRAFFIC GAP: education pages ~76 pageviews/month, dominated by /education/access (individual teacher signup) — only 2 for-schools views ever (both Hebrew)
  - TELEMETRY GAP: zero growth:education_upsell_impression or growth:landing_cta_clicked with district CTA values despite DistrictUpsellStrip being on pages with traffic — likely low-volume/crawlers; growth:rewarded_ad_offered has call sites in useRewardedAd.ts (gated, not missing)
  - access page was the only high-traffic education entry point WITHOUT a for-schools link — now fixed
  - Rewarded ad telemetry (offered/watched/declined) is wired correctly; -71% is gate-related (daily limit, no provider, cooldown), not a missing call site
  - Revenue snapshot stale/absent — founder should run scripts/nightly/lib/pull-revenue-snapshot.sh for current AdMob data
next_steps:
  - After a few days: check if growth:education_upsell_impression fires from /education/access (the new DistrictUpsellStrip); if still zero, investigate PostHog initialization on static education pages
  - Bigger lever = SEO traffic to education pages (currently ~76 views/month; lane 06 owns this)
  - Mint never-expire SUPABASE_ACCESS_TOKEN for unattended revenue data pulls
  - AdMob revenue snapshot: founder to provision ADMOB_API_TOKEN or run Playwriter snapshot for actionable ad metrics
