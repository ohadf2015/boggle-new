status: shipped
attempted: flag hygiene audit + one new funnel experiment + 2-3 instrumentation events targeting biggest drop
files_touched:
  - fe-next/components/singleplayer/SinglePlayerResults.tsx (2 new tracking events)
  - docs/nightly/triage-queue.md (corrected prior "no call sites" errors for 2 flags)
  - docs/nightly/reports/2026-06-02.md (lane 03 appended)
posthog_flags_created:
  - exp-results-replay-cta-v1 (id=197044, 50/50 control/quick-replay, LIVE)
new_events:
  - results_cta_clicked {cta: 'back_to_lobby', mode} — SinglePlayerResults.tsx:97
  - results_autoplay_cancelled {mode} — SinglePlayerResults.tsx:339
next_steps:
  - Verify exp-results-replay-cta-v1 fires in PostHog (check $feature_flag_called with key=exp-results-replay-cta-v1 after first real user session)
  - Human decision needed on show-signup-after-first-win (63d, 34 exposures, inconclusive)
  - Human decision needed on share-prompt-timing (63d, 0 PostHog exposures, likely retire)
