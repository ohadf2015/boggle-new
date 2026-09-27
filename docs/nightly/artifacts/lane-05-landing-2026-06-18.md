status: shipped
attempted: Shiritori pressure-cue shrinking border (polish:try:shiritori:ba2e30b4) — CSS inset box-shadow overlay animates black→orange→red over 5s during player turn; resets each turn via unmount/remount; placeholder copy updated to "Keep your chain alive…" in all 5 locales
files_touched:
  - fe-next/tailwind.config.js (pressure-border keyframe + animation)
  - fe-next/app/[locale]/shiritori/solo/page.tsx (input wrapper + overlay div)
  - fe-next/translations/en.js
  - fe-next/translations/he.js
  - fe-next/translations/sv.js
  - fe-next/translations/ja.js
  - fe-next/translations/es.js
next_steps: Wire useShiritoriTempo hook (built 06-17, deferred) into solo/page.tsx — 6 edit points documented in 06-17 artifact
