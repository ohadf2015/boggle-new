status: shipped
attempted: Reddit + competitor research for viral word-game concepts; surface Reddit reply candidates; draft top game-mode ideas; check admin-gated modes for polish targets
files_touched:
  - docs/nightly/ideas/2026-05-29.md (5 competitor concepts: Cross Bot, Connections Racer, Nanagrams voice, Wordrace letter-claiming, Undercover Word)
  - docs/nightly/ideas/2026-05-29-reddit.md (Reddit blocked stub + OAuth recovery path)
  - docs/nightly/reports/2026-05-29.md (lane 4 section appended)
  - docs/nightly/artifacts/lane-04-competitor-2026-05-29.md (this file)
next_steps:
  - Reddit API now requires OAuth: add REDDIT_CLIENT_ID + REDDIT_CLIENT_SECRET to reddit-fetch.sh (reddit.com/prefs/apps → script client + client_credentials grant). One-time setup, unblocks all future nights.
  - Sealed Bid mode (fe-next/app/[locale]/sealed-bid/) needs: (1) sealedBid i18n block in all 5 locales (16 keys listed in test file), (2) admin-gated LandingChallengeCards tile. Tests FAIL without these — code lane should pick up.
  - Top new idea to evaluate: Fading Grid Sprint modifier for Blast V2 (tile-decay race mechanic, never pitched, S effort)
  - Founder directive "Build sealed bid" = mode exists + admin-gated, but unplayable (missing i18n + hub tile). Needs code lane attention.
notes:
  - pullpush.io data ends 2025-05-19 (not useful for current Reddit threads)
  - NYT Crossplay's Cross Bot (post-game best-move analysis) is highest-signal competitor mechanic this week — S effort adaptation possible using existing LexiClash solver
