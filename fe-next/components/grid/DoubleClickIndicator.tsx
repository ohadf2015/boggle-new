'use client';

import { memo } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { useLanguageSafe } from '@/contexts/LanguageContext';

interface DoubleClickIndicatorProps {
  /** Whether the indicator should be visible */
  visible: boolean;
}

/**
 * DoubleClickIndicator — Shows a pulsing "2×tap" badge on the last selected cell
 * to indicate double-click/tap submits the word. Only renders on desktop (md+).
 *
 * Place this inside the last selected grid cell's container.
 */
const DoubleClickIndicator = memo<DoubleClickIndicatorProps>(({ visible }) => {
  const { t } = useLanguageSafe();

  return (
    <AnimatePresence>
      {visible && (
        <m.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.5 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          className="hidden md:flex absolute -bottom-1.5 left-1/2 -translate-x-1/2 z-30 pointer-events-none"
        >
          <m.span
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            className="flex items-center gap-0.5 bg-neo-black text-neo-lime text-[9px] font-black px-1.5 py-0.5 rounded-full border border-neo-lime/60 shadow-[0_0_6px_rgba(191,255,0,0.4)] whitespace-nowrap"
          >
            <span aria-hidden="true">⏎</span>
            <span>{t('desktopInput.doubleClick') || '2×click'}</span>
          </m.span>
        </m.div>
      )}
    </AnimatePresence>
  );
});

DoubleClickIndicator.displayName = 'DoubleClickIndicator';

export default DoubleClickIndicator;
