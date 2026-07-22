status: shipped
attempted: fix stale-closure bug in DailyWordHuntSurvival.tsx useEffect deps
files_touched:
  - fe-next/components/daily/DailyWordHuntSurvival.tsx
next_steps: |
  The gate's root failure was a build OOM (5786/6144MB heap, JsonStringify in webpack).
  That is systemic — not caused by this file's changes. The file's own ESLint check
  passes (exit 0) before and after the fix.

  Fix applied: added clueShakeVariant and trackClueShakeExposure to the useEffect dep
  array. Both are from useExperiment hook and were used inside the effect but absent
  from deps — stale-closure bug: PostHog resolves async so the clue-shake experiment
  would never fire on the first invalid submission after PostHog loads.

  If the build OOM persists in the next nightly run, investigate:
  - NODE_OPTIONS bump to --max-old-space-size=8192
  - experiments.ts JSDoc growth tipping webpack serialization memory
  - Splitting large chunks (experiments.ts imported by many components)
