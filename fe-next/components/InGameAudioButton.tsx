'use client';

import React, { memo, useCallback } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { useNavigation } from '@/contexts/NavigationContext';
import { useMusic } from '@/contexts/MusicContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { useTvFullscreenListener } from '@/hooks/useTvFullscreenListener';
import { useLanguage } from '@/contexts/LanguageContext';
import { resolveMasterMuteClick } from '@/lib/audio/masterMuteToggle';

/**
 * InGameAudioButton — global, always-available mute control during gameplay.
 *
 * The full MusicControls dropdown lives in the global header, which AutoHideHeader
 * removes during active play — so almost every game mode (single player, blast,
 * wordcraft, brain drills, adventure, multiplayer...) had no on-screen way to mute.
 *
 * Mounted ONCE in the locale layout (next to GlobalBottomNav, inside the providers
 * where NavigationContext lives). It appears only during active gameplay
 * (isInGame), and never during a passive TV broadcast (isTvFullscreen). A FAB at a
 * single global node covers every game without touching each screen, and sitting
 * inside the reserved top-header band keeps it clear of most in-game HUDs.
 *
 * Mute only (the user asked for mute/unmute). Master-mute parity with MusicControls
 * via resolveMasterMuteClick: silence wins when unlocked, the enable tap is never
 * swallowed when locked.
 */
const InGameAudioButton: React.FC = memo(() => {
  const { isInGame } = useNavigation();
  const isTvFullscreen = useTvFullscreenListener();
  const { isMuted, toggleMute, audioUnlocked, unlockAudio } = useMusic();
  const { sfxMuted, toggleSfxMute } = useSoundEffects();
  const { t, language } = useLanguage();
  const isRTL = language === 'he';

  const handleClick = useCallback(() => {
    const action = resolveMasterMuteClick({ audioUnlocked, isMuted, sfxMuted });
    if (action.unlock) unlockAudio();
    if (action.toggleMusic) toggleMute();
    if (action.toggleSfx) toggleSfxMute();
  }, [audioUnlocked, unlockAudio, isMuted, sfxMuted, toggleMute, toggleSfxMute]);

  // Passive broadcast view has no player to mute for — leave it untouched.
  if (!isInGame || isTvFullscreen) return null;

  const allMuted = isMuted && sfxMuted;
  const label = allMuted ? t('music.unmute', 'Unmute') : t('music.mute', 'Mute');

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={label}
      aria-pressed={!allMuted}
      title={allMuted ? t('music.soundOff', 'Sound off') : t('music.soundOn', 'Sound on')}
      className={[
        'fixed z-[70] top-[max(0.5rem,env(safe-area-inset-top))]',
        isRTL
          ? 'left-[max(0.5rem,env(safe-area-inset-left))]'
          : 'right-[max(0.5rem,env(safe-area-inset-right))]',
        'flex items-center justify-center w-10 h-10 min-w-[40px] min-h-[40px]',
        'rounded-full border-2 border-neo-cream/20 bg-neo-black/55 text-neo-white',
        'backdrop-blur-sm shadow-hard-sm',
        'hover:bg-neo-black/75 active:scale-95 transition-all duration-150',
      ].join(' ')}
    >
      {allMuted
        ? <VolumeX className="w-[18px] h-[18px]" strokeWidth={2.5} aria-hidden="true" />
        : <Volume2 className="w-[18px] h-[18px]" strokeWidth={2.5} aria-hidden="true" />}
    </button>
  );
});

InGameAudioButton.displayName = 'InGameAudioButton';

export default InGameAudioButton;
