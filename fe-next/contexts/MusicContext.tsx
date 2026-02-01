'use client';

import React, { createContext, useContext, useEffect, useState, useRef, useCallback, useMemo, ReactNode } from 'react';
import { Howl, Howler } from 'howler';
import logger from '@/utils/logger';
import { createLazyHowl, preloadAudioOnDemand } from '@/lib/audio/audioLoader';

type TrackKey = 'lobby' | 'beforeGame' | 'inGame' | 'almostOutOfTime' | 'bossaArcade' | 'bossa';

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
                // Log only in development - this is expected, handled behavior on iOS Safari
                logger.log('[Music] iOS Safari audio device error (silenced):', error.message);
            }
        };

        window.addEventListener('unhandledrejection', handleUnhandledRejection);
        return () => window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    }, []);

    // Initialize Howl instances
    useEffect(() => {
        if (typeof window === 'undefined') return;

        Object.entries(TRACKS).forEach(([key, src]) => {
            // Use Howler's native loop: true for seamless, reliable looping
            // This is simpler and avoids the complexity of manual crossfade-to-self
            howlsRef.current[key as TrackKey] = createLazyHowl(src, {
                loop: true, // Native looping for seamless playback
                volume: 0,
                // html5: true set by createLazyHowl for iOS Safari compatibility
                // preload: false set by createLazyHowl to prevent automatic loading
                onloaderror: (id, err) => {
                    logger.error(`[Music] Failed to load ${key}:`, err);
                },
                onplayerror: (id, err) => {
                    logger.error(`[Music] Failed to play ${key}:`, err);
                    // Try to unlock and retry - wrap in catch for iOS Safari errors
                    if (Howler.ctx && Howler.ctx.state === 'suspended') {
                        Howler.ctx.resume()
                            .then(() => {
                                try {
                                    howlsRef.current[key as TrackKey]?.play();
                                } catch (playErr) {
                                    logger.warn(`[Music] Retry play failed for ${key}:`, playErr);
                                }
                            })
                            .catch((resumeErr: Error) => {
                                // Silently handle iOS Safari audio device errors - log only in development
                                logger.log(`[Music] AudioContext resume failed in onplayerror:`, resumeErr.message);
                            });
                    }
                },
                // Note: With loop: true, onend is not called - Howler handles looping natively
                // This avoids the previous bug where we tried to crossfade a single instance to itself
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

    // Track if we suspended audio due to tab visibility or window blur (to know whether to resume)
    const pausedByVisibilityRef = useRef(false);
    const pausedByBlurRef = useRef(false);
    // Track current window focus state so new music doesn't start when window is blurred
    const windowFocusedRef = useRef(typeof document !== 'undefined' ? document.hasFocus() : true);

    // Helper to suspend all audio (used by both visibility and blur handlers)
    // Uses Web Audio API context suspension - the most reliable way to stop all audio
    // Also pauses current Howl as fallback for browsers where context suspension doesn't work
    const suspendAudio = useCallback((reason: string) => {
        let suspended = false;

        // Try to suspend AudioContext
        if (Howler.ctx && Howler.ctx.state === 'running') {
            Howler.ctx.suspend();
            logger.log(`[Music] ${reason} - suspended AudioContext`);
            suspended = true;
        }

        // Also pause the current Howl instance as a fallback
        // This ensures audio stops even if AudioContext suspension doesn't work
        if (currentHowlRef.current && currentHowlRef.current.playing()) {
            currentHowlRef.current.pause();
            logger.log(`[Music] ${reason} - paused current Howl`);
            suspended = true;
        }

        return suspended;
    }, []);

    // Helper to resume all audio
    // Resumes AudioContext and also explicitly plays paused Howl instance
    const resumeAudio = useCallback((reason: string) => {
        // Resume AudioContext - wrap in try-catch for iOS Safari errors
        // iOS Safari can throw "InvalidStateError: Failed to start the audio device"
        if (Howler.ctx && Howler.ctx.state === 'suspended' && audioUnlockedRef.current) {
            try {
                // Note: resume() returns a Promise on some browsers
                const result = Howler.ctx.resume();
                if (result && typeof result.catch === 'function') {
                    result.catch((err: Error) => {
                        // Silently handle iOS Safari audio device errors - log only in development
                        // These occur when the device can't start audio (e.g., silent mode, bluetooth issues)
                        logger.log(`[Music] ${reason} - AudioContext resume failed:`, err.message);
                    });
                }
                logger.log(`[Music] ${reason} - resumed AudioContext`);
            } catch (err) {
                // Log only in development - expected errors on iOS Safari
                logger.log(`[Music] ${reason} - AudioContext resume error:`, err);
            }
        }

        // CRITICAL: Stop all tracks except the current one to prevent multiple tracks playing
        // This ensures only the intended track resumes, not any stale paused tracks
        const currentKey = currentTrackRef.current;
        Object.entries(howlsRef.current).forEach(([key, howl]) => {
            if (key !== currentKey) {
                howl.stop();
            }
        });

        // Resume the current Howl instance if it was paused
        // This handles cases where we paused via Howl.pause() in suspendAudio
        if (currentHowlRef.current && !currentHowlRef.current.playing() && currentTrackRef.current) {
            try {
                const targetVolume = isMutedRef.current ? 0 : volumeRef.current;
                const currentHowl = currentHowlRef.current;

                // Set volume before playing to ensure it starts at correct level
                currentHowl.volume(targetVolume);
                currentHowl.play();
                logger.log(`[Music] ${reason} - resumed current Howl at volume`, targetVolume);

                // Double-check volume is correct after a short delay
                // Some browsers reset volume when resuming from suspended state
                setTimeout(() => {
                    if (currentHowlRef.current === currentHowl && currentHowl.playing()) {
                        const actualVol = currentHowl.volume();
                        const expectedVol = isMutedRef.current ? 0 : volumeRef.current;
                        if (Math.abs(actualVol - expectedVol) > 0.05) {
                            logger.log(`[Music] ${reason} - correcting volume from`, actualVol, 'to', expectedVol);
                            currentHowl.volume(expectedVol);
                        }
                    }
                }, 100);
            } catch (err) {
                // Silently handle play errors (iOS can throw InvalidStateError) - log only in development
                logger.log(`[Music] ${reason} - Howl play error:`, err);
            }
        }
    }, []);

    // Handle tab visibility - pause music when hidden, resume when visible
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                // Always mark as paused by visibility when tab is hidden
                // This ensures we resume correctly even if suspend was a no-op
                suspendAudio('Tab hidden');
                pausedByVisibilityRef.current = true;
            } else if (document.visibilityState === 'visible') {
                // Resume playback if we paused due to visibility
                if (pausedByVisibilityRef.current) {
                    resumeAudio('Tab visible');
                    pausedByVisibilityRef.current = false;
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [suspendAudio, resumeAudio]);

    // Handle window focus/blur using polling - more reliable than blur/focus events
    // PERFORMANCE: Only poll when music is playing, use longer interval (1000ms vs 200ms)
    useEffect(() => {
        if (typeof window === 'undefined') return;

        // Poll document.hasFocus() to detect when window loses/gains focus
        const checkFocus = () => {
            const hasFocus = document.hasFocus();

            // Only act if focus state changed and tab is visible
            if (document.visibilityState !== 'visible') return;

            if (!hasFocus && windowFocusedRef.current) {
                // Window just lost focus
                windowFocusedRef.current = false;
                // Always mark as paused when focus is lost
                suspendAudio('Window blur (polling)');
                pausedByBlurRef.current = true;
            } else if (hasFocus && !windowFocusedRef.current) {
                // Window just gained focus
                windowFocusedRef.current = true;
                if (pausedByBlurRef.current) {
                    resumeAudio('Window focus (polling)');
                    pausedByBlurRef.current = false;
                }
            }
        };

        // PERFORMANCE: Check every 1000ms instead of 200ms - focus detection doesn't need high precision
        // Also, only start polling when music is playing to save CPU when idle
        const intervalId = setInterval(checkFocus, 1000);

        // Also listen to blur/focus events as a faster response (but polling is backup)
        const handleBlur = () => {
            windowFocusedRef.current = false;
            if (document.visibilityState === 'visible') {
                // Always mark as paused by blur when window loses focus
                // This ensures we resume correctly even if suspend was a no-op
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

        window.addEventListener('blur', handleBlur);
        window.addEventListener('focus', handleFocus);

        return () => {
            clearInterval(intervalId);
            window.removeEventListener('blur', handleBlur);
            window.removeEventListener('focus', handleFocus);
        };
    }, [suspendAudio, resumeAudio]);

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

    // Queue for track requests made before audio is unlocked
    // MUST be declared before unlockAudio since it references this ref
    const pendingUnlockTrackRef = useRef<PendingTrack | null>(null);

    // Ref to track the pending unlock timeout so we can cancel it if needed
    const pendingUnlockTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Ref to hold fadeToTrack for recursive calls
    const fadeToTrackRef = useRef<((trackKey: TrackKey, fadeOutMs?: number, fadeInMs?: number) => void) | null>(null);

    // Explicitly unlock audio - called when user clicks play buttons or the speaker icon
    // Also processes any pending track requests that were queued before audio was unlocked
    // Auto-unmutes if previously muted, since explicit user action implies they want to hear audio
    const unlockAudio = useCallback(() => {
        if (audioUnlockedRef.current) return;

        logger.log('[Music] unlockAudio called, unlocking audio...');

        // Resume AudioContext for iOS Safari - wrap in try-catch for device errors
        if (Howler.ctx && Howler.ctx.state === 'suspended') {
            try {
                const result = Howler.ctx.resume();
                if (result && typeof result.catch === 'function') {
                    result.catch((err: Error) => {
                        // Log only in development - expected iOS Safari audio device errors
                        logger.log('[Music] unlockAudio - AudioContext resume failed:', err.message);
                    });
                }
            } catch (err) {
                // Log only in development - expected iOS Safari audio device errors
                logger.log('[Music] unlockAudio - AudioContext error:', err);
            }
        }

        // NOTE: Auto-unmute is handled in fadeToTrack() when music actually starts,
        // not here. unlockAudio() can be called from various places (mute button clicks,
        // any user interaction), and we only want to auto-unmute when starting game music.

        audioUnlockedRef.current = true;
        setAudioUnlocked(true);

        // Process any pending track request immediately (same as handleFirstInteraction)
        // This ensures music plays when unlockAudio is called explicitly (e.g., in DailyChallenge)
        if (pendingUnlockTrackRef.current) {
            const { trackKey, fadeOutMs, fadeInMs } = pendingUnlockTrackRef.current;
            pendingUnlockTrackRef.current = null;
            logger.log('[Music] unlockAudio - Playing pending track:', trackKey);
            // Small delay to ensure AudioContext is fully ready
            pendingUnlockTimeoutRef.current = setTimeout(() => {
                pendingUnlockTimeoutRef.current = null;
                fadeToTrackRef.current?.(trackKey, fadeOutMs, fadeInMs);
            }, 100);
        }
    }, []);

    // Queue for pending track requests during transitions
    const pendingTrackRef = useRef<PendingTrack | null>(null);
    const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Crossfade to a new track - MUST be defined before useEffects that reference it
    const fadeToTrack = useCallback(async (trackKey: TrackKey, fadeOutMs = 1000, fadeInMs = 1000) => {
        if (!trackKey) return;

        logger.log('[Music] fadeToTrack called:', trackKey, 'audioUnlocked:', audioUnlockedRef.current);

        // If audio not yet unlocked, queue the track request for when it gets unlocked
        if (!audioUnlockedRef.current) {
            logger.log('[Music] Audio not unlocked, queueing track:', trackKey);
            pendingUnlockTrackRef.current = { trackKey, fadeOutMs, fadeInMs };
            return;
        }

        // Cancel any pending unlock timeout since we're now playing a new track
        // This prevents the old pending track from overriding the new one
        if (pendingUnlockTimeoutRef.current) {
            clearTimeout(pendingUnlockTimeoutRef.current);
            pendingUnlockTimeoutRef.current = null;
            logger.log('[Music] Cancelled pending unlock timeout for new track:', trackKey);
        }

        const newHowl = howlsRef.current[trackKey];
        if (!newHowl) {
            logger.warn(`[Music] Track not found: ${trackKey}`);
            return;
        }

        // Preload the track on-demand if not loaded yet
        // CRITICAL for iOS Safari: Don't await preload - call play() synchronously
        // Howler.js with html5: true queues play() calls and plays when loaded
        // Awaiting would break the user gesture chain on iOS Safari
        if (newHowl.state() === 'unloaded') {
            logger.log('[Music] Track not loaded, starting load:', trackKey);
            newHowl.load();
            // Don't await - continue to play() call which Howler queues
        } else if (newHowl.state() === 'loading') {
            logger.log('[Music] Track currently loading:', trackKey);
            // Don't await - continue to play() call which Howler queues
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

        // Auto-unmute when starting music (user initiated fadeToTrack implies they want audio)
        // This fixes the bug where music plays silently because isMuted was persisted
        // from a previous session. When game music starts, user expects to hear it.
        if (isMutedRef.current) {
            logger.log('[Music] fadeToTrack - Auto-unmuting (music start implies audio expected)');
            isMutedRef.current = false;
            setIsMuted(false);
        }

        const targetVolume = isMutedRef.current ? 0 : volumeRef.current;

        // CRITICAL: Stop ALL other tracks to ensure only one music track plays at a time
        // This handles edge cases where tracks might be paused but not stopped
        Object.entries(howlsRef.current).forEach(([key, howl]) => {
            if (key !== trackKey) {
                if (howl.playing()) {
                    // Fade out if playing (for crossfade effect)
                    howl.fade(howl.volume(), 0, fadeOutMs);
                    setTimeout(() => howl.stop(), fadeOutMs);
                } else {
                    // Stop immediately if paused (to prevent resurrection)
                    howl.stop();
                }
            }
        });

        // Also handle the tracked old howl (in case it wasn't in the loop)
        if (oldHowl && oldHowl !== newHowl && !oldHowl.playing()) {
            // Old track is paused - stop it immediately to prevent it from resuming
            oldHowl.stop();
        }

        // Start and fade in new track
        newHowl.volume(0);
        logger.log('[Music] Starting playback:', trackKey, 'target volume:', targetVolume);
        newHowl.play();

        // If window is not focused or tab is hidden, immediately pause and mark for restoration
        const isTabHidden = typeof document !== 'undefined' && document.visibilityState === 'hidden';
        if (!windowFocusedRef.current || isTabHidden) {
            logger.log('[Music] Window not focused or tab hidden, pausing immediately');
            newHowl.pause();
            if (isTabHidden) {
                pausedByVisibilityRef.current = true;
            } else {
                pausedByBlurRef.current = true;
            }
        } else {
            newHowl.fade(0, targetVolume, fadeInMs);

            // FALLBACK: Ensure volume is set correctly after fade completes
            // Some browsers (especially mobile) may not properly execute fades
            // This ensures the volume reaches the target even if fade fails
            fadeTimeoutRef.current = setTimeout(() => {
                if (currentHowlRef.current === newHowl && newHowl.playing()) {
                    const currentVol = newHowl.volume();
                    const expectedVol = isMutedRef.current ? 0 : volumeRef.current;
                    // Only fix if volume is significantly wrong (not just slightly off from fade)
                    if (Math.abs(currentVol - expectedVol) > 0.1) {
                        logger.log('[Music] Fade fallback - correcting volume from', currentVol, 'to', expectedVol);
                        newHowl.volume(expectedVol);
                    }
                }
            }, fadeInMs + 100); // Check shortly after fade should complete
        }

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

            // NOTE: We do NOT auto-unmute here. Auto-unmute only happens in unlockAudio()
            // which is called explicitly when starting a game. handleFirstInteraction can
            // trigger on any click (including mute button clicks), so we don't want to
            // interfere with the user's mute preference here.

            // Update ref immediately so fadeToTrack works in the same event cycle
            audioUnlockedRef.current = true;
            setAudioUnlocked(true);

            // Process any pending track request immediately (don't wait for React re-render)
            // CRITICAL: Must call play() synchronously within user gesture for iOS Safari
            // Any setTimeout or await will break the user gesture chain and prevent autoplay
            if (pendingUnlockTrackRef.current) {
                const { trackKey, fadeOutMs, fadeInMs } = pendingUnlockTrackRef.current;
                pendingUnlockTrackRef.current = null;
                logger.log('[Music] Playing pending track:', trackKey);

                // Pre-load the track synchronously if needed, then play immediately
                const pendingHowl = howlsRef.current[trackKey];
                if (pendingHowl && pendingHowl.state() === 'unloaded') {
                    // Load the track - this starts loading but doesn't block
                    pendingHowl.load();
                    // Play once loaded - Howler queues play() calls made before load completes
                    // This maintains the user gesture chain because play() is called synchronously
                    logger.log('[Music] Track not loaded, loading and playing:', trackKey);
                }

                // Call fadeToTrack immediately - no setTimeout
                // The AudioContext.resume() above has already completed
                fadeToTrack(trackKey, fadeOutMs, fadeInMs);
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

    // BACKUP: Process pending track requests when audio gets unlocked via React state change
    // This is a safety net in case the inline processing in handleFirstInteraction or unlockAudio
    // fails to play the pending track (e.g., due to timing issues or race conditions).
    // The inline processing should handle most cases, but this useEffect catches edge cases.
    useEffect(() => {
        if (audioUnlocked && pendingUnlockTrackRef.current) {
            const { trackKey, fadeOutMs, fadeInMs } = pendingUnlockTrackRef.current;
            pendingUnlockTrackRef.current = null;
            logger.log('[Music] useEffect backup - Playing pending track:', trackKey);
            // Small delay to ensure AudioContext is fully resumed
            setTimeout(() => {
                fadeToTrack(trackKey, fadeOutMs, fadeInMs);
            }, 50);
        }
    }, [audioUnlocked, fadeToTrack]);

    // Stop music with fade out
    const stopMusic = useCallback((fadeOutMs = 1000) => {
        // CRITICAL: Stop ALL tracks to ensure nothing continues playing
        Object.values(howlsRef.current).forEach(howl => {
            if (howl.playing()) {
                howl.fade(howl.volume(), 0, fadeOutMs);
                setTimeout(() => howl.stop(), fadeOutMs);
            } else {
                // Stop immediately if paused
                howl.stop();
            }
        });

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

    // Toggle mute - uses volumeRef to avoid dependency on volume state
    // Synchronously updates isMutedRef BEFORE state so other event handlers see the new value immediately
    const toggleMute = useCallback(() => {
        // Calculate new muted value from ref (which is always in sync with state via useEffect)
        const newMuted = !isMutedRef.current;
        // Update ref FIRST, synchronously, so handleFirstInteraction sees it
        isMutedRef.current = newMuted;

        // Then update state (async)
        setIsMuted(newMuted);

        // Update Howl volume immediately
        if (currentHowlRef.current) {
            if (newMuted) {
                currentHowlRef.current.volume(0);
            } else {
                currentHowlRef.current.volume(volumeRef.current);
            }
        }
    }, []);

    // Update volume when mute state changes and we have an active track
    useEffect(() => {
        if (currentHowlRef.current) {
            currentHowlRef.current.volume(isMuted ? 0 : volume);
        }
    }, [isMuted, volume]);

    // Preload a specific music track (for eager loading, e.g., in game lobby)
    const preloadMusicTrack = useCallback(async (trackKey: TrackKey) => {
        const howl = howlsRef.current[trackKey];
        if (!howl) {
            logger.warn(`[Music] Cannot preload track: ${trackKey} not found`);
            return;
        }

        if (howl.state() === 'unloaded') {
            logger.log('[Music] Preloading track:', trackKey);
            try {
                await preloadAudioOnDemand(howl);
                logger.log('[Music] Track preloaded successfully:', trackKey);
            } catch (err) {
                logger.warn('[Music] Failed to preload track:', trackKey, err);
            }
        } else {
            logger.log('[Music] Track already loaded:', trackKey);
        }
    }, []);

    // Memoize TRACKS object to prevent recreation on every render
    const TRACKS_CONST = useMemo(() => ({
        LOBBY: 'lobby' as const,
        BEFORE_GAME: 'beforeGame' as const,
        IN_GAME: 'inGame' as const,
        ALMOST_OUT_OF_TIME: 'almostOutOfTime' as const,
        BOSSA_ARCADE: 'bossaArcade' as const,
        BOSSA: 'bossa' as const,
    }), []);

    // Memoize context value to prevent unnecessary re-renders of all consumers
    const value = useMemo<MusicContextType>(() => ({
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
        preloadMusicTrack,

        // Track keys for convenience
        TRACKS: TRACKS_CONST,
    }), [
        currentTrack,
        volume,
        isMuted,
        isPlaying,
        audioUnlocked,
        playTrack,
        stopMusic,
        fadeToTrack,
        setVolume,
        toggleMute,
        unlockAudio,
        preloadMusicTrack,
        TRACKS_CONST,
    ]);

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
