status: research-only
files_touched: none
attempted: education "for-schools" lead-capture CTA — found already shipped, did not duplicate.

## Premise check (brief was stale)
Brief's "Known surface" claimed education is "100% free — NO pricing, NO lead capture,
NO contact-sales anywhere." False, verified against code:
- `app/[locale]/education/for-schools/{page.tsx,content.ts}` (746 lines): full pricing
  ($9/mo Teacher Pro, $49/teacher/yr Schools), lead form, compare table, FAQ. Linked from
  20+ places (hub, nav, admob-routes, guides, about, results cards). Last touched #1552
  (10-23).
- `app/api/education/school-lead/route.ts`: lead-capture endpoint, live.
- `components/monetization/SupporterInterestCard.tsx`: IAP-demand probe (`iap_viewed`),
  already wired on `SinglePlayerResults.tsx` + `profile/PageClient.tsx`.
- `components/ads/RemoveAdsProbe.tsx`: same pattern, wired on `settings/PageClient.tsx`.
- `rewarded_ad_offered/watched/declined` (utils/growthTracking.ts:1910-1936): offered
  fires per-surface (8 call sites: gold-button, double-gold, time-low-prompt, daily
  watch-ad, share-section, memory-hunt clue, feature-unlock), watched/declined fire
  centrally in `hooks/useRewardedAd.ts` — symmetric by design, not a gap.

So all 4 of tonight's "prefer, in order" actions are already done. The intel brief's
`ad_event_rewarded_ad_watched: 0/24h, 7d avg 0` (score 0.1, low severity) is real signal,
not an instrumentation bug — the pipe is wired, the number is just zero. Root cause
(low native-app traffic hitting a reward surface, vs a broken trigger) needs a PostHog
funnel query (`rewarded_ad_offered` vs `rewarded_ad_watched` counts by surface over 7d),
which is a research task, not a code edit — out of scope for tonight's time budget.

## Ranked backlog for tomorrow (lane 09 or lane 02/12)
1. **Query the rewarded-ad funnel** (`rewarded_ad_offered` → `rewarded_ad_watched` drop-off
   per surface, 7d, PostHog). If `offered` is also ~0, the bug is upstream (ad not
   loading / native gate) not the CTA. If `offered` is healthy but `watched` is 0,
   that's a real conversion problem worth a lane-09 fix.
2. **`for-schools` conversion is fully tracked already** — verified `SchoolLeadForm.tsx`:
   `school_lead_form_viewed` on mount, `school_lead_submitted` + `trackSchoolQuoteRequested`
   on success. Nothing to add here. Pull the funnel (viewed → submitted, by locale) to see
   if the page converts at all — that's the real open question, not instrumentation.
3. **H5/AdSense web ads**: still gated off (`NEXT_PUBLIC_H5_ADS_ENABLED`) pending
   approval — lane 08's lane, not ours; no action here.
4. Founder: run `scripts/nightly/lib/pull-revenue-snapshot.sh` or provision
   `ADMOB_API_TOKEN` — revenue/search/impact brief sources were stale this run.

next_steps: query rewarded-ad funnel drop-off AND for-schools viewed→submitted funnel
before building anything new — both are fully instrumented, just unread. Do not
re-propose for-schools/RemoveAdsProbe/SupporterInterestCard — all three already shipped,
wired, and tracked.
