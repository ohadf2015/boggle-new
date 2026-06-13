'use client';

/**
 * StyleSelectStep — final FTUE step: the player picks a music/theme style.
 *
 * Thin wrapper around the shared StylePicker (the same grid used in Settings and
 * the one-time popup). The picker handles live preview + persistence; this step
 * only frames it with a heading and gives the player an explicit "skip for now"
 * escape so a style is never forced. Both "confirm" and "skip" call onComplete,
 * which is where OnboardingFlow finishes onboarding and routes into the game.
 */

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { StylePicker } from '@/components/playerStyle/StylePicker';

interface StyleSelectStepProps {
  /** Called once the player commits a style or chooses to skip. */
  onComplete: () => void;
}

const StyleSelectStep: React.FC<StyleSelectStepProps> = ({ onComplete }) => {
  const { t } = useLanguage();

  return (
    <div
      data-testid="style-select-step"
      className="flex max-h-[80vh] min-h-0 w-full flex-col text-center"
    >
      <h1 className="font-neo-display text-3xl font-black uppercase tracking-tight text-neo-white sm:text-4xl">
        {t('onboarding.style.title')}
      </h1>
      <p className="mx-auto mt-3 max-w-md font-neo-body text-neo-white">
        {t('onboarding.style.subtitle')}
      </p>

      {/* Picker owns its own scroll region + pinned confirm footer. */}
      <div className="mt-6 flex min-h-0 flex-1 flex-col">
        <StylePicker
          onConfirm={onComplete}
          confirmLabelKey="onboarding.style.confirm"
          footerExtra={
            <button
              type="button"
              data-testid="onboarding-style-skip"
              onClick={onComplete}
              className="self-center min-h-[44px] px-3 font-neo-body text-sm font-bold uppercase tracking-wide text-neo-cream/70 underline-offset-4 hover:text-neo-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-cyan"
            >
              {t('onboarding.style.skip')}
            </button>
          }
        />
      </div>
    </div>
  );
};

export default StyleSelectStep;
