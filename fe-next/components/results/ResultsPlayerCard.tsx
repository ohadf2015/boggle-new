import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AchievementBadge } from '../AchievementBadge';
import PlayerInsights from './PlayerInsights';
import NoWordsFoundView from './NoWordsFoundView';
import { useLanguage } from '../../contexts/LanguageContext';
import { cn } from '../../lib/utils';
import { applyHebrewFinalLetters } from '../../utils/utils';
import { calculatePlayerInsights } from '../../utils/gameInsights';
import { ChevronDown, ChevronUp } from 'lucide-react';
import Avatar from '../Avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import logger from '@/utils/logger';
import XpBreakdownCard from './XpBreakdownCard';
import { WordPointsGroup, SharedWordsSection, InvalidWordsSection } from './WordPointsGroup';
import { getRankIconString, getRankBoxStyle, getCardStyle } from '../../utils/rankingStyles';
import type { WordObject, GameAchievement, ResultsPlayerCardProps } from './types';

// Lifetime/career achievement keys that should NOT be shown in game results
// These are cumulative achievements that don't apply to a single round
const LIFETIME_ACHIEVEMENT_KEYS = new Set([
  'VETERAN',        // 50 games played
  'CENTURION',      // 100 games played
  'WORD_COLLECTOR', // 1000 total words
  'WORD_HOARDER',   // 5000 total words
  'CHAMPION',       // 25 wins
  'LEGEND',         // 100 wins
  'POINT_MASTER',   // 10000 total points
  'POINT_KING',     // 50000 total points
  'DEDICATION',     // 7 unique days
  'LOYAL_PLAYER',   // 30 unique days
]);

// Achievement thresholds for validation (base thresholds, may scale with game duration)
// These are set to 50% of the actual thresholds to account for time scaling
const ACHIEVEMENT_WORD_THRESHOLDS: Record<string, number> = {
  'WORDSMITH': 25,          // Actual: ~50 words (scaled)
  'LEXICON': 32,            // Actual: ~65 words (scaled)
  'UNSTOPPABLE': 37,        // Actual: ~75 words (scaled)
  'VOCABULARY_TITAN': 42,   // Actual: ~85 words (scaled)
  'DICTIONARY_DIVER': 32,   // Actual: ~65 words (scaled)
};

/**
 * Filter achievements to only show game-specific achievements
 * Excludes lifetime/career achievements and achievements that don't match player's round stats
 */
const filterGameAchievements = (
  achievements: GameAchievement[],
  allWords?: WordObject[]
): GameAchievement[] => {
  if (!achievements || !Array.isArray(achievements)) return [];

  const validWordCount = allWords
    ? allWords.filter(w => w && !w.isDuplicate && w.validated).length
    : 0;

  return achievements.filter(ach => {
    const key = ach.key || ach.name || '';

    // Filter out lifetime achievements - these should not appear in round results
    if (LIFETIME_ACHIEVEMENT_KEYS.has(key)) {
      logger.debug(`[RESULTS] Filtering out lifetime achievement: ${key}`);
      return false;
    }

    // Validate word-count-based achievements against actual round stats
    // Use a generous threshold (50% of base) to account for time scaling
    const threshold = ACHIEVEMENT_WORD_THRESHOLDS[key];
    if (threshold && validWordCount < threshold * 0.5) {
      // Achievement requires more words than player actually found
      // This suggests stale data from a previous game
      logger.warn(`[RESULTS] Filtering out invalid achievement: ${key} (${validWordCount} words < ${threshold * 0.5} threshold)`);
      return false;
    }

    return true;
  });
};

const ResultsPlayerCard: React.FC<ResultsPlayerCardProps> = ({ player, index, allPlayerWords, currentUsername, isWinner, xpGainedData, levelUpData, duplicateRuleDisabled }) => {
  const { t, dir } = useLanguage();
  // Arrow for level up indicator - use ← in RTL and → in LTR to show progression
  // In RTL languages, left arrow indicates "going up/forward"
  const levelArrow = dir === 'rtl' ? '←' : '→';

  // Check if this is the current player
  const isCurrentPlayer = currentUsername && player.username === currentUsername;

  // Auto-expand only the current player's words by default
  const [isWordsExpanded, setIsWordsExpanded] = useState(isCurrentPlayer);

  const handleToggleExpand = () => {
    setIsWordsExpanded(!isWordsExpanded);
  };

  // Extract avatar info if available
  const avatar = player.avatar || null;

  // Memoize expensive word categorization and grouping at component level (not inside JSX)
  const { duplicateWords, invalidWords, validWords, wordsByPoints, sortedPointGroups, totalComboBonus, totalFireRoundBonus, summaryStats } = useMemo(() => {
    if (!player.allWords || player.allWords.length === 0) {
      return {
        duplicateWords: [] as WordObject[],
        invalidWords: [] as WordObject[],
        validWords: [] as WordObject[],
        wordsByPoints: {} as Record<number, WordObject[]>,
        sortedPointGroups: [] as number[],
        totalComboBonus: 0,
        totalFireRoundBonus: 0,
        summaryStats: null
      };
    }

    const duplicateWords = player.allWords.filter(w => w && w.isDuplicate);
    const invalidWords = player.allWords.filter(w => w && !w.isDuplicate && !w.validated);
    const validWords = player.allWords.filter(w => w && !w.isDuplicate && w.validated);

    // Calculate total combo bonus from all valid non-duplicate words
    const totalComboBonus = validWords.reduce((sum, w) => sum + (w.comboBonus || 0), 0);

    // Calculate total fire round bonus from all valid non-duplicate words
    const totalFireRoundBonus = validWords.reduce((sum, w) => sum + (w.fireRoundBonus || 0), 0);

    // Debug logging for combo bonus calculation
    if (totalComboBonus > 0) {
      logger.log(`[RESULTS] ${player.username} combo bonus: ${totalComboBonus} from ${validWords.filter(w => (w.comboBonus ?? 0) > 0).length} words with bonuses`);
    }

    // Debug logging for fire round bonus calculation
    if (totalFireRoundBonus > 0) {
      logger.log(`[RESULTS] ${player.username} fire round bonus: ${totalFireRoundBonus} from ${validWords.filter(w => (w.fireRoundBonus ?? 0) > 0).length} words`);
    }

    // Group valid words by points
    const wordsByPoints: Record<number, WordObject[]> = {};
    validWords.forEach(wordObj => {
      const points = wordObj.score || 0;
      if (!wordsByPoints[points]) {
        wordsByPoints[points] = [];
      }
      wordsByPoints[points].push(wordObj);
    });

    // Sort words alphabetically within each point group
    Object.keys(wordsByPoints).forEach(points => {
      const wordList = wordsByPoints[Number(points)];
      if (wordList) {
        wordList.sort((a, b) => a.word.localeCompare(b.word));
      }
    });

    // Sort duplicate and invalid words alphabetically
    duplicateWords.sort((a, b) => a.word.localeCompare(b.word));
    invalidWords.sort((a, b) => a.word.localeCompare(b.word));

    // Sort point groups in descending order
    const sortedPointGroups = Object.keys(wordsByPoints)
      .map(Number)
      .sort((a, b) => b - a);

    // Calculate summary statistics
    const longestWord = validWords.reduce((max, w) =>
      w.word.length > max.length ? w.word : max, '');
    const avgWordLength = validWords.length > 0
      ? (validWords.reduce((sum, w) => sum + w.word.length, 0) / validWords.length).toFixed(1)
      : '0';
    const accuracy = player.allWords.length > 0
      ? Math.round((validWords.length / player.allWords.length) * 100)
      : 0;

    const summaryStats = {
      totalWords: player.allWords.length,
      validCount: validWords.length,
      longestWord: longestWord ? applyHebrewFinalLetters(longestWord) : '-',
      longestWordLength: longestWord.length,
      avgWordLength,
      accuracy,
    };

    return { duplicateWords, invalidWords, validWords, wordsByPoints, sortedPointGroups, totalComboBonus, totalFireRoundBonus, summaryStats };
  }, [player.allWords, player.username]);

  // Calculate player insights (only for current player to avoid unnecessary computation)
  const playerInsights = useMemo(() => {
    if (!isCurrentPlayer || !player.allWords || player.allWords.length === 0) {
      return null;
    }

    // Calculate effective game duration from word timing data
    // Use the maximum timeSinceStart as a proxy for game duration
    // This is more accurate than a fixed value since it reflects actual play time
    let gameDuration = 180; // Default fallback
    const timeSinceStartValues = player.allWords
      .map(w => w.timeSinceStart)
      .filter((t): t is number => typeof t === 'number' && t > 0);

    if (timeSinceStartValues.length > 0) {
      const maxTimeSinceStart = Math.max(...timeSinceStartValues);
      // Round up to nearest 30 seconds to get a reasonable game duration estimate
      // Add a small buffer (10 seconds) since last word might not be at the very end
      gameDuration = Math.ceil((maxTimeSinceStart + 10) / 30) * 30;
      // Ensure minimum of 60 seconds for pace calculation
      gameDuration = Math.max(gameDuration, 60);
    }

    return calculatePlayerInsights(player.allWords, gameDuration, player.score);
  }, [isCurrentPlayer, player.allWords, player.score]);

  // Filter out lifetime achievements and validate against player's actual round stats
  // This prevents showing stale achievements from previous games
  const gameAchievements = useMemo(() => {
    return filterGameAchievements(player.achievements || [], player.allWords);
  }, [player.achievements, player.allWords]);

  const showWinnerMessage = isCurrentPlayer && isWinner;

  // Calculate how many players found each word
  const getPlayerCountForWord = (word: string): number => {
    if (!allPlayerWords || !word) return 1;
    let count = 0;
    Object.values(allPlayerWords).forEach(playerWordList => {
      if (Array.isArray(playerWordList) && playerWordList.some(w => w?.word?.toLowerCase() === word.toLowerCase())) {
        count++;
      }
    });
    return count;
  };

  // Use centralized ranking utilities
  const rankIcon = getRankIconString(index);
  const rankBoxStyleClass = getRankBoxStyle(index);
  const cardStyleClass = getCardStyle(index);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: Math.min(index * 0.05, 0.3), duration: 0.3 }}
      style={{ transform: `rotate(${index % 2 === 0 ? 1 : -1}deg)` }}
    >
      {/* Neo-Brutalist Card */}
      <div
        className={cn(
          "p-3 sm:p-4 border-4 transition-all duration-200 rounded-neo-lg shadow-hard-lg relative overflow-hidden",
          "hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-hard-xl",
          cardStyleClass,
          isWordsExpanded && "ring-4 ring-neo-cyan",
          // Add comic-style halftone for winner card (more prominent)
          index === 0 && "texture-halftone-comic"
        )}
      >
        {/* Halftone texture pattern - more prominent for winner, subtle for others */}
        <div
          className={cn(
            "absolute inset-0 pointer-events-none",
            index === 0 ? "opacity-0" : "opacity-5" // Winner uses CSS class pattern instead
          )}
          style={{
            backgroundImage: `radial-gradient(circle, var(--neo-black) 1px, transparent 1px)`,
            backgroundSize: '6px 6px',
          }}
        />
        {/* Header: Rank, Name, Score - Neo-Brutalist - Organized */}
        <div className="relative z-10">
          {/* Main row: Rank, Avatar, Username, Score */}
          <div className="flex items-center justify-between gap-2 sm:gap-3 mb-3">
            {/* Left: Rank + Avatar + Username with key badges */}
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className={cn(
                "w-11 h-11 sm:w-12 sm:h-12 rounded-neo flex items-center justify-center text-lg sm:text-2xl font-black border-3 shadow-hard-sm flex-shrink-0",
                rankBoxStyleClass
              )}>
                {rankIcon}
              </div>
              <Avatar
                profilePictureUrl={avatar?.profilePictureUrl}
                avatarEmoji={avatar?.emoji}
                avatarColor={avatar?.color}
                size="lg"
                className="flex-shrink-0"
              />
              <div className="flex flex-col gap-1 min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="text-base sm:text-xl font-black text-neo-black truncate">
                    {player.username}
                  </h3>
                  {isCurrentPlayer && !showWinnerMessage && (
                    <span className="text-xs bg-neo-black text-neo-cream px-1.5 py-0.5 rounded-neo font-bold">
                      ({t('playerView.me')})
                    </span>
                  )}
                  {showWinnerMessage && (
                    <motion.span
                      initial={{ scale: 0, opacity: 0, rotate: -5 }}
                      animate={{ scale: 1, opacity: 1, rotate: 3 }}
                      transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
                      className="text-xs font-black bg-neo-pink text-neo-cream px-1.5 py-0.5 rounded-neo border-2 border-neo-black"
                    >
                      {t('results.youWon')}
                    </motion.span>
                  )}
                </div>
                {/* Title badge - secondary row */}
                {player.title && (
                  <TooltipProvider delayDuration={0}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <motion.div
                          initial={{ scale: 0, opacity: 0, x: -10 }}
                          animate={{ scale: 1, opacity: 1, x: 0 }}
                          transition={{ delay: 0.4, type: 'spring', stiffness: 300 }}
                          className="flex items-center gap-1 cursor-help bg-neo-purple/10 px-1.5 py-0.5 rounded-neo border border-neo-black w-fit"
                        >
                          <span className="text-sm">{player.title.icon}</span>
                          <span className="text-xs font-black text-neo-purple uppercase tracking-wide">
                            {player.title.name}
                          </span>
                        </motion.div>
                      </TooltipTrigger>
                      <TooltipContent
                        side="bottom"
                        className="bg-neo-purple border-2 border-neo-black shadow-hard rounded-neo p-2"
                      >
                        <p className="text-xs font-bold text-neo-cream">{player.title.description}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </div>

            {/* Right: Score */}
            <div className="bg-neo-cream border-3 border-neo-black rounded-neo px-3 py-1 sm:px-4 sm:py-2 shadow-hard text-neo-black flex-shrink-0">
              <span className="text-2xl sm:text-3xl font-black">{player.score}</span>
            </div>
          </div>

          {/* Stats row - condensed */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Combo bonus */}
            {totalComboBonus > 0 && (
              <motion.div
                initial={{ scale: 0, rotate: -10 }}
                animate={{ scale: 1, rotate: 3 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 300 }}
                className="bg-neo-orange border-2 border-neo-black rounded-neo px-2 py-0.5 shadow-hard-sm text-neo-black flex items-center gap-1"
              >
                <span className="text-xs font-black">⚡ {t('results.comboBonus')}: +{totalComboBonus}</span>
              </motion.div>
            )}

            {/* Fire Round Bonus */}
            {totalFireRoundBonus > 0 && (
              <motion.div
                initial={{ scale: 0, rotate: -10 }}
                animate={{ scale: 1, rotate: 3 }}
                transition={{ delay: 0.25, type: 'spring', stiffness: 300 }}
                className="bg-neo-red border-2 border-neo-black rounded-neo px-2 py-0.5 shadow-hard-sm text-neo-cream flex items-center gap-1"
              >
                <span className="text-xs font-black">🔥 {t('results.fireRoundBonus') || 'Fire Round'}: +{totalFireRoundBonus}</span>
              </motion.div>
            )}

            {/* XP Earned - Only for current player with XP data */}
            {isCurrentPlayer && xpGainedData && (
              <motion.div
                initial={{ scale: 0, opacity: 0, x: -20 }}
                animate={{ scale: 1, opacity: 1, x: 0 }}
                transition={{ delay: 0.3, type: 'spring', stiffness: 300 }}
                className="bg-neo-purple border-2 border-neo-black rounded-neo px-2 py-0.5 shadow-hard-sm text-neo-cream flex items-center gap-1"
              >
                <span className="text-xs font-black">⭐ +{xpGainedData.xpEarned} XP</span>
              </motion.div>
            )}

            {/* Level Up - Only for current player with level up data */}
            {isCurrentPlayer && levelUpData && (
              <motion.div
                initial={{ scale: 0, opacity: 0, rotate: -10 }}
                animate={{ scale: 1, opacity: 1, rotate: 2 }}
                transition={{ delay: 0.4, type: 'spring', stiffness: 200, damping: 10 }}
                className="bg-neo-yellow border-2 border-neo-black rounded-neo px-2 py-0.5 shadow-hard-sm text-neo-black flex items-center gap-1"
              >
                <span className="text-xs font-black">🎉 {t('results.levelUp') || 'Level Up!'} {levelUpData.oldLevel} {levelArrow} {levelUpData.newLevel}</span>
              </motion.div>
            )}
          </div>
        </div>


        {/* Words Section - Always show, collapsible - Neo-Brutalist */}
        <div className="mb-2 relative z-10">
          <button
            onClick={handleToggleExpand}
            className="w-full flex items-center justify-between p-2 rounded-neo text-sm font-black text-neo-black dark:text-neo-cream uppercase border-2 border-neo-black bg-neo-cream dark:bg-slate-700 shadow-hard-sm hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-hard transition-all"
          >
            <span>{t('hostView.words')}: ({player.allWords?.length || 0})</span>
            {isWordsExpanded ? (
              <ChevronUp className="w-5 h-5" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
          </button>
          <AnimatePresence>
            {isWordsExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                {/* Show NoWordsFoundView if player has no words */}
                {(!player.allWords || player.allWords.length === 0) && (
                  <NoWordsFoundView
                    isCurrentPlayer={isCurrentPlayer || false}
                    playerName={player.username}
                  />
                )}
                {player.allWords && player.allWords.length > 0 && (
                <div className="space-y-2 pt-2">
                  {/* Summary Stats Card - Quick glance performance overview */}
                  {summaryStats && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-slate-800 border-2 border-neo-cyan rounded-neo p-2"
                    >
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <div className="text-xl sm:text-2xl font-black text-white">
                            {summaryStats.validCount}
                          </div>
                          <div className="text-[10px] sm:text-xs uppercase text-white font-bold">
                            {t('results.validWords') || 'Valid'}
                          </div>
                        </div>
                        <div>
                          <div className="text-lg sm:text-xl font-black text-white uppercase">
                            {summaryStats.longestWord}
                          </div>
                          <div className="text-[10px] sm:text-xs uppercase text-white font-bold">
                            {t('results.longest') || 'Longest'}
                          </div>
                        </div>
                        <div>
                          <div className="text-xl sm:text-2xl font-black text-white">
                            {summaryStats.accuracy}%
                          </div>
                          <div className="text-[10px] sm:text-xs uppercase text-white font-bold">
                            {t('results.accuracy') || 'Accuracy'}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Valid Words Grouped by Points - Using reusable component */}
                  <WordPointsGroup
                    wordsByPoints={wordsByPoints}
                    sortedPointGroups={sortedPointGroups}
                    t={t}
                    getPlayerCountForWord={getPlayerCountForWord}
                    mode="chip"
                  />

                  {/* Shared/Duplicate Words - Using reusable component */}
                  <SharedWordsSection
                    duplicateWords={duplicateWords}
                    t={t}
                    getPlayerCountForWord={getPlayerCountForWord}
                  />

                  {/* Invalid Words - Using reusable component */}
                  <InvalidWordsSection
                    invalidWords={invalidWords}
                    t={t}
                    getPlayerCountForWord={getPlayerCountForWord}
                    mode="chip"
                  />
                </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Player Insights - Only for current player when words are expanded */}
        {isCurrentPlayer && isWordsExpanded && playerInsights && (
          <div className="relative z-10">
            <PlayerInsights insights={playerInsights} />
          </div>
        )}

        {/* Achievements Section - Neo-Brutalist */}
        {/* Only show game-specific achievements, filtered to exclude lifetime/career achievements */}
        {gameAchievements.length > 0 && (
          <div className="mt-3 pt-3 sm:mt-4 sm:pt-4 border-t-4 border-neo-black relative z-10">
            <p className="text-sm font-black mb-2 text-neo-purple uppercase">
              {t('hostView.achievements')}:
            </p>
            <div className="flex flex-wrap gap-2">
              {gameAchievements.map((ach, i) => (
                <AchievementBadge key={i} achievement={ach} index={i} />
              ))}
            </div>
          </div>
        )}

        {/* XP Breakdown Card - Only for current authenticated player with XP data */}
        {isCurrentPlayer && xpGainedData && (
          <div className="relative z-10">
            <XpBreakdownCard
              xpGainedData={xpGainedData}
              levelUpData={levelUpData}
              isWinner={isWinner}
            />
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default ResultsPlayerCard;
