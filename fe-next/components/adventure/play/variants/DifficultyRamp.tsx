'use client';

/**
 * Header strip: one bar per level, height = threat, colour + icon = kind.
 * Reads as a rising skyline, so the climb to the boss is visible before any tap.
 */
import { cn } from '@/lib/utils';
import { KIND_META } from './levelKinds';
import type { RampStep } from './trailLayout';

interface Props {
  steps: RampStep[];
  /** Level the player is on (outlined). */
  current?: number | null;
  title: string;
  /** aria label per step, e.g. "Level 3, Fog, threat 2 of 5". */
  describe: (s: RampStep) => string;
}

export default function DifficultyRamp({ steps, current, title, describe }: Props) {
  return (
    <div data-testid="difficulty-ramp" className="rounded-xl border-[3px] border-black bg-[#0f1b3d] px-2.5 pt-1 pb-1.5">
      <div className="mb-0.5 text-[10px] font-black uppercase tracking-widest text-neo-cream/80">{title}</div>
      {/* Follows the page direction, like the intro card's level path (RTL: level 1 on the right). */}
      <div className="flex h-11 items-end gap-1" role="list">
        {steps.map((s) => {
          const meta = KIND_META[s.kind];
          const Icon = meta.icon;
          const big = s.kind === 'elite' || s.kind === 'boss';
          return (
            <div key={s.level} role="listitem" aria-label={describe(s)} data-testid={`ramp-${s.level}`} data-threat={s.threat}
              className={cn('relative flex flex-col items-center justify-start rounded-t-md border-[2.5px] border-black pt-0.5',
                big ? 'flex-[1.5]' : 'flex-1', s.level === current && 'outline outline-[3px] outline-offset-1 outline-neo-lime')}
              style={{ height: `${12 + s.threat * 17.6}%`, backgroundColor: meta.hex }}>
              <Icon className="h-3 w-3 text-black" strokeWidth={3} aria-hidden />
            </div>
          );
        })}
      </div>
    </div>
  );
}
