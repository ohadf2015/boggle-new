/**
 * The end-of-round actions: one loud, one quiet.
 *
 * Rematch restages the same list in the same room; "Full report" opens the
 * numbers. Rematch is the one loud button; the report sits under it, quieter,
 * because a teacher in front of thirty children reads one button, not eight.
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
import { trackResultsAction } from './trackResultsAction';

export interface ResultsPrimaryActionsProps {
  /** Locale segment for the report href. */
  language: string;
  /** Teacher-only: same list, same code — a new round without a new room. */
  onRematch?: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

export function ResultsPrimaryActions({ language, onRematch, t }: ResultsPrimaryActionsProps) {
  const { hasPro, loading } = useTeacherPro();
  const canOpenReport = hasPro && !loading;

  if (!onRematch && !canOpenReport) return null;

  // Stacked, not side by side: ONE loud action (rematch, full width), and the
  // report under it at half the weight. Two equal buttons in a row made the
  // report as loud as playing again.
  return (
    <div className="mb-4 flex flex-col items-stretch gap-2">
      {onRematch && (
        <button
          type="button"
          data-testid="rematch-same-list"
          onClick={() => {
            trackResultsAction('rematch', 'teacher_card');
            onRematch();
          }}
          className={cn(
            'flex items-center justify-center gap-2 px-4 py-4 font-neo-display font-bold text-lg',
            'bg-neo-yellow text-neo-black border-[3px] border-neo-black rounded-neo',
            'shadow-hard hover:shadow-hard-lg hover:-translate-y-0.5 transition-all'
          )}
        >
          <RotateCcw className="w-6 h-6 shrink-0" aria-hidden />
          {t('education.results.rematch')}
        </button>
      )}

      {canOpenReport && (
        <Link
          href={`/${language}/teacher/reports`}
          data-testid="full-report-link"
          onClick={() => trackResultsAction('view_report', 'teacher_card')}
          className={cn(
            'self-center flex items-center justify-center gap-2 px-3 py-2 font-neo-body font-bold text-sm',
            'bg-neo-cyan text-neo-black border-[2px] border-neo-black rounded-neo',
            'shadow-hard-sm hover:shadow-hard transition-all'
          )}
        >
          <BarChart3 className="w-4 h-4 shrink-0" aria-hidden />
          {t('education.results.fullReport')}
        </Link>
      )}
    </div>
  );
}

export default ResultsPrimaryActions;
