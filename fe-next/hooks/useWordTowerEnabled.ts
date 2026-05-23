'use client';

import { useMemo } from 'react';
import { usePostHogFlag } from './usePostHogFlag';
import { WORD_TOWER_GAME_FLAG, resolveWordTowerEnabled } from '@/lib/wordTower/flags';

/**
 * Whether the Word Tower game is enabled for this user. The whole mode is gated
 * behind one PostHog flag (`word-tower`), with a `?word-tower=1|0` URL override
 * that wins for live-verify. Admin access is handled separately at the route.
 */
export function useWordTowerEnabled(): boolean {
  const flag = usePostHogFlag<boolean>(WORD_TOWER_GAME_FLAG.key, WORD_TOWER_GAME_FLAG.default);
  return useMemo(() => {
    const search = typeof window !== 'undefined' ? window.location.search : '';
    return resolveWordTowerEnabled(flag, search);
  }, [flag]);
}
