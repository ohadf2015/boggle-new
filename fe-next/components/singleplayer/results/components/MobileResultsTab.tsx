'use client';

import React from 'react';
import { ArrowLeft } from 'lucide-react';
import ResultsWinnerBanner from '@/components/results/ResultsWinnerBanner';
import MobileCompactStats from '@/components/results/MobileCompactStats';
import MobileCompactRewards from '@/components/results/MobileCompactRewards';
import MobileCompactLeaderboard from '@/components/results/MobileCompactLeaderboard';
import NextStepPrompt, { type NextStepMode } from '@/components/results/NextStepPrompt';
import ChallengeButton from './ChallengeButton';
import type { SinglePlayerMode } from '../../SinglePlayerView';
import type { LetterGrid, Language } from '@/shared/types/game';
import type { WinStreakDisplayData } from '../hooks/useWinStreakTracking';
import type { Participant } from '../useResultsData';
import type { CoinReward } from '@/components/results/CoinRewardDisplay';

interface MobileResultsTabProps {
  results: {
    playerScore: number;
    playerWords: string[];
    botScores: { name: string; score: number }[];
    achievements?: { key: string; icon: string }[];
    grid: LetterGrid;
    gameDuration: number;
    language?: Language;
  };
  mode: SinglePlayerMode;
  nextStepMode: NextStepMode;
  playerRank: number;
  validWordCount: number;
  accuracy: number;
  totalWords?: number;
  isWinner: boolean;
  isAuthenticated: boolean;
  coinReward: CoinReward | null;
  globalRank: number | null;
  winStreakData: WinStreakDisplayData | null;
  allParticipants: Participant[];
  bannerConfig: {
    variant: 'completion' | 'ranking' | 'newRecord' | 'highScore';
    message: string | undefined;
    announcement: string | undefined;
  };
  shouldShowConfetti: boolean;
  onBackToLobby: () => void;
  t: (key: string) => string | undefined;
}

export function MobileResultsTab({
  results,
  mode,
  nextStepMode,
  playerRank,
  validWordCount,
  accuracy,
  totalWords,
  isWinner,
  isAuthenticated,
  coinReward,
  globalRank,
  winStreakData,
  allParticipants,
  bannerConfig,
  shouldShowConfetti,
  onBackToLobby,
  t,
}: MobileResultsTabProps): React.ReactElement {
  const leaderboardParticipants = React.useMemo(
    () => allParticipants.map(p => ({
      name: p.name,
      score: p.score,
      isCurrentPlayer: p.isPlayer,
      isBot: !p.isPlayer,
    })),
    [allParticipants],
  );

  return (
    <div className="space-y-3">
      {/* Top back button - visible immediately without scrolling */}
      <button
        onClick={onBackToLobby}
        className="flex items-center gap-2 px-3 py-2 text-sm font-bold text-white hover:text-white border border-white/30 hover:border-white/50 rounded-neo transition-colors"
      >
        <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
        {t('nextStep.backToLobby')}
      </button>

      {/* ABOVE FOLD - Score celebration + Play Again */}
      <div className="relative">
        <ResultsWinnerBanner
          winner={{ username: t('common.you'), score: results.playerScore }}
          isCurrentUserWinner={true}
          rank={mode === 'solo-bots' ? playerRank : 1}
          variant={bannerConfig.variant}
          customMessage={bannerConfig.message}
          customAnnouncement={bannerConfig.announcement}
          showConfetti={shouldShowConfetti}
          compact={true}
        />
      </div>

      {/* Compact stats row (words + accuracy only) */}
      <MobileCompactStats
        wordCount={validWordCount}
        accuracy={accuracy}
        totalWords={totalWords}
      />

      {/* Play Again - Primary CTA */}
      <NextStepPrompt currentMode={nextStepMode} onBackToLobby={onBackToLobby} variant="mobile" />

      {/* BELOW FOLD - Compacted secondary info */}

      {/* Compact rewards row */}
      {mode !== 'practice' && (
        <MobileCompactRewards
          winStreak={winStreakData?.currentStreak || 0}
          coins={coinReward?.awarded || 0}
          isAuthenticated={isAuthenticated}
        />
      )}

      {/* Compact leaderboard */}
      {mode === 'solo-bots' && results.botScores.length > 0 && (
        <MobileCompactLeaderboard
          participants={leaderboardParticipants}
        />
      )}

      {/* Global rank - text only */}
      {globalRank && (
        <div className="text-center text-sm text-white">
          <span className="font-bold">#{globalRank}</span> {t('leaderboard.globalRank')}
        </div>
      )}

      {/* Challenge a Friend */}
      {results.grid && (
        <ChallengeButton
          grid={results.grid}
          score={results.playerScore}
          words={results.playerWords}
          gameLanguage={results.language || 'en'}
          gameDuration={results.gameDuration}
          variant="compact"
          isWinner={isWinner}
        />
      )}
    </div>
  );
}
