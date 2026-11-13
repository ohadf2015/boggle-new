status: research-only
attempted: honest edu-upsell lead-capture CTA on for-schools page — ABORTED after orient: already shipped.

## Brief-hygiene finding (important — fix prompt tomorrow)
Lane 09's STEP 2 "known surface" claims education is "100% free... NO pricing, NO lead
capture, NO contact-sales anywhere." This is FALSE and has been for a while:
- `app/[locale]/education/for-schools/` (page.tsx + content.ts, 220+460 lines) is a full
  district lead-capture + commercial page, JSON-LD Offer schema, "Get a school quote" CTA.
- `app/api/education/school-lead/route.ts` + tests — working lead intake endpoint.
- `app/[locale]/education/page.tsx` hub links to it with a dedicated card + PostHog capture attr.
- `app/[locale]/teacher/upgrade/PageClient.tsx` has a full teacher-vs-school TAB SYSTEM:
  `AskSchoolPanel`, `SchoolPlanSection`, `openSchool()` → `trackGrowthEvent('iap_viewed',
  {product:'district_inquiry'})`, Polar trial logic (`polarTrialUx`), teacher Pro checkout.
This fully covers the 2026-11-07 founder ask ("trial for unity") too — `offerTrial` /
`polarTrialUx` / `trackTrialCtaView` already exist and are wired. **Lane 09 has been
re-discovering a solved problem for 5+ nights because STEP 2/3 of its own prompt describes
a stale state.** Recommend rewriting STEP 2/3 to point at `upgradeViewer`/`polarTrialUx`/
`SchoolPlanSection` as the CURRENT system and ask for incremental improvements to it
(e.g. conversion-rate instrumentation, copy test) instead of "build lead capture from zero."

## What I checked and ruled out tonight
- Ad-UX: `rewarded_ad_offered/_watched/_declined` events all exist and are wired
  (`utils/growthTracking.ts:1990-2012`), called from `hooks/useRewardedAd.ts` (653 lines,
  already handles `ad_free_route` decline reason). No per-surface decline-rate breakdown
  in tonight's brief to act on (intel score 0.1, posthog `rewarded_ad_watched` 0/24h — too
  thin/likely a dev-data artifact, not real signal; AdMob is Android-only, this metric is
  probably measuring non-mobile traffic).
- IAP probe: no generic non-teacher "remove ads / supporter" interest probe exists yet
  (`ad_free`/`supporter` grep only hits the ad_free_route decline reason + schoolLead.ts
  field list). This is a genuine gap but a real new addition (flag + instrumentation + UI
  entry point on a results screen) needs more runway than remained tonight — ran orient
  first, found the brief-staleness issue, decided against starting an edit I could not
  finish + eslint-verify before the cutoff. Ponytail call: half-shipped ad-probe UI is worse
  than none.

## Ranked backlog for next monetization lane
1. **(S, HIGH) Fix lane 09's own STEP 2/3 "known surface" section** — see finding above.
   Zero code risk, directly unblocks 5+ nights of wasted re-discovery.
2. **(M) Non-teacher "remove ads" interest probe** — flagged `iap_viewed{product:'ad_free_tier'}`
   button on a results screen (e.g. word_hunt, lowest sentiment this week at avg 2/3), no
   billing, pure demand signal. Needs full TDD cycle + 5-locale strings — budget a full lane.
2. **(S) `rewarded_ad_watched` 0/24h — verify it's real before acting.** Confirm whether
   this PostHog number reflects Android AdMob traffic or is diluted by web/dev sessions
   with ads disabled; if diluted, fix the collector's platform filter before treating it as
   a severity signal (mirrors the LCP cross-tenant-contamination lesson in the loop playbook).
next_steps: rewrite STEP 2/3 of lane-09 prompt to describe the current upgrade/school system; then pick ONE of the ranked backlog items (probe #2 needs a full lane, not a tail-end slice).
