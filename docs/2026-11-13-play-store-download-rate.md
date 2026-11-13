# Play Store download rate: where installs are lost (2026-11-13)

Source: Play Console (Grow overview, Store listings, Ratings, Vitals), androidpublisher API, PostHog, live Play search pages.

## Funnel, last 28 days

| Step | Number | Rate |
|---|---|---|
| Device impressions (99% "Google Play explore" = search + browse) | 4,120 | |
| Listing visitors | 107 | **2.6% of impressions** |
| Unique install clicks | 25 | 23% of visitors |
| Device acquisitions | 23 | |
| Device first opens | 10 | **43% of installs** |

Other: 270 lifetime installs, **1 rating ever** (5.0), MAU 41-45, DAU ~4, 19 explore acquisitions in 90 days.

Installs by source (28d): **Play explore 2** (-82%), **paid + direct 19**, not attributed 2.
- Play search/browse: 4,090 impressions → 2 installs (0.05%). Huge reach, near-zero conversion. The leak is the
  result card: 97% of people who see LexiClash there never open the listing.
- Web/direct: 31 impressions → 19 installs. Converts well, but the pool is tiny: ~135 Android mobile-web visitors
  in 28d (PostHog, may include some native sessions), only 6 clicked an install CTA (~4%).
- "Conversion rate" differs by page: Store listings says 18.1% (visitors→installs), Grow overview 40.46% (other definition).

## Why the card loses

What a searcher sees before tapping: icon, title, star rating, install tier. We have no stars (1 rating),
"100+" installs, and a title keyword ("Word Party Game") that is probably weak (assumed: Console gave no search-term
data, and the impressions don't split search vs browse; if most are browse, icon and stars matter more than the title).
Competitors that rank for "multiplayer word game" / "word hunt" (Words With Friends, Wordzee, Word Domination,
Boggle With Friends, Wordament) all show 3.8-4.7 stars with 10K-1M ratings. The only direct swipe-and-race rival,
Word Hunt with Buddies, has 1K+ installs and 7 ratings: the niche itself is open.
In he / ru / sv / es search results, no real-time Boggle-style multiplayer game shows up at all.

## Levers, ranked

1. **Ratings.** In-app review was wired (2 wins, 45-day throttle) but only 14 native Android players reached 2 wins
   in 90 days, and the native sheet was never verified on a device: a failure only logged a warning, so "broken"
   looked the same as "declined". Ask the ~40 monthly players directly too (android-release-launch email carries a
   rate-us line). Goal: 10+ ratings so stars show on the card.
2. **Title keyword.** Play cannot A/B the title, so this is a judgment call; re-read impressions→visitors after 28 days.
   Keep "Boggle" out of metadata (Hasbro trademark).
3. **Local titles.** Lead with the phrase the top local apps rank on (Hebrew apps all say "בעברית").
4. **No experiments at this volume.** The July short-description test ran 4 months and needed ~9k installers.
5. **Promotional content (LiveOps).** Unused. Daily challenge / seasons are natural events. Eligibility not verified.
6. **Custom store listings** (up to 50, free): keyword-targeted ("word hunt") and country-targeted (IL, RU).
7. **Web → Play capture.** Small pool (~135 Android web visitors/28d) but cheap: 4% click an install CTA today.
8. **Install → first open 43%.** Half of installers never open the app. Check on a clean device whether the first
   launch stalls (splash / remote bundle) before buying any traffic.

## Owner actions in Console
- **Declare trader status by Feb 2027**, or the developer account and apps are removed from Google Play globally.
- Vitals: 3 recommendations (deprecated edge-to-edge APIs, R8). No crash/ANR data yet.

## Shipped 2026-11-13
- Review prompt asks on the first win (was 2) and records `native_review_requested` / `_completed` / `_failed`.
  Check those events after the next Android release reaches players: requested with no completed = the sheet is broken.
- Titles: en-GB `LexiClash: Word Hunt Online`, iw-IL `LexiClash: משחק מילים בעברית` (in Google review, auto-publish).
  Re-read impressions → visitors after 28 days (baseline 4,090 → 107).
- July short-description experiment ended (tie, 28 vs 30 retained installers), current copy kept.
