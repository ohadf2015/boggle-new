status: shipped
attempted: live word-count audit of informational pages on prod, then pick <=2 highest-leverage thinness/crawl fixes (no game pages, no bloat)
files_touched: fe-next/app/[locale]/tools/word-solver/page.tsx (added GuidesCalloutLink internal link, zero new prose)
next_steps: no thin (<300w) informational page found tonight; GSC's one dead-page candidate (/en/words/starting-with/f) already noindexed site-wide since 2026-08-09. Next run: check /en/leaderboard (437w) more carefully — it's bucketed with banned /daily-/multiplayer pattern tonight so was skipped, worth a deliberate human call on whether it counts as game or informational for this lane's rules. Dead DEAD_LETTERS set at words/starting-with/[letter]/page.tsx:26 is unused code, low-priority cleanup for lane 1/7.
