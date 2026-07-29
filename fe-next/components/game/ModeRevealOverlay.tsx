'use client';

import React from 'react';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { useModeFirstSeen, type IntroMode } from '@/hooks/useModeFirstSeen';
import ModeIntroCard from './ModeIntroCard';

type TFunction = (key: string, params?: Record<string, string | number>) => string;

export interface ModeRevealOverlayProps {
  modeLabel: string;
  seriesRoundNumber?: number;
  t: TFunction;
  /** When provided + first-time for this mode, renders cozy intro instead of splash. */
  modeKey?: IntroMode;
  /** Called when first-time user taps CTA / Skip. Required if modeKey is set. */
  onIntroDismiss?: () => void;
}

/**
 * Mode reveal — first-time gets cozy ModeIntroCard, returning players get fast splash.
 * Splash displays game mode + optional "ROUND N" for series games (round 2+).
 */
const ModeRevealOverlay: React.FC<ModeRevealOverlayProps> = ({
  modeLabel,
  seriesRoundNumber,
  t,
  modeKey,
  onIntroDismiss,
}) => {
  const { hasSeen, markSeen } = useModeFirstSeen(modeKey ?? 'classic');
  const showIntro = modeKey != null && !hasSeen;

  if (showIntro) {
    return (
      <ModeIntroCard
        mode={modeKey}
        t={t}
        onContinue={() => {
          markSeen();
          onIntroDismiss?.();
        }}
      />
    );
  }

  const showRound = seriesRoundNumber != null && seriesRoundNumber >= 1;
  const displayRound = showRound ? seriesRoundNumber + 1 : null;

  return (
    <div className="h-full bg-neo-navy flex items-center justify-center overflow-hidden">
      <AdaptiveAnimatePresence>
        <AdaptiveMotion.div
          key="mode-reveal"
          initial={{ scale: 0.3, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 1.5, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="flex flex-col items-center gap-4"
        >
          {showRound && (
            <div
              data-testid="round-splash"
              className="text-3xl font-neo-display font-bold text-neo-pink uppercase tracking-widest animate-neo-pop"
            >
              {t('countdown.round', { number: displayRound! })}
            </div>
          )}
          <div className="text-7xl font-neo-display font-black text-neo-lime uppercase tracking-wider drop-shadow-[0_0_40px_rgba(163,230,53,0.5)]">
            {modeLabel}
          </div>
          <AdaptiveMotion.div
            initial={{ width: 0 }}
            animate={{ width: '80%' }}
            transition={{ delay: 0.3, duration: 0.6, ease: 'easeOut' }}
            className="h-1 bg-neo-lime rounded-full"
          />
        </AdaptiveMotion.div>
      </AdaptiveAnimatePresence>
    </div>
  );
};

export default ModeRevealOverlay;
