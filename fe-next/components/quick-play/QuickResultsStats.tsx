'use client';

import type { ReactNode } from 'react';
import { BookOpen, Target, Zap } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCountUp } from '@/lib/quickPlay/useCountUp';

/** Ms after mount: each card lands, then counts, before the next one arrives. */
export const STAT_TIMELINE = {
  score: { appear: 150, count: 300 },
  perfect: { appear: 700, count: 850 },
  words: { appear: 1250, count: 1400 },
} as const;
export const STAT_COUNT_MS = 650;

interface StatCardProps {
  testId: string;
  label: string;
  value: number;
  suffix?: string;
  icon: ReactNode;
  band: string;
  ink: string;
  timing: { appear: number; count: number };
  animate: boolean;
  valueTestId?: string;
}

function StatCard({ testId, label, value, suffix = '', icon, band, ink, timing, animate, valueTestId }: StatCardProps) {
  const shown = useCountUp(value, {
    delay: timing.count,
    duration: STAT_COUNT_MS,
    enabled: animate,
  });
  return (
    <div className="relative min-w-0">
      <span
        aria-hidden="true"
        data-testid="quick-stat-socket"
        className="absolute inset-0 rounded-2xl border-[3px] border-dashed border-neo-white/15 bg-black/20"
      />
      <div
        className={`relative flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border-[3px] border-black bg-neo-navy-elevated shadow-hard ${
          animate ? 'animate-[qp-card-in_0.42s_cubic-bezier(0.34,1.4,0.64,1)_both]' : ''
        }`}
        style={animate ? { animationDelay: `${timing.appear}ms` } : undefined}
        data-testid={testId}
        data-delay={timing.count}
        data-value={value}
      >
        <span
          className={`truncate px-2 py-1 text-center font-neo-display text-[10px] font-bold uppercase tracking-[0.16em] text-black ${band}`}
        >
          {label}
        </span>
        <span className="flex items-center justify-center gap-1.5 px-2 py-2.5 lg:py-3.5">
          <span className={ink}>{icon}</span>
          <b
            className={`inline-block font-neo-display text-3xl leading-none tabular-nums lg:text-4xl ${ink} ${
              animate ? 'animate-[qp-value-pop_0.38s_cubic-bezier(0.34,1.56,0.64,1)_both]' : ''
            }`}
            style={animate ? { animationDelay: `${timing.count + STAT_COUNT_MS}ms` } : undefined}
            data-testid={valueTestId}
          >
            {shown}
            {suffix}
          </b>
        </span>
      </div>
    </div>
  );
}

interface QuickResultsStatsProps {
  score: number;
  scorePct: number;
  wordsFound: number;
  animate: boolean;
  /** Mode accent for the % card, e.g. bg-neo-purple / text-neo-purple. */
  modeBand?: string;
  modeInk?: string;
}

export function QuickResultsStats({
  score,
  scorePct,
  wordsFound,
  animate,
  modeBand = 'bg-neo-purple',
  modeInk = 'text-neo-purple',
}: QuickResultsStatsProps) {
  const { t } = useLanguage();
  return (
    <div className="grid w-full grid-cols-3 gap-2.5 lg:max-w-2xl lg:gap-5" data-testid="quick-stats">
      <StatCard
        testId="quick-stat-score"
        label={t('quickPlay.solo.statScore', 'Score')}
        value={score}
        icon={<Zap className="h-5 w-5 fill-current" strokeWidth={2.5} />}
        band="bg-neo-yellow"
        ink="text-neo-yellow"
        timing={STAT_TIMELINE.score}
        animate={animate}
      />
      <StatCard
        testId="quick-stat-perfect"
        label={t('quickPlay.solo.ofPerfect')}
        value={scorePct}
        suffix="%"
        icon={<Target className="h-5 w-5" strokeWidth={2.75} />}
        band={modeBand}
        ink={modeInk}
        timing={STAT_TIMELINE.perfect}
        animate={animate}
        valueTestId="quick-hero-percentage"
      />
      <StatCard
        testId="quick-stat-words"
        label={t('quickPlay.solo.statWords', 'Words')}
        value={wordsFound}
        icon={<BookOpen className="h-5 w-5" strokeWidth={2.75} />}
        band="bg-neo-cyan"
        ink="text-neo-cyan"
        timing={STAT_TIMELINE.words}
        animate={animate}
      />
    </div>
  );
}
