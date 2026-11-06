import type { CSSProperties } from 'react';
import { cn } from '@/lib/utils';

const DROP_STEP_MS = 70;
const HOP_GAP_S = 1.8;
const FIRST_HOP_S = 1.5;

export function joinCodeHop(index: number, count: number) {
  const cycleS = Math.max(6, count * HOP_GAP_S);
  return { cycleS, delayS: FIRST_HOP_S + index * HOP_GAP_S };
}

export interface JoinCodeTileProps {
  ch: string;
  index: number;
  count: number;
  /** The tile face: size, border, fill and type. */
  className?: string;
  'data-testid'?: string;
}

/** One join-code letter: drops in on its turn, then hops once per wave. The two motions sit on two elements. */
export function JoinCodeTile({ ch, index, count, className, 'data-testid': testId }: JoinCodeTileProps) {
  const hop = joinCodeHop(index, count);
  return (
    <span
      aria-hidden="true"
      data-testid={testId}
      className="grid min-w-0 animate-edu-tile-in [perspective:400px]"
      style={{ animationDelay: `${index * DROP_STEP_MS}ms` }}
    >
      <span
        className={cn('grid animate-edu-hop place-items-center', className)}
        style={{ '--edu-hop-dur': `${hop.cycleS}s`, animationDelay: `${hop.delayS}s` } as CSSProperties}
      >
        {ch}
      </span>
    </span>
  );
}
