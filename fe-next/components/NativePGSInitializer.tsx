'use client';

import { useEffect } from 'react';
import { isAndroid } from '@/utils/platform';
import { initializePlayGames, signInPlayGames } from '@/utils/nativePGS';
import logger from '@/utils/logger';

/**
 * NativePGSInitializer
 *
 * Warms the Android-only Play Games Services bridge on app start AND attempts a
 * best-effort sign-in. PGS v2 sign-in is silent/automatic for returning
 * (consented) players; only the very first launch shows Google's one-time
 * consent. Sign-in is the prerequisite for the award path — without a Games
 * session `submitScore` / `unlockAchievement` no-op on device — so we trigger it
 * here rather than leaving the integration inert until the user happens to open
 * the profile card.
 *
 * Auth orthogonality is preserved: a Games-scoped sign-in does NOT touch the
 * Supabase identity session — no tokens are routed between the two surfaces.
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
        if (!ready) return;
        // ponytail: fire-and-forget; signInPlayGames swallows errors/cancellation
        // and caches the result for PlayGamesCard. First launch = one consent prompt.
        return signInPlayGames().then((res) => {
          logger.log('[NativePGSInitializer] Play Games sign-in', res.success ? 'ok' : 'skipped');
        });
      })
      .catch((error) => {
        logger.debug('[NativePGSInitializer] Failed to initialize:', error);
      });
  }, []);

  return null;
}
