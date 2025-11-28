'use client';

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { Howl } from 'howler';

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
    const [audioUnlocked, setAudioUnlocked] = useState(false);

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
        };
    }, []);

    // Persist settings to localStorage
    useEffect(() => {
        if (typeof window !== 'undefined') {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify({ volume, isMuted }));
            } catch (e) {
                console.warn('Failed to save music settings:', e);
            }
        }
    }, [volume, isMuted]);

    // Handle browser autoplay - unlock on first user interaction
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const handleInteraction = () => {
            if (!audioUnlocked) {
                setAudioUnlocked(true);
            }
            document.removeEventListener('click', handleInteraction);
            document.removeEventListener('touchstart', handleInteraction);
            document.removeEventListener('keydown', handleInteraction);
        };

        document.addEventListener('click', handleInteraction);
        document.addEventListener('touchstart', handleInteraction);
        document.addEventListener('keydown', handleInteraction);

        return () => {
            document.removeEventListener('click', handleInteraction);
            document.removeEventListener('touchstart', handleInteraction);
            document.removeEventListener('keydown', handleInteraction);
        };
    }, [audioUnlocked]);

    // Crossfade to a new track
    const fadeToTrack = useCallback((trackKey, fadeOutMs = 1000, fadeInMs = 1000) => {
        if (!audioUnlocked || !trackKey) return;

        const newHowl = howlsRef.current[trackKey];
        if (!newHowl) {
            console.warn(`Track not found: ${trackKey}`);
            return;
        }

        // If same track, just ensure it's playing (use ref to avoid dependency)
        if (currentTrackRef.current === trackKey && currentHowlRef.current?.playing()) {
            return;
        }

        // Prevent rapid track switching - ignore requests during active transition
        if (isTransitioningRef.current) {
            return;
        }
        isTransitioningRef.current = true;

        // Clear any pending fade
        if (fadeTimeoutRef.current) {
            clearTimeout(fadeTimeoutRef.current);
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

        // Clear transition lock after fade completes
        setTimeout(() => {
            isTransitioningRef.current = false;
        }, Math.max(fadeOutMs, fadeInMs));
    }, [audioUnlocked]);

    // Play a track (with short fade)
    const playTrack = useCallback((trackKey) => {
        fadeToTrack(trackKey, 500, 500);
    }, [fadeToTrack]);

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
