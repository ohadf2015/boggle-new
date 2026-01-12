'use client';

import React, { useMemo, useState, memo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Hash, Award, TrendingUp, ChevronDown, Zap, BarChart3, Sparkles } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import Avatar from '../Avatar';
import PlayerArchetypeBadge from './PlayerArchetypeBadge';
import PlayerInsights from './PlayerInsights';
import { AchievementBadge } from '../AchievementBadge';
import XpBreakdownCard from './XpBreakdownCard';
import { WordPointsGroup, SharedWordsSection, InvalidWordsSection } from './WordPointsGroup';
import { filterGameAchievements } from './utils';
import { useWordCategories } from './useWordCategories';
import BonusBadgesRow from './BonusBadgesRow';
import { calculatePlayerInsights } from '@/utils/gameInsights';
import { applyHebrewFinalLetters } from '@/utils/utils';
import type { Player, WordObject, XpGainedData, LevelUpData } from './types';
import type { PlayerArchetype } from '@/utils/playerArchetypes';

interface ConsolidatedPlayerCardProps {
  player: Player;
  rank: number;
  totalPlayers: number;
  winnerScore: number;
  allPlayerWords: Record<string, WordObject[]>;
  xpGainedData: XpGainedData | null;
  levelUpData: LevelUpData | null;
  archetype: PlayerArchetype | null;
  duplicateRuleDisabled?: boolean;
  hideRankAndScore?: boolean; // When shown alongside ResultsWinnerBanner
}

/**
 * Consolidated Player Card - Your Performance Section
 * Combines YourQuickStats, PlayerInsights, Words, Achievements, and XP
 * Organized from most important to least important with collapsible sections
 */
const ConsolidatedPlayerCard: React.FC<ConsolidatedPlayerCardProps> = memo(({
  player,
  rank,
  totalPlayers,
  winnerScore,
  allPlayerWords,
  xpGainedData,
  levelUpData,
  archetype,
  duplicateRuleDisabled: _duplicateRuleDisabled,
  hideRankAndScore = false,
}) => {
  const { t } = useLanguage();

  // Expanded states for collapsible sections
  const [showDetails, setShowDetails] = useState(false);
  const [showWords, setShowWords] = useState(false);
  const [showXp, setShowXp] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);

  const isWinner = rank === 1;
  const pointsFromWinner = winnerScore - player.score;

  const getRankSuffix = (r: number) => {
    if (r === 1) return 'st';
    if (r === 2) return 'nd';
    if (r === 3) return 'rd';
    return 'th';
  };

  // Rank-specific styling
  const rankColors: Record<number, { bg: string; text: string }> = {
    1: { bg: 'bg-amber-400', text: 'text-neo-black' },
    2: { bg: 'bg-slate-200', text: 'text-slate-900' },
    3: { bg: 'bg-amber-500', text: 'text-neo-black' },
  };
  const rankStyle = rankColors[rank] || { bg: 'bg-neo-cream', text: 'text-neo-black' };

  // Calculate how many players found each word - memoized callback
  const getPlayerCountForWord = useCallback((word: string): number => {
    if (!allPlayerWords || !word) return 1;
    let count = 0;
    Object.values(allPlayerWords).forEach(playerWordList => {
      if (Array.isArray(playerWordList) && playerWordList.some(w => w?.word?.toLowerCase() === word.toLowerCase())) {
        count++;
      }
    });
    return count;
  }, [allPlayerWords]);

  // Use shared hook for word categorization
  const {
    validWords,
    duplicateWords,
    invalidWords,
    wordsByPoints,
    sortedPointGroups,
    totalComboBonus,
    totalFireRoundBonus,
    longestWord,
    accuracy,
    bestWord,
  } = useWordCategories(player.allWords);

  // Summary stats for display (with Hebrew final letters applied)
  const summaryStats = useMemo(() => ({
    validCount: validWords.length,
    longestWord: longestWord ? applyHebrewFinalLetters(longestWord) : '-',
    accuracy,
  }), [validWords.length, longestWord, accuracy]);

  // Player insights
  const playerInsights = useMemo(() => {
    if (!player.allWords || player.allWords.length === 0) return null;
    let gameDuration = 180;
    const timings = player.allWords.map(w => w.timeSinceStart).filter((t): t is number => typeof t === 'number' && t > 0);
    if (timings.length > 0) {
      gameDuration = Math.max(Math.ceil((Math.max(...timings) + 10) / 30) * 30, 60);
    }
    return calculatePlayerInsights(player.allWords, gameDuration, player.score);
  }, [player.allWords, player.score]);

  // Filter achievements using shared utility
  const gameAchievements = useMemo(() => {
    if (!player.achievements) return [];
    return filterGameAchievements(player.achievements, validWords);
  }, [player.achievements, validWords]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="w-full max-w-xl mx-auto mb-4"
    >
      <div
        className={cn(
          'relative overflow-hidden rounded-neo-lg border-4 border-neo-black shadow-hard-lg',
          'bg-neo-navy'
        )}
        style={{ transform: 'rotate(-0.5deg)' }}
      >
        {/* Halftone texture */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{
            backgroundImage: `radial-gradient(circle, white 1px, transparent 1px)`,
            backgroundSize: '8px 8px',
          }}
        />

        <div className="relative z-10 p-4 sm:p-5">
          {/* Header: Your Performance */}
          <div className="flex items-center gap-2 mb-2 sm:mb-3">
            <Sparkles className="w-5 h-5 text-neo-cyan" />
            <h2 className="text-sm font-black uppercase tracking-wide text-white">
              {t('results.yourPerformance') || 'Your Performance'}
            </h2>
          </div>

          {/* Primary Row: Rank + Avatar + Info + Score */}
          <div className="flex items-center gap-3 sm:gap-4 mb-2 sm:mb-3">
            {/* Rank Badge - Large and prominent (hidden when shown alongside banner) */}
            {!hideRankAndScore && (
              <motion.div
                initial={{ scale: 0, rotate: -10 }}
                animate={{ scale: 1, rotate: 3 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
                className={cn(
                  'flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-neo flex items-center justify-center border-3 sm:border-4 border-neo-black shadow-hard-lg',
                  rankStyle.bg, rankStyle.text
                )}
              >
                <div className="text-center">
                  <span className="text-2xl sm:text-3xl font-black">#{rank}</span>
                </div>
              </motion.div>
            )}

            {/* Avatar */}
            {player.avatar && (
              <Avatar
                profilePictureUrl={player.avatar.profilePictureUrl}
                avatarImage={player.avatar.avatarImage}
                size="xl"
                className="flex-shrink-0 border-2 border-neo-black w-12 h-12 sm:w-14 sm:h-14"
              />
            )}

            {/* Username + Archetype */}
            <div className="flex-1 min-w-0">
              <h3 className="text-base sm:text-lg font-black text-white truncate">{player.username}</h3>
              <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                {!hideRankAndScore && (
                  <span className="text-[10px] sm:text-xs text-slate-300 font-bold">
                    {rank}{getRankSuffix(rank)} of {totalPlayers}
                  </span>
                )}
                {archetype && (
                  <PlayerArchetypeBadge archetype={archetype} size="sm" showTooltip={true} />
                )}
              </div>
            </div>

            {/* Score (hidden when shown alongside banner) */}
            {!hideRankAndScore && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className="flex-shrink-0 text-right"
              >
                <div className="text-2xl sm:text-3xl font-black text-white">{player.score}</div>
                <div className="text-[9px] sm:text-[10px] font-bold uppercase text-slate-300">
                  {t('results.points') || 'Points'}
                </div>
              </motion.div>
            )}
          </div>

          {/* Gap to winner */}
          {!isWinner && pointsFromWinner > 0 && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25 }}
              className="flex items-center gap-1.5 mb-2 sm:mb-3 px-2 py-1 sm:py-1.5 rounded-neo bg-neo-cyan/20 border border-neo-cyan/40"
            >
              <TrendingUp className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-neo-cyan" />
              <span className="text-[10px] sm:text-xs font-bold text-neo-cyan">
                {t('results.pointsFromFirst', { points: pointsFromWinner }) || `Just ${pointsFromWinner} pts from 1st!`}
              </span>
            </motion.div>
          )}

          {/* Key Stats Grid - Always visible (2 cols mobile, 3 cols larger) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-2 mb-2 sm:mb-3">
            {/* Words Found */}
            <div className="bg-white/10 rounded-neo border border-white/20 p-1.5 sm:p-2 text-center">
              <div className="flex justify-center mb-0.5 sm:mb-1">
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded bg-neo-lime text-neo-black border border-neo-black flex items-center justify-center">
                  <Hash className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-neo-black" />
                </div>
              </div>
              <div className="text-lg sm:text-xl font-black text-white">{validWords.length}</div>
              <div className="text-[8px] sm:text-[9px] font-bold uppercase text-slate-300">{t('results.words') || 'Words'}</div>
            </div>

            {/* Accuracy */}
            <div className="bg-white/10 rounded-neo border border-white/20 p-1.5 sm:p-2 text-center">
              <div className="flex justify-center mb-0.5 sm:mb-1">
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded bg-neo-pink text-white border border-neo-black flex items-center justify-center">
                  <Target className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-neo-black" />
                </div>
              </div>
              <div className="text-lg sm:text-xl font-black text-white">{summaryStats?.accuracy || 0}%</div>
              <div className="text-[8px] sm:text-[9px] font-bold uppercase text-slate-300">{t('results.accuracy') || 'Accuracy'}</div>
            </div>

            {/* Best Word - Hidden on mobile (available in details), shown on sm+ */}
            <div className="hidden sm:block bg-white/10 rounded-neo border border-white/20 p-1.5 sm:p-2 text-center">
              <div className="flex justify-center mb-0.5 sm:mb-1">
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded bg-neo-pink text-white border border-neo-black flex items-center justify-center">
                  <Award className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-neo-cream" />
                </div>
              </div>
              <div className="text-xs sm:text-sm font-black text-white uppercase truncate">
                {bestWord ? applyHebrewFinalLetters(bestWord.word) : '-'}
              </div>
              <div className="text-[8px] sm:text-[9px] font-bold uppercase text-slate-300">
                {bestWord?.score ? `${bestWord.score} ${t('results.points') || 'pts'}` : (t('results.bestWord') || 'Best')}
              </div>
            </div>
          </div>

          {/* Bonus Badges Row */}
          <BonusBadgesRow
            comboBonus={totalComboBonus}
            fireRoundBonus={totalFireRoundBonus}
            xpGainedData={xpGainedData}
            levelUpData={levelUpData}
            className="mb-2 sm:mb-3"
          />

          {/* Collapsible: Performance Details */}
          <button
            onClick={() => setShowDetails(!showDetails)}
            aria-expanded={showDetails}
            className="w-full flex items-center justify-between p-1.5 sm:p-2 rounded-neo text-xs sm:text-sm font-bold text-white uppercase border sm:border-2 border-neo-cyan/50 bg-neo-cyan/10 hover:bg-neo-cyan/20 transition-colors mb-1.5 sm:mb-2"
          >
            <span className="flex items-center gap-1.5 sm:gap-2">
              <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">{t('results.viewDetails') || 'View Performance Details'}</span>
              <span className="sm:hidden">{t('results.details') || 'Details'}</span>
            </span>
            <motion.div animate={{ rotate: showDetails ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5" />
            </motion.div>
          </button>
          <AnimatePresence>
            {showDetails && playerInsights && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden mb-2"
              >
                <div className="bg-white/5 text-neo-black rounded-neo border border-white/10 p-2">
                  <PlayerInsights insights={playerInsights} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Collapsible: Words */}
          <button
            onClick={() => setShowWords(!showWords)}
            aria-expanded={showWords}
            className="w-full flex items-center justify-between p-1.5 sm:p-2 rounded-neo text-xs sm:text-sm font-bold text-white uppercase border sm:border-2 border-white/20 bg-white/5 hover:bg-white/10 transition-colors mb-1.5 sm:mb-2"
          >
            <span className="flex items-center gap-1.5 sm:gap-2">
              <Hash className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">{t('results.viewAllWords') || 'View All Words'}</span>
              <span className="sm:hidden">{t('results.words') || 'Words'}</span>
              <span className="text-slate-300">({player.allWords?.length || 0})</span>
            </span>
            <motion.div animate={{ rotate: showWords ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5" />
            </motion.div>
          </button>
          <AnimatePresence>
            {showWords && player.allWords && player.allWords.length > 0 && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden mb-2"
              >
                <div className="bg-white/5 text-neo-black rounded-neo border border-white/10 p-2 space-y-2">
                  <WordPointsGroup
                    wordsByPoints={wordsByPoints}
                    sortedPointGroups={sortedPointGroups}
                    t={t}
                    getPlayerCountForWord={getPlayerCountForWord}
                    mode="chip"
                  />
                  <SharedWordsSection
                    duplicateWords={duplicateWords}
                    t={t}
                    getPlayerCountForWord={getPlayerCountForWord}
                  />
                  <InvalidWordsSection
                    invalidWords={invalidWords}
                    t={t}
                    getPlayerCountForWord={getPlayerCountForWord}
                    mode="chip"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Collapsible: XP Breakdown (only if authenticated) */}
          {xpGainedData && (
            <>
              <button
                onClick={() => setShowXp(!showXp)}
                aria-expanded={showXp}
                className="w-full flex items-center justify-between p-1.5 sm:p-2 rounded-neo text-xs sm:text-sm font-bold text-white uppercase border sm:border-2 border-neo-pink/50 bg-neo-pink/10 hover:bg-neo-pink/20 transition-colors mb-1.5 sm:mb-2"
              >
                <span className="flex items-center gap-1.5 sm:gap-2">
                  <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">{t('results.viewXpBreakdown') || 'View XP Breakdown'}</span>
                  <span className="sm:hidden">{t('results.xp') || 'XP'}</span>
                </span>
                <motion.div animate={{ rotate: showXp ? 180 : 0 }} transition={{ duration: 0.2 }}>
                  <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5" />
                </motion.div>
              </button>
              <AnimatePresence>
                {showXp && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden mb-2"
                  >
                    <XpBreakdownCard
                      xpGainedData={xpGainedData}
                      levelUpData={levelUpData}
                      isWinner={isWinner}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}

          {/* Collapsible: Achievements */}
          {gameAchievements.length > 0 && (
            <>
              <button
                onClick={() => setShowAchievements(!showAchievements)}
                aria-expanded={showAchievements}
                className="w-full flex items-center justify-between p-1.5 sm:p-2 rounded-neo text-xs sm:text-sm font-bold text-white uppercase border sm:border-2 border-neo-lime/50 bg-neo-lime/10 hover:bg-neo-lime/20 transition-colors"
              >
                <span className="flex items-center gap-1.5 sm:gap-2">
                  <Award className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">{t('hostView.achievements') || 'Achievements'}</span>
                  <span className="sm:hidden">{t('results.badges') || 'Badges'}</span>
                  <span className="text-slate-300">({gameAchievements.length})</span>
                </span>
                <motion.div animate={{ rotate: showAchievements ? 180 : 0 }} transition={{ duration: 0.2 }}>
                  <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5" />
                </motion.div>
              </button>
              <AnimatePresence>
                {showAchievements && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden mt-2"
                  >
                    <div className="flex flex-wrap gap-2">
                      {gameAchievements.map((ach, i) => (
                        <AchievementBadge key={i} achievement={ach} index={i} />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
});

ConsolidatedPlayerCard.displayName = 'ConsolidatedPlayerCard';

export default ConsolidatedPlayerCard;
