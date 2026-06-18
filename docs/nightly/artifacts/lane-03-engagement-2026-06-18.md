status: research-only
attempted: Wire exp-game-abandon-confirm-v1 in DailyChallengeGame.tsx + exp-practice-wheel-cta-v1 in PracticeWheelSandbox.tsx; ensure PostHog flags; sweep flag hygiene.
files_touched: none
next_steps: |
  1. exp-game-abandon-confirm-v1 (daily wire):
     - Add daily.quitConfirmMessageWithStats to all 5 translation files (en/he/sv/ja/es)
     - Import + call useQuitConfirmDescription({open:showQuitConfirm, baseMessage:t('daily.quitConfirm'), statsTemplate:t('daily.quitConfirmMessageWithStats'), score, wordCount:wordSubmission.validWordCount}) in DailyChallengeGame.tsx
     - Replace static description={t('daily.quitConfirm')} with description={quitConfirmDescription}
     - Run: scripts/nightly/lib/posthog-experiment.sh ensure exp-game-abandon-confirm-v1 control stats-shown "Quit-confirm with score+words context"
  2. exp-practice-wheel-cta-v1 (unwired):
     - Add gameEnded state to PracticeWheelSandbox.tsx
     - handleComplete: retry-cta variant sets gameEnded=true instead of router.push; control keeps redirect
     - Show "Try Again" overlay (common.playAgain key exists) when gameEnded && !isComplete && variant=retry-cta
     - Reset: setPuzzle(makePracticeWheel(language)) + setFoundCount(0) + setGameEnded(false)
     - Run: scripts/nightly/lib/posthog-experiment.sh ensure exp-practice-wheel-cta-v1 control retry-cta "WheelRush practice retry CTA"
  3. Add game_abandon_confirmed event to DailyChallengeGame handleConfirmQuit (missing from growthTracking events union)
