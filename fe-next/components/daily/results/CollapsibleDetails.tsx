/**
 * CollapsibleDetails Component
 * Collapsible section for rewards and secondary info (coins, survival bonus, rarest word)
 */

'use client';

import React, { useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { ChevronDown, Coins, Timer, Sparkles } from 'lucide-react';
import { safeToLocaleString } from '@/utils/bcp47Locale';
import { getSurvivalBonusMessage } from './constants';

export interface CollapsibleDetailsProps {
  coinReward: { awarded: number; breakdown: { base: number; efficiency: number; streak: number } } | null;
  survivalBonusTime: number;
  rarestWord: { word: string; rarity: number; emoji: string; label: string } | null;
  t: (key: string) => string;
  language: string;
}

export const CollapsibleDetails: React.FC<CollapsibleDetailsProps> = ({
  coinReward,
  survivalBonusTime,
  rarestWord,
  t,
  language,
}) => {
  const [expanded, setExpanded] = useState(false);

  // Don't show if no details to display
  const hasDetails = (coinReward && coinReward.awarded > 0) || survivalBonusTime > 0 || (rarestWord && rarestWord.rarity >= 4);
  if (!hasDetails) return null;

  return (
    <div className="rounded-neo border-2 border-neo-black overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-2.5 bg-slate-100 dark:bg-neo-navy-elevated hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-neo-lime" />
          <span className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase">
            {t('wordHunt.results.details')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Preview badges when collapsed */}
          {!expanded && (
            <div className="flex items-center gap-1.5">
              {coinReward && coinReward.awarded > 0 && (
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400">+{safeToLocaleString(coinReward.awarded, language)}🪙</span>
              )}
              {survivalBonusTime > 0 && (
                <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400">+{survivalBonusTime}s</span>
              )}
            </div>
          )}
          <m.div animate={{ rotate: expanded ? 180 : 0 }}>
            <ChevronDown className="w-4 h-4 text-gray-500" />
          </m.div>
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <m.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-3 space-y-3 bg-white dark:bg-neo-navy-light text-neo-black dark:text-neo-white">
              {/* Coin rewards */}
              {coinReward && coinReward.awarded > 0 && (
                <div className="flex items-center justify-between p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                  <div className="flex items-center gap-2">
                    <Coins className="w-5 h-5 text-amber-600" />
                    <span className="font-bold text-sm text-gray-700 dark:text-gray-200">{t('wordHunt.results.coinsEarned')}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-lg text-amber-600 dark:text-amber-400">+{safeToLocaleString(coinReward.awarded, language)}</span>
                    {(coinReward.breakdown.base > 0 || coinReward.breakdown.efficiency > 0 || coinReward.breakdown.streak > 0) && (
                      <div className="text-[10px] text-gray-500 dark:text-gray-400">
                        {coinReward.breakdown.base > 0 && <span>Base: {safeToLocaleString(coinReward.breakdown.base, language)}</span>}
                        {coinReward.breakdown.efficiency > 0 && <span> + Efficiency: {safeToLocaleString(coinReward.breakdown.efficiency, language)}</span>}
                        {coinReward.breakdown.streak > 0 && <span> + Streak: {safeToLocaleString(coinReward.breakdown.streak, language)}</span>}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Survival bonus */}
              {survivalBonusTime > 0 && (
                <div className="flex items-center justify-between p-2 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg border border-cyan-200 dark:border-cyan-800">
                  <div className="flex items-center gap-2">
                    <Timer className="w-5 h-5 text-cyan-600" />
                    <span className="font-bold text-sm text-gray-700 dark:text-gray-200">{t('wordHunt.results.survivalBonus')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-500">{getSurvivalBonusMessage(survivalBonusTime).emoji}</span>
                    <span className="font-black text-lg text-cyan-600 dark:text-cyan-400">+{survivalBonusTime}s</span>
                  </div>
                </div>
              )}

              {/* Rarest word */}
              {rarestWord && rarestWord.rarity >= 4 && (
                <div className="flex items-center justify-between p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{rarestWord.emoji}</span>
                    <span className="font-bold text-sm text-gray-700 dark:text-gray-200">{rarestWord.label} {t('wordHunt.results.find')}</span>
                  </div>
                  <span className="font-black text-lg text-indigo-600 dark:text-indigo-400 tracking-wide">{rarestWord.word.toUpperCase()}</span>
                </div>
              )}
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CollapsibleDetails;
