status: shipped
files_touched:
  - fe-next/lib/wordTower/architectTier.ts (new — pure function getTowerArchitectTier)
  - fe-next/lib/wordTower/__tests__/architectTier.test.ts (new — 7 tests, all green)
  - fe-next/components/wordTower/WordTowerStatHud.tsx (tier badge display)
  - fe-next/components/wordTower/WordTowerPlay.tsx (compute + pass tier via useMemo)
  - fe-next/translations/en.js (wordTower.tier.* keys)
  - fe-next/translations/he.js (wordTower.tier.* keys)
  - fe-next/translations/sv.js (wordTower.tier.* keys)
  - fe-next/translations/ja.js (wordTower.tier.* keys)
next_steps:
  - Add es.js wordTower.tier keys (file cap blocked tonight; t() falls back to English)
  - Add tier to WordTowerShareCard SVG (server-side OG image)
signal: polish:try:word-tower:3a968d6c (founder voted YES 2026-06-09)
