'use client';

import { useState, useEffect, memo } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { useIsDesktop } from '@/hooks/useMediaQuery';
import { useIsExperiencedPlayer } from '@/hooks/useIsExperiencedPlayer';

const STORAGE_KEY = 'lexiclash_desktop_hint_shown';

/**
 * DesktopInputHint - One-time inline hint below the grid on first desktop session.
 * "Tip: You can also click tiles or just type!"
 * Auto-dismisses after 6s or on first word submission.
 */
const DesktopInputHint = memo<{ wordSubmitted?: boolean }>(({ wordSubmitted }) => {
  const [visible, setVisible] = useState(false);
  const isDesktop = useIsDesktop();
  const isExperienced = useIsExperiencedPlayer();
  const { t } = useLanguageSafe();

  useEffect(() => {
    if (!isDesktop || isExperienced) return;
    try {
      const shown = localStorage.getItem(STORAGE_KEY);
      if (!shown) {
        setVisible(true);
        localStorage.setItem(STORAGE_KEY, '1');
      }
    } catch {
      // localStorage unavailable
    }
  }, [isDesktop, isExperienced]);

  // Auto-dismiss after 6s
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => setVisible(false), 6000);
    return () => clearTimeout(timer);
  }, [visible]);

  // Dismiss on first word submission
  useEffect(() => {
    if (wordSubmitted && visible) {
      setVisible(false);
    }
  }, [wordSubmitted, visible]);

  return (
    <AnimatePresence>
      {visible && (
        <m.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.3 }}
          className="hidden md:flex justify-center mt-2"
        >
          <div className="bg-neo-cream/90 border-2 border-neo-black/30 rounded-neo px-3 py-1.5 shadow-hard-sm">
            <span className="text-xs font-bold text-neo-black/80">
              {t('desktopHint.tip')}
            </span>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
});

DesktopInputHint.displayName = 'DesktopInputHint';

export default DesktopInputHint;
