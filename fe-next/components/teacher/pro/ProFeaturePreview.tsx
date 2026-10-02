'use client';

import { TrendingUp, TrendingDown, Minus, Printer } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import type { ProFeature } from '@/components/teacher/ProGate';
import {
  SAMPLE_STUDENTS,
  SAMPLE_WORD_COUNT,
  sampleMasteryGrid,
  sampleHardestWords,
  sampleClassAverage,
  splitSampleList,
  type SampleLevel,
} from '@/lib/education/pro/sampleClass';

type T = (key: string, params?: Record<string, string | number>) => string;

const LEVEL_BG: Record<SampleLevel, string> = {
  mastered: 'bg-neo-lime',
  learning: 'bg-neo-yellow',
  struggling: 'bg-neo-pink',
};

function useSample() {
  const { t } = useLanguage();
  const names = splitSampleList(t('eg2Pro.sample.students'), SAMPLE_STUDENTS.length, t('eg2Pro.sample.student'));
  const words = splitSampleList(t('eg2Pro.sample.words'), SAMPLE_WORD_COUNT, '#');
  return { t: t as T, names, words };
}

function Frame({ feature, title, children, className }: { feature: ProFeature; title: string; children: React.ReactNode; className?: string }) {
  const { t } = useLanguage();
  return (
    <div
      data-testid={`pro-preview-${feature}`}
      className={cn('rounded-neo border-2 border-neo-cream/50 bg-neo-navy p-3 text-start shadow-hard-sm', className)}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="truncate font-neo-display text-sm font-black text-neo-white">{title}</p>
        <span className="shrink-0 rounded-full border-2 border-neo-black bg-neo-yellow px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-neo-black">
          {t('eg2Pro.sample.badge')}
        </span>
      </div>
      {children}
    </div>
  );
}

function TrendIcon({ trend }: { trend: 'up' | 'flat' | 'down' }) {
  if (trend === 'up') return <TrendingUp className="h-3.5 w-3.5 text-neo-lime" aria-hidden />;
  if (trend === 'down') return <TrendingDown className="h-3.5 w-3.5 text-neo-pink" aria-hidden />;
  return <Minus className="h-3.5 w-3.5 text-neo-white/60" aria-hidden />;
}

function AnalyticsPreview() {
  const { t, names, words } = useSample();
  const hardest = words[sampleHardestWords()[0]];
  return (
    <Frame feature="analytics" title={t('eg2Pro.sample.analyticsTitle')}>
      <div className="space-y-1.5">
        {SAMPLE_STUDENTS.map((s, i) => (
          <div
            key={names[i]}
            data-testid="pro-preview-student-row"
            className={cn(
              'flex items-center gap-2 rounded-neo border-2 px-2 py-1',
              s.trend === 'down' ? 'border-neo-pink bg-neo-pink/10' : 'border-neo-cream/40 bg-neo-navy-light',
            )}
          >
            <span className="w-14 shrink-0 truncate text-xs font-bold text-neo-white">{names[i]}</span>
            <span className="h-2 flex-1 overflow-hidden rounded-full bg-neo-white/10">
              <span
                className={cn('block h-full rounded-full', s.accuracy >= 80 ? 'bg-neo-lime' : s.accuracy >= 60 ? 'bg-neo-yellow' : 'bg-neo-pink')}
                style={{ width: `${s.accuracy}%` }}
              />
            </span>
            <span className="w-9 shrink-0 text-end text-xs font-black tabular-nums text-neo-white">{s.accuracy}%</span>
            <TrendIcon trend={s.trend} />
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs font-bold text-neo-pink">
        {t('eg2Pro.sample.stuckOn', { name: names[2], word: hardest })}
      </p>
    </Frame>
  );
}

function MasteryPreview() {
  const { t, names, words } = useSample();
  const grid = sampleMasteryGrid();
  const hardest = sampleHardestWords().slice(0, 3).map((i) => words[i]).join(', ');
  return (
    <Frame feature="mastery" title={t('eg2Pro.sample.masteryTitle')}>
      <div className="grid gap-1" style={{ gridTemplateColumns: `3.5rem repeat(${SAMPLE_WORD_COUNT}, minmax(0, 1fr))` }}>
        <span />
        {words.map((w) => (
          <span key={w} className="truncate text-center text-[10px] font-bold text-neo-white/70" title={w}>{w}</span>
        ))}
        {grid.map((row, r) => (
          <div key={names[r]} className="contents">
            <span className="truncate text-xs font-bold text-neo-white">{names[r]}</span>
            {row.map((level, c) => (
              <span
                key={`${r}-${c}`}
                data-testid="pro-preview-cell"
                data-level={level}
                className={cn('h-4 rounded-sm border border-neo-black', LEVEL_BG[level])}
              />
            ))}
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs font-bold text-neo-white/80">{t('eg2Pro.sample.hardest', { words: hardest })}</p>
    </Frame>
  );
}

function PracticePreview() {
  const { t, words } = useSample();
  const order = sampleHardestWords();
  const rounds = [
    { days: 1, picks: order.slice(0, 3) },
    { days: 3, picks: order.slice(0, 2) },
    { days: 7, picks: order.slice(0, 1) },
  ];
  return (
    <Frame feature="missedPractice" title={t('eg2Pro.sample.practiceTitle')}>
      <div className="grid grid-cols-3 gap-1.5">
        {rounds.map((r) => (
          <div key={r.days} className="rounded-neo border-2 border-neo-cream/40 bg-neo-navy-light p-1.5">
            <p data-testid="pro-preview-day" className="mb-1 text-[11px] font-black uppercase text-neo-cyan">
              {t('eg2Pro.sample.inDays', { days: r.days })}
            </p>
            <div className="flex flex-wrap gap-1">
              {r.picks.map((i) => (
                <span key={i} className="truncate rounded-sm bg-neo-pink px-1 text-[10px] font-bold text-neo-black">{words[i]}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs font-bold text-neo-white/80">{t('eg2Pro.sample.practiceNote')}</p>
    </Frame>
  );
}

function ReportsPreview() {
  const { t, names, words } = useSample();
  const reteach = sampleHardestWords().slice(0, 3).map((i) => words[i]).join(' · ');
  return (
    <Frame feature="reports" title={t('eg2Pro.sample.reportTitle', { className: t('eg2Pro.sample.className') })}>
      <div className="rounded-sm border-2 border-neo-black bg-neo-white p-2 text-neo-black">
        <div className="flex items-end justify-between border-b-2 border-dashed border-neo-black/30 pb-1">
          <span className="text-[11px] font-bold uppercase">{t('eg2Pro.sample.classAverage')}</span>
          <span className="font-neo-display text-xl font-black tabular-nums">{sampleClassAverage()}%</span>
        </div>
        <ul className="mt-1 space-y-0.5">
          {SAMPLE_STUDENTS.map((s, i) => (
            <li key={names[i]} className="flex justify-between text-[11px] font-bold">
              <span className="truncate">{names[i]}</span>
              <span className="tabular-nums">{s.accuracy}%</span>
            </li>
          ))}
        </ul>
        <p className="mt-1 text-[11px] font-black">{t('eg2Pro.sample.reportWords')}: {reteach}</p>
      </div>
      <p className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-neo-white/80">
        <Printer className="h-3.5 w-3.5" aria-hidden /> {t('eg2Pro.sample.print')}
      </p>
    </Frame>
  );
}

function DialsPreview() {
  const { t } = useSample();
  const dials = [
    { label: t('eg2Pro.sample.dialLeaderboard'), value: t('eg2Pro.sample.off') },
    { label: t('eg2Pro.sample.dialTimer'), value: t('eg2Pro.sample.relaxed') },
    { label: t('eg2Pro.sample.dialSpeed'), value: t('eg2Pro.sample.off') },
  ];
  return (
    <Frame feature="pressureDials" title={t('eg2Pro.sample.dialsTitle')}>
      <div className="space-y-1.5">
        {dials.map((d) => (
          <div key={d.label} className="flex items-center justify-between rounded-neo border-2 border-neo-cream/40 bg-neo-navy-light px-2 py-1">
            <span className="text-xs font-bold text-neo-white">{d.label}</span>
            <span className="rounded-full border-2 border-neo-black bg-neo-cyan px-2 text-[11px] font-black text-neo-black">{d.value}</span>
          </div>
        ))}
      </div>
    </Frame>
  );
}

const PREVIEWS: Record<ProFeature, () => React.JSX.Element> = {
  analytics: AnalyticsPreview,
  mastery: MasteryPreview,
  missedPractice: PracticePreview,
  reports: ReportsPreview,
  pressureDials: DialsPreview,
};

export function ProFeaturePreview({ feature }: { feature: ProFeature }) {
  const Preview = PREVIEWS[feature];
  return <Preview />;
}
