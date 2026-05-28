'use client';

import React, { memo, useCallback } from 'react';
import { Volume2, VolumeX, Sparkles } from 'lucide-react';
import { useMusic } from '@/contexts/MusicContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { useReducedEffects } from '@/hooks/useReducedEffects';

export interface SurvivalAudioEffectsControlsProps {
  t: (key: string, fallback?: string) => string;
}

const BTN_BASE =
  'flex items-center justify-center w-9 h-9 min-w-[36px] min-h-[36px] bg-neo-black/50 border-2 border-neo-cream/10 rounded-full hover:bg-neo-black/70 active:scale-95 transition-all duration-150';

/**
 * SurvivalAudioEffectsControls — in-game audio + effects toggles.
 *
 * The app's main MusicControls live in the global header, which AutoHideHeader
 * removes during active gameplay — so the daily challenge had no on-screen mute
 * or effects control. This compact pair sits in the in-game header bar:
 *  - Audio button mutes/unmutes music AND sfx together (master-mute parity).
 *  - Effects button suppresses particles/flashes/confetti (remembered).
 */
export const SurvivalAudioEffectsControls = memo<SurvivalAudioEffectsControlsProps>(({ t }) => {
  const { isMuted, toggleMute, audioUnlocked, unlockAudio } = useMusic();
  const { sfxMuted, toggleSfxMute } = useSoundEffects();
  const [effectsReduced, toggleEffects] = useReducedEffects();

  const allMuted = isMuted && sfxMuted;

  // Coherent target (mirrors MusicControls): any channel audible → mute both;
  // both muted → unmute both. Never flip a channel against the chosen direction.
  const handleAudioClick = useCallback(() => {
    if (!audioUnlocked) {
      unlockAudio();
      return;
    }
    const anyAudible = !isMuted || !sfxMuted;
    if (anyAudible) {
      if (!isMuted) toggleMute();
      if (!sfxMuted) toggleSfxMute();
    } else {
      if (isMuted) toggleMute();
      if (sfxMuted) toggleSfxMute();
    }
  }, [audioUnlocked, unlockAudio, isMuted, sfxMuted, toggleMute, toggleSfxMute]);

  const audioLabel = allMuted ? t('music.unmute', 'Unmute') : t('music.mute', 'Mute');
  // Reuse the established effects.* keys (already localized in every locale) so
  // the toggle needs no new translation strings.
  const effectsLabel = effectsReduced
    ? t('effects.enable', 'Enable effects')
    : t('effects.disableAnimations', 'Disable effects');

  return (
    <div className="flex items-center gap-1.5" role="group" aria-label={t('music.controls', 'Sound controls')}>
      <button
        type="button"
        onClick={handleAudioClick}
        className={`${BTN_BASE} ${allMuted ? 'text-neo-white' : 'text-neo-white'}`}
        aria-label={audioLabel}
        aria-pressed={!allMuted}
        title={allMuted ? t('music.soundOff', 'Sound off') : t('music.soundOn', 'Sound on')}
      >
        {allMuted
          ? <VolumeX className="w-4 h-4" strokeWidth={2.5} aria-hidden="true" />
          : <Volume2 className="w-4 h-4" strokeWidth={2.5} aria-hidden="true" />}
      </button>

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
