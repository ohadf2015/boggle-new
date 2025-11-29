// Audio context for background music and sound effects
// Adapted from fe-next/contexts/MusicContext.jsx for React Native using expo-av
import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { Audio, AVPlaybackStatus } from 'expo-av';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SOUND_FILES, TRACK_KEYS as TRACK_KEY_CONSTANTS, SFX_KEYS as SFX_KEY_CONSTANTS } from './sounds';

// Track definitions - imported from sounds.ts
const TRACKS = SOUND_FILES.MUSIC;
const SOUND_EFFECTS = SOUND_FILES.SFX;

const STORAGE_KEY = 'lexiclash_audio_settings';

interface AudioSettings {
  musicVolume: number;
  sfxVolume: number;
  isMusicMuted: boolean;
  isSfxMuted: boolean;
}

interface AudioContextType {
  // State
  currentTrack: string | null;
  musicVolume: number;
  sfxVolume: number;
  isMusicMuted: boolean;
  isSfxMuted: boolean;
  isPlaying: boolean;
  isAudioReady: boolean;

  // Actions
  playTrack: (trackKey: TrackKeyType) => Promise<void>;
  fadeToTrack: (trackKey: TrackKeyType, fadeOutMs?: number, fadeInMs?: number) => Promise<void>;
  stopMusic: (fadeOutMs?: number) => Promise<void>;
  playSoundEffect: (sfxKey: SfxKeyType, options?: SfxOptions) => Promise<void>;
  playComboSound: (comboLevel: number) => Promise<void>;
  playAchievementSound: () => Promise<void>;
  playWordAcceptedSound: () => Promise<void>;
  playWordRejectedSound: () => Promise<void>;
  setMusicVolume: (volume: number) => void;
  setSfxVolume: (volume: number) => void;
  toggleMusicMute: () => void;
  toggleSfxMute: () => void;

  // Track keys
  TRACKS: typeof TRACK_KEYS;
  SFX: typeof SFX_KEYS;
}

// Use imported constants
const TRACK_KEYS = TRACK_KEY_CONSTANTS;
const SFX_KEYS = SFX_KEY_CONSTANTS;

type TrackKeyType = keyof typeof TRACKS;
type SfxKeyType = keyof typeof SOUND_EFFECTS;

interface SfxOptions {
  pitchShift?: number;
  volume?: number;
}

const AudioContext = createContext<AudioContextType | null>(null);

interface AudioProviderProps {
  children: React.ReactNode;
}

export function AudioProvider({ children }: AudioProviderProps) {
  const [currentTrack, setCurrentTrack] = useState<string | null>(null);
  const [musicVolume, setMusicVolumeState] = useState(0.5);
  const [sfxVolume, setSfxVolumeState] = useState(0.7);
  const [isMusicMuted, setIsMusicMuted] = useState(false);
  const [isSfxMuted, setIsSfxMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAudioReady, setIsAudioReady] = useState(false);

  const currentSoundRef = useRef<Audio.Sound | null>(null);
  const sfxSoundsRef = useRef<Map<string, Audio.Sound>>(new Map());
  const isTransitioningRef = useRef(false);
  const appState = useRef(AppState.currentState);
  const pendingTrackRef = useRef<{ trackKey: TrackKeyType; fadeOutMs: number; fadeInMs: number } | null>(null);

  // Load saved settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) {
          const settings: AudioSettings = JSON.parse(saved);
          setMusicVolumeState(settings.musicVolume ?? 0.5);
          setSfxVolumeState(settings.sfxVolume ?? 0.7);
          setIsMusicMuted(settings.isMusicMuted ?? false);
          setIsSfxMuted(settings.isSfxMuted ?? false);
        }
      } catch (error) {
        console.error('[Audio] Failed to load settings:', error);
      }
    };
    loadSettings();
  }, []);

  // Save settings when they change
  useEffect(() => {
    const saveSettings = async () => {
      try {
        const settings: AudioSettings = {
          musicVolume,
          sfxVolume,
          isMusicMuted,
          isSfxMuted,
        };
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      } catch (error) {
        console.error('[Audio] Failed to save settings:', error);
      }
    };
    saveSettings();
  }, [musicVolume, sfxVolume, isMusicMuted, isSfxMuted]);

  // Configure audio mode for background playback
  useEffect(() => {
    const setupAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: true,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
        setIsAudioReady(true);
        console.log('[Audio] Audio system initialized successfully');
      } catch (error) {
        console.error('[Audio] Failed to configure audio mode:', error);
        setIsAudioReady(false);
      }
    };
    setupAudio();
  }, []);

  // Handle app state changes (pause/resume when backgrounded)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // App came to foreground - resume if we were playing
        console.log('[Audio] App returning to foreground');
        if (currentSoundRef.current && isPlaying) {
          try {
            const status = await currentSoundRef.current.getStatusAsync();
            if (status.isLoaded && !status.isPlaying) {
              await currentSoundRef.current.playAsync();
            }
          } catch (error) {
            console.error('[Audio] Failed to resume on foreground:', error);
          }
        }
      } else if (nextAppState.match(/inactive|background/)) {
        // App going to background - music continues (staysActiveInBackground: true)
        console.log('[Audio] App going to background');
      }
      appState.current = nextAppState;
    });

    return () => subscription.remove();
  }, [isPlaying]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (currentSoundRef.current) {
        currentSoundRef.current.unloadAsync();
      }
      sfxSoundsRef.current.forEach((sound) => {
        sound.unloadAsync();
      });
    };
  }, []);

  // Fade volume helper
  const fadeVolume = async (
    sound: Audio.Sound,
    fromVolume: number,
    toVolume: number,
    durationMs: number
  ): Promise<void> => {
    const steps = 20;
    const stepDuration = durationMs / steps;
    const volumeStep = (toVolume - fromVolume) / steps;

    for (let i = 0; i <= steps; i++) {
      const volume = fromVolume + volumeStep * i;
      await sound.setVolumeAsync(Math.max(0, Math.min(1, volume)));
      await new Promise((resolve) => setTimeout(resolve, stepDuration));
    }
  };

  // Play a track with crossfade
  const fadeToTrack = useCallback(
    async (
      trackKey: TrackKeyType,
      fadeOutMs = 1000,
      fadeInMs = 1000
    ): Promise<void> => {
      // If transitioning, queue this request
      if (isTransitioningRef.current) {
        console.log('[Audio] Queueing track request:', trackKey);
        pendingTrackRef.current = { trackKey, fadeOutMs, fadeInMs };
        return;
      }

      // If same track is already playing, skip
      if (currentTrack === trackKey && isPlaying) {
        console.log('[Audio] Track already playing:', trackKey);
        return;
      }

      isTransitioningRef.current = true;

      try {
        const targetVolume = isMusicMuted ? 0 : musicVolume;
        console.log('[Audio] Fading to track:', trackKey, 'volume:', targetVolume);

        // Fade out current track
        if (currentSoundRef.current) {
          const status = await currentSoundRef.current.getStatusAsync();
          if (status.isLoaded && status.isPlaying) {
            await fadeVolume(currentSoundRef.current, status.volume, 0, fadeOutMs);
            await currentSoundRef.current.stopAsync();
          }
          await currentSoundRef.current.unloadAsync();
        }

        // Load and play new track
        const { sound } = await Audio.Sound.createAsync(TRACKS[trackKey], {
          isLooping: true,
          volume: 0,
        });

        currentSoundRef.current = sound;
        setCurrentTrack(trackKey as string);

        await sound.playAsync();
        setIsPlaying(true);

        // Fade in
        await fadeVolume(sound, 0, targetVolume, fadeInMs);
      } catch (error) {
        console.error('[Audio] Failed to fade to track:', error);
      } finally {
        isTransitioningRef.current = false;

        // Process pending track request if any
        if (pendingTrackRef.current) {
          const { trackKey: pendingKey, fadeOutMs: pendingFadeOut, fadeInMs: pendingFadeIn } = pendingTrackRef.current;
          pendingTrackRef.current = null;
          setTimeout(() => fadeToTrack(pendingKey, pendingFadeOut, pendingFadeIn), 100);
        }
      }
    },
    [currentTrack, isPlaying, isMusicMuted, musicVolume]
  );

  // Play track (short fade)
  const playTrack = useCallback(
    async (trackKey: TrackKeyType): Promise<void> => {
      console.log('[Audio] Play track requested:', trackKey);
      await fadeToTrack(trackKey, 500, 500);
    },
    [fadeToTrack]
  );

  // Stop music
  const stopMusic = useCallback(async (fadeOutMs = 1000): Promise<void> => {
    if (currentSoundRef.current) {
      try {
        const status = await currentSoundRef.current.getStatusAsync();
        if (status.isLoaded && status.isPlaying) {
          await fadeVolume(currentSoundRef.current, status.volume, 0, fadeOutMs);
        }
        await currentSoundRef.current.stopAsync();
        await currentSoundRef.current.unloadAsync();
      } catch (error) {
        console.error('[Audio] Failed to stop music:', error);
      }
    }
    currentSoundRef.current = null;
    setCurrentTrack(null);
    setIsPlaying(false);
  }, []);

  // Play sound effect with options
  const playSoundEffect = useCallback(
    async (sfxKey: SfxKeyType, options: SfxOptions = {}): Promise<void> => {
      if (isSfxMuted) return;

      const { pitchShift = 1, volume } = options;

      try {
        // Reuse or create sound
        let sound = sfxSoundsRef.current.get(sfxKey as string);

        if (!sound) {
          const { sound: newSound } = await Audio.Sound.createAsync(SOUND_EFFECTS[sfxKey]);
          sound = newSound;
          sfxSoundsRef.current.set(sfxKey as string, sound);
        }

        const effectiveVolume = volume !== undefined ? volume * sfxVolume : sfxVolume;
        await sound.setVolumeAsync(effectiveVolume);
        await sound.setRateAsync(pitchShift, true);
        await sound.setPositionAsync(0);
        await sound.playAsync();
      } catch (error) {
        console.error('[Audio] Failed to play sound effect:', error);
      }
    },
    [isSfxMuted, sfxVolume]
  );

  // Play combo sound with dynamic pitch based on combo level
  const playComboSound = useCallback(
    async (comboLevel: number): Promise<void> => {
      if (isSfxMuted || comboLevel < 1) return;

      // Calculate pitch: increases logarithmically with combo level
      const baseRate = 1.0;
      const pitchIncrease = Math.log2(comboLevel + 1) * 0.25;
      const pitchShift = Math.min(baseRate + pitchIncrease, 3.0); // Cap at 3x

      // Increase volume slightly with combo level
      const volumeBoost = Math.min(0.6 + comboLevel * 0.03, 1.0);

      await playSoundEffect('COMBO', { pitchShift, volume: volumeBoost });
    },
    [isSfxMuted, playSoundEffect]
  );

  // Play achievement unlock sound
  const playAchievementSound = useCallback(async (): Promise<void> => {
    await playSoundEffect('ACHIEVEMENT', { volume: 0.8 });
  }, [playSoundEffect]);

  // Play word accepted sound
  const playWordAcceptedSound = useCallback(async (): Promise<void> => {
    await playSoundEffect('WORD_ACCEPTED', { volume: 0.4 });
  }, [playSoundEffect]);

  // Play word rejected sound
  const playWordRejectedSound = useCallback(async (): Promise<void> => {
    await playSoundEffect('WORD_REJECTED', { volume: 0.4 });
  }, [playSoundEffect]);

  // Volume controls
  const setMusicVolume = useCallback((volume: number) => {
    const clamped = Math.max(0, Math.min(1, volume));
    setMusicVolumeState(clamped);
    if (currentSoundRef.current && !isMusicMuted) {
      currentSoundRef.current.setVolumeAsync(clamped);
    }
  }, [isMusicMuted]);

  const setSfxVolume = useCallback((volume: number) => {
    const clamped = Math.max(0, Math.min(1, volume));
    setSfxVolumeState(clamped);
  }, []);

  const toggleMusicMute = useCallback(() => {
    setIsMusicMuted((prev) => {
      const newMuted = !prev;
      if (currentSoundRef.current) {
        currentSoundRef.current.setVolumeAsync(newMuted ? 0 : musicVolume);
      }
      return newMuted;
    });
  }, [musicVolume]);

  const toggleSfxMute = useCallback(() => {
    setIsSfxMuted((prev) => !prev);
  }, []);

  const value: AudioContextType = {
    currentTrack,
    musicVolume,
    sfxVolume,
    isMusicMuted,
    isSfxMuted,
    isPlaying,
    isAudioReady,
    playTrack,
    fadeToTrack,
    stopMusic,
    playSoundEffect,
    playComboSound,
    playAchievementSound,
    playWordAcceptedSound,
    playWordRejectedSound,
    setMusicVolume,
    setSfxVolume,
    toggleMusicMute,
    toggleSfxMute,
    TRACKS: TRACK_KEYS,
    SFX: SFX_KEYS,
  };

  return <AudioContext.Provider value={value}>{children}</AudioContext.Provider>;
}

export function useAudio(): AudioContextType {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
}
