import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import { AchievementBadge } from '../AchievementBadge';
import { useLanguage } from '../../contexts/LanguageContext';
import { cn } from '../../lib/utils';
import { applyHebrewFinalLetters } from '../../utils/utils';
import { ChevronDown, ChevronUp } from 'lucide-react';

const WORD_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE'];

const WordChip = ({ wordObj, index, playerCount, t }) => {
  const isDuplicate = wordObj.isDuplicate;
  const isValid = wordObj.validated;
  const displayWord = applyHebrewFinalLetters(wordObj.word);

  const label = isDuplicate
    ? `${displayWord} (${t('results.shared')} • ${t('results.noPoints')})`
    : `${displayWord} ${isValid ? `(${wordObj.score})` : '(✗)'}`;

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
          backgroundColor: !isDuplicate && isValid
            ? WORD_COLORS[index % WORD_COLORS.length]
            : undefined
        }}
      >
        {label}
      </Badge>
      {isDuplicate && playerCount > 1 && (
        <span className="absolute -top-2 -right-2 bg-orange-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold shadow-md">
          {playerCount}
        </span>
      )}
    </div>
  );
};

const ResultsPlayerCard = ({ player, index, allPlayerWords, currentUsername }) => {
  const { t } = useLanguage();
  // Auto-expand current player's card, collapse others
  const [isWordsExpanded, setIsWordsExpanded] = useState(player.username === currentUsername);

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
    if (index === 0) return 'bg-gradient-to-br from-yellow-500/15 to-orange-500/15 border-yellow-500/40 shadow-[0_0_20px_rgba(234,179,8,0.25)]';
    if (index === 1) return 'bg-gradient-to-br from-gray-400/15 to-gray-500/15 border-gray-400/40 shadow-[0_0_15px_rgba(156,163,175,0.2)]';
    if (index === 2) return 'bg-gradient-to-br from-orange-500/15 to-orange-600/15 border-orange-500/40 shadow-[0_0_15px_rgba(249,115,22,0.2)]';
    return 'bg-white/90 dark:bg-slate-800/90 border-slate-300/50 dark:border-slate-600/50';
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
          "p-4 sm:p-5 md:p-6 border-2 backdrop-blur-sm transition-all duration-300 rounded-xl shadow-lg hover:shadow-xl",
          getCardStyle(),
          isWordsExpanded && "ring-2 ring-purple-400/50 shadow-[0_0_20px_rgba(168,85,247,0.3)]"
        )}
      >
        {/* Header: Rank, Name, Score */}
        <div className="flex justify-between items-center mb-3 sm:mb-4">
          <div className="flex items-center gap-3">
            <motion.div
              animate={index < 3 ? { rotate: [0, -10, 10, -10, 0] } : {}}
              transition={index < 3 ? { duration: 2, repeat: Infinity, repeatDelay: 5 } : {}}
              className="text-3xl font-bold"
            >
              {getRankIcon()}
            </motion.div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                {player.username}
              </h3>
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
          <div className="mb-3 p-2 rounded-lg bg-gradient-to-r from-cyan-500/10 to-teal-500/10 border border-cyan-500/20">
            <p className="text-sm text-slate-700 dark:text-slate-300">
              <span className="font-bold text-cyan-600 dark:text-cyan-400">{t('playerView.longestWord')}:</span>
              <span className="ml-2 text-lg font-bold text-cyan-700 dark:text-cyan-300">{applyHebrewFinalLetters(player.longestWord)}</span>
            </p>
          </div>
        )}

        {/* Words Section - Always show, collapsible */}
        <div className="mb-3">
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
                <div className="flex flex-wrap gap-2 pt-2">
                  {player.allWords.map((wordObj, i) => (
                    <WordChip
                      key={i}
                      wordObj={wordObj}
                      index={i}
                      playerCount={getPlayerCountForWord(wordObj.word)}
                      t={t}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Achievements Section */}
        {player.achievements && player.achievements.length > 0 && (
          <div className="mt-3 pt-2 sm:mt-4 sm:pt-3 border-t border-slate-200 dark:border-slate-700">
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
