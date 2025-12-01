'use client';

import React, { createContext, useContext, useEffect, useState, useRef, useCallback, ReactNode } from 'react';
import { Howl, Howler } from 'howler';
import logger from '@/utils/logger';

type TrackKey = 'lobby' | 'beforeGame' | 'inGame' | 'almostOutOfTime';

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
  TRACKS: {
    LOBBY: 'lobby';
    BEFORE_GAME: 'beforeGame';
    IN_GAME: 'inGame';
    ALMOST_OUT_OF_TIME: 'almostOutOfTime';
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
};

const STORAGE_KEY = 'boggle_music_settings';

interface MusicProviderProps {
  children: ReactNode;
}

export function MusicProvider({ children }: MusicProviderProps) {
    // Load persisted settings
    const [volume, setVolumeState] = useState<number>(() => {
        if (typeof window !== 'undefined') {
            try {
                const saved = localStorage.getItem(STORAGE_KEY);
                if (saved) {
                    const { volume } = JSON.parse(saved) as MusicSettings;
                    return volume ?? 0.5;
                }
            } catch (e) {
                logger.warn('Failed to load music settings:', e);
            }
        }
        return 0.5;
    });

    const [isMuted, setIsMuted] = useState<boolean>(() => {
        if (typeof window !== 'undefined') {
            try {
                const saved = localStorage.getItem(STORAGE_KEY);
                if (saved) {
                    const { isMuted } = JSON.parse(saved) as MusicSettings;
                    return isMuted ?? false;
                }
            } catch (e) {
                logger.warn('Failed to load music settings:', e);
            }
        }
        return false;
    });

    const [currentTrack, setCurrentTrack] = useState<TrackKey | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    // audioUnlocked is session-based, NOT persisted to localStorage
    // Browser AudioContext resets between sessions, so we must always start locked
    const [audioUnlocked, setAudioUnlocked] = useState(false);

    // Ref to track audioUnlocked state without causing re-renders
    const audioUnlockedRef = useRef(false);

    // Howl instances ref - one per track for seamless transitions
    const howlsRef = useRef<Record<TrackKey, Howl>>({} as Record<TrackKey, Howl>);
    const currentHowlRef = useRef<Howl | null>(null);
    const fadeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const currentTrackRef = useRef<TrackKey | null>(null);
    const isTransitioningRef = useRef(false);

    // Refs for stable function references (avoid unnecessary re-renders)
    const isMutedRef = useRef(isMuted);
    const volumeRef = useRef(volume);

    // Keep refs in sync with state
    useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
    useEffect(() => { volumeRef.current = volume; }, [volume]);
    useEffect(() => { audioUnlockedRef.current = audioUnlocked; }, [audioUnlocked]);

    // Initialize Howl instances
    useEffect(() => {
        if (typeof window === 'undefined') return;

        Object.entries(TRACKS).forEach(([key, src]) => {
            // All tracks use manual looping with crossfade for smooth transitions
            // Warning track (almostOutOfTime) loops from beginning, others from 10s mark
            const isWarningTrack = key === 'almostOutOfTime';

            howlsRef.current[key as TrackKey] = new Howl({
                src: [src],
                loop: false, // All tracks use manual crossfade looping for smooth transitions
                volume: 0,
                preload: false, // Defer loading for slow connections - load on demand
                // Using Web Audio API (html5: false) for better autoplay support
                // html5 mode has stricter autoplay restrictions on some browsers
                html5: false,
                onloaderror: (id, err) => {
                    logger.error(`[Music] Failed to load ${key}:`, err);
                },
                onplayerror: (id, err) => {
                    logger.error(`[Music] Failed to play ${key}:`, err);
                    // Try to unlock and retry
                    if (Howler.ctx && Howler.ctx.state === 'suspended') {
                        Howler.ctx.resume().then(() => {
                            howlsRef.current[key as TrackKey]?.play();
                        });
                    }
                },
                onend: () => {
                    // When track ends, crossfade to itself for smooth looping
                    if (currentTrackRef.current === key && howlsRef.current[key as TrackKey]) {
                        // Warning track restarts from beginning, others from 10s mark
                        const seekPosition = isWarningTrack ? 0 : 10;
                        logger.log(`[Music] Track ended, restarting from ${seekPosition}s with crossfade:`, key);
                        const howl = howlsRef.current[key as TrackKey];
                        const targetVolume = isMutedRef.current ? 0 : volumeRef.current;

                        // Crossfade: start fading out current instance
                        howl.fade(howl.volume(), 0, 2000);

                        // Start new instance from seek position and fade in (overlapping with fade out)
                        setTimeout(() => {
                            howl.seek(seekPosition);
                            howl.volume(0);
                            howl.play();
                            howl.fade(0, targetVolume, 2000);
                        }, 0); // Start immediately for true crossfade
                    }
                },
            });
        });

        // Copy ref values for cleanup to avoid stale ref warnings
        const howls = howlsRef.current;
        const fadeTimeout = fadeTimeoutRef.current;

        return () => {
            // Cleanup on unmount
            Object.values(howls).forEach(howl => {
                howl.unload();
            });
            if (fadeTimeout) {
                clearTimeout(fadeTimeout);
            }
            // Note: transitionTimeoutRef cleanup is in the useCallback scope
        };
    }, []);

    // Track if we paused music due to tab visibility (to know whether to resume)
    const pausedByVisibilityRef = useRef(false);
    const volumeBeforePauseRef = useRef<number>(0);

    // Handle tab visibility - pause music when hidden, resume when visible
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                // Tab is hidden - pause/mute the music
                if (currentHowlRef.current && currentHowlRef.current.playing()) {
                    volumeBeforePauseRef.current = currentHowlRef.current.volume();
                    currentHowlRef.current.volume(0);
                    pausedByVisibilityRef.current = true;
                    logger.log('[Music] Tab hidden - muting music');
                }
            } else if (document.visibilityState === 'visible') {
                // Tab is visible again - resume AudioContext and restore volume
                if (audioUnlockedRef.current) {
                    if (Howler.ctx && Howler.ctx.state === 'suspended') {
                        Howler.ctx.resume();
                    }
                }

                // Restore volume if we paused due to visibility
                if (pausedByVisibilityRef.current && currentHowlRef.current) {
                    const targetVolume = isMutedRef.current ? 0 : volumeRef.current;
                    currentHowlRef.current.volume(targetVolume);
                    pausedByVisibilityRef.current = false;
                    logger.log('[Music] Tab visible - restoring music volume');
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    // Persist settings to localStorage (volume and mute only, NOT audioUnlocked)
    useEffect(() => {
        if (typeof window !== 'undefined') {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify({ volume, isMuted }));
            } catch (e) {
                logger.warn('Failed to save music settings:', e);
            }
        }
    }, [volume, isMuted]);

    // Explicitly unlock audio - called when user clicks the speaker button (fallback)
    const unlockAudio = useCallback(() => {
        if (audioUnlockedRef.current) return;

        // Resume AudioContext for iOS Safari
        if (Howler.ctx && Howler.ctx.state === 'suspended') {
            Howler.ctx.resume();
        }

        audioUnlockedRef.current = true;
        setAudioUnlocked(true);
    }, []);

    // Queue for pending track requests during transitions
    const pendingTrackRef = useRef<PendingTrack | null>(null);
    const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Queue for track requests made before audio is unlocked
    const pendingUnlockTrackRef = useRef<PendingTrack | null>(null);

    // Ref to hold fadeToTrack for recursive calls
    const fadeToTrackRef = useRef<((trackKey: TrackKey, fadeOutMs?: number, fadeInMs?: number) => void) | null>(null);

    // Crossfade to a new track - MUST be defined before useEffects that reference it
    const fadeToTrack = useCallback((trackKey: TrackKey, fadeOutMs = 1000, fadeInMs = 1000) => {
        if (!trackKey) return;

        logger.log('[Music] fadeToTrack called:', trackKey, 'audioUnlocked:', audioUnlockedRef.current);

        // If audio not yet unlocked, queue the track request for when it gets unlocked
        if (!audioUnlockedRef.current) {
            logger.log('[Music] Audio not unlocked, queueing track:', trackKey);
            pendingUnlockTrackRef.current = { trackKey, fadeOutMs, fadeInMs };
            return;
        }

        const newHowl = howlsRef.current[trackKey];
        if (!newHowl) {
            logger.warn(`[Music] Track not found: ${trackKey}`);
            return;
        }

        // Load the track on-demand if not loaded yet (lazy loading for slow connections)
        if (newHowl.state() === 'unloaded') {
            logger.log('[Music] Loading track on demand:', trackKey);
            newHowl.load();
        }

        // If same track, just ensure it's playing (use ref to avoid dependency)
        if (currentTrackRef.current === trackKey && currentHowlRef.current?.playing()) {
            logger.log('[Music] Track already playing:', trackKey);
            return;
        }

        // If currently transitioning, queue this track request instead of ignoring
        if (isTransitioningRef.current) {
            pendingTrackRef.current = { trackKey, fadeOutMs, fadeInMs };
            return;
        }
        isTransitioningRef.current = true;

        // Clear any pending fade timeout
        if (fadeTimeoutRef.current) {
            clearTimeout(fadeTimeoutRef.current);
        }

        // Clear any previous transition timeout
        if (transitionTimeoutRef.current) {
            clearTimeout(transitionTimeoutRef.current);
        }

        const oldHowl = currentHowlRef.current;
        const targetVolume = isMutedRef.current ? 0 : volumeRef.current;

        // Fade out old track
        if (oldHowl && oldHowl !== newHowl && oldHowl.playing()) {
            oldHowl.fade(oldHowl.volume(), 0, fadeOutMs);
            fadeTimeoutRef.current = setTimeout(() => {
                oldHowl.stop();
            }, fadeOutMs);
        }

        // Start and fade in new track
        newHowl.volume(0);
        logger.log('[Music] Starting playback:', trackKey, 'target volume:', targetVolume);
        newHowl.play();
        newHowl.fade(0, targetVolume, fadeInMs);

        currentHowlRef.current = newHowl;
        currentTrackRef.current = trackKey;
        setCurrentTrack(trackKey);
        setIsPlaying(true);

        // Clear transition lock after fade completes, then process any pending request
        transitionTimeoutRef.current = setTimeout(() => {
            isTransitioningRef.current = false;

            // Process pending track request if there is one
            if (pendingTrackRef.current) {
                const { trackKey: pendingTrack, fadeOutMs: pendingFadeOut, fadeInMs: pendingFadeIn } = pendingTrackRef.current;
                pendingTrackRef.current = null;
                fadeToTrackRef.current?.(pendingTrack, pendingFadeOut, pendingFadeIn);
            }
        }, Math.max(fadeOutMs, fadeInMs));
    }, []); // Using refs instead of state to avoid stale closures

    // Keep ref in sync for recursive calls
    useEffect(() => {
        fadeToTrackRef.current = fadeToTrack;
    }, [fadeToTrack]);

    // Auto-unlock audio on first user interaction anywhere in the app
    useEffect(() => {
        if (typeof window === 'undefined' || audioUnlocked) return;

        const handleFirstInteraction = async () => {
            if (audioUnlockedRef.current) return;

            logger.log('[Music] First user interaction detected, unlocking audio...');

            // Resume AudioContext for iOS Safari
            if (Howler.ctx && Howler.ctx.state === 'suspended') {
                try {
                    await Howler.ctx.resume();
                    logger.log('[Music] AudioContext resumed successfully');
                } catch (err) {
                    logger.error('[Music] Failed to resume AudioContext:', err);
                }
            }

            // Update ref immediately so fadeToTrack works in the same event cycle
            audioUnlockedRef.current = true;
            setAudioUnlocked(true);

            // Process any pending track request immediately (don't wait for React re-render)
            if (pendingUnlockTrackRef.current) {
                const { trackKey, fadeOutMs, fadeInMs } = pendingUnlockTrackRef.current;
                pendingUnlockTrackRef.current = null;
                logger.log('[Music] Playing pending track:', trackKey);
                // Small delay to ensure AudioContext is fully ready
                setTimeout(() => {
                    fadeToTrack(trackKey, fadeOutMs, fadeInMs);
                }, 100);
            }

            // Remove all listeners after first interaction
            cleanup();
        };

        const events = ['click', 'touchend', 'keydown'];

        events.forEach(event => {
            document.addEventListener(event, handleFirstInteraction, {
                capture: true,
                passive: true
            });
        });

        const cleanup = () => {
            events.forEach(event => {
                document.removeEventListener(event, handleFirstInteraction, { capture: true });
            });
        };

        return cleanup;
    }, [audioUnlocked, fadeToTrack]);

    // Play a track (with short fade)
    const playTrack = useCallback((trackKey: TrackKey) => {
        fadeToTrack(trackKey, 500, 500);
    }, [fadeToTrack]);

    // Process pending track requests when audio gets unlocked
    useEffect(() => {
        if (audioUnlocked && pendingUnlockTrackRef.current) {
            const { trackKey, fadeOutMs, fadeInMs } = pendingUnlockTrackRef.current;
            pendingUnlockTrackRef.current = null;
            // Small delay to ensure AudioContext is fully resumed
            setTimeout(() => {
                fadeToTrack(trackKey, fadeOutMs, fadeInMs);
            }, 50);
        }
    }, [audioUnlocked, fadeToTrack]);

    // Stop music with fade out
    const stopMusic = useCallback((fadeOutMs = 1000) => {
        const howl = currentHowlRef.current;
        if (howl && howl.playing()) {
            howl.fade(howl.volume(), 0, fadeOutMs);
            setTimeout(() => {
                howl.stop();
            }, fadeOutMs);
        }
        currentHowlRef.current = null;
        currentTrackRef.current = null;
        setCurrentTrack(null);
        setIsPlaying(false);
    }, []);

    // Set volume
    const setVolume = useCallback((newVolume: number) => {
        const clampedVolume = Math.max(0, Math.min(1, newVolume));
        setVolumeState(clampedVolume);

        if (currentHowlRef.current && !isMuted) {
            currentHowlRef.current.volume(clampedVolume);
        }
    }, [isMuted]);

    // Toggle mute
    const toggleMute = useCallback(() => {
        setIsMuted(prev => {
            const newMuted = !prev;
            if (currentHowlRef.current) {
                if (newMuted) {
                    currentHowlRef.current.volume(0);
                } else {
                    currentHowlRef.current.volume(volume);
                }
            }
            return newMuted;
        });
    }, [volume]);

    // Update volume when mute state changes and we have an active track
    useEffect(() => {
        if (currentHowlRef.current) {
            currentHowlRef.current.volume(isMuted ? 0 : volume);
        }
    }, [isMuted, volume]);

    const value: MusicContextType = {
        // State
        currentTrack,
        volume,
        isMuted,
        isPlaying,
        audioUnlocked,

        // Actions
        playTrack,
        stopMusic,
        fadeToTrack,
        setVolume,
        toggleMute,
        unlockAudio,

        // Track keys for convenience
        TRACKS: {
            LOBBY: 'lobby',
            BEFORE_GAME: 'beforeGame',
            IN_GAME: 'inGame',
            ALMOST_OUT_OF_TIME: 'almostOutOfTime',
        },
    };

    return (
        <MusicContext.Provider value={value}>
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
