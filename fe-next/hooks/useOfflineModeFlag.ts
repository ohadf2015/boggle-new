'use client';

import { usePostHogFlag } from './usePostHogFlag';

/**
 * Activates the full offline layer (score queue, prefetch, banner, daily
 * fallback). Gated by the `offline-mode` PostHog flag so it can be ramped
 * deliberately (recommended: native-targeted, 1% → 100%) rather than flipped
 * on for everyone at once — this subsystem (Phase 0–3, well-tested but never
 * run in prod) carries real blast radius and the rollout pace is the operator's
 * call. `NEXT_PUBLIC_OFFLINE_DEV=1` forces it on for local/dev work.
 *
 * NOTE: this flag does NOT gate basic offline PLAY. NetworkStatusHandler's
 * route-aware gate keeps Blast/Connections/Daily rendering on a connection
 * drop regardless of this flag; the flag only controls score-queueing, the
 * offline banner, prefetch, and the daily offline fallback.
 */
const FLAG_KEY = 'offline-mode';

export function useOfflineModeFlag(): boolean {
  const remote = usePostHogFlag<boolean>(FLAG_KEY, false);
  const devOverride = process.env.NEXT_PUBLIC_OFFLINE_DEV === '1';
  return devOverride || remote === true;
}
