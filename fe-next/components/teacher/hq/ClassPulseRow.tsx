'use client';

import Link from 'next/link';
import { m, useReducedMotion } from 'framer-motion';
import { Activity, ChevronRight, Lock } from 'lucide-react';
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

function PulseLink({ classroomId }: { classroomId: string }) {
  const { t, language } = useLanguage();
  const reduceMotion = useReducedMotion();
  const pulse = summarizeHqPulse(useWordMasteryReport(classroomId));
  const names = useRosterNames(classroomId, (pulse?.needHelpIds.length ?? 0) > 0, t('teacher.reports.arc.unknownStudent'));
  if (!pulse) return null;
  const who = pulse.needHelpIds.map((id) => names[id]).filter(Boolean);
  const more = (pulse.needHelp ?? 0) - who.length;

  const alarm = (pulse.needHelp ?? 0) > 0;
  return (
    <Link
      href={`/${language}/teacher/reports?classroomId=${classroomId}`}
      data-testid="hq-class-pulse"
      aria-label={t('eg2Rep.hq.openReport')}
      className={cn(
        'flex shrink-0 items-center gap-2 rounded-neo border-2 bg-neo-navy-light/95 px-2 py-1.5 shadow-hard-sm sm:gap-3 sm:px-3',
        alarm ? 'border-neo-pink' : 'border-neo-lime/70',
        'transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-hard focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan active:translate-y-0 motion-reduce:transition-none',
      )}
    >
      <span className="flex size-7 shrink-0 items-center justify-center rounded-neo border-2 border-neo-black bg-neo-pink text-black shadow-hard-sm">
        <Activity className="size-4" strokeWidth={3} aria-hidden="true" />
      </span>
      <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-0.5 font-neo-display text-xs font-black uppercase tracking-wide text-neo-white sm:text-sm">
        <span>
          <span className="text-neo-cyan tabular-nums">{pulse.accuracy}%</span> {t('eg2Rep.hq.accuracy')}
        </span>
        <m.span
          key={pulse.needHelp ?? 'locked'}
          data-testid="hq-class-pulse-need-help"
          initial={reduceMotion ? false : { scale: 0.6 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 520, damping: 14 }}
          className={cn(
            'inline-flex items-center gap-1 rounded-neo border-2 px-1.5 leading-5',
            pulse.locked
              ? 'border-neo-lime bg-neo-navy text-neo-lime'
              : alarm
                ? 'border-black bg-neo-pink text-neo-black'
                : 'border-black bg-neo-lime text-neo-black',
          )}
        >
          {pulse.locked && <Lock className="size-3" aria-hidden="true" />}
          {pulse.locked
            ? t('eg2Rep.hq.whoNeedsHelp')
            : alarm
              ? t('eg2Rep.hq.needHelp', { count: pulse.needHelp ?? 0 })
              : t('eg2Rep.hq.allOnTrack')}
        </m.span>
        {who.length > 0 && (
          <span className="min-w-0 truncate normal-case tracking-normal text-neo-pink">
            <bdi data-testid="hq-class-pulse-names">{who.join(', ')}</bdi>
            {more > 0 && <span className="tabular-nums"> +{more}</span>}
          </span>
        )}
        {pulse.hardest && (
          <span className="min-w-0 truncate normal-case tracking-normal text-neo-cream/80">
            {t('eg2Rep.hq.hardest')}{' '}
            <bdi className="font-black text-neo-white">{pulse.hardest}</bdi>
          </span>
        )}
      </span>
      <DirectionalIcon icon={ChevronRight} className="size-5 shrink-0 text-neo-cream/80" />
    </Link>
  );
}

/** HQ glance at the selected class: accuracy, who is below goal, the word to reteach — one tap into the report. */
export function ClassPulseRow({ classroomId, studentCount }: { classroomId: string; studentCount: number }) {
  if (studentCount < 1) return null;
  return <PulseLink classroomId={classroomId} />;
}

export default ClassPulseRow;
