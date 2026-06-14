# Rewarded ads "stuck at 30sec" — root-cause analysis & fix (2026-06-14)

## Symptom
Reward ad freezes ~30s in and never grants. Prior fixes (immersive-mode, interstitial
API routing, visibility-reconcile — all 2026-06-07) shipped to prod yet it still reproduces.

## Evidence (PostHog `growth:rewarded_ad_*`, 30d) + prod state
- **Deploy is current**: Railway `boggle-new` latest SUCCESS = `e6da04178` (HEAD), 06-14
  06:11 UTC. All 3 prior fixes ARE live. Stale-deploy ruled out.
- **Native AdMob path is mostly healthy post-fix**: `retry` 11 prepare→6 rewarded,
  `catchup` 5→3 rewarded; only **1** `safety_timeout`, **0** `visibility_reconcile` in 30d.
  → the bug is NOT a deterministic native freeze (9 watches completed with all native
  code present), and there is **no clean telemetry fingerprint** of the failure.
- **Silent-stuck gap (confirmed)**: 79 `android` offers but only ~17 native
  `rewarded_ad_lifecycle.prepare_start`. e.g. 6 `connections_reveal_answer` offers on
  06-13 produced ZERO downstream lifecycle/watched/declined events. Sessions that
  started (`offered`, `status='showing'`, game clock paused) and never resolved.
- **One live repro (06-14 `generic`)**: `prepare_start` then nothing — no
  `prepare_resolved`, no `prepare_timeout`. A prepare hang where the 12s JS timeout
  never fired (single 30-min-stale session; weak signal — possibly abandoned).

## Two distinct causes

### 1. CONFIRMED — `showRewarded` silent early-returns (FIXED, ships via web)
`hooks/useAdMob.ts` `showRewarded()` bailed on `if (hasNoAds()) return;` and
`if (!config) return;` **without calling `onReward` or `onError`**. The caller
(`useRewardedAd.showAd`) had already set `status='showing'` + `emitRewardAdActive(true)`
(game clock paused), so the UI was stranded — watch-ad button disabled, clock frozen —
until the caller's **120s** `REWARD_STUCK_WATCHDOG_MS`. Matches the telemetry gap
(offers with no downstream events; config not yet loaded when the user taps).

**Fix**: both early-exits now call `onError(...)` → caller settles immediately
(button re-enables, clock resumes, retry message). TDD: `useAdMob.earlyReturnSettle.test.ts`.
Web-deployable → reaches installed remote-URL apps on next deploy.

### 2. CANDIDATE — native `WebView.pauseTimers()` freezes the ad's countdown (committed, needs release)
`MainActivity.onPause()` called `bridgeWebView.pauseTimers()` (added 2026-05-15,
`954c11207`, for background-eviction). `pauseTimers()` is **process-global** — Android
docs: "pauses all layout, parsing, and JavaScript timers for ALL WebViews." AdMob renders
rewarded **HTML/MRAID** creatives (incl. the "Reward in 30 seconds" countdown) in their
OWN WebView. When the ad Activity fronts → MainActivity `onPause()` → global
`pauseTimers()` → the ad's countdown WebView froze → stuck at 30 → no reward.
- Timeline fits: added 05-15, just before the 06-07 reports/fix-attempts.
- Explains why JS-only immersive fix failed (real cause is native, unreachable from web JS).
- Intermittent (native-VIDEO creatives use the SDK's own timer, not JS → they completed →
  the 9 watches). So this is a **creative-specific** contributor, not deterministic.
- Confirmed mechanism via web search (Capacitor/WebView `pauseTimers` ↔ AdMob freeze).

**Fix**: drop the global `pauseTimers()`/`resumeTimers()`, keep instance
`onPause()`/`onResume()` (retains most background-eviction benefit, no other-WebView
freeze). NATIVE change → requires a new AAB build + Play release; the on-device app is
versionCode 5713 (06-04). **Verification boundary: NOT device-verified here** — confirm
via logcat that a rewarded countdown advances on a build with this change before relying on it.

## Open / manual follow-ups
- **Verify env** `NEXT_PUBLIC_ADMOB_REWARDED_INTERSTITIAL_SURFACES` is set in prod
  (Railway). Commit `23e4c3a1a` ("stuck-30s", interstitial API routing) is **dormant**
  without it — if any AdMob unit is dashboard-configured as Rewarded-Interstitial, set
  this to those surfaces (or `all`). Could not read here (secret-truncated var list).
- Prepare phase has no visibility-reconcile rescue (only armed after `adShown`); a prepare
  hang has no JS backstop if `pauseTimers` froze the 12s timer. Low priority.
