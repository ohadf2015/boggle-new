---
status: shipped
attempted: Impact-check SPA-abandon event, wire mp_round_ready_clicked + mp_results_exit_clicked (2 missing guardrail events blocking 3 experiments), new exp-mp-round-reaction-v1 (emoji-burst on ready click), PostHog flag created
files_touched:
  - fe-next/components/results/ResultsActionButtons.tsx
  - fe-next/lib/experiments.ts
  - docs/nightly/impact-ledger.ndjson
next_steps: Flag old inconclusive experiments (14+ days, none at n≥1000/arm) in triage-queue.md tomorrow; wire ResultsCtaSection.tsx same pattern if mp_round_ready_clicked shows missing there
---
