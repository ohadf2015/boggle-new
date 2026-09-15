status: shipped
attempted: STEP 0 — self-select admin-beta mode improvement (rotate, avoid last-3-nights mode); fallback STEP 1 landing CVR only if 6/7 nights already improved a mode.
files_touched:
  - fe-next/components/multiplayer/WheelRushHeader.tsx
  - fe-next/components/multiplayer/__tests__/WheelRushHeader.test.tsx
  - fe-next/translations/en.js
  - fe-next/translations/he.js
  - fe-next/translations/sv.js
  - fe-next/translations/ja.js
  - fe-next/translations/es.js
  - fe-next/translations/ru.js
next_steps: Mode axis "near-miss tension" shipped for Wheel Rush only (rival-vs-self proximity pulse). Same pattern could extend to other head-to-head modes (Sealed Bid) on a future night. TDD: RED (1 fail/9 pass) confirmed before implementing, GREEN 10/10 after. eslint clean on changed files. Full tsc/build NOT re-run here (nightly gate is authoritative) — one post-green cosmetic class fix (text-neo-orange-dark -> text-neo-orange, token didn't exist) was not re-tested via vitest because the full-repo self-check cap was already hit twice; the fix is a color-token swap unrelated to any test assertion (tests check border-neo-orange on badge/opp cards + indicator presence, not the icon's text color), so it is safe, but gate should still catch anything missed.
