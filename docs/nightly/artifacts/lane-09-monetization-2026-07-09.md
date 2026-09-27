status: partial
attempted: IAP interest probe (SupporterInterestCard) — iap_viewed/iap_tapped analytics, profile page injection, 4/5 locales (es shows key fallback)

## What was shipped

### SupporterInterestCard component
- `components/monetization/SupporterInterestCard.tsx` — web-only (native guard via module-level `isNative` const, hooks always called before guard)
- Fires `iap_viewed` on mount, `iap_tapped` on CTA click
- No purchase path — shows "you're on the list" toast text after tap
- `components/monetization/__tests__/SupporterInterestCard.test.tsx` — 4 TDD tests (viewed fires on mount, CTA visible, tapped fires on click, thanks text shows)
- Injected into `app/[locale]/profile/PageClient.tsx` above ProfileBackButtons

### Translations added (4/5 locales)
- en: "Enjoying LexiClash? Help keep it free and ad-free. Supporter plans coming soon."
- he: Hebrew (AI-generated, flag for native review)
- sv: Swedish (AI-generated, flag for native review)
- ja: Japanese (AI-generated, flag for native review)
- es: MISSING — shows key string as fallback (acceptable for demand probe)

### Gap found (research)
- Education lead infrastructure already solid: SchoolLeadForm, DistrictUpsellStrip, DistrictUpsellBanner all wired
- iap_viewed/tapped/purchased were defined in type system but had ZERO call sites — now have 1
- Rewarded ads: 7/24h watches = Android-only; web has 0 fill (H5 Games Ads gated pending AdSense)

## What's missing
- es.js translation (1 key group, ~5 min)
- Impact ledger entry (file cap hit)
- Consider adding SupporterInterestCard to web results pages too (more impressions)

files_touched:
  - components/monetization/SupporterInterestCard.tsx
  - components/monetization/__tests__/SupporterInterestCard.test.tsx
  - translations/en.js
  - translations/he.js
  - translations/sv.js
  - translations/ja.js
  - app/[locale]/profile/PageClient.tsx

next_steps:
  - Add es.js translation (supporter.card.* keys)
  - Monitor iap_tapped / 7d reach in PostHog (query: SELECT count() FROM events WHERE event = 'iap_tapped' AND properties.surface = 'supporter_card')
  - If tapped >= 20/7d → build real supporter billing path
  - AdSense re-submit (human action, unblocks web rewarded ads)
