'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { motion, useReducedMotion } from 'framer-motion';
import { useEntranceChoreography } from '@/hooks/useEntranceChoreography';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Player } from '@/components/results/types';

// Dynamic imports for heavy components
const PlacementHero = dynamic(() => import('@/components/results/PlacementHero'), { ssr: false });
const FightCardLeaderboard = dynamic(() => import('@/components/results/FightCardLeaderboard'), { ssr: false });
const ScoreRevealAnimation = dynamic(() => import('@/components/results/ScoreRevealAnimation'), { ssr: false });
const NearMissCard = dynamic(() => import('@/components/results/NearMissCard'), { ssr: false });
const WordMarqueeTicker = dynamic(() => import('@/components/results/WordMarqueeTicker'), { ssr: false });
const SeriesStandingsBanner = dynamic(() => import('@/components/results/SeriesStandingsBanner'), { ssr: false });

import WordHuntAnnouncementBanner from '@/components/results/WordHuntAnnouncementBanner';
import CrazyGamesBanner from '@/components/CrazyGamesBanner';
import { AdPlaceholder } from '@/components/ads';
import type { GameModeOption } from '@/components/GameModeSelector';
import type { NearMiss } from '@/components/results/NearMissCard';
import type { SeriesStanding } from '@/hooks/useSeriesTracker';

import { ResultsRevengeSection } from '@/components/results/ResultsRevengeSection';
import { ResultsCtaSection } from '@/components/results/ResultsCtaSection';
import { ResultsWordsSection } from '@/components/results/ResultsWordsSection';

// ==============================================
// TYPES
// ==============================================

interface WinStreakData {
  currentStreak: number;
  bestStreak: number;
  isNewMilestone: boolean;
  previousStreak: number;
}

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
    }, 60000);
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
  sortedScores: Player[];
  nearMisses: NearMiss[];
  isHost: boolean;
  onStartGame: () => void;
  onMarkReady: () => void;
  onExit: () => void;
  winStreakData: WinStreakData | null;
  isAuthenticated: boolean;
  currentPlayerData: Player | null;
  isCurrentUserWinner: boolean;
  currentPlayerValidWords: Array<{ word: string; score: number }>;
  /** @deprecated Kept for compatibility — no longer rendered in main content */
  currentPlayerArchetype: import('@/utils/playerArchetypes').PlayerArchetype | null;
  currentPlayerRank: number;
  scoreRevealComplete: boolean;
  setScoreRevealComplete: (complete: boolean) => void;
  normalizeUsername: (name: string | undefined | null) => string;
  username: string | undefined;
  gameCode?: string;
  onReturnToRoom?: () => void;
  isBotsOnlyGame: boolean;
  isCurrentPlayerReady: boolean;
  readyUsernames: string[];
  duplicateRuleDisabled: boolean;
  onShowDetails?: () => void;
  t: TFunction;
  showBanner?: boolean;
  bannerSize?: '320x50' | '300x250';
  isMobile?: boolean;
  allPlayerWords?: Record<string, Array<{ word: string; score: number }>>;
  selectedGameMode?: GameModeOption;
  onSelectGameMode?: (mode: GameModeOption) => void;
  seriesStandings?: SeriesStanding[];
  seriesRoundNumber?: number;
  gameMode?: string;
  emojiReactions?: Array<{ id: string; emoji: string; username: string; timestamp: number }>;
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
  sortedScores,
  nearMisses,
  isHost,
  onStartGame,
  onMarkReady,
  onExit,
  currentPlayerData,
  currentPlayerValidWords,
  currentPlayerRank,
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
  winStreakData,
  t,
  showBanner = true,
  bannerSize = '320x50',
  allPlayerWords: _allPlayerWords,
  selectedGameMode,
  onSelectGameMode,
  seriesStandings,
  seriesRoundNumber,
  gameMode,
  emojiReactions,
}) => {
  // Derived state
  const hasZeroScore = currentPlayerData?.score === 0 || currentPlayerValidWords.length === 0;

  // Calculate gap to winner for PlacementHero
  const winnerScore = sortedScores[0]?.score ?? 0;
  const gapToWinner = currentPlayerRank > 1 ? winnerScore - (currentPlayerData?.score ?? 0) : 0;

  const reducedMotion = useReducedMotion();
  const { dir } = useLanguage();
  const shadowX = dir === 'rtl' ? '-6px' : '6px';
  const shadowXLg = dir === 'rtl' ? '-8px' : '8px';
  const breathingShadow = [
    `${shadowX} 6px 0px black`,
    `${shadowXLg} 8px 0px black`,
    `${shadowX} 6px 0px black`,
  ];
  const { isVisible, getDelay } = useEntranceChoreography(
    ['hero', 'leaderboard', 'revenge', 'cta', 'stats', 'words'],
    { baseDelay: 300, stagger: 200 }
  );

  return (
    <div className="space-y-3">
      {/* Placement Hero — big, clear rank + score for the current player */}
      {sortedScores.length > 1 && scoreRevealComplete && currentPlayerData && (
        <PlacementHero
          rank={currentPlayerRank}
          score={currentPlayerData.score}
          totalPlayers={sortedScores.length}
          username={currentPlayerData.username}
          avatar={currentPlayerData.avatar}
          gapToWinner={gapToWinner}
        />
      )}

      {/* Fight Card Leaderboard — ranked list (fight card style) */}
      {sortedScores.length > 1 && (
        scoreRevealComplete ? (
          <motion.div
            initial={reducedMotion ? undefined : { opacity: 0, y: 12 }}
            animate={isVisible('leaderboard') ? { opacity: 1, y: 0 } : undefined}
            transition={{ type: 'spring', stiffness: 120, damping: 20, delay: getDelay('leaderboard') }}
          >
            <FightCardLeaderboard
              participants={sortedScores.map(p => ({
                name: p.username,
                score: p.score,
                isCurrentPlayer: normalizeUsername(p.username) === normalizeUsername(username),
                avatar: p.avatar,
              }))}
              currentUsername={username}
              gameMode={gameMode}
              emojiReactions={emojiReactions}
            />
          </motion.div>
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

      {/* Revenge Face-Off / Defend Title */}
      {scoreRevealComplete && sortedScores.length > 1 && isVisible('revenge') && currentPlayerData && (
        <ResultsRevengeSection
          sortedScores={sortedScores}
          currentPlayerData={currentPlayerData}
          currentPlayerRank={currentPlayerRank}
          gapToWinner={gapToWinner}
          gameMode={gameMode}
          reducedMotion={reducedMotion}
          revengeDelay={getDelay('revenge')}
          t={t}
        />
      )}

      {/* Word Marquee Ticker — scrolling word display */}
      {scoreRevealComplete && currentPlayerValidWords.length > 0 && (
        <WordMarqueeTicker
          words={currentPlayerValidWords}
          gameMode={gameMode}
        />
      )}

      {/* Primary CTA — cascaded entrance */}
      {gameCode && onReturnToRoom && isVisible('cta') && (
        <ResultsCtaSection
          sortedScores={sortedScores}
          currentPlayerData={currentPlayerData}
          currentPlayerRank={currentPlayerRank}
          currentPlayerValidWords={currentPlayerValidWords}
          hasZeroScore={hasZeroScore}
          isHost={isHost}
          onStartGame={onStartGame}
          onMarkReady={onMarkReady}
          onExit={onExit}
          isBotsOnlyGame={isBotsOnlyGame}
          isCurrentPlayerReady={isCurrentPlayerReady}
          normalizeUsername={normalizeUsername}
          username={username}
          selectedGameMode={selectedGameMode}
          onSelectGameMode={onSelectGameMode}
          breathingShadow={breathingShadow}
          reducedMotion={reducedMotion}
          ctaDelay={getDelay('cta')}
          t={t}
        />
      )}

      {/* Ready status */}
      {gameCode && sortedScores.length > 1 && readyUsernames.length > 0 && (
        <div className="text-center" aria-live="polite">
          <span className="text-xs text-neo-cream/60 font-medium">
            {t('results.playersReady', { count: readyUsernames.length, total: sortedScores.length })}
          </span>
        </div>
      )}

      {/* Streak Urgency (singleplayer only) */}
      {!gameCode && winStreakData && winStreakData.currentStreak >= 1 && (
        <StreakUrgencyDisplay
          currentStreak={winStreakData.currentStreak}
          t={t}
        />
      )}

      {/* Series Standings */}
      {seriesStandings && seriesRoundNumber && seriesRoundNumber >= 2 && (
        <SeriesStandingsBanner
          standings={seriesStandings}
          roundNumber={seriesRoundNumber}
          currentUsername={username}
          t={t}
        />
      )}

      {/* Near-Miss Notifications */}
      {nearMisses.length > 0 && (
        <NearMissCard
          nearMisses={nearMisses}
          t={t}
          onPlayAgain={isHost ? onStartGame : onMarkReady}
          compact
        />
      )}

      {/* Word Hunt promo — singleplayer only */}
      {!gameCode && gameMode !== 'word-hunt' && <WordHuntAnnouncementBanner className="mt-2" />}

      {/* Stats + Achievements + Words */}
      {currentPlayerData && (
        <ResultsWordsSection
          currentPlayerData={currentPlayerData}
          currentPlayerValidWords={currentPlayerValidWords}
          currentPlayerRank={currentPlayerRank}
          reducedMotion={reducedMotion}
          statsDelay={getDelay('stats')}
          wordsDelay={getDelay('words')}
          isStatsVisible={isVisible('stats')}
          isWordsVisible={isVisible('words')}
          t={t}
        />
      )}

      {/* Large Room Notice */}
      {duplicateRuleDisabled && (
        <div className="bg-neo-cyan/20 border-2 border-neo-cyan rounded-neo p-2 text-center">
          <span className="text-xs text-neo-cyan font-bold">
            👥 {t('results.largeRoomMode')} - {t('results.duplicateRuleDisabled')}
          </span>
        </div>
      )}

      {/* Ad zones */}
      <div className="flex flex-col items-center gap-2 py-2">
        <AdPlaceholder zone="post-game" />
        {showBanner && <CrazyGamesBanner size={bannerSize} />}
      </div>
    </div>
  );
};

export default ResultsMainContent;
