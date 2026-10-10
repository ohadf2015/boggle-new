status: research-only
attempted: wire rewarded_ad_offered analytics event on surfaces missing it + check education upsell CTA gap for lead-gen scaffold
files_touched: none

## Findings
All 3 playbook options in tonight's prompt are already shipped from prior 09-monetization
nights (last activity 2026-08-31, per impact-ledger.ndjson — 20 prior entries 07-04→08-31):
- Education lead-gen: `/education/for-schools` has full pricing (`EducationPackages.tsx`),
  `SchoolLeadForm`, linked from 15+ surfaces (hub, teacher dashboard, guides, about, comparison
  pages, classroom-game, district upsell strip). Not a gap.
- Ad-UX telemetry: `rewarded_ad_offered/watched/declined` + full lifecycle (`trackRewardedLifecycle`
  in `useAdMob.ts`) wired across every rewarded surface (drills, daily, time-low prompt, gold
  button, feature unlock). Not a gap.
- IAP demand probes: `RemoveAdsProbe` (settings page) and `SupporterInterestCard` (profile page)
  already exist and fire `iap_viewed` — pure analytics, no purchase path, already live.

## Why no code shipped tonight
The intel brief's only live signal is `ad_event_rewarded_ad_watched: 0/24h (7d avg 0)` — reach=0,
severity=0.4 — and `search`/`supabase` collectors are stale this run. A 7-day-flat-zero on a metric
that has MULTIPLE wired call sites (not a wiring gap) is itself suspicious: either genuinely zero
rewarded-ad engagement (demand problem) or a broken PostHog pipeline (instrumentation problem).
Picking a UI change blind, with no way to tell which, risks shipping something that doesn't move
the real lever — and the lane guardrail bars touching ad-reward/economy logic outright.

## next_steps (ranked backlog for tomorrow)
1. **Verify the `rewarded_ad_watched` 0/7d-avg signal first**, before any UI change. Query
   PostHog directly (`growth:rewarded_ad_watched` + its sibling `growth:rewarded_ad_offered` over
   7d) — if `offered` is non-zero but `watched` is 0, that's a real funnel drop worth a lane;
   if BOTH are 0, the event pipeline itself may be broken (check PostHog capture config / ad-blocker
   on web vs native split) and no UI fix will show up in the data regardless.
2. If funnel drop confirmed: look at `rewarded_ad_declined` reason breakdown
   (`placeholder_cooldown` / `no_ad_provider` / `daily_limit_reached`) to find which decline reason
   dominates — that tells you whether the fix is UX (clearer CTA copy) or supply (AdMob fill rate).
3. Education channel has no fresh angle without founder-provided conversion data (lead form submit
   rate, School plan signups) — everything structurally obvious is already built. Next lever there
   is COPY/positioning quality on the existing for-schools page, which needs a human steer (what
   schools actually object to), not a blind autonomous edit.
4. Fix the `search`/`supabase` stale-collector issue (shared with other lanes, see learnings.md
   open-watch "4-5 of 9 intel collectors serve stale data") so this lane gets real signal instead
   of guessing at saturated avenues.
