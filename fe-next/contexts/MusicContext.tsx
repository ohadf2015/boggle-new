'use client';

import React, { createContext, useContext, useEffect, useState, useRef, useCallback, useMemo, ReactNode } from 'react';
import type { Howl } from 'howler';
import logger from '@/utils/logger';
import { createLazyHowl, preloadAudioOnDemand, ensureHowl } from '@/lib/audio/audioLoader';

/** Lazily resolve the Howler global without pulling the module at parse time. */
async function getHowler(): Promise<typeof import('howler')['Howler']> {
  const mod = await import('howler');
  return mod.Howler;
}
import { useMusicFocusManager } from '@/lib/audio/useMusicFocusManager';
import { usePlayerStyle } from '@/contexts/PlayerStyleContext';
import { resolveStyleTrack } from '@/lib/playerStyle/styles';

type TrackKey = 'lobby' | 'beforeGame' | 'inGame' | 'almostOutOfTime' | 'bossaArcade' | 'bossa' | 'blast';

interface MusicContextType {
  currentTrack: TrackKey | null;
  volume: number;
  isMuted: boolean;
  isPlaying: boolean;
  audioUnlocked: boolean;
  playTrack: (trackKey: TrackKey) => void;
  stopMusic: (fadeOutMs?: number) => void;
  fadeToTrack: (trackKey: TrackKey, fadeOutMs?: number, fadeInMs?: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  unlockAudio: () => void;
  preloadMusicTrack: (trackKey: TrackKey) => Promise<void>;
  TRACKS: {
    LOBBY: 'lobby';
    BEFORE_GAME: 'beforeGame';
    IN_GAME: 'inGame';
    ALMOST_OUT_OF_TIME: 'almostOutOfTime';
    BOSSA_ARCADE: 'bossaArcade';
    BOSSA: 'bossa';
    BLAST: 'blast';
  };
}

interface MusicSettings {
  volume: number;
  isMuted: boolean;
}

interface PendingTrack {
  trackKey: TrackKey;
  fadeOutMs: number;
  fadeInMs: number;
}

const MusicContext = createContext<MusicContextType | null>(null);

const TRACKS: Record<TrackKey, string> = {
  lobby: '/music/in_lobby.mp3',
  beforeGame: '/music/before_game.mp3',
  inGame: '/music/in_game.mp3',
  almostOutOfTime: '/music/almost_out_of_time.mp3',
  bossaArcade: '/music/bossa-arcade.mp3',
  bossa: '/music/bossa.mp3',
  blast: '/music/blast_mode.mp3',
};

/**
 * Only the homepage / results bed (bossa) follows the player's chosen style —
 * that's the ambient "vibe" surface. Lobby, countdown (beforeGame) and in-game
 * stay on their universal beds, and the functional stings (urgent ramp,
 * earthquake, blast identity) are always universal gameplay feedback. Exported
 * for unit testing.
 */
const STYLE_SWAPPABLE_TRACKS: ReadonlySet<TrackKey> = new Set<TrackKey>([
  'bossa',
]);

export function resolveTrackSrc(key: TrackKey, styleKey: string): string {
  if (STYLE_SWAPPABLE_TRACKS.has(key)) return resolveStyleTrack(styleKey, TRACKS[key]);
  return TRACKS[key];
}

/**
 * Whether switching from `currentKey` to `nextKey` lands on the SAME underlying
 * audio file. A styled profile collapses lobby/beforeGame/inGame/bossa onto one
 * file, so a page nav or game-phase change flips the bed KEY while the actual
 * track is unchanged. In that case the player must keep rolling — restarting the
 * identical file from zero on every page is the regression this guards against.
 * Exported for unit testing.
 */
export function isSameResolvedTrack(
  currentKey: TrackKey | null,
  nextKey: TrackKey,
  styleKey: string,
): boolean {
  if (!currentKey) return false;
  return resolveTrackSrc(currentKey, styleKey) === resolveTrackSrc(nextKey, styleKey);
}

const STORAGE_KEY = 'boggle_music_settings';

function loadMusicSetting<T>(key: keyof MusicSettings, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as MusicSettings;
      return (parsed[key] as T) ?? fallback;
    }
  } catch (e) {
    logger.warn('Failed to load music settings:', e);
  }
  return fallback;
}

interface MusicProviderProps {
  children: ReactNode;
}

export function MusicProvider({ children }: MusicProviderProps): React.ReactElement {
  const [volume, setVolumeState] = useState<number>(() => loadMusicSetting('volume', 0.5));
  const [isMuted, setIsMuted] = useState<boolean>(() => loadMusicSetting('isMuted', false));
  const [currentTrack, setCurrentTrack] = useState<TrackKey | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUnlocked, setAudioUnlocked] = useState(false);

  // Eagerly load howler module on mount (deferred from parse-time to runtime)
  const howlReadyRef = useRef(false);
  useEffect(() => {
    ensureHowl().then(() => { howlReadyRef.current = true; }).catch(() => {});
  }, []);

  const audioUnlockedRef = useRef(false);
  const howlsRef = useRef<Record<TrackKey, Howl>>({} as Record<TrackKey, Howl>);
  // Re-entrancy guard for the onplayerror retry below: a corrupted/0-duration
  // track can fail .play() synchronously, re-firing onplayerror on the same
  // stack before this Set update would otherwise land, so unguarded retry
  // recurses to a stack overflow (Sentry JAVASCRIPT-NEXTJS-1PP, mirrors the
  // fix already in useAdventureMusic.ts's onend loop guard).
  const retryingPlayRef = useRef<Set<TrackKey>>(new Set());
  const currentHowlRef = useRef<Howl | null>(null);
  const fadeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentTrackRef = useRef<TrackKey | null>(null);
  const isTransitioningRef = useRef(false);
  // Deferred fade-out stops, keyed by track. A bare `setTimeout(() => howl.stop())`
  // is fire-and-forget: it nulls currentHowlRef synchronously but leaves the Howl
  // PLAYING until it fires ~1s later. If the same track is re-entered inside that
  // window (every Blast wave remounts <BlastGame>), play() lands on a still-playing
  // Howl and Howler spawns a SECOND concurrent sound — the echo that stacks per
  // wave until the tab freezes. Tracking the timers lets us cancel a pending stop
  // before restarting a track so exactly one instance per Howl can ever exist.
  const pendingStopsRef = useRef<Map<TrackKey, ReturnType<typeof setTimeout>>>(new Map());
  const isMutedRef = useRef(isMuted);
  const volumeRef = useRef(volume);

  // Player-chosen style drives the signature in-game theme. usePlayerStyle is
  // safe without its provider (returns the default style), so MusicProvider has
  // no hard dependency on the style tree in tests.
  const { styleKey } = usePlayerStyle();
  const styleKeyRef = useRef(styleKey);

  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
  useEffect(() => { volumeRef.current = volume; }, [volume]);
  useEffect(() => { audioUnlockedRef.current = audioUnlocked; }, [audioUnlocked]);

  // Focus/visibility audio management
  const {
    pausedByVisibilityRef,
    pausedByBlurRef,
    windowFocusedRef,
  } = useMusicFocusManager({
    currentHowlRef,
    currentTrackRef,
    howlsRef,
    isMutedRef,
    volumeRef,
    audioUnlockedRef,
  });

  const getOrCreateHowl = useCallback((key: TrackKey): Howl => {
    if (howlsRef.current[key]) return howlsRef.current[key];

    const src = resolveTrackSrc(key, styleKeyRef.current);
    const howl = createLazyHowl(src, {
      loop: true,
      volume: 0,
      onloaderror: (_id, err) => { logger.log(`[Music] Failed to load ${key}:`, err); },
      onplayerror: (_id, err) => {
        logger.log(`[Music] Failed to play ${key}:`, err);
        if (retryingPlayRef.current.has(key)) return;
        getHowler().then((H) => {
          if (H.ctx && H.ctx.state === 'suspended') {
            H.ctx.resume()
              .then(() => {
                retryingPlayRef.current.add(key);
                try { howlsRef.current[key]?.play(); } catch (playErr) {
                  logger.log(`[Music] Retry play failed for ${key}:`, playErr);
                } finally {
                  retryingPlayRef.current.delete(key);
                }
              })
              .catch((resumeErr: Error) => {
                logger.log(`[Music] AudioContext resume failed in onplayerror:`, resumeErr.message);
              });
          }
        }).catch(() => {});
      },
    });
    howlsRef.current[key] = howl;
    return howl;
  }, []);

  /** Cancel a track's pending deferred stop, if any. */
  const cancelPendingStop = useCallback((key: TrackKey) => {
    const pending = pendingStopsRef.current.get(key);
    if (pending) {
      clearTimeout(pending);
      pendingStopsRef.current.delete(key);
    }
  }, []);

  /**
   * Stop `howl` after `ms`, tracking the timer so it can be cancelled if the
   * track is re-entered before it fires. Replaces bare `setTimeout(stop)` calls
   * that otherwise leave a Howl playing past the point where currentHowlRef has
   * already been reassigned — the window in which a duplicate play() echoes.
   */
  const scheduleStop = useCallback((key: TrackKey, howl: Howl, ms: number) => {
    cancelPendingStop(key);
    const id = setTimeout(() => {
      pendingStopsRef.current.delete(key);
      howl.stop();
    }, ms);
    pendingStopsRef.current.set(key, id);
  }, [cancelPendingStop]);

  // Cleanup on unmount
  useEffect(() => {
    const howls = howlsRef.current;
    const fadeTimeout = fadeTimeoutRef.current;
    const pendingStops = pendingStopsRef.current;
    return () => {
      pendingStops.forEach(clearTimeout);
      pendingStops.clear();
      Object.values(howls).forEach(howl => howl.unload());
      if (fadeTimeout) clearTimeout(fadeTimeout);
    };
  }, []);

  // Persist settings
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ volume, isMuted }));
      } catch (e) {
        logger.warn('Failed to save music settings:', e);
      }
    }
  }, [volume, isMuted]);

  const pendingUnlockTrackRef = useRef<PendingTrack | null>(null);
  const pendingUnlockTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fadeToTrackRef = useRef<((trackKey: TrackKey, fadeOutMs?: number, fadeInMs?: number) => void) | null>(null);
  const pendingTrackRef = useRef<PendingTrack | null>(null);
  const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const unlockAudio = useCallback(() => {
    if (audioUnlockedRef.current) return;
    logger.log('[Music] unlockAudio called, unlocking audio...');

    getHowler().then((H) => {
      if (H.ctx && H.ctx.state === 'suspended') {
        try {
          const result = H.ctx.resume();
          if (result && typeof result.catch === 'function') {
            result.catch((err: Error) => { logger.log('[Music] unlockAudio - AudioContext resume failed:', err.message); });
          }
        } catch (err) {
          logger.log('[Music] unlockAudio - AudioContext error:', err);
        }
      }
    }).catch(() => {});

    audioUnlockedRef.current = true;
    setAudioUnlocked(true);

    if (pendingUnlockTrackRef.current) {
      const { trackKey, fadeOutMs, fadeInMs } = pendingUnlockTrackRef.current;
      pendingUnlockTrackRef.current = null;
      logger.log('[Music] unlockAudio - Playing pending track:', trackKey);
      // iOS: html5 audio must start playback within the user-gesture activation
      // window. A setTimeout defer (even 100ms) pushes play() outside that window
      // → iOS blocks it and music never starts. Kick it off synchronously here.
      fadeToTrackRef.current?.(trackKey, fadeOutMs, fadeInMs);
    }
  }, []);

  const fadeToTrack = useCallback(async (trackKey: TrackKey, fadeOutMs = 1000, fadeInMs = 1000) => {
    if (!trackKey) return;
    logger.log('[Music] fadeToTrack called:', trackKey, 'audioUnlocked:', audioUnlockedRef.current);

    if (!audioUnlockedRef.current) {
      logger.log('[Music] Audio not unlocked, queueing track:', trackKey);
      pendingUnlockTrackRef.current = { trackKey, fadeOutMs, fadeInMs };
      return;
    }

    if (pendingUnlockTimeoutRef.current) {
      clearTimeout(pendingUnlockTimeoutRef.current);
      pendingUnlockTimeoutRef.current = null;
    }

    // Same underlying audio already playing — only the bed KEY changed (a styled
    // profile collapses lobby/beforeGame/inGame/bossa onto ONE file). Keep it
    // rolling; restarting the identical track from zero on every page/phase is
    // the regression this guards against. Subsumes the old same-key check.
    if (
      isSameResolvedTrack(currentTrackRef.current, trackKey, styleKeyRef.current) &&
      currentHowlRef.current?.playing()
    ) {
      return;
    }

    const newHowl = getOrCreateHowl(trackKey);

    if (newHowl.state() === 'unloaded') {
      logger.log('[Music] Track not loaded, starting load:', trackKey);
      newHowl.load();
    }

    if (isTransitioningRef.current) {
      pendingTrackRef.current = { trackKey, fadeOutMs, fadeInMs };
      return;
    }
    isTransitioningRef.current = true;

    if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current);
    if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);

    const oldHowl = currentHowlRef.current;

    const targetVolume = isMutedRef.current ? 0 : volumeRef.current;

    // Stop all other tracks
    Object.entries(howlsRef.current).forEach(([key, howl]) => {
      if (key !== trackKey) {
        if (howl.playing()) {
          howl.fade(howl.volume(), 0, fadeOutMs);
          scheduleStop(key as TrackKey, howl, fadeOutMs);
        } else {
          cancelPendingStop(key as TrackKey);
          howl.stop();
        }
      }
    });

    if (oldHowl && oldHowl !== newHowl && !oldHowl.playing()) {
      oldHowl.stop();
    }

    // Single-instance guard: collapse any lingering playback of THIS track before
    // (re)starting it. We only reach here when we genuinely intend to start the
    // track (the same-track-already-playing case short-circuits above), so a
    // still-playing Howl here is a zombie from a deferred fade-out — calling
    // play() on it would spawn a second concurrent Howler sound (the echo).
    // Cancelling the pending stop also keeps a stale timer from silencing the
    // instance we're about to start.
    cancelPendingStop(trackKey);
    newHowl.stop();
    newHowl.volume(0);
    newHowl.play();

    const isTabHidden = typeof document !== 'undefined' && document.visibilityState === 'hidden';
    if (!windowFocusedRef.current || isTabHidden) {
      newHowl.pause();
      if (isTabHidden) {
        pausedByVisibilityRef.current = true;
      } else {
        pausedByBlurRef.current = true;
      }
    } else {
      newHowl.fade(0, targetVolume, fadeInMs);
      fadeTimeoutRef.current = setTimeout(() => {
        if (currentHowlRef.current === newHowl && newHowl.playing()) {
          const currentVol = newHowl.volume();
          const expectedVol = isMutedRef.current ? 0 : volumeRef.current;
          if (Math.abs(currentVol - expectedVol) > 0.1) {
            newHowl.volume(expectedVol);
          }
        }
      }, fadeInMs + 100);
    }

    currentHowlRef.current = newHowl;
    currentTrackRef.current = trackKey;
    setCurrentTrack(trackKey);
    setIsPlaying(true);

    transitionTimeoutRef.current = setTimeout(() => {
      isTransitioningRef.current = false;
      if (pendingTrackRef.current) {
        const { trackKey: pendingTrack, fadeOutMs: pendingFadeOut, fadeInMs: pendingFadeIn } = pendingTrackRef.current;
        pendingTrackRef.current = null;
        fadeToTrackRef.current?.(pendingTrack, pendingFadeOut, pendingFadeIn);
      }
    }, Math.max(fadeOutMs, fadeInMs));
  }, [getOrCreateHowl, scheduleStop, cancelPendingStop, windowFocusedRef, pausedByVisibilityRef, pausedByBlurRef]);

  useEffect(() => { fadeToTrackRef.current = fadeToTrack; }, [fadeToTrack]);

  // When the player switches style, every cached style-swappable Howl points at
  // the old file. Drop them all so they rebuild with the new src on next play;
  // if one of them is the track currently playing (e.g. switching style while on
  // the homepage or mid-game), crossfade to the new src immediately. Placed
  // after fadeToTrack so it can call it directly.
  useEffect(() => {
    styleKeyRef.current = styleKey;
    const playing = currentTrackRef.current;
    let rebuildPlaying = false;
    for (const key of STYLE_SWAPPABLE_TRACKS) {
      const existing = howlsRef.current[key];
      if (!existing) continue;
      if (playing === key) rebuildPlaying = true;
      try { existing.unload(); } catch { /* already unloaded */ }
      delete (howlsRef.current as Partial<Record<TrackKey, Howl>>)[key];
    }
    if (rebuildPlaying && playing && audioUnlockedRef.current) {
      fadeToTrack(playing, 400, 400);
    }
  }, [styleKey, fadeToTrack]);

  // Auto-unlock on first user interaction
  useEffect(() => {
    if (typeof window === 'undefined' || audioUnlocked) return;

    const handleFirstInteraction = (): void => {
      if (audioUnlockedRef.current) return;
      logger.log('[Music] First user interaction detected, unlocking audio...');

      audioUnlockedRef.current = true;
      setAudioUnlocked(true);

      // iOS: start the pending track SYNCHRONOUSLY inside the gesture handler —
      // html5 audio won't autoplay once we leave the user-activation window, and
      // an `await` (Howler load / ctx.resume) crosses a microtask boundary that
      // ends it. Play first, resume the WebAudio context in the background.
      if (pendingUnlockTrackRef.current) {
        const { trackKey, fadeOutMs, fadeInMs } = pendingUnlockTrackRef.current;
        pendingUnlockTrackRef.current = null;
        fadeToTrack(trackKey, fadeOutMs, fadeInMs);
      }

      getHowler().then((H) => {
        if (H.ctx && H.ctx.state === 'suspended') H.ctx.resume().catch(() => {});
      }).catch((err) => { logger.log('[Music] Failed to resume AudioContext:', err); });

      cleanup();
    };

    // pointerdown fires earliest (before touchend/click) → widest activation window on iOS.
    const events = ['pointerdown', 'click', 'touchend', 'keydown'];
    events.forEach(event => {
      document.addEventListener(event, handleFirstInteraction, { capture: true, passive: true });
    });

    const cleanup = (): void => {
      events.forEach(event => {
        document.removeEventListener(event, handleFirstInteraction, { capture: true });
      });
    };

    return cleanup;
  }, [audioUnlocked, fadeToTrack, getOrCreateHowl]);

  const playTrack = useCallback((trackKey: TrackKey) => {
    fadeToTrack(trackKey, 500, 500);
  }, [fadeToTrack]);

  // Note: pending tracks are already handled by unlockAudio() and the
  // auto-unlock listener. A backup effect here caused double-play.

  const stopMusic = useCallback((fadeOutMs = 1000) => {
    Object.entries(howlsRef.current).forEach(([key, howl]) => {
      if (howl.playing()) {
        howl.fade(howl.volume(), 0, fadeOutMs);
        scheduleStop(key as TrackKey, howl, fadeOutMs);
      } else {
        cancelPendingStop(key as TrackKey);
        howl.stop();
      }
    });
    currentHowlRef.current = null;
    currentTrackRef.current = null;
    setCurrentTrack(null);
    setIsPlaying(false);
  }, [scheduleStop, cancelPendingStop]);

  const setVolume = useCallback((newVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    setVolumeState(clampedVolume);
    if (currentHowlRef.current && !isMuted) {
      currentHowlRef.current.volume(clampedVolume);
    }
  }, [isMuted]);

  const toggleMute = useCallback(() => {
    const newMuted = !isMutedRef.current;
    isMutedRef.current = newMuted;
    setIsMuted(newMuted);
    if (currentHowlRef.current) {
      currentHowlRef.current.volume(newMuted ? 0 : volumeRef.current);
    }
  }, []);

  useEffect(() => {
    if (currentHowlRef.current) {
      currentHowlRef.current.volume(isMuted ? 0 : volume);
    }
  }, [isMuted, volume]);

  const preloadMusicTrack = useCallback(async (trackKey: TrackKey) => {
    const howl = getOrCreateHowl(trackKey);
    if (howl.state() === 'unloaded') {
      try { await preloadAudioOnDemand(howl); } catch (err) { logger.log('[Music] Failed to preload track:', trackKey, err); }
    }
  }, [getOrCreateHowl]);

  const TRACKS_CONST = useMemo(() => ({
    LOBBY: 'lobby' as const,
    BEFORE_GAME: 'beforeGame' as const,
    IN_GAME: 'inGame' as const,
    ALMOST_OUT_OF_TIME: 'almostOutOfTime' as const,
    BOSSA_ARCADE: 'bossaArcade' as const,
    BOSSA: 'bossa' as const,
    BLAST: 'blast' as const,
  }), []);

  const value = useMemo<MusicContextType>(() => ({
    currentTrack, volume, isMuted, isPlaying, audioUnlocked,
    playTrack, stopMusic, fadeToTrack, setVolume, toggleMute, unlockAudio, preloadMusicTrack,
    TRACKS: TRACKS_CONST,
  }), [
    currentTrack, volume, isMuted, isPlaying, audioUnlocked,
    playTrack, stopMusic, fadeToTrack, setVolume, toggleMute, unlockAudio, preloadMusicTrack, TRACKS_CONST,
  ]);

  return (
    <MusicContext.Provider value={value}>
      {children}
    </MusicContext.Provider>
  );
}

/**
 * MusicProviderStub - No-op context provider used while the real MusicProvider
 * (which pulls in Howler.js) is loading via dynamic import.
 * Keeps useMusic() safe to call with zero-cost stubs.
 */
const NOOP = (): void => {};
const NOOP_ASYNC = async (): Promise<void> => {};
const STUB_TRACKS = {
  LOBBY: 'lobby' as const,
  BEFORE_GAME: 'beforeGame' as const,
  IN_GAME: 'inGame' as const,
  ALMOST_OUT_OF_TIME: 'almostOutOfTime' as const,
  BOSSA_ARCADE: 'bossaArcade' as const,
  BOSSA: 'bossa' as const,
  BLAST: 'blast' as const,
};
const stubValue: MusicContextType = {
  currentTrack: null,
  volume: 0.5,
  isMuted: false,
  isPlaying: false,
  audioUnlocked: false,
  playTrack: NOOP,
  stopMusic: NOOP,
  fadeToTrack: NOOP,
  setVolume: NOOP,
  toggleMute: NOOP,
  unlockAudio: NOOP,
  preloadMusicTrack: NOOP_ASYNC,
  TRACKS: STUB_TRACKS,
};

export function MusicProviderStub({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <MusicContext.Provider value={stubValue}>
      {children}
    </MusicContext.Provider>
  );
}

export function useMusic(): MusicContextType {
  const context = useContext(MusicContext);
  if (!context) {
    throw new Error('useMusic must be used within a MusicProvider');
  }
  return context;
}
