'use client';

import { useEffect, useState } from 'react';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import type { GagBeat, GagVariant } from '@/lib/mascot/gagTypes';
import { edgeSign } from './MascotEdgeStage';
import { MascotGagProp } from './MascotGagProp';

export type GagPlacement = 'edge' | 'stage' | 'timer';

const PLACEMENT: Record<GagPlacement, string> = {
  edge: 'absolute end-0 top-6 size-20 sm:size-24',
  stage: 'absolute bottom-1 end-0 size-20 ltr:origin-bottom-right rtl:origin-bottom-left',
  // Sits on the timer's start side and slides out from behind it, so it pushes the pill without covering the digits.
  timer: 'absolute end-full top-1/2 -z-10 -mt-10 me-[-1.25rem] size-20 ltr:origin-right rtl:origin-left',
};

interface Props {
  playKey: number;
  placement?: GagPlacement;
  scale?: number;
  gagId: string;
  variant: GagVariant;
  onBeat: (beat: GagBeat) => void;
}

export function MascotGagPlayer({ playKey, placement = 'edge', scale = 1, gagId, variant, onBeat }: Props) {
  const [index, setIndex] = useState(0);
  const beat = variant.beats[index];
  const sign = edgeSign();

  useEffect(() => {
    onBeat(variant.beats[index]);
    if (index >= variant.beats.length - 1) return;
    const timer = setTimeout(() => setIndex(index + 1), variant.beats[index].ms);
    return () => clearTimeout(timer);
    // onBeat is a fresh closure each render; beats advance on index only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variant, index]);

  if (!beat) return null;
  // One-shot clips hold their last frame; a fresh query restarts them.
  const src = variant.clipSrc ? `${variant.clipSrc}?t=${playKey}` : beat.pose;
  const snappy = beat.phase === 'action';
  return (
    <div
      data-testid="mascot-gag"
      data-gag={gagId}
      data-variant={variant.id}
      data-phase={beat.phase}
      data-placement={placement}
      data-scale={scale}
      aria-hidden="true"
      style={scale === 1 ? undefined : { scale: String(scale) }}
      className={`${PLACEMENT[placement]} pointer-events-none`}
    >
      <AdaptiveMotion.div
        initial={{ x: 84 * sign }}
        animate={{ x: beat.out * sign, y: beat.y, rotate: beat.rotate * sign, scaleX: beat.scaleX, scaleY: beat.scaleY }}
        transition={{ duration: beat.ms / 1000, ease: snappy ? [0.2, 1.6, 0.4, 1] : 'easeInOut' }}
        className="relative size-full origin-bottom"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" aria-hidden="true" width={96} height={96} className="size-full object-contain" />
        {beat.prop && <MascotGagProp key={`${beat.prop.kind}-${index}`} kind={beat.prop.kind} move={beat.prop.move} />}
      </AdaptiveMotion.div>
    </div>
  );
}
