status: shipped
files_touched:
  - fe-next/translations/en.js
  - fe-next/translations/he.js
  - fe-next/translations/sv.js
  - fe-next/translations/es.js
  - fe-next/translations/ja.js
  - fe-next/translations/ru.js
  - fe-next/app/[locale]/teacher/upgrade/PageClient.tsx

## What shipped

School/district bulk pricing CTA on the teacher upgrade page (between FAQ and legal links).
Lime-background callout with headline, one-line pitch, mailto link (subject pre-filled).
6 locales. Fires iap_viewed { product: district_inquiry } on click. Lint clean.

## Impact check verdict

rewarded_ad_watched 7d = 7 (baseline 17) → REGRESSED, but original change was
research-only (no code deployed), so nothing to revert. Android shows 0 watched;
admob platform converts 46-50%. Likely a platform/event-name gap, not a product regression.

## Next steps

- Flag he/sv/ja/es/ru strings for native review (AI-generated)
- Measure iap_viewed { product: district_inquiry } after 14 days for demand signal
- Investigate rewarded_ad_watched android gap in useRewardedAd.ts android branch
- Optional: dedicated /teacher/district landing page (Lane 06/08)
