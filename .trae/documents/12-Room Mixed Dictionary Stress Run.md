## Steps
- Reset metrics: `GET /metrics/reset`
- Run stress: `STRESS_SERVER_URL=http://localhost:3002 npm run stress -- --clients=100 --duration=30 --rate=3 --rooms=12 --rampMs=1000 --dictRatio=0.5 --out=TEST_REPORT_STRESS_12.json`
- Fetch metrics: `curl http://localhost:3002/metrics` and `curl http://localhost:3002/metrics/rooms`

## Purpose
- 12 concurrent rooms validate multi-room stability under mixed dictionary/non-dictionary submissions.
- Saved report and metrics provide aggregate and per-room visibility.

## Output
- File: `fe-next/TEST_REPORT_STRESS_12.json`
- JSON metrics from endpoints

Proceeding now.