/**
 * ScoreBreakdownSection Component
 * Collapsible section showing how efficiency score is calculated
 */

'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, ChevronDown, Coins } from 'lucide-react';

export interface ScoreBreakdownSectionProps {
  solved: boolean;
  efficiencyScore: number;
  lifeRemaining: number;
  unusedTokens: number;
  wordsDiscovered: number;
  guessesUsed: number;
  t: (key: string) => string;
}

export const ScoreBreakdownSection: React.FC<ScoreBreakdownSectionProps> = ({
  solved,
  efficiencyScore,
  lifeRemaining,
  unusedTokens,
  wordsDiscovered,
  guessesUsed,
  t,
}) => {
  const [expanded, setExpanded] = useState(false);

  // Calculate individual contributions (ensure whole numbers)
  const lifeContribution = Math.round(Math.max(0, lifeRemaining) * 10);
  const tokenContribution = Math.round(Math.max(0, unusedTokens) * 5);
  const wordsContribution = Math.round(Math.max(0, wordsDiscovered) * 3);
  const guessPenalty = Math.round(Math.max(0, guessesUsed) * 2);

  // Determine weakest area for tips
  const getImprovementTips = () => {
    const tips: { icon: string; text: string; priority: number }[] = [];

    if (!solved) {
      tips.push({ icon: '🎯', text: t('wordHunt.scoreTips.solveFirst') || 'Solve the puzzle to earn points!', priority: 0 });
      return tips;
    }

    // Life remaining tips
    if (lifeRemaining < 30) {
      tips.push({ icon: '❤️', text: t('wordHunt.scoreTips.findMoreWords') || 'Find more words to gain life', priority: 1 });
    } else if (lifeRemaining < 60) {
      tips.push({ icon: '💚', text: t('wordHunt.scoreTips.longerWords') || 'Longer words (5+ letters) give more life', priority: 2 });
    }

    // Token tips
    if (unusedTokens < 10) {
      tips.push({ icon: '🪙', text: t('wordHunt.scoreTips.saveTokens') || 'Save tokens by using fewer clues', priority: 3 });
    }

    // Words discovered tips
    if (wordsDiscovered < 5) {
      tips.push({ icon: '📖', text: t('wordHunt.scoreTips.exploreGrid') || 'Explore the grid for bonus words', priority: 4 });
    }

    // Guess efficiency tips
    if (guessesUsed > 5) {
      tips.push({ icon: '🧠', text: t('wordHunt.scoreTips.strategicGuessing') || 'Use clues wisely before guessing', priority: 5 });
    }

    return tips.sort((a, b) => a.priority - b.priority).slice(0, 2);
  };

  const tips = getImprovementTips();

  return (
    <div className="rounded-neo border-2 border-neo-black overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-2.5 bg-gradient-to-r from-purple-100 to-indigo-100 dark:from-purple-900/30 dark:to-indigo-900/30 hover:from-purple-200 hover:to-indigo-200 dark:hover:from-purple-900/50 dark:hover:to-indigo-900/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          <span className="text-xs font-bold text-gray-700 dark:text-gray-200 uppercase">
            {t('wordHunt.results.scoreBreakdown') || 'Score Breakdown'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Preview score when collapsed */}
          {!expanded && solved && (
            <span className="text-sm font-black text-purple-600 dark:text-purple-400">{Math.round(efficiencyScore)} pts</span>
          )}
          <motion.div animate={{ rotate: expanded ? 180 : 0 }}>
            <ChevronDown className="w-4 h-4 text-gray-500" />
          </motion.div>
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-3 space-y-4 bg-white dark:bg-slate-800">
              {/* Total Score Display */}
              <div className="text-center pb-3 border-b border-gray-200 dark:border-gray-700">
                <div className="text-3xl font-black text-purple-600 dark:text-purple-400">
                  {solved ? Math.round(efficiencyScore) : 0}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold">
                  {t('wordHunt.results.efficiencyScore') || 'Efficiency Score'}
                </div>
              </div>

              {/* Score Formula Breakdown */}
              <div className="space-y-2">
                <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">
                  {t('wordHunt.results.howItsCalculated') || 'How it\'s calculated'}
                </div>

                {/* Life Remaining */}
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 flex items-center justify-center rounded bg-red-100 dark:bg-red-900/30">
                    <span className="text-sm">❤️</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600 dark:text-gray-400">
                        {t('wordHunt.results.lifeRemaining') || 'Life'} × 10
                      </span>
                      <span className="font-bold text-green-600 dark:text-green-400">
                        +{lifeContribution}
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mt-0.5">
                      <div
                        className="h-full bg-red-500 rounded-full transition-all"
                        style={{ width: `${Math.min((lifeContribution / (100 * 10)) * 100, 100)}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-gray-400">{Math.floor(lifeRemaining)} × 10</div>
                  </div>
                </div>

                {/* Tokens Saved */}
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 flex items-center justify-center rounded bg-yellow-100 dark:bg-yellow-900/30">
                    <Coins className="w-3.5 h-3.5 text-yellow-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600 dark:text-gray-400">
                        {t('wordHunt.results.tokensSaved') || 'Tokens'} × 5
                      </span>
                      <span className="font-bold text-green-600 dark:text-green-400">
                        +{tokenContribution}
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mt-0.5">
                      <div
                        className="h-full bg-yellow-500 rounded-full transition-all"
                        style={{ width: `${Math.min((tokenContribution / (50 * 5)) * 100, 100)}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-gray-400">{Math.round(unusedTokens)} × 5</div>
                  </div>
                </div>

                {/* Words Discovered */}
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 flex items-center justify-center rounded bg-blue-100 dark:bg-blue-900/30">
                    <span className="text-sm">📖</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600 dark:text-gray-400">
                        {t('wordHunt.results.wordsFound') || 'Words'} × 3
                      </span>
                      <span className="font-bold text-green-600 dark:text-green-400">
                        +{wordsContribution}
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mt-0.5">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all"
                        style={{ width: `${Math.min((wordsContribution / (30 * 3)) * 100, 100)}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-gray-400">{wordsDiscovered} × 3</div>
                  </div>
                </div>

                {/* Guesses Penalty */}
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 flex items-center justify-center rounded bg-gray-100 dark:bg-gray-700">
                    <span className="text-sm">🎯</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600 dark:text-gray-400">
                        {t('wordHunt.results.guessesPenalty') || 'Guesses'} × 2
                      </span>
                      <span className="font-bold text-red-500">
                        -{guessPenalty}
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mt-0.5">
                      <div
                        className="h-full bg-red-400 rounded-full transition-all"
                        style={{ width: `${Math.min((guessesUsed / 10) * 100, 100)}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-gray-400">{guessesUsed} × 2</div>
                  </div>
                </div>

                {/* Divider with formula */}
                <div className="pt-2 mt-2 border-t border-dashed border-gray-300 dark:border-gray-600">
                  <div className="text-[10px] text-center text-gray-400 font-mono">
                    {lifeContribution} + {tokenContribution} + {wordsContribution} - {guessPenalty} = <span className="font-bold text-purple-600 dark:text-purple-400">{Math.round(efficiencyScore)}</span>
                  </div>
                </div>
              </div>

              {/* Word Value Reference */}
              <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">
                  {t('wordHunt.results.wordValues') || 'Word Life Values'}
                </div>
                <div className="grid grid-cols-3 gap-1.5 text-[10px]">
                  <div className="flex items-center justify-between px-2 py-1 bg-gray-50 dark:bg-gray-700/50 rounded">
                    <span className="text-gray-500">3 {t('wordHunt.results.letters') || 'letters'}</span>
                    <span className="font-bold text-red-500">+5❤️</span>
                  </div>
                  <div className="flex items-center justify-between px-2 py-1 bg-gray-50 dark:bg-gray-700/50 rounded">
                    <span className="text-gray-500">4 {t('wordHunt.results.letters') || 'letters'}</span>
                    <span className="font-bold text-red-500">+10❤️</span>
                  </div>
                  <div className="flex items-center justify-between px-2 py-1 bg-gray-50 dark:bg-gray-700/50 rounded">
                    <span className="text-gray-500">5 {t('wordHunt.results.letters') || 'letters'}</span>
                    <span className="font-bold text-red-500">+15❤️</span>
                  </div>
                  <div className="flex items-center justify-between px-2 py-1 bg-gray-50 dark:bg-gray-700/50 rounded">
                    <span className="text-gray-500">6 {t('wordHunt.results.letters') || 'letters'}</span>
                    <span className="font-bold text-red-500">+20❤️</span>
                  </div>
                  <div className="flex items-center justify-between px-2 py-1 bg-yellow-50 dark:bg-yellow-900/20 rounded col-span-2">
                    <span className="text-gray-500">7+ {t('wordHunt.results.letters') || 'letters'}</span>
                    <span className="font-bold text-red-500">+25❤️</span>
                    <span className="text-yellow-600">+4🪙</span>
                  </div>
                </div>
              </div>

              {/* Improvement Tips */}
              {tips.length > 0 && (
                <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">
                    {t('wordHunt.results.tipsToImprove') || 'Tips to Improve'}
                  </div>
                  <div className="space-y-1.5">
                    {tips.map((tip, idx) => (
                      <div key={idx} className="flex items-start gap-2 px-2 py-1.5 bg-gradient-to-r from-neo-cyan/10 to-neo-pink/10 dark:from-neo-cyan/20 dark:to-neo-pink/20 rounded-lg">
                        <span className="text-sm flex-shrink-0">{tip.icon}</span>
                        <span className="text-xs text-gray-700 dark:text-gray-300">{tip.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ScoreBreakdownSection;
