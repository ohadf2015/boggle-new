'use client';

import { useMemo } from 'react';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';

export type KitSound =
  | 'tap' | 'flip' | 'perfect' | 'good' | 'bad' | 'burn' | 'pop' | 'splat' | 'throw'
  | 'crash' | 'wobble' | 'coin' | 'cheer' | 'giggle' | 'gasp' | 'clash' | 'drop' | 'win' | 'whoosh';

export interface KitSfx {
  play: (s: KitSound) => void;
  combo: (n: number) => void;
}

export function useKitSfx(): KitSfx {
  const sfx = useSoundEffects();
  return useMemo<KitSfx>(() => {
    const by: Record<KitSound, () => void> = {
      tap: sfx.playTileSelectSound,
      flip: () => sfx.playSound('swipeTransition'),
      perfect: sfx.playPerfectWordSound,
      good: sfx.playWordAcceptedSound,
      bad: sfx.playWordRejectedSound,
      burn: () => sfx.playSound('gagFaceplantThud'),
      pop: () => sfx.playSound('tileAppear'),
      splat: () => sfx.playSound('bubbleBurst'),
      throw: () => sfx.playSound('swipeTransition'),
      crash: () => sfx.playSound('gagTileStackCrash'),
      wobble: () => sfx.playSound('gagTileStackWobble'),
      coin: () => sfx.playCoinCollectSound(),
      cheer: () => sfx.playSound('mascotCheer'),
      giggle: () => sfx.playSound('mascotGiggle'),
      gasp: () => sfx.playSound('mascotGasp'),
      clash: () => sfx.playSound('gagBonk'),
      drop: sfx.playButtonClickSound,
      win: () => sfx.playSound('partyTada'),
      whoosh: () => sfx.playSound('swipeTransition'),
    };
    return { play: (s) => by[s](), combo: (n) => sfx.playComboSound(n) };
  }, [sfx]);
}
