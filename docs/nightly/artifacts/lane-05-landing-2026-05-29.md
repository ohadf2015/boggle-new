status: shipped
attempted: build sealed-bid game mode (founder directive), admin-only hub tile, natural route at /[locale]/sealed-bid/
files_touched:
  - fe-next/app/[locale]/sealed-bid/page.tsx (pre-existing, complete)
  - fe-next/app/[locale]/sealed-bid/__tests__/sealedBid.test.ts (pre-existing, all 26 tests now pass)
  - fe-next/translations/en.js (sealedBid block + landing.sealedBidMode/Desc)
  - fe-next/translations/he.js (same)
  - fe-next/translations/sv.js (same)
  - fe-next/translations/ja.js (same)
  - fe-next/translations/es.js (same)
  - fe-next/components/landing/LandingChallengeCards.tsx (type, FEATURED_MODES, admin injection, SP_MODES, renderCard case, __FEATURED_MODES_TEST__ export)
next_steps: user playtests at http://localhost:3001/en/sealed-bid/ — send mode:keep or mode:drop feedback
