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
      className="flex min-w-0 flex-col justify-center gap-0.5 px-3 py-2 lg:px-4 lg:py-3"
      initial={false}
      animate={active && !reduce ? { scale: [1, 1.06, 1] } : { scale: 1 }}
      transition={{ duration: 0.45, delay: 0.16 * index, ease: 'easeOut' }}
    >
      <span className={cn('font-neo-display font-black leading-none tabular-nums text-neo-lime', projector ? 'text-3xl 2xl:text-5xl min-[2200px]:text-7xl' : 'text-2xl')}>
        <span aria-hidden="true">{shown}</span>
        <span className="sr-only">{value}</span>
      </span>
      <span className={cn('flex min-w-0 items-center gap-1.5 font-neo-body font-bold text-neo-cream/85', projector ? 'text-sm 2xl:text-base min-[2200px]:text-2xl' : 'text-xs')}>
        <Icon className="size-4 shrink-0 text-neo-cyan 2xl:size-5" aria-hidden="true" />
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
      className="grid shrink-0 grid-cols-3 divide-x-[3px] divide-neo-cream/25 rounded-neo border-[3px] border-neo-cream bg-neo-navy-elevated shadow-hard"
    >
      {cells.map((cell, index) => (
        <Cell key={cell.testId} {...cell} index={index} active={active} projector={projector} />
      ))}
    </div>
  );
}

export default ClassPulse;
