'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { AlertTriangle, ClipboardCopy, Check, Printer, TableProperties, LineChart } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useMounted } from '@/hooks/useMounted';
import { cn } from '@/lib/utils';
import type { RecentClassroomGame } from '@/lib/supabase/analyticsLastGame';
import {
  buildClassReportGrid,
  buildWordTrends,
  buildNotesText,
  studentDrillDown,
  type ClassReportLabels,
} from '@/lib/education/classReport';
import { WordStudentGrid } from './WordStudentGrid';
import { WordTrendStrip } from './WordTrendStrip';
import { StudentDrillDownPanel } from './StudentDrillDownPanel';

/**
 * Print rules, scoped to this component rather than added to `globals.css`,
 * which several builders share.
 *
 * The report is mounted deep inside the teacher dashboard, so a bare
 * `window.print()` would carry the nav, the tab bar, the stat tiles and the
 * Pro section onto the paper. Everything outside the report is hidden with
 * `visibility` rather than `display`, because collapsing an ancestor with
 * `display: none` would take the report down with it.
 */
const PRINT_CSS = `
@media print {
  body * { visibility: hidden; }
  [data-print-root], [data-print-root] * { visibility: visible; }
  [data-print-root] {
    position: absolute;
    inset-inline-start: 0;
    top: 0;
    width: 100%;
  }
  [data-print-root] table { font-size: 9px; }
}
`;

export interface ClassReportSectionProps {
  /** The game the teacher is looking at. */
  game: RecentClassroomGame;
  /** Every recent game of this classroom, newest first — the trend's input. */
  games: RecentClassroomGame[];
  /** Same callback the card's whole-class CTA uses. */
  onCreateReviewLesson?: (words: string[]) => void;
  /** Human-readable mode + timestamp for the copied summary's header. */
  modeLabel?: string;
  playedAtText?: string;
  className?: string;
}

/**
 * "After-game data a teacher can teach from" — the grid, the trend, one
 * student at a time, and a summary that leaves the screen.
 *
 * Free, deliberately: this sits under the existing "Last class game" card,
 * above the Pro gate. The Pro analytics keep the cross-lesson and long-range
 * views; this answers the question a teacher has while the class is still in
 * the room.
 */
export function ClassReportSection({
  game,
  games,
  onCreateReviewLesson,
  modeLabel,
  playedAtText,
  className,
}: ClassReportSectionProps) {
  const { t } = useLanguage();
  const isMounted = useMounted();

  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copyFallback, setCopyFallback] = useState<string | null>(null);

  const grid = useMemo(() => buildClassReportGrid(game), [game]);
  const trends = useMemo(() => buildWordTrends(games), [games]);
  const drill = useMemo(
    () => (selectedStudentId ? studentDrillDown(grid, selectedStudentId) : null),
    [grid, selectedStudentId]
  );

  const notesLabels: ClassReportLabels = useMemo(
    () => ({
      title: t('teacher.classReport.notes.title'),
      playedAt: t('teacher.classReport.notes.playedAt'),
      reteach: t('teacher.classReport.notes.reteach'),
      checkIn: t('teacher.classReport.notes.checkIn'),
      absent: t('teacher.classReport.notes.absent'),
      nobodyFound: t('teacher.classReport.notes.nobodyFound'),
      allFound: t('teacher.classReport.notes.allFound'),
      everyoneOk: t('teacher.classReport.notes.everyoneOk'),
      quizCaveat: t('teacher.classReport.quizCaveat'),
      missedBy: t('teacher.classReport.notes.missedBy'),
      modeLabel,
      playedAtText,
    }),
    [t, modeLabel, playedAtText]
  );

  const handleCopy = useCallback(() => {
    const text = buildNotesText(game, grid, notesLabels);
    // jsdom, http:// origins and locked-down browsers all have no clipboard.
    // Showing the text to copy by hand beats a button that silently does
    // nothing — the summary is the whole point of the button.
    const clipboard = typeof navigator !== 'undefined' ? navigator.clipboard : undefined;
    if (!clipboard?.writeText) {
      setCopyFallback(text);
      return;
    }
    setCopyFallback(null);
    clipboard
      .writeText(text)
      .then(() => {
        if (!isMounted.current) return;
        setCopied(true);
        window.setTimeout(() => {
          if (isMounted.current) setCopied(false);
        }, 2000);
      })
      .catch(() => {
        if (isMounted.current) setCopyFallback(text);
      });
  }, [game, grid, notesLabels, isMounted]);

  const handlePrint = useCallback(() => {
    if (typeof window !== 'undefined' && typeof window.print === 'function') window.print();
  }, []);

  // ==================== EMPTY ====================
  // No columns means nobody played. No rows means the game recorded players
  // but no lesson words — which happens when the backend's lesson-vocabulary
  // lookup fails and it falls back to an empty word set. Either way a header
  // row over an empty body tells a teacher nothing.
  if (grid.columns.length === 0 || grid.rows.length === 0) {
    return (
      <div
        data-testid="report-empty"
        className={cn(
          'rounded-neo border-3 border-dashed border-black/40 bg-neo-cream p-5 text-center',
          className
        )}
      >
        <TableProperties className="w-7 h-7 mx-auto mb-2 text-black/50" aria-hidden />
        <p className="font-neo-display font-black text-black">
          {t('teacher.classReport.empty')}
        </p>
        <p className="font-neo-body text-sm text-black/70 mt-1">
          {t('teacher.classReport.emptyHint')}
        </p>
      </div>
    );
  }

  // ==================== DATA ====================
  return (
    <section
      data-testid="class-report"
      data-print-root=""
      aria-label={t('teacher.classReport.title')}
      className={cn('flex flex-col gap-4 text-start', className)}
    >
      <style data-class-report-print>{PRINT_CSS}</style>

      <header className="flex flex-wrap items-start gap-3">
        <div className="flex-1 min-w-[12rem]">
          <h4 className="font-neo-display font-black text-black text-base leading-tight">
            {t('teacher.classReport.title')}
          </h4>
          <p className="font-neo-body text-sm text-black/70">{t('teacher.classReport.hint')}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <button
            type="button"
            data-testid="report-copy"
            onClick={handleCopy}
            className={cn(
              'inline-flex min-h-[44px] items-center gap-2 px-3 py-2 rounded-neo',
              'border-3 border-black bg-neo-cyan font-neo-body font-black text-black text-sm shadow-hard-sm',
              'hover:-translate-y-0.5 hover:shadow-hard active:translate-y-0.5 active:shadow-hard-pressed',
              'transition-all duration-100 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-black'
            )}
          >
            {copied ? (
              <Check className="w-4 h-4" aria-hidden />
            ) : (
              <ClipboardCopy className="w-4 h-4" aria-hidden />
            )}
            {copied ? t('teacher.classReport.copied') : t('teacher.classReport.copy')}
          </button>

          <button
            type="button"
            data-testid="report-print"
            onClick={handlePrint}
            className={cn(
              'inline-flex min-h-[44px] items-center gap-2 px-3 py-2 rounded-neo',
              'border-3 border-black bg-neo-cream font-neo-body font-black text-black text-sm shadow-hard-sm',
              'hover:-translate-y-0.5 hover:shadow-hard active:translate-y-0.5 active:shadow-hard-pressed',
              'transition-all duration-100 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-black'
            )}
          >
            <Printer className="w-4 h-4" aria-hidden />
            {t('teacher.classReport.print')}
          </button>
        </div>
      </header>

      {/* A quiz asks a fixed number of questions from a possibly larger list,
          and the backend records every unasked word as missed. Never let a
          teacher reteach a word the class was simply never shown. */}
      {grid.mayIncludeUnaskedWords && (
        <p
          data-testid="report-quiz-caveat"
          role="note"
          className="flex items-start gap-2 rounded-neo border-2 border-black bg-neo-cream px-3 py-2 font-neo-body text-sm font-bold text-black"
        >
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden />
          {t('teacher.classReport.quizCaveat')}
        </p>
      )}

      {copyFallback && (
        <label className="flex flex-col gap-1 print:hidden">
          <span className="font-neo-body text-xs font-bold text-black">
            {t('teacher.classReport.copyFallback')}
          </span>
          <textarea
            data-testid="report-copy-fallback"
            readOnly
            rows={6}
            value={copyFallback}
            onFocus={(e) => e.currentTarget.select()}
            className="w-full rounded-neo border-3 border-black bg-white p-2 font-mono text-xs text-black"
          />
        </label>
      )}

      <WordStudentGrid
        grid={grid}
        selectedStudentId={selectedStudentId}
        onSelectStudent={(id) => setSelectedStudentId((prev) => (prev === id ? null : id))}
      />

      {drill && (
        <StudentDrillDownPanel
          drill={drill}
          onClose={() => setSelectedStudentId(null)}
          onCreateReviewLesson={onCreateReviewLesson}
        />
      )}

      <div>
        <h5 className="flex items-center gap-2 font-neo-display font-black text-black text-sm mb-2">
          <LineChart className="w-4 h-4" aria-hidden />
          {t('teacher.classReport.trendTitle')}
        </h5>
        <WordTrendStrip trends={trends} />
      </div>
    </section>
  );
}

export default ClassReportSection;
