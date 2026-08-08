status: research-only
attempted: impact-check ftue_redirect_resumed verdict + flag hygiene sweep (exp- keys wired/live) + rage-click root-cause probe
files_touched: none (docs only: impact-ledger.ndjson, this artifact, nightly report)
next_steps: |
  - ftue_redirect_landed/resumed BOTH 0 events in 7d (shipped 08-04) — instrumentation never fires at all, not just "resumed" lagging landed. Verify useFTUEGate ?next= bounce path is actually reachable in prod (may be dead code path, not a measurement gap).
  - Flag hygiene: CLEAN. All 21 code-defined exp- keys have live matching PostHog flags. 3 stale flags (exp-blast-wave-banner-v1, exp-mp-lobby-connect-feedback-v1, exp-mp-room-join-loading-v1) confirmed already deactivated by prior lanes — no action needed.
  - Rage-click hotspot: /en/multiplayer lobby "Ready Up!"/"Start Battle" buttons (2 rage-clicks each, 7d) + room "84TXWJ" letter-tile buttons (C/R/U x, 3-14 clicks). Found usePlayerLobby.ready.test.ts whose own header comment says client never emitted `lobbyReady` (server infra existed, client discarded it) — tests appear to already pin a fix. NEXT LANE: confirm PlayerWaitingView's Ready Up handler actually calls the wired emit (grep `usePlayerLobby` call sites in PlayerWaitingView.tsx) — if still a no-op, that's the rage-click root cause (Class 4 silent failure) and a same-shape fix to the 08-01 MP-join abort bug.
  - Ran out of time budget before landing a code change this lane; no flags/experiments needed touching (already clean).
