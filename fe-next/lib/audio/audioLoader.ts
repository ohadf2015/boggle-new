/**
 * Lazy Audio Loading Utilities for CrazyGames Portal Integration
 *
 * Purpose: Defer all audio loading until user interaction or explicit preload call.
 * Reduces initial download from 57MB (music) to near-zero bytes on initial page load.
 *
 * CrazyGames requirement: Initial download <50MB (ideally <20MB for mobile homepage)
 */

import type { Howl as HowlType, HowlOptions } from 'howler';
import logger from '@/utils/logger';

// Re-export the Howl type so consumers can reference it without importing howler directly.
export type { HowlType };

/**
 * Cached Howl constructor — populated on first call to ensureHowl().
 * Keeps the ~50 KB howler runtime out of the initial JS bundle.
 */
let _HowlCtor: (typeof import('howler'))['Howl'] | null = null;
let _howlPromise: Promise<(typeof import('howler'))['Howl']> | null = null;

/**
 * Ensure the howler module is loaded and return the Howl constructor.
 * Multiple concurrent calls share a single import() promise.
 */
export async function ensureHowl(): Promise<(typeof import('howler'))['Howl']> {
  if (_HowlCtor) return _HowlCtor;
  if (!_howlPromise) {
    _howlPromise = import('howler').then((mod) => {
      _HowlCtor = mod.Howl;
      patchHowlerRemoveEventListenerRace();
      return _HowlCtor;
    });
  }
  return _howlPromise;
}

/**
 * Patch Howler.js HTML5 audio race condition where _endTimers[id] is cleared
 * before the 'ended' event fires, causing removeEventListener to receive
 * undefined instead of a function. We wrap Audio.prototype.removeEventListener
 * to silently ignore non-function listeners (matches browser spec behavior
 * for null listeners but not undefined).
 */
function patchHowlerRemoveEventListenerRace(): void {
  if (typeof window === 'undefined') return;
  const origRemove = HTMLAudioElement.prototype.removeEventListener;
  HTMLAudioElement.prototype.removeEventListener = function (
    this: HTMLAudioElement,
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | EventListenerOptions
  ) {
    if (listener == null || typeof listener === 'number') return;
    return origRemove.call(this, type, listener, options);
  } as typeof origRemove;
}

/**
 * Return the cached Howl constructor **synchronously**.
 * Throws if howler has not been loaded yet (call ensureHowl() first in an
 * effect or event handler).
 */
function getHowlSync(): (typeof import('howler'))['Howl'] {
  if (!_HowlCtor) {
    throw new Error('[AudioLoader] Howl not loaded yet — call ensureHowl() first');
  }
  return _HowlCtor;
}

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
 * IMPORTANT: ensureHowl() must have been awaited before calling this function.
 *
 * @param src - Audio file path(s)
 * @param options - Optional Howl configuration (volume, loop, etc.)
 * @returns Configured Howl instance (not yet loaded)
 *
 * @example
 * await ensureHowl();
 * const bgMusic = createLazyHowl('/music/background.mp3', { loop: true, volume: 0.5 });
 */
export function createLazyHowl(
  src: string | string[],
  options?: Partial<HowlOptions>
): HowlType {
  const Howl = getHowlSync();
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
 */
export function preloadAudioOnDemand(howl: HowlType): Promise<void> {
  return new Promise((resolve) => {
    // Already loaded - no-op
    if (howl.state() === 'loaded') {
      resolve();
      return;
    }

    // Currently loading - wait for it
    if (howl.state() === 'loading') {
      howl.once('load', () => resolve());
      howl.once('loaderror', () => resolve()); // Gracefully degrade
      return;
    }

    // Not loaded yet - start loading
    howl.once('load', () => {
      logger.log('[AudioLoader] Preloaded audio successfully');
      resolve();
    });

    howl.once('loaderror', (_id, err) => {
      // err is typically a numeric Howler error code (e.g., 4 = MEDIA_ERR_SRC_NOT_SUPPORTED)
      logger.debug('[AudioLoader] Failed to preload audio, error code:', err);
      resolve(); // Gracefully degrade — audio is non-critical
    });

    howl.load();
  });
}

/**
 * Preload multiple sounds by priority level
 *
 * @param sounds - Map of sound key to Howl instance
 * @param priorities - Map of sound key to priority level
 * @param priority - Priority level to load
 */
export async function preloadByPriority(
  sounds: Map<string, HowlType>,
  priorities: Map<string, AUDIO_LOAD_PRIORITY>,
  priority: AUDIO_LOAD_PRIORITY
): Promise<void> {
  const soundsToLoad: Array<{ key: string; howl: HowlType }> = [];

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
