/**
 * Lazy Audio Loading Utilities for CrazyGames Portal Integration
 *
 * Purpose: Defer all audio loading until user interaction or explicit preload call.
 * Reduces initial download from 57MB (music) to near-zero bytes on initial page load.
 *
 * CrazyGames requirement: Initial download <50MB (ideally <20MB for mobile homepage)
 */

import { Howl, HowlOptions } from 'howler';
import logger from '@/utils/logger';

/**
 * Priority levels for progressive audio loading
 */
export enum AUDIO_LOAD_PRIORITY {
  /** Core game sounds (word accepted, invalid) - load first on user interaction */
  CRITICAL = 0,
  /** Common gameplay sounds (combo, timer warning) - load during idle time */
  HIGH = 1,
  /** Background music - load on-demand when needed */
  NORMAL = 2,
  /** Rare sounds (achievements, earthquake) - load only when triggered */
  LOW = 3,
}

/**
 * Create a lazy-loading Howl instance
 *
 * Always sets preload: false and html5: true to prevent automatic loading
 * and enable streaming (reduces memory footprint).
 *
 * @param src - Audio file path(s)
 * @param options - Optional Howl configuration (volume, loop, etc.)
 * @returns Configured Howl instance (not yet loaded)
 *
 * @example
 * const bgMusic = createLazyHowl('/music/background.mp3', { loop: true, volume: 0.5 });
 * // Audio not loaded yet - zero bytes downloaded
 *
 * // Later, when needed:
 * await preloadAudioOnDemand(bgMusic);
 * bgMusic.play();
 */
export function createLazyHowl(
  src: string | string[],
  options?: Partial<HowlOptions>
): Howl {
  return new Howl({
    src: Array.isArray(src) ? src : [src],
    preload: false, // CRITICAL: Prevent automatic loading
    html5: true, // Enable streaming, reduces memory footprint
    ...options, // Allow volume, loop, etc. overrides
  });
}

/**
 * Preload audio on-demand
 *
 * Safe to call multiple times (no-op if already loaded).
 * Returns promise that resolves when audio is ready to play.
 *
 * @param howl - Howl instance to preload
 * @returns Promise that resolves when loaded or rejects on error
 *
 * @example
 * const sound = createLazyHowl('/sounds/effect.mp3');
 *
 * // Load when needed:
 * await preloadAudioOnDemand(sound);
 * sound.play();
 */
export function preloadAudioOnDemand(howl: Howl): Promise<void> {
  return new Promise((resolve, reject) => {
    // Already loaded - no-op
    if (howl.state() === 'loaded') {
      resolve();
      return;
    }

    // Currently loading - wait for it
    if (howl.state() === 'loading') {
      howl.once('load', () => resolve());
      howl.once('loaderror', (_id, err) => reject(new Error(String(err))));
      return;
    }

    // Not loaded yet - start loading
    howl.once('load', () => {
      logger.log('[AudioLoader] Preloaded audio successfully');
      resolve();
    });

    howl.once('loaderror', (_id, err) => {
      logger.warn('[AudioLoader] Failed to preload audio:', err);
      reject(new Error(String(err)));
    });

    howl.load();
  });
}

/**
 * Preload multiple sounds by priority level
 *
 * Used for progressive loading - load CRITICAL sounds on first interaction,
 * then HIGH priority during idle time, etc.
 *
 * @param sounds - Map of sound key to Howl instance
 * @param priorities - Map of sound key to priority level
 * @param priority - Priority level to load
 * @returns Promise that resolves when all sounds of the priority are loaded
 *
 * @example
 * const sounds = new Map([
 *   ['wordAccepted', createLazyHowl('/sounds/word.wav')],
 *   ['combo', createLazyHowl('/sounds/combo.wav')],
 * ]);
 *
 * const priorities = new Map([
 *   ['wordAccepted', AUDIO_LOAD_PRIORITY.CRITICAL],
 *   ['combo', AUDIO_LOAD_PRIORITY.HIGH],
 * ]);
 *
 * // Load critical sounds first:
 * await preloadByPriority(sounds, priorities, AUDIO_LOAD_PRIORITY.CRITICAL);
 *
 * // Later, during idle time:
 * await preloadByPriority(sounds, priorities, AUDIO_LOAD_PRIORITY.HIGH);
 */
export async function preloadByPriority(
  sounds: Map<string, Howl>,
  priorities: Map<string, AUDIO_LOAD_PRIORITY>,
  priority: AUDIO_LOAD_PRIORITY
): Promise<void> {
  const soundsToLoad: Array<{ key: string; howl: Howl }> = [];

  // Find all sounds matching the priority
  sounds.forEach((howl, key) => {
    if (priorities.get(key) === priority) {
      soundsToLoad.push({ key, howl });
    }
  });

  if (soundsToLoad.length === 0) {
    logger.log(`[AudioLoader] No sounds to load for priority ${priority}`);
    return;
  }

  logger.log(`[AudioLoader] Loading ${soundsToLoad.length} sounds at priority ${priority}`);

  // Load all sounds in parallel
  const loadPromises = soundsToLoad.map(({ key, howl }) =>
    preloadAudioOnDemand(howl).catch(err => {
      logger.warn(`[AudioLoader] Failed to load ${key}:`, err);
      // Don't fail the entire batch if one sound fails
      return Promise.resolve();
    })
  );

  await Promise.all(loadPromises);
  logger.log(`[AudioLoader] Finished loading priority ${priority} sounds`);
}
