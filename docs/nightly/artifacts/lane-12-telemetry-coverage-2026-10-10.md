status: shipped
attempted: run posthog-coverage audit (DEAD/CRATERED/per-mode holes), triage, fix one wired-but-silent or never-wired event, report+telegram+ledger
files_touched: fe-next/components/multiplayer/results/MpResultsStage.tsx, fe-next/components/multiplayer/results/__tests__/MpResultsScreen.test.tsx
next_steps: fix mp_brag_card_viewed (same 09-26 root cause — bragData logic lives in ResultsMainContent/Details, needs relocating or re-triggering from Stage); then resume §1b backlog + per-mode completion holes (not reached this run, regression took priority)
