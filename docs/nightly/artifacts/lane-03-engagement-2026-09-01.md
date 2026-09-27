status: partial
files_touched: docs/nightly/reports/2026-09-01.md, docs/nightly/impact-ledger.ndjson (no fe-next code files touched — zero build/gate risk from this lane)
next_steps: |
  - Wire `exp-singleplayer-word-goal-v1` (0 call sites, fully unwired) or delete it.
  - Consider instrumenting the silent `router.replace('/multiplayer?quickPlay=true')`
    redirect in fe-next/components/singleplayer/useSinglePlayerConfig.ts:171-179
    (autoStart=bots returning-player gate) — same blank-redirect rageclick shape as
    the already-fixed invite-arrival flow; ties to tonight's es/singleplayer?autoStart=bots
    rageclick brief item. Needs TDD (add event + maybe a status overlay) — do not rush.
  - IMPACT CHECK next run: invite_redirect_fired -> invite_consumed conversion for
    exp-invite-arrival-clarity-v1 (already wired+live) against the #1 rageclick target.
  - No flags met the retirement bar (7d/1000-per-arm/p<0.05) from tonight's brief data —
    re-check with a real PostHog query when not brief-stale.
