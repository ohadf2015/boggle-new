import React, { useState, useMemo, memo, useCallback } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { AchievementBadge } from '../AchievementBadge';

import NoWordsFoundView from './NoWordsFoundView';
import { useLanguage } from '../../contexts/LanguageContext';
import { cn } from '../../lib/utils';
import { applyHebrewFinalLetters } from '../../utils/utils';

import { ChevronDown, ChevronUp, Award } from 'lucide-react';
import Avatar from '../Avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import logger from '@/utils/logger';

import PlayerArchetypeBadge from './PlayerArchetypeBadge';
import { WordPointsGroup, SharedWordsSection, InvalidWordsSection } from './WordPointsGroup';
import { getCardStyle } from '../../utils/rankingStyles';
import { filterGameAchievements } from './utils';
import type { WordObject, ResultsPlayerCardProps } from './types';

const ResultsPlayerCard: React.FC<ResultsPlayerCardProps> = memo(({ player, index, allPlayerWords, currentUsername, isWinner, archetype, compact = false }) => {
  const { t } = useLanguage();

  // Check if this is the current player
  const isCurrentPlayer = currentUsername && player.username === currentUsername;

  // Don't auto-expand - current player has ConsolidatedPlayerCard above
  const [isWordsExpanded, setIsWordsExpanded] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);

  const handleToggleExpand = useCallback(() => {
    setIsWordsExpanded(prev => !prev);
  }, []);

  // Extract avatar info if available
  const avatar = player.avatar || null;

  // Memoize expensive word categorization and grouping at component level (not inside JSX)
  const { duplicateWords, invalidWords, validWords: _validWords, wordsByPoints, sortedPointGroups, totalComboBonus, totalFireRoundBonus, summaryStats } = useMemo(() => {
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

  // Filter out lifetime achievements and validate against player's actual round stats
  // This prevents showing stale achievements from previous games
  const gameAchievements = useMemo(() => {
    return filterGameAchievements(player.achievements || [], player.allWords);
  }, [player.achievements, player.allWords]);

  const showWinnerMessage = isCurrentPlayer && isWinner;

  // Calculate how many players found each word - memoized to prevent recalculation
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

  // Use centralized ranking utilities
  const cardStyleClass = getCardStyle(index);

  return (
    <m.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: Math.min(index * 0.05, 0.3), type: 'spring', stiffness: 300, damping: 26 }}
      style={compact ? undefined : { transform: `rotate(${index % 2 === 0 ? 1 : -1}deg)` }}
    >
      {/* Neo-Brutalist Card */}
      <div
        className={cn(
          "transition-all duration-200 rounded-neo-lg relative overflow-hidden",
          compact
            ? "p-2 border-2 shadow-hard-sm"
            : "p-3 sm:p-4 border-4 shadow-hard-lg hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-hard-xl",
          cardStyleClass,
          isWordsExpanded && "ring-4 ring-neo-cyan"
        )}
      >
        {/* Halftone texture removed - only on body background */}
        <div
          className={cn(
            "absolute inset-0 pointer-events-none",
            "opacity-0" // Texture disabled - only appears on body background
          )}
        />
        {/* Header: Rank, Name, Score - Neo-Brutalist - Organized */}
        <div className="relative z-10">
          {/* Main row: Avatar, Username (no rank/score for secondary cards) */}
          <div className={cn("flex items-center justify-between gap-2 sm:gap-3", compact ? "mb-1" : "mb-3")}>
            {/* Left: Avatar + Username with key badges */}
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Avatar
                userId={player.username}
                customAvatar={avatar?.customAvatar}
                size={compact ? "md" : "2xl"}
                className="shrink-0"
              />
              <div className="flex flex-col gap-1 min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className={cn("font-black text-neo-black truncate", compact ? "text-sm" : "text-base sm:text-xl")} title={player.username}>
                    {player.username}
                  </h3>
                  {isCurrentPlayer && !showWinnerMessage && (
                    <span className="text-xs bg-neo-black text-neo-white px-1.5 py-0.5 rounded-neo font-bold">
                      ({t('playerView.me')})
                    </span>
                  )}
                  {showWinnerMessage && (
                    <m.span
                      initial={{ scale: 0, opacity: 0, rotate: -5 }}
                      animate={{ scale: 1, opacity: 1, rotate: 3 }}
                      transition={{ delay: 0.3, type: 'spring', stiffness: 400, damping: 22 }}
                      className="text-xs font-black bg-neo-pink text-neo-white px-1.5 py-0.5 rounded-neo border-2 border-neo-black"
                    >
                      {t('results.youWon')}
                    </m.span>
                  )}
                </div>
                {/* Title badge and Archetype badge - secondary row */}
                <div className="flex items-center gap-2 flex-wrap">
                  {player.title && (
                    <TooltipProvider delayDuration={0}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <m.div
                            initial={{ scale: 0, opacity: 0, x: -10 }}
                            animate={{ scale: 1, opacity: 1, x: 0 }}
                            transition={{ delay: 0.4, type: 'spring', stiffness: 300, damping: 26 }}
                            className="flex items-center gap-1 cursor-help bg-neo-black px-1.5 py-0.5 rounded-neo border border-neo-black w-fit"
                          >
                            <span className="text-sm">{player.title.icon}</span>
                            <span className="text-xs font-black text-neo-pink uppercase tracking-wide">
                              {player.title.name}
                            </span>
                          </m.div>
                        </TooltipTrigger>
                        <TooltipContent
                          side="bottom"
                          className="bg-neo-pink text-white border-2 border-neo-black shadow-hard rounded-neo p-2"
                        >
                          <p className="text-xs font-bold text-neo-white">{player.title.description}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  {/* Show archetype only for other players - current player has it in ConsolidatedPlayerCard */}
                  {archetype && !isCurrentPlayer && (
                    <PlayerArchetypeBadge archetype={archetype} size="sm" showTooltip={true} />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Stats row - condensed (only show bonuses for other players - current player has them in ConsolidatedPlayerCard) */}
          {!isCurrentPlayer && (totalComboBonus > 0 || totalFireRoundBonus > 0) && (
            <div className="flex items-center gap-2 flex-wrap">
              {/* Combo bonus */}
              {totalComboBonus > 0 && (
                <m.div
                  initial={{ scale: 0, rotate: -10 }}
                  animate={{ scale: 1, rotate: 3 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 300, damping: 26 }}
                  className="bg-neo-lime border-2 border-neo-black rounded-neo px-2 py-0.5 shadow-hard-sm text-neo-black flex items-center gap-1"
                >
                  <span className="text-xs font-black">⚡ +{totalComboBonus}</span>
                </m.div>
              )}

              {/* Fire Round Bonus */}
              {totalFireRoundBonus > 0 && (
                <m.div
                  initial={{ scale: 0, rotate: -10 }}
                  animate={{ scale: 1, rotate: 3 }}
                  transition={{ delay: 0.25, type: 'spring', stiffness: 300, damping: 26 }}
                  className="bg-neo-red border-2 border-neo-black rounded-neo px-2 py-0.5 shadow-hard-sm text-neo-white flex items-center gap-1"
                >
                  <span className="text-xs font-black">🔥 +{totalFireRoundBonus}</span>
                </m.div>
              )}
            </div>
          )}
        </div>


        {/* Words Section - Always show, collapsible - Neo-Brutalist */}
        <div className="mb-2 relative z-10">
          <button
            onClick={handleToggleExpand}
            className="w-full flex items-center justify-between p-2 rounded-neo text-sm font-black text-neo-black dark:text-neo-white uppercase border-2 border-neo-black bg-neo-cream dark:bg-neo-navy-elevated shadow-hard-sm hover:-translate-x-px hover:-translate-y-px hover:shadow-hard transition-all"
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
              <m.div
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
                    <m.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 26 }}
                      className="bg-neo-navy-light border-2 border-neo-cyan rounded-neo p-2"
                    >
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <div className="text-xl sm:text-2xl font-black text-white">
                            {summaryStats.validCount}
                          </div>
                          <div className="text-[10px] sm:text-xs uppercase text-white font-bold">
                            {t('results.validWords')}
                          </div>
                        </div>
                        <div>
                          <div className="text-lg sm:text-xl font-black text-white uppercase">
                            {summaryStats.longestWord}
                          </div>
                          <div className="text-[10px] sm:text-xs uppercase text-white font-bold">
                            {t('results.longest')}
                          </div>
                        </div>
                        <div>
                          <div className="text-xl sm:text-2xl font-black text-white">
                            {summaryStats.accuracy}%
                          </div>
                          <div className="text-[10px] sm:text-xs uppercase text-white font-bold">
                            {t('results.accuracy')}
                          </div>
                        </div>
                      </div>
                    </m.div>
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
              </m.div>
            )}
          </AnimatePresence>
        </div>

        {/* Player Insights - Disabled for current player (shown in ConsolidatedPlayerCard above) */}

        {/* Collapsible Achievements Section - Only for other players (current player has it in ConsolidatedPlayerCard) */}
        {gameAchievements.length > 0 && !isCurrentPlayer && (
          <div className="mt-2 relative z-10">
            <button
              onClick={() => setShowAchievements(!showAchievements)}
              aria-expanded={showAchievements}
              className="w-full flex items-center justify-between p-2 rounded-neo text-sm font-black text-neo-black dark:text-neo-white uppercase border-2 border-neo-black bg-neo-lime/20 dark:bg-neo-lime/10 shadow-hard-sm hover:-translate-x-px hover:-translate-y-px hover:shadow-hard transition-all"
            >
              <span className="flex items-center gap-2">
                <Award className="w-4 h-4 text-neo-pink" />
                {t('hostView.achievements')} ({gameAchievements.length})
              </span>
              {showAchievements ? (
                <ChevronUp className="w-5 h-5" />
              ) : (
                <ChevronDown className="w-5 h-5" />
              )}
            </button>
            <AnimatePresence>
              {showAchievements && (
                <m.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-wrap gap-2 pt-2">
                    {gameAchievements.map((ach, i) => (
                      <AchievementBadge key={ach.key || ach.name || `ach-${i}`} achievement={ach} index={i} />
                    ))}
                  </div>
                </m.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* XP Breakdown - Disabled for current player (shown in ConsolidatedPlayerCard above) */}
      </div>
    </m.div>
  );
});

ResultsPlayerCard.displayName = 'ResultsPlayerCard';

export default ResultsPlayerCard;
