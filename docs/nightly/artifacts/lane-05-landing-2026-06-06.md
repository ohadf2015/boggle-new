---
status: shipped
attempted: STEP 0 — polish:try:word-alchemy:8bb7ac9a "Alchemy Heat Chain" — heat meter + Exothermic Rush bonus
files_touched:
  - fe-next/lib/wordAlchemy/heatMeter.ts (new — pure logic)
  - fe-next/lib/wordAlchemy/__tests__/heatMeter.test.ts (new — TDD)
  - fe-next/hooks/useAlchemyHeatMeter.ts (new — React hook)
  - fe-next/components/wordAlchemy/AlchemyHeatBar.tsx (new — visual component)
  - fe-next/app/[locale]/word-alchemy/page.tsx (wired: import + hook + submit + render)
  - fe-next/translations/en.js + he.js + es.js + sv.js + ja.js (heat.label/rush/rushAria)
next_steps: Run gate (lint/tsc/tests). Device playtest at /en/word-alchemy. Consider adding hook unit tests.
---
