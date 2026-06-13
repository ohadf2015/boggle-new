'use client';

import React, { memo } from 'react';
import { Sparkles } from 'lucide-react';
import { useReducedEffects } from '@/hooks/useReducedEffects';

export interface SurvivalAudioEffectsControlsProps {
  t: (key: string, fallback?: string) => string;
}

const BTN_BASE =
  'flex items-center justify-center w-9 h-9 min-w-[36px] min-h-[36px] bg-neo-black/50 border-2 border-neo-cream/10 rounded-full hover:bg-neo-black/70 active:scale-95 transition-all duration-150';

/**
 * SurvivalAudioEffectsControls — in-game effects toggle.
 *
 * Mute lives in the global InGameAudioButton FAB now (mounted in the locale
 * layout, shown during all active gameplay), so this no longer renders its own
 * audio button — that would double up the mute on the daily challenge screens.
 * The effects toggle stays here because the FAB is mute-only: it suppresses
 * particles/flashes/confetti (remembered) and reuses the established effects.*
 * keys (already localized in every locale).
 */
export const SurvivalAudioEffectsControls = memo<SurvivalAudioEffectsControlsProps>(({ t }) => {
  const [effectsReduced, toggleEffects] = useReducedEffects();

  const effectsLabel = effectsReduced
    ? t('effects.enable', 'Enable effects')
    : t('effects.disableAnimations', 'Disable effects');

  return (
    <div className="flex items-center gap-1.5" role="group" aria-label={t('music.controls', 'Sound controls')}>
      <button
        type="button"
        onClick={toggleEffects}
        className={`${BTN_BASE} ${effectsReduced ? 'text-neo-white' : 'text-neo-lime/80'}`}
        aria-label={effectsLabel}
        aria-pressed={effectsReduced}
        title={effectsLabel}
      >
        <Sparkles className="w-4 h-4" strokeWidth={2.5} aria-hidden="true" />
      </button>
    </div>
  );
});

SurvivalAudioEffectsControls.displayName = 'SurvivalAudioEffectsControls';

export default SurvivalAudioEffectsControls;
