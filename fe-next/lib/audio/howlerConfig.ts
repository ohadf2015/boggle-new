/**
 * Global Howler.js Configuration
 * Must be imported once at app initialization
 *
 * Fixes JAVASCRIPT-NEXTJS-9J: HTML5 Audio pool exhausted
 */

import logger from '@/utils/logger';

/**
 * Configure Howler.js global settings
 * Call this once at app startup (e.g., in _app.tsx or layout.tsx)
 */
export async function initializeHowlerConfig(): Promise<void> {
  const { Howler } = await import('howler');

  // Increase HTML5 audio pool size from default 10 to 30
  // Adventure page has many concurrent sounds: ambient music, UI, game sounds
  // Fixes JAVASCRIPT-NEXTJS-9J (pool exhausted warnings)
  Howler.html5PoolSize = 30;

  // Ensure auto-unlock is enabled for mobile devices
  Howler.autoUnlock = true;

  logger.info('[Howler] Configured with html5PoolSize=30, autoUnlock=true');
}

/**
 * Get current Howler configuration (for debugging)
 */
export async function getHowlerConfig() {
  const { Howler } = await import('howler');
  return {
    html5PoolSize: Howler.html5PoolSize,
    autoUnlock: Howler.autoUnlock,
    usingWebAudio: Howler.usingWebAudio,
    noAudio: Howler.noAudio,
    audioContext: Howler.ctx ? {
      state: Howler.ctx.state,
      sampleRate: Howler.ctx.sampleRate,
    } : null,
  };
}
