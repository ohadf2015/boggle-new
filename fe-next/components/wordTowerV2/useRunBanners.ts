'use client';

import { type MutableRefObject, useCallback, useRef, useState } from 'react';
import type { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { type RunStats, newlyUnlocked, saveUnlocked } from '@/lib/wordTowerV2/achievements';
import { BANNER_PRIORITY, type Banner, type BannerKind, pushBanner } from '@/lib/wordTowerV2/celebrations';

type PlaySound = ReturnType<typeof useSoundEffects>['playSound'];

/** The run's banner queue and the badges it unlocks. */
export function useRunBanners(statsRef: MutableRefObject<RunStats>, unlockedRef: MutableRefObject<Set<string>>, playSound: PlaySound) {
  const bannerKeyRef = useRef(0);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [runBadges, setRunBadges] = useState<string[]>([]);

  const banner = useCallback((kind: BannerKind, id: string) => {
    bannerKeyRef.current += 1;
    const key = bannerKeyRef.current;
    setBanners((q) => pushBanner(q, { key, kind, id, priority: BANNER_PRIORITY[kind] }));
  }, []);

  const shiftBanner = useCallback(() => setBanners((q) => q.slice(1)), []);

  const checkBadges = useCallback(() => {
    const fresh = newlyUnlocked(statsRef.current, unlockedRef.current);
    if (fresh.length === 0) return;
    for (const id of fresh) {
      unlockedRef.current.add(id);
      banner('achievement', id);
    }
    saveUnlocked(unlockedRef.current);
    setRunBadges((b) => [...b, ...fresh]);
    playSound('achievement');
  }, [banner, playSound, statsRef, unlockedRef]);

  return { banners, setBanners, runBadges, setRunBadges, banner, shiftBanner, checkBadges };
}
