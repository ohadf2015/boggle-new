'use client';

import { Users } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { RecentClassroomGame } from '@/lib/supabase/analyticsLastGame';
import { MissedPracticeAction } from '@/components/teacher/reports/MissedPracticeAction';
import { cn } from '@/lib/utils';
import { buildRoundReport, roundModeLabelKey, type RoundCellState } from './roundReport';


const CELL: Record<Exclude<RoundCellState, 'absent'>, string> = {
  found: 'bg-neo-lime',
  missed: 'bg-neo-pink',
};

const MISSED_SHOWN = 5;

export interface RoundReportCardProps {
  game: RecentClassroomGame;
  hasPro: boolean;
  classroomId: string;
  classroomName: string;
  onStudentClick?: (studentId: string, name: string) => void;
}

export function RoundReportCard({ game, hasPro, classroomId, classroomName, onStudentClick }: RoundReportCardProps) {
  const { t, language } = useLanguage();
  const report = buildRoundReport(game);
  const modeKey = roundModeLabelKey(game.gameMode);
  const when = new Date(game.playedAt).toLocaleString(language, { weekday: 'short', hour: 'numeric', minute: '2-digit' });
  const missed = game.missedWords.filter((w) => w.missedBy > 0).slice(0, MISSED_SHOWN);

  return (
    <article data-testid="round-report" className="rounded-neo border-2 border-neo-cream/40 bg-neo-navy-light p-3 shadow-hard-sm sm:p-4">
      <header className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 className="font-neo-display text-lg font-black text-neo-white">
          {modeKey ? t(modeKey) : game.gameMode}
          <span className="ms-2 text-sm font-bold text-neo-white/60">{when}</span>
        </h3>
        <p data-testid="round-report-played" className="inline-flex items-center gap-1.5 text-sm font-bold text-neo-cyan">
          <Users className="size-4" aria-hidden />
          {t('teacher.rounds.played', { played: game.participation.played, roster: game.participation.roster })}
        </p>
      </header>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-neo border-2 border-neo-black bg-neo-navy px-3 py-2">
          <p className="font-neo-display text-2xl font-black tabular-nums text-neo-lime">{game.averageAccuracyPct}%</p>
          <p className="text-xs font-bold text-neo-white/70">{t('teacher.lastGame.avgAccuracy')}</p>
        </div>
        <div className="rounded-neo border-2 border-neo-black bg-neo-navy px-3 py-2">
          <p className="font-neo-display text-2xl font-black tabular-nums text-neo-pink">{report.practiceWords.length}</p>
          <p className="text-xs font-bold text-neo-white/70">{t('teacher.rounds.wordsMissed')}</p>
        </div>
      </div>

      <section className="mt-3">
        <h4 className="mb-1.5 font-neo-display text-sm font-black uppercase tracking-wide text-neo-white">{t('teacher.lastGame.wordsToReview')}</h4>
        {missed.length === 0 ? (
          <p className="text-sm font-bold text-neo-white/70">{t('teacher.lastGame.nothingToReview')}</p>
        ) : (
          <ul className="flex flex-wrap gap-1.5">
            {missed.map((w) => (
              <li key={w.word} data-testid="round-report-missed-word" className="rounded-neo border-2 border-neo-black bg-neo-cream px-2 py-0.5 text-sm font-black text-neo-black">
                <bdi>{w.word}</bdi> <span className="tabular-nums text-neo-black/60">{w.missedBy}/{w.total}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-3">
        <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
          <h4 className="font-neo-display text-sm font-black uppercase tracking-wide text-neo-white">{t('teacher.rounds.participants')}</h4>
          <span className="flex items-center gap-3 text-xs font-bold text-neo-white/70">
            <span className="inline-flex items-center gap-1"><span className="size-3 rounded-sm border border-neo-black bg-neo-lime" aria-hidden />{t('teacher.lastGame.found')}</span>
            <span className="inline-flex items-center gap-1"><span className="size-3 rounded-sm border border-neo-black bg-neo-pink" aria-hidden />{t('teacher.lastGame.missed')}</span>
          </span>
        </div>
        <ul className="flex flex-col gap-1">
          {report.rows.map((row) => {
            const body = (
              <>
                <span className="w-24 shrink-0 truncate text-start text-sm font-bold text-neo-white"><bdi>{row.name}</bdi></span>
                {row.absent ? (
                  <span className="min-w-0 flex-1 text-start text-xs font-bold italic text-neo-white/60">{t('teacher.rounds.absent')}</span>
                ) : (
                  <span className="flex min-w-0 flex-1 gap-0.5" aria-hidden>
                    {row.cells.map((cell) => (
                      <span
                        key={cell.word}
                        data-testid="round-report-cell"
                        title={`${cell.word}: ${t(`teacher.lastGame.${cell.state}`)}`}
                        className={cn('h-4 min-w-2 flex-1 rounded-sm border border-neo-black', CELL[cell.state as 'found' | 'missed'])}
                      />
                    ))}
                  </span>
                )}
                <span className="w-12 shrink-0 text-end text-xs font-black tabular-nums text-neo-white/80">
                  {row.absent ? '—' : row.score}
                </span>
              </>
            );
            return (
              <li key={row.studentId} data-testid="round-report-strip">
                {onStudentClick && !row.absent ? (
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
      </section>

      <div className="mt-3">
        <MissedPracticeAction classroomId={classroomId} classroomName={classroomName} locked={!hasPro} words={report.practiceWords} />
      </div>
    </article>
  );
}
