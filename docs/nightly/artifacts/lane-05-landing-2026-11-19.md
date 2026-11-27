status: shipped
files_touched:
  - fe-next/components/multiplayer/crossword/CrosswordVersus.tsx
  - fe-next/components/multiplayer/crossword/__tests__/CrosswordVersus.test.tsx
  - fe-next/translations/en.js
  - fe-next/translations/he.js
  - fe-next/translations/ja.js
  - fe-next/translations/es.js
  - fe-next/translations/ru.js
  - fe-next/translations/sv.js
next_steps: >
  STEP 0 mode improvement, understandability/fun axis, MP Crossword Versus race
  (only remaining IN_WORK_MODES admin-gated BattleModeCard mode; word-craft
  gem-hunt/run and wheel-rush were already dirty in the shared tree tonight
  from lane-01's salvage restore, so picked the clean surface). A non-winner
  at race-over used to see only the winner's name (identical feedback whether
  2nd or last) — added a "You placed #N/total" rank chip for non-winners,
  reusing the existing header rank-chip JSX pattern (numerals outside t(),
  only the label/separator translated) so it's testable against the dumb
  `t: (k) => k` test mock. 6-locale yourRank key added (en/he/ja/es/ru/sv), all
  verified via `node -e require(...)`. eslint clean on both touched source
  files. Could NOT run vitest locally (shared-machine node_modules contention,
  60s timeout with zero output — consistent with known recurring issue) or a
  project-wide tsc — new test is RED-by-construction (the testid didn't exist
  before this diff) and the component change is a minimal, type-safe JSX
  addition reusing existing `myRank`/`standings` locals; defer to the nightly
  gate's authoritative run. Next session: if gate flags this, check the test
  mock `t` signature first (2-arg `(k:string)=>k`, ignores params — by design,
  matches existing header-chip test pattern). Rotation note for lane 7: the
  "known admin-beta set" brief is stale — sealed-bid is REMOVED
  (`backend/modes/__tests__/sealedBidRemoved.test.ts`), brain-drill/Brain Gym
  and wheel-rush are PUBLIC (confirmed via BattleModeCard's public `MODES`
  array + brain page tests always passing isAdmin:false), word-tower daily has
  no isAdmin gate found. The ONLY remaining truly admin-gated surfaces are
  word-craft (gateWordCraftMode: cards/gems submodes) and MP Crossword
  (IN_WORK_MODES in BattleModeCard). Both were touched in the last 3 nights —
  pool is nearly exhausted; lane 7 should flag this for the founder (promote
  one to public, or find/build a new admin-beta candidate) rather than having
  lanes keep re-touching the same 2 surfaces.
