# Offline Modes — On-Device Test Checklist (R1 validation)

The web-layer SW path is proven (spec §9b). The one remaining unknown is **R1**:
does the native Capacitor WebView grant the service worker the same offline
first-navigation interception that Chromium did? This can only be confirmed on a
real device build. Run this before ramping the `offline-mode` PostHog flag.

## Build & install
- [ ] `NEXT_BUILD_DIR=.next npm run build` then ship to the Android **internal**
      track (see `.claude/notes/android-release-status.md`). Native loads the
      remote URL, so the JS changes go live via web deploy — but `error.html`
      (in `capacitor-assets/`) ships only via a **native** build + `cap sync`.
      Confirm the installed app contains the updated `error.html`.
- [ ] Verify `/sw.js` on prod serves `200 application/javascript` (not 500):
      `curl -sI https://www.lexiclash.live/sw.js | grep -i content-type`.

## Prime the cache (online, once)
- [ ] Open the app online. Visit Home, Blast, Connections, Daily once each.
- [ ] Background the app (let the SW finish install + precache).

## Cold-start offline (the headline test)
- [ ] Force-quit the app. Enable **airplane mode**.
- [ ] Launch the app cold.
  - [ ] **PASS:** app boots to a usable screen (home/launcher or a game), NOT
        the "Can't reach LexiClash / Retry" `error.html` dead-end.
  - [ ] If `error.html` shows briefly then the app loads → the error.html
        bootstrap worked (acceptable).
  - [ ] **FAIL:** stuck on `error.html` → R1 is false on this WebView; the SW
        does not intercept cold-start. Fall back plan: bundled offline shell
        (separate spec) — do NOT ramp the flag for cold-start claims.

## Offline play (mid-session + entered-from-launcher)
- [ ] With the app open + airplane mode on, navigate Home → Blast. Plays?
- [ ] Play a full Blast round offline. Does it score locally?
- [ ] Navigate Home → Connections. Loads today's puzzle from the bundled set?
- [ ] Daily Word Hunt opens and is playable?
- [ ] Non-offline route (e.g. Multiplayer) → shows the offline launcher/notice,
      NOT a blank/white screen.

## Reconnect / sync
- [ ] Finish a game offline, then disable airplane mode.
- [ ] Offline banner clears; pending scores flush (check admin game log / your
      profile). Requires the `offline-mode` flag ON for this account.

## Flag ramp (only after the above pass)
- [ ] PostHog `offline-mode` → enable for a small native cohort (e.g. 5–10%),
      native-targeted. Watch Sentry for SW/cache errors (`source: service-worker`)
      and score-sync errors.
- [ ] If clean for 24–48h, ramp 25% → 50% → 100%.
- [ ] Kill switch: PostHog `offline-mode-native-off` was the planned native
      kill flag in an earlier draft; current `useOfflineModeFlag` gates purely on
      `offline-mode` (+ `NEXT_PUBLIC_OFFLINE_DEV`). To disable: turn `offline-mode`
      off. (Note: the route-aware gate + launcher are NOT flag-gated — they ship
      regardless; the flag only controls score-queue/prefetch/banner/daily-fallback.)

## Notes
- `error.html` cold-start bootstrap is loop-guarded via `sessionStorage`
  (`lc_offline_boot`); if the SW genuinely can't serve, it shows the manual
  screen once instead of ping-ponging.
- Caches are versioned (`lexiclash-v5-YYYYMMDD`); bump in `lib/sw/swSource.ts`
  on any SW behavior/precache change so returning users evict stale entries.
