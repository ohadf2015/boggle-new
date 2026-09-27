status: shipped
files_touched:
  - docs/nightly/learnings.md (rewritten, 96 lines, window 07-24..07-30)
  - docs/nightly/loop-improvements/2026-07-30.md (new, 64 lines)
  - docs/nightly/reports/2026-07-30.md (Lane 7 section appended)
summary: |
  Gate friction RESOLVED this window — 0 false-drops (was 2/6) thanks to the
  baseline-red + typecheck-tier fallback tiers. Friction moved UPSTREAM: the
  pre-lane phase burns 4h23m-9h33m before lane 1 starts, draining the shared
  usage window (07-25 = 0 ships, circuit-breaker, 5 lanes deferred).
  ROOT CAUSE FOUND: scripts/nightly/lib/mcp-probe.sh:63 wraps gtimeout around
  `npx` only, but `resp=$(... | head -1)` is a command substitution — bash waits
  for every writer of the pipe to close, so an orphaned grandchild blocks past
  the 90s budget. Measured 1h51m/attempt x3 = 3h07m on 07-29, for a probe that
  failed anyway (and lane 02 proved 07-30 that the Management-API SQL fallback
  works without MCP entirely).
next_steps:
  - "P1 (S): bound the whole probe pipeline in mcp-probe.sh:63 (gtimeout -k 5 ... bash -c '<pipeline>'); drop NIGHTLY_PROBE_RETRIES 3->1; demote probe to informational"
  - "P2 (S): heartbeat-log + hard-cap the unlogged 01:00->baseline 4h23m pre-lane gap (silent wait = Class 4)"
  - "P3 (S/M): scripts/nightly/tools/browser-consent-seed.sh — pre-seed the consent cookie; unblocks sealed-bid visual QA (5 nights) AND lane 02 Layout-Shifts capture (3 weeks)"
  - "P4 (S): pin lane 07 to a fixed weekly slot, exempt from signal ranking (was scheduled out 4 of 5 nights; learnings went 6d stale)"
  - "P5 (S/M): fix the 4 test files red on clean master so the gate passes cleanly instead of shipping via a fallback tier 4/5 nights"
  - "P6 (S): lane-run idempotence guard (lane 12 ran twice on 07-30, wrote two contradicting blocks)"
  - "P7 (S): impact checks must assert a plausible denominator; report no-exposure, not neutral"
