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
import { trackResultsAction, type ResultsSurface } from './trackResultsAction';
import { UnlockReportUpgradeCta } from './UnlockReportUpgradeCta';

/**
 * Two whole class strings (one per tone), held apart so neither can inherit the
 * other's fill: quiet = unfilled cream edge on the dark wall; loud = the
 * original cyan chip with a black edge.
 */
const QUIET_LINK =
  'self-center flex items-center justify-center gap-1.5 px-2.5 py-1 font-neo-body font-bold text-xs text-neo-cream/85 rounded-neo border-[2px] border-neo-cream/50 hover:text-neo-cream hover:border-neo-cream transition-colors';
const LOUD_LINK =
  'self-center flex items-center justify-center gap-2 px-3 py-2 font-neo-body font-bold text-sm bg-neo-cyan text-neo-black border-[2px] border-neo-black rounded-neo shadow-hard-sm hover:shadow-hard transition-all';

export interface ResultsPrimaryActionsProps {
  /** Locale segment for the report href. */
  language: string;
  /** Teacher-only: same list, same code — a new round without a new room. */
  onRematch?: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  /**
   * Where the tap is counted. The phone card is the default. The projector
   * recap passes `projector` and omits `onRematch` — that wall already has
   * its own Rematch button.
   */
  surface?: ResultsSurface;
  /** Presentation only — see `UnlockReportUpgradeCta`'s `tone`. */
  tone?: 'default' | 'quiet';
}

export function ResultsPrimaryActions({
  language,
  onRematch,
  t,
  surface = 'teacher_card',
  tone = 'default',
}: ResultsPrimaryActionsProps) {
  const { hasPro, loading } = useTeacherPro();
  const canOpenReport = hasPro && !loading;
  const showUpgrade = !loading && !hasPro;

  if (!onRematch && !canOpenReport && !showUpgrade) return null;

  // Stacked, not side by side: ONE loud action (rematch, full width), and the
  // report under it at half the weight. Two equal buttons in a row made the
  // report as loud as playing again.
  return (
    <div className={tone === 'quiet' ? 'flex flex-col items-stretch gap-2' : 'mb-4 flex flex-col items-stretch gap-2'}>
      {onRematch && (
        <button
          type="button"
          data-testid="rematch-same-list"
          onClick={() => {
            trackResultsAction('rematch', surface);
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
          onClick={() => trackResultsAction('view_report', surface)}
          className={cn(
            tone === 'quiet'
              ? QUIET_LINK
              : LOUD_LINK
          )}
        >
          <BarChart3 className="w-4 h-4 shrink-0" aria-hidden />
          {t('education.results.fullReport')}
        </Link>
      )}

      {showUpgrade ? (
        <UnlockReportUpgradeCta language={language} t={t} surface={surface} tone={tone} />
      ) : null}
    </div>
  );
}

export default ResultsPrimaryActions;
