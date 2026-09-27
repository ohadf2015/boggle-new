status: shipped
files_touched:
  - fe-next/utils/growthTracking.ts (added iap_tapped event type)
  - fe-next/components/ads/RemoveAdsProbe.tsx (new — IAP interest probe)
  - fe-next/components/ads/__tests__/RemoveAdsProbe.test.tsx (4 TDD tests)
  - fe-next/translations/en.js (settings.removeAds keys)
  - fe-next/translations/he.js (settings.removeAds keys, Hebrew)
  - fe-next/translations/sv.js (settings.removeAds keys, Swedish)
  - fe-next/translations/es.js (settings.removeAds keys, Spanish)
  - fe-next/app/[locale]/settings/PageClient.tsx (wired RemoveAdsProbe in Support section)

what_shipped: >
  IAP interest probe in Settings > Support section. Fires iap_viewed on mount +
  iap_tapped on click (intent=remove_ads). Pure demand-signal — no economy change,
  no purchase path. 4 locales (en/he/sv/es). ja.js deferred.

next_steps: >
  1. Add ja.js translation (4 keys: title/body/button/comingSoon).
  2. PostHog: watch iap_viewed + iap_tapped after deploy — if tapped >5% of settings
     visitors, prioritize real IAP build.
  3. Check education_upsell_impression + landing_cta_clicked (DistrictUpsellStrip already live).
  4. Provision ADMOB_API_TOKEN for unattended revenue snapshots.
