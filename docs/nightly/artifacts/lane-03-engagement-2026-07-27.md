status: research-only
attempted: impact checks for rival-best-word + issue-probe, rage-click audit, flag hygiene sweep across all 40+ active PostHog flags
files_touched: docs/nightly/impact-ledger.ndjson (2 verdict lines appended)
next_steps: |
  KEY DISCOVERY: experiments use n() hook alias NOT useExperiment(). All exp- searches
  must use: rg "n\('exp-" fe-next (not rg "useExperiment" or rg "exp-key-literal")

  Impact verdicts appended:
  - rival-best-word: neutral (1.5 avg vs 1.43 baseline; n=2, insufficient signal)
  - issue-probe: neutral (0 mp_round_issue_selected — probe not firing; verify wiring)

  ZOMBIE FLAGS (deactivate in PostHog):
  - exp-mp-room-join-loading-v1 (id:219697) — flagged zombie 5+ nights, still active
  - exp-mp-lobby-connect-feedback-v1 (id:230974) — CONCLUDED comment in experiments.ts L670

  New experiment NOT shipped (discovery consumed budget). Tomorrow:
  1. Verify issue-probe wiring: rg "n\('exp-mp-round-issue-probe" fe-next
  2. Ship new experiment for /multiplayer rage clicks (es + he pages, reach=2)
  3. Deactivate the two zombie flags via posthog-experiment.sh or REST PATCH active=false
