'use client';

import { useId, useMemo, useState } from 'react';
import { AlertTriangle, BookX, Printer, Target, Users } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { RecentClassroomGame } from '@/lib/supabase/analyticsLastGame';
import { buildClassReportGrid } from '@/lib/education/classReport';
import { missedThisRound } from '@/lib/education/freeGameHeadline';
import { MissedPracticeAction } from '@/components/teacher/reports/MissedPracticeAction';
import { WordStudentGrid } from '@/components/teacher/report/WordStudentGrid';
import { cn } from '@/lib/utils';
import { accuracyTone, activeLineParams, buildRoundReport, roundTitleKey, sortRoundRows, TONE_TEXT } from './roundReport';
import { RoundStudentsTab } from './RoundStudentsTab';
import { RoundWordsTab } from './RoundWordsTab';

const MISSED_SHOWN = 5;

type RoundTab = 'students' | 'words' | 'grid';
const TAB_KEYS: Record<RoundTab, string> = {
  students: 'teacher.dashboard.students',
  words: 'teacher.lastGame.lessonWords',
  grid: 'teacher.classReport.title',
};

// Hides everything but the open round card on paper; visibility, not display, so the card's ancestors still lay it out.
// The card is light-on-navy on screen, and browsers drop backgrounds when printing, so the neutrals are remapped to
// dark-on-white here and the found/missed cells keep their fills.
const PRINT_CSS = `@media print {
  body * { visibility: hidden; }
  [data-round-print], [data-round-print] * { visibility: visible; }
  [data-round-print] {
    position: absolute; inset-inline-start: 0; top: 0; width: 100%;
    --neo-white: 17 17 17; --neo-cream: #d4d4d8; --neo-navy: #fff; --neo-navy-light: #fff;
    background: #fff; box-shadow: none;
  }
  [data-round-print] * { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
}`;

export interface RoundReportCardProps {
  game: RecentClassroomGame;
  hasPro: boolean;
  classroomId: string;
  classroomName: string;
  onStudentClick?: (studentId: string, name: string) => void;
}

export function RoundReportCard({ game, hasPro, classroomId, classroomName, onStudentClick }: RoundReportCardProps) {
  const { t, language } = useLanguage();
  const uid = useId();
  const [tab, setTab] = useState<RoundTab>('students');
  const report = buildRoundReport(game);
  const grid = useMemo(() => buildClassReportGrid({ ...game, absentStudents: [] }), [game]);
  const when = new Date(game.playedAt).toLocaleString(language, { weekday: 'short', hour: 'numeric', minute: '2-digit' });
  const missed = missedThisRound(game).slice(0, MISSED_SHOWN);
  const namesById = new Map(report.rows.map((r) => [r.studentId, r.name]));

  return (
    <article data-testid="round-report" data-round-print="" className="rounded-neo-lg border-2 border-neo-cream/40 bg-neo-navy-light p-4 shadow-hard-sm sm:p-6">
      <style>{PRINT_CSS}</style>
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h3 className="font-neo-display text-xl font-black text-neo-white">
          {t(roundTitleKey(game.gameMode))}
          <span className="ms-2 text-sm font-bold text-neo-white/70">{when}</span>
        </h3>
        <div className="flex items-center gap-3">
          <p data-testid="round-report-played" className="inline-flex items-center gap-1.5 text-sm font-bold text-neo-cyan">
            <Users className="size-4" aria-hidden />
            {t('teacher.windowProgress.activeLine', activeLineParams(game.participation))}
          </p>
          <button
            type="button"
            data-testid="round-report-print"
            onClick={() => window.print()}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-neo border-2 border-neo-cream/40 px-2.5 text-xs font-black text-neo-white hover:border-neo-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-cyan print:hidden"
          >
            <Printer className="size-4" aria-hidden />
            {t('teacher.classReport.print')}
          </button>
        </div>
      </header>
      {game.missedWords.length === 0 ? (
        <section className="mt-3">
          <p className="text-sm font-bold text-neo-white/80">{t('eduLive.results.noLessonTitle')}</p>
          <ul className="mt-2 flex flex-col gap-1">
            {sortRoundRows(report.rows, 'score').map((row) => (
              <li key={row.studentId} data-testid="round-report-player" className="flex min-h-8 items-center justify-between gap-2 px-1 text-sm font-bold text-neo-white">
                <bdi className="truncate">{row.name}</bdi>
                <span className="tabular-nums text-neo-white/80">{row.score}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div data-testid="round-report-accuracy" data-tone={accuracyTone(game.averageAccuracyPct)} className="rounded-neo border-2 border-neo-cream/50 bg-neo-navy p-3 sm:p-4">
              <p className="flex items-center gap-1.5 text-xs font-bold text-neo-white/80">
                <Target className="size-4 shrink-0" aria-hidden />
                {t('teacher.lastGame.avgAccuracy')}
              </p>
              <p className={cn('mt-1 font-neo-display text-3xl font-black tabular-nums leading-none', TONE_TEXT[accuracyTone(game.averageAccuracyPct)])}>{game.averageAccuracyPct}%</p>
              <div aria-hidden className="mt-3 h-1.5 overflow-hidden rounded-full bg-neo-cream/20">
                <div className="h-full rounded-full bg-current" style={{ width: `${Math.min(100, Math.max(0, game.averageAccuracyPct))}%` }} />
              </div>
            </div>
            <div data-testid="round-report-review-count" className="rounded-neo border-2 border-neo-cream/50 bg-neo-navy p-3 sm:p-4">
              <p className="flex items-center gap-1.5 text-xs font-bold text-neo-white/80">
                <BookX className="size-4 shrink-0" aria-hidden />
                {t('academy.student.review')}
              </p>
              <p className={cn('mt-1 font-neo-display text-3xl font-black tabular-nums leading-none', report.practiceWords.length > 0 ? TONE_TEXT.danger : TONE_TEXT.success)}>{report.practiceWords.length}</p>
            </div>
          </div>

          <section className="mt-5">
            <h4 className="mb-2 font-neo-display text-sm font-black uppercase tracking-wide text-neo-white">{t('teacher.lastGame.wordsToReview')}</h4>
            {missed.length === 0 ? (
              <p className="text-sm font-bold text-neo-white/70">{t('teacher.lastGame.nothingToReview')}</p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {missed.map((w) => (
                  <li key={w.word} data-testid="round-report-missed-word" className="rounded-neo border-2 border-neo-black bg-neo-cream px-2.5 py-1 text-sm font-black text-neo-black">
                    <bdi>{w.word}</bdi> <span className="tabular-nums text-neo-black/60">{w.missedBy}/{w.total}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="mt-6">
            <div role="tablist" className="mb-2 flex border-b-2 border-neo-cream/20 print:hidden">
              {(Object.keys(TAB_KEYS) as RoundTab[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  id={`${uid}-tab-${key}`}
                  aria-selected={tab === key}
                  aria-controls={`${uid}-panel`}
                  onClick={() => setTab(key)}
                  className={cn(
                    '-mb-0.5 min-h-10 min-w-0 border-b-2 px-2 font-neo-display text-xs font-black leading-tight sm:px-3 sm:text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-cyan',
                    tab === key ? 'border-neo-lime text-neo-lime' : 'border-transparent text-neo-white/70 hover:text-neo-white',
                  )}
                >
                  {t(TAB_KEYS[key])}
                </button>
              ))}
            </div>
            <div role="tabpanel" id={`${uid}-panel`} aria-labelledby={`${uid}-tab-${tab}`}>
              {tab !== 'students' && grid.mayIncludeUnaskedWords && (
                <p data-testid="round-report-quiz-caveat" role="note" className="mb-2 flex items-start gap-2 rounded-neo border-2 border-neo-black bg-neo-yellow px-3 py-2 text-xs font-bold text-neo-black">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
                  {t('teacher.classReport.quizCaveat')}
                </p>
              )}
              {tab === 'students' && <RoundStudentsTab report={report} sortId={`${uid}-sort`} onStudentClick={onStudentClick} />}
              {tab === 'words' && <RoundWordsTab words={game.missedWords} />}
              {tab === 'grid' && (
                <div className="rounded-neo bg-neo-cream p-2">
                  <WordStudentGrid
                    grid={grid}
                    onSelectStudent={(id) => onStudentClick?.(id, namesById.get(id) ?? '')}
                  />
                </div>
              )}
            </div>
          </section>

          <div data-testid="round-report-footer" className="mt-6 border-t-2 border-neo-cream/20 pt-5 print:hidden">
            <MissedPracticeAction classroomId={classroomId} classroomName={classroomName} locked={!hasPro} words={report.practiceWords} />
          </div>
        </>
      )}
    </article>
  );
}
