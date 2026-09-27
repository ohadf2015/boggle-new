---
status: partial
files_touched:
  - fe-next/lib/experiments.ts (added exp-settings-lang-feedback-v1 definition)
next_steps: |
  Wire exp-settings-lang-feedback-v1 in settings/PageClient.tsx:
    import useExperiment + posthog; add langSaved state; on select onChange track
    settings_language_changed + in lang-toast variant flash ✓ for 1.5s.
  Then: scripts/nightly/lib/posthog-experiment.sh ensure exp-settings-lang-feedback-v1 control lang-toast "..."
  Also wire exp-blast-wave-banner-v1 or delete its PostHog flag (0 call sites, live flag = fake test).
  Add settings_language_changed + settings_effect_toggled events to PageClient.tsx.
---

All active exp flags <100 users/arm — none retired (need >=1000).
exp-blast-wave-banner-v1: PostHog flag live since 2026-06-29, 0 code call sites — triage-queue.
exp-settings-lang-feedback-v1: defined in experiments.ts; PostHog flag withheld (0 call sites rule).
