'use client';

import { useEffect, useRef } from 'react';
import { AnimatePresence, m, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useModeCoach } from '@/hooks/useModeCoach';
import { getModeCoach, type CoachAccent } from '@/lib/tutorial/modeCoachContent';
import type { CoachModeKey } from '@/lib/tutorial/modeCoachStore';
import { CoachDemo } from './CoachDemo';

const ACCENT_BTN: Record<CoachAccent, string> = {
  lime: 'bg-neo-lime text-neo-black',
  cyan: 'bg-neo-cyan text-neo-black',
  pink: 'bg-neo-pink text-neo-white',
  purple: 'bg-neo-purple text-neo-white',
};
const ACCENT_BORDER: Record<CoachAccent, string> = {
  lime: 'border-neo-lime',
  cyan: 'border-neo-cyan',
  pink: 'border-neo-pink',
  purple: 'border-neo-purple',
};
const ACCENT_DOT: Record<CoachAccent, string> = {
  lime: 'bg-neo-lime',
  cyan: 'bg-neo-cyan',
  pink: 'bg-neo-pink',
  purple: 'bg-neo-purple',
};

export interface ModeCoachProps {
  mode: CoachModeKey;
  /** Fires once when the coach first shows — use for cross-device DB backfill. */
  onShown?: () => void;
  /** Grace period before the "touch the board to dismiss" listener arms. */
  graceMs?: number;
  /** `bottom` docks a compact card under the board for modes whose HUD fills the top. */
  placement?: 'top' | 'bottom';
}

const ANCHOR = {
  top: 'top-0 pt-[max(4.25rem,calc(env(safe-area-inset-top)+3.75rem))]',
  bottom: 'bottom-0 pb-[max(0.75rem,calc(env(safe-area-inset-bottom)+0.5rem))]',
} as const;

/**
 * Gentle, non-blocking FTUE coach. Floats at the top (or docked at the bottom) over live
 * gameplay — the wrapper is pointer-events-none so the board behind stays fully
 * playable, and the first touch on the board (after a short grace) dismisses it.
 * Shows once per mode per device. Visual-first: a looping gesture demo carries
 * the meaning, the caption is ≤6 words.
 */
export function ModeCoach({ mode, onShown, graceMs = 1500, placement = 'top' }: ModeCoachProps) {
  const content = getModeCoach(mode);
  const { t, language } = useLanguage();
  const reduced = useReducedMotion() ?? false;
  const { visible, stepIndex, isLastStep, advance, dismiss } = useModeCoach(mode, { onShown });
  const cardRef = useRef<HTMLDivElement>(null);

  // Dismiss on first board interaction (after grace) + on Escape. This is what
  // makes it "auto-dismiss on first action" without per-mode gameplay wiring.
  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss('escape');
    };
    let armed = false;
    const arm = window.setTimeout(() => {
      armed = true;
    }, graceMs);
    const onPointer = (e: PointerEvent) => {
      // Taps on the coach itself (Next / Skip / dots) must NOT dismiss — only a
      // tap on the board behind it counts as "started playing". The window
      // listener is capture-phase, so guard by DOM containment, not React's
      // bubble-phase stopPropagation (which runs too late to help here).
      if (cardRef.current?.contains(e.target as Node)) return;
      if (armed) dismiss('board_touch');
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onPointer, { capture: true });
    return () => {
      window.clearTimeout(arm);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onPointer, { capture: true } as EventListenerOptions);
    };
  }, [visible, dismiss, graceMs]);

  if (!content) return null;
  const step = content.steps[stepIndex];
  const accent = content.accent;
  const isRtl = language === 'he';
  const compact = placement === 'bottom';
  const enterY = compact ? 24 : -24;
  const caption = (
    <p
      className={cn(
        'font-neo-body font-semibold leading-snug text-neo-white',
        compact ? 'text-start text-sm' : 'text-center text-base',
      )}
    >
      {t(step?.captionKey ?? '')}
    </p>
  );

  return (
    <AnimatePresence>
      {visible && step && (
        <div
          data-placement={placement}
          className={cn('pointer-events-none fixed inset-x-0 z-[70] flex justify-center px-3', ANCHOR[placement])}
          dir={isRtl ? 'rtl' : 'ltr'}
        >
          <m.div
            ref={cardRef}
            role="dialog"
            aria-label={t(content.titleKey)}
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: enterY }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: enterY * 0.75 }}
            transition={reduced ? { duration: 0.15 } : { type: 'spring', stiffness: 380, damping: 30 }}
            className={cn(
              'pointer-events-auto w-full rounded-neo border-neo-thick bg-neo-navy-light shadow-hard-lg',
              compact ? 'flex max-w-sm flex-col gap-2 p-3' : 'flex max-w-xs flex-col gap-3 p-4',
              ACCENT_BORDER[accent],
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-neo-display text-base font-black uppercase tracking-tight text-neo-white">
                {t(content.titleKey)}
              </h3>
              <button
                type="button"
                onClick={() => dismiss('skip')}
                aria-label={t('modeCoach.skip')}
                className="shrink-0 font-neo-body text-xs font-bold text-neo-white/50 underline-offset-2 hover:text-neo-white hover:underline"
              >
                {t('modeCoach.skip')}
              </button>
            </div>

            {compact ? (
              <div data-testid="mode-coach-demo-row" className="flex items-center gap-3">
                <CoachDemo demo={step.demo} accent={accent} emoji={step.emoji} compact />
                {caption}
              </div>
            ) : (
              <>
                <CoachDemo demo={step.demo} accent={accent} emoji={step.emoji} />
                {caption}
              </>
            )}

            {isLastStep && content.scoreTipKey && (
              <p className={cn('rounded-neo border-2 border-black px-2 py-1 text-center font-neo-body text-xs font-bold', ACCENT_BTN[accent])}>
                {t(content.scoreTipKey)}
              </p>
            )}

            <div className="flex items-center justify-between gap-3">
              <div className="flex gap-1.5" aria-hidden="true">
                {content.steps.map((_, i) => (
                  <span
                    key={i}
                    className={cn(
                      'h-2 w-2 rounded-full border border-black transition-colors',
                      i === stepIndex ? ACCENT_DOT[accent] : 'bg-neo-navy',
                    )}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={advance}
                className={cn(
                  'rounded-neo border-neo-thick border-black px-5 py-2 font-neo-display text-sm font-black uppercase shadow-hard',
                  'transition-transform active:translate-y-0.5 active:shadow-hard-pressed',
                  ACCENT_BTN[accent],
                )}
              >
                {isLastStep ? t('modeCoach.gotIt') : t('modeCoach.next')}
              </button>
            </div>
          </m.div>
        </div>
      )}
    </AnimatePresence>
  );
}
