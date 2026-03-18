'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { motion, useReducedMotion } from 'framer-motion';
import { Star, Play, Check, Swords, BookOpen, Trophy } from 'lucide-react';
import { useEntranceChoreography } from '@/hooks/useEntranceChoreography';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Player } from '@/components/results/types';
import Avatar from '@/components/Avatar';

// Dynamic imports for heavy components
const PlacementHero = dynamic(() => import('@/components/results/PlacementHero'), { ssr: false });
const FightCardLeaderboard = dynamic(() => import('@/components/results/FightCardLeaderboard'), { ssr: false });
const ScoreRevealAnimation = dynamic(() => import('@/components/results/ScoreRevealAnimation'), { ssr: false });
const NearMissCard = dynamic(() => import('@/components/results/NearMissCard'), { ssr: false });
const WordMarqueeTicker = dynamic(() => import('@/components/results/WordMarqueeTicker'), { ssr: false });
// Legacy: Top3Leaderboard + MobileCompactLeaderboard still used by ResultsLandscapeLayout

import NextStepPrompt from '@/components/results/NextStepPrompt';
import WordHuntAnnouncementBanner from '@/components/results/WordHuntAnnouncementBanner';
import CollapsibleSection from '@/components/ui/CollapsibleSection';
import CrazyGamesBanner from '@/components/CrazyGamesBanner';
import { AdPlaceholder } from '@/components/ads';
import { GameModeSelector, type GameModeOption } from '@/components/GameModeSelector';
import ShareButton from '@/components/results/ShareButton';
import { StatsCardGrid } from '@/components/results/shared';
import { WordPointsGroup, InvalidWordsSection } from '@/components/results/WordPointsGroup';
import { useWordCategories } from '@/components/results/useWordCategories';
import { AchievementBadge } from '@/components/AchievementBadge';
import { filterGameAchievements } from '@/components/results/utils';
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
  /** @deprecated Kept for compatibility — no longer rendered in main content */
  currentPlayerArchetype: import('@/utils/playerArchetypes').PlayerArchetype | null;
  /** Current player's rank */
  currentPlayerRank: number;

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
  /** Emoji reactions for speech bubbles on leaderboard rows */
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
  currentPlayerArchetype,
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
  isMobile = false,
  allPlayerWords,
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

  // Top achievements earned this game (max 3 shown as highlight)
  const gameAchievements = React.useMemo(() => {
    if (!currentPlayerData?.achievements) return [];
    return filterGameAchievements(currentPlayerData.achievements, currentPlayerData.allWords).slice(0, 3);
  }, [currentPlayerData]);

  // Rich word categorization for "Your Words" section
  const {
    wordsByPoints,
    sortedPointGroups,
    invalidWords: playerInvalidWords,
    totalComboBonus,
    totalFireRoundBonus,
  } = useWordCategories(currentPlayerData?.allWords);

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

      {/* Revenge Face-Off — YOUR avatar vs WINNER avatar + VS badge + score gap */}
      {scoreRevealComplete && currentPlayerRank > 1 && sortedScores.length > 1 && sortedScores[0] && currentPlayerData && isVisible('revenge') && (
        <motion.div
          initial={reducedMotion ? undefined : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20, delay: getDelay('revenge') }}
          className="bg-slate-800 border-3 border-slate-700 shadow-hard-lg p-3 sm:p-5 relative overflow-hidden"
        >
          {/* Decorative pink triangle (top-right, matching SuperDesign) */}
          <div className="absolute top-0 end-0 w-24 h-24 sm:w-32 sm:h-32 bg-neo-pink/10 transform rotate-45 translate-x-12 sm:translate-x-16 -translate-y-12 sm:-translate-y-16 pointer-events-none" />
          {/* Halftone overlay */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.04] bg-[radial-gradient(circle,white_1px,transparent_1px)] bg-[length:8px_8px]" />

          <div className="relative z-10 flex items-center justify-center gap-3 sm:gap-5 px-2 sm:px-4 mb-3 sm:mb-4">
            {/* YOUR side */}
            <div className="flex flex-col items-center gap-1 sm:gap-1.5 min-w-0">
              <div className="border-2 sm:border-3 border-neo-cyan rounded-full shadow-hard-sm bg-slate-900 overflow-hidden">
                <Avatar
                  profilePictureUrl={currentPlayerData.avatar?.profilePictureUrl ?? undefined}
                  avatarImage={currentPlayerData.avatar?.avatarImage}
                  customAvatar={currentPlayerData.avatar?.customAvatar}
                  size="md"
                  className="w-11 h-11 sm:w-14 sm:h-14"
                />
              </div>
              <span className="text-[10px] sm:text-xs font-black uppercase text-neo-cyan truncate max-w-[60px] sm:max-w-[80px]">
                {t('results.you')}
              </span>
            </div>

            {/* VS badge — hexagonal, wobble + scale pulse */}
            <motion.div
              animate={!reducedMotion ? { rotate: [0, 4, -4, 0], scale: [1, 1.08, 1] } : undefined}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="shrink-0 bg-neo-cream border-3 border-neo-black w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center"
              style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
            >
              <span className="font-neo-display text-neo-black text-base sm:text-xl">VS</span>
            </motion.div>

            {/* WINNER side */}
            <div className="flex flex-col items-center gap-1 sm:gap-1.5 min-w-0">
              <div className="border-2 sm:border-3 border-neo-lime rounded-full shadow-hard-sm bg-slate-900 overflow-hidden">
                <Avatar
                  profilePictureUrl={sortedScores[0].avatar?.profilePictureUrl ?? undefined}
                  avatarImage={sortedScores[0].avatar?.avatarImage}
                  customAvatar={sortedScores[0].avatar?.customAvatar}
                  size="md"
                  className="w-11 h-11 sm:w-14 sm:h-14"
                />
              </div>
              <span className="text-[10px] sm:text-xs font-black uppercase text-neo-lime truncate max-w-[60px] sm:max-w-[80px]">
                {sortedScores[0].username}
              </span>
            </div>
          </div>

          {/* Score gap / mode-specific callout */}
          <motion.p
            initial={reducedMotion ? undefined : { opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: reducedMotion ? 0 : getDelay('revenge') + 0.3, type: 'spring', stiffness: 300, damping: 18 }}
            className="text-center mb-3 sm:mb-4 text-xs sm:text-sm font-black uppercase text-neo-pink tracking-tight sm:tracking-widest"
          >
            {gameMode === 'word-hunt'
              ? t('results.surviveLongerThan', { player: sortedScores[0].username })
              : gapToWinner > 0
                ? t('results.pointsBehind', { points: gapToWinner })
                : null
            }
          </motion.p>

          {/* Mascot motivator */}
          {!reducedMotion && (
            <motion.div
              className="absolute -bottom-1 -end-1 opacity-30 pointer-events-none"
              animate={{ y: [0, -4, 0], rotate: [0, 5, -5, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/mascot/flexing-nobg.gif" alt="" width={48} height={48} className="object-contain" loading="eager" />
            </motion.div>
          )}
        </motion.div>
      )}

      {/* Winner — "DEFEND YOUR TITLE" card */}
      {scoreRevealComplete && currentPlayerRank === 1 && sortedScores.length > 1 && isVisible('revenge') && (
        <motion.div
          initial={reducedMotion ? undefined : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20, delay: getDelay('revenge') }}
          className="flex items-center justify-center gap-3 p-3 bg-neo-lime/10 border-3 border-neo-lime/40 rounded-neo shadow-hard-sm"
        >
          <Trophy className="w-6 h-6 text-neo-lime shrink-0" />
          <span className="font-black uppercase text-neo-lime text-sm">
            {t('results.defendTitle')}
          </span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/mascot/trophy-nobg.gif" alt="" width={36} height={36} className="object-contain shrink-0" loading="eager" />
        </motion.div>
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
        <motion.div
          initial={reducedMotion ? undefined : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20, delay: getDelay('cta') }}
        >
          {isBotsOnlyGame && !isHost ? (
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
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.93 }}
                      animate={!reducedMotion ? {
                        scale: [1, 1.02, 1],
                        boxShadow: breathingShadow,
                      } : undefined}
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
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
                    {currentPlayerRank > 1 && sortedScores.length > 1 && sortedScores[0]?.username ? (
                      <motion.button
                        onClick={onMarkReady}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                        animate={!reducedMotion ? {
                          scale: [1, 1.02, 1],
                          boxShadow: breathingShadow,
                        } : undefined}
                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
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
                        animate={!reducedMotion ? {
                          scale: [1, 1.02, 1],
                          boxShadow: breathingShadow,
                        } : undefined}
                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
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
          )}
        </motion.div>
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

      {/* Stats Row — cascaded entrance */}
      {currentPlayerData && currentPlayerRank > 0 && isVisible('stats') && (
        <motion.div
          initial={reducedMotion ? undefined : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 120, damping: 20, delay: getDelay('stats') }}
        >
          <StatsCardGrid
            cards={[
              { label: t('results.words'), value: currentPlayerValidWords.length, icon: '📝' },
              {
                label: t('results.bestCombo'),
                value: (() => {
                  const words = currentPlayerData?.allWords ?? [];
                  const maxCombo = words.reduce((max, w) => Math.max(max, w.comboBonus ?? 0), 0);
                  return maxCombo > 0 ? `x${maxCombo}` : '-';
                })(),
                icon: '⚡',
                accent: 'amber',
              },
              {
                label: t('results.bestWord'),
                value: currentPlayerValidWords.length > 0
                  ? currentPlayerValidWords.reduce((a, b) => a.word.length >= b.word.length ? a : b).word.toUpperCase()
                  : '-',
                icon: '⭐',
                accent: 'lime',
              },
            ]}
            variant="grid"
          />
        </motion.div>
      )}

      {/* Top Achievements — highlight reel of badges earned this game */}
      {gameAchievements.length > 0 && isVisible('stats') && (
        <motion.div
          initial={reducedMotion ? undefined : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20, delay: getDelay('stats') + 0.15 }}
          className="flex items-center gap-2 flex-wrap justify-center py-2"
        >
          <span className="text-[10px] font-black uppercase tracking-widest text-neo-cream/40 w-full text-center mb-0.5">
            {t('results.badges')}
          </span>
          {gameAchievements.map((ach, i) => (
            <AchievementBadge
              key={ach.key || ach.name || `ach-${i}`}
              achievement={ach}
              index={i}
            />
          ))}
        </motion.div>
      )}

      {/* Your Words — rich display with combo/fire/AI badges, grouped by points */}
      {currentPlayerValidWords.length > 0 && isVisible('words') && (
        <motion.div
          initial={reducedMotion ? undefined : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 120, damping: 20, delay: getDelay('words') }}
        >
          <CollapsibleSection
            title={t('results.yourWords')}
            icon={<BookOpen className="w-4 h-4" />}
            badge={currentPlayerValidWords.length}
            summary={[
              currentPlayerValidWords.length > 0
                ? `${t('results.bestWord')}: ${currentPlayerValidWords.reduce((a, b) => a.word.length >= b.word.length ? a : b).word.toUpperCase()}`
                : undefined,
              totalComboBonus > 0 ? `⚡ +${totalComboBonus}` : undefined,
              totalFireRoundBonus > 0 ? `🔥 +${totalFireRoundBonus}` : undefined,
            ].filter(Boolean).join(' · ')}
            defaultExpanded={false}
            variant="tertiary"
            className="shadow-hard"
          >
            <div className="space-y-2">
              {/* Valid words grouped by points — shows combo, fire round, AI badges */}
              {sortedPointGroups.length > 0 && (
                <WordPointsGroup
                  wordsByPoints={wordsByPoints}
                  sortedPointGroups={sortedPointGroups}
                  t={t}
                  mode="simple"
                  animate
                />
              )}

              {/* Invalid words — show what didn't count and why */}
              {playerInvalidWords.length > 0 && (
                <InvalidWordsSection
                  invalidWords={playerInvalidWords}
                  t={t}
                  mode="simple"
                />
              )}
            </div>
          </CollapsibleSection>
        </motion.div>
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
