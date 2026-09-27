status: shipped
files_touched:
  - fe-next/lib/shiritori/sp/categoryBonus.ts (new — pure util, category word lists + daily rotation)
  - fe-next/lib/shiritori/sp/__tests__/categoryBonus.test.ts (new — 5 tests, all green)
  - fe-next/app/[locale]/shiritori/solo/page.tsx (submit callback: 2× category bonus scoring + gold burst)
  - fe-next/translations/en.js, es.js, he.js, ja.js, sv.js (shiritori.solo.category.* keys)
next_steps: >
  Expand word lists (currently ~20 per category).
  Add subtle post-first-hit "today's theme" reveal so players can hunt it.
  Test gate: submit みなと day=29 (places), ねこ day=30 (animals), うどん day=28 (foods).
