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
import { calculatePlayerInsights } from '@/utils/gameInsights';
import { applyHebrewFinalLetters } from '@/utils/utils';
import type { Player, WordObject, XpGainedData, LevelUpData, GameAchievement } from './types';
import type { PlayerArchetype } from '@/utils/playerArchetypes';

// Lifetime achievement keys to filter out
const LIFETIME_ACHIEVEMENT_KEYS = new Set([
  'VETERAN', 'CENTURION', 'WORD_COLLECTOR', 'WORD_HOARDER',
  'CHAMPION', 'LEGEND', 'POINT_MASTER', 'POINT_KING',
  'DEDICATION', 'LOYAL_PLAYER',
]);

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
  duplicateRuleDisabled,
}) => {
  const { t, dir } = useLanguage();
  const levelArrow = dir === 'rtl' ? '←' : '→';

  // Expanded states for collapsible sections
  const [showDetails, setShowDetails] = useState(false);
  const [showWords, setShowWords] = useState(false);
  const [showXp, setShowXp] = useState(false);

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
    1: { bg: 'bg-neo-yellow', text: 'text-neo-black' },
    2: { bg: 'bg-slate-300', text: 'text-slate-800' },
    3: { bg: 'bg-neo-orange', text: 'text-neo-black' },
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

  // Memoized word calculations
  const { validWords, duplicateWords, invalidWords, wordsByPoints, sortedPointGroups, totalComboBonus, totalFireRoundBonus, summaryStats } = useMemo(() => {
    if (!player.allWords || player.allWords.length === 0) {
      return {
        validWords: [] as WordObject[],
        duplicateWords: [] as WordObject[],
        invalidWords: [] as WordObject[],
        wordsByPoints: {} as Record<number, WordObject[]>,
        sortedPointGroups: [] as number[],
        totalComboBonus: 0,
        totalFireRoundBonus: 0,
        summaryStats: null,
      };
    }

    const dups = player.allWords.filter(w => w && w.isDuplicate);
    const invalid = player.allWords.filter(w => w && !w.isDuplicate && !w.validated);
    const valid = player.allWords.filter(w => w && !w.isDuplicate && w.validated);

    const comboBonus = valid.reduce((sum, w) => sum + (w.comboBonus || 0), 0);
    const fireBonus = valid.reduce((sum, w) => sum + (w.fireRoundBonus || 0), 0);

    // Group by points
    const byPoints: Record<number, WordObject[]> = {};
    valid.forEach(wordObj => {
      const points = wordObj.score || 0;
      if (!byPoints[points]) byPoints[points] = [];
      byPoints[points].push(wordObj);
    });

    // Sort within groups
    Object.keys(byPoints).forEach(points => {
      byPoints[Number(points)]?.sort((a, b) => a.word.localeCompare(b.word));
    });

    const sortedGroups = Object.keys(byPoints).map(Number).sort((a, b) => b - a);

    // Summary stats
    const longestWord = valid.reduce((max, w) => w.word.length > max.length ? w.word : max, '');
    const accuracy = player.allWords.length > 0
      ? Math.round((valid.length / player.allWords.length) * 100)
      : 0;

    return {
      validWords: valid,
      duplicateWords: dups,
      invalidWords: invalid,
      wordsByPoints: byPoints,
      sortedPointGroups: sortedGroups,
      totalComboBonus: comboBonus,
      totalFireRoundBonus: fireBonus,
      summaryStats: {
        validCount: valid.length,
        longestWord: longestWord ? applyHebrewFinalLetters(longestWord) : '-',
        accuracy,
      },
    };
  }, [player.allWords]);

  // Best word
  const bestWord = useMemo(() => {
    if (!validWords.length) return null;
    return validWords.reduce((best, w) => (w.score || 0) > (best?.score || 0) ? w : best, validWords[0]);
  }, [validWords]);

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

  // Filter achievements
  const gameAchievements = useMemo(() => {
    if (!player.achievements) return [];
    return player.achievements.filter(ach => {
      const key = ach.key || ach.name || '';
      return !LIFETIME_ACHIEVEMENT_KEYS.has(key);
    });
  }, [player.achievements]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="w-full max-w-lg mx-auto mb-4"
    >
      <div
        className={cn(
          'relative overflow-hidden rounded-neo-lg border-4 border-neo-black shadow-hard-lg',
          'bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800'
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

        <div className="relative z-10 p-4">
          {/* Header: Your Performance */}
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-neo-cyan" />
            <h2 className="text-sm font-black uppercase tracking-wide text-white">
              {t('results.yourPerformance') || 'Your Performance'}
            </h2>
          </div>

          {/* Primary Row: Rank + Avatar + Info + Score */}
          <div className="flex items-center gap-3 mb-3">
            {/* Rank Badge */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
              className={cn(
                'flex-shrink-0 w-12 h-12 rounded-neo flex items-center justify-center border-3 border-neo-black shadow-hard',
                rankStyle.bg, rankStyle.text
              )}
            >
              <div className="text-center">
                <span className="text-xl font-black">#{rank}</span>
              </div>
            </motion.div>

            {/* Avatar */}
            {player.avatar && (
              <Avatar
                profilePictureUrl={player.avatar.profilePictureUrl}
                avatarEmoji={player.avatar.emoji}
                avatarImage={player.avatar.avatarImage}
                avatarColor={player.avatar.color}
                size="xl"
                className="flex-shrink-0 border-2 border-neo-black"
              />
            )}

            {/* Username + Archetype */}
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-black text-white truncate">{player.username}</h3>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-white/60 font-bold">
                  {rank}{getRankSuffix(rank)} of {totalPlayers}
                </span>
                {archetype && (
                  <PlayerArchetypeBadge archetype={archetype} size="sm" />
                )}
              </div>
            </div>

            {/* Score */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="flex-shrink-0 text-right"
            >
              <div className="text-3xl font-black text-white">{player.score}</div>
              <div className="text-[10px] font-bold uppercase text-white/60">
                {t('results.points') || 'Points'}
              </div>
            </motion.div>
          </div>

          {/* Gap to winner */}
          {!isWinner && pointsFromWinner > 0 && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25 }}
              className="flex items-center gap-1.5 mb-3 px-2 py-1.5 rounded-neo bg-neo-cyan/20 border border-neo-cyan/40"
            >
              <TrendingUp className="w-3.5 h-3.5 text-neo-cyan" />
              <span className="text-xs font-bold text-neo-cyan">
                {t('results.pointsFromFirst', { points: pointsFromWinner }) || `Just ${pointsFromWinner} pts from 1st!`}
              </span>
            </motion.div>
          )}

          {/* Key Stats Grid - Always visible */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            {/* Words Found */}
            <div className="bg-white/10 rounded-neo border border-white/20 p-2 text-center">
              <div className="flex justify-center mb-1">
                <div className="w-6 h-6 rounded bg-neo-lime text-neo-black border border-neo-black flex items-center justify-center">
                  <Hash className="w-3.5 h-3.5 text-neo-black" />
                </div>
              </div>
              <div className="text-xl font-black text-white">{validWords.length}</div>
              <div className="text-[9px] font-bold uppercase text-white/60">{t('results.words') || 'Words'}</div>
            </div>

            {/* Accuracy */}
            <div className="bg-white/10 rounded-neo border border-white/20 p-2 text-center">
              <div className="flex justify-center mb-1">
                <div className="w-6 h-6 rounded bg-neo-pink text-white border border-neo-black flex items-center justify-center">
                  <Target className="w-3.5 h-3.5 text-neo-black" />
                </div>
              </div>
              <div className="text-xl font-black text-white">{summaryStats?.accuracy || 0}%</div>
              <div className="text-[9px] font-bold uppercase text-white/60">{t('results.accuracy') || 'Accuracy'}</div>
            </div>

            {/* Best Word */}
            <div className="bg-white/10 rounded-neo border border-white/20 p-2 text-center">
              <div className="flex justify-center mb-1">
                <div className="w-6 h-6 rounded bg-neo-purple text-white border border-neo-black flex items-center justify-center">
                  <Award className="w-3.5 h-3.5 text-neo-cream" />
                </div>
              </div>
              <div className="text-sm font-black text-white uppercase truncate">
                {bestWord ? applyHebrewFinalLetters(bestWord.word) : '-'}
              </div>
              <div className="text-[9px] font-bold uppercase text-white/60">
                {bestWord?.score ? `${bestWord.score} pts` : (t('results.bestWord') || 'Best')}
              </div>
            </div>
          </div>

          {/* Bonus Badges Row */}
          {(totalComboBonus > 0 || totalFireRoundBonus > 0 || xpGainedData || levelUpData) && (
            <div className="flex items-center gap-2 flex-wrap mb-3">
              {totalComboBonus > 0 && (
                <span className="bg-neo-orange border-2 border-neo-black rounded-neo px-2 py-0.5 shadow-hard-sm text-neo-black text-xs font-black">
                  ⚡ +{totalComboBonus}
                </span>
              )}
              {totalFireRoundBonus > 0 && (
                <span className="bg-neo-red border-2 border-neo-black rounded-neo px-2 py-0.5 shadow-hard-sm text-neo-cream text-xs font-black">
                  🔥 +{totalFireRoundBonus}
                </span>
              )}
              {xpGainedData && (
                <span className="bg-neo-purple border-2 border-neo-black rounded-neo px-2 py-0.5 shadow-hard-sm text-neo-cream text-xs font-black">
                  ⭐ +{xpGainedData.xpEarned} XP
                </span>
              )}
              {levelUpData && (
                <span className="bg-neo-yellow border-2 border-neo-black rounded-neo px-2 py-0.5 shadow-hard-sm text-neo-black text-xs font-black">
                  🎉 Lvl {levelUpData.oldLevel} {levelArrow} {levelUpData.newLevel}
                </span>
              )}
            </div>
          )}

          {/* Collapsible: Performance Details */}
          <button
            onClick={() => setShowDetails(!showDetails)}
            aria-expanded={showDetails}
            className="w-full flex items-center justify-between p-2 rounded-neo text-sm font-bold text-white uppercase border-2 border-neo-cyan/50 bg-neo-cyan/10 hover:bg-neo-cyan/20 transition-colors mb-2"
          >
            <span className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              {t('results.viewDetails') || 'View Performance Details'}
            </span>
            <motion.div animate={{ rotate: showDetails ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown className="w-5 h-5" />
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
            className="w-full flex items-center justify-between p-2 rounded-neo text-sm font-bold text-white uppercase border-2 border-white/20 bg-white/5 hover:bg-white/10 transition-colors mb-2"
          >
            <span className="flex items-center gap-2">
              <Hash className="w-4 h-4" />
              {t('results.viewAllWords') || 'View All Words'} ({player.allWords?.length || 0})
            </span>
            <motion.div animate={{ rotate: showWords ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown className="w-5 h-5" />
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
                className="w-full flex items-center justify-between p-2 rounded-neo text-sm font-bold text-white uppercase border-2 border-neo-purple/50 bg-neo-purple/10 hover:bg-neo-purple/20 transition-colors mb-2"
              >
                <span className="flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  {t('results.viewXpBreakdown') || 'View XP Breakdown'}
                </span>
                <motion.div animate={{ rotate: showXp ? 180 : 0 }} transition={{ duration: 0.2 }}>
                  <ChevronDown className="w-5 h-5" />
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

          {/* Achievements - Always visible if present */}
          {gameAchievements.length > 0 && (
            <div className="pt-3 border-t border-white/10">
              <p className="text-xs font-black mb-2 text-neo-purple uppercase">
                {t('hostView.achievements')}:
              </p>
              <div className="flex flex-wrap gap-2">
                {gameAchievements.map((ach, i) => (
                  <AchievementBadge key={i} achievement={ach} index={i} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
});

ConsolidatedPlayerCard.displayName = 'ConsolidatedPlayerCard';

export default ConsolidatedPlayerCard;
