'use client';

import React, { memo, useEffect, useRef } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import useReducedMotion from '@/hooks/useReducedMotion';

export type TomorrowPreviewMode = 'singleplayer' | 'blast' | 'daily' | 'adventure';

interface TomorrowPreviewProps {
  /** Game mode to determine teaser content */
  mode: TomorrowPreviewMode;
  /** Callback when banner auto-dismisses (after 3s) */
  onDismiss?: () => void;
}

const AUTO_DISMISS_MS = 3000;

/** Maps game mode to the translation key for its teaser */
function getTeaserKey(mode: TomorrowPreviewMode): string {
  switch (mode) {
    case 'blast':
      return 'tomorrowPreview.blast';
    case 'adventure':
      return 'tomorrowPreview.adventure';
    case 'singleplayer':
    case 'daily':
    default:
      return 'tomorrowPreview.singleplayer';
  }
}

/**
 * TomorrowPreview — thin auto-dismissing banner that teases tomorrow's content.
 * Slides up from bottom, shows for 3 seconds, then auto-dismisses.
 * Cannot be manually dismissed. Respects prefers-reduced-motion.
 */
const TomorrowPreview: React.FC<TomorrowPreviewProps> = memo(({ mode, onDismiss }) => {
  const { t } = useLanguage();
  const reducedMotion = useReducedMotion();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      onDismiss?.();
    }, AUTO_DISMISS_MS);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [onDismiss]);

  const teaserText = t(getTeaserKey(mode));
  const seeYouText = t('tomorrowPreview.seeYou');

  const slideVariants = reducedMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : { initial: { y: 80, opacity: 0 }, animate: { y: 0, opacity: 1 }, exit: { y: 80, opacity: 0 } };

  return (
    <m.div
      className="fixed bottom-[var(--admob-banner-height,0px)] inset-x-0 z-[60] bg-neo-navy/95 backdrop-blur-xs border-t border-neo-yellow px-4 py-3 safe-area-bottom"
      initial={slideVariants.initial}
      animate={slideVariants.animate}
      exit={slideVariants.exit}
      transition={reducedMotion ? { duration: 0.2 } : { type: 'spring', stiffness: 300, damping: 28 }}
    >
      <div className="max-w-lg mx-auto text-center space-y-0.5">
        <p className="text-neo-yellow font-bold text-sm leading-snug">
          {teaserText}
        </p>
        <p className="text-neo-white text-xs">
          {seeYouText}
        </p>
      </div>
    </m.div>
  );
});

TomorrowPreview.displayName = 'TomorrowPreview';

export default TomorrowPreview;
