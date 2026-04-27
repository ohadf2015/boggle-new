'use client';

import { useState, useEffect, useCallback } from 'react';
import { Hand } from 'lucide-react';
import { useMobilePortrait } from '@/hooks/useMobilePortrait';
import { useLanguage } from '@/contexts/LanguageContext';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';

const STORAGE_KEY = 'lexiclash_gesture_tutorial_shown';
const DISPLAY_DURATION = 5000;

export function GestureTutorialTooltip() {
  const isMobile = useMobilePortrait();
  const { t } = useLanguage();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!isMobile) return;
    try {
      if (localStorage.getItem(STORAGE_KEY)) return;
    } catch {
      return;
    }

    setShow(true);

    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // storage unavailable
    }

    const timer = setTimeout(() => setShow(false), DISPLAY_DURATION);
    return () => clearTimeout(timer);
  }, [isMobile]);

  const dismiss = useCallback(() => {
    setShow(false);
  }, []);

  return (
    <AdaptiveAnimatePresence>
      {show && (
        <AdaptiveMotion.div
          initial={{ opacity: 0, y: 12, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.95 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="fixed bottom-[calc(6rem+var(--admob-banner-height,0px))] inset-x-0 z-50 flex justify-center pointer-events-none px-4"
        >
          <button
            type="button"
            onClick={dismiss}
            className="pointer-events-auto flex items-center gap-3 px-4 py-3 bg-neo-cream text-neo-black border-3 border-neo-black shadow-hard rounded-neo max-w-sm w-full cursor-pointer active:shadow-hard-pressed active:translate-y-0.5 transition-all"
            aria-label={t('game.gestureTutorial')}
          >
            {/* Animated hand icon */}
            <AdaptiveMotion.div
              animate={{ x: [0, 8, 0] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
              className="shrink-0"
            >
              <Hand className="w-6 h-6 text-neo-navy" strokeWidth={2.5} />
            </AdaptiveMotion.div>

            {/* Tutorial text */}
            <span className="text-sm font-bold leading-snug text-start">
              {t('game.gestureTutorial')}
            </span>
          </button>
        </AdaptiveMotion.div>
      )}
    </AdaptiveAnimatePresence>
  );
}
