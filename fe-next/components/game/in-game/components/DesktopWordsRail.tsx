'use client';

import React, { memo } from 'react';
import type { FoundWord } from '@/shared/types/view';
import type { TranslationFn } from '../types';
import { GameWordList } from './GameWordList';

interface DesktopWordsRailProps {
  foundWords: FoundWord[];
  minWordLength: number;
  t: TranslationFn;
}

/** Stretches to the board height so the found-word list reads as a full column. */
export const DesktopWordsRail = memo<DesktopWordsRailProps>(function DesktopWordsRail({
  foundWords,
  minWordLength,
  t,
}) {
  return (
    <aside
      data-testid="desktop-rail-words"
      className="hidden lg:flex lg:flex-col lg:self-stretch lg:w-64 xl:w-72 2xl:w-80 gap-2 min-h-0 shrink-0 overflow-hidden"
    >
      <div className="flex items-baseline justify-between px-1">
        <span className="text-[11px] font-black uppercase tracking-wider text-neo-cyan">
          {t('hostView.words')}
        </span>
        <span
          data-testid="desktop-rail-words-count"
          className="text-sm font-bold text-neo-cyan tabular-nums"
        >
          {foundWords.length}
        </span>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        {foundWords.length === 0 ? (
          <p className="px-1 pt-2 text-xs text-neo-white/60">{t('playerView.swipeHintShort')}</p>
        ) : (
          <GameWordList foundWords={foundWords} minWordLength={minWordLength} t={t} />
        )}
      </div>
    </aside>
  );
});
