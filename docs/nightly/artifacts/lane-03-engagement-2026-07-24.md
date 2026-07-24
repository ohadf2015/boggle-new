status: shipped
files_touched:
  - fe-next/components/results/GameFeedbackCard.tsx
  - fe-next/translations/ru.js
  - docs/nightly/reports/2026-07-24.md
  - docs/nightly/impact-ledger.ndjson
  - docs/nightly/triage-queue.md
next_steps: |
  - Check mp_round_issue_selected event fires in PostHog after 3 days (flag id:235417 live)
  - Human: deactivate zombie flag exp-mp-room-join-loading-v1 in PostHog (id:219697)
  - If mp_round_issue_selected(issue=technical_issue) fires ≥3x, escalate bot-special-tiles bug (he locale report 2026-07-22)
  - Full flag hygiene needs experiment result data (none have ≥7d + ≥1000/arm yet)
