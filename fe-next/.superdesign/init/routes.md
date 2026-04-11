# Routes — Profile Pages

## Profile Routes
- `/[locale]/profile` → `app/[locale]/profile/PageClient.tsx` — Own profile (authenticated)
- `/[locale]/player/[id]` → `app/[locale]/player/[id]/PageClient.tsx` — Public player profile

## Profile Page Structure (Own Profile)
Mobile: Swipeable tabs (overview, stats, achievements, collection)
Desktop: Single scrollable column with all sections

## Profile Components (fe-next/components/profile/)
- `ProfileHeader.tsx` — Avatar, name editing, country, level badge
- `ProfileXpSection.tsx` — XP bar, level, prestige
- `ProfileCoinsSection.tsx` — Coin balance, earning breakdown
- `ProfileStatsGrid.tsx` — 4 stat cards (score, wins, words, time)
- `ProfileAchievements.tsx` — Achievement badges
- `ProfileCollection.tsx` — Collectibles display
- `ProfileRankedProgress.tsx` — Ranked mode progress
- `ProfileBackButtons.tsx` — Navigation buttons
- `StatCard.tsx` — Individual stat card component
- `ReferralCard.tsx` — Referral program card
