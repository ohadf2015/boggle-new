status: research-only
files_touched: none
findings:
  - Top brief item (score 0.894, rage clicks on /en/word-tower, reach 12) already has
    partial instrumentation: components/wordTower/WordTowerWheel.tsx:119-157 captures
    `word_tower_tap_blocked` (reason:'placing') from a prior nightly run, and the wheel
    already shows visual lock feedback (tiles fade scale-50/opacity-0, aria-label swaps
    to "crane.drop") during the `placing` window. Rage clicks persisting on /en/word-tower
    (and still on /he/word-tower/daily, score 0.683) despite that feedback suggests the
    `placing` lock DURATION itself is the problem, not missing feedback -- out of scope to
    fix blind in a 15-min lane without reading useTowerRun.ts's placing-duration constant.
  - `lib/experiments.ts` (970 lines) already has a precedent pattern for this exact class
    of bug: `exp-wordwheel-drag-hint-v1` (idle coachmark for an undiscoverable drag mechanic
    on the sibling Word Wheel mode). A `exp-wordtower-placing-feedback-v1` experiment
    (variant: shorten placing lock OR add a progress-ring during the lock) would be the
    correct next move -- did not wire it tonight because the real duration/cause needs
    reading useTowerRun.ts + useDailyTowerLifecycle.ts first, which did not fit remaining
    budget alongside a safe, verified edit.
next_steps:
  - Read components/wordTowerV2/useTowerRun.ts + useDailyTower.ts for the `placing` state's
    timeout/duration source.
  - If duration is a fixed constant >400-500ms, that's the likely rage-click cause (Class 4
    silent-failure pattern: tap during lock does nothing, player burst-taps). Shorten it or
    add a mid-lock progress affordance, gated behind a new typed experiment in
    lib/experiments.ts mirroring exp-wordwheel-drag-hint-v1, then `posthog-experiment.sh
    ensure` the flag.
  - Second target untouched: rage clicks on /he/connections/daily (score 0.411) and
    /en/multiplayer (score 0.285) -- not investigated this run.
