'use client';

import React, { createContext, useContext, useEffect, useRef, useCallback, useMemo, useState, ReactNode } from 'react';
import { Howl } from 'howler';
import { useMusic } from './MusicContext';
import logger from '@/utils/logger';
import { hapticAchievement, hapticForComboLevel, hapticComboBreak, hapticComboSaved } from '@/utils/haptics';
import { useLocalStorageObject } from '@/hooks/useLocalStorageState';

interface SoundEffectOptions {
  volume?: number;
  rate?: number;
  /** If false, sound plays even when game is not active (e.g., for achievements, chat) */
  requiresGameActive?: boolean;
}

interface SoundEffectsContextType {
  sfxVolume: number;
  sfxMuted: boolean;
  isGameActive: boolean;
  setSfxVolume: (volume: number) => void;
  toggleSfxMute: () => void;
  setGameActive: (active: boolean) => void;
  playSound: (soundKey: keyof typeof SOUND_EFFECTS, options?: SoundEffectOptions) => void;
  playComboSound: (comboLevel: number) => void;
  playAchievementSound: () => void;
  playWordAcceptedSound: () => void;
  playCountdownBeep: (secondsRemaining: number) => void;
  playMessageSound: () => void;
  playErrorSound: () => void;
  // Combo feedback sounds
  playComboMilestoneSound: (milestoneLevel: number) => void;
  playComboBreakSound: (lostLevel: number) => void;
  playComboSavedSound: () => void;
  // Earthquake/Fire Round sounds
  playEarthquakeRumble: () => void;
  playEarthquakeShake: () => void;
  playFireRoundStart: () => void;
  startFireCrackleLoop: () => void;
  stopFireCrackleLoop: () => void;
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
  // Combo feedback sounds (user will provide custom files)
  comboMilestone: '/sounds/combo-milestone.mp3',
  comboBreak: '/sounds/combo-break.mp3',
  comboSaved: '/sounds/combo-saved.mp3',
  // Earthquake/Fire Round sounds (user will provide custom files)
  earthquakeRumble: '/sounds/earthquake-rumble.wav',
  earthquakeShake: '/sounds/earthquake-shake.wav',
  fireRoundStart: '/sounds/fire-round-start.wav',
  fireCrackleLoop: '/sounds/fire-crackle-loop.wav',
} as const;

const SFX_STORAGE_KEY = 'boggle_sfx_settings';
const DEFAULT_SFX_SETTINGS: SfxSettings = { volume: 0.7, muted: false };

interface SoundEffectsProviderProps {
  children: ReactNode;
}

export function SoundEffectsProvider({ children }: SoundEffectsProviderProps) {
  // Only use audioUnlocked from MusicContext - isMuted should NOT affect SFX
  // SFX have their own mute control (sfxMuted)
  const { audioUnlocked } = useMusic();
  const soundsRef = useRef<Record<string, Howl>>({});
  const soundsLoadedRef = useRef(false);
  const isTabVisibleRef = useRef(true);
  const fireCrackleLoopIdRef = useRef<number | null>(null); // Track fire crackle loop sound ID

  // Game-active state - sounds only play when a game is active
  // This prevents sounds from playing on results screens, menus, etc.
  const [isGameActive, setIsGameActiveState] = useState(false);
  const isGameActiveRef = useRef(false);

  // Use shared localStorage hook for SFX settings
  const [sfxSettings, , updateSfxSetting] = useLocalStorageObject<SfxSettings>(
    SFX_STORAGE_KEY,
    DEFAULT_SFX_SETTINGS
  );

  const sfxVolume = sfxSettings.volume;
  const sfxMuted = sfxSettings.muted;

  // Set SFX volume
  const setSfxVolume = useCallback((newVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    updateSfxSetting('volume', clampedVolume);
  }, [updateSfxSetting]);

  // Toggle SFX mute - using ref to avoid dependency on sfxMuted state
  const sfxMutedRef = useRef(sfxMuted);
  useEffect(() => { sfxMutedRef.current = sfxMuted; }, [sfxMuted]);
  
  const toggleSfxMute = useCallback(() => {
    updateSfxSetting('muted', !sfxMutedRef.current);
  }, [updateSfxSetting]);

  // Set game active state - sounds only play when game is active
  const setGameActive = useCallback((active: boolean) => {
    setIsGameActiveState(active);
    isGameActiveRef.current = active;
    logger.log('[SFX] Game active state changed:', active);
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

    // Create Howl instances for each sound effect with deferred loading for slow connections
    Object.entries(SOUND_EFFECTS).forEach(([key, src]) => {
      soundsRef.current[key] = new Howl({
        src: [src],
        volume: 0.6,
        preload: false, // Defer loading for slow connections - load on demand
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
    // Check basic conditions
    if (!audioUnlocked || sfxMuted || !isTabVisibleRef.current) return;

    // Check game active state (default: requires game to be active)
    const requiresGameActive = options.requiresGameActive !== false;
    if (requiresGameActive && !isGameActiveRef.current) return;

    const howl = soundsRef.current[soundKey];
    if (!howl) {
      logger.warn(`[SFX] Sound not found: ${soundKey}`);
      return;
    }

    // Load on-demand for slow connections - only load when actually needed
    if (howl.state() === 'unloaded') {
      logger.log(`[SFX] Loading sound on demand: ${soundKey}`);
      howl.load();
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
  }, [audioUnlocked, sfxMuted, sfxVolume]);

  // Play combo sound with dynamic pitch based on combo level
  // Pitch increases with each combo level (infinite scaling)
  const playComboSound = useCallback((comboLevel: number) => {
    if (!audioUnlocked || sfxMuted || !isTabVisibleRef.current || !isGameActiveRef.current || comboLevel < 1) return;

    // Calculate pitch rate: starts at 1.0, increases by ~0.1 per combo level
    // Uses logarithmic scaling for smooth progression that doesn't get too extreme
    // Level 1: 1.0, Level 5: ~1.3, Level 10: ~1.6, Level 20: ~2.0
    const baseRate = 1.0;
    const pitchIncrease = Math.log2(comboLevel + 1) * 0.25;
    const rate = Math.min(baseRate + pitchIncrease, 3.0); // Cap at 3x for sanity

    // Also increase volume slightly with combo level (max 1.0)
    const volumeBoost = Math.min(0.6 + (comboLevel * 0.03), 1.0);

    playSound('combo', { rate, volume: volumeBoost });
    hapticForComboLevel(comboLevel);
  }, [audioUnlocked, sfxMuted, playSound]);

  // Play achievement unlock sound with haptic feedback
  // Achievements can trigger on results screen, so don't require game active
  const playAchievementSound = useCallback(() => {
    playSound('achievement', { volume: 0.8, requiresGameActive: false });
    hapticAchievement();
  }, [playSound]);

  // Play word accepted sound
  const playWordAcceptedSound = useCallback(() => {
    playSound('wordAccepted', { volume: 0.4 });
  }, [playSound]);

  // Play countdown beep with increasing pitch (3, 2, 1 seconds remaining)
  // secondsRemaining: 3 = lowest pitch, 1 = highest pitch
  const playCountdownBeep = useCallback((secondsRemaining: number) => {
    if (!audioUnlocked || sfxMuted || !isTabVisibleRef.current || !isGameActiveRef.current) return;

    // Pitch increases as we get closer to 0: 3->1.0, 2->1.2, 1->1.4
    const pitchMap: Record<number, number> = { 3: 1.0, 2: 1.2, 1: 1.4 };
    const rate = pitchMap[secondsRemaining] || 1.0;
    const volume = secondsRemaining === 1 ? 0.9 : 0.7; // Loudest on final beep

    playSound('countdownBeep', { rate, volume });
  }, [audioUnlocked, sfxMuted, playSound]);

  // Play chat message notification sound
  // Chat works throughout the app, so don't require game active
  const playMessageSound = useCallback(() => {
    playSound('message', { volume: 0.5, requiresGameActive: false });
  }, [playSound]);

  // Play error sound for invalid actions
  const playErrorSound = useCallback(() => {
    playSound('comboBreak', { volume: 0.4 });
  }, [playSound]);

  // ==================== Combo Feedback Sounds ====================

  /**
   * Play milestone celebration sound for combo 5, 10, 15
   * Higher milestones get slightly louder and higher pitched
   */
  const playComboMilestoneSound = useCallback((milestoneLevel: number) => {
    if (!audioUnlocked || sfxMuted || !isTabVisibleRef.current || !isGameActiveRef.current) return;

    // Pitch and volume increase with milestone level
    const pitchMap: Record<number, number> = { 5: 1.0, 10: 1.1, 15: 1.2 };
    const volumeMap: Record<number, number> = { 5: 0.7, 10: 0.8, 15: 0.9 };

    const rate = pitchMap[milestoneLevel] || 1.0;
    const volume = volumeMap[milestoneLevel] || 0.7;

    playSound('comboMilestone', { rate, volume });
    // Milestone also triggers a celebratory haptic
    hapticForComboLevel(milestoneLevel);
  }, [audioUnlocked, sfxMuted, playSound]);

  /**
   * Play combo break sound when combo is lost
   * Louder for higher combos that were lost (more impactful loss)
   */
  const playComboBreakSound = useCallback((lostLevel: number) => {
    if (!audioUnlocked || sfxMuted || !isTabVisibleRef.current || !isGameActiveRef.current) return;

    // Volume scales with lost combo level (losing a big combo is more impactful)
    // But capped to not be too harsh
    const volume = Math.min(0.3 + (lostLevel * 0.04), 0.6);

    playSound('comboBreak', { volume });
    hapticComboBreak(lostLevel);
  }, [audioUnlocked, sfxMuted, playSound]);

  /**
   * Play combo saved sound when player narrowly avoids losing combo
   */
  const playComboSavedSound = useCallback(() => {
    if (!audioUnlocked || sfxMuted || !isTabVisibleRef.current || !isGameActiveRef.current) return;

    playSound('comboSaved', { volume: 0.5 });
    hapticComboSaved();
  }, [audioUnlocked, sfxMuted, playSound]);

  // Earthquake/Fire Round sound effects

  // Play earthquake rumble (warning phase - 2 seconds)
  const playEarthquakeRumble = useCallback(() => {
    playSound('earthquakeRumble', { volume: 0.7 });
  }, [playSound]);

  // Play earthquake shake (shake phase - 1 second)
  const playEarthquakeShake = useCallback(() => {
    playSound('earthquakeShake', { volume: 0.8 });
  }, [playSound]);

  // Play fire round start sound
  const playFireRoundStart = useCallback(() => {
    playSound('fireRoundStart', { volume: 0.8 });
  }, [playSound]);

  // Start fire crackle ambient loop (plays for 15 seconds)
  const startFireCrackleLoop = useCallback(() => {
    if (!audioUnlocked || sfxMuted || !isTabVisibleRef.current || !isGameActiveRef.current) return;

    const howl = soundsRef.current['fireCrackleLoop'];
    if (!howl) {
      logger.warn('[SFX] Fire crackle loop sound not found');
      return;
    }

    // Stop any existing loop
    if (fireCrackleLoopIdRef.current !== null) {
      howl.stop(fireCrackleLoopIdRef.current);
      fireCrackleLoopIdRef.current = null;
    }

    // Load on-demand if needed
    if (howl.state() === 'unloaded') {
      logger.log('[SFX] Loading fire crackle loop on demand');
      howl.load();
    }

    // Configure as loop
    howl.loop(true);
    howl.volume(0.3 * sfxVolume); // Lower volume for ambient sound

    // Play and store sound ID
    const soundId = howl.play();
    fireCrackleLoopIdRef.current = soundId;

    logger.log('[SFX] Started fire crackle loop');
  }, [audioUnlocked, sfxMuted, sfxVolume]);

  // Stop fire crackle ambient loop
  const stopFireCrackleLoop = useCallback(() => {
    const howl = soundsRef.current['fireCrackleLoop'];
    if (!howl || fireCrackleLoopIdRef.current === null) return;

    // Fade out and stop
    howl.fade(howl.volume(), 0, 500, fireCrackleLoopIdRef.current);
    setTimeout(() => {
      if (fireCrackleLoopIdRef.current !== null) {
        howl.stop(fireCrackleLoopIdRef.current);
        howl.loop(false); // Reset loop setting
        fireCrackleLoopIdRef.current = null;
        logger.log('[SFX] Stopped fire crackle loop');
      }
    }, 500);
  }, []);

  // Memoize context value to prevent unnecessary re-renders of all consumers
  const value = useMemo<SoundEffectsContextType>(() => ({
    // Volume state
    sfxVolume,
    sfxMuted,
    setSfxVolume,
    toggleSfxMute,
    // Game active state
    isGameActive,
    setGameActive,
    // Sound playback
    playSound,
    playComboSound,
    playAchievementSound,
    playWordAcceptedSound,
    playCountdownBeep,
    playMessageSound,
    playErrorSound,
    // Combo feedback sounds
    playComboMilestoneSound,
    playComboBreakSound,
    playComboSavedSound,
    // Earthquake/Fire Round sounds
    playEarthquakeRumble,
    playEarthquakeShake,
    playFireRoundStart,
    startFireCrackleLoop,
    stopFireCrackleLoop,
  }), [
    sfxVolume,
    sfxMuted,
    setSfxVolume,
    toggleSfxMute,
    isGameActive,
    setGameActive,
    playSound,
    playComboSound,
    playAchievementSound,
    playWordAcceptedSound,
    playCountdownBeep,
    playMessageSound,
    playErrorSound,
    playComboMilestoneSound,
    playComboBreakSound,
    playComboSavedSound,
    playEarthquakeRumble,
    playEarthquakeShake,
    playFireRoundStart,
    startFireCrackleLoop,
    stopFireCrackleLoop,
  ]);

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
