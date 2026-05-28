'use client';

import React, { useRef, useEffect } from 'react';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { Package, Lightbulb, Target, Star, Heart, KeyRound } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MAX_ATTEMPTS } from './constants';
import type { WordDiscovery, TargetAttempt } from './types';

export interface SurvivalLootPanelProps {
  discoveredWords: WordDiscovery[];
  hintStage: number;
  attempts: TargetAttempt[];
  t: (key: string) => string;
}

/**
 * Right sidebar panel for desktop layout - shows score, discovered words, and power-ups info
 */
export const SurvivalLootPanel: React.FC<SurvivalLootPanelProps> = ({
  discoveredWords,
  hintStage,
  attempts,
  t,
}) => {
  const listRef = useRef<HTMLDivElement>(null);

  // Only count non-discovery attempts for tries remaining
  const targetAttempts = attempts.filter(a => !a.isDiscovery);
  const triesRemaining = Math.max(0, MAX_ATTEMPTS - targetAttempts.length);

  // Sort words by most recent first
  const sortedWords = [...discoveredWords].sort((a, b) => b.timestamp - a.timestamp);

  // Auto-scroll to top when new word is added
  useEffect(() => {
    if (listRef.current && sortedWords.length > 0) {
      listRef.current.scrollTop = 0;
    }
  }, [sortedWords.length]);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Loot Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b-3 border-neo-black shrink-0 bg-neo-black/30">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-neo-lime" />
          <span className="font-bold text-neo-white text-sm uppercase tracking-wide">
            {t('wordHunt.desktop.lootCollected')}
          </span>
        </div>
        <div className="bg-neo-lime/20 border border-neo-lime/30 px-2.5 py-0.5 rounded-neo">
          <span className="font-black text-neo-lime text-lg tabular-nums">{discoveredWords.length}</span>
        </div>
      </div>

      {/* Word List */}
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-2 space-y-1 scrollbar-thin scrollbar-thumb-neo-cream/20 scrollbar-track-transparent"
      >
        <AdaptiveAnimatePresence mode="popLayout">
          {sortedWords.map((word) => (
            <LootWordItem
              key={`${word.word}-${word.timestamp}`}
              word={word}
            />
          ))}
        </AdaptiveAnimatePresence>

        {/* Empty State */}
        {discoveredWords.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-neo-white">
            <Package className="w-8 h-8 mb-2 opacity-50" />
            <span className="text-sm">{t('wordHunt.desktop.noWordsYet')}</span>
          </div>
        )}
      </div>

      {/* Power-ups Footer */}
      <div className="shrink-0 border-t-3 border-neo-black bg-neo-black/30 p-3 space-y-2">
        {/* Hints Unlocked */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1 text-neo-white">
            <Lightbulb className="w-3 h-3 text-neo-yellow" />
            <span>{t('wordHunt.desktop.hintsUnlocked')}</span>
          </div>
          <span className="font-bold text-neo-yellow tabular-nums">{hintStage}</span>
        </div>

        {/* Tries Remaining */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1 text-neo-white">
            <Target className="w-3 h-3 text-neo-cyan" />
            <span>{t('wordHunt.desktop.triesRemaining')}</span>
          </div>
          <span className={cn(
            'font-bold tabular-nums',
            triesRemaining <= 2 ? 'text-red-400' : 'text-neo-cyan'
          )}>
            {triesRemaining}
          </span>
        </div>
      </div>
    </div>
  );
};

/**
 * Individual word item in the loot list
 */
const LootWordItem: React.FC<{ word: WordDiscovery }> = ({ word }) => {
  const lengthColor = word.word.length >= 7
    ? 'text-neo-pink'
    : word.word.length >= 5
      ? 'text-neo-cyan'
      : 'text-neo-white';

  return (
    <AdaptiveMotion.div
      initial={{ opacity: 0, y: -20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2 }}
      className="flex items-center justify-between px-3 py-1.5 rounded-neo bg-neo-black/20 hover:bg-neo-black/30 transition-colors"
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className={cn('font-bold uppercase tracking-wider truncate', lengthColor)}>
          {word.word}
        </span>
        {word.word.length >= 7 && (
          <Star className="w-3 h-3 text-neo-pink shrink-0" />
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0 text-xs">
        {word.lifeGained > 0 && (
          <span className="text-green-400 font-bold flex items-center gap-0.5">
            +{word.lifeGained}
            <Heart className="w-3 h-3 fill-current" />
          </span>
        )}
        {word.tokensGained > 0 && (
          <span className="text-neo-yellow font-bold flex items-center gap-0.5">
            +{word.tokensGained}
            <KeyRound className="w-3 h-3" />
          </span>
        )}
      </div>
    </AdaptiveMotion.div>
  );
};

export default SurvivalLootPanel;
