status: shipped
attempted: Live word-count audit on lexiclash.live, identify thin informational pages, fix sr-only hidden content on /guides informational page
files_touched:
  - fe-next/app/[locale]/guides/page.tsx
  - fe-next/app/[locale]/guides/PageClient.tsx
next_steps: |
  - Re-audit word count on /en/guides after deploy (FAQ moves from sr-only to visible)
  - Check sub-guide pages (/guides/classic-strategy, /guides/blast-strategy, /guides/word-hunt-strategy) for thinness
  - /en/leaderboard at 606w - check if informational or game-page before acting
  - Add internal links from blog/education pages to /guides for discoverability
