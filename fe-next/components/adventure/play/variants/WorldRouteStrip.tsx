'use client';

/**
 * A world's seven levels as mini silhouettes (world-map cards): shows at a glance
 * what kinds a world holds, where the elite sits, and that it ends in a boss.
 */
import { memo } from 'react';
import { cn } from '@/lib/utils';
import { rampOf, NODE_SHAPE } from './trailLayout';
import { KIND_META } from './levelKinds';
import TrailNodeShape from './TrailNodeShape';

interface Props {
  world: number;
  /** Levels with at least one star (filled); the rest render dimmed. */
  cleared: number;
  locked?: boolean;
  label: string;
}

const WorldRouteStrip = memo(function WorldRouteStrip({ world, cleared, locked, label }: Props) {
  const steps = rampOf(world);
  return (
    <div dir="ltr" role="img" aria-label={label} data-testid={`world-route-${world}`} className="flex items-end gap-[3px]">
      {steps.map((s) => {
        const big = s.kind === 'boss' ? 'h-[26px] w-[26px]' : s.kind === 'elite' ? 'h-[21px] w-[21px]' : 'h-[16px] w-[16px]';
        const Icon = KIND_META[s.kind].icon;
        const done = s.level <= cleared;
        return (
          <span key={s.level} data-kind={s.kind} className={cn('relative shrink-0', big, !done && !locked && 'opacity-60')}>
            <TrailNodeShape shape={NODE_SHAPE[s.kind]} fill={locked ? '#4b5275' : KIND_META[s.kind].hex} className="absolute inset-0 h-full w-full" />
            <span className={cn('absolute inset-0 grid place-items-center', s.kind === 'bomb' && 'pt-[18%]')}>
              <Icon className="h-[46%] w-[46%] text-black" strokeWidth={3} aria-hidden />
            </span>
          </span>
        );
      })}
    </div>
  );
});

export default WorldRouteStrip;
