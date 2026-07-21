'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, m, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDirectionsTutorial } from '@/hooks/useDirectionsTutorial';
import { DirectionsBoardDemo } from './DirectionsBoardDemo';

export interface DirectionsTutorialOverlayProps {
  /**
   * Master gate. Pass `true` only where a blocking, timer-pausing overlay is
   * appropriate (single-player / daily grid modes whose clock is client-owned).
   * The show-once + first-visit logic lives in the hook; this just enables it.
   */
  enabled?: boolean;
  /** Fires once when the overlay first shows (cross-device DB backfill hook). */
  onShown?: () => void;
}

/**
 * First-time, blocking tutorial that teaches the one thing new players miss:
 * tiles connect in ALL 8 directions, diagonals included. Freezes the game clock
 * while up (via the pause event bus), can't be skipped for ~10s, and is shown
 * exactly once per device. Visual-first and interactive — the player traces a
 * diagonal word themselves. Rendered through a portal so a transformed game
 * container can't become the containing block for `position: fixed`.
 */
export function DirectionsTutorialOverlay({ enabled = true, onShown }: DirectionsTutorialOverlayProps) {
  const { t, language } = useLanguage();
  const reduced = useReducedMotion() ?? false;
  const { visible, secondsLeft, canDismiss, dismiss } = useDirectionsTutorial({ enabled, onShown });
  const [mounted, setMounted] = useState(false);
  const [traced, setTraced] = useState(false);

  useEffect(() => setMounted(true), []);

  // Escape closes it — but only once the un-skippable window has passed.
  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && canDismiss) dismiss('escape');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, canDismiss, dismiss]);

  // Lock body scroll while the overlay covers the screen.
  useEffect(() => {
    if (!visible || typeof document === 'undefined') return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [visible]);

  if (!mounted || typeof document === 'undefined') return null;
  const isRtl = language === 'he';

  return createPortal(
    <AnimatePresence>
      {visible && (
        <m.div
          className="fixed inset-0 z-[9998] flex items-center justify-center p-4"
          dir={isRtl ? 'rtl' : 'ltr'}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          role="dialog"
          aria-modal="true"
          aria-label={t('directionsTutorial.title')}
        >
          <div className="absolute inset-0 bg-neo-black/85" aria-hidden="true" />

          <m.div
            initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.92, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 8 }}
            transition={reduced ? { duration: 0.15 } : { type: 'spring', stiffness: 320, damping: 26 }}
            className="relative flex w-full max-w-sm flex-col items-center gap-4 rounded-neo-lg border-4 border-black bg-neo-navy p-6 text-center shadow-hard-lg"
          >
            <span className="rounded-neo border-neo-thick border-black bg-neo-lime px-3 py-1 font-neo-display text-xs font-black uppercase tracking-wide text-neo-black shadow-hard-sm">
              {t('directionsTutorial.badge')}
            </span>

            <h2 className="font-neo-display text-2xl font-black uppercase leading-none tracking-tight text-neo-white">
              {t('directionsTutorial.title')}
            </h2>
            <p className="max-w-[16rem] font-neo-body text-sm font-semibold leading-snug text-neo-white/80">
              {t('directionsTutorial.subtitle')}
            </p>

            <DirectionsBoardDemo onTraced={() => setTraced(true)} />

            <p
              aria-live="polite"
              className={cn(
                'min-h-[1.5rem] font-neo-body text-sm font-bold',
                traced ? 'text-neo-lime' : 'text-neo-white/70',
              )}
            >
              {traced ? t('directionsTutorial.donePrompt') : t('directionsTutorial.tryPrompt')}
            </p>

            <button
              type="button"
              onClick={() => dismiss(traced ? 'traced' : 'button')}
              disabled={!canDismiss}
              aria-label={t('directionsTutorial.cta')}
              className={cn(
                'w-full rounded-neo border-neo-thick border-black px-6 py-3 font-neo-display text-base font-black uppercase shadow-hard transition-transform',
                canDismiss
                  ? 'bg-neo-lime text-neo-black active:translate-y-0.5 active:shadow-hard-pressed'
                  : 'cursor-not-allowed bg-neo-navy-light text-neo-white/50',
              )}
            >
              {canDismiss
                ? t('directionsTutorial.cta')
                : t('directionsTutorial.ctaWait', { seconds: secondsLeft })}
            </button>
          </m.div>
        </m.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
