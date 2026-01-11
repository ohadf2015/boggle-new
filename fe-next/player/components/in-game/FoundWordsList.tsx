'use client';

import { useRef, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { applyHebrewFinalLetters } from '../../../utils/utils';

interface FoundWord {
  word: string;
  isValid?: boolean | null;
  score?: number;
  duplicate?: boolean;
  timestamp?: number;
}

interface FoundWordsListProps {
  foundWords: FoundWord[];
  gameActive: boolean;
  t: (key: string, params?: Record<string, string | number>) => string;
  /** Optional: compact mode for mobile drawer */
  compact?: boolean;
}

/**
 * FoundWordsList - Displays the list of words found by the player
 * Used in desktop sidebar and mobile drawer
 */
export const FoundWordsList = memo<FoundWordsListProps>(({
  foundWords,
  gameActive,
  t,
  compact = false,
}) => {
  const wordListRef = useRef<HTMLDivElement | null>(null);

  return (
    <div
      className="bg-neo-cream text-neo-black border-4 border-neo-black rounded-neo-lg shadow-hard-lg flex flex-col overflow-hidden"
      style={{ transform: compact ? 'none' : 'rotate(1deg)' }}
    >
      <div className="py-3 px-4 border-b-4 border-neo-black bg-neo-cyan text-neo-black">
        <h3 className="text-neo-black text-base uppercase tracking-widest font-black">
          {t('playerView.wordsFound')}
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto p-3 min-h-0">
        <div className="space-y-2" ref={wordListRef}>
          <AnimatePresence>
            {foundWords.map((foundWordObj, index) => {
              const wordText = foundWordObj.word;
              const isInvalid = foundWordObj.isValid === false;
              const isPending = foundWordObj.isValid === null || foundWordObj.isValid === undefined;
              const isLatest = index === foundWords.length - 1;

              // Determine styling based on validation state
              const getWordStyles = () => {
                if (isInvalid) {
                  return 'bg-neo-red text-neo-cream shadow-hard-sm line-through opacity-85';
                }
                if (isPending) {
                  return 'bg-neo-cream/70 text-neo-black/70 shadow-hard-sm animate-pulse';
                }
                if (isLatest) {
                  return 'bg-neo-yellow text-neo-black shadow-hard';
                }
                return 'bg-neo-cream text-neo-black shadow-hard-sm hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-hard';
              };

              return (
                <motion.div
                  key={`${wordText}-${foundWordObj.timestamp || index}`}
                  initial={{ x: -30, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -30, opacity: 0 }}
                  className={`p-2 text-center font-black uppercase border-3 border-neo-black rounded-neo transition-all ${getWordStyles()}`}
                >
                  {applyHebrewFinalLetters(wordText).toUpperCase()}
                </motion.div>
              );
            })}
          </AnimatePresence>
          {foundWords.length === 0 && gameActive && (
            <p className="text-center text-neo-black/90 py-6 text-sm font-bold">
              {t('playerView.noWordsYet') || 'No words found yet'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
});

FoundWordsList.displayName = 'FoundWordsList';

export default FoundWordsList;
