'use client';

import React, { memo } from 'react';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { applyHebrewFinalLetters } from '@/utils/utils';
import type { FoundWord } from '@/shared/types/view';
import type { TranslationFn } from '../types';

interface GameWordListProps {
  foundWords: FoundWord[];
  minWordLength: number;
  t: TranslationFn;
  /** Compact view for mobile */
  compact?: boolean;
}

/**
 * GameWordList - Displays found words in a styled list
 */
export const GameWordList = memo<GameWordListProps>(function GameWordList({
  foundWords,
  minWordLength,
  t,
  compact = false,
}) {
  // Compact view for mobile (horizontal wrap)
  if (compact) {
    return (
      <div className="bg-neo-cream text-neo-black border-3 border-neo-black rounded-neo shadow-hard p-1.5 md:p-2">
        <div className="flex items-center justify-between mb-1 px-0.5">
          <span className="text-[10px] md:text-xs font-black uppercase text-neo-black">
            {t('hostView.words')}
          </span>
          <span className="text-xs font-bold text-neo-black/90 tabular-nums">{foundWords.length}</span>
        </div>
        <div className="max-h-[50px] overflow-hidden">
          {foundWords.length === 0 ? (
            <p className="text-center text-neo-black/70 py-1 text-[10px]">
              {t('playerView.swipeHintShort')}
            </p>
          ) : (
            <div className="flex flex-wrap gap-1">
              {foundWords
                .slice()
                .reverse()
                .map((wordObj, index) => (
                  <AdaptiveMotion.span
                    key={`${wordObj.word}-${index}`}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    className={`inline-block px-2 py-1 text-xs font-bold uppercase rounded-neo border-2 border-neo-black ${
                      wordObj.isValid === false
                        ? 'bg-neo-red text-neo-cream line-through opacity-70'
                        : index === 0
                          ? 'bg-neo-lime text-neo-black'
                          : 'bg-white text-neo-black'
                    }`}
                  >
                    {applyHebrewFinalLetters(wordObj.word)}
                  </AdaptiveMotion.span>
                ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Full view for desktop sidebar
  return (
    <div
      className="bg-neo-cream text-neo-black border-4 border-neo-black rounded-neo-lg shadow-hard-lg flex flex-col min-h-0 max-h-[75vh] lg:max-h-[calc(100vh-120px)] overflow-hidden"
      style={{ transform: 'rotate(1deg)' }}
    >
      {/* Header */}
      <div className="py-3 px-4 border-b-4 border-neo-black bg-neo-cyan text-neo-black">
        <h3 className="text-neo-black text-base uppercase tracking-widest font-black">
          {t('playerView.wordsFound')}
        </h3>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 min-h-0 custom-scrollbar">
        <div className="space-y-2">
          <AdaptiveAnimatePresence>
            {foundWords.map((foundWordObj, index) => {
              const wordText = foundWordObj.word;
              const isInvalid = foundWordObj.isValid === false;
              const isLatest = index === foundWords.length - 1;
              return (
                <AdaptiveMotion.div
                  key={`${wordText}-${foundWordObj.timestamp || index}`}
                  initial={{ x: -30, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -30, opacity: 0 }}
                  className={`p-2 text-center font-black uppercase border-3 border-neo-black rounded-neo transition-all
                    ${
                      isInvalid
                        ? 'bg-neo-red text-neo-cream shadow-hard-sm line-through opacity-70'
                        : isLatest
                          ? 'bg-neo-lime text-neo-black shadow-hard'
                          : 'bg-neo-cream text-neo-black shadow-hard-sm hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-hard'
                    }`}
                >
                  {applyHebrewFinalLetters(wordText).toUpperCase()}
                </AdaptiveMotion.div>
              );
            })}
          </AdaptiveAnimatePresence>

          {foundWords.length === 0 && (
            <div className="text-center py-6">
              <p className="text-neo-black/90 text-sm font-bold mb-2">
                {t('playerView.noWordsYet')}
              </p>
              <p className="text-neo-black/60 text-xs px-2">
                {t('playerView.swipeHintWithMin', { min: minWordLength }) ||
                  `Swipe connected letters (${minWordLength}+ letters)`}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
