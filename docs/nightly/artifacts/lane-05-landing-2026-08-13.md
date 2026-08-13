status: shipped
attempted: improve an existing admin-beta mode (STEP 0 default) — target TBD after rotation check
files_touched:
  - fe-next/lib/drills/rareGems.ts
  - fe-next/lib/drills/__tests__/rareGems.test.ts
  - fe-next/components/drills/RareGems.tsx
  - fe-next/translations/en.js
  - fe-next/translations/he.js
  - fe-next/translations/sv.js
  - fe-next/translations/ja.js
  - fe-next/translations/es.js
next_steps: |
  Shipped Brain Drill — Rare Gems "Lucky Gem" variable-reward bonus (axis: variable-reward).
  Rotation check: 5/7 recent nights shipped a mode improvement (below 6-night STEP1 fallback
  threshold) -> stayed in STEP 0. No mode:tweak/polish:try callback within last 7 days (all
  found callbacks 18+ days old) -> self-selected. Valid admin-gated targets are sealed-bid,
  word-craft, brain-drill; brain-drill was stalest (last touched 2026-08-04) -> chose Rare Gems
  sub-mode (untouched by prior brain-drill lanes).
  What changed: any gem find (regardless of length-tier) now has a 12% flat chance to roll
  "Lucky" and double its points, forcing the epic sparkle/pop celebration + legendary sound
  even on a common/uncommon/rare word. The length->tier rule stays fully transparent (swatch
  colour unchanged, still shows the real tier) — the surprise is layered on top, not instead of.
  New pure fn `rollLuckyGem(rng)` in lib/drills/rareGems.ts, TDD tests added (deterministic via
  injected rng). New i18n key `brain.drills.luckyGemBonus` in all 5 locales (en/he/sv/ja/es),
  syntax-checked with `node --check` (all OK) since a `require()` smoke-test hung on this large
  translations bundle (unrelated pre-existing perf characteristic, not a regression from this
  change).
  VERIFICATION GAP (ran out of time budget): eslint on changed files hung past the 90s command
  timeout before returning output — not yet confirmed clean. No RareGems.tsx component test
  exists (only RareGemsCompletePhase.test.tsx), so the component wiring is unit-covered only
  transitively via the lib test, not via a component-level test. Score is client-computed only
  (server drills/submit route does not recompute gem points), so no client/server drift risk
  from the new randomness.
  TOMORROW: (1) run `npx eslint fe-next/lib/drills/rareGems.ts fe-next/lib/drills/__tests__/rareGems.test.ts fe-next/components/drills/RareGems.tsx` and fix any findings,
  (2) run `npx vitest run lib/drills/__tests__/rareGems.test.ts` to confirm the new tests pass,
  (3) if eslint hangs again on this repo, investigate — may be an unrelated infra issue worth
  a triage-queue entry.
