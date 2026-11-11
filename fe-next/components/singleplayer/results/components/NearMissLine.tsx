'use client';

import { useEffect, useRef } from 'react';
import { trackGrowthEvent } from '@/utils/growthTracking';
import type { NearMiss } from '../nearMiss';

type TFn = (key: string, params?: Record<string, string | number>) => string;

interface NearMissLineProps {
  nearMiss: NearMiss | null;
  mode: string;
  t: TFn;
}

function lineText(nearMiss: NearMiss, t: TFn): string {
  if (nearMiss.kind === 'newBest') return t('singlePlayer.nearMiss.newBest');
  if (nearMiss.kind === 'rival') return t('singlePlayer.nearMiss.rival', { gap: nearMiss.gap, name: nearMiss.name });
  return t('singlePlayer.nearMiss.best', { gap: nearMiss.gap });
}

/** The one line above "Again" that says how close this game came. */
export function NearMissLine({ nearMiss, mode, t }: NearMissLineProps) {
  const sent = useRef(false);
  useEffect(() => {
    if (!nearMiss || sent.current) return;
    sent.current = true;
    trackGrowthEvent('sp_near_miss_shown', {
      kind: nearMiss.kind,
      gap: nearMiss.kind === 'newBest' ? 0 : nearMiss.gap,
      mode,
    });
  }, [nearMiss, mode]);

  if (!nearMiss) return null;
  const celebrating = nearMiss.kind === 'newBest';
  return (
    <p
      role="status"
      data-testid="sp-near-miss"
      data-kind={nearMiss.kind}
      className={
        celebrating
          ? 'rounded-neo border-2 border-black bg-neo-yellow px-3 py-1.5 text-center font-neo-display text-base font-black uppercase tracking-wide text-neo-black shadow-hard'
          : 'rounded-neo border-2 border-neo-pink bg-neo-navy px-3 py-1.5 text-center font-neo-display text-base font-bold text-neo-cream shadow-hard'
      }
    >
      {lineText(nearMiss, t)}
    </p>
  );
}
