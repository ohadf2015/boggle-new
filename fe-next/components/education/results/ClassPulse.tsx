'use client';

import { memo } from 'react';
import { m, useReducedMotion } from 'framer-motion';
import { BookOpenCheck, Gauge, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCountUp } from '@/hooks/useCountUp';
import type { ClassStats } from '@/components/education/live/eduResultsModel';

type Translate = (key: string, params?: Record<string, string | number>) => string;

interface CellProps {
  testId: string;
  icon: typeof Users;
  value: number;
  label: string;
  index: number;
  active: boolean;
  projector: boolean;
}

const Cell = memo(function Cell({ testId, icon: Icon, value, label, index, active, projector }: CellProps) {
  const reduce = !!useReducedMotion();
  const shown = useCountUp({ target: value, duration: 900, startDelay: 300 + index * 160, immediate: reduce });
  return (
    <m.div
      data-testid={testId}
      className={cn('flex min-w-0 justify-center', projector ? 'flex-col gap-0.5 px-3 py-2 @5xl/results:px-4 @[96rem]/results:py-3' : 'flex-row items-center gap-2 px-2.5 py-1.5')}
      initial={false}
      animate={active && !reduce ? { scale: [1, 1.06, 1] } : { scale: 1 }}
      transition={{ duration: 0.45, delay: 0.16 * index, ease: 'easeOut' }}
    >
      <span className={cn('font-neo-display font-black leading-none tabular-nums text-neo-cream', projector ? 'text-3xl @[96rem]/results:text-5xl @[137.5rem]/results:text-7xl' : 'text-xl')}>
        <span aria-hidden="true">{shown}</span>
        <span className="sr-only">{value}</span>
      </span>
      <span className={cn('flex min-w-0 items-center gap-1.5 font-neo-body font-bold text-neo-cream/85', projector ? 'text-sm @[96rem]/results:text-base @[137.5rem]/results:text-2xl' : 'text-xs')}>
        <Icon className="size-4 shrink-0 text-neo-cream/70 @[96rem]/results:size-5" aria-hidden="true" />
        <span className={projector ? 'truncate' : 'leading-tight'}>{label}</span>
      </span>
    </m.div>
  );
});

export interface ClassPulseProps {
  stats: ClassStats;
  /** The winner's beat: each number gives one pulse. */
  active: boolean;
  size?: 'card' | 'projector';
  t: Translate;
}

/** The room's own numbers, as one scoreboard strip: who played, how many words, the average. */
export function ClassPulse({ stats, active, size = 'projector', t }: ClassPulseProps) {
  const projector = size === 'projector';
  const cells = [
    { testId: 'edu-stat-students', icon: Users, value: stats.students, label: t('eduLiveRoom.hostResults.statStudents') },
    { testId: 'edu-stat-words', icon: BookOpenCheck, value: stats.words, label: t('eduLiveRoom.hostResults.statWords') },
    { testId: 'edu-stat-avg', icon: Gauge, value: stats.avgScore, label: t('eduLiveRoom.hostResults.statAvg') },
  ];
  return (
    <div
      data-testid="class-pulse"
      className="grid shrink-0 grid-cols-3 divide-x-2 divide-neo-cream/25 rounded-neo border-2 border-neo-cream/50 bg-neo-navy-light"
    >
      {cells.map((cell, index) => (
        <Cell key={cell.testId} {...cell} index={index} active={active} projector={projector} />
      ))}
    </div>
  );
}

export default ClassPulse;
