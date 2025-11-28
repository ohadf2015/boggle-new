import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import { AchievementBadge } from '../AchievementBadge';
import { useLanguage } from '../../contexts/LanguageContext';
import { cn } from '../../lib/utils';
import { applyHebrewFinalLetters } from '../../utils/utils';
import { ChevronDown, ChevronUp } from 'lucide-react';

// Color mapping based on points - using game theme colors (cyan/teal/purple spectrum)
// Intensity increases with points for intuitive visual hierarchy
const POINT_COLORS = {
  1: '#64748B',  // slate-500 - 2 letters (neutral, lowest value)
  2: '#06B6D4',  // cyan-500 - 3 letters
  3: '#0891B2',  // cyan-600 - 4 letters
  4: '#0D9488',  // teal-600 - 5 letters
  5: '#7C3AED',  // violet-600 - 6 letters
  6: '#9333EA',  // purple-600 - 7 letters
  7: '#A855F7',  // purple-500 - 8 letters (brighter for highlight)
  8: '#C026D3',  // fuchsia-600 - 9+ letters (premium/rare)
};

const WordChip = ({ wordObj, playerCount }) => {
  const isDuplicate = wordObj.isDuplicate;
  const isValid = wordObj.validated;
  const displayWord = applyHebrewFinalLetters(wordObj.word);

  const label = displayWord;

  // Get color based on score
  const getBackgroundColor = () => {
    if (isDuplicate) return undefined;
    if (!isValid) return undefined;
    return POINT_COLORS[wordObj.score] || POINT_COLORS[8];
  };

  return (
    <div className="relative group">
      <Badge
        className={cn(
          "font-bold transition-all duration-200 hover:scale-105",
          isDuplicate && "bg-orange-500 text-white opacity-70 line-through",
          !isDuplicate && isValid && "text-white shadow-md",
          !isDuplicate && !isValid && "bg-gray-400 text-white opacity-70"
        )}
        style={{
          backgroundColor: getBackgroundColor()
        }}
      >
        {label}
      </Badge>
      {isDuplicate && playerCount > 1 && (
        <Badge className="absolute -top-2 end-[-8px] bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[10px] px-1.5 py-0 min-w-[18px] h-[18px] flex items-center justify-center font-bold shadow-lg border border-orange-400/50 hover:scale-110 transition-transform">
          {playerCount}
        </Badge>
      )}
    </div>
  );
};

const ResultsPlayerCard = ({ player, index, allPlayerWords, currentUsername, isWinner }) => {
  const { t } = useLanguage();
  // Auto-expand all players' words by default
  const [isWordsExpanded, setIsWordsExpanded] = useState(true);

  const handleToggleExpand = () => {
    setIsWordsExpanded(!isWordsExpanded);
  };

  // Extract avatar info if available
  const avatar = player.avatar || null;

  // Check if this is the current player
  const isCurrentPlayer = currentUsername && player.username === currentUsername;

  // Memoize expensive word categorization and grouping at component level (not inside JSX)
  const { duplicateWords, invalidWords, wordsByPoints, sortedPointGroups } = useMemo(() => {
    if (!player.allWords || player.allWords.length === 0) {
      return { duplicateWords: [], invalidWords: [], wordsByPoints: {}, sortedPointGroups: [] };
    }

    const duplicateWords = player.allWords.filter(w => w && w.isDuplicate);
    const invalidWords = player.allWords.filter(w => w && !w.isDuplicate && !w.validated);
    const validWords = player.allWords.filter(w => w && !w.isDuplicate && w.validated);

    // Group valid words by points
    const wordsByPoints = {};
    validWords.forEach(wordObj => {
      const points = wordObj.score || 0;
      if (!wordsByPoints[points]) {
        wordsByPoints[points] = [];
      }
      wordsByPoints[points].push(wordObj);
    });

    // Sort words alphabetically within each point group
    Object.keys(wordsByPoints).forEach(points => {
      wordsByPoints[points].sort((a, b) => a.word.localeCompare(b.word));
    });

    // Sort duplicate and invalid words alphabetically
    duplicateWords.sort((a, b) => a.word.localeCompare(b.word));
    invalidWords.sort((a, b) => a.word.localeCompare(b.word));

    // Sort point groups in descending order
    const sortedPointGroups = Object.keys(wordsByPoints)
      .map(Number)
      .sort((a, b) => b - a);

    return { duplicateWords, invalidWords, wordsByPoints, sortedPointGroups };
  }, [player.allWords]);
  const showWinnerMessage = isCurrentPlayer && isWinner;

  // Calculate how many players found each word
  const getPlayerCountForWord = (word) => {
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
  const getRankIcon = () => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `#${index + 1}`;
  };

  // Get rank box styling based on position - gold/silver/bronze
  const getRankBoxStyle = () => {
    if (index === 0) {
      // Gold
      return 'bg-gradient-to-br from-yellow-300 via-yellow-400 to-amber-500 border border-yellow-500 shadow-lg';
    }
    if (index === 1) {
      // Silver
      return 'bg-gradient-to-br from-slate-200 via-slate-300 to-slate-400 border border-slate-400 shadow-lg';
    }
    if (index === 2) {
      // Bronze
      return 'bg-gradient-to-br from-amber-500 via-orange-600 to-amber-700 border border-amber-600 shadow-lg';
    }
    return 'bg-slate-200 dark:bg-slate-600 border border-slate-300 dark:border-slate-500';
  };

  // Get card gradient based on rank - gold/silver/bronze styling with glow
  const getCardStyle = () => {
    if (index === 0) return 'bg-gradient-to-br from-yellow-100 via-amber-300 to-yellow-500 dark:from-yellow-200/60 dark:via-amber-400/50 dark:to-yellow-600/40 border-yellow-400 shadow-[0_0_30px_rgba(234,179,8,0.6),inset_0_1px_0_rgba(255,255,255,0.5)]';
    if (index === 1) return 'bg-gradient-to-br from-slate-100 via-gray-300 to-slate-400 dark:from-slate-200/60 dark:via-gray-300/50 dark:to-slate-500/40 border-slate-400 shadow-[0_0_25px_rgba(148,163,184,0.5),inset_0_1px_0_rgba(255,255,255,0.5)]';
    if (index === 2) return 'bg-gradient-to-br from-orange-200 via-amber-400 to-orange-600 dark:from-orange-300/60 dark:via-amber-500/50 dark:to-orange-700/40 border-orange-500 shadow-[0_0_25px_rgba(234,88,12,0.5),inset_0_1px_0_rgba(255,255,255,0.5)]';
    return 'bg-gradient-to-br from-slate-100 via-indigo-50 to-purple-100 dark:from-slate-700/60 dark:via-indigo-900/40 dark:to-purple-900/30 border-indigo-300/50 dark:border-indigo-600/40 shadow-[0_0_15px_rgba(99,102,241,0.2),inset_0_1px_0_rgba(255,255,255,0.3)]';
  };

  return (
    <motion.div
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ delay: Math.min(index * 0.05, 0.3), duration: 0.3 }}
    >
      <Card
        className={cn(
          "p-4 sm:p-5 md:p-6 border-2 transition-all duration-300 rounded-xl shadow-lg hover:shadow-xl relative overflow-hidden",
          getCardStyle(),
          isWordsExpanded && "ring-2 ring-purple-400/50"
        )}
      >
        {/* Animated glass glare effect */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none"
          initial={{ x: '-100%', opacity: 0 }}
          animate={{ x: '200%', opacity: 1 }}
          transition={{
            duration: 1.5,
            delay: index * 0.2,
            ease: 'easeInOut',
          }}
        />
        {/* Static glare overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent pointer-events-none" />
        {/* Header: Rank, Name, Score */}
        <div className="flex justify-between items-center mb-3 sm:mb-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center text-2xl font-bold",
              getRankBoxStyle()
            )}>
              {getRankIcon()}
            </div>
            {avatar?.emoji && (
              <div className="text-3xl" style={{ imageRendering: 'crisp-edges' }}>
                {avatar.emoji}
              </div>
            )}
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                <span>{player.username}</span>
                {isCurrentPlayer && (
                  <span className="text-sm text-cyan-600 dark:text-cyan-400">({t('playerView.me')})</span>
                )}
                {showWinnerMessage && (
                  <motion.span
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
                    className="text-sm font-bold text-yellow-600 dark:text-yellow-400"
                  >
                    🎉 {t('results.youWon')} 🎉
                  </motion.span>
                )}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {player.validWordCount !== undefined && `${player.validWordCount} ${t('results.valid')}`}
              </p>
            </div>
          </div>
          <div
            className={cn(
              "text-4xl font-black drop-shadow-lg",
              index === 0 && "text-yellow-700 dark:text-yellow-300",
              index === 1 && "text-slate-600 dark:text-slate-200",
              index === 2 && "text-orange-700 dark:text-orange-300",
              index > 2 && "text-slate-700 dark:text-slate-300"
            )}
          >
            {player.score}
          </div>
        </div>

        {/* Longest Word */}
        {player.longestWord && (
          <div className="mb-3 p-2 rounded-lg bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800 relative z-10">
            <p className="text-sm text-slate-700 dark:text-slate-300">
              <span className="font-bold text-cyan-600 dark:text-cyan-400">{t('playerView.longestWord')}:</span>
              <span className="ml-2 text-lg font-bold text-cyan-700 dark:text-cyan-300">{applyHebrewFinalLetters(player.longestWord)}</span>
            </p>
          </div>
        )}

        {/* Words Section - Always show, collapsible */}
        <div className="mb-3 relative z-10">
          <button
            onClick={handleToggleExpand}
            className="w-full flex items-center justify-between p-2 rounded-lg text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 transition-all"
          >
            <span>{t('hostView.words')}: ({player.allWords?.length || 0})</span>
            {isWordsExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
          <AnimatePresence>
            {isWordsExpanded && player.allWords && player.allWords.length > 0 && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="space-y-3 pt-2">
                  {/* Valid Words Grouped by Points - Clean Layout */}
                  {sortedPointGroups.length > 0 && (
                    <div className="bg-white/40 dark:bg-black/20 rounded-lg p-3 border border-black/10 dark:border-white/10">
                      <div className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
                        <span className="text-cyan-600 dark:text-cyan-400">✓</span>
                        {t('results.validWords') || 'Valid Words'} ({Object.values(wordsByPoints).flat().length})
                      </div>
                      <div className="space-y-2">
                        {sortedPointGroups.map(points => (
                          <div key={`points-${points}`} className="rounded-lg p-2 border-l-4 bg-white/50 dark:bg-white/5" style={{ borderLeftColor: POINT_COLORS[points] || POINT_COLORS[8] }}>
                            <div className="text-xs font-semibold mb-1.5 flex items-center gap-2 text-slate-600 dark:text-slate-300">
                              <span className="px-2 py-0.5 rounded flex items-center justify-center text-white font-bold text-xs"
                                    style={{ backgroundColor: POINT_COLORS[points] || POINT_COLORS[8] }}>
                                {points} {t('results.points') || 'pts'}
                              </span>
                              <span>{wordsByPoints[points].length} {t('hostView.words') || 'words'}</span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {wordsByPoints[points].map((wordObj, i) => (
                                <WordChip
                                  key={`${points}-${i}`}
                                  wordObj={wordObj}
                                  playerCount={getPlayerCountForWord(wordObj.word)}
                                />
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Duplicate Words */}
                  {duplicateWords.length > 0 && (
                    <div className="bg-white/40 dark:bg-black/20 rounded-lg p-3 border border-black/10 dark:border-white/10">
                      <div className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-2 flex items-center gap-2">
                        <span className="text-amber-500">👥</span>
                        {t('results.shared') || 'Shared Words'} ({duplicateWords.length})
                      </div>
                      <div className="flex flex-wrap gap-1">
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

                  {/* Invalid Words */}
                  {invalidWords.length > 0 && (
                    <div className="bg-white/40 dark:bg-black/20 rounded-lg p-3 border border-black/10 dark:border-white/10">
                      <div className="text-sm font-bold text-slate-600 dark:text-slate-300 mb-2 flex items-center gap-2">
                        <span className="text-slate-400">✗</span>
                        {t('results.invalid') || 'Invalid Words'} ({invalidWords.length})
                      </div>
                      <div className="flex flex-wrap gap-1">
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
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Achievements Section */}
        {player.achievements && player.achievements.length > 0 && (
          <div className="mt-3 pt-2 sm:mt-4 sm:pt-3 border-t border-slate-200 dark:border-slate-700 relative z-10">
            <p className="text-sm font-bold mb-2 text-purple-600 dark:text-purple-400">
              {t('hostView.achievements')}:
            </p>
            <div className="flex flex-wrap gap-2">
              {player.achievements.map((ach, i) => (
                <AchievementBadge key={i} achievement={ach} index={i} />
              ))}
            </div>
          </div>
        )}
      </Card>
    </motion.div>
  );
};

export default ResultsPlayerCard;
