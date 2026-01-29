'use client';

import React from 'react';
import { ArrowLeft } from 'lucide-react';
import ResultsWinnerBanner from '@/components/results/ResultsWinnerBanner';
import Top3Leaderboard, { type LeaderboardParticipant } from '@/components/results/Top3Leaderboard';
import CompactResultsStats from '@/components/results/CompactResultsStats';
import BonusBadgesRow from '@/components/results/BonusBadgesRow';
import RewardsSummary from '@/components/results/RewardsSummary';
import NextStepPrompt, { type NextStepMode } from '@/components/results/NextStepPrompt';
import { GlobalRankBadge } from './GlobalRankBadge';
import ChallengeButton from './ChallengeButton';
import type { SinglePlayerMode } from '../../SinglePlayerView';
import type { LetterGrid, Language } from '@/shared/types/game';
import type { WinStreakDisplayData } from '../hooks/useWinStreakTracking';
import type { PlayerArchetype } from '@/utils/playerArchetypes';
import type { Participant } from '../useResultsData';
import type { CoinReward } from '@/components/results/CoinRewardDisplay';
import type { BrainPointsReward } from '@/components/results/BrainPointsDisplay';

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
  isWinner: boolean;
  isAuthenticated: boolean;
  playerArchetype: PlayerArchetype | null;
  coinReward: CoinReward | null;
  brainPointsReward: BrainPointsReward | null;
  globalRank: number | null;
  totalComboBonus: number;
  totalFireRoundBonus: number;
  winStreakData: WinStreakDisplayData | null;
  allParticipants: Participant[];
  bannerConfig: {
    variant: 'completion' | 'ranking' | 'newRecord' | 'highScore';
    message: string | undefined;
    announcement: string | undefined;
  };
  shouldShowConfetti: boolean;
  onBackToLobby: () => void;
  onSwitchToDetails: () => void;
  t: (key: string) => string | undefined;
}

export function MobileResultsTab({
  results,
  mode,
  nextStepMode,
  playerRank,
  validWordCount,
  accuracy,
  isWinner,
  isAuthenticated,
  playerArchetype,
  coinReward,
  brainPointsReward,
  globalRank,
  totalComboBonus,
  totalFireRoundBonus,
  winStreakData,
  allParticipants,
  bannerConfig,
  shouldShowConfetti,
  onBackToLobby,
  onSwitchToDetails,
  t,
}: MobileResultsTabProps): React.ReactElement {
  return (
    <div className="space-y-3">
      {/* Top back button - visible immediately without scrolling */}
      <button
        onClick={onBackToLobby}
        className="flex items-center gap-2 px-3 py-2 text-sm font-bold text-white/80 hover:text-white border border-white/30 hover:border-white/50 rounded-neo transition-colors"
      >
        <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
        {t('nextStep.backToLobby') || 'Back to Lobby'}
      </button>

      <div className="relative">
        <ResultsWinnerBanner
          winner={{ username: t('common.you') || 'You', score: results.playerScore }}
          isCurrentUserWinner={true}
          rank={mode === 'solo-bots' ? playerRank : 1}
          variant={bannerConfig.variant}
          customMessage={bannerConfig.message}
          customAnnouncement={bannerConfig.announcement}
          showConfetti={shouldShowConfetti}
        />
      </div>

      {mode !== 'practice' && winStreakData && winStreakData.currentStreak > 0 && (
        <RewardsSummary
          coinReward={coinReward}
          isAuthenticated={isAuthenticated}
          winStreak={winStreakData}
          achievementsUnlocked={results.achievements?.length || 0}
          isWinner={isWinner}
          onAchievementsClick={onSwitchToDetails}
        />
      )}

      <CompactResultsStats
        wordCount={validWordCount}
        accuracy={accuracy}
        archetype={playerArchetype}
        coinReward={coinReward}
        coinRewardMode={isAuthenticated ? 'earned' : 'teasing'}
        brainPointsReward={brainPointsReward}
        currentScore={results.playerScore}
      />

      {globalRank && (
        <GlobalRankBadge rank={globalRank} label={t('leaderboard.globalRank') || 'Global Rank'} />
      )}

      <BonusBadgesRow comboBonus={totalComboBonus} fireRoundBonus={totalFireRoundBonus} />

      {mode === 'solo-bots' && results.botScores.length > 0 && (
        <Top3Leaderboard
          participants={allParticipants.map(p => ({
            name: p.name,
            score: p.score,
            isCurrentPlayer: p.isPlayer,
            isBot: !p.isPlayer,
            avatar: p.avatar,
          })) as LeaderboardParticipant[]}
          compact
        />
      )}

      <NextStepPrompt currentMode={nextStepMode} onBackToLobby={onBackToLobby} variant="mobile" />

      {/* Challenge a Friend - share the same board */}
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
