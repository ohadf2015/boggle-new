status: shipped
files_touched:
  - fe-next/utils/growthTracking.ts (3 new typed events)
  - fe-next/lib/experiments.ts (new exp-mp-round-great-delight-v1)
  - fe-next/components/results/GameFeedbackCard.tsx (wired great-delight + issue-probe-shown event)
  - fe-next/app/[locale]/multiplayer/PageClient.tsx (classroom_host_lobby_viewed instrumentation)
  - docs/nightly/triage-queue.md (4 mp_round experiments flagged inconclusive-by-volume)
  - docs/nightly/reports/2026-09-10.md (lane 2 section appended)
  - docs/nightly/impact-ledger.ndjson (1 entry, check_after_days=14)
next_steps: |
  - Flag hygiene: none of exp-mp-round-issue-probe-v1/reaction-v1/results-rival-best-word-v1/quickplay-eager-disable-v1
    are decided (all arms <1000 exposures/30d despite 43-54d age). mp_round is a genuinely low-traffic surface —
    next lane should either extend the judging window to 60d+ or accept these will never hit n=1000/arm and
    switch to a smaller-n significance test.
  - classroom_host_lobby_viewed is instrumentation-only (no UI change) — next lane should pull its volume after
    a few days and use it to decide whether the classroom-host rage-click signal (score 0.614, reach=1 tonight,
    very thin) is real or noise before investing in a UI fix inside the large PageClient.tsx classroom-host flow.
  - exp-mp-round-great-delight-v1 is live (PostHog flag created, 50/50). Check game_feedback avg + repeat-response
    rate on mp_round surface after 14 days (impact ledger entry).
