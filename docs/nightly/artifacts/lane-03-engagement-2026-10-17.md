status: shipped
attempted: flag hygiene sweep + new typed experiment targeting rage-click pages (multiplayer, singleplayer autoStart) + instrumentation gaps
files_touched: fe-next/components/singleplayer/game/hooks/useSinglePlayerCore.ts
summary: |
  Flag hygiene — no retirements: all "default flipped" experiments in experiments.ts
  are deliberate kept-as-kill-switch, not pending decisions. Wired-experiment PostHog
  flag sweep skipped this run (no new/changed wiring to back-fill).
  New experiment — not shipped: brief's rage-click targets (multiplayer, singleplayer
  autoStart=coach/challenge) are each reach=1 (single sample), too thin to design a
  variant against without risking a change on noise.
  Instrumentation (goal 3) — shipped `singleplayer_grid_ready` event (mode, coach,
  used_themed_fetch, ms) in useSinglePlayerCore.ts. Traced the autoStart=coach vs
  autoStart=challenge code path: 'playing' phase renders (board tappable) before
  `grid` is set; coach resolves synchronously via lessonBoardFor, challenge awaits
  `/api/themed-words` first — a real, confirmed async gap and plausible rage-click
  root cause for the challenge path specifically. This event will tell next-day lanes
  the actual ms distribution so a fix (skip the fetch for autoStart entries, or show
  a loading state) can be scoped with real numbers instead of n=1 guessing.
  Did NOT touch the multiplayer entry screen (useMpPageState.ts) — it's already
  mid-edit with unrelated uncommitted changes from another session; layering a new
  capture there risked colliding with that in-flight work.
  Verified: direct ./node_modules/.bin/eslint run on the changed file only, 0 issues
  (npx cold-boot hung >3min per known issue — bypassed, did not block on it).
next_steps: |
  - Query singleplayer_grid_ready after 2-3 days: avg(ms) + p95 grouped by mode/coach.
    If challenge-mode ms is high (network-bound), the fix is either skip the
    /api/themed-words fetch for autoStart=challenge (speed > richer word embedding
    for a deep-link entry) or gate the board's tap-input visibly (loading skeleton)
    until grid is set.
  - Re-check multiplayer entry rage click once useMpPageState.ts WIP lands/commits —
    instrument socket-connecting vs CTA-interactive state then.
  - Flag hygiene: no live PostHog flag-level stats pulled this run (relied on brief
    + experiments.ts comments only) — a real decided-winner sweep needs the
    experiment-results API, not just code comments.
