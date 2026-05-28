'use client';

/**
 * BotWordCard - Display a single bot's words and stats
 *
 * Shows bot header with score and expandable word list.
 */

import React, { memo, useMemo } from 'react';
import { Bot } from 'lucide-react';
import { getPointColor, getTextColor } from '@/components/results/utils';
import { applyHebrewFinalLetters } from '@/utils/utils';
import { calculateWordScore } from '@/shared/utils/scoring';
import type { BotWordDetail } from '../useResultsData';

interface BotWordCardProps {
  bot: BotWordDetail;
  language: string;
  t: (key: string) => string | undefined;
}

/**
 * Card displaying a bot's found words with styling
 */
export const BotWordCard = memo(function BotWordCard({ bot, language, t }: BotWordCardProps): React.ReactElement {
  const processedWords = useMemo(() =>
    (bot.words ?? []).slice(0, 20).map(word => ({
      word,
      points: calculateWordScore(word),
      displayWord: language === 'he' ? applyHebrewFinalLetters(word) : word,
    })),
    [bot.words, language]
  );

  return (
    <div className="bg-neo-navy-light/50 border-2 border-slate-600 rounded-neo p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center">
            <Bot className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <span className="font-bold text-white text-sm">{bot.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-white font-medium">
            {bot.totalWords} {t('singlePlayer.botWords')}
          </span>
          <span className="text-sm font-black text-neo-lime">{bot.score} pts</span>
        </div>
      </div>
      {processedWords.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {processedWords.map(({ word, points, displayWord }, i) => {
            return (
              <span
                key={`${word}-${i}`}
                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-bold uppercase border border-neo-black/50 rounded"
                style={{ backgroundColor: getPointColor(points), color: getTextColor(points) }}
              >
                {displayWord}
                <span className="opacity-60 text-[9px]">+{points}</span>
              </span>
            );
          })}
          {bot.words.length > 20 && (
            <span className="text-[10px] text-white font-medium self-center">
              +{bot.words.length - 20} more
            </span>
          )}
        </div>
      ) : (
        <p className="text-xs text-white italic">
          {t('singlePlayer.noWordsToShow')}
        </p>
      )}
    </div>
  );
});
