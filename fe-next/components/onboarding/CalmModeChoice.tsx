'use client';

import React from 'react';
import { Coffee, Zap } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface CalmModeChoiceProps {
  /** Called with the chosen vibe — `true` = Calm Mode on, `false` = energetic. */
  onChoose: (cosy: boolean) => void;
}

/**
 * CalmModeChoice — onboarding step where a new player picks their vibe.
 *
 * This is the "have both" moment made explicit: the loud/competitive energy and
 * the gentle/low-pressure experience are presented side by side as equal,
 * first-class choices. Picking "Calm" flips `cosyMode` on before the very first
 * tutorial game, so the player immediately sees the gentler experience.
 *
 * Either choice is fully reversible later from Settings → Calm Mode.
 */
const CalmModeChoice: React.FC<CalmModeChoiceProps> = ({ onChoose }) => {
  const { t } = useLanguage();

  return (
    <div data-testid="calm-mode-choice" className="flex flex-col items-center text-center">
      <h1 className="font-neo-display text-3xl sm:text-4xl font-black text-neo-cream uppercase tracking-tight">
        {t('onboarding.calmMode.title')}
      </h1>
      <p className="mt-3 font-neo-body text-neo-cream/70 max-w-md">
        {t('onboarding.calmMode.subtitle')}
      </p>

      <div className="mt-8 grid w-full max-w-2xl gap-4 sm:grid-cols-2">
        {/* Energetic — the default loud/competitive experience */}
        <button
          type="button"
          onClick={() => onChoose(false)}
          className="group flex flex-col items-center gap-3 rounded-neo border-neo-thick border-neo-black bg-neo-lime p-6 text-neo-black shadow-hard-lg transition-transform hover:-translate-y-1 active:translate-y-0 active:shadow-hard focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-lime/50"
        >
          <Zap className="h-10 w-10" strokeWidth={2.5} aria-hidden />
          <span className="font-neo-display text-2xl font-black uppercase">
            {t('onboarding.calmMode.energetic')}
          </span>
          <span className="font-neo-body text-sm font-medium opacity-80">
            {t('onboarding.calmMode.energeticDesc')}
          </span>
        </button>

        {/* Calm — gentler visuals, no time pressure, softer celebrations */}
        <button
          type="button"
          onClick={() => onChoose(true)}
          className="group flex flex-col items-center gap-3 rounded-neo border-neo-thick border-neo-black bg-neo-cyan p-6 text-neo-black shadow-hard-lg transition-transform hover:-translate-y-1 active:translate-y-0 active:shadow-hard focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan/50"
        >
          <Coffee className="h-10 w-10" strokeWidth={2.5} aria-hidden />
          <span className="font-neo-display text-2xl font-black uppercase">
            {t('onboarding.calmMode.calm')}
          </span>
          <span className="font-neo-body text-sm font-medium opacity-80">
            {t('onboarding.calmMode.calmDesc')}
          </span>
        </button>
      </div>

      <p className="mt-6 font-neo-body text-xs text-neo-cream/50">
        {t('onboarding.calmMode.changeLater')}
      </p>
    </div>
  );
};

export default CalmModeChoice;
