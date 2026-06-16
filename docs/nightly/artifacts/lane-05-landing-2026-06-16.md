---
status: research-only
attempted: polish:try:word-tower:ef7f8421 — Daily Letter Budget + Reward-Ad Refill (STEP 0 signal confirmed; architecture fully mapped; timed out before code)
files_touched: none
next_steps: |
  Signal: polish:try:word-tower:ef7f8421 (2026-06-15). Spec from 2026-06-15 report line 68-72:
  "add dailyLetterBudget to word-tower seed schema; client depletes per word placed;
  exhausted state shows rewarded-ad CTA (useAdMob.showRewarded) or rival-sabotage"

  Files to edit (in order, TDD first):
  1. fe-next/lib/wordTower/wordTowerBudget.ts — NEW: DAILY_LETTER_BUDGET=120, BUDGET_REFILL=40,
     isDailyExhausted(), refillBudget(state) pure functions + tests
  2. fe-next/lib/wordTower/wordTowerManager.ts line 189 — add dailyLetterBudget:number to
     WordTowerPlayerState; line 243 initWordTowerState add it; line 310 applyTowerWord deplete
     by word.length; lines 510/533 serialize/restore it
  3. fe-next/components/wordTower/WordTowerBudgetOverlay.tsx — NEW: shows when dailyLetterBudget<=0
     (daily only), "Watch ad +40 letters" CTA, calls showRewarded from useAdMob
  4. fe-next/components/wordTower/WordTowerPlay.tsx — import overlay, pass budget state, wire onReward
     callback to call refillBudget() and update game state
  5. 5 locale translation files — keys: word_tower.budget_exhausted, word_tower.budget_refill_cta,
     word_tower.budget_refilled (en/he/sv/ja/es)

  Also queued (next nights):
  - polish:try:sealed-bid:3296a8e1 — Pre-Reveal Double-Down Raise (5s raise window after bids lock)
  - idea:build:12d0f66c — Shortest Path Daily word-ladder mode (S effort)
---
