# Lane 09 — Monetization — 2026-10-01

status: research-only
files_touched: none (code change)

## What I checked
- **Education upsell (option 1 in brief) — ALREADY SHIPPED.** `/education/for-schools` has
  full pricing (Teacher Pro $9/mo, Classroom $39/term, Schools&districts contact-us),
  a `#lead` capture form (`ForSchoolsPackages`), truthful JSON-LD offers, and is linked
  from both `education/page.tsx` (hub) and `teacher/upgrade/PageClient.tsx`. Nothing free
  is paywalled, no fake stats — matches guardrail #4/#5. Brief's premise ("NO pricing, NO
  lead capture anywhere") is stale; that work landed in prior nightly runs (`4a22fa016`,
  `a95842baf`, `0cd5d5d84`).
- **Ad-UX instrumentation (option 2) — ALREADY COMPLETE.** All 6 rewarded surfaces
  (`DoubleGoldAdButton`, `TimeLowAdPrompt`, `RewardedAdGoldButton`, `WatchAdForFreezeButton`,
  `WatchAdButton`, `ShareSection` daily-retry, `MemoryHuntCluePanel`, `useRewardedFeatureUnlock`)
  call `trackRewardedAdOffered`; `useRewardedAd.ts` centrally emits watched/declined. The
  brief's "0/24h rewarded_ad_watched" signal is a traffic/demand problem, not a missing-event
  gap — no code fix available without real usage data (revenue snapshot was stale tonight,
  per the brief note).
- **IAP demand probes (option 3) — ALREADY SHIPPED, narrow reach.** `SupporterInterestCard`
  (profile page only) and `RemoveAdsProbe` (settings page only) are pure-analytics
  (`iap_viewed`/`iap_tapped`), no purchase path, exactly the pattern the brief asked for.
  Both mount on low-traffic settings-adjacent pages only.

## Why I shipped no diff tonight
Every safe, on-brief lever from STEP 3 options 1–3 is already implemented by prior nightly
runs. The one real gap (IAP probes reach only settings/profile, not a high-traffic surface
like a results page) is a deliberate placement choice — extending it to a results/game-end
surface risks Class-5-style layout regressions on a page Lane 02 (perf) and Lane 11 (mode QA)
also touch, and duplicating a "support us" ask across pages reads as nag, not signal. Given
the ~10 min budget, judged this not landable + self-verifiable safely tonight.

## Ranked backlog for tomorrow (or a lane with more budget)
1. **[M-effort] Widen `SupporterInterestCard` reach** — add one more placement on a
   natural pause point (e.g. daily results screen, after the primary CTA, not blocking it)
   to get real `iap_viewed`/`iap_tapped` signal beyond profile-page traffic. Needs a11y/layout
   check against Class-5 mobile-flash pitfalls before shipping.
2. **[S-effort] Revenue snapshot hygiene** — brief's `search`/`supabase` sources were stale
   and the Playwriter revenue snapshot wasn't present. Founder should run
   `scripts/nightly/lib/pull-revenue-snapshot.sh` or provision `ADMOB_API_TOKEN` so future
   lane-09 runs get live eCPM/fill-rate signal instead of a single thin PostHog metric.
3. **[S-effort] `for-schools` traffic check** — page exists and is linked, but no telemetry
   was reviewed tonight on how many hub visitors actually reach `#lead`. Lane 12 (telemetry)
   or a future lane-09 run should pull `iap_tapped`/lead-form-submit funnel counts before
   investing more in that page's copy.

next_steps: pick backlog item 1 or 3 next run; do not re-propose for-schools lead-gen or
rewarded-ad-offered instrumentation — both already shipped.
