'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { Howl, Howler } from 'howler';
import logger from '@/utils/logger';
import { useMusic } from '@/contexts/MusicContext';

// ==============================================
// TYPES
// ==============================================

interface UseAdventureMusicOptions {
  /** Current world number (1-10) */
  worldNumber: number;
  /** Whether the game is actively playing */
  isPlaying: boolean;
  /** Whether the game is paused */
  isPaused: boolean;
  /** Remaining time in seconds */
  timeRemaining: number;
  /** Total time for the level */
  totalTime: number;
  /** Whether music is enabled (defaults to true) */
  enabled?: boolean;
  /** Whether this is a boss level — plays boss-battle.mp3 instead of world music */
  isBossLevel?: boolean;
}

interface AdventureTrackPaths {
  track1: string;
  /** track2 is null for single-track worlds (4-10) */
  track2: string | null;
}

// ==============================================
// CONSTANTS
// ==============================================

/** All worlds with adventure music tracks */
const WORLDS_WITH_MUSIC = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

/**
 * Single-track worlds (4-10) mapped to their filenames.
 * These worlds loop one track for the entire level instead of crossfading between two.
 */
const SINGLE_TRACK_WORLDS: Record<number, string> = {
  4: 'Sunrise-Coconut-Quest',
  5: 'Canyon-Riddles',
  6: 'Labyrinth-of-Dusty-Tomes',
  7: 'Ethereal-Ice-Palace-Loop',
  8: 'Celestial-Drift',
  9: 'Summit-of-Thin-Air',
  10: 'Crown-of-the-Final-Kingdom',
};

/**
 * Percentage of time elapsed to trigger track transition
 * At 50% elapsed (50% remaining), switch from track 1 to track 2
 */
const TRACK_SWITCH_THRESHOLD = 0.5;

/** Crossfade duration in milliseconds */
const CROSSFADE_MS = 2000;

// ==============================================
// HELPERS
// ==============================================

/**
 * Get track paths for a given world number
 * Returns null if world doesn't have music tracks
 */
function getWorldTrackPaths(worldNumber: number, isBossLevel?: boolean): AdventureTrackPaths | null {
  // Boss levels get dedicated boss battle music
  if (isBossLevel) {
    return {
      track1: '/music/boss-battle.mp3',
      track2: null,
    };
  }

  if (!WORLDS_WITH_MUSIC.includes(worldNumber)) {
    return null;
  }

  // Single-track worlds (4-10)
  const singleTrack = SINGLE_TRACK_WORLDS[worldNumber];
  if (singleTrack) {
    return {
      track1: `/music/adventure/${singleTrack}.mp3`,
      track2: null,
    };
  }

  // Dual-track worlds (1-3)
  return {
    track1: `/music/adventure/${worldNumber}_level_1.mp3`,
    track2: `/music/adventure/${worldNumber}_level_2.mp3`,
  };
}

// ==============================================
// HOOK
// ==============================================

/**
 * useAdventureMusic - Manages world-specific music for adventure mode
 *
 * Each world has 2 tracks:
 * - Track 1: Plays during the first half of gameplay (calm/building)
 * - Track 2: Plays during the second half (intense/climactic)
 *
 * Features:
 * - Crossfade transitions between tracks
 * - Pauses when game is paused or window loses focus
 * - Lazy-loads tracks on demand
 * - Cleans up resources on unmount
 */
export function useAdventureMusic({
  worldNumber,
  isPlaying,
  isPaused,
  timeRemaining,
  totalTime,
  enabled = true,
  isBossLevel = false,
}: UseAdventureMusicOptions) {
  // Get volume and mute settings from MusicContext
  // This ensures MusicControls works correctly in adventure mode
  const { volume: contextVolume, isMuted: contextMuted } = useMusic();

  // Track refs for Howl instances
  const track1Ref = useRef<Howl | null>(null);
  const track2Ref = useRef<Howl | null>(null);

  // State refs
  const currentTrackRef = useRef<1 | 2 | null>(null);
  // Reactive state for consumers that need re-renders on track changes
  const [currentTrackState, setCurrentTrackState] = useState<1 | 2 | null>(null);
  /** Set both ref (for callbacks) and state (for reactivity) */
  const setCurrentTrack = useCallback((track: 1 | 2 | null) => {
    currentTrackRef.current = track;
    setCurrentTrackState(track);
  }, []);
  const hasSwitchedToTrack2Ref = useRef(false);
  const worldNumberRef = useRef(worldNumber);
  const isPlayingRef = useRef(isPlaying);
  const isPausedRef = useRef(isPaused);
  const enabledRef = useRef(enabled);
  const prevTotalTimeRef = useRef(totalTime);

  // MusicContext refs (for callbacks that can't have dependencies)
  const contextVolumeRef = useRef(contextVolume);
  const contextMutedRef = useRef(contextMuted);

  // Window focus tracking
  const windowFocusedRef = useRef(typeof document !== 'undefined' ? document.hasFocus() : true);
  const pausedByBlurRef = useRef(false);
  const pausedByVisibilityRef = useRef(false);

  // Track crossfade timeouts for cleanup (prevents memory leaks)
  const crossfadeTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  /** Schedule a timeout that self-prunes from the tracking array when it fires */
  const scheduleCrossfadeTimeout = useCallback((fn: () => void, ms: number) => {
    const timeoutId = setTimeout(() => {
      fn();
      crossfadeTimeoutsRef.current = crossfadeTimeoutsRef.current.filter(id => id !== timeoutId);
    }, ms);
    crossfadeTimeoutsRef.current.push(timeoutId);
  }, []);

  // Keep refs in sync
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);
  useEffect(() => { enabledRef.current = enabled; }, [enabled]);
  useEffect(() => { contextVolumeRef.current = contextVolume; }, [contextVolume]);
  useEffect(() => { contextMutedRef.current = contextMuted; }, [contextMuted]);

  /**
   * Get the effective volume based on MusicContext settings
   * Returns 0 if muted, otherwise returns the context volume
   */
  const getEffectiveVolume = useCallback(() => {
    return contextMutedRef.current ? 0 : contextVolumeRef.current;
  }, []);

  // ==============================================
  // AUDIO CONTROL HELPERS
  // ==============================================

  const suspendAudio = useCallback((reason: string) => {
    logger.log(`[AdventureMusic] ${reason} - suspending audio`);

    if (track1Ref.current?.playing()) {
      track1Ref.current.pause();
    }
    if (track2Ref.current?.playing()) {
      track2Ref.current.pause();
    }
  }, []);

  const resumeAudio = useCallback((reason: string) => {
    if (!enabledRef.current || !isPlayingRef.current || isPausedRef.current) {
      logger.log(`[AdventureMusic] ${reason} - skip resume (not active)`);
      return;
    }

    logger.log(`[AdventureMusic] ${reason} - resuming audio`);

    // Resume AudioContext if suspended
    if (Howler.ctx && Howler.ctx.state === 'suspended') {
      Howler.ctx.resume().catch((err: Error) => {
        logger.log(`[AdventureMusic] AudioContext resume failed:`, err.message);
      });
    }

    // Resume the current track
    const currentTrack = currentTrackRef.current;
    const howl = currentTrack === 1 ? track1Ref.current : track2Ref.current;

    if (howl && !howl.playing()) {
      howl.play();
      howl.volume(getEffectiveVolume());
    }
  }, [getEffectiveVolume]);

  // ==============================================
  // WINDOW FOCUS & VISIBILITY HANDLERS
  // ==============================================

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        suspendAudio('Tab hidden');
        pausedByVisibilityRef.current = true;
      } else if (pausedByVisibilityRef.current) {
        resumeAudio('Tab visible');
        pausedByVisibilityRef.current = false;
      }
    };

    const handleBlur = () => {
      windowFocusedRef.current = false;
      if (document.visibilityState === 'visible') {
        suspendAudio('Window blur');
        pausedByBlurRef.current = true;
      }
    };

    const handleFocus = () => {
      windowFocusedRef.current = true;
      if (pausedByBlurRef.current) {
        resumeAudio('Window focus');
        pausedByBlurRef.current = false;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
    };
  }, [suspendAudio, resumeAudio]);

  // ==============================================
  // TRACK MANAGEMENT
  // ==============================================

  /**
   * Create a looping Howl instance with crossfade
   * Note: preload is true by default - tracks load immediately when created
   */
  const createHowl = useCallback((src: string, trackName: string): Howl => {
    const howl = new Howl({
      src: [src],
      loop: false, // Manual looping for crossfade
      volume: 0,
      preload: true, // Preload immediately so tracks are ready when needed
      // Web Audio API decodes the entire file upfront — playback starts instantly once loaded.
      // HTML5 Audio streams but has buffering delays on slower connections.
      // iOS autoplay is handled by resuming AudioContext on user interaction (see onplayerror).
      html5: false,
      onload: () => {
        logger.log(`[AdventureMusic] ${trackName} loaded successfully`);
      },
      onloaderror: (id, err) => {
        // Log at info level - audio decoding can fail on some mobile devices due to codec/memory issues
        // This is a non-critical feature, game works fine without music
        logger.log(`[AdventureMusic] Failed to load ${trackName}:`, err);
      },
      onplayerror: (id, err) => {
        // Log at info level - audio playback can fail on some mobile devices due to autoplay policies
        // This is a non-critical feature, game works fine without music
        logger.log(`[AdventureMusic] Failed to play ${trackName}:`, err);
        // Try to resume AudioContext
        if (Howler.ctx && Howler.ctx.state === 'suspended') {
          Howler.ctx.resume().catch(() => {});
        }
      },
      onend: () => {
        // Manual loop with crossfade - always loop in adventure mode
        // Focus/visibility checks removed to ensure continuous background music
        // The isPaused and enabled checks below handle appropriate pausing

        // Check if this track is still the current track
        const isTrack1 = track1Ref.current === howl;
        const isTrack2 = track2Ref.current === howl;
        const shouldLoop = (isTrack1 && currentTrackRef.current === 1) ||
                          (isTrack2 && currentTrackRef.current === 2);

        if (shouldLoop && enabledRef.current && isPlayingRef.current && !isPausedRef.current) {
          const targetVolume = getEffectiveVolume();
          logger.log(`[AdventureMusic] ${trackName} ended, looping with crossfade to volume ${targetVolume}`);
          howl.seek(0);
          howl.volume(0);
          howl.play();
          howl.fade(0, targetVolume, CROSSFADE_MS);
        }
      },
    });
    return howl;
  }, [getEffectiveVolume]);

  /**
   * Initialize tracks for the current world
   */
  const initializeTracks = useCallback(() => {
    const paths = getWorldTrackPaths(worldNumber, isBossLevel);
    if (!paths) {
      logger.log(`[AdventureMusic] World ${worldNumber} has no music tracks`);
      return;
    }

    const trackLabel = isBossLevel ? 'Boss Battle' : `World ${worldNumber}`;
    logger.log(`[AdventureMusic] Initializing tracks for ${trackLabel}`);

    // Clean up existing tracks
    if (track1Ref.current) {
      track1Ref.current.unload();
      track1Ref.current = null;
    }
    if (track2Ref.current) {
      track2Ref.current.unload();
      track2Ref.current = null;
    }

    // Create new tracks
    track1Ref.current = createHowl(paths.track1, `${trackLabel} Track 1`);
    track2Ref.current = paths.track2
      ? createHowl(paths.track2, `${trackLabel} Track 2`)
      : null;

    // Reset state
    setCurrentTrack(null);
    hasSwitchedToTrack2Ref.current = false;
    worldNumberRef.current = worldNumber;
  }, [worldNumber, isBossLevel, createHowl, setCurrentTrack]);

  /**
   * Start playing track 1
   */
  const startTrack1 = useCallback(() => {
    if (!track1Ref.current || currentTrackRef.current === 1) return;

    const targetVolume = getEffectiveVolume();
    logger.log(`[AdventureMusic] Starting track 1 at volume ${targetVolume}`);

    // Load if not loaded
    if (track1Ref.current.state() === 'unloaded') {
      track1Ref.current.load();
    }

    // Fade out track 2 if playing
    if (track2Ref.current?.playing()) {
      track2Ref.current.fade(track2Ref.current.volume(), 0, CROSSFADE_MS);
      scheduleCrossfadeTimeout(() => track2Ref.current?.stop(), CROSSFADE_MS);
    }

    // Start track 1
    track1Ref.current.volume(0);
    track1Ref.current.play();
    track1Ref.current.fade(0, targetVolume, CROSSFADE_MS);
    setCurrentTrack(1);
  }, [getEffectiveVolume, scheduleCrossfadeTimeout, setCurrentTrack]);

  /**
   * Switch to track 2
   */
  const switchToTrack2 = useCallback(() => {
    if (!track2Ref.current || currentTrackRef.current === 2 || hasSwitchedToTrack2Ref.current) return;

    const targetVolume = getEffectiveVolume();
    logger.log(`[AdventureMusic] Switching to track 2 at volume ${targetVolume}`);
    hasSwitchedToTrack2Ref.current = true;

    // Load if not loaded
    if (track2Ref.current.state() === 'unloaded') {
      track2Ref.current.load();
    }

    // Crossfade from track 1 to track 2
    if (track1Ref.current?.playing()) {
      track1Ref.current.fade(track1Ref.current.volume(), 0, CROSSFADE_MS);
      scheduleCrossfadeTimeout(() => track1Ref.current?.stop(), CROSSFADE_MS);
    }

    // Start track 2
    track2Ref.current.volume(0);
    track2Ref.current.play();
    track2Ref.current.fade(0, targetVolume, CROSSFADE_MS);
    setCurrentTrack(2);
  }, [getEffectiveVolume, scheduleCrossfadeTimeout, setCurrentTrack]);

  /**
   * Stop all music
   */
  const stopMusic = useCallback((fadeOutMs = 1000) => {
    logger.log(`[AdventureMusic] Stopping music`);

    if (track1Ref.current?.playing()) {
      track1Ref.current.fade(track1Ref.current.volume(), 0, fadeOutMs);
      scheduleCrossfadeTimeout(() => track1Ref.current?.stop(), fadeOutMs);
    }
    if (track2Ref.current?.playing()) {
      track2Ref.current.fade(track2Ref.current.volume(), 0, fadeOutMs);
      scheduleCrossfadeTimeout(() => track2Ref.current?.stop(), fadeOutMs);
    }
    setCurrentTrack(null);
  }, [scheduleCrossfadeTimeout, setCurrentTrack]);

  // ==============================================
  // EFFECTS
  // ==============================================

  // Initialize tracks when world changes
  useEffect(() => {
    if (worldNumberRef.current !== worldNumber) {
      initializeTracks();
    }
  }, [worldNumber, initializeTracks]);

  // Initialize tracks on mount
  useEffect(() => {
    initializeTracks();

    return () => {
      // Cleanup on unmount
      logger.log(`[AdventureMusic] Cleaning up`);

      // Clear all pending crossfade timeouts to prevent memory leaks
      crossfadeTimeoutsRef.current.forEach(clearTimeout);
      crossfadeTimeoutsRef.current = [];

      if (track1Ref.current) {
        track1Ref.current.unload();
        track1Ref.current = null;
      }
      if (track2Ref.current) {
        track2Ref.current.unload();
        track2Ref.current = null;
      }
    };
  }, [initializeTracks]);

  // Handle playing state changes
  useEffect(() => {
    const paths = getWorldTrackPaths(worldNumber, isBossLevel);
    if (!paths) return;

    if (enabled && isPlaying && !isPaused) {
      // Start playing if not already
      if (currentTrackRef.current === null) {
        startTrack1();
      } else if (!track1Ref.current?.playing() && !track2Ref.current?.playing()) {
        // Resume the current track
        const howl = currentTrackRef.current === 1 ? track1Ref.current : track2Ref.current;
        if (howl) {
          howl.play();
          howl.volume(getEffectiveVolume());
        }
      }
    } else {
      // Suspend when paused, stopped, OR disabled. The disabled case matters: when
      // AdventureView's ambient hook hands off to AdventureGame's in-game hook
      // (enabled flips true→false), failing to pause here left the ambient track
      // playing UNDER the gameplay track = doubled/layered audio.
      suspendAudio(enabled ? 'Game paused/stopped' : 'Music disabled');
    }
  }, [isPlaying, isPaused, enabled, worldNumber, isBossLevel, startTrack1, suspendAudio, getEffectiveVolume]);

  // Handle track switching based on time
  useEffect(() => {
    if (!enabled || !isPlaying || isPaused) return;
    if (currentTrackRef.current !== 1) return;

    // Calculate elapsed percentage
    const elapsed = totalTime - timeRemaining;
    const elapsedPercentage = elapsed / totalTime;

    // Switch to track 2 at threshold
    if (elapsedPercentage >= TRACK_SWITCH_THRESHOLD && !hasSwitchedToTrack2Ref.current) {
      switchToTrack2();
    }
  }, [timeRemaining, totalTime, isPlaying, isPaused, enabled, switchToTrack2]);

  // Handle returning to ambient mode (totalTime becomes 0)
  // When exiting gameplay and returning to WorldMap/LevelGrid, reset to track 1
  useEffect(() => {
    const wasInGameplay = prevTotalTimeRef.current > 0;
    const isNowAmbient = totalTime === 0;

    // Update ref for next comparison
    prevTotalTimeRef.current = totalTime;

    // Detect transition from gameplay to ambient
    if (wasInGameplay && isNowAmbient && enabled && isPlaying && !isPaused) {
      logger.log(`[AdventureMusic] Returning to ambient mode - resetting to track 1`);

      // Reset track switch flag so track 2 can be triggered again in next gameplay
      hasSwitchedToTrack2Ref.current = false;

      // If on track 2, switch back to track 1 for ambient looping
      if (currentTrackRef.current === 2) {
        startTrack1();
      }
    }
  }, [totalTime, enabled, isPlaying, isPaused, startTrack1]);

  // Live-update Howl volume when MusicContext volume changes (slider drag).
  // Decoupled from mute so dragging the slider doesn't pause/resume the loop.
  useEffect(() => {
    if (contextMuted) return;
    const currentTrack = currentTrackRef.current;
    if (!currentTrack) return;
    const howl = currentTrack === 1 ? track1Ref.current : track2Ref.current;
    if (!howl) return;
    howl.volume(contextVolume);
  }, [contextVolume, contextMuted]);

  // Pause/resume Howl on MusicContext mute toggle.
  // pause() halts decoding entirely; volume(0) would leave the audio loop running.
  useEffect(() => {
    if (contextMuted) {
      suspendAudio('Music muted');
    } else {
      resumeAudio('Music unmuted');
    }
  }, [contextMuted, suspendAudio, resumeAudio]);

  // ==============================================
  // RETURN
  // ==============================================

  return {
    /** Current track number (1, 2, or null) */
    currentTrack: currentTrackState,
    /** Stop all music with optional fade */
    stopMusic,
    /** Whether this world has music tracks */
    hasMusic: isBossLevel || WORLDS_WITH_MUSIC.includes(worldNumber),
  };
}

export default useAdventureMusic;
