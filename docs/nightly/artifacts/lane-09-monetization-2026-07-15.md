status: shipped
attempted: add missing supporter.card.* translations to es.js and ru.js (SupporterInterestCard profile-page broken for Spanish + Russian users)
files_touched:
  - fe-next/translations/es.js
  - fe-next/translations/ru.js
next_steps: |
  - SupporterInterestCard only on profile page (low traffic). Add to daily/word-hunt results for higher iap_viewed signal.
  - rewarded_ad_watched 2/24h (avg 1.86/d) — investigate rewarded CTA visibility post-game on Android; H5 ads still gated off web.
  - Revenue snapshot stale: founder should run scripts/nightly/lib/pull-revenue-snapshot.sh or provision ADMOB_API_TOKEN.
  - Education upsell infra already built (for-schools + districtCta CTAs). Next: measure conversion from education hub to for-schools lead form.
