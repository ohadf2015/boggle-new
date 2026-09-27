status: research-only
attempted: ran posthog coverage audit (DEAD/CRATERED classify), triaged all DEAD entries, investigated CRATERED rewarded_ad_declined
files_touched: none
next_steps: |
  - 33 DEAD registry events, ALL confirmed never-wired (0 call sites outside growthTracking.ts/tests) — pre-existing backlog items, not regressions. hint_used IS wired (ConnectionsGame.tsx:327) but connections mode itself only has 9 game_started/14d (low-traffic-by-context), so 0 hint_used volume is not a bug.
  - CRATERED: growth:rewarded_ad_declined 27->4 (7d vs prior7d). Root-caused via reason breakdown: daily_limit_reached 26->0, "Ad dismissed without reward" 3->1. All decline call sites in useRewardedAd.ts verified intact (every provider callback path routes through handleAdError->applyError->trackRewardedAdDeclined). offered (59->40) and watched (22->13) dropped proportionally too -> reads as a real drop in heavy ad-watching sessions this week (fewer users hitting the 10/day local cap), not a broken emitter. No code bug found -> did not force a fix.
  - Next run: pick next never-wired P1 backlog event to wire, or re-check rewarded_ad_declined next week to confirm daily_limit_reached count stays low (confirms traffic-pattern read) vs snapping back (would suggest a session/localStorage-clearing bug).
