import React, { useState, useMemo, memo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AchievementBadge } from '../AchievementBadge';
import PlayerInsights from './PlayerInsights';
import NoWordsFoundView from './NoWordsFoundView';
import { useLanguage } from '../../contexts/LanguageContext';
import { cn } from '../../lib/utils';
import { applyHebrewFinalLetters } from '../../utils/utils';
import { calculatePlayerInsights } from '../../utils/gameInsights';
import { ChevronDown, ChevronUp, X } from 'lucide-react';
import Avatar from '../Avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import logger from '@/utils/logger';
import { POINT_COLORS } from '../../utils/consts';
import type { Avatar as AvatarType } from '@/types';

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

// Helper to safely get point color with fallback
const getPointColor = (points: number): string => {
  return POINT_COLORS[points] ?? POINT_COLORS[8] ?? 'var(--neo-pink)';
};
import XpBreakdownCard from './XpBreakdownCard';

interface WordObject {
  word: string;
  score: number;
  validated: boolean;
  isDuplicate: boolean;
  comboBonus?: number;
  isAiVerified?: boolean;
  isPendingValidation?: boolean;
  potentialScore?: number;
  invalidReason?: string;
  aiReason?: string; // AI's reason for validating/invalidating the word
  // Timestamp for pace analysis in PlayerInsights
  timestamp?: number;
  timeSinceStart?: number;
}

interface Title {
  icon: string;
  name: string;
  description: string;
}

interface GameAchievement {
  icon: string; // Required for game achievements
  key?: string;        // Unlocalized format - frontend will localize
  name?: string;       // Legacy localized format
  description?: string; // Legacy localized format
}

interface Player {
  username: string;
  score: number;
  allWords?: WordObject[];
  achievements?: GameAchievement[];
  avatar?: AvatarType & { profilePictureUrl?: string };
  title?: Title;
}

interface XpGainedData {
  xpEarned: number;
  xpBreakdown: {
    gameCompletion: number;
    scoreXp: number;
    winBonus: number;
    achievementXp: number;
  };
  newTotalXp: number;
  newLevel: number;
}

interface LevelUpData {
  oldLevel: number;
  newLevel: number;
  levelsGained: number;
  newTitles: string[];
}

interface ResultsPlayerCardProps {
  player: Player;
  index: number;
  allPlayerWords: Record<string, WordObject[]>;
  currentUsername?: string;
  isWinner: boolean;
  xpGainedData?: XpGainedData | null;
  levelUpData?: LevelUpData | null;
  /** Whether duplicate word rule is disabled (for rooms with >7 players) */
  duplicateRuleDisabled?: boolean;
}

interface WordChipProps {
  wordObj: WordObject;
  playerCount: number;
}

const WordChip = memo<WordChipProps>(({ wordObj, playerCount }) => {
  const { t } = useLanguage();
  // State for mobile tooltip - shows on tap
  const [showMobileTooltip, setShowMobileTooltip] = useState(false);

  const isDuplicate = wordObj.isDuplicate;
  const isValid = wordObj.validated;
  const isAiVerified = wordObj.isAiVerified;
  const isPending = wordObj.isPendingValidation;
  const invalidReason = wordObj.invalidReason;
  const aiReason = wordObj.aiReason;
  const displayWord = applyHebrewFinalLetters(wordObj.word);
  const comboBonus = wordObj.comboBonus || 0;

  const label = displayWord;

  // Determine the reason to display - prefer aiReason for AI-rejected words
  const displayReason = aiReason || invalidReason;

  // Check if this word should have a touchable tooltip
  const hasInvalidReason = !isValid && !isDuplicate && !isPending && displayReason;

  // Handle touch/click for mobile tooltip
  const handleTouchStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (hasInvalidReason) {
      e.preventDefault();
      e.stopPropagation();
      setShowMobileTooltip(true);
    }
  }, [hasInvalidReason]);

  const handleCloseTooltip = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowMobileTooltip(false);
  }, []);

  // Get color based on score - Neo-Brutalist solid colors
  const getBackgroundColor = (): string => {
    if (isDuplicate) return 'var(--neo-orange)';
    if (isPending) return 'var(--neo-purple)'; // Pending = purple (awaiting community vote)
    if (!isValid) return 'var(--neo-red, #ef4444)';
    return getPointColor(wordObj.score);
  };

  // Get text color based on background - ensure readability
  const getTextColor = (): string => {
    if (isDuplicate || !isValid || isPending) return 'var(--neo-cream)';
    // For cyan backgrounds (2-3 point words), use dark text for better contrast
    if (wordObj.score === 2 || wordObj.score === 3) return 'var(--neo-black)';
    return 'var(--neo-cream)';
  };

  // Render the word chip content
  const chipContent = (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-1 text-sm font-black uppercase border-2 border-neo-black rounded-neo shadow-hard-sm transition-all hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-hard",
        isDuplicate && "line-through opacity-80",
        !isDuplicate && !isValid && !isPending && "opacity-70",
        isPending && "animate-pulse",
        hasInvalidReason && "cursor-pointer active:scale-95"
      )}
      style={{
        backgroundColor: getBackgroundColor(),
        color: getTextColor(),
      }}
      onClick={handleTouchStart}
      onTouchEnd={handleTouchStart}
      role={hasInvalidReason ? "button" : undefined}
      aria-label={hasInvalidReason ? `${displayWord}: ${displayReason}` : undefined}
      tabIndex={hasInvalidReason ? 0 : undefined}
    >
      {label}
      {/* Show info icon for invalid words with reason - indicates it's tappable */}
      {hasInvalidReason && (
        <span className="text-[10px] px-1 py-0.5 bg-neo-cream/20 rounded border border-neo-cream/30 font-black">
          ℹ️
        </span>
      )}
      {/* Show combo bonus indicator */}
      {comboBonus > 0 && !isDuplicate && isValid && (
        <span className="text-[10px] px-1 py-0.5 bg-neo-yellow text-neo-black rounded border border-neo-black font-black">
          +{comboBonus}
        </span>
      )}
      {/* Show pending validation indicator */}
      {isPending && !isDuplicate && (
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-[10px] px-1 py-0.5 bg-neo-yellow text-neo-black rounded border border-neo-black font-black cursor-help">
                ?
              </span>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              className="bg-neo-purple border-2 border-neo-black shadow-hard rounded-neo p-2"
            >
              <p className="text-xs font-bold text-neo-cream">
                {t('results.pendingValidation') || 'Pending community validation'}
                {wordObj.potentialScore && (
                  <span className="block text-neo-yellow mt-1">
                    {t('results.potentialScore', { score: String(wordObj.potentialScore) }) || `+${wordObj.potentialScore} pts if approved`}
                  </span>
                )}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      {/* Show AI verification indicator with reason tooltip */}
      {isAiVerified && isValid && !isDuplicate && (
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-[10px] px-1 py-0.5 bg-neo-purple text-neo-cream rounded border border-neo-black font-black cursor-help">
                AI
              </span>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              className="bg-neo-purple border-2 border-neo-black shadow-hard rounded-neo p-2 max-w-[250px]"
            >
              <p className="text-xs font-bold text-neo-cream">{t('results.aiVerified') || 'Verified by AI'}</p>
              {aiReason && (
                <p className="text-xs text-neo-yellow mt-1">{aiReason}</p>
              )}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </span>
  );

  return (
    <div className="relative group">
      {/* Desktop: Show tooltip on hover for invalid words */}
      {hasInvalidReason ? (
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              {chipContent}
            </TooltipTrigger>
            <TooltipContent
              side="top"
              className="bg-neo-red border-2 border-neo-black shadow-hard rounded-neo p-2 max-w-[250px] hidden sm:block"
            >
              {isAiVerified && (
                <p className="text-[10px] font-bold text-neo-yellow mb-1 flex items-center gap-1">
                  <span className="px-1 py-0.5 bg-neo-purple rounded border border-neo-black">AI</span>
                  {t('results.aiRejected') || 'Rejected by AI'}
                </p>
              )}
              <p className="text-xs font-bold text-neo-cream">{displayReason}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        chipContent
      )}

      {/* Mobile: Show tooltip popup when tapped */}
      <AnimatePresence>
        {showMobileTooltip && hasInvalidReason && (
          <>
            {/* Backdrop to close tooltip on tap outside */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-black/20"
              onClick={handleCloseTooltip}
              onTouchEnd={handleCloseTooltip}
            />
            {/* Tooltip popup - positioned in viewport center on mobile to avoid edge overflow */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.15 }}
              className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[101] w-[min(280px,calc(100vw-32px))]"
            >
              <div className="bg-neo-red border-3 border-neo-black shadow-hard-lg rounded-neo p-3 relative">
                {/* Close button */}
                <button
                  onClick={handleCloseTooltip}
                  onTouchEnd={handleCloseTooltip}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-neo-cream border-2 border-neo-black rounded-full flex items-center justify-center shadow-hard-sm"
                  aria-label="Close"
                >
                  <X className="w-3 h-3 text-neo-black" />
                </button>

                {/* Word being explained */}
                <p className="text-sm font-black text-neo-cream uppercase mb-2 border-b border-neo-cream/30 pb-1">
                  "{displayWord}"
                </p>

                {/* AI rejection indicator */}
                {isAiVerified && (
                  <p className="text-[11px] font-bold text-neo-yellow mb-2 flex items-center gap-1">
                    <span className="px-1.5 py-0.5 bg-neo-purple rounded border border-neo-black text-neo-cream">AI</span>
                    {t('results.aiRejected') || 'Rejected by AI'}
                  </p>
                )}

                {/* Reason */}
                <p className="text-sm font-bold text-neo-cream leading-snug">
                  {displayReason}
                </p>

                {/* Tap hint */}
                <p className="text-[10px] text-neo-cream/60 mt-2 text-center">
                  {t('results.tapToClose') || 'Tap anywhere to close'}
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {isDuplicate && playerCount > 1 && (
        <span className="absolute -top-2 end-[-8px] bg-neo-black text-neo-cream text-[10px] px-1.5 py-0.5 min-w-[18px] h-[18px] flex items-center justify-center font-black border-2 border-neo-black rounded-neo">
          {playerCount}
        </span>
      )}
    </div>
  );
});

WordChip.displayName = 'WordChip';

const ResultsPlayerCard: React.FC<ResultsPlayerCardProps> = ({ player, index, allPlayerWords, currentUsername, isWinner, xpGainedData, levelUpData, duplicateRuleDisabled }) => {
  const { t, dir } = useLanguage();
  // Arrow direction for level up indicator - flip for RTL
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
  const { duplicateWords, invalidWords, wordsByPoints, sortedPointGroups, totalComboBonus } = useMemo(() => {
    if (!player.allWords || player.allWords.length === 0) {
      return { duplicateWords: [], invalidWords: [], wordsByPoints: {}, sortedPointGroups: [], totalComboBonus: 0 };
    }

    const duplicateWords = player.allWords.filter(w => w && w.isDuplicate);
    const invalidWords = player.allWords.filter(w => w && !w.isDuplicate && !w.validated);
    const validWords = player.allWords.filter(w => w && !w.isDuplicate && w.validated);

    // Calculate total combo bonus from all valid non-duplicate words
    const totalComboBonus = validWords.reduce((sum, w) => sum + (w.comboBonus || 0), 0);

    // Debug logging for combo bonus calculation
    if (totalComboBonus > 0) {
      logger.log(`[RESULTS] ${player.username} combo bonus: ${totalComboBonus} from ${validWords.filter(w => (w.comboBonus ?? 0) > 0).length} words with bonuses`);
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

    return { duplicateWords, invalidWords, wordsByPoints, sortedPointGroups, totalComboBonus };
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

  // Determine rank styling
  const getRankIcon = (): string => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `#${index + 1}`;
  };

  // Neo-Brutalist rank box styling - solid colors, no gradients
  const getRankBoxStyle = (): string => {
    if (index === 0) {
      // Gold
      return 'bg-neo-yellow border-neo-black';
    }
    if (index === 1) {
      // Silver
      return 'bg-slate-300 border-neo-black';
    }
    if (index === 2) {
      // Bronze
      return 'bg-neo-orange border-neo-black';
    }
    return 'bg-neo-cream border-neo-black';
  };

  // Neo-Brutalist card styling - solid colors, hard shadows
  const getCardStyle = (): string => {
    if (index === 0) return 'bg-neo-yellow border-neo-black';
    if (index === 1) return 'bg-slate-200 border-neo-black';
    if (index === 2) return 'bg-neo-orange border-neo-black';
    return 'bg-neo-cream border-neo-black';
  };

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
          "p-4 sm:p-5 md:p-6 border-4 transition-all duration-200 rounded-neo-lg shadow-hard-lg relative overflow-hidden",
          "hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-hard-xl",
          getCardStyle(),
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
                "w-10 h-10 sm:w-12 sm:h-12 rounded-neo flex items-center justify-center text-xl sm:text-2xl font-black border-3 shadow-hard-sm flex-shrink-0",
                getRankBoxStyle()
              )}>
                {getRankIcon()}
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
                <span className="text-xs font-black">🔥 {t('results.comboBonus')}: +{totalComboBonus}</span>
              </motion.div>
            )}

            {/* XP Earned - Only for current player with XP data */}
            {isCurrentPlayer && xpGainedData && (
              <motion.div
                initial={{ scale: 0, opacity: 0, x: -20 }}
                animate={{ scale: 1, opacity: 1, x: 0 }}
                transition={{ delay: 0.3, type: 'spring', stiffness: 300 }}
                className="bg-gradient-to-r from-neo-purple to-neo-pink border-2 border-neo-black rounded-neo px-2 py-0.5 shadow-hard-sm text-neo-cream flex items-center gap-1"
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
        <div className="mb-3 relative z-10">
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
                <div className="space-y-3 pt-3">
                  {/* Valid Words Grouped by Points - Neo-Brutalist */}
                  {sortedPointGroups.length > 0 && (
                    <div className="bg-neo-cream dark:bg-slate-800 rounded-neo p-3 border-3 border-neo-black shadow-hard-sm">
                      <div className="text-sm font-black text-neo-black dark:text-neo-cream mb-3 flex items-center gap-2 uppercase">
                        <span className="bg-neo-cyan text-neo-black px-2 py-0.5 rounded-neo border-2 border-neo-black">✓</span>
                        {t('results.validWords') || 'Valid Words'} ({Object.values(wordsByPoints).flat().length})
                      </div>
                      <div className="space-y-2">
                        {sortedPointGroups.map(points => {
                          const wordsForPoints = wordsByPoints[points] ?? [];
                          return (
                          <div key={`points-${points}`} className="rounded-neo p-2 border-l-4 border-neo-black bg-white/50 dark:bg-slate-700/50" style={{ borderLeftColor: getPointColor(points) }}>
                            <div className="text-xs font-black mb-1.5 flex items-center gap-2 text-neo-black dark:text-neo-cream uppercase">
                              <span className="px-2 py-0.5 rounded-neo flex items-center justify-center font-black text-xs border-2 border-neo-black"
                                    style={{
                                      backgroundColor: getPointColor(points),
                                      color: (points === 2 || points === 3) ? 'var(--neo-black)' : 'var(--neo-cream)'
                                    }}>
                                {points} {t('results.points') || 'pts'}
                              </span>
                              <span>{wordsForPoints.length} {t('hostView.words') || 'words'}</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {wordsForPoints.map((wordObj, i) => (
                                <WordChip
                                  key={`${points}-${i}`}
                                  wordObj={wordObj}
                                  playerCount={getPlayerCountForWord(wordObj.word)}
                                />
                              ))}
                            </div>
                          </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Duplicate Words - Neo-Brutalist */}
                  {duplicateWords.length > 0 && (
                    <div className="bg-neo-cream dark:bg-slate-800 rounded-neo p-3 border-3 border-neo-black shadow-hard-sm">
                      <div className="text-sm font-black text-neo-black dark:text-neo-cream mb-2 flex items-center gap-2 uppercase">
                        <span className="bg-neo-orange text-neo-black px-2 py-0.5 rounded-neo border-2 border-neo-black">👥</span>
                        {t('results.shared') || 'Shared Words'} ({duplicateWords.length})
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {duplicateWords.map((wordObj, i) => (
                          <WordChip
                            key={`duplicate-${i}`}
                            wordObj={wordObj}
                            playerCount={getPlayerCountForWord(wordObj.word)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Invalid Words - Neo-Brutalist */}
                  {invalidWords.length > 0 && (
                    <div className="bg-neo-cream dark:bg-slate-800 rounded-neo p-3 border-3 border-neo-black shadow-hard-sm">
                      <div className="text-sm font-black text-neo-black/70 dark:text-neo-cream/70 mb-2 flex items-center gap-2 uppercase">
                        <span className="bg-neo-gray text-neo-cream px-2 py-0.5 rounded-neo border-2 border-neo-black">✗</span>
                        {t('results.invalid') || 'Invalid Words'} ({invalidWords.length})
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {invalidWords.map((wordObj, i) => (
                          <WordChip
                            key={`invalid-${i}`}
                            wordObj={wordObj}
                            playerCount={getPlayerCountForWord(wordObj.word)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
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
