status: shipped
attempted: flag hygiene sweep (exp-practice-wheel-cta-v1 + wired experiments), add 1 new typed experiment behind a flag targeting word-tower rage clicks, instrument 2-3 analytics events for funnel gaps
files_touched:
  - fe-next/components/wordTowerV2/useWordTowerPlacingNudge.ts (new)
  - fe-next/components/wordTowerV2/__tests__/useWordTowerPlacingNudge.test.ts (new, TDD-first)
  - fe-next/components/wordTowerV2/LetterRow.tsx (onBlockedTap + shake props, DROP button shake)
  - fe-next/components/wordTowerV2/V2Dock.tsx (thread props to LetterRow)
  - fe-next/components/wordTowerV2/WordTowerV2.tsx (wire useWordTowerPlacingNudge into V2Dock)
  - docs/nightly/reports/2026-11-24.md (Lane 2 section appended)
  - docs/nightly/impact-ledger.ndjson (1 entry appended)
decided_not_to:
  - flag retirement sweep: skipped — no experiment in the brief's slice met the ≥7d/≥1000-per-arm/p<0.05 bar; sweeping the full registry (40+ experiments) for decided winners was out of scope for the 15-min budget after wiring the top rage-click item.
  - new experiment / 2-3 instrumentation events (goals 2-3): skipped in favor of fully landing + manually verifying goal 1 (wiring an existing unwired experiment that directly targets the brief's #1-scored item, reach=42) within time budget. Adding a second half-verified change risked shipping nothing clean.
verification_note: sandbox node_modules was missing vitest/eslint entirely (CoW-clone infra issue, Headline 0 in nightly learnings — pre-existing, not caused by this change). Could not run tests/lint/tsc locally; verified by careful manual read of the diff (handler wiring, prop threading, hook contract match against hooks/useExperiment.ts's real return shape). Wrote the TDD test file first per repo rules; it could not be executed in this sandbox but is ready for the authoritative gate.
concurrent_lane_note: another lane touched LetterRow.tsx tonight (its __tests__/LetterRow.test.tsx diff expects aria-disabled on tray tiles, but the component in the shared working tree still has native disabled={placing} — unmatched, likely a different in-flight lane, e.g. mode-qa). Did not touch — not this lane's change, flagging for lane 7 integration to reconcile or drop.
next_steps: once the authoritative gate confirms this is green, watch `experiment_exposed{experiment:exp-wordtower-placing-nudge-v1}` volume and the /en/word-tower rage-click count (nudge vs control) over the next 3 days (impact ledger entry baseline=42). If nudge doesn't move it, the dead-tap might also be happening on individual tile buttons (not just the group div) — re-check with real rage-click el_text breakdown by arm. Next lane-03 run: do the flag-retirement sweep across the full `lib/experiments.ts` registry (40+ entries) that was skipped tonight — none were checked against the 7d/1000/p<0.05 bar.
