## What I’ll Run
- Reset counters: `GET /metrics/reset`
- Stress command: `STRESS_SERVER_URL=http://localhost:3002 npm run stress -- --clients=100 --duration=30 --rate=3 --rooms=12 --rampMs=1000 --dictRatio=0.6 --out=TEST_REPORT_STRESS_12.json`
- Fetch metrics:
  - `curl http://localhost:3002/metrics`
  - `curl http://localhost:3002/metrics/rooms`

## Rationale
- 12 rooms distributes load (~8–9 clients/room with `--clients=100`), exercising multi-room routing and broadcasts.
- `dictRatio=0.6` mixes dictionary-assisted on‑board words with non-dictionary candidates to observe both accepted and needs-validation paths.
- Ramp reduces burst effects.

## Deliverables
- Saved report `fe-next/TEST_REPORT_STRESS_12.json` with aggregate and per-room breakdown
- Global and per-room counters after the run

I’ll proceed immediately and share the results.