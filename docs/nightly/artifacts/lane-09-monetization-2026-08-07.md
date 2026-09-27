status: research-only
attempted: add honest "contact sales / for schools" lead-capture CTA on education for-schools page (5-locale t() strings), TDD

## Findings — all 3 brief-priority ideas already shipped (ruled out, don't re-attempt)

1. **Education lead-gen (brief priority #1)** — already fully built:
   - `components/education/SchoolLeadForm.tsx` posts to `app/api/education/school-lead/route.ts`
     (rate-limited via `school_lead_rate_limited` RPC, inserts to `school_leads`, admin
     email notify). Rendered on `app/[locale]/education/for-schools/page.tsx:195`.
   - `components/education/DistrictUpsellStrip.tsx` (links back to for-schools/contact)
     is already wired on `esl-word-games`, `spelling-bee-practice`,
     `vocabulary-games-classroom`, and `games-for-teachers` pages. No funnel gap found.

2. **IAP/subscription interest probe (brief priority #3)** — already built:
   `components/monetization/SupporterInterestCard.tsx` and `components/ads/RemoveAdsProbe.tsx`
   both fire `iap_viewed`/`iap_tapped`/`iap_purchased`-family events (see
   `utils/growthTracking.ts:125-127`), used on `app/[locale]/teacher/PageClient.tsx` and
   `app/[locale]/teacher/upgrade/PageClient.tsx`.

3. **Rewarded-ad offer/watch/decline instrumentation (brief priority #2)** — checked 16
   call sites of `useRewardedAd()`. Initial grep looked like 6 surfaces (DailyChallenge,
   WordTowerHud, WordWheelChallenge, BoostButton, BlastGame v2, useBoostClaim) had zero
   tracking calls — **false lead**. `hooks/useRewardedAd.ts:349,370,404` centralizes
   `trackRewardedAdOffered/Watched/Declined` inside the hook itself, keyed by the
   `surface`/`analyticsSurface` option, so per-caller duplication would be wrong, not
   missing. Every surface is already covered. Don't re-flag this in future briefs
   without checking the hook first.

4. **Revenue snapshot** — brief noted `search` sources stale, PostHog brief thin
   (`rewarded_ad_watched: 2/24h` vs 0.71 7d avg — this is UP not down, not a decline
   signal, and n=2 is too small to act on). No `revenue-latest.json` Playwriter snapshot
   present. Recommend founder re-run `scripts/nightly/lib/pull-revenue-snapshot.sh`
   (interactive) periodically so this lane isn't flying blind on eCPM/fill-rate trends.

## PostHog query — resolves the 06-11/06-20/06-26 "check school_leads count" ask (finally run)

Queried directly (posthog MCP came online mid-run). Answer: **the funnel is a traffic/visibility
problem, not a conversion-copy problem — don't touch SchoolLeadForm's fields/copy.**

- `growth:school_lead_submitted`: **0 properties recorded, ever** (event has never fired since
  it shipped 07-21, confirmed via `read-data-schema`).
- `growth:school_lead_form_viewed` (30d trend): only **2 total** views (07-08, 07-16) — the
  form/CTA is essentially never seen.
- `$pageview` on any `/education*` path (30d trend): **~140 total** pageviews across the window
  (daily 0–44, spiky — SEO discovery, not steady traffic).
- **Conclusion: ~140 page visits → 2 CTA views → 0 leads.** `DistrictUpsellStrip` / `SchoolLeadForm`
  sit at the very bottom of long pages (`esl-word-games`, `spelling-bee-practice`,
  `vocabulary-games-classroom`, `games-for-teachers`, `for-schools` — all 220-300 lines, FAQ
  section directly above the CTA). Visitors aren't scrolling that far. This is a **placement**
  problem, not a **funnel-exists** problem — the 3 prior nightly reports asking "check the
  count" were right to flag it but never got read-access to confirm the failure mode.

## Ranked backlog for tomorrow's lane 09
1. **(top pick, low-risk)** Move `DistrictUpsellStrip` higher — e.g. render it once after the
   first content section (hero/intro) in addition to (or instead of) page-bottom, on the
   highest-traffic page first (`for-schools` had 15 views on 07-21, 44 on 08-02 — check which
   page drove that spike via a pathname breakdown before picking). A small, purely additive,
   reversible placement change; re-check `growth:school_lead_form_viewed` after 7 days.
2. Query PostHog for `rewarded_ad_declined` reason breakdown BY surface — if one surface's
   decline reason is dominated by `placeholder_cooldown`/`no_ad_provider` rather than user
   choice, that's a fill-rate/config bug, not UX. Not yet run this session (time-boxed out).
3. Check `NEXT_PUBLIC_H5_ADS_ENABLED` gate status against Lane 08's AdSense approval progress
   before flipping (code confirmed still triple-gated OFF in `useRewardedAd.ts`/`useInterstitialAd.ts`).

files_touched: none
next_steps: implement backlog item 1 (DistrictUpsellStrip placement) first — it's evidenced,
small, reversible, and closes a 3-week-old open question from 06-11/06-20/06-26 reports.
