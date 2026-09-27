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
        <span className="text-[11px] text-neo-white font-bold tabular-nums">
          {words.length} {t('wordHunt.mobile.words')}
        </span>
        <button type="button"
          onClick={() => setObfuscated(!obfuscated)}
          className="text-[10px] text-neo-white hover:text-neo-white font-medium transition-colors px-1.5 py-0.5 rounded"
        >
          {obfuscated ? t('common.show') : t('common.hide')}
        </button>
      </div>
      <div className="flex flex-wrap gap-1 px-1 max-h-[72px] overflow-y-auto scrollbar-thin scrollbar-thumb-neo-cream/10">
        <AnimatePresence mode="popLayout">
          {sortedWords.map((w) => (
            <m.span
              key={`${w.word}-${w.timestamp}`}
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                w.word.length >= 7
                  ? 'bg-neo-pink/15 text-neo-pink'
                  : w.word.length >= 5
                    ? 'bg-neo-cyan/15 text-neo-cyan'
                    : 'bg-neo-cream/10 text-neo-white'
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
