'use client';

import { useEffect, useState } from 'react';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import type { GagBeat, LegendaryGag } from '@/lib/mascot/legendary';
import { edgeSign } from './MascotEdgeStage';

interface Props {
  gag: LegendaryGag;
  onBeat: (beat: GagBeat) => void;
}

export function MascotLegendaryGag({ gag, onBeat }: Props) {
  const [index, setIndex] = useState(0);
  const beat = gag.beats[index];
  const sign = edgeSign();

  useEffect(() => {
    onBeat(gag.beats[index]);
    if (index >= gag.beats.length - 1) return;
    const timer = setTimeout(() => setIndex(index + 1), gag.beats[index].ms);
    return () => clearTimeout(timer);
    // onBeat is a fresh closure each render; beats advance on index only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gag, index]);

  if (!beat) return null;
  const snappy = beat.phase === 'action';
  return (
    <div data-testid="mascot-legendary" data-gag={gag.id} data-phase={beat.phase} aria-hidden="true" className="absolute end-0 top-1 size-20 pointer-events-none">
      {beat.prop === 'falling-block' && (
        <AdaptiveMotion.div
          initial={{ y: -60, rotate: -20 }}
          animate={{ y: 0, rotate: 8 }}
          transition={{ duration: 0.14, ease: 'easeIn' }}
          className="absolute -top-1 end-7 size-5 rounded-sm border-2 border-neo-navy bg-neo-yellow shadow-hard-sm"
        />
      )}
      <AdaptiveMotion.div
        initial={{ x: 80 * sign }}
        animate={{ x: beat.out * sign, y: beat.y, rotate: beat.rotate * sign, scaleX: beat.scaleX, scaleY: beat.scaleY }}
        transition={snappy ? { duration: beat.ms / 1000, ease: [0.2, 1.6, 0.4, 1] } : { duration: beat.ms / 1000, ease: 'easeInOut' }}
        className="size-full origin-bottom"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={beat.pose} alt="" aria-hidden="true" width={80} height={80} className="size-full object-contain" />
      </AdaptiveMotion.div>
    </div>
  );
}
