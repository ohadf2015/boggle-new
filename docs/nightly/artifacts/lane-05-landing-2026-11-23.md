status: shipped
attempted: STEP 0 — self-selected admin-beta mode improvement (feel/understandability axis).
files_touched:
  - fe-next/components/multiplayer/WheelRushView.tsx
  - fe-next/components/multiplayer/__tests__/WheelRushView.celebration.test.tsx
next_steps: >
  Wheel Rush (MP) pangram celebration banner already had a built, styled "+N points"
  pill in WheelRushCelebration.tsx (shared with the public daily Word Wheel), but the
  Wheel Rush call site never passed a score through — clearing the whole wheel popped
  the big banner with zero indication of what it was worth, while a separate small
  toast showed the number a beat earlier. Wired `data.score` from the `wheelWordResult`
  socket payload through `celebrateRef`/`triggerCelebration` into `celebration.points`
  (3-line diff, no new UI, reuses the existing points-pill JSX and type that were
  already dead code for this call site). Admin gate on Wheel Rush (`BattleModeCard`
  isAdmin) untouched. Added a RED-first test to WheelRushView.celebration.test.tsx
  asserting the banner shows "+60" for a score:60 accepted word; eslint clean on both
  touched files (`npx eslint` rc=0). Could NOT run vitest locally — both `npx vitest`
  and the local `node_modules/.bin/vitest` failed before this lane even ran a test
  (npx resolved a broken rolldown native binding from the npx cache; no `.bin/vitest`
  symlink exists in this checkout's node_modules) — consistent with the nightly
  Headline-0 CoW-clone/`.bin`-symlink issue, and the second local-binary attempt was
  then blocked by the lane's own 2-run full-repo-check cap. Defer to the nightly
  gate's authoritative run; if it flags the new test, the fix is almost certainly in
  the mock socket helper (same `makeMockSocket`/`fire` pattern already used by 4
  passing tests in the same file for score-bearing `wheelWordResult` payloads).
  Rotation note for lane 7: Gem Hunt was last touched (11-22), Crossword before that
  (11-19) — tonight picked Wheel Rush (not touched by lane 05 in the last 2 runs).
  Word Craft Run remains the next rotation slot. The admin-beta pool is still only
  3-4 real surfaces (Gem Hunt, Run, Wheel Rush, MP Crossword) — unchanged from prior
  nights' findings.
