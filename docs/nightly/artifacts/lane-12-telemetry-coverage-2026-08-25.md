status: shipped
attempted: run posthog coverage audit (DEAD/CRATERED classify), triage, fix one high-value wired-but-silent/never-wired event, run impact-check on referral_link_clicked
files_touched:
- fe-next/components/singleplayer/SinglePlayerResults.tsx (wired results_autoplay_cancelled into AutoPlayCountdown onCancel)
- fe-next/components/singleplayer/__tests__/SinglePlayerResults.replayCTA.test.tsx (new test)
- docs/nightly/impact-ledger.ndjson (2 entries: referral_link_clicked verdict=neutral no-exposure, results_autoplay_cancelled baseline)
- docs/nightly/reports/2026-08-25.md (lane 12 section)
next_steps: room_joined_via_link — trackGuestJoin() helper exists (growthTracking.ts:1007) but has zero callers; real guest-join-via-invite path is MultiplayerFlow.tsx handleInvitationAutoJoin (~line 238), never calls it. Wire it there next. Also note: raw-name coverage classifier (nightly_coverage_classify) has false positives on enum-value fragments (won/daily/desktop/etc) — cross-check against growth:-prefixed live volume before trusting its DEAD list.
