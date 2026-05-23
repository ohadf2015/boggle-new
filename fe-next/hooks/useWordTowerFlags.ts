'use client';

import { useMemo } from 'react';
import { usePostHogFlag } from './usePostHogFlag';
import { WORD_TOWER_FLAGS, resolveWordTowerFlag, type WordTowerFlags } from '@/lib/wordTower/flags';

/**
 * Resolves the Word Tower mechanic flags: each new mechanic is PostHog-gated
 * (rollout / kill without a deploy), with a `?wt-*=1|0` URL override that wins so
 * the founder can live-verify on a real device. Behaviour-changing mechanics
 * (hazards) default OFF until vetted; harmless polish (tease) defaults ON.
 */
export function useWordTowerFlags(): WordTowerFlags {
  const hazards = usePostHogFlag<boolean>(WORD_TOWER_FLAGS.hazards.key, WORD_TOWER_FLAGS.hazards.default);
  const zoneTease = usePostHogFlag<boolean>(WORD_TOWER_FLAGS.zoneTease.key, WORD_TOWER_FLAGS.zoneTease.default);
  const dailyTower = usePostHogFlag<boolean>(WORD_TOWER_FLAGS.dailyTower.key, WORD_TOWER_FLAGS.dailyTower.default);

  return useMemo(() => {
    const search = typeof window !== 'undefined' ? window.location.search : '';
    return {
      hazards: resolveWordTowerFlag('hazards', hazards, search),
      zoneTease: resolveWordTowerFlag('zoneTease', zoneTease, search),
      dailyTower: resolveWordTowerFlag('dailyTower', dailyTower, search),
    };
  }, [hazards, zoneTease, dailyTower]);
}
