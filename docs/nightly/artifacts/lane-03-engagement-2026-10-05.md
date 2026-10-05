status: shipped
files_touched: fe-next/components/singleplayer/SinglePlayerGame.tsx, fe-next/translations/{en,he,sv,ja,es}.js, docs/nightly/reports/2026-10-05.md, docs/nightly/impact-ledger.ndjson
next_steps: run `scripts/nightly/lib/posthog-experiment.sh ensure exp-singleplayer-word-goal-v1 control word-goal "SP word-count goal badge"` to make flag live; add 2-3 instrumentation events for funnel gaps (not done, ran out of time); no flags met decided-winner retirement bar this run.
