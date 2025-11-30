'use client';

import React, { createContext, useContext, useEffect, useRef, useCallback, useState, ReactNode } from 'react';
import { Howl } from 'howler';
import { useMusic } from './MusicContext';
import logger from '@/utils/logger';

interface SoundEffectOptions {
  volume?: number;
  rate?: number;
}

interface SoundEffectsContextType {
  sfxVolume: number;
  sfxMuted: boolean;
  setSfxVolume: (volume: number) => void;
  toggleSfxMute: () => void;
  playSound: (soundKey: keyof typeof SOUND_EFFECTS, options?: SoundEffectOptions) => void;
  playComboSound: (comboLevel: number) => void;
  playAchievementSound: () => void;
  playWordAcceptedSound: () => void;
  playCountdownBeep: (secondsRemaining: number) => void;
  playMessageSound: () => void;
}

interface SfxSettings {
  volume: number;
  muted: boolean;
}

const SoundEffectsContext = createContext<SoundEffectsContextType | null>(null);

// Sound effect definitions
const SOUND_EFFECTS = {
  achievement: '/sounds/achievment.mp3',
  combo: '/sounds/combo.wav',
  wordAccepted: '/sounds/word-accepted.wav',
  countdownBeep: '/sounds/countdown-beep.wav',
  message: '/sounds/message.mp3',
} as const;

const SFX_STORAGE_KEY = 'boggle_sfx_settings';

interface SoundEffectsProviderProps {
  children: ReactNode;
}

export function SoundEffectsProvider({ children }: SoundEffectsProviderProps) {
  const { isMuted, audioUnlocked } = useMusic();
  const soundsRef = useRef<Record<string, Howl>>({});
  const soundsLoadedRef = useRef(false);
  const isTabVisibleRef = useRef(true);

  // Separate volume state for sound effects
  const [sfxVolume, setSfxVolumeState] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(SFX_STORAGE_KEY);
        if (saved) {
          const { volume } = JSON.parse(saved) as SfxSettings;
          return volume ?? 0.7;
        }
      } catch (e) {
        logger.warn('Failed to load SFX settings:', e);
      }
    }
    return 0.7;
  });

  const [sfxMuted, setSfxMuted] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(SFX_STORAGE_KEY);
        if (saved) {
          const { muted } = JSON.parse(saved) as SfxSettings;
          return muted ?? false;
        }
      } catch (e) {
        logger.warn('Failed to load SFX settings:', e);
      }
    }
    return false;
  });

  // Persist SFX settings to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(SFX_STORAGE_KEY, JSON.stringify({ volume: sfxVolume, muted: sfxMuted }));
      } catch (e) {
        logger.warn('Failed to save SFX settings:', e);
      }
    }
  }, [sfxVolume, sfxMuted]);

  // Set SFX volume
  const setSfxVolume = useCallback((newVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    setSfxVolumeState(clampedVolume);
  }, []);

  // Toggle SFX mute
  const toggleSfxMute = useCallback(() => {
    setSfxMuted(prev => !prev);
  }, []);

  // Track tab visibility to block sounds when tab is hidden
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleVisibilityChange = () => {
      isTabVisibleRef.current = document.visibilityState === 'visible';
      logger.log('[SFX] Tab visibility changed:', isTabVisibleRef.current ? 'visible' : 'hidden');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Initialize sound effects
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (soundsLoadedRef.current) return; // Prevent re-initialization

    // Create Howl instances for each sound effect
    Object.entries(SOUND_EFFECTS).forEach(([key, src]) => {
      soundsRef.current[key] = new Howl({
        src: [src],
        volume: 0.6,
        preload: true,
        html5: false, // Web Audio API for pitch control
        onload: () => {
          logger.log(`[SFX] Loaded: ${key}`);
        },
        onloaderror: (id, err) => {
          logger.warn(`[SFX] Failed to load ${key}:`, err);
        },
      });
    });

    soundsLoadedRef.current = true;

    // Copy ref value for cleanup to avoid stale ref warnings
    const sounds = soundsRef.current;

    return () => {
      // Cleanup on unmount
      Object.values(sounds).forEach(howl => {
        howl.unload();
      });
    };
  }, []);

  // Play a sound effect
  const playSound = useCallback((soundKey: keyof typeof SOUND_EFFECTS, options: SoundEffectOptions = {}) => {
    if (!audioUnlocked || isMuted || sfxMuted || !isTabVisibleRef.current) return;

    const howl = soundsRef.current[soundKey];
    if (!howl) {
      logger.warn(`[SFX] Sound not found: ${soundKey}`);
      return;
    }

    // Apply volume (uses separate SFX volume)
    const effectiveVolume = (options.volume ?? 0.6) * sfxVolume;
    howl.volume(effectiveVolume);

    // Apply playback rate (pitch) if specified
    if (options.rate) {
      howl.rate(options.rate);
    } else {
      howl.rate(1.0); // Reset to normal
    }

    howl.play();
  }, [audioUnlocked, isMuted, sfxMuted, sfxVolume]);

  // Play combo sound with dynamic pitch based on combo level
  // Pitch increases with each combo level (infinite scaling)
  const playComboSound = useCallback((comboLevel: number) => {
    if (!audioUnlocked || isMuted || sfxMuted || !isTabVisibleRef.current || comboLevel < 1) return;

    // Calculate pitch rate: starts at 1.0, increases by ~0.1 per combo level
    // Uses logarithmic scaling for smooth progression that doesn't get too extreme
    // Level 1: 1.0, Level 5: ~1.3, Level 10: ~1.6, Level 20: ~2.0
    const baseRate = 1.0;
    const pitchIncrease = Math.log2(comboLevel + 1) * 0.25;
    const rate = Math.min(baseRate + pitchIncrease, 3.0); // Cap at 3x for sanity

    // Also increase volume slightly with combo level (max 1.0)
    const volumeBoost = Math.min(0.6 + (comboLevel * 0.03), 1.0);

    playSound('combo', { rate, volume: volumeBoost });
  }, [audioUnlocked, isMuted, sfxMuted, playSound]);

  // Play achievement unlock sound
  const playAchievementSound = useCallback(() => {
    playSound('achievement', { volume: 0.8 });
  }, [playSound]);

  // Play word accepted sound
  const playWordAcceptedSound = useCallback(() => {
    playSound('wordAccepted', { volume: 0.4 });
  }, [playSound]);

  // Play countdown beep with increasing pitch (3, 2, 1 seconds remaining)
  // secondsRemaining: 3 = lowest pitch, 1 = highest pitch
  const playCountdownBeep = useCallback((secondsRemaining: number) => {
    if (!audioUnlocked || isMuted || sfxMuted || !isTabVisibleRef.current) return;

    // Pitch increases as we get closer to 0: 3->1.0, 2->1.2, 1->1.4
    const pitchMap: Record<number, number> = { 3: 1.0, 2: 1.2, 1: 1.4 };
    const rate = pitchMap[secondsRemaining] || 1.0;
    const volume = secondsRemaining === 1 ? 0.9 : 0.7; // Loudest on final beep

    playSound('countdownBeep', { rate, volume });
  }, [audioUnlocked, isMuted, sfxMuted, playSound]);

  // Play chat message notification sound
  const playMessageSound = useCallback(() => {
    playSound('message', { volume: 0.5 });
  }, [playSound]);

  const value: SoundEffectsContextType = {
    // Volume state
    sfxVolume,
    sfxMuted,
    setSfxVolume,
    toggleSfxMute,
    // Sound playback
    playSound,
    playComboSound,
    playAchievementSound,
    playWordAcceptedSound,
    playCountdownBeep,
    playMessageSound,
  };

  return (
    <SoundEffectsContext.Provider value={value}>
      {children}
    </SoundEffectsContext.Provider>
  );
}

export function useSoundEffects(): SoundEffectsContextType {
  const context = useContext(SoundEffectsContext);
  if (!context) {
    throw new Error('useSoundEffects must be used within a SoundEffectsProvider');
  }
  return context;
}
