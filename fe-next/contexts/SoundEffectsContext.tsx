'use client';

import { createContext, useContext, useEffect, useRef, useCallback, useMemo, useState, ReactNode } from 'react';
import type { Howl } from 'howler';
import { useMusic } from './MusicContext';
import logger from '@/utils/logger';
import { haptics } from '@/utils/haptics/HapticsManager';
import { useLocalStorageObject } from '@/hooks/useLocalStorageState';
import { createLazyHowl, preloadAudioOnDemand, preloadByPriority, AUDIO_LOAD_PRIORITY, ensureHowl } from '@/lib/audio/audioLoader';
import { getCountdownBeepParams } from '@/utils/countdownBeepParams';
import { pickVariant, SOUND_VARIATIONS, comboLevelSrc, wordLengthSrc } from '@/lib/audio/soundVariations';
import { SOUND_EFFECTS, SOUND_PRIORITIES, type SoundEffectOptions, type SoundEffectsContextType } from '@/lib/audio/soundEffectsConfig';
import { useSoundPlayFunctions } from '@/hooks/useSoundPlayFunctions';
import { useNativeAppStatePause } from '@/hooks/useNativeAppStatePause';

interface SfxSettings {
  volume: number;
  muted: boolean;
}

const SoundEffectsContext = createContext<SoundEffectsContextType | null>(null);

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

  // Handle iOS Safari audio device errors (InvalidStateError: Failed to start the audio device)
  // These are thrown by the Web Audio API when the device can't start (silent mode, Bluetooth issues, etc.)
  // We catch them globally to prevent unhandled rejections being reported to Sentry
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason;
      // Check if this is an iOS Safari audio device error
      if (error instanceof DOMException &&
          error.name === 'InvalidStateError' &&
          error.message.includes('audio device')) {
        // Prevent this error from being reported to Sentry
        event.preventDefault();
        logger.log('[SFX] iOS Safari audio device error (silenced):', error.message);
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    return () => window.removeEventListener('unhandledrejection', handleUnhandledRejection);
  }, []);

  // Progressive preload on first user interaction
  useEffect(() => {
    if (typeof window === 'undefined' || !audioUnlocked) return;

    // Create sound and priority maps for preloadByPriority
    const soundsMap = new Map<string, Howl>(Object.entries(soundsRef.current));
    const prioritiesMap = new Map<string, AUDIO_LOAD_PRIORITY>(Object.entries(SOUND_PRIORITIES));

    // Progressive loading strategy:
    // 1. Load CRITICAL sounds immediately on audio unlock
    // 2. Load HIGH priority sounds during idle time
    // 3. LOW priority sounds stay lazy (load only when triggered)

    (async () => {
      // Load CRITICAL sounds immediately
      logger.log('[SFX] Preloading CRITICAL sounds on audio unlock');
      await preloadByPriority(soundsMap, prioritiesMap, AUDIO_LOAD_PRIORITY.CRITICAL);

      // Load HIGH priority sounds during idle time
      if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(() => {
          logger.log('[SFX] Preloading HIGH priority sounds during idle time');
          preloadByPriority(soundsMap, prioritiesMap, AUDIO_LOAD_PRIORITY.HIGH);
        });
      } else {
        // Fallback for browsers without requestIdleCallback
        setTimeout(() => {
          logger.log('[SFX] Preloading HIGH priority sounds (setTimeout fallback)');
          preloadByPriority(soundsMap, prioritiesMap, AUDIO_LOAD_PRIORITY.HIGH);
        }, 1000);
      }
    })();
  }, [audioUnlocked]);

  // Lifted out of the visibility effect so the native app-state hook can call
  // it too. All deps are stable refs — closure capture is safe.
  const setVisible = useCallback((visible: boolean, reason: string) => {
    const wasVisible = isTabVisibleRef.current;
    isTabVisibleRef.current = visible;
    logger.log(`[SFX] ${reason}:`, visible ? 'visible' : 'hidden');

    if (!visible && wasVisible) {
      const howl = soundsRef.current['fireCrackleLoop'];
      if (howl && fireCrackleLoopIdRef.current !== null && howl.playing()) {
        howl.pause();
        logger.log('[SFX] Paused fire crackle loop (lost focus)');
      }
    } else if (visible && !wasVisible) {
      const howl = soundsRef.current['fireCrackleLoop'];
      if (howl && fireCrackleLoopIdRef.current !== null && !howl.playing() && !sfxMutedRef.current && isGameActiveRef.current) {
        howl.play();
        logger.log('[SFX] Resumed fire crackle loop (regained focus)');
      }
    }
  }, []);

  // Track tab visibility AND window focus to block sounds when not in focus
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleVisibilityChange = () => {
      setVisible(document.visibilityState === 'visible', 'Tab visibility changed');
    };

    const handleBlur = () => {
      if (document.visibilityState === 'visible') {
        setVisible(false, 'Window blur');
      }
    };

    const handleFocus = () => {
      setVisible(true, 'Window focus');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
    };
  }, [setVisible]);

  // Native parity: iOS swipe-up / call interrupt doesn't reliably fire
  // visibilitychange in WKWebView. Capacitor's appStateChange does.
  const handleNativeBackground = useCallback(
    () => setVisible(false, 'Native app backgrounded'),
    [setVisible]
  );
  const handleNativeForeground = useCallback(
    () => setVisible(true, 'Native app foregrounded'),
    [setVisible]
  );
  useNativeAppStatePause({
    onBackground: handleNativeBackground,
    onForeground: handleNativeForeground,
  });

  // Initialize sound effects — wait for howler module to load first
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (soundsLoadedRef.current) return; // Prevent re-initialization

    let cancelled = false;

    ensureHowl().then(() => {
      if (cancelled || soundsLoadedRef.current) return;

      // Create Howl instances for each sound effect using lazy loading
      Object.entries(SOUND_EFFECTS).forEach(([key, src]) => {
        soundsRef.current[key] = createLazyHowl(src, {
          volume: 0.6,
          // html5: true and preload: false set by createLazyHowl
          onload: () => {
            logger.log(`[SFX] Loaded: ${key}`);
          },
          onloaderror: (_id, err) => {
            logger.log(`[SFX] Failed to load ${key}:`, err);
          },
          onplayerror: (_id, err) => {
            // Silently handle iOS Safari audio device errors
            logger.log(`[SFX] Failed to play ${key}:`, err);
          },
        });
      });

      // Pre-create lazy Howls for all variation files so they're ready when picked
      Object.values(SOUND_VARIATIONS).forEach(variants => {
        variants.forEach(src => {
          const varKey = `_var_${src}`;
          if (!soundsRef.current[varKey]) {
            soundsRef.current[varKey] = createLazyHowl(src, { volume: 0.6 });
          }
        });
      });

      soundsLoadedRef.current = true;
    }).catch(() => {});

    return () => {
      cancelled = true;
      // Cleanup on unmount
      // eslint-disable-next-line react-hooks/exhaustive-deps -- soundsRef is stable and not a React-rendered node
      const sounds = soundsRef.current;
      Object.values(sounds).forEach(howl => {
        howl.unload();
      });
    };
  }, []);

  // Play a sound effect
  const playSound = useCallback(async (soundKey: keyof typeof SOUND_EFFECTS, options: SoundEffectOptions = {}) => {
    // Check basic conditions
    if (!audioUnlocked || sfxMuted || !isTabVisibleRef.current) return;

    // Check game active state (default: requires game to be active)
    const requiresGameActive = options.requiresGameActive !== false;
    if (requiresGameActive && !isGameActiveRef.current) return;

    // Check for sound variations — pick a random variant if available
    const baseSrc = SOUND_EFFECTS[soundKey];
    const chosenSrc = pickVariant(soundKey, baseSrc);
    const isVariant = chosenSrc !== baseSrc;

    // Use a variation Howl on-the-fly, or the base Howl
    let howl: Howl;
    if (isVariant) {
      // Lazily create/cache variation Howls using the same ref map
      const varKey = `_var_${chosenSrc}`;
      if (!soundsRef.current[varKey]) {
        soundsRef.current[varKey] = createLazyHowl(chosenSrc, { volume: 0.6 });
      }
      howl = soundsRef.current[varKey];
    } else {
      howl = soundsRef.current[soundKey];
    }

    if (!howl) {
      logger.warn(`[SFX] Sound not found: ${soundKey}`);
      return;
    }

    // Preload on-demand if not loaded - wait for loading to complete
    if (howl.state() === 'unloaded') {
      logger.log(`[SFX] Preloading sound on demand: ${isVariant ? chosenSrc : soundKey}`);
      try {
        await preloadAudioOnDemand(howl);
      } catch (err) {
        logger.log(`[SFX] Failed to load ${soundKey}, skipping playback:`, err);
        return; // Don't try to play if loading failed
      }
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

    // Wrap play in try-catch to handle iOS Safari audio device errors
    try {
      howl.play();
    } catch (err) {
      // Silently handle play errors (iOS can throw InvalidStateError)
      logger.log(`[SFX] Play error for ${soundKey}:`, err);
    }
  }, [audioUnlocked, sfxMuted, sfxVolume]);

  // Play combo sound — bespoke audio per combo level (1..25), clamps above 25.
  // Falls back to the legacy single-file pitch-shift if the level file fails to load.
  const playComboSound = useCallback(async (comboLevel: number) => {
    if (!audioUnlocked || sfxMuted || !isTabVisibleRef.current || !isGameActiveRef.current || comboLevel < 1) return;

    const src = comboLevelSrc(comboLevel);
    const cacheKey = `_combo_${src}`;
    let howl = soundsRef.current[cacheKey];
    if (!howl) {
      howl = createLazyHowl(src, { volume: 0.7 });
      soundsRef.current[cacheKey] = howl;
    }

    if (howl.state() === 'unloaded') {
      try {
        await preloadAudioOnDemand(howl);
      } catch (err) {
        // Bespoke level file failed — fall back to pitch-shifted base combo
        logger.log(`[SFX] combo-level ${comboLevel} failed, using pitch fallback:`, err);
        const rate = Math.min(1.0 + Math.log2(comboLevel + 1) * 0.2, 1.8);
        const volumeBoost = Math.min(0.6 + (comboLevel * 0.03), 1.0);
        playSound('combo', { rate, volume: volumeBoost });
        haptics.tap();
        return;
      }
    }

    // Slight volume swell with combo level (max 1.0) so escalation reads even with bespoke audio
    const volumeBoost = Math.min(0.6 + (comboLevel * 0.02), 1.0);
    howl.volume(volumeBoost * sfxVolume);
    howl.rate(1.0);
    try {
      howl.play();
    } catch (err) {
      logger.log(`[SFX] combo-level ${comboLevel} play error:`, err);
    }
    haptics.tap();
  }, [audioUnlocked, sfxMuted, sfxVolume, playSound]);

  // Play countdown beep with increasing pitch (10→1 seconds remaining)
  const playCountdownBeep = useCallback((secondsRemaining: number) => {
    if (!audioUnlocked || sfxMuted || !isTabVisibleRef.current || !isGameActiveRef.current) return;
    const params = getCountdownBeepParams(secondsRemaining);
    if (!params) return;
    playSound('countdownBeep', { rate: params.rate, volume: params.volume });
  }, [audioUnlocked, sfxMuted, playSound]);

  // Play word-length feedback (3..7 use bespoke files, 8+ uses celebration file).
  // Falls back silently if the bespoke file fails — caller already plays wordAccepted.
  const playWordLengthSound = useCallback(async (length: number) => {
    if (!audioUnlocked || sfxMuted || !isTabVisibleRef.current || !isGameActiveRef.current || length < 3) return;

    const src = wordLengthSrc(length);
    const cacheKey = `_wlen_${src}`;
    let howl = soundsRef.current[cacheKey];
    if (!howl) {
      howl = createLazyHowl(src, { volume: 0.65 });
      soundsRef.current[cacheKey] = howl;
    }

    if (howl.state() === 'unloaded') {
      try {
        await preloadAudioOnDemand(howl);
      } catch (err) {
        logger.log(`[SFX] word-length ${length} failed to load:`, err);
        return;
      }
    }

    howl.volume(0.65 * sfxVolume);
    howl.rate(1.0);
    try {
      howl.play();
    } catch (err) {
      logger.log(`[SFX] word-length ${length} play error:`, err);
    }
  }, [audioUnlocked, sfxMuted, sfxVolume]);

  // All individual play functions extracted to useSoundPlayFunctions hook
  const soundFns = useSoundPlayFunctions(playSound, {
    audioUnlocked,
    sfxMuted,
    isTabVisibleRef,
    isGameActiveRef,
  });

  // Start fire crackle ambient loop (plays for 15 seconds)
  const startFireCrackleLoop = useCallback(async () => {
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

    // Preload on-demand if needed
    if (howl.state() === 'unloaded') {
      logger.log('[SFX] Preloading fire crackle loop on demand');
      try {
        await preloadAudioOnDemand(howl);
      } catch (err) {
        logger.log('[SFX] Failed to load fire crackle loop, skipping:', err);
        return;
      }
    }

    // Configure as loop
    howl.loop(true);
    howl.volume(0.3 * sfxVolume); // Lower volume for ambient sound

    // Play and store sound ID - wrap in try-catch for iOS Safari errors
    try {
      const soundId = howl.play();
      fireCrackleLoopIdRef.current = soundId;
      logger.log('[SFX] Started fire crackle loop');
    } catch (err) {
      // Silently handle play errors (iOS can throw InvalidStateError)
      logger.log('[SFX] Fire crackle loop play error:', err);
    }
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

  // Stop fire crackle loop when muted
  useEffect(() => {
    if (sfxMuted && fireCrackleLoopIdRef.current !== null) {
      const howl = soundsRef.current['fireCrackleLoop'];
      if (howl) {
        howl.stop(fireCrackleLoopIdRef.current);
        howl.loop(false);
        fireCrackleLoopIdRef.current = null;
        logger.log('[SFX] Stopped fire crackle loop due to mute');
      }
    }
  }, [sfxMuted]);

  // Memoize context value to prevent unnecessary re-renders of all consumers
  const value = useMemo<SoundEffectsContextType>(() => ({
    sfxVolume,
    sfxMuted,
    setSfxVolume,
    toggleSfxMute,
    isGameActive,
    setGameActive,
    playSound,
    playComboSound,
    playCountdownBeep,
    playWordLengthSound,
    startFireCrackleLoop,
    stopFireCrackleLoop,
    // All individual play functions from extracted hook
    ...soundFns,
  }), [
    sfxVolume,
    sfxMuted,
    setSfxVolume,
    toggleSfxMute,
    isGameActive,
    setGameActive,
    playSound,
    playComboSound,
    playCountdownBeep,
    playWordLengthSound,
    startFireCrackleLoop,
    stopFireCrackleLoop,
    soundFns,
  ]);

  return (
    <SoundEffectsContext.Provider value={value}>
      {children}
    </SoundEffectsContext.Provider>
  );
}

// No-op stub returned when provider is unavailable (e.g., during SSR edge cases)
const NOOP = () => {};
const SOUND_EFFECTS_FALLBACK = {
  sfxVolume: 0.7, sfxMuted: true, isGameActive: false,
  setSfxVolume: NOOP, toggleSfxMute: NOOP, setGameActive: NOOP,
  playSound: NOOP, playComboSound: NOOP, playCountdownBeep: NOOP,
  playWordLengthSound: NOOP,
  startFireCrackleLoop: NOOP, stopFireCrackleLoop: NOOP,
  // All individual play functions
  playWordAcceptedSound: NOOP, playWordRejectedSound: NOOP,
  playAchievementSound: NOOP, playMessageSound: NOOP, playErrorSound: NOOP,
  playComboMilestoneSound: NOOP, playComboBreakSound: NOOP, playComboSavedSound: NOOP,
  playEarthquakeRumble: NOOP, playEarthquakeShake: NOOP, playFireRoundStart: NOOP,
  playVictorySound: NOOP, playDefeatSound: NOOP,
  playLevelUpSound: NOOP, playLevelUpModalSound: NOOP, playPowerUpSound: NOOP,
  playBossHitSound: NOOP, playBossPhaseChangeSound: NOOP,
  playBossEntranceSound: NOOP, playBossDefeatSound: NOOP,
  playBlastBombSound: NOOP, playBlastLightningSound: NOOP, playBlastPrismSound: NOOP, playBlastHighlightStingerSound: NOOP,
  playMatchFoundSound: NOOP, playStreakMilestoneSound: NOOP, playTierPromotionSound: NOOP,
  playTileSelectSound: NOOP, playRoundStartSound: NOOP, playTimesUpSound: NOOP,
  playCoinCollectSound: NOOP, playButtonClickSound: NOOP, playChestOpenSound: NOOP,
  playQuestCompleteSound: NOOP, playBoardShuffleSound: NOOP, playUpgradePurchaseSound: NOOP,
  playHintRevealSound: NOOP, playDailyRewardSound: NOOP, playTimerUrgentSound: NOOP,
  playStreakFireSound: NOOP, playScreenTransitionSound: NOOP, playLongWordBonusSound: NOOP,
  playBoardClearSound: NOOP, playCoinCascadeSound: NOOP, playCrownVictorySound: NOOP,
  playGiftReceivedSound: NOOP, playLeadChangeSound: NOOP, playMatchStartSound: NOOP,
  playMenuOpenSound: NOOP, playMenuCloseSound: NOOP, playOpponentScoredSound: NOOP,
  playPathConnectSound: NOOP, playPerfectWordSound: NOOP,
  playPlayerJoinedSound: NOOP, playPlayerLeftSound: NOOP, playRareWordSound: NOOP,
  playSwipeTransitionSound: NOOP, playTileAppearSound: NOOP,
  playTimeBonusSound: NOOP, playTimerHeartbeatSound: NOOP, playXpGainSound: NOOP,
  playMegaCascadeSound: NOOP, playUltraComboSound: NOOP, playBossDefeatLegendarySound: NOOP,
  playLegendaryWordSound: NOOP, playEpicVictorySound: NOOP, playStreakLegendarySound: NOOP,
  playDrillStartSound: NOOP, playDrillCompleteSound: NOOP, playWheelSpinSound: NOOP,
  playFlashChallengeSound: NOOP, playWordRevealSound: NOOP,
} as SoundEffectsContextType;

export function useSoundEffects(): SoundEffectsContextType {
  const context = useContext(SoundEffectsContext);
  if (!context) {
    // Graceful degradation instead of crashing the page
    // Use log (not warn) — this is expected in edge cases (e.g. race conditions during mount)
    // and is already handled by the NOOP stub, so no Sentry alert needed
    logger.log('useSoundEffects called outside SoundEffectsProvider — returning no-op stub');
    return SOUND_EFFECTS_FALLBACK;
  }
  return context;
}
