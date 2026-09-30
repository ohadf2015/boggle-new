'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { TowerBlock } from '@/lib/wordTowerV2/estateTower';
import type { RevengeEntry, RivalView, UseEstate } from '../useEstate';
import { RaidFlow } from './RaidFlow';
import { RivalBoard } from './RivalBoard';
import type { T } from './rivalUtils';

interface Props {
  t: T;
  estate: UseEstate;
  myTower: TowerBlock[];
  myHeightM: number;
  balls: number;
  reducedMotion: boolean;
  onClose: () => void;
  /** A raid takes the whole screen: the parent pauses the game canvas. */
  onRaidOpen: (open: boolean) => void;
}

/**
 * The rival board on its own screen, reachable from the game menu any time —
 * not only after a run ends. Your tower stands next to three real rivals';
 * tap one to see their building, buy a wrecking ball if you are out, and ruin it.
 */
export function RivalsScreen({ t, estate, myTower, myHeightM, balls, reducedMotion, onClose, onRaidOpen }: Props) {
  const [target, setTarget] = useState<{ rival: RivalView; revenge: RevengeEntry | null } | null>(null);
  useEffect(() => {
    onRaidOpen(target !== null);
    return () => onRaidOpen(false);
  }, [target, onRaidOpen]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !target) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, target]);

  return (
    <>
      <div
        data-wt2-rivals-screen
        role="dialog"
        aria-modal="true"
        className="absolute inset-0 z-40 flex flex-col overflow-y-auto bg-neo-navy/95 p-4 pt-[max(1rem,env(safe-area-inset-top))]"
      >
        <div className="mx-auto w-full max-w-3xl">
          <button
            type="button"
            onClick={onClose}
            aria-label={t('wordTowerV2.results.close')}
            className="mb-2 ms-auto flex h-10 w-10 items-center justify-center rounded-neo border-neo-thick border-black bg-neo-cream text-neo-navy shadow-hard active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
          <RivalBoard
            t={t}
            estate={estate}
            myTower={myTower}
            myHeightM={myHeightM}
            onPick={(rival, revenge) => setTarget({ rival, revenge })}
          />
        </div>
      </div>
      {target ? (
        <RaidFlow
          t={t}
          estate={estate}
          rival={target.rival}
          revenge={!!target.revenge}
          grievance={target.revenge}
          balls={balls}
          reducedMotion={reducedMotion}
          onClose={() => setTarget(null)}
        />
      ) : null}
    </>
  );
}
