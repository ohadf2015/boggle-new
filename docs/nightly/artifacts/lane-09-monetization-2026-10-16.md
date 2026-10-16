status: research-only
attempted: add honest "for schools / bulk pricing" contact CTA to education hub page.
files_touched: none

findings:
- Brief's "known surface" is STALE: `app/[locale]/education/for-schools/page.tsx` +
  `content.ts` already ship a full lead-capture form (`#lead`, schoolLead.ts), pricing
  ($49/teacher/yr via Offer JSON-LD), and FAQ across en/ru/he/sv/ja/es. No gap here —
  do not re-propose "education has no pricing/lead-capture" in future briefs.
- Ad-event signal (`rewarded_ad_watched` 0/24h, 7d avg 0, score 0.1) is too weak to act
  on blind: `utils/growthTracking.ts` already emits `rewarded_ad_offered` /
  `_watched` / `_declined` correctly (dual-emit for collect-revenue.sh noted at L596).
  Zero volume means either real zero rewarded-ad engagement or an upstream surface
  issue — needs investigation (where are the 6 rewarded surfaces actually mounted,
  are they reachable), not a code change tonight. Flagging for lane 02/11 or a
  dedicated investigation lane.
- `iap_viewed` / `iap_purchased` event types exist in growthTracking.ts (L188-190) but
  per last week's "Unwired-but-typed experiments" note, likely 0 call sites — did not
  verify call sites this run (ran low on time); worth a `rg "trackIap\|iap_viewed"`
  sweep next time before wiring a probe.

next_steps:
- Investigate WHY rewarded_ad_watched is 0/24h: check AdMob SDK init errors, rewarded
  surface mount conditions (useRewardedAd gating), and whether this is a real demand
  floor vs a broken surface. This is the actual revenue lever, not education (already done).
- If investigation confirms a broken surface, lane 09 next run: fix the specific
  gating bug (flagged, retention-safe) rather than adding new instrumentation.
- Verify iap_viewed/iap_purchased call sites before proposing an IAP interest probe.
