'use client';

import Link from 'next/link';
import { m, useReducedMotion } from 'framer-motion';
import { Activity, ChevronRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { cn } from '@/lib/utils';
import { useRosterNames, useWordMasteryReport, type MasteryState } from '@/components/teacher/reports/useWordMasteryReport';

const NAMES_SHOWN = 3;

export interface HqPulse {
  accuracy: number;
  /** Null for a free teacher: the per-student read is Pro. */
  needHelp: number | null;
  /** Weakest first, at most three. */
  needHelpIds: string[];
  hardest: string | null;
  locked: boolean;
}

export function summarizeHqPulse(state: MasteryState): HqPulse | null {
  if (state.status === 'ready') {
    if (state.report.totals.sessions === 0) return null;
    return {
      accuracy: state.report.totals.classAccuracy,
      needHelp: state.insights?.belowGoalCount ?? null,
      needHelpIds: (state.insights?.students ?? [])
        .filter((s) => s.belowGoal)
        .slice(0, NAMES_SHOWN)
        .map((s) => s.studentId),
      hardest: state.report.hardestWords[0]?.display ?? null,
      locked: false,
    };
  }
  if (state.status === 'locked') {
    if (state.preview.totals.sessions === 0) return null;
    return {
      accuracy: state.preview.totals.classAccuracy,
      needHelp: null,
      needHelpIds: [],
      hardest: state.preview.hardestWords[0]?.display ?? null,
      locked: true,
    };
  }
  return null;
}

function PulseHero({ classroomId }: { classroomId: string }) {
  const { t, language } = useLanguage();
  const reduceMotion = useReducedMotion();
  const pulse = summarizeHqPulse(useWordMasteryReport(classroomId));
  const names = useRosterNames(classroomId, (pulse?.needHelpIds.length ?? 0) > 0, t('teacher.reports.arc.unknownStudent'));
  if (!pulse) return null;
  const who = pulse.needHelpIds.map((id) => names[id]).filter(Boolean);
  const more = (pulse.needHelp ?? 0) - who.length;
  const alarm = (pulse.needHelp ?? 0) > 0;

  return (
    <div data-testid="hq-class-pulse" className="flex flex-col gap-3">
      <p className="flex items-center gap-2 font-neo-display text-xs font-bold uppercase leading-none tracking-widest text-neo-white/60">
        <Activity className={cn('size-4', alarm ? 'text-neo-pink' : 'text-neo-lime')} strokeWidth={3} aria-hidden="true" />
        {t('hqCalm.pulseTitle')}
      </p>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <p data-testid="hq-class-pulse-accuracy" className="flex items-baseline gap-2 font-neo-display font-black uppercase text-neo-white">
          <span className="text-4xl leading-none tabular-nums text-neo-cyan sm:text-5xl">{pulse.accuracy}%</span>
          <span className="text-sm tracking-wide text-neo-white/70">{t('eg2Rep.hq.accuracy')}</span>
        </p>
        {pulse.locked ? null : (
          <m.span
            key={pulse.needHelp ?? 0}
            data-testid="hq-class-pulse-need-help"
            initial={reduceMotion ? false : { scale: 0.6 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 520, damping: 14 }}
            className={cn(
              'inline-flex items-center rounded-neo border-2 border-black px-2 py-0.5 font-neo-display text-sm font-black uppercase tracking-wide text-neo-black',
              alarm ? 'bg-neo-pink' : 'bg-neo-lime',
            )}
          >
            {alarm ? t('eg2Rep.hq.needHelp', { count: pulse.needHelp ?? 0 }) : t('eg2Rep.hq.allOnTrack')}
          </m.span>
        )}
      </div>
      {who.length > 0 && (
        <p className="font-neo-body text-base font-bold text-neo-pink">
          <bdi data-testid="hq-class-pulse-names">{who.join(', ')}</bdi>
          {more > 0 && <span className="tabular-nums"> +{more}</span>}
        </p>
      )}
      {pulse.hardest && (
        <p data-testid="hq-class-pulse-hardest" className="font-neo-body text-sm font-bold text-neo-white/70">
          {t('eg2Rep.hq.hardest')} <bdi className="font-neo-display text-base font-black text-neo-white">{pulse.hardest}</bdi>
        </p>
      )}
      <Link
        href={`/${language}/teacher/reports?classroomId=${classroomId}`}
        data-testid="hq-class-pulse-action"
        className={cn(
          'inline-flex min-h-11 items-center gap-1.5 self-start rounded-neo border-2 border-neo-cream/60 px-4 font-neo-display text-sm font-bold uppercase tracking-wide text-neo-white',
          'transition-colors hover:border-neo-cream hover:bg-neo-white/5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan',
        )}
      >
        {t('eg2Rep.hq.openReport')}
        <DirectionalIcon icon={ChevronRight} className="size-4 shrink-0" />
      </Link>
    </div>
  );
}

/** HQ pulse for the selected class: accuracy, who is below goal, the word to reteach, and one way into the report. */
export function ClassPulseRow({ classroomId, studentCount }: { classroomId: string; studentCount: number }) {
  if (studentCount < 1) return null;
  return <PulseHero classroomId={classroomId} />;
}

export default ClassPulseRow;
