import { calculateEfficiencyScore } from '@/utils/aiHintGenerator';
import { logGameEnd, formatWordsForLogging } from '@/utils/gameLogger';
import type { SurvivalGameResult, TargetAttempt, WordDiscovery } from './types';

export interface FinishRunInput {
  won: boolean;
  targetWord: string;
  attempts: TargetAttempt[];
  discoveredWords: WordDiscovery[];
  lifePoints: number;
  clueTokens: number;
  tokensSpent: number;
  hintLevel: number;
}

export function buildSurvivalResult(input: FinishRunInput): SurvivalGameResult {
  const { won, targetWord, attempts, discoveredWords, lifePoints, clueTokens, tokensSpent, hintLevel } = input;
  // attemptsUsed=0 fails leaderboard validation (auto-win via discoveries, or a loss before any guess).
  const attemptsUsed = Math.max(1, attempts.filter(a => !a.isDiscovery).length);
  return {
    solved: won,
    attemptsUsed,
    targetWord,
    attempts,
    wordsDiscovered: discoveredWords,
    lifeRemaining: lifePoints,
    clueTokensEarned: clueTokens + tokensSpent,
    clueTokensSpent: tokensSpent,
    hintsUnlocked: hintLevel,
    efficiencyScore: calculateEfficiencyScore(lifePoints, clueTokens, attemptsUsed, discoveredWords.length, won),
  };
}

export function logSurvivalEnd(sessionId: string, result: SurvivalGameResult, durationSeconds: number): void {
  const words = result.wordsDiscovered;
  void logGameEnd(sessionId, {
    score: result.efficiencyScore,
    wordsFound: formatWordsForLogging(
      words.map(w => w.word),
      words.map(w => ({ word: w.word, points: w.lifeGained + (w.tokensGained * 10), timestamp: w.timestamp })),
    ),
    durationSeconds,
    completed: true,
    targetFound: result.solved,
    attemptsUsed: result.attemptsUsed,
    lifeRemaining: result.lifeRemaining,
    lifeGained: words.reduce((sum, w) => sum + w.lifeGained, 0),
    tokensEarned: result.clueTokensEarned,
    tokensSpent: result.clueTokensSpent,
    cluesUsed: result.clueTokensSpent > 0 ? Math.ceil(result.clueTokensSpent / 5) : 0,
  });
}
