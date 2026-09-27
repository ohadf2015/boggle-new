'use client';

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import type { CellState, ClassReportGrid } from '@/lib/education/classReport';

export interface WordStudentGridProps {
  grid: ClassReportGrid;
  /** Highlighted column, if a drill-down is open. */
  selectedStudentId?: string | null;
  onSelectStudent?: (studentId: string) => void;
}

/**
 * Colour AND glyph AND an accessible name for every cell — a wall of coloured
 * squares is unreadable in greyscale, unreadable to a screen reader, and
 * unreadable to the ~8% of a class with a colour vision deficiency.
 */
const CELL_STYLE: Record<CellState, string> = {
  found: 'bg-neo-lime text-black',
  missed: 'bg-neo-pink text-black',
  absent: 'bg-black/10 text-black/50',
};

/**
 * The report's centre of gravity: lesson words down the side, students across
 * the top, one cell per pair.
 *
 * The word column is frozen with `sticky start-0` (logical, so it pins to the
 * right under Hebrew) because a class of thirty scrolls the names clean off
 * the screen otherwise. The scroll lives on the wrapper, never the page.
 */
export function WordStudentGrid({
  grid,
  selectedStudentId,
  onSelectStudent,
}: WordStudentGridProps) {
  const { t } = useLanguage();

  const stateLabel = (state: CellState): string => {
    if (state === 'absent') return t('teacher.classReport.state.absent');
    const quiz = grid.stateLabelKind === 'quiz';
    if (state === 'found') {
      return quiz ? t('teacher.classReport.state.quizFound') : t('teacher.classReport.state.found');
    }
    return quiz ? t('teacher.classReport.state.quizMissed') : t('teacher.classReport.state.missed');
  };

  return (
    <div>
      {/* Legend — spelled out once, so the glyphs are never a guess. */}
      <ul
        data-testid="report-legend"
        className="flex flex-wrap gap-3 list-none p-0 m-0 mb-2 text-xs font-neo-body font-bold text-black"
      >
        {(['found', 'missed', 'absent'] as const).map((state) => (
          <li key={state} className="inline-flex items-center gap-1.5">
            <span
              aria-hidden
              className={cn(
                'inline-flex h-5 w-5 items-center justify-center rounded-sm border-2 border-black font-black leading-none',
                CELL_STYLE[state]
              )}
            >
              {grid.symbolFor(state)}
            </span>
            {stateLabel(state)}
          </li>
        ))}
      </ul>

      <div
        data-testid="report-grid-scroll"
        className={cn(
          'overflow-x-auto rounded-neo border-3 border-black bg-white',
          // A printed report must show every column, not the first screenful.
          'print:overflow-visible print:border-black print:text-[9px]'
        )}
      >
        {/* `border-separate`, NOT `border-collapse`: a collapsed-border table
            breaks `position: sticky` on its cells in Safari, which would let
            the frozen word column scroll away in exactly the 30-student class
            that made freezing it necessary. Separators are per-cell anyway. */}
        <table className="w-full border-separate border-spacing-0 text-sm font-neo-body">
          <caption className="sr-only">{t('teacher.classReport.title')}</caption>
          <thead>
            <tr className="bg-black text-neo-cream">
              <th
                scope="col"
                className="sticky start-0 z-20 bg-black px-3 py-2 text-start font-black min-w-[7rem]"
              >
                {t('teacher.classReport.word')}
              </th>
              <th scope="col" className="px-2 py-2 text-end font-black whitespace-nowrap">
                {t('teacher.classReport.classMiss')}
              </th>
              {grid.columns.map((col) => (
                <th key={col.studentId} scope="col" className="px-1 py-1 align-bottom">
                  <button
                    type="button"
                    data-testid="report-student-header"
                    data-student-id={col.studentId}
                    aria-pressed={selectedStudentId === col.studentId}
                    onClick={() => onSelectStudent?.(col.studentId)}
                    className={cn(
                      'w-full min-h-[44px] min-w-[3.5rem] max-w-[7rem] px-2 py-1 rounded-neo',
                      'font-black text-xs leading-tight break-words',
                      'hover:bg-neo-lime hover:text-black transition-colors duration-100',
                      'focus:outline-hidden focus-visible:ring-2 focus-visible:ring-neo-lime',
                      selectedStudentId === col.studentId
                        ? 'bg-neo-lime text-black'
                        : 'text-neo-cream',
                      !col.played && 'italic opacity-70'
                    )}
                  >
                    {col.name}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.rows.map((row) => (
              <tr
                key={row.key}
                data-testid="report-row"
                data-word={row.word}
                className="border-t-2 border-black/10 even:bg-black/[0.03]"
              >
                <th
                  scope="row"
                  className={cn(
                    'sticky start-0 z-10 bg-neo-cream px-3 py-2 text-start font-black text-black',
                    'border-e-2 border-black/20 min-w-[7rem]'
                  )}
                >
                  {row.word}
                </th>
                <td
                  data-testid="report-row-total"
                  className={cn(
                    'px-2 py-2 text-end tabular-nums font-bold whitespace-nowrap',
                    row.missPct >= 50 ? 'text-black bg-neo-pink/40' : 'text-black/70'
                  )}
                >
                  {row.missPct}%
                </td>
                {row.cells.map((state, i) => {
                  const col = grid.columns[i];
                  return (
                    <td key={col.studentId} className="p-1 text-center">
                      <span
                        data-testid="report-cell"
                        data-state={state}
                        aria-label={`${col.name}: ${row.word} — ${stateLabel(state)}`}
                        title={`${col.name}: ${row.word} — ${stateLabel(state)}`}
                        className={cn(
                          'inline-flex h-7 w-7 items-center justify-center rounded-sm',
                          'border-2 border-black font-black leading-none',
                          CELL_STYLE[state]
                        )}
                      >
                        {grid.symbolFor(state)}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-3 border-black bg-neo-cream">
              <th
                scope="row"
                className="sticky start-0 z-10 bg-neo-cream px-3 py-2 text-start font-black text-black"
              >
                {t('teacher.classReport.accuracy')}
              </th>
              <td className="px-2 py-2" />
              {grid.columns.map((col) => (
                <td
                  key={col.studentId}
                  data-testid="report-column-total"
                  className="px-1 py-2 text-center tabular-nums font-black text-black text-xs"
                >
                  {col.played ? `${col.accuracyPct}%` : '—'}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

export default WordStudentGrid;
