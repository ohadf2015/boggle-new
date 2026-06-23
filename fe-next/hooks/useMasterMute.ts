'use client';

import { useCallback } from 'react';
import { useMusic } from '@/contexts/MusicContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { resolveMasterMuteClick } from '@/lib/audio/masterMuteToggle';

export interface MasterMute {
  /** True only when BOTH music and SFX are silenced. */
  allMuted: boolean;
  /** Master-mute toggle — silence wins when unlocked, unlock-first when locked. */
  toggle: () => void;
  /** Localized action label for aria-label ("Mute" / "Unmute"). */
  label: string;
  /** Localized tooltip ("Sound on" / "Sound off"). */
  title: string;
}

/**
 * Shared master mute/unmute behaviour for every on-screen audio control.
 *
 * Both the global in-game FAB (InGameAudioButton) and the in-header lobby
 * control read from here so they cannot drift: one call decides the click via
 * resolveMasterMuteClick (silence-wins when unlocked, never swallow the enable
 * tap when locked) and exposes the same label/title strings.
 */
export function useMasterMute(): MasterMute {
  const { isMuted, toggleMute, audioUnlocked, unlockAudio } = useMusic();
  const { sfxMuted, toggleSfxMute } = useSoundEffects();
  const { t } = useLanguage();

  const toggle = useCallback(() => {
    const action = resolveMasterMuteClick({ audioUnlocked, isMuted, sfxMuted });
    if (action.unlock) unlockAudio();
    if (action.toggleMusic) toggleMute();
    if (action.toggleSfx) toggleSfxMute();
  }, [audioUnlocked, unlockAudio, isMuted, sfxMuted, toggleMute, toggleSfxMute]);

  const allMuted = isMuted && sfxMuted;

  return {
    allMuted,
    toggle,
    label: allMuted ? t('music.unmute', 'Unmute') : t('music.mute', 'Mute'),
    title: allMuted ? t('music.soundOff', 'Sound off') : t('music.soundOn', 'Sound on'),
  };
}
