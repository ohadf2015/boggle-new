/**
 * MissedWordsPanel Component
 *
 * Shows words the player could have found on the board but didn't.
 * Displayed after a level completes. Sorts by word length (longer first).
 * Collapses to 8 words by default with "show more" option.
 */

'use client';

import { memo, useState } from 'react';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

// ==============================================
// TYPES
// ==============================================

export interface MissedWordsPanelProps {
  /** Words that were on the board but the player didn't find */
  missedWords: string[];
  /** Words the player did find (for context) */
  foundWords: string[];
  /** Additional className */
  className?: string;
}

// ==============================================
// CONSTANTS
// ==============================================

const COLLAPSED_LIMIT = 8;

// ==============================================
// COMPONENT
// ==============================================

export const MissedWordsPanel = memo<MissedWordsPanelProps>(({
  missedWords,
  foundWords: _foundWords,
  className,
}) => {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(false);

  if (missedWords.length === 0) return null;

  // Sort longest-first (most interesting/impressive words first)
  const sorted = [...missedWords].sort((a, b) => b.length - a.length);
  const hasMore = sorted.length > COLLAPSED_LIMIT;
  const displayed = expanded ? sorted : sorted.slice(0, COLLAPSED_LIMIT);

  return (
    <AdaptiveMotion.div
      data-testid="missed-words-panel"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.0, duration: 0.4 }}
      className={cn(
        'mb-4 p-4 rounded-neo',
        'bg-neo-white/5 border-2 border-neo-white/10',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <p className="text-neo-white text-xs font-bold uppercase tracking-wide">
          {t('adventure.game.wordsYouMissed')}
        </p>
        <span className="text-neo-white text-xs font-mono">
          {t('adventure.game.missedWordsSummary', { count: missedWords.length })}
        </span>
      </div>

      {/* Word chips */}
      <ul className="flex flex-wrap gap-1.5" aria-label={t('adventure.game.wordsYouMissed')}>
        {displayed.map((word) => (
          <AdaptiveMotion.li
            key={word}
            data-testid="missed-word-chip"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300 }}
            className={cn(
              'px-2.5 py-1 rounded-neo',
              'bg-neo-navy-light border-2 border-neo-white/20',
              'text-neo-white text-xs font-bold font-mono tracking-wide',
              'select-none'
            )}
          >
            {word.toUpperCase()}
          </AdaptiveMotion.li>
        ))}
      </ul>

      {/* Show more / collapse */}
      {hasMore && (
        <button
          data-testid="missed-words-show-more"
          onClick={() => setExpanded((e) => !e)}
          className={cn(
            'mt-2 text-xs font-bold text-neo-cyan/70 hover:text-neo-cyan',
            'focus-visible:outline-hidden focus-visible:underline',
            'transition-colors duration-150'
          )}
        >
          {expanded
            ? t('adventure.game.showLess')
            : t('adventure.game.showMore', { count: sorted.length - COLLAPSED_LIMIT })}
        </button>
      )}
    </AdaptiveMotion.div>
  );
});

MissedWordsPanel.displayName = 'MissedWordsPanel';

export default MissedWordsPanel;
