'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { Trophy, Star, Play, Check } from 'lucide-react';
import type { PlayerArchetype } from '@/utils/playerArchetypes';
import type { Player } from '@/components/results/types';

// Dynamic imports for heavy components
const ResultsWinnerBanner = dynamic(() => import('@/components/results/ResultsWinnerBanner'), { ssr: false });
const Top3Leaderboard = dynamic(() => import('@/components/results/Top3Leaderboard'), { ssr: false });
const ScoreRevealAnimation = dynamic(() => import('@/components/results/ScoreRevealAnimation'), { ssr: false });
const PlayersReadyIndicator = dynamic(() => import('@/components/results/PlayersReadyIndicator'), { ssr: false });
const NearMissCard = dynamic(() => import('@/components/results/NearMissCard'), { ssr: false });
const CompactResultsStats = dynamic(() => import('@/components/results/CompactResultsStats'), { ssr: false });
// Mobile compact components
const MobileCompactStats = dynamic(() => import('@/components/results/MobileCompactStats'), { ssr: false });
const MobileCompactLeaderboard = dynamic(() => import('@/components/results/MobileCompactLeaderboard'), { ssr: false });
import BrainPointsDisplay from '@/components/results/BrainPointsDisplay';
import NextStepPrompt from '@/components/results/NextStepPrompt';
import ComparativeInsights from '@/components/results/ComparativeInsights';
import CrazyGamesBanner from '@/components/CrazyGamesBanner';
import { AdPlaceholder } from '@/components/ads';
import { GameModeSelector, type GameModeOption } from '@/components/GameModeSelector';
import ShareButton from '@/components/results/ShareButton';
import type { ShareParams } from '@/shared/utils/shareResultGenerator';
import type { SeriesStanding } from '@/hooks/useSeriesTracker';
const SeriesStandingsBanner = dynamic(() => import('@/components/results/SeriesStandingsBanner'), { ssr: false });

// ==============================================
// TYPES
// ==============================================

interface WinStreakData {
  currentStreak: number;
  bestStreak: number;
  isNewMilestone: boolean;
  previousStreak: number;
}

interface BrainPointsReward {
  scoreDelta: number;
  newScore: number;
}

// Import NearMiss type from NearMissCard
import type { NearMiss } from '@/components/results/NearMissCard';

/** Translation function type */
type TFunction = (key: string, params?: Record<string, string | number>) => string;

export interface ResultsMainContentProps {
  /** Banner player to display (current user or winner) */
  bannerPlayer: Player | null;
  /** Whether current user is shown in banner */
  isCurrentUserInBanner: boolean;
  /** Banner player's rank */
  bannerRank: number;
  /** Sorted scores array */
  sortedScores: Player[];
  /** Near-miss notifications */
  nearMisses: NearMiss[];
  /** Whether current user is host */
  isHost: boolean;
  /** Handler for starting a new game (host only) */
  onStartGame: () => void;
  /** Handler for marking ready */
  onMarkReady: () => void;
  /** Handler for exiting room */
  onExit: () => void;
  /** Win streak data */
  winStreakData: WinStreakData | null;
  /** Whether user is authenticated */
  isAuthenticated: boolean;
  /** Current player's data */
  currentPlayerData: Player | null;
  /** Whether current user won */
  isCurrentUserWinner: boolean;
  /** Current player's valid words */
  currentPlayerValidWords: Array<{ word: string; score: number }>;
  /** Current player's archetype */
  currentPlayerArchetype: PlayerArchetype | null;
  /** Current player's rank */
  currentPlayerRank: number;
  /** Brain points reward data */
  brainPointsReward: BrainPointsReward | null;
  /** Whether score reveal animation is complete */
  scoreRevealComplete: boolean;
  /** Setter for score reveal complete state */
  setScoreRevealComplete: (complete: boolean) => void;
  /** Username normalization function */
  normalizeUsername: (name: string | undefined | null) => string;
  /** Current username */
  username: string | undefined;
  /** Game code (multiplayer) */
  gameCode?: string;
  /** Return to room handler */
  onReturnToRoom?: () => void;
  /** Whether this is a bots-only game */
  isBotsOnlyGame: boolean;
  /** Whether current player is ready */
  isCurrentPlayerReady: boolean;
  /** List of ready usernames */
  readyUsernames: string[];
  /** Whether duplicate rule is disabled */
  duplicateRuleDisabled: boolean;
  /** Handler to switch to details tab (mobile) */
  onShowDetails?: () => void;
  /** Translation function */
  t: TFunction;
  /** Show CrazyGames banner */
  showBanner?: boolean;
  /** Banner size for CrazyGames */
  bannerSize?: '320x50' | '300x250';
  /** Use compact mobile layout */
  isMobile?: boolean;
  /** All player words for comparative insights */
  allPlayerWords?: Record<string, Array<{ word: string; score: number }>>;
  /** Selected game mode for next game (host only) */
  selectedGameMode?: GameModeOption;
  /** Callback to change game mode (host only) */
  onSelectGameMode?: (mode: GameModeOption) => void;
  /** Series standings for accumulated scores across multiple games */
  seriesStandings?: SeriesStanding[];
  /** Current series round number */
  seriesRoundNumber?: number;
}

// ==============================================
// COMPONENT
// ==============================================

/**
 * ResultsMainContent - Reusable main results view content
 *
 * Contains winner banner, stats, leaderboard, and action buttons.
 * Used across mobile, desktop, and landscape layouts.
 */
export const ResultsMainContent: React.FC<ResultsMainContentProps> = ({
  bannerPlayer,
  isCurrentUserInBanner,
  bannerRank,
  sortedScores,
  nearMisses,
  isHost,
  onStartGame,
  onMarkReady,
  onExit,
  currentPlayerData,
  currentPlayerValidWords,
  currentPlayerArchetype,
  currentPlayerRank,
  brainPointsReward,
  scoreRevealComplete,
  setScoreRevealComplete,
  normalizeUsername,
  username,
  gameCode,
  onReturnToRoom,
  isBotsOnlyGame,
  isCurrentPlayerReady,
  readyUsernames,
  duplicateRuleDisabled,
  onShowDetails,
  t,
  showBanner = true,
  bannerSize = '320x50',
  isMobile = false,
  allPlayerWords,
  selectedGameMode,
  onSelectGameMode,
  seriesStandings,
  seriesRoundNumber,
}) => {
  // Derived state
  const hasZeroScore = currentPlayerData?.score === 0 || currentPlayerValidWords.length === 0;

  // Calculate accuracy for stats
  const accuracy = (() => {
    const total = currentPlayerData?.allWords?.length || 0;
    const valid = currentPlayerValidWords.length;
    return total > 0 ? Math.round((valid / total) * 100) : 0;
  })();

  return (
    <div className="space-y-3">
      {/* Compact Celebration Banner */}
      {bannerPlayer && (
        <ResultsWinnerBanner
          winner={bannerPlayer}
          isCurrentUserWinner={isCurrentUserInBanner}
          rank={bannerRank}
          totalPlayers={sortedScores.length}
          compact={isMobile}
        />
      )}

      {/* Top 3 Leaderboard / Podium - prominent placement */}
      {sortedScores.length > 1 && (
        scoreRevealComplete ? (
          isMobile ? (
            <MobileCompactLeaderboard
              participants={sortedScores.map(p => ({
                name: p.username,
                score: p.score,
                isCurrentPlayer: normalizeUsername(p.username) === normalizeUsername(username),
              }))}
            />
          ) : (
            <Top3Leaderboard players={sortedScores} currentUsername={username} compact />
          )
        ) : (
          <ScoreRevealAnimation
            players={sortedScores.map(p => ({
              username: p.username,
              finalScore: p.score,
              avatar: p.avatar,
              isCurrentPlayer: normalizeUsername(p.username) === normalizeUsername(username),
            }))}
            currentUsername={username}
            duration={2500}
            onComplete={() => setScoreRevealComplete(true)}
          />
        )
      )}

      {/* Primary CTA - Play Again / Ready / Next Step (above the fold) */}
      {gameCode && onReturnToRoom && (
        isBotsOnlyGame ? (
          <NextStepPrompt
            currentMode="multiplayer-bots"
            onBackToLobby={onExit}
            variant="mobile"
            className="mt-2"
          />
        ) : (
          <>
            <div className="mt-2">
              {isHost ? (
                <div className="space-y-2">
                  {/* Game Mode Selector - host can override before starting */}
                  {selectedGameMode !== undefined && onSelectGameMode && (
                    <div className="bg-neo-navy-light/50 border-2 border-neo-white/10 rounded-neo p-2">
                      <p className="text-[9px] font-black uppercase text-neo-cream/50 tracking-widest mb-1.5">
                        {t('gameModes.nextMode')}
                      </p>
                      <GameModeSelector
                        selectedMode={selectedGameMode}
                        onSelectMode={onSelectGameMode}
                        t={t}
                        showRandom
                        compact
                      />
                    </div>
                  )}
                  <motion.button
                    onClick={onStartGame}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full bg-emerald-500 text-white font-black text-lg px-6 py-4 uppercase border-4 border-neo-black rounded-neo shadow-hard-lg flex items-center justify-center gap-2"
                  >
                    <Play className="w-6 h-6" />
                    {t('results.playAgain')}
                  </motion.button>
                </div>
              ) : isCurrentPlayerReady ? (
                <div className="bg-emerald-500 text-white border-3 border-neo-black rounded-neo p-3 shadow-hard">
                  <div className="flex items-center justify-center gap-2">
                    <Check className="w-5 h-5" />
                    <span className="font-black uppercase">{t('results.youAreReady')}</span>
                  </div>
                  <p className="text-center text-sm text-white/80 mt-1">
                    {t('results.waitingForHostToStart')}
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <motion.button
                    onClick={onMarkReady}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full bg-neo-lime text-neo-black font-black text-lg px-6 py-4 uppercase border-4 border-neo-black rounded-neo shadow-hard-lg flex items-center justify-center gap-2"
                  >
                    <Star className="w-6 h-6" />
                    {t('results.imReady')}
                  </motion.button>
                  <p className="text-center text-xs text-neo-cream/60">
                    {t('results.readyExplanation')}
                  </p>
                </div>
              )}
            </div>

            {/* Share Button */}
            {currentPlayerData && !hasZeroScore && (currentPlayerData.score || 0) >= 10 && (
              <ShareButton
                params={{
                  gameMode: 'multiplayer',
                  score: currentPlayerData.score || 0,
                  wordsFound: currentPlayerValidWords.length,
                  longestWord: currentPlayerValidWords.length > 0
                    ? currentPlayerValidWords.reduce((a, b) => a.word.length >= b.word.length ? a : b).word
                    : undefined,
                  won: currentPlayerRank === 1,
                  opponentScore: sortedScores.length > 1
                    ? sortedScores.find(p => normalizeUsername(p.username) !== normalizeUsername(username))?.score
                    : undefined,
                } satisfies ShareParams}
                t={t}
                className="w-full"
              />
            )}
          </>
        )
      )}

      {/* Players Ready Status - Compact */}
      {gameCode && sortedScores.length > 1 && (
        <PlayersReadyIndicator
          players={sortedScores
            .map(p => ({ username: p.username, avatar: p.avatar, isBot: (p as any).isBot, isHost: (p as any).isHost }))}
          readyUsernames={readyUsernames}
          currentUsername={username}
          isHost={isHost}
        />
      )}

      {/* Series Standings - Accumulated scores across multiple games */}
      {seriesStandings && seriesRoundNumber && seriesRoundNumber >= 2 && (
        <SeriesStandingsBanner
          standings={seriesStandings}
          roundNumber={seriesRoundNumber}
          currentUsername={username}
          t={t}
        />
      )}

      {/* Comparative Insights */}
      {allPlayerWords && username && sortedScores.length > 1 && (
        <ComparativeInsights
          allPlayerWords={allPlayerWords}
          currentUsername={username}
          t={t}
        />
      )}

      {/* Near-Miss Notifications - Motivate "one more game" */}
      {nearMisses.length > 0 && (
        <NearMissCard
          nearMisses={nearMisses}
          t={t}
          onPlayAgain={isHost ? onStartGame : onMarkReady}
          compact
        />
      )}

      {/* Compact Stats Row */}
      {currentPlayerData && currentPlayerRank > 0 && (
        isMobile ? (
          <MobileCompactStats
            wordCount={currentPlayerValidWords.length}
            accuracy={accuracy}
            totalWords={currentPlayerData?.allWords?.length || 0}
            archetype={currentPlayerArchetype}
            achievements={currentPlayerData?.achievements}
          />
        ) : (
          <CompactResultsStats
            wordCount={currentPlayerValidWords.length}
            accuracy={accuracy}
            totalWords={currentPlayerData?.allWords?.length || 0}
            archetype={currentPlayerArchetype}
            achievements={currentPlayerData?.achievements}
          />
        )
      )}

      {/* Brain Points Feedback */}
      <BrainPointsDisplay reward={brainPointsReward} variant="compact" />

      {/* Large Room Notice - Compact */}
      {duplicateRuleDisabled && (
        <div className="bg-neo-cyan/20 border-2 border-neo-cyan rounded-neo p-2 text-center">
          <span className="text-xs text-neo-cyan font-bold">
            👥 {t('results.largeRoomMode')} - {t('results.duplicateRuleDisabled')}
          </span>
        </div>
      )}

      {/* Ad: Post-game AdSense (primary) + CrazyGames (fallback) */}
      <div className="flex flex-col items-center gap-2 py-2">
        <AdPlaceholder zone="post-game" />
        {showBanner && <CrazyGamesBanner size={bannerSize} />}
      </div>
    </div>
  );
};

export default ResultsMainContent;
