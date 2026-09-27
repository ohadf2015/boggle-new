status: research-only
attempted: add honest "for schools" lead-capture CTA on education hub/for-schools page (mailto contact-sales), 5-locale strings, TDD
files_touched: none

## Findings
All three playbook-ranked monetization levers from the lane prompt are ALREADY SHIPPED
and wired (prior nights, not reflected in memory):
1. Education lead-gen: `app/[locale]/education/for-schools/{page.tsx,content.ts}` — full
   lead-capture form (`SchoolLeadForm`), pricing ($149/yr school, district on request),
   FAQ, 5 native locales. Linked from education hub (`teacher-hub-for-schools-link` x2)
   AND `teacher/upgrade` CTA. Nothing to add here without a real content/UX gap.
2. Ad-UX (rewarded gold button): `components/ads/RewardedAdGoldButton.tsx` +
   `hooks/useRewardedAd.ts`. `canShowAd` is explicitly false on web (no real ad provider —
   H5/AdSense still pending approval) — this FULLY explains the brief's
   `rewarded_ad_watched: 0/24h` signal. It is expected-zero, not a bug. Warm-preload is
   already gated to results-moment placements only (comment cites a 2026-07-03 AdMob
   audit: unconditional preload burned 198 loads for 2 shows). No safe fix available
   until H5 ads clear approval (Lane 08's blocker, not this lane's).
3. IAP interest probe: `components/monetization/SupporterInterestCard.tsx` (profile page)
   + `components/ads/RemoveAdsProbe.tsx` (settings page) — both wired, both web-only
   (native excluded, real ads there), both fire `iap_viewed`/`iap_tapped` on
   mount/tap. Fully instrumented, no gap found.

## Ranked backlog for tomorrow (none safe to ship blind tonight — need more diagnosis time)
1. **SupporterInterestCard reach** — currently profile-page only. Consider a second
   placement (e.g. settings, near RemoveAdsProbe) if `iap_viewed` volume is thin —
   check PostHog before adding, avoid ad-fatigue stacking two IAP nudges same page.
2. **Rewarded gold button surface count** — brief/doctrine references "6 rewarded
   surfaces" but only 4 live call sites found (`LobbyRewardCluster`,
   `LevelCompleteContent`, `ProfileCoinsSection`, `RewardedAdGoldButton` itself). Worth
   a follow-up grep to confirm the other 2 were removed intentionally or are a gap.
3. **H5/AdSense approval** — the real unlock for ad revenue growth; human-queue item,
   not code. Once approved, `useRewardedAd`'s `canShowAd` gate should light up web
   automatically (no code change needed) — worth a smoke-check the day it flips.
4. Revenue snapshot (`revenue-latest.json`) was stale this run per intel brief — founder
   should re-run `scripts/nightly/lib/pull-revenue-snapshot.sh` for higher-confidence
   signals next time.

next_steps: pick one of the 3 ranked items above once PostHog volume data justifies it;
do not re-audit items 1-3 in "Findings" — confirmed shipped and correct as of tonight.
