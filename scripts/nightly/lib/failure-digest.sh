#!/bin/bash
# failure-digest.sh — compose a Telegram digest for runs that did NOT ship.
# Sourced by run.sh. Tested by test/failure-digest.test.sh.
#
# WHY: the rich success digest is composed (via the `claude` CLI) and sent ONLY
# after a successful push. On a gate failure / churn abort / push conflict the run
# exits first, so the founder got at most a one-line `tg_alert` — and a run killed
# mid-gate sent nothing at all. "Didn't ship" and "never ran" looked identical.
# compose_failure_digest builds a DETERMINISTIC (no-LLM, so it can't itself
# fail/timeout) message that names the failure and what the lanes produced, so
# every failed-but-ran night still reports.
#
# Reads globals: TODAY, RUN_LOG, LANE_SUMMARY_TEXT (newline-joined lane results).
# Arg $1: one-line failure reason.
compose_failure_digest() {
  local reason="${1:-unknown failure}"
  local lanes="${LANE_SUMMARY_TEXT:-}"
  [ -n "$lanes" ] || lanes="(no lane results recorded)"
  printf '🌙 *%s* — ⚠️ nightly did NOT ship\n\n%s\n\n*Lanes this run:*\n%s\n\nNothing committed or pushed. Founder WIP left intact.\nLog: `%s`' \
    "${TODAY:-?}" "$reason" "$lanes" "${RUN_LOG:-?}"
}
