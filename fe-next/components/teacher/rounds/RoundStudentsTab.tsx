'use client';

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { sortRoundRows, type RoundReport, type RoundSortKey } from './roundReport';

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
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-xs font-bold text-neo-white/80">
          <label htmlFor={sortId}>{t('ugc.gallery.sortLabel')}</label>
          <select
            id={sortId}
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as RoundSortKey)}
            className="h-8 rounded-neo border-2 border-neo-black bg-neo-cream px-2 py-0 text-xs font-black text-neo-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-cyan"
          >
            {(Object.keys(SORT_LABEL_KEYS) as RoundSortKey[]).map((key) => (
              <option key={key} value={key}>{t(SORT_LABEL_KEYS[key])}</option>
            ))}
          </select>
        </span>
        <span className="flex items-center gap-3 text-xs font-bold text-neo-white/70">
          <span className="inline-flex items-center gap-1"><span className="size-3 rounded-sm border border-neo-black bg-neo-lime" aria-hidden />{t('teacher.lastGame.found')}</span>
          <span className="inline-flex items-center gap-1"><span className="size-3 rounded-sm border border-neo-black bg-neo-pink" aria-hidden />{t('teacher.lastGame.missed')}</span>
        </span>
      </div>

      <ul className="flex flex-col gap-1">
        {rows.map((row) => {
          const body = (
            <>
              <span className="w-24 shrink-0 truncate text-start text-sm font-bold text-neo-white sm:w-32"><bdi>{row.name}</bdi></span>
              <span className="flex min-w-0 flex-1 gap-0.5" aria-hidden>
                {row.cells.map((cell) => (
                  <span
                    key={cell.word}
                    data-testid="round-report-cell"
                    title={`${cell.word}: ${t(`teacher.lastGame.${cell.state}`)}`}
                    className={cn('h-4 min-w-2 flex-1 rounded-sm border border-neo-black', cell.state === 'found' ? 'bg-neo-lime' : 'bg-neo-pink')}
                  />
                ))}
              </span>
              <span className="w-10 shrink-0 text-end text-xs font-black tabular-nums text-neo-lime">{row.accuracyPct}%</span>
              <span className="w-12 shrink-0 text-end text-xs font-black tabular-nums text-neo-white/80">{row.score}</span>
            </>
          );
          return (
            <li key={row.studentId} data-testid="round-report-strip">
              {onStudentClick ? (
                <button
                  type="button"
                  onClick={() => onStudentClick(row.studentId, row.name)}
                  className="flex min-h-9 w-full min-w-0 items-center gap-2 rounded-sm px-1 hover:bg-neo-cream/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-cyan"
                >
                  {body}
                </button>
              ) : (
                <div className="flex min-h-9 min-w-0 items-center gap-2 px-1">{body}</div>
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
