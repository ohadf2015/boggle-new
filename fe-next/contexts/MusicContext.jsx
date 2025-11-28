'use client';

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { Howl, Howler } from 'howler';

const MusicContext = createContext(null);

const TRACKS = {
    lobby: '/music/in_lobby.mp3',
    beforeGame: '/music/before_game.mp3',
    inGame: '/music/in_game.mp3',
    almostOutOfTime: '/music/almost_out_of_time.mp3',
};

const STORAGE_KEY = 'boggle_music_settings';

export function MusicProvider({ children }) {
    // Load persisted settings
    const [volume, setVolumeState] = useState(() => {
        if (typeof window !== 'undefined') {
            try {
                const saved = localStorage.getItem(STORAGE_KEY);
                if (saved) {
                    const { volume } = JSON.parse(saved);
                    return volume ?? 0.5;
                }
            } catch (e) {
                console.warn('Failed to load music settings:', e);
            }
        }
        return 0.5;
    });

    const [isMuted, setIsMuted] = useState(() => {
        if (typeof window !== 'undefined') {
            try {
                const saved = localStorage.getItem(STORAGE_KEY);
                if (saved) {
                    const { isMuted } = JSON.parse(saved);
                    return isMuted ?? false;
                }
            } catch (e) {
                console.warn('Failed to load music settings:', e);
            }
        }
        return false;
    });

    const [currentTrack, setCurrentTrack] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    // audioUnlocked is session-based, NOT persisted to localStorage
    // Browser AudioContext resets between sessions, so we must always start locked
    const [audioUnlocked, setAudioUnlocked] = useState(false);

    // Ref to track audioUnlocked state without causing re-renders
    const audioUnlockedRef = useRef(false);

    // Howl instances ref - one per track for seamless transitions
    const howlsRef = useRef({});
    const currentHowlRef = useRef(null);
    const fadeTimeoutRef = useRef(null);
    const currentTrackRef = useRef(null);
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
            howlsRef.current[key] = new Howl({
                src: [src],
                loop: true,
                volume: 0,
                preload: true,
                html5: true, // Better for mobile and large files
            });
        });

        return () => {
            // Cleanup on unmount
            Object.values(howlsRef.current).forEach(howl => {
                howl.unload();
            });
            if (fadeTimeoutRef.current) {
                clearTimeout(fadeTimeoutRef.current);
            }
            // Note: transitionTimeoutRef cleanup is in the useCallback scope
        };
    }, []);

    // Handle iOS Safari tab switching - re-resume AudioContext when returning to tab
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && audioUnlockedRef.current) {
                if (Howler.ctx && Howler.ctx.state === 'suspended') {
                    Howler.ctx.resume();
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
                console.warn('Failed to save music settings:', e);
            }
        }
    }, [volume, isMuted]);

    // Auto-unlock audio on first user interaction anywhere in the app
    useEffect(() => {
        if (typeof window === 'undefined' || audioUnlocked) return;

        const handleFirstInteraction = () => {
            if (audioUnlockedRef.current) return;

            // Resume AudioContext for iOS Safari
            if (Howler.ctx && Howler.ctx.state === 'suspended') {
                Howler.ctx.resume();
            }

            // Update ref immediately so fadeToTrack works in the same event cycle
            audioUnlockedRef.current = true;
            setAudioUnlocked(true);

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
    }, [audioUnlocked]);

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
    const pendingTrackRef = useRef(null);
    const transitionTimeoutRef = useRef(null);

    // Queue for track requests made before audio is unlocked
    const pendingUnlockTrackRef = useRef(null);

    // Crossfade to a new track
    const fadeToTrack = useCallback((trackKey, fadeOutMs = 1000, fadeInMs = 1000) => {
        if (!trackKey) return;

        // If audio not yet unlocked, queue the track request for when it gets unlocked
        if (!audioUnlockedRef.current) {
            pendingUnlockTrackRef.current = { trackKey, fadeOutMs, fadeInMs };
            return;
        }

        const newHowl = howlsRef.current[trackKey];
        if (!newHowl) {
            console.warn(`Track not found: ${trackKey}`);
            return;
        }

        // If same track, just ensure it's playing (use ref to avoid dependency)
        if (currentTrackRef.current === trackKey && currentHowlRef.current?.playing()) {
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
                fadeToTrack(pendingTrack, pendingFadeOut, pendingFadeIn);
            }
        }, Math.max(fadeOutMs, fadeInMs));
    }, []); // Using refs instead of state to avoid stale closures

    // Play a track (with short fade)
    const playTrack = useCallback((trackKey) => {
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
    const setVolume = useCallback((newVolume) => {
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

    const value = {
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

export function useMusic() {
    const context = useContext(MusicContext);
    if (!context) {
        throw new Error('useMusic must be used within a MusicProvider');
    }
    return context;
}
