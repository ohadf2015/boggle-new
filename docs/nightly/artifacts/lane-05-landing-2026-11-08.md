status: shipped
attempted: STEP 0 — improve one existing admin-beta mode (self-select target, one axis slice)
files_touched:
  - fe-next/lib/wheelRush/letterCoverage.ts
  - fe-next/lib/wheelRush/__tests__/letterCoverage.test.ts
  - fe-next/components/multiplayer/WheelRushCelebration.tsx
  - fe-next/components/multiplayer/__tests__/WheelRushCelebration.test.tsx
  - fe-next/components/multiplayer/WheelRushView.tsx
  - fe-next/translations/en.js
  - fe-next/translations/es.js
  - fe-next/translations/he.js
next_steps: |
  - Add the `missingLetter` i18n key to ja/ru/sv translations (fell off the file-count
    cap; en/es/he are done, other 3 currently fall back to English string — not broken,
    just untranslated).
  - Ground-truth finding: sealed-bid was fully removed end-to-end (commit 6aa2b1954,
    guarded by sealedBidRemoved.test.ts). The standing "ADMIN-BETA TARGET LIST" in
    docs/nightly/learnings.md still lists it as a rotation target — update that list,
    the real remaining admin-gated set is just word-craft (gems/cards) + wheel-rush.
  - Pre-existing stale UNCOMMITTED diffs sit in word-craft run/gems files and in
    WheelRushView.tsx itself (pass-toasts feature, mtimes Nov 6-7) from prior nights
    the gate dropped without reverting — not touched/caused by this run, but worth
    lane 01's salvage-replay picking them up; they looked complete and import-valid.
  - letterCoverage.test.ts (11 tests) ran green in isolation; eslint run on changed
    files was still in flight when this lane's time budget ran out — re-check its
    output before the gate if lane 01 hasn't already (see background task bgswlksn7).
