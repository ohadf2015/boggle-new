'use client';

import { useEffect } from 'react';
import { isAndroid } from '@/utils/platform';
import { initializePlayGames } from '@/utils/nativePGS';
import logger from '@/utils/logger';

/**
 * NativePGSInitializer
 *
 * Warms the Android-only Play Games Services bridge on app start so the plugin
 * is loaded before the user triggers sign-in / achievements / leaderboards.
 * Mirrors NativeOAuthInitializer. Does NOT auto-sign-in (PGS sign-in is an
 * explicit, user-triggered action kept orthogonal to the Supabase session).
 *
 * Renders nothing. No-op off Android.
 */
export default function NativePGSInitializer() {
  useEffect(() => {
    if (!isAndroid()) {
      return;
    }

    // Best-effort warm — never blocks startup. Actions lazily re-init if this fails.
    initializePlayGames()
      .then((ready) => {
        logger.log('[NativePGSInitializer] Play Games bridge', ready ? 'ready' : 'unavailable');
      })
      .catch((error) => {
        logger.debug('[NativePGSInitializer] Failed to initialize:', error);
      });
  }, []);

  return null;
}
