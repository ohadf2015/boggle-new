status: shipped
attempted: Follow STEP 0 default — pick an under-attended admin-beta mode and ship one small improvement axis (UI/gameplay/variable-reward/feel/graphics/obviousness/understandability/fun), editing existing files only, admin gate intact.
files_touched:
  - fe-next/components/multiplayer/WheelRushPieces.tsx
  - fe-next/components/multiplayer/WheelRushPieces.test.tsx
  - fe-next/components/multiplayer/WheelRushView.tsx
  - fe-next/translations/en.js
  - fe-next/translations/he.js
  - fe-next/translations/sv.js
  - fe-next/translations/ja.js
  - fe-next/translations/es.js
next_steps: |
  - ru.js still has the duplicate "wordWheel.closeRace" key (dead first value, live second) — same bug fixed in
    en/he/sv/ja/es tonight. Not fixed in ru because the lane's 8-file working-set cap was already spent on the
    5 required locales. One-line dedupe, same pattern as the other 5 files (grep '"closeRace"' translations/ru.js).
  - ru.js was also not given the new chipLockedLabel/chipClosedLabel keys — same 2-line addition as the other
    5 locales, near the "onFireBadge" key in the wordWheel block (~line 17387).
  - Toolchain was broken this run (same CoW node_modules / missing eslint+vitest binaries lane 7 tracks as
    Headline 1/2 — "Cannot find package 'eslint'") so this change was verified by manual read-through +
    `node --check` on the 5 translation files (all syntax-clean) + a duplicate-key grep, NOT by running the
    actual vitest suite. Re-run `vitest run components/multiplayer/WheelRushPieces.test.tsx` once the
    toolchain is healthy to confirm the 3 new RED tests go GREEN.
