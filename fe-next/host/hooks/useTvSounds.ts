import { useCallback, useRef, useEffect } from 'react';
import { useSoundEffects } from '../../contexts/SoundEffectsContext';
import { useMusic } from '../../contexts/MusicContext';
import type { NotificationTier } from '../components/tv-broadcast/TvNotification';

interface UseTvSoundsOptions {
  enabled?: boolean;
  volume?: number;
}

interface UseTvSoundsResult {
  playSound: (tier: NotificationTier) => void;
  playComboBreak: () => void;
  setMuted: (muted: boolean) => void;
  setVolume: (volume: number) => void;
}

// Sound file paths (using existing sounds)
const SOUND_PATHS: Record<NotificationTier | 'combo_break', string> = {
  subtle: '/sounds/word-accepted.wav',
  medium: '/sounds/achievment.mp3',
  mega: '/sounds/fire-round-start.wav',
  combo_break: '/sounds/earthquake-rumble.wav',
};

/**
 * useTvSounds - Handles sound effects for TV broadcast notifications
 * Plays sounds based on notification tier
 */
export function useTvSounds({
  enabled = true,
  volume: initialVolume = 0.7,
}: UseTvSoundsOptions = {}): UseTvSoundsResult {
  const audioRefs = useRef<Record<string, HTMLAudioElement | null>>({});
  const mutedRef = useRef(false);
  const volumeRef = useRef(initialVolume);

  // Get global mute settings
  const { sfxMuted, sfxVolume } = useSoundEffects();
  const { isMuted: musicMuted, audioUnlocked } = useMusic();

  // Pre-load audio files
  useEffect(() => {
    if (typeof window === 'undefined' || !enabled) return;

    // Pre-create audio elements
    Object.entries(SOUND_PATHS).forEach(([key, path]) => {
      try {
        const audio = new Audio(path);
        audio.preload = 'auto';
        audio.volume = volumeRef.current;
        audioRefs.current[key] = audio;
      } catch (error) {
        console.warn(`Failed to load TV sound: ${path}`, error);
        audioRefs.current[key] = null;
      }
    });

    return () => {
      // Clean up audio elements
      Object.values(audioRefs.current).forEach(audio => {
        if (audio) {
          audio.pause();
          audio.src = '';
        }
      });
      audioRefs.current = {};
    };
  }, [enabled]);

  // Play sound by tier - respects global mute settings
  const playSound = useCallback((tier: NotificationTier) => {
    // Check both local and global mute settings
    if (!enabled || mutedRef.current || !audioUnlocked || sfxMuted || musicMuted) return;

    const audio = audioRefs.current[tier];
    if (audio) {
      // Reset and play - use global SFX volume
      audio.currentTime = 0;
      audio.volume = sfxVolume * volumeRef.current;
      audio.play().catch(error => {
        // Silently fail if autoplay is blocked
        console.debug('TV sound play failed:', error);
      });
    }
  }, [enabled, audioUnlocked, sfxMuted, musicMuted, sfxVolume]);

  // Play combo break sound - respects global mute settings
  const playComboBreak = useCallback(() => {
    // Check both local and global mute settings
    if (!enabled || mutedRef.current || !audioUnlocked || sfxMuted || musicMuted) return;

    const audio = audioRefs.current['combo_break'];
    if (audio) {
      audio.currentTime = 0;
      audio.volume = sfxVolume * volumeRef.current;
      audio.play().catch(error => {
        console.debug('Combo break sound play failed:', error);
      });
    }
  }, [enabled, audioUnlocked, sfxMuted, musicMuted, sfxVolume]);

  // Set muted state
  const setMuted = useCallback((muted: boolean) => {
    mutedRef.current = muted;
  }, []);

  // Set volume
  const setVolume = useCallback((volume: number) => {
    volumeRef.current = Math.max(0, Math.min(1, volume));
    Object.values(audioRefs.current).forEach(audio => {
      if (audio) {
        audio.volume = volumeRef.current;
      }
    });
  }, []);

  return {
    playSound,
    playComboBreak,
    setMuted,
    setVolume,
  };
}

export default useTvSounds;
