'use client';

import React from 'react';
import { PopIn } from '@/components/motion/PopIn';
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
    // Solid full-screen layer like MpCountdownStage: the board behind it is not
    // interactive until GO, so it must not be visible (GR #11487 rage clicks).
    <div data-testid="mode-reveal" className="fixed inset-0 z-[10000] bg-neo-navy flex items-center justify-center overflow-hidden px-4">
      <PopIn className="flex w-full max-w-sm flex-col items-center gap-3 rounded-[28px] border-3 border-neo-black bg-neo-navy-light px-5 py-8 text-center shadow-[0_6px_0_rgb(var(--neo-black))] tv:max-w-2xl tv:py-14">
        {showRound && (
          <span
            data-testid="round-splash"
            className="rounded-full border-2 border-neo-black bg-neo-pink px-4 py-1 font-neo-display text-lg font-bold uppercase tracking-widest text-neo-black shadow-[0_3px_0_rgb(var(--neo-black))] tv:text-3xl"
          >
            {t('countdown.round', { number: displayRound! })}
          </span>
        )}
        <span className="max-w-full break-words font-neo-display text-5xl font-bold uppercase text-neo-lime tv:text-8xl">
          {modeLabel}
        </span>
      </PopIn>
    </div>
  );
};

export default ModeRevealOverlay;
