'use client';

import React, { useMemo } from 'react';
import { m, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Fingerprint, ChevronDown } from 'lucide-react';
import { useRevealList } from '@/hooks/useRevealList';
import { selectUniqueWords } from '@/lib/results/selectUniqueWords';
import type { WordObject } from './types';

type TFunction = (key: string, params?: Record<string, string | number>) => string;

interface UniqueWordsSectionProps {
  allPlayerWords: Record<string, WordObject[]>;
  currentUsername: string;
  t: TFunction;
  /** How many words to show before the "see more" reveal. Defaults to 3. */
  initialCount?: number;
}

/**
 * UniqueWordsSection — words only the current player found.
 *
 * Returns null in solo play (<2 players) or when the player has no uniques.
 * Sorted longest-first so the highlights surface at the top; the list collapses
 * to the top 3 by default with a tap-to-reveal toggle so prolific rounds stay
 * scannable instead of flooding the results card.
 */
const UniqueWordsSection: React.FC<UniqueWordsSectionProps> = ({
  allPlayerWords,
  currentUsername,
  t,
  initialCount = 3,
}) => {
  const uniqueWords = useMemo(() => {
    const uniques = selectUniqueWords(allPlayerWords, currentUsername);
    return uniques.length > 0 ? uniques : null;
  }, [allPlayerWords, currentUsername]);

  const { visible, hasMore, showAll, toggle, hiddenCount } = useRevealList(
    uniqueWords ?? [],
    initialCount,
  );

  // Accessibility: honor OS "reduce motion" — chips appear instantly with no
  // hover/press transforms. The animated path uses only transform/opacity
  // (compositor-only, 60fps); the cyan hover glow is a CSS colour shift (not
  // motion), so it stays on for everyone.
  const reduce = useReducedMotion();

  if (!uniqueWords) return null;

  return (
    <div className="bg-neo-navy/60 border-2 border-neo-cyan/40 rounded-neo shadow-hard-sm p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Fingerprint className="w-4 h-4 text-neo-cyan shrink-0" />
        <h3 className="text-sm font-black text-neo-white uppercase tracking-wide">
          {t('results.uniqueWords.title')}
        </h3>
        <span className="ms-auto text-xs font-bold text-neo-cyan">
          {uniqueWords.length}
        </span>
      </div>
      <ul className="flex flex-wrap gap-1.5">
        {/* Chips play a staggered entrance on mount (matches MissedWords) for a
            bit of arrival delight, then layout-animate as items reveal/collapse
            via the toggle. Stagger delay is capped so a long revealed list never
            crawls in. Reduced motion → instant, no transforms. */}
        <AnimatePresence mode="popLayout">
          {visible.map((word, index) => (
            <m.li
              key={word}
              layout={!reduce}
              initial={reduce ? false : { opacity: 0, scale: 0.6, y: 6, rotate: index % 2 === 0 ? -5 : 5 }}
              animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0, rotate: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.7, y: -4 }}
              transition={
                reduce
                  ? { duration: 0 }
                  : { type: 'spring', stiffness: 360, damping: 18, delay: Math.min(index, 6) * 0.03 }
              }
              whileHover={reduce ? undefined : { y: -2, scale: 1.06 }}
              whileTap={reduce ? undefined : { scale: 0.94 }}
              className="px-2 py-0.5 rounded bg-neo-cyan/20 text-neo-cyan text-xs font-semibold border border-neo-cyan/30 lowercase cursor-default transition-colors hover:bg-neo-cyan/30 hover:border-neo-cyan/70 hover:text-neo-cyan-light"
            >
              {word}
            </m.li>
          ))}
        </AnimatePresence>
      </ul>
      {hasMore && (
        <m.button
          type="button"
          onClick={toggle}
          whileHover={reduce ? undefined : { scale: 1.02 }}
          whileTap={reduce ? undefined : { scale: 0.96 }}
          className="w-full flex items-center justify-center gap-1 py-1 rounded-neo text-[11px] font-bold uppercase tracking-wide text-neo-cyan bg-neo-cyan/10 hover:bg-neo-cyan/20 border border-neo-cyan/30 transition-colors"
        >
          <span>
            {showAll
              ? t('common.showLess')
              : `${t('common.showMore')} (${hiddenCount})`}
          </span>
          <m.span
            animate={{ rotate: showAll ? 180 : 0 }}
            transition={reduce ? { duration: 0 } : { duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="inline-flex"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </m.span>
        </m.button>
      )}
    </div>
  );
};

export default UniqueWordsSection;
