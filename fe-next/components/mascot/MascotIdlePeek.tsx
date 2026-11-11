'use client';

import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { IDLE_POSES, type IdlePhase } from '@/lib/mascot/idle';
import { edgeSign } from './MascotEdgeStage';

export function MascotIdlePeek({ phase }: { phase: Exclude<IdlePhase, 'awake'> }) {
  const sign = edgeSign();
  return (
    <AdaptiveMotion.div
      data-testid="mascot-idle"
      data-phase={phase}
      initial={{ x: 64 * sign, rotate: 0 }}
      animate={phase === 'doze' ? { x: 22 * sign, rotate: -14 * sign, y: 6 } : { x: 26 * sign, rotate: -6 * sign, y: 0 }}
      transition={{ type: 'spring', stiffness: 160, damping: 18 }}
      className="absolute end-0 top-1 size-16 sm:size-20 pointer-events-none"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={IDLE_POSES[phase]} alt="" aria-hidden="true" width={80} height={80} className="size-full object-contain" />
    </AdaptiveMotion.div>
  );
}
