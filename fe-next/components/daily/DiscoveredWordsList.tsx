'use client';

import React, { useMemo, useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import type { WordDiscovery } from './survival/types';

interface DiscoveredWordsListProps {
  words: WordDiscovery[];
  t: (key: string) => string;
}

export const DiscoveredWordsList: React.FC<DiscoveredWordsListProps> = ({ words, t }) => {
  const [obfuscated, setObfuscated] = useState(false);

  const sortedWords = useMemo(
    () => [...words].sort((a, b) => b.timestamp - a.timestamp),
    [words]
  );

  return (
    <div className="shrink-0 px-1 pb-1">
      <div className="flex items-center justify-between px-2 py-1">
        <span className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-neo-white">
          {t('wordHunt.mobile.found')}
          <span
            data-testid="found-count"
            className="grid min-w-[22px] h-[22px] place-items-center rounded-full border-2 border-neo-black bg-neo-lime px-1.5 text-xs text-neo-black tabular-nums shadow-hard-sm"
          >
            {words.length}
          </span>
        </span>
        <button type="button"
          onClick={() => setObfuscated(!obfuscated)}
          className="text-[10px] text-neo-white hover:text-neo-white font-medium transition-colors px-1.5 py-0.5 rounded"
        >
          {obfuscated ? t('common.show') : t('common.hide')}
        </button>
      </div>
      {/* One row, newest first, scrolling sideways: a wrapping list grew taller
          with every found word, and the board (sized from the leftover height)
          shrank to make room. */}
      <div data-testid="found-words-row" className="flex flex-nowrap gap-1 px-1 pt-0.5 pb-1 overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <AnimatePresence mode="popLayout">
          {sortedWords.map((w) => (
            <m.span
              key={`${w.word}-${w.timestamp}`}
              initial={{ scale: 0.4, rotate: -8 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0.7 }}
              transition={{ type: 'spring', stiffness: 520, damping: 18 }}
              className={`inline-flex shrink-0 items-center gap-1 px-2.5 py-0.5 rounded-lg border-2 border-neo-black shadow-hard-sm text-xs font-black uppercase tracking-wider ${
                w.word.length >= 7
                  ? 'bg-neo-pink text-neo-white'
                  : w.word.length >= 5
                    ? 'bg-neo-cyan text-neo-black'
                    : 'bg-neo-cream text-neo-black'
              }`}
            >
              {obfuscated ? '•'.repeat(w.word.length) : w.word}
            </m.span>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default DiscoveredWordsList;
