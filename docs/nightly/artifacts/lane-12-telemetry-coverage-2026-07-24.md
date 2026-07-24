status: research-only
attempted: PostHog coverage audit — classified DEAD/CRATERED events, identified mode completion holes
files_touched: none
next_steps: |
  Fix connections mode game_completed hole: ConnectionsGame.tsx:141 change
  `trackGameEnd('connections', totalScore, level, status === 'correct', ...)`
  to `trackGameEnd('connections', totalScore, level, true, ...)` to match
  survival/blast/word-wheel pattern. TDD first.
  Also verify profile_viewed (PageClient.tsx:30) and guest_conversion
  (MultiplayerSignupSheet.tsx:53) — both have call sites but DEAD in classifier.
