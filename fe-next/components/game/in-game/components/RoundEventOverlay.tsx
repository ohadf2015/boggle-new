'use client';

import { memo, useEffect, useState } from 'react';
import { AdaptiveAnimatePresence, AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { RoundEventCanvas } from './RoundEventCanvas';
import type { TranslationFn } from '../types';

export type RoundEventType = 'blizzard' | 'lightning' | 'meteor';

export interface RoundEventState {
  type: RoundEventType;
  phase: 'warning' | 'active' | 'idle';
  duration?: number;
}

interface RoundEventOverlayProps {
  event: RoundEventState | null;
  t: TranslationFn;
}

const EVENT_CONFIG: Record<RoundEventType, {
  warningText: string;
  icon: string;
  warningBg: string;
  warningGlow: string;
  activeBorderColor: string;
  activeShadow: string;
  activeGradient: string;
}> = {
  blizzard: {
    warningText: 'roundEvent.blizzardWarning',
    icon: '❄️',
    warningBg: 'bg-gradient-to-r from-blue-900/95 via-cyan-900/95 to-blue-900/95 border-cyan-300',
    warningGlow: 'shadow-[0_0_40px_rgba(96,165,250,0.7),0_0_80px_rgba(96,165,250,0.3)]',
    activeBorderColor: 'border-cyan-300/60',
    activeShadow: 'shadow-[inset_0_0_30px_rgba(96,165,250,0.15),0_0_40px_rgba(96,165,250,0.3)]',
    activeGradient: 'bg-gradient-to-b from-cyan-500/5 via-transparent to-cyan-500/5',
  },
  lightning: {
    warningText: 'roundEvent.lightningWarning',
    icon: '⚡',
    warningBg: 'bg-gradient-to-r from-indigo-900/95 via-purple-900/95 to-indigo-900/95 border-yellow-300',
    warningGlow: 'shadow-[0_0_40px_rgba(250,204,21,0.7),0_0_80px_rgba(250,204,21,0.3)]',
    activeBorderColor: 'border-yellow-300/60',
    activeShadow: 'shadow-[inset_0_0_30px_rgba(250,204,21,0.1),0_0_40px_rgba(250,204,21,0.3)]',
    activeGradient: 'bg-gradient-to-b from-purple-500/5 via-transparent to-purple-500/5',
  },
  meteor: {
    warningText: 'roundEvent.meteorWarning',
    icon: '☄️',
    warningBg: 'bg-gradient-to-r from-red-900/95 via-orange-900/95 to-red-900/95 border-orange-300',
    warningGlow: 'shadow-[0_0_40px_rgba(251,146,60,0.7),0_0_80px_rgba(251,146,60,0.3)]',
    activeBorderColor: 'border-orange-400/60',
    activeShadow: 'shadow-[inset_0_0_30px_rgba(251,146,60,0.1),0_0_40px_rgba(251,146,60,0.3)]',
    activeGradient: 'bg-gradient-to-b from-orange-500/5 via-transparent to-orange-500/5',
  },
};

/**
 * RoundEventOverlay — Dramatic warning banners + canvas particle effects for round events.
 * Warning: fullscreen cinematic announcement with screen shake.
 * Active: canvas-driven particles (snow/meteors/lightning) + atmospheric border glow.
 */
export const RoundEventOverlay = memo<RoundEventOverlayProps>(function RoundEventOverlay({
  event,
  t,
}) {
  const [showWarningFlash, setShowWarningFlash] = useState(false);

  // Brief screen flash when warning appears
  useEffect(() => {
    if (event?.phase === 'warning') {
      setShowWarningFlash(true);
      const timer = setTimeout(() => setShowWarningFlash(false), 150);
      return () => clearTimeout(timer);
    }
    setShowWarningFlash(false);
    return undefined;
  }, [event?.phase, event?.type]);

  if (!event || event.phase === 'idle') return null;

  const config = EVENT_CONFIG[event.type];

  return (
    <>
      {/* Screen flash on warning */}
      <AdaptiveAnimatePresence>
        {showWarningFlash && (
          <AdaptiveMotion.div
            initial={{ opacity: 0.4 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute inset-0 z-[60] pointer-events-none bg-white"
            aria-hidden="true"
          />
        )}
      </AdaptiveAnimatePresence>

      {/* Warning Banner — cinematic fullscreen announcement */}
      <AdaptiveAnimatePresence>
        {event.phase === 'warning' && (
          <AdaptiveMotion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 z-50 pointer-events-none flex items-center justify-center"
            aria-live="assertive"
            role="alert"
          >
            {/* Dark backdrop */}
            <div className="absolute inset-0 bg-black/40" />

            {/* Warning card */}
            <AdaptiveMotion.div
              initial={{ scale: 0.3, y: -20, rotateX: 40 }}
              animate={{ scale: 1, y: 0, rotateX: 0 }}
              exit={{ scale: 1.3, opacity: 0 }}
              transition={{
                type: 'spring',
                stiffness: 500,
                damping: 25,
                mass: 0.8,
              }}
              className={`
                relative z-10 flex flex-col items-center gap-1
                px-8 py-4 rounded-2xl
                border-3 ${config.warningBg}
                ${config.warningGlow}
                font-neo-display
              `}
            >
              {/* Icon with bounce */}
              <AdaptiveMotion.span
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 600, damping: 15 }}
                className="text-4xl sm:text-5xl drop-shadow-lg"
                aria-hidden="true"
              >
                {config.icon}
              </AdaptiveMotion.span>

              {/* Text with stagger */}
              <AdaptiveMotion.span
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.2 }}
                className="text-lg sm:text-2xl uppercase tracking-widest font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
              >
                {t(config.warningText)}
              </AdaptiveMotion.span>
            </AdaptiveMotion.div>
          </AdaptiveMotion.div>
        )}
      </AdaptiveAnimatePresence>

      {/* Active phase — canvas particles + atmospheric border */}
      <AdaptiveAnimatePresence>
        {event.phase === 'active' && (
          <AdaptiveMotion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className={`
              absolute inset-0 z-40 pointer-events-none rounded-neo
              border-2 ${config.activeBorderColor}
              ${config.activeShadow}
              ${config.activeGradient}
            `}
            aria-hidden="true"
          />
        )}
      </AdaptiveAnimatePresence>

      {/* Canvas particle effects */}
      <RoundEventCanvas event={event} />
    </>
  );
});
