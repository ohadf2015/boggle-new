status: research-only
files_touched: none (investigation + Telegram alert only; no code edited)
next_steps: Live-device repro of the classroom student-join retry path (type a 6-char join code,
get refused, backspace and retype a valid one) to confirm or rule out PR #2050 (5beb520c4,
JoinCodeStep.tsx hiding the NEXT button on wrongCode) as the cause of the 6-day-and-counting
zero on edu_classroom_join/student_join_started/student_join_completed (last event
2026-11-19T08:16 UTC). Site traffic to /join continued and overall session_start grew in the
same window, so this is an isolated funnel break, not a traffic drop. Once confirmed, the likely
fix is in JoinCodeField.tsx's select-all-on-focus overflow guard
(`value.length === JOIN_CODE_LENGTH && joinCodeOverflows(raw) -> return`) or in how `wrongCode`
interacts with the auto-advance onComplete path. Per-mode completion holes (§2 of
docs/telemetry-audit-2026-06-23.md) and the rewarded_ad_offered crater (3 vs 27/7d) were not
reached this run.
