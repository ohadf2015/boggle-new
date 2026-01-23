'use client';

import { useEffect, useRef, useCallback } from 'react';
import { Howl, Howler } from 'howler';
import logger from '@/utils/logger';

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
}

interface AdventureTrackPaths {
  track1: string;
  track2: string;
}

// ==============================================
// CONSTANTS
// ==============================================

/** Worlds that have adventure music tracks (1-3 for now) */
const WORLDS_WITH_MUSIC = [1, 2, 3];

/**
 * Percentage of time elapsed to trigger track transition
 * At 50% elapsed (50% remaining), switch from track 1 to track 2
 */
const TRACK_SWITCH_THRESHOLD = 0.5;

/** Crossfade duration in milliseconds */
const CROSSFADE_MS = 2000;

/** Default volume for adventure music */
const DEFAULT_VOLUME = 0.5;

// ==============================================
// HELPERS
// ==============================================

/**
 * Get track paths for a given world number
 * Returns null if world doesn't have music tracks
 */
function getWorldTrackPaths(worldNumber: number): AdventureTrackPaths | null {
  if (!WORLDS_WITH_MUSIC.includes(worldNumber)) {
    return null;
  }
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
}: UseAdventureMusicOptions) {
  // Track refs for Howl instances
  const track1Ref = useRef<Howl | null>(null);
  const track2Ref = useRef<Howl | null>(null);

  // State refs
  const currentTrackRef = useRef<1 | 2 | null>(null);
  const hasSwitchedToTrack2Ref = useRef(false);
  const worldNumberRef = useRef(worldNumber);
  const isPlayingRef = useRef(isPlaying);
  const isPausedRef = useRef(isPaused);
  const enabledRef = useRef(enabled);

  // Window focus tracking
  const windowFocusedRef = useRef(typeof document !== 'undefined' ? document.hasFocus() : true);
  const pausedByBlurRef = useRef(false);
  const pausedByVisibilityRef = useRef(false);

  // Keep refs in sync
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);
  useEffect(() => { enabledRef.current = enabled; }, [enabled]);

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
      howl.volume(DEFAULT_VOLUME);
    }
  }, []);

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
   */
  const createHowl = useCallback((src: string, trackName: string): Howl => {
    const howl = new Howl({
      src: [src],
      loop: false, // Manual looping for crossfade
      volume: 0,
      preload: false,
      html5: false,
      onloaderror: (id, err) => {
        logger.error(`[AdventureMusic] Failed to load ${trackName}:`, err);
      },
      onplayerror: (id, err) => {
        logger.error(`[AdventureMusic] Failed to play ${trackName}:`, err);
        // Try to resume AudioContext
        if (Howler.ctx && Howler.ctx.state === 'suspended') {
          Howler.ctx.resume().catch(() => {});
        }
      },
      onend: () => {
        // Manual loop with crossfade
        if (!windowFocusedRef.current || document.visibilityState === 'hidden') {
          return;
        }

        // Check if this track is still the current track
        const isTrack1 = track1Ref.current === howl;
        const isTrack2 = track2Ref.current === howl;
        const shouldLoop = (isTrack1 && currentTrackRef.current === 1) ||
                          (isTrack2 && currentTrackRef.current === 2);

        if (shouldLoop && enabledRef.current && isPlayingRef.current && !isPausedRef.current) {
          logger.log(`[AdventureMusic] ${trackName} ended, looping with crossfade`);
          howl.seek(0);
          howl.volume(0);
          howl.play();
          howl.fade(0, DEFAULT_VOLUME, CROSSFADE_MS);
        }
      },
    });
    return howl;
  }, []);

  /**
   * Initialize tracks for the current world
   */
  const initializeTracks = useCallback(() => {
    const paths = getWorldTrackPaths(worldNumber);
    if (!paths) {
      logger.log(`[AdventureMusic] World ${worldNumber} has no music tracks`);
      return;
    }

    logger.log(`[AdventureMusic] Initializing tracks for world ${worldNumber}`);

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
    track1Ref.current = createHowl(paths.track1, `World ${worldNumber} Track 1`);
    track2Ref.current = createHowl(paths.track2, `World ${worldNumber} Track 2`);

    // Reset state
    currentTrackRef.current = null;
    hasSwitchedToTrack2Ref.current = false;
    worldNumberRef.current = worldNumber;
  }, [worldNumber, createHowl]);

  /**
   * Start playing track 1
   */
  const startTrack1 = useCallback(() => {
    if (!track1Ref.current || currentTrackRef.current === 1) return;

    logger.log(`[AdventureMusic] Starting track 1`);

    // Load if not loaded
    if (track1Ref.current.state() === 'unloaded') {
      track1Ref.current.load();
    }

    // Fade out track 2 if playing
    if (track2Ref.current?.playing()) {
      track2Ref.current.fade(track2Ref.current.volume(), 0, CROSSFADE_MS);
      setTimeout(() => track2Ref.current?.stop(), CROSSFADE_MS);
    }

    // Start track 1
    track1Ref.current.volume(0);
    track1Ref.current.play();
    track1Ref.current.fade(0, DEFAULT_VOLUME, CROSSFADE_MS);
    currentTrackRef.current = 1;
  }, []);

  /**
   * Switch to track 2
   */
  const switchToTrack2 = useCallback(() => {
    if (!track2Ref.current || currentTrackRef.current === 2 || hasSwitchedToTrack2Ref.current) return;

    logger.log(`[AdventureMusic] Switching to track 2`);
    hasSwitchedToTrack2Ref.current = true;

    // Load if not loaded
    if (track2Ref.current.state() === 'unloaded') {
      track2Ref.current.load();
    }

    // Crossfade from track 1 to track 2
    if (track1Ref.current?.playing()) {
      track1Ref.current.fade(track1Ref.current.volume(), 0, CROSSFADE_MS);
      setTimeout(() => track1Ref.current?.stop(), CROSSFADE_MS);
    }

    // Start track 2
    track2Ref.current.volume(0);
    track2Ref.current.play();
    track2Ref.current.fade(0, DEFAULT_VOLUME, CROSSFADE_MS);
    currentTrackRef.current = 2;
  }, []);

  /**
   * Stop all music
   */
  const stopMusic = useCallback((fadeOutMs = 1000) => {
    logger.log(`[AdventureMusic] Stopping music`);

    if (track1Ref.current?.playing()) {
      track1Ref.current.fade(track1Ref.current.volume(), 0, fadeOutMs);
      setTimeout(() => track1Ref.current?.stop(), fadeOutMs);
    }
    if (track2Ref.current?.playing()) {
      track2Ref.current.fade(track2Ref.current.volume(), 0, fadeOutMs);
      setTimeout(() => track2Ref.current?.stop(), fadeOutMs);
    }
    currentTrackRef.current = null;
  }, []);

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
    const paths = getWorldTrackPaths(worldNumber);
    if (!paths || !enabled) return;

    if (isPlaying && !isPaused) {
      // Start playing if not already
      if (currentTrackRef.current === null) {
        startTrack1();
      } else if (!track1Ref.current?.playing() && !track2Ref.current?.playing()) {
        // Resume the current track
        const howl = currentTrackRef.current === 1 ? track1Ref.current : track2Ref.current;
        if (howl) {
          howl.play();
          howl.volume(DEFAULT_VOLUME);
        }
      }
    } else {
      // Pause music when game is paused or not playing
      suspendAudio('Game paused/stopped');
    }
  }, [isPlaying, isPaused, enabled, worldNumber, startTrack1, suspendAudio]);

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

  // ==============================================
  // RETURN
  // ==============================================

  return {
    /** Current track number (1, 2, or null) */
    currentTrack: currentTrackRef.current,
    /** Stop all music with optional fade */
    stopMusic,
    /** Whether this world has music tracks */
    hasMusic: WORLDS_WITH_MUSIC.includes(worldNumber),
  };
}

export default useAdventureMusic;
