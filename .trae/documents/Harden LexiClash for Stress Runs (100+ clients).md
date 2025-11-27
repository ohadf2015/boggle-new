## Findings from Your Stress Run
- Room capped at 50 players (`fe-next/backend/socketHandlers.js:61`), so 49 clients joined + 1 host; remaining clients correctly rejected.
- 8,900 submissions in 30s with 2 accepted, 4,216 not-on-board, 143 needs-validation; large remainder likely duplicates and rate-limited events not tracked by client.
- Start coordination timed out with 0/50 acks; timer still started and game completed, which matches design.

## Root Causes Impacting Throughput
- Random word generation rarely matches DFS board paths (`fe-next/backend/modules/wordValidator.js:20-62`), so most submissions fail early.
- Per-event processing does normalization and DFS on each submission; under load this is CPU heavy.
- Fixed room-size cap forces half of clients to idle/retry, inflating connection churn without contributing gameplay.

## Plan to Make Stress Runs Smooth

### Server Hardening
- Calibrate rate limiting:
  - Switch to token-bucket per socket and per-event with small burst allowance and a clear `rateLimited` ack (avoid generic `error`).
  - Expose configurable limits via env (e.g., `RATE_WINDOW_MS`, `RATE_MAX_MESSAGES`).
- Room capacity behavior:
  - Keep `MAX_PLAYERS_PER_ROOM=50` for UX, but add an overflow "spectator/queue" mode so extra clients don’t hammer `join` repeatedly.
  - Optionally allow raising to 100 for stress-specific runs.

### Word Validation Performance
- Precompute letter positions map for the current grid once per game and reuse in validation:
  - Build `Map<char, Array<[r,c]>>` before the round; cuts start-position scans (`fe-next/backend/modules/wordValidator.js:73-83`).
- Optimize DFS:
  - Replace new `Set(visited)` allocation on each recursion with a shared bitset or index-based array; reduces GC pressure (`fe-next/backend/modules/wordValidator.js:55-59`).
  - Add short-circuiting for repeated letters and length caps.
- Cache negative results for short words per grid to avoid repeated work across players.

### Observability & Safety
- Metrics:
  - Add counters for `submitWord` outcomes (accepted/notOnBoard/needsValidation/rateLimited), plus latency histograms.
  - Track event loop lag and broadcast counts.
- Health endpoints:
  - `/metrics` (Prometheus) and `/healthz` to confirm ready status.

### Stress Harness Upgrades
- Generate valid on-board words:
  - Walk adjacency from the grid to build candidate words that satisfy DFS rules; measure acceptance vs dictionary validation.
- Multi-room load:
  - Split clients across multiple rooms (e.g., 2×50 or 4×25) to avoid single-room bottlenecks.
- Ramp-up & jitter:
  - Stagger client connects and word rates to prevent thundering herd.
- Result reporting:
  - Add per-event breakdown and server-side rate-limited counts to correlate client metrics.

### Configuration Toggles
- Add env toggles for stress mode:
  - `STRESS_MODE=1` to relax dictionary checks and reduce animations/broadcasts frequency.
  - `TIME_UPDATE_INTERVAL_MS` override to lower broadcast pressure during stress testing.

### Acceptance Criteria
- With 100 clients total, 2 rooms × 50 each:
  - >95% of submissions receive a definitive outcome event.
  - No crashes or OOM; event loop lag remains within acceptable bounds.
  - Server CPU stays under target (document target based on instance size).

### Next Steps
1. Implement DFS and start-position caching in `wordValidator` and precompute per game.
2. Add spectator/queue overflow handling on `join` instead of repeated rejections.
3. Introduce token-bucket rate limiter with explicit `rateLimited` ack.
4. Enhance stress harness for on-board word generation, multi-room, and ramp-up.
5. Add basic metrics and a `/metrics` endpoint for visibility.

Confirm this plan, and I’ll implement the changes and run the stress harness, sharing a detailed report.