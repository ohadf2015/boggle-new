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
 * The musical BEDS follow the player's chosen style so the vibe is pervasive:
 * homepage (bossa), lobby, countdown (beforeGame) and in-game. The short
 * functional stings stay universal — urgent ramp, earthquake, blast identity —
 * they're gameplay feedback, not vibe. Exported for unit testing.
 */
const STYLE_SWAPPABLE_TRACKS: ReadonlySet<TrackKey> = new Set<TrackKey>([
  'lobby',
  'beforeGame',
  'inGame',
  'bossa',
]);

export function resolveTrackSrc(key: TrackKey, styleKey: string): string {
  if (STYLE_SWAPPABLE_TRACKS.has(key)) return resolveStyleTrack(styleKey, TRACKS[key]);
  return TRACKS[key];
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
  const currentHowlRef = useRef<Howl | null>(null);
  const fadeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentTrackRef = useRef<TrackKey | null>(null);
  const isTransitioningRef = useRef(false);
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
        getHowler().then((H) => {
          if (H.ctx && H.ctx.state === 'suspended') {
            H.ctx.resume()
              .then(() => {
                try { howlsRef.current[key]?.play(); } catch (playErr) {
                  logger.log(`[Music] Retry play failed for ${key}:`, playErr);
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

  // Cleanup on unmount
  useEffect(() => {
    const howls = howlsRef.current;
    const fadeTimeout = fadeTimeoutRef.current;
    return () => {
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
      pendingUnlockTimeoutRef.current = setTimeout(() => {
        pendingUnlockTimeoutRef.current = null;
        fadeToTrackRef.current?.(trackKey, fadeOutMs, fadeInMs);
      }, 100);
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

    const newHowl = getOrCreateHowl(trackKey);

    if (newHowl.state() === 'unloaded') {
      logger.log('[Music] Track not loaded, starting load:', trackKey);
      newHowl.load();
    }

    if (currentTrackRef.current === trackKey && currentHowlRef.current?.playing()) {
      return;
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
          setTimeout(() => howl.stop(), fadeOutMs);
        } else {
          howl.stop();
        }
      }
    });

    if (oldHowl && oldHowl !== newHowl && !oldHowl.playing()) {
      oldHowl.stop();
    }

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
  }, [getOrCreateHowl, windowFocusedRef, pausedByVisibilityRef, pausedByBlurRef]);

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

    const handleFirstInteraction = async (): Promise<void> => {
      if (audioUnlockedRef.current) return;
      logger.log('[Music] First user interaction detected, unlocking audio...');

      try {
        const H = await getHowler();
        if (H.ctx && H.ctx.state === 'suspended') {
          await H.ctx.resume();
        }
      } catch (err) { logger.log('[Music] Failed to resume AudioContext:', err); }

      audioUnlockedRef.current = true;
      setAudioUnlocked(true);

      // Play pending track if unlockAudio() hasn't already consumed it
      if (pendingUnlockTrackRef.current) {
        const { trackKey, fadeOutMs, fadeInMs } = pendingUnlockTrackRef.current;
        pendingUnlockTrackRef.current = null;
        fadeToTrack(trackKey, fadeOutMs, fadeInMs);
      }

      cleanup();
    };

    const events = ['click', 'touchend', 'keydown'];
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
    Object.values(howlsRef.current).forEach(howl => {
      if (howl.playing()) {
        howl.fade(howl.volume(), 0, fadeOutMs);
        setTimeout(() => howl.stop(), fadeOutMs);
      } else {
        howl.stop();
      }
    });
    currentHowlRef.current = null;
    currentTrackRef.current = null;
    setCurrentTrack(null);
    setIsPlaying(false);
  }, []);

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
