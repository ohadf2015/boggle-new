status: shipped
attempted: flag hygiene sweep + one new typed experiment targeting rage-click surfaces (he/daily/word-wheel, multiplayer, quick-play) + 2-3 instrumentation events
files_touched:
  - fe-next/components/daily/wheel/WheelActionBar.tsx (shake-feedback for short-word Submit tap behind new flag)
  - fe-next/components/daily/wheel/__tests__/WheelActionBar.shortWordFeedback.test.tsx (new, could not run — see next_steps)
  - fe-next/lib/experiments.ts (exp-wordwheel-short-word-feedback-v1 registry entry)
  - fe-next/utils/growthTracking.ts (wordwheel_short_word_tap added to GrowthEvent union)
  - docs/nightly/impact-ledger.ndjson (1 entry)
  - docs/nightly/triage-queue.md (2026-11-25 section: homepage-click-feedback guardrail breach + new-experiment check-after note)
  - docs/nightly/reports/2026-11-25.md (Lane 2 section)
next_steps: |
  - Verify WheelActionBar.shortWordFeedback.test.tsx passes under the real (non-isolated) node_modules —
    this lane's worktree node_modules was missing vitest + @types/* entirely (known CoW-clone issue),
    so the 4 new test cases were hand-traced against the implementation but never executed.
  - exp-homepage-click-feedback-v1 (4+ months live, 100% rollout): 14d uncapped read shows $rageclick
    HIGHER on click-feedback (24.1% of uniques) vs control (13.8%) — re-run page-scoped + flood-capped
    (exclude distinct_ids >50 events/window) before deciding to retire that arm either way.
  - exp-wordwheel-short-word-feedback-v1 is live (flag id 379437, 50/50). Check after 7 days:
    wordwheel_short_word_tap rate + $rageclick on /he/daily/word-wheel, shake vs control.
  - Flag hygiene: no decided/retirable flags found this pass (the two memory-flagged "unwired"
    candidates were already clean). A real stat-significance sweep across all ~70 active flags
    needs a dedicated pass (per-flag HogQL variant/conversion query), not done tonight — time-boxed.
