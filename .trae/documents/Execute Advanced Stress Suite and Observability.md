## Objectives
- Validate smooth operation under multi-room high load.
- Produce meaningful accepted vs needsValidation ratios by mixing dictionary and non-dictionary submissions.
- Ensure per-room metrics populate and can be reset for clean runs.

## Implementation Plan
- Stress Harness
  - Add a configurable mix ratio (e.g., `--dictRatio=0.6`) to submit 60% dictionary-assisted on-board words and 40% on-board non-dictionary words.
  - Add options to save run output to files (`--out=TEST_REPORT_STRESS.json`) and append per-room details.
- Metrics
  - Ensure per-room counters are initialized on `createGame` and incremented on `submitWord` outcomes.
  - Add `GET /metrics/reset` to zero global and per-room counters for repeatable tests.
- Rate Limiter
  - Keep env toggles (`RATE_MAX_MESSAGES`, `RATE_WINDOW_MS`) and optionally add per-event weights defaults (`RATE_WEIGHT_SUBMITWORD`, `RATE_WEIGHT_CHAT`).
- Config Overrides (Stress Only)
  - Optional `MAX_PLAYERS_PER_ROOM` env override to test larger rooms.

## Validation Steps
- Run 2 scenarios:
  - 4 rooms × 25 clients, 30s, 3/s, dictRatio=0.6.
  - 3 rooms × 50 clients, 30s, 3/s, dictRatio=0.6 (if capacity permits).
- After each run:
  - Fetch `GET /metrics` and `GET /metrics/rooms`.
  - Save results to files and summarize acceptance vs needsValidation and rateLimited counts.

## Deliverables
- Updated stress harness with mix ratio and output options.
- Metrics reset endpoint.
- Two stress run reports (aggregate and per-room) saved in the repo.

Confirm to proceed; I will implement, run the scenarios, and share the reports.