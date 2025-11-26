import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import { AchievementBadge } from '../AchievementBadge';
import { useLanguage } from '../../contexts/LanguageContext';
import { cn } from '../../lib/utils';
import { applyHebrewFinalLetters } from '../../utils/utils';
import { ChevronDown, ChevronUp } from 'lucide-react';

// Color mapping based on points
const POINT_COLORS = {
  1: '#94A3B8',  // slate-400 - 2 letters
  2: '#60A5FA',  // blue-400 - 3 letters
  3: '#34D399',  // green-400 - 4 letters
  4: '#F59E0B',  // amber-500 - 5 letters
  5: '#EC4899',  // pink-500 - 6 letters
  6: '#8B5CF6',  // violet-500 - 7 letters
  7: '#EF4444',  // red-500 - 8 letters
  8: '#06B6D4',  // cyan-500 - 9+ letters
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
        <span className="absolute -top-2 end-[-8px] bg-orange-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold shadow-md">
          {playerCount}
        </span>
      )}
    </div>
  );
};

const ResultsPlayerCard = ({ player, index, allPlayerWords, currentUsername, isWinner }) => {
  const { t, dir } = useLanguage();
  // Auto-expand all players' words by default
  const [isWordsExpanded, setIsWordsExpanded] = useState(true);

  // Extract avatar info if available
  const avatar = player.avatar || null;

  // Check if this is the current player
  const isCurrentPlayer = currentUsername && player.username === currentUsername;

  // Memoize expensive word categorization and grouping at component level (not inside JSX)
  const { duplicateWords, invalidWords, wordsByPoints, sortedPointGroups, totalValidScore } = useMemo(() => {
    if (!player.allWords || player.allWords.length === 0) {
      return { duplicateWords: [], invalidWords: [], wordsByPoints: {}, sortedPointGroups: [], totalValidScore: 0 };
    }

    const duplicateWords = player.allWords.filter(w => w && w.isDuplicate);
    const invalidWords = player.allWords.filter(w => w && !w.isDuplicate && !w.validated);
    const validWords = player.allWords.filter(w => w && !w.isDuplicate && w.validated);

    // Group valid words by points
    const wordsByPoints = {};
    let totalValidScore = 0;
    validWords.forEach(wordObj => {
      const points = wordObj.score || 0;
      totalValidScore += points;
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

    return { duplicateWords, invalidWords, wordsByPoints, sortedPointGroups, totalValidScore };
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

  const getCardStyle = () => {
    if (index === 0) return 'bg-gradient-to-br from-yellow-500/25 to-orange-500/25 border-yellow-500/60 shadow-[0_0_20px_rgba(234,179,8,0.4)]';
    if (index === 1) return 'bg-gradient-to-br from-gray-400/25 to-gray-500/25 border-gray-400/60 shadow-[0_0_15px_rgba(156,163,175,0.3)]';
    if (index === 2) return 'bg-gradient-to-br from-orange-500/25 to-orange-600/25 border-orange-500/60 shadow-[0_0_15px_rgba(249,115,22,0.3)]';
    return 'bg-white/30 dark:bg-slate-800/30 border-slate-300/70 dark:border-slate-600/70';
  };

  return (
    <motion.div
      initial={{ x: -30, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ delay: index * 0.08, type: 'spring', stiffness: 120 }}
      whileHover={{ scale: 1.02, y: -4, transition: { duration: 0.2 } }}
    >
      <Card
        className={cn(
          "p-4 sm:p-5 md:p-6 border-2 transition-all duration-300 rounded-xl shadow-lg hover:shadow-xl relative overflow-hidden",
          !avatar?.color && getCardStyle(),
          isWordsExpanded && "ring-2 ring-purple-400/50 shadow-[0_0_20px_rgba(168,85,247,0.3)]"
        )}
        style={avatar?.color ? {
          background: `linear-gradient(135deg, ${avatar.color}30, ${avatar.color}50)`,
          borderColor: `${avatar.color}80`
        } : {}}
      >
        {/* Glass glare effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent pointer-events-none" />
        {/* Header: Rank, Name, Score */}
        <div className="flex justify-between items-center mb-3 sm:mb-4 relative z-10">
          <div className="flex items-center gap-3">
            <motion.div
              animate={index < 3 ? {
                rotate: dir === 'rtl' ? [0, 10, -10, 10, 0] : [0, -10, 10, -10, 0]
              } : {}}
              transition={index < 3 ? { duration: 2, repeat: Infinity, repeatDelay: 5 } : {}}
              className="text-3xl font-bold"
            >
              {getRankIcon()}
            </motion.div>
            {avatar?.emoji && (
              <div className="text-3xl" style={{ imageRendering: 'crisp-edges' }}>
                {avatar.emoji}
              </div>
            )}
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                {player.username}
                {isCurrentPlayer && (
                  <span className="ml-2 text-sm text-cyan-600 dark:text-cyan-400">({t('playerView.me')})</span>
                )}
              </h3>
              {showWinnerMessage && (
                <motion.p
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
                  className="text-base font-bold text-yellow-600 dark:text-yellow-400"
                >
                  🎉 {t('results.youWon')} 🎉
                </motion.p>
              )}
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {player.wordCount} {t('hostView.words')}
                {player.validWordCount !== undefined && ` • ${player.validWordCount} ${t('results.valid')}`}
              </p>
            </div>
          </div>
          <motion.div
            animate={index === 0 ? { scale: [1, 1.1, 1] } : {}}
            transition={index === 0 ? { duration: 1.5, repeat: Infinity } : {}}
            className={cn(
              "text-4xl font-black",
              index === 0 && "text-yellow-500",
              index === 1 && "text-gray-400",
              index === 2 && "text-orange-500",
              index > 2 && "text-slate-700 dark:text-slate-300"
            )}
          >
            {player.score}
          </motion.div>
        </div>

        {/* Longest Word */}
        {player.longestWord && (
          <div className="mb-3 p-2 rounded-lg bg-gradient-to-r from-cyan-500/10 to-teal-500/10 border border-cyan-500/20 relative z-10">
            <p className="text-sm text-slate-700 dark:text-slate-300">
              <span className="font-bold text-cyan-600 dark:text-cyan-400">{t('playerView.longestWord')}:</span>
              <span className="ml-2 text-lg font-bold text-cyan-700 dark:text-cyan-300">{applyHebrewFinalLetters(player.longestWord)}</span>
            </p>
          </div>
        )}

        {/* Words Section - Always show, collapsible */}
        <div className="mb-3 relative z-10">
          <button
            onClick={() => setIsWordsExpanded(!isWordsExpanded)}
            className="w-full flex items-center justify-between p-2 rounded-lg text-sm font-bold text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all"
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
                  {/* Valid Words Grouped by Points - Grid Layout */}
                  {sortedPointGroups.length > 0 && (
                    <div className="bg-gradient-to-r from-green-500/10 to-teal-500/10 rounded-lg p-3 border border-green-500/20">
                      <div className="text-sm font-bold text-green-600 dark:text-green-400 mb-3 flex items-center gap-2">
                        <span>✓</span>
                        {t('results.validWords') || 'Valid Words'} ({Object.values(wordsByPoints).flat().length})
                      </div>
                      <div className="space-y-3">
                        {sortedPointGroups.map(points => (
                          <div key={`points-${points}`} className="bg-white/50 dark:bg-slate-800/50 rounded-lg p-2">
                            <div
                              className="text-xs font-bold mb-2 flex items-center gap-2"
                              style={{ color: POINT_COLORS[points] || POINT_COLORS[8] }}
                            >
                              <span className="w-5 h-5 rounded-full flex items-center justify-center text-white font-bold text-xs"
                                    style={{ backgroundColor: POINT_COLORS[points] || POINT_COLORS[8] }}>
                                {points}
                              </span>
                              <span>{points} {t('results.points') || 'pts'}</span>
                              <span className="text-slate-400">•</span>
                              <span className="text-slate-500 dark:text-slate-400">{wordsByPoints[points].length} {t('hostView.words') || 'words'}</span>
                            </div>
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-1.5">
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
                    <div className="bg-gradient-to-r from-orange-500/10 to-amber-500/10 rounded-lg p-3 border border-orange-500/20">
                      <div className="text-sm font-bold text-orange-600 dark:text-orange-400 mb-2 flex items-center gap-2">
                        <span>👥</span>
                        {t('results.shared') || 'Shared Words'} ({duplicateWords.length})
                      </div>
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-1.5">
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
                    <div className="bg-gradient-to-r from-gray-500/10 to-slate-500/10 rounded-lg p-3 border border-gray-500/20">
                      <div className="text-sm font-bold text-gray-600 dark:text-gray-400 mb-2 flex items-center gap-2">
                        <span>✗</span>
                        {t('results.invalid') || 'Invalid Words'} ({invalidWords.length})
                      </div>
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-1.5">
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
                <motion.div
                  key={i}
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.5 + i * 0.1, type: 'spring' }}
                >
                  <AchievementBadge achievement={ach} index={i} />
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </Card>
    </motion.div>
  );
};

export default ResultsPlayerCard;
