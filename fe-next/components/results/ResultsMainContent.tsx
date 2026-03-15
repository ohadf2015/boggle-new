'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { Star, Play, Check, Swords } from 'lucide-react';
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
const WordHuntPromoPopup = dynamic(() => import('@/components/results/WordHuntPromoPopup'), { ssr: false });
const TurningPointCard = dynamic(() => import('@/components/results/TurningPointCard'), { ssr: false });
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

/** Streak urgency countdown — shows time remaining to keep streak alive */
const StreakUrgencyDisplay: React.FC<{
  currentStreak: number;
  t: TFunction;
}> = ({ currentStreak, t }) => {
  const [hoursLeft, setHoursLeft] = React.useState(() => {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    return Math.ceil((midnight.getTime() - now.getTime()) / (1000 * 60 * 60));
  });

  React.useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      setHoursLeft(Math.ceil((midnight.getTime() - now.getTime()) / (1000 * 60 * 60)));
    }, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  if (currentStreak < 1) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="flex items-center justify-center gap-2 px-3 py-2 bg-neo-orange/15 border-2 border-neo-orange/40 rounded-neo"
    >
      <motion.span
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 3 }}
        className="text-base"
      >
        🔥
      </motion.span>
      <span className="text-xs font-bold text-neo-orange">
        {t('results.streakUrgency', { streak: currentStreak, hours: hoursLeft })}
      </span>
    </motion.div>
  );
};

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
  /** Current game mode (to show Word Hunt promo when not playing word-hunt) */
  gameMode?: string;
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
  winStreakData,
  t,
  showBanner = true,
  bannerSize = '320x50',
  isMobile = false,
  allPlayerWords,
  selectedGameMode,
  onSelectGameMode,
  seriesStandings,
  seriesRoundNumber,
  gameMode,
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
                  {/* Revenge framing when player lost — "Rematch vs @winner?" activates competitive drive */}
                  {currentPlayerRank > 1 && sortedScores.length > 1 && sortedScores[0]?.username ? (
                    <motion.button
                      onClick={onMarkReady}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full bg-neo-pink text-white font-black text-lg px-6 py-4 uppercase border-4 border-neo-black rounded-neo shadow-hard-lg flex items-center justify-center gap-2"
                    >
                      <Swords className="w-6 h-6" />
                      {t('results.revengeRematch', { player: sortedScores[0].username })}
                    </motion.button>
                  ) : (
                    <motion.button
                      onClick={onMarkReady}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full bg-neo-lime text-neo-black font-black text-lg px-6 py-4 uppercase border-4 border-neo-black rounded-neo shadow-hard-lg flex items-center justify-center gap-2"
                    >
                      <Star className="w-6 h-6" />
                      {t('results.imReady')}
                    </motion.button>
                  )}
                  <p className="text-center text-xs text-neo-cream/60">
                    {t('results.readyExplanation')}
                  </p>
                </div>
              )}
            </div>

            {/* Share Button with narrative preview */}
            {currentPlayerData && !hasZeroScore && (currentPlayerData.score || 0) >= 10 && (
              <div className="space-y-1.5">
                {/* Auto-generated narrative — gives the share context */}
                {currentPlayerValidWords.length > 0 && (
                  <p className="text-[10px] text-neo-cream/40 text-center italic px-2">
                    {currentPlayerRank === 1
                      ? t('results.shareNarrativeWin', {
                          word: currentPlayerValidWords.reduce((a, b) => a.word.length >= b.word.length ? a : b).word.toUpperCase(),
                          score: currentPlayerData.score || 0,
                        })
                      : t('results.shareNarrativeLoss', {
                          words: currentPlayerValidWords.length,
                          score: currentPlayerData.score || 0,
                        })
                    }
                  </p>
                )}
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
              </div>
            )}
          </>
        )
      )}

      {/* Streak Urgency — motivate continued play */}
      {winStreakData && winStreakData.currentStreak >= 1 && (
        <StreakUrgencyDisplay
          currentStreak={winStreakData.currentStreak}
          t={t}
        />
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

      {/* Near-Miss Notifications - Motivate "one more game" (before analysis) */}
      {nearMisses.length > 0 && (
        <NearMissCard
          nearMisses={nearMisses}
          t={t}
          onPlayAgain={isHost ? onStartGame : onMarkReady}
          compact
        />
      )}

      {/* Turning Point — the moment that decided the game */}
      {allPlayerWords && username && sortedScores.length > 1 && sortedScores.length <= 6 && (
        <TurningPointCard
          allPlayerWords={allPlayerWords as Record<string, import('./types').WordObject[]>}
          currentUsername={username}
          t={t}
        />
      )}

      {/* Comparative Insights (analysis after motivation) */}
      {allPlayerWords && username && sortedScores.length > 1 && (
        <ComparativeInsights
          allPlayerWords={allPlayerWords}
          currentUsername={username}
          t={t}
        />
      )}

      {/* Word Hunt Promo Popup - show when not already playing word-hunt */}
      {gameCode && gameMode && gameMode !== 'word-hunt' && (
        <WordHuntPromoPopup />
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
