'use client';

import React, { createContext, useContext, useEffect, useRef, useCallback } from 'react';
import { Howl } from 'howler';
import { useMusic } from './MusicContext';
import logger from '@/utils/logger';

const SoundEffectsContext = createContext(null);

// Sound effect definitions
const SOUND_EFFECTS = {
  achievement: '/sounds/achievement.wav',
  combo: '/sounds/combo.wav',
  wordAccepted: '/sounds/word-accepted.wav',
};

export function SoundEffectsProvider({ children }) {
  const { volume, isMuted, audioUnlocked } = useMusic();
  const soundsRef = useRef({});
  const soundsLoadedRef = useRef(false);

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
  const playSound = useCallback((soundKey, options = {}) => {
    if (!audioUnlocked || isMuted) return;

    const howl = soundsRef.current[soundKey];
    if (!howl) {
      logger.warn(`[SFX] Sound not found: ${soundKey}`);
      return;
    }

    // Apply volume (respects music volume setting)
    const effectiveVolume = (options.volume ?? 0.6) * volume;
    howl.volume(effectiveVolume);

    // Apply playback rate (pitch) if specified
    if (options.rate) {
      howl.rate(options.rate);
    } else {
      howl.rate(1.0); // Reset to normal
    }

    howl.play();
  }, [audioUnlocked, isMuted, volume]);

  // Play combo sound with dynamic pitch based on combo level
  // Pitch increases with each combo level (infinite scaling)
  const playComboSound = useCallback((comboLevel) => {
    if (!audioUnlocked || isMuted || comboLevel < 1) return;

    // Calculate pitch rate: starts at 1.0, increases by ~0.1 per combo level
    // Uses logarithmic scaling for smooth progression that doesn't get too extreme
    // Level 1: 1.0, Level 5: ~1.3, Level 10: ~1.6, Level 20: ~2.0
    const baseRate = 1.0;
    const pitchIncrease = Math.log2(comboLevel + 1) * 0.25;
    const rate = Math.min(baseRate + pitchIncrease, 3.0); // Cap at 3x for sanity

    // Also increase volume slightly with combo level (max 1.0)
    const volumeBoost = Math.min(0.6 + (comboLevel * 0.03), 1.0);

    playSound('combo', { rate, volume: volumeBoost });
  }, [audioUnlocked, isMuted, playSound]);

  // Play achievement unlock sound
  const playAchievementSound = useCallback(() => {
    playSound('achievement', { volume: 0.8 });
  }, [playSound]);

  // Play word accepted sound
  const playWordAcceptedSound = useCallback(() => {
    playSound('wordAccepted', { volume: 0.4 });
  }, [playSound]);

  const value = {
    playSound,
    playComboSound,
    playAchievementSound,
    playWordAcceptedSound,
  };

  return (
    <SoundEffectsContext.Provider value={value}>
      {children}
    </SoundEffectsContext.Provider>
  );
}

export function useSoundEffects() {
  const context = useContext(SoundEffectsContext);
  if (!context) {
    throw new Error('useSoundEffects must be used within a SoundEffectsProvider');
  }
  return context;
}
