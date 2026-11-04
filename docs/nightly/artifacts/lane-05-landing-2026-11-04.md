status: shipped
files_touched:
  - fe-next/app/[locale]/brain/PageClient.tsx
  - fe-next/translations/en.js
  - fe-next/translations/es.js
  - fe-next/translations/he.js
  - fe-next/translations/ja.js
  - fe-next/translations/ru.js
  - fe-next/translations/sv.js
summary: >
  STEP 0 mode improvement, understandability axis, mode=Brain Gym (`/brain`, PUBLIC —
  NOT admin-gated despite nightly's stale "known admin-beta set"; QuickDrillsSection.tsx
  comment confirms "Every drill is open from the first visit"). Rotated off Word
  Craft/Wheel Rush (10+ straight nights alternating those two per
  docs/nightly/reports/*.md); Brain Gym untouched since 2026-08-13 and
  loop-improvements notes it has 0 drill_completed events — a first-screen clarity
  gap, not a feature gap. The hub page (`/brain`) jumped straight from header into
  the drill grid with zero explanation of what the drills are for or what you get.
  Added one value-prop line above the grid: "Short, adaptive drills — earn XP and
  level up every round." (verified truthful against
  app/api/drills/submit/processCompletion.ts DRILL_XP_BASE + increment_player_xp
  RPC). New key `brain.subtitle` added to all 6 locale files (en/es/he/ja/ru/sv),
  node --check clean on all 6, eslint clean on PageClient.tsx.
next_steps: >
  Not browser-checked (RTL wrap on he, line length on ja not visually verified).
  Fallback-to-STEP1 conditions were true this week (mode improved 6/6 recent report
  nights) but no PostHog call was made — still no landing-CVR signal pulled. If
  Brain Gym completions stay at 0 next week, the real blocker may be upstream
  discoverability (entry point into /brain from home/GlobalBottomNav), not this
  page's copy — check nav visibility next.
