/**
 * The two taps that matter at the end of a classroom round.
 *
 * Rematch restages the same list in the same room; "Full report" opens the
 * numbers. They sit side by side above every other follow-up because a teacher
 * standing in front of thirty children reads one row of buttons, not eight.
 *
 * TEACHER-ONLY BY CONSTRUCTION. `useTeacherPro` fires a request on mount, and
 * ClassroomResultsCard renders for every student in the room too — so the hook
 * lives down here, in a component the card mounts only for the teacher, rather
 * than up in the card where thirty phones would each hit
 * /api/subscription/status for an answer none of them use.
 *
 * The report link is gated because /teacher/reports sits behind
 * ProGate feature="reports". Class 1 (dual source + async resolution): the
 * entitlement resolves AFTER first paint, so render the pessimistic state —
 * no link — until it lands. An optimistic link either yanks itself out from
 * under the teacher's finger or drops a free teacher onto a blurred paywall
 * from the loudest button on the card.
 */

'use client';

import Link from 'next/link';
import { RotateCcw, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTeacherPro } from '@/hooks/useTeacherPro';

export interface ResultsPrimaryActionsProps {
  /** Locale segment for the report href. */
  language: string;
  /** Teacher-only: same list, same code — a new round without a new room. */
  onRematch?: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const BUTTON =
  'flex items-center justify-center gap-2 px-4 py-3.5 font-neo-display font-bold ' +
  'border-[3px] border-neo-black rounded-neo shadow-hard hover:shadow-hard-lg ' +
  'hover:-translate-y-0.5 transition-all';

export function ResultsPrimaryActions({ language, onRematch, t }: ResultsPrimaryActionsProps) {
  const { hasPro, loading } = useTeacherPro();
  const canOpenReport = hasPro && !loading;

  if (!onRematch && !canOpenReport) return null;

  return (
    <div
      className={cn('mb-4 grid grid-cols-1 gap-2', onRematch && canOpenReport && 'sm:grid-cols-2')}
    >
      {onRematch && (
        <button
          type="button"
          data-testid="rematch-same-list"
          onClick={onRematch}
          className={cn(BUTTON, 'bg-neo-yellow text-neo-black')}
        >
          <RotateCcw className="w-5 h-5 shrink-0" aria-hidden />
          {t('education.results.rematch')}
        </button>
      )}

      {canOpenReport && (
        <Link
          href={`/${language}/teacher/reports`}
          data-testid="full-report-link"
          className={cn(BUTTON, 'bg-neo-cyan text-neo-black')}
        >
          <BarChart3 className="w-5 h-5 shrink-0" aria-hidden />
          {t('education.results.fullReport')}
        </Link>
      )}
    </div>
  );
}

export default ResultsPrimaryActions;
