/**
 * Hook for computing banner configuration based on game results
 */

import type { SinglePlayerMode } from '../../SinglePlayerView';

interface UseBannerConfigParams {
  playerScore: number;
  validWordCount: number;
  mode: SinglePlayerMode;
  isNewHighScore?: boolean;
  isNewAllTimeBest?: boolean;
  isWinner: boolean;
  playerRank: number;
  totalParticipants: number;
  t: (key: string) => string | undefined;
  totalBoardWords?: number;
}

interface BannerConfig {
  variant: 'completion' | 'ranking' | 'newRecord' | 'highScore';
  message: string | undefined;
  announcement: string | undefined;
}

export function useBannerConfig({
  playerScore,
  validWordCount,
  mode,
  isNewHighScore,
  isNewAllTimeBest,
  isWinner,
  playerRank,
  totalParticipants,
  t,
  totalBoardWords,
}: UseBannerConfigParams): BannerConfig {
  function getVariant(): BannerConfig['variant'] {
    if (playerScore === 0 || validWordCount === 0) return 'completion';
    if (mode === 'practice') return 'completion';
    if (mode === 'challenge' && isNewHighScore) {
      return isNewAllTimeBest ? 'newRecord' : 'highScore';
    }
    if (mode === 'challenge') return 'completion';
    return 'ranking';
  }

  function getMessage(): string | undefined {
    if (playerScore === 0 || validWordCount === 0) {
      return t('singlePlayer.tryAgain') || 'Try Again!';
    }
    if (validWordCount <= 2) {
      return t('singlePlayer.keepPracticing') || 'Keep Practicing!';
    }
    if (mode === 'solo-bots' && isWinner && playerScore > 0) {
      return t('singlePlayer.victory') || 'Victory!';
    }
    if (mode === 'solo-bots' && playerRank <= 3 && playerScore > 0) {
      return undefined;
    }
    if (mode === 'solo-bots') {
      return t('singlePlayer.gameOver') || 'Game Over';
    }
    if (mode === 'practice') {
      return t('singlePlayer.practiceComplete') || 'Practice Complete!';
    }
    return undefined;
  }

  function getAnnouncement(): string | undefined {
    if (playerScore === 0 || validWordCount === 0) {
      return t('singlePlayer.noWordsFound') || "Didn't find any words this time";
    }
    if (validWordCount <= 2) {
      return validWordCount === 1
        ? t('singlePlayer.fewWordsFoundSingular') || 'Found 1 word'
        : (t('singlePlayer.fewWordsFound') || 'Found {count} words').replace('{count}', String(validWordCount));
    }
    if (mode === 'solo-bots') {
      if (totalBoardWords && totalBoardWords > validWordCount) {
        const missed = totalBoardWords - validWordCount;
        return (t('singlePlayer.progressAnnouncement') || 'Found {found} words — {missed} more were hiding!')
          .replace('{found}', String(validWordCount))
          .replace('{missed}', String(missed));
      }
      return `#${playerRank} ${t('results.of') || 'of'} ${totalParticipants}`;
    }
    return undefined;
  }

  return {
    variant: getVariant(),
    message: getMessage(),
    announcement: getAnnouncement(),
  };
}
