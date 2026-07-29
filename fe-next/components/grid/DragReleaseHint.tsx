'use client';

import { useState, useEffect, memo } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { useIsDesktop } from '@/hooks/useMediaQuery';
import { useIsExperiencedPlayer } from '@/hooks/useIsExperiencedPlayer';

const STORAGE_KEY = 'lexiclash_drag_hint_dismissed';

interface DragReleaseHintProps {
  /** Whether a drag is actively in progress */
  isDragging: boolean;
  /** Number of cells currently selected */
  selectedCellCount: number;
  /** Called when user has completed a drag submit (dismisses hint permanently) */
  wordSubmitted?: boolean;
}

/**
 * DragReleaseHint — Shows "Release to submit" floating above the grid
 * during an active drag with 2+ cells selected.
 * Only shows on desktop. Dismissed permanently after first successful drag submit.
 */
const DragReleaseHint = memo<DragReleaseHintProps>(({
  isDragging,
  selectedCellCount,
  wordSubmitted,
}) => {
  const [dismissed, setDismissed] = useState(true); // default hidden until checked
  const isDesktop = useIsDesktop();
  const isExperienced = useIsExperiencedPlayer();
  const { t } = useLanguageSafe();

  // Check localStorage once on mount
  useEffect(() => {
    if (!isDesktop) return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      setDismissed(!!stored);
    } catch {
      setDismissed(false);
    }
  }, [isDesktop]);

  // Dismiss permanently after first successful drag submission
  useEffect(() => {
    if (wordSubmitted && !dismissed) {
      setDismissed(true);
      try {
        localStorage.setItem(STORAGE_KEY, '1');
      } catch {
        // localStorage unavailable
      }
    }
  }, [wordSubmitted, dismissed]);

  const shouldShow = isDesktop && !dismissed && !isExperienced && isDragging && selectedCellCount >= 2;

  return (
    <AnimatePresence>
      {shouldShow && (
        <m.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }}
          transition={{ duration: 0.15 }}
          className="hidden md:flex absolute top-2 left-1/2 -translate-x-1/2 z-40 pointer-events-none"
        >
          <span className="bg-neo-black/80 text-neo-lime text-[11px] font-black px-3 py-1 rounded-full border border-neo-lime/40 shadow-[0_0_8px_rgba(191,255,0,0.3)] uppercase tracking-wider whitespace-nowrap">
            {t('desktopInput.releaseToSubmit') || 'Release to submit'}
          </span>
        </m.div>
      )}
    </AnimatePresence>
  );
});

DragReleaseHint.displayName = 'DragReleaseHint';

export default DragReleaseHint;
