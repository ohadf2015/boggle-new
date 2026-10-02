'use client';

import { m, useReducedMotion } from 'framer-motion';
import { BookA, Gamepad2, Target, Users, type LucideIcon } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { MasteryTotals } from '@/lib/education/wordMasteryReport';
import { cn } from '@/lib/utils';
import { useCountUp } from './useCountUp';

const TONES = {
  lime: 'text-neo-lime border-neo-lime',
  cyan: 'text-neo-cyan border-neo-cyan',
  pink: 'text-neo-pink border-neo-pink',
  purple: 'text-neo-purple-light border-neo-purple-light',
} as const;

function StatCard({
  id,
  icon: Icon,
  label,
  value,
  suffix = '',
  tone,
  index,
}: {
  id: string;
  icon: LucideIcon;
  label: string;
  value: number;
  suffix?: string;
  tone: keyof typeof TONES;
  index: number;
}) {
  const shown = useCountUp(value);
  const reduceMotion = useReducedMotion();
  return (
    <m.div
      data-testid={`mastery-stat-${id}`}
      initial={reduceMotion ? false : { y: 8, scale: 0.96 }}
      animate={{ y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 420, damping: 26, delay: index * 0.06 }}
      className="flex min-w-0 flex-col gap-1 rounded-neo border-2 border-neo-cream/50 bg-neo-navy p-2.5 shadow-hard-sm sm:p-3"
    >
      <span className="flex items-center gap-1.5">
        <span className={cn('grid size-6 shrink-0 place-items-center rounded-neo border-2 bg-neo-navy-light', TONES[tone])}>
          <Icon className="size-3.5" aria-hidden="true" />
        </span>
        <span className="min-w-0 text-xs font-bold leading-tight text-neo-cream/80">{label}</span>
      </span>
      <span className={cn('font-neo-display text-2xl font-black leading-none tabular-nums sm:text-3xl', TONES[tone].split(' ')[0])}>
        {shown}
        {suffix}
      </span>
    </m.div>
  );
}

export function MasteryStatCards({ totals }: { totals: MasteryTotals }) {
  const { t } = useLanguage();
  const accuracyTone = totals.classAccuracy >= 80 ? 'lime' : totals.classAccuracy >= 50 ? 'cyan' : 'pink';
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
      <StatCard id="accuracy" index={0} icon={Target} tone={accuracyTone} value={totals.classAccuracy} suffix="%" label={t('eduPro.mastery.stats.accuracy')} />
      <StatCard id="words" index={1} icon={BookA} tone="cyan" value={totals.words} label={t('eduPro.mastery.stats.words')} />
      <StatCard id="sessions" index={2} icon={Gamepad2} tone="purple" value={totals.sessions} label={t('eduPro.mastery.stats.sessions')} />
      <StatCard id="students" index={3} icon={Users} tone="lime" value={totals.students} label={t('eduPro.mastery.stats.students')} />
    </div>
  );
}
