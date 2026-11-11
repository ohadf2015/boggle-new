status: shipped
attempted: flag hygiene sweep + new typed experiment targeting word_hunt rage clicks + instrumentation gaps
files_touched: fe-next/lib/experiments.ts, fe-next/components/wordTowerV2/LetterRow.tsx, fe-next/components/wordTowerV2/V2Dock.tsx, fe-next/components/wordTowerV2/WordTowerV2.tsx, fe-next/utils/growthTracking.ts
next_steps: flag hygiene found nothing decided this run (no ≥7d/≥1000-arm/p<0.05 winner in brief) — re-check next run. New experiment exp-wordtower-busy-tap-feedback-v1 is live (PostHog id 355694, 50/50); check wt2_busy_tap volume + /en/word-tower rageclicks_24h after 3 days per impact-ledger entry. Not browser-checked — eslint clean on all 5 changed files only (no full tsc/build per time-budget rule); verify via the nightly gate.
