'use client';

import { useEffect, useState } from 'react';
import type { AvatarMood } from '@/lib/avatar/avatarMood';

/** Ms after mount: the grin lands with the first burst, the star eyes with the last stat card and the coins. */
export const HERO_CHEER_MS = { grin: 450, stars: 1300 } as const;

export function useHeroCheer(cheering: boolean, animate: boolean): AvatarMood {
  const [mood, setMood] = useState<AvatarMood>(cheering && !animate ? 'win' : 'idle');

  useEffect(() => {
    if (!cheering) {
      setMood('idle');
      return;
    }
    if (!animate) {
      setMood('win');
      return;
    }
    const grin = setTimeout(() => setMood('correct'), HERO_CHEER_MS.grin);
    const stars = setTimeout(() => setMood('win'), HERO_CHEER_MS.stars);
    return () => {
      clearTimeout(grin);
      clearTimeout(stars);
    };
  }, [cheering, animate]);

  return mood;
}
