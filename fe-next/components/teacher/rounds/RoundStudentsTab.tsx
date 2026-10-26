'use client';

import { useState } from 'react';
import { Check, X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { accuracyTone, sortRoundRows, TONE_TEXT, type RoundReport, type RoundSortKey } from './roundReport';

/**
 * One grid for the header and every row, so name, words, accuracy and score line up.
 * On phones the words track is only ~80px wide, so the cells wrap inside it instead of
 * spilling over the accuracy and score columns.
 */
const ROW_GRID = 'grid grid-cols-[minmax(4rem,6rem)_minmax(0,1fr)_4rem_2.75rem] items-center gap-x-2 sm:grid-cols-[minmax(6rem,10rem)_minmax(0,1fr)_4.5rem_3.5rem] sm:gap-x-3';
/** Column labels sit in fixed-width tracks: multi-word ones wrap, a single long word (sv "Träffsäkerhet") truncates, so none runs into the next column. */
const HEADER_TEXT = 'min-w-0 break-words leading-tight';
const HEADER_NUM = 'min-w-0 truncate';

const SORT_LABEL_KEYS: Record<RoundSortKey, string> = {
  score: 'teacher.lastGame.score',
  accuracy: 'teacher.classReport.accuracy',
  name: 'teacher.lastGame.student',
};

export interface RoundStudentsTabProps {
  report: RoundReport;
  sortId: string;
  onStudentClick?: (studentId: string, name: string) => void;
}

export function RoundStudentsTab({ report, sortId, onStudentClick }: RoundStudentsTabProps) {
  const { t } = useLanguage();
  const [sortKey, setSortKey] = useState<RoundSortKey>('score');
  const rows = sortRoundRows(report.rows, sortKey);

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-xs font-bold text-neo-white/80">
          <label htmlFor={sortId}>{t('ugc.gallery.sortLabel')}</label>
          <select
            id={sortId}
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as RoundSortKey)}
            className="h-8! min-h-0! rounded-neo border-2 border-neo-black bg-neo-cream px-2 py-0 text-xs! font-black text-neo-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-cyan"
          >
            {(Object.keys(SORT_LABEL_KEYS) as RoundSortKey[]).map((key) => (
              <option key={key} value={key}>{t(SORT_LABEL_KEYS[key])}</option>
            ))}
          </select>
        </span>
        <span className="flex items-center gap-3 text-xs font-bold text-neo-white/80">
          <span className="inline-flex items-center gap-1.5"><span className="grid size-4 place-items-center rounded-[4px] border-2 border-neo-black bg-neo-lime text-neo-black" aria-hidden><Check className="size-3" strokeWidth={3.5} /></span>{t('teacher.lastGame.found')}</span>
          <span className="inline-flex items-center gap-1.5"><span className="grid size-4 place-items-center rounded-[4px] border-2 border-neo-black bg-neo-pink text-neo-black" aria-hidden><X className="size-3" strokeWidth={3.5} /></span>{t('teacher.lastGame.missed')}</span>
        </span>
      </div>

      <div data-testid="round-report-columns" aria-hidden className={cn(ROW_GRID, 'border-b-2 border-neo-cream/20 px-2 pb-1.5 text-[10px] font-black uppercase tracking-normal text-neo-white/70 sm:text-[11px] sm:tracking-wide')}>
        <span className={cn(HEADER_TEXT, 'text-start')}>{t('teacher.lastGame.student')}</span>
        <span className={cn(HEADER_TEXT, 'text-start')}>{t('teacher.lastGame.lessonWords')}</span>
        <span className={cn(HEADER_NUM, 'text-end')} title={t('teacher.classReport.accuracy')}>{t('teacher.classReport.accuracy')}</span>
        <span className={cn(HEADER_NUM, 'text-end')} title={t('teacher.lastGame.score')}>{t('teacher.lastGame.score')}</span>
      </div>

      <ul className="flex flex-col divide-y divide-neo-cream/10">
        {rows.map((row) => {
          const body = (
            <>
              <span className="truncate text-start text-sm font-bold text-neo-white"><bdi>{row.name}</bdi></span>
              <span data-testid="round-report-cells" className="flex min-w-0 flex-wrap gap-0.5 py-1 sm:gap-1" aria-hidden>
                {row.cells.map((cell) => (
                  <span
                    key={cell.word}
                    data-testid="round-report-cell"
                    data-state={cell.state}
                    title={`${cell.word}: ${t(`teacher.lastGame.${cell.state}`)}`}
                    className={cn(
                      'grid size-[18px] shrink-0 place-items-center rounded-[4px] border-2 border-neo-black sm:h-6 sm:w-auto sm:min-w-4 sm:max-w-8 sm:flex-1 sm:rounded-[5px]',
                      cell.state === 'found' ? 'bg-neo-lime text-neo-black' : 'bg-neo-pink text-neo-black',
                    )}
                  >
                    {cell.state === 'found' ? <Check className="size-3 sm:size-3.5" strokeWidth={3.5} /> : <X className="size-3 sm:size-3.5" strokeWidth={3.5} />}
                  </span>
                ))}
              </span>
              <span className={cn('text-end text-sm font-black tabular-nums', TONE_TEXT[accuracyTone(row.accuracyPct)])}><bdi dir="ltr">{row.accuracyPct}%</bdi></span>
              <span className="text-end text-sm font-black tabular-nums text-neo-white"><bdi dir="ltr">{row.score}</bdi></span>
            </>
          );
          return (
            <li key={row.studentId} data-testid="round-report-strip">
              {onStudentClick ? (
                <button
                  type="button"
                  onClick={() => onStudentClick(row.studentId, row.name)}
                  className={cn(ROW_GRID, 'min-h-11 w-full min-w-0 rounded-neo px-2 hover:bg-neo-cream/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-cyan')}
                >
                  {body}
                </button>
              ) : (
                <div className={cn(ROW_GRID, 'min-h-11 min-w-0 px-2')}>{body}</div>
              )}
            </li>
          );
        })}
      </ul>

      {report.absent.length > 0 && (
        <details data-testid="round-report-absent" className="mt-2 rounded-neo border-2 border-dashed border-neo-cream/30 px-3 py-2">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-bold text-neo-white/70">
            <span>{t('teacher.classReport.didNotPlay')}</span>
            <span className="rounded-full bg-neo-cream/15 px-2 text-xs font-black tabular-nums text-neo-white">{report.absent.length}</span>
          </summary>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {report.absent.map((s) => (
              <li key={s.studentId} className="rounded-neo bg-neo-cream/10 px-2 py-0.5 text-xs font-bold text-neo-white/80"><bdi>{s.name}</bdi></li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
