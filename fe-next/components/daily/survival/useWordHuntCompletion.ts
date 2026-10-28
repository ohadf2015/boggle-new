'use client';

import { useCallback, type MutableRefObject } from 'react';
import { saveWordHuntResult, type WordHuntResult, type StoredWordHuntResult } from '@/utils/dailyChallenge';
import { trackDailyPuzzle, trackGrowthEvent } from '@/utils/growthTracking';
import { buildDailyWordHuntCompletePayload, type WordHuntRescueMethod } from '../analytics/wordHuntCompletePayload';
import { levelUpFromRecordGame, publishLevelUp } from '@/lib/avatar/revealTrigger';
import type { Language } from '@/types';
import type { SurvivalGameResult } from './types';

type TFn = (key: string, fallbackOrParams?: string | Record<string, string | number>) => string;

export interface WordHuntCompletionDeps {
  isPractice: boolean;
  isCatchup: boolean;
  puzzleNumber: number;
  puzzleDate: string;
  gameLanguage: Language;
  meaning: string | null;
  extraTries: number;
  isAuthenticated: boolean;
  gameStartedAtRef: MutableRefObject<number>;
  recordStreak: () => void;
  showInterstitial: (placement: string) => Promise<unknown>;
  setGameResult: (r: SurvivalGameResult) => void;
  setStoredResult: (r: StoredWordHuntResult) => void;
  onShowResults: () => void;
  t: TFn;
}

function recordQuestProgress(result: SurvivalGameResult, t: TFn) {
  fetch('/api/stats/record-game', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      score: result.efficiencyScore ?? 0,
      wordCount: result.wordsDiscovered?.length ?? 0,
      longWordsFound: result.wordsDiscovered?.filter(w => (w.word?.length ?? 0) >= 6).length ?? 0,
      mode: 'daily-challenge',
      isDailyChallenge: true,
    }),
  })
    .then(r => r.json())
    .then(data => {
      publishLevelUp(levelUpFromRecordGame(data));
      if (data.questUpdate?.completed) {
        import('@/components/quests/QuestCompletionToast').then(({ showQuestCompletionToast }) => {
          showQuestCompletionToast({
            questName: t(data.questUpdate.description),
            xpReward: data.questUpdate.xpReward,
            dedupKey: `weekly:${data.questUpdate.questType ?? data.questUpdate.description}`,
            t,
          });
        });
      }
    })
    .catch(() => { /* non-critical */ });
}

/** Persists, tracks and routes a finished Word Hunt run to the results screen. */
export function useWordHuntCompletion(d: WordHuntCompletionDeps) {
  const {
    isPractice, isCatchup, puzzleNumber, puzzleDate, gameLanguage, meaning, extraTries, isAuthenticated,
    gameStartedAtRef, recordStreak, showInterstitial, setGameResult, setStoredResult, onShowResults, t,
  } = d;

  return useCallback((result: SurvivalGameResult, rescueMethod?: WordHuntRescueMethod) => {
    const completedAt = new Date().toISOString();
    const wordHuntResult: WordHuntResult = {
      puzzleNumber,
      puzzleDate,
      language: gameLanguage,
      isCatchup,
      solved: result.solved,
      attemptsUsed: result.attemptsUsed,
      targetWord: result.targetWord,
      meaning: meaning ?? null,
      attempts: result.attempts,
      wordsDiscovered: result.wordsDiscovered,
      lifeRemaining: result.lifeRemaining,
      clueTokensEarned: result.clueTokensEarned,
      clueTokensSpent: result.clueTokensSpent,
      hintsUnlocked: result.hintsUnlocked,
      efficiencyScore: result.efficiencyScore,
      extraTries,
      streakDays: 0,
      completedAt,
    };
    setGameResult(result);

    // Practice keeps nothing (no streak, leaderboard or analytics) but still shows its results.
    if (isPractice) {
      setStoredResult({ date: puzzleDate, puzzleNumber, result: wordHuntResult, completedAt });
      onShowResults();
      return;
    }

    wordHuntResult.streakDays = saveWordHuntResult(wordHuntResult, isAuthenticated).currentStreak;
    recordStreak();
    trackDailyPuzzle('completed', 'word_hunt', { solved: result.solved, attempts: result.attemptsUsed });
    trackGrowthEvent('daily_challenge_completed', {
      puzzleNumber,
      language: gameLanguage,
      isCatchup,
      solved: result.solved,
      attemptsUsed: result.attemptsUsed,
    });
    trackGrowthEvent('daily_word_hunt_complete', {
      ...buildDailyWordHuntCompletePayload({
        result,
        puzzleNumber,
        language: gameLanguage,
        startedAt: gameStartedAtRef.current,
        completedAt: Date.now(),
        rescueMethod: rescueMethod ?? null,
      }),
    });

    setStoredResult({ date: puzzleDate, puzzleNumber, result: wordHuntResult, completedAt });
    // Ad sits between the game and the results; catch-up days already paid with a rewarded ad.
    const adGate = isCatchup ? Promise.resolve() : showInterstitial(`word-hunt-complete-${extraTries}`);
    adGate.catch(() => {}).finally(onShowResults);

    if (isAuthenticated && result.solved) recordQuestProgress(result, t);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- t is stable from LanguageContext
  }, [puzzleNumber, puzzleDate, gameLanguage, meaning, isAuthenticated, recordStreak, isPractice, isCatchup, showInterstitial, extraTries]);
}
