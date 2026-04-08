'use client';

/**
 * useAdaptiveMusic — React hook wrapping AdaptiveMusicEngine.
 *
 * Provides a simple interface to start/stop adaptive music and
 * respond to game state changes (intensity, phase).
 * Tone.js is lazy-loaded only when `start()` is called.
 *
 * @example
 * ```tsx
 * const { start, setIntensity, setGamePhase } = useAdaptiveMusic();
 * // Start on user interaction
 * <button onClick={start}>Play</button>
 * // Respond to game state
 * useEffect(() => { setIntensity(comboLevel > 5 ? 'climax' : 'building'); }, [comboLevel]);
 * ```
 */

import { useRef, useCallback, useEffect } from 'react';
import {
  AdaptiveMusicEngine,
  type MusicIntensity,
  type GamePhase,
  type AdaptiveMusicConfig,
} from '@/lib/audio/adaptiveMusicEngine';

interface UseAdaptiveMusicOptions {
  /** Custom engine config (layers, BPM, cutoffs) */
  config?: Partial<AdaptiveMusicConfig>;
  /** Auto-start on mount (requires prior user gesture for AudioContext) */
  autoStart?: boolean;
}

export function useAdaptiveMusic(options: UseAdaptiveMusicOptions = {}) {
  const engineRef = useRef<AdaptiveMusicEngine | null>(null);

  // Stable engine getter
  const getEngine = useCallback(() => {
    if (!engineRef.current) {
      engineRef.current = new AdaptiveMusicEngine(options.config);
    }
    return engineRef.current;
  }, [options.config]);

  const start = useCallback(async () => {
    await getEngine().start();
  }, [getEngine]);

  const stop = useCallback(() => {
    engineRef.current?.stop();
  }, []);

  const pause = useCallback(() => {
    engineRef.current?.pause();
  }, []);

  const resume = useCallback(() => {
    engineRef.current?.resume();
  }, []);

  const setIntensity = useCallback((level: MusicIntensity) => {
    engineRef.current?.setIntensity(level);
  }, []);

  const setGamePhase = useCallback((phase: GamePhase) => {
    engineRef.current?.setGamePhase(phase);
  }, []);

  const setVolume = useCallback((vol: number) => {
    engineRef.current?.setVolume(vol);
  }, []);

  // Auto-start if requested
  useEffect(() => {
    if (options.autoStart) {
      start();
    }
  }, [options.autoStart, start]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, []);

  return {
    start,
    stop,
    pause,
    resume,
    setIntensity,
    setGamePhase,
    setVolume,
    get isPlaying() {
      return engineRef.current?.isPlaying ?? false;
    },
  };
}

export type { MusicIntensity, GamePhase, AdaptiveMusicConfig };
