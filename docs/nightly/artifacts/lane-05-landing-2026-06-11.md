status: shipped
attempted: Shiritori Ghost Turn polish (polish:try:shiritori:8053e35e from 2026-06-09 feedback)
files_touched:
  - fe-next/lib/shiritori/sp/useShiritoriGhostMultiplier.ts (new hook)
  - fe-next/lib/shiritori/sp/__tests__/useShiritoriGhostMultiplier.test.ts (TDD tests)
  - fe-next/app/[locale]/shiritori/solo/page.tsx (wired ghost multiplier + score display)
  - fe-next/translations/en.js + he.js + sv.js + ja.js + es.js (ghost keys x5)
mechanic: every 6th player turn (mod 6 === 5), hidden x2 multiplier fires on valid submission;
          GhostReveal toast + sparkle-gold burst reveal the bonus post-submit
next_steps: none — feature complete for admin playtest
