'use client';

import { useState } from 'react';
import { AnimatePresence, m, useReducedMotion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCountUp } from '@/components/teacher/reports/useCountUp';
import type { TeacherInsight, TeacherInsightId } from '@/lib/education/teacherInsights';
import { PANEL } from './homeStyles';

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy';

type T = (key: string, params?: Record<string, string | number>) => string;

const CURSOR_KEY = 'teacher-home-insight-cursor';

const INK: Record<TeacherInsightId, string> = {
  momentum: 'text-neo-lime',
  streak: 'text-neo-orange',
  busiest: 'text-neo-cyan',
  topClass: 'text-neo-pink',
  quiet: 'text-neo-orange',
  reach: 'text-neo-purple',
  month: 'text-neo-lime',
};

/** Each open lands on the next insight: the counter lives in this browser and survives reloads. */
function nextCursor(): number {
  try {
    const n = (Number(localStorage.getItem(CURSOR_KEY)) || 0) + 1;
    localStorage.setItem(CURSOR_KEY, String(n));
    return n;
  } catch {
    return 0;
  }
}

function Value({ value, ink }: { value: number | string; ink: string }) {
  const counted = useCountUp(typeof value === 'number' ? value : 0);
  return (
    <span
      data-testid="home-insight-value"
      className={cn('block break-words font-neo-display text-5xl font-black leading-none tabular-nums', ink)}
    >
      {typeof value === 'number' ? counted : value}
    </span>
  );
}

/** One real fact about the classes per visit, rotating; never shown without activity behind it. */
export function HomeInsightCard({ insights = [], t }: { insights?: readonly TeacherInsight[]; t: T }) {
  const reduce = useReducedMotion();
  const [cursor, setCursor] = useState(nextCursor);
  if (insights.length === 0) return null;
  const insight = insights[cursor % insights.length];

  return (
    <section data-testid="home-insight" aria-labelledby="home-insight-title" className={cn(PANEL, 'overflow-hidden p-4')}>
      <div className="flex items-center justify-between gap-2">
        <h2 id="home-insight-title" className="font-neo-display text-lg font-black text-neo-cream">
          {t('eduShell.insight.title')}
        </h2>
        {insights.length > 1 ? (
          <button
            type="button"
            onClick={() => setCursor((c) => c + 1)}
            aria-label={t('eduShell.insight.next')}
            className={cn('grid size-9 place-items-center rounded-neo border-2 border-neo-cream/40 text-neo-cream hover:bg-neo-navy', FOCUS_RING)}
          >
            <RefreshCw className="size-4" strokeWidth={3} aria-hidden="true" />
          </button>
        ) : null}
      </div>
      <div aria-live="polite" className="mt-3 min-h-[7.5rem]">
        <AnimatePresence mode="wait" initial={false}>
          <m.div
            key={insight.id}
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -10 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          >
            <Value value={insight.value} ink={INK[insight.id]} />
            <p className="mt-2 font-neo-body text-sm font-semibold leading-snug text-neo-cream/85">
              {t(`eduShell.insight.${insight.id}`, { count: Number(insight.value) || 0, day: String(insight.value), ...insight.params })}
            </p>
          </m.div>
        </AnimatePresence>
      </div>
    </section>
  );
}

export default HomeInsightCard;
