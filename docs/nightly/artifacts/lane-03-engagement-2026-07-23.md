status: partial
files_touched:
  - fe-next/lib/experiments.ts (added exp-mp-round-issue-probe-v1)
  - fe-next/utils/growthTracking.ts (added mp_round_issue_selected event)
  - fe-next/translations/en.js (issueProbe keys)
  - fe-next/translations/he.js (issueProbe keys — flag for native review)
  - fe-next/translations/sv.js (issueProbe keys — flag for native review)
  - fe-next/translations/ja.js (issueProbe keys — flag for native review)
  - fe-next/translations/es.js (issueProbe keys — flag for native review)
next_steps:
  - Wire exp-mp-round-issue-probe-v1 in GameFeedbackCard.tsx (useState pendingRating + follow-up chips after bad/ok on mp_round surface)
  - Then run: scripts/nightly/lib/posthog-experiment.sh ensure exp-mp-round-issue-probe-v1 control issue-probe "MP round triage chips after bad/ok rating"
  - Impact check: homepage click-feedback REGRESSED (8 sessions vs baseline 3) — investigate whether brightness-drop variant causing confusion
  - Zombie flag exp-mp-room-join-loading-v1 still active (0 call sites) — human deactivate in PostHog
