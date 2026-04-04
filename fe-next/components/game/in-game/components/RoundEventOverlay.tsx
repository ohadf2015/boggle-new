'use client';

import { memo } from 'react';
import { AdaptiveAnimatePresence, AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
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
  warningText2: string;
  activeBorderColor: string;
  activeShadow: string;
}> = {
  blizzard: {
    warningText: 'roundEvent.blizzardWarning',
    icon: '❄️',
    warningBg: 'bg-blue-900/90 border-blue-400',
    warningText2: 'text-blue-100',
    activeBorderColor: 'border-blue-400',
    activeShadow: 'shadow-[0_0_20px_rgba(96,165,250,0.5)]',
  },
  lightning: {
    warningText: 'roundEvent.lightningWarning',
    icon: '⚡',
    warningBg: 'bg-yellow-900/90 border-yellow-400',
    warningText2: 'text-yellow-100',
    activeBorderColor: 'border-yellow-400',
    activeShadow: 'shadow-[0_0_20px_rgba(250,204,21,0.5)]',
  },
  meteor: {
    warningText: 'roundEvent.meteorWarning',
    icon: '☄️',
    warningBg: 'bg-orange-900/90 border-orange-400',
    warningText2: 'text-orange-100',
    activeBorderColor: 'border-orange-400',
    activeShadow: 'shadow-[0_0_20px_rgba(251,146,60,0.5)]',
  },
};

/**
 * RoundEventOverlay - Shows warning banners and active indicators for round events.
 * Warning phase: themed banner slides down for 2s.
 * Active phase: glowing border ring around the game area.
 */
export const RoundEventOverlay = memo<RoundEventOverlayProps>(function RoundEventOverlay({
  event,
  t,
}) {
  if (!event || event.phase === 'idle') return null;

  const config = EVENT_CONFIG[event.type];

  return (
    <>
      {/* Warning Banner */}
      <AdaptiveAnimatePresence>
        {event.phase === 'warning' && (
          <AdaptiveMotion.div
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -40, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            className={`
              absolute top-0 left-1/2 -translate-x-1/2 z-50
              pointer-events-none
              flex items-center gap-2
              px-4 py-2
              border-3 border-neo-black rounded-neo
              shadow-hard font-neo-display font-bold
              ${config.warningBg} ${config.warningText2}
            `}
            aria-live="assertive"
            role="alert"
          >
            <span className="text-lg" aria-hidden="true">{config.icon}</span>
            <span className="text-sm sm:text-base uppercase tracking-wide">
              {t(config.warningText)}
            </span>
          </AdaptiveMotion.div>
        )}
      </AdaptiveAnimatePresence>

      {/* Active border glow ring */}
      <AdaptiveAnimatePresence>
        {event.phase === 'active' && (
          <AdaptiveMotion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className={`
              absolute inset-0 z-40 pointer-events-none rounded-neo
              border-3 ${config.activeBorderColor} ${config.activeShadow}
              animate-pulse
            `}
            aria-hidden="true"
          />
        )}
      </AdaptiveAnimatePresence>
    </>
  );
});
