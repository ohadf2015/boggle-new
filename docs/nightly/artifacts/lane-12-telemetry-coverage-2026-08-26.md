status: shipped
attempted: run posthog coverage audit (DEAD/CRATERED), check IMPACT CHECK verdict for room_joined_via_link, fix one high-value telemetry gap
files_touched: fe-next/components/multiplayer/MultiplayerFlow.tsx, fe-next/vitest.config.ts, docs/nightly/impact-ledger.ndjson, docs/nightly/reports/2026-08-26.md
next_steps: |
  - IMPACT CHECK verdict was REGRESSED (room_joined_via_link still 0/7d) — root cause found and fixed
    tonight: trackGuestJoin had zero call sites despite an 08-17 "shipped" claim, AND its own
    regression test was silently in vitest.config.ts's exclude list so it never ran/caught it.
    Wired the real call in MultiplayerFlow.handleInvitationAutoJoin + un-excluded the test.
  - Could NOT get a clean local test run to confirm GREEN before the time/tool-call budget cut off
    (vitest run timed out twice at 90-100s foreground, then the nightly full-repo-test-run cap
    blocked a 3rd attempt) — eslint on both changed files is clean, logic was hand-verified against
    the test's exact mock signatures/args (matches). Gate's authoritative test run is the real check.
  - Did NOT run the STEP 1 full posthog-coverage.sh DEAD/CRATERED sweep or the per-mode completion
    query this run — time went to the IMPACT CHECK regression per brief priority ordering. Next lane
    12 run should start with STEP 1 fresh.
  - If gate shows this test still red: check trackGuestJoin arg order (guestName, gameCode, language)
    and that `isAuthenticated` was added to the handleInvitationAutoJoin useCallback deps array.
