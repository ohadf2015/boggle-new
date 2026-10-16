'use client';

/** Behaviour (XP, coins, game record, exit) stays in the shared results controller so it cannot drift from /multiplayer. */
import { useMemo } from 'react';
import { LogOut, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ResultsFriendStatusProvider } from '@/components/results/ResultsFriendStatus';
import { useMpResultsController, type MpResultsProps } from '@/components/multiplayer/results/useMpResultsController';
import { useOpenLessonPractice } from '@/components/multiplayer/results/useOpenLessonPractice';
import ChestRewardCta from '@/components/education/economy/ChestRewardCta';
import { rewardRoundId } from '@/shared/constants/classroomEconomy';
import RoundShop from '@/components/education/economy/RoundShop';
import { StudentMissedWords } from '@/components/student/live/StudentMissedWords';
import { myMissedWords } from '@/components/student/live/missedWords';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { resultsExitCopy } from '@/lib/multiplayer/resultsExitCopy';
import { EDU_MASCOT } from '@/lib/education/mascotArt';
import type { PlayerResult } from '@/types/components';
import { studentPlacing } from './eduResultsModel';
import { LIVE_KEYFRAMES, PRESS } from './eduLiveStyles';

export type EduStudentResultsProps = MpResultsProps;

export default function EduStudentResults(props: EduStudentResultsProps) {
  return (
    <ResultsFriendStatusProvider>
      <EduStudentResultsInner {...props} />
    </ResultsFriendStatusProvider>
  );
}

function ResultsSkeleton() {
  return (
    <div data-testid="edu-student-results-skeleton" aria-busy="true" className="flex flex-1 flex-col gap-4 bg-neo-navy p-4">
      <div className="mx-auto h-40 w-full max-w-sm animate-pulse rounded-neo-lg border-[3px] border-neo-cream bg-neo-navy-light motion-reduce:animate-none" />
      <div className="mx-auto h-24 w-full max-w-sm animate-pulse rounded-neo-lg border-[3px] border-neo-cream bg-neo-navy-light motion-reduce:animate-none" />
    </div>
  );
}

function EduStudentResultsInner(props: EduStudentResultsProps) {
  const c = useMpResultsController(props);
  const { t } = c;
  const openLessonPractice = useOpenLessonPractice();
  const summary = props.classroomSummary;
  const scores = (c.data.sortedScores as PlayerResult[] | undefined) ?? [];
  const placing = studentPlacing(scores, props.username, summary?.teacherName ?? '');
  const words = useMemo(
    () => [...(c.data.currentPlayerValidWords ?? [])].sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || b.word.length - a.word.length),
    [c.data.currentPlayerValidWords],
  );
  const missed = useMemo(() => myMissedWords(summary, props.username), [summary, props.username]);
  const lessonId = summary?.lessonIds?.[0];
  const exitCopy = resultsExitCopy({ isClassroom: true, isHost: false });

  if (c.isExiting) return <div data-testid="results-exit-wash" className="fixed inset-0 z-[9999] bg-neo-navy" />;

  return (
    <div data-testid="edu-student-results" className="flex min-h-0 flex-1 flex-col overflow-hidden bg-neo-navy text-neo-cream">
      <style>{LIVE_KEYFRAMES}</style>
      <header className="flex shrink-0 justify-end pe-16 ps-4 pt-4">
        <button
          type="button"
          data-testid="edu-student-results-leave"
          onClick={c.requestExit}
          className={cn('inline-flex min-h-11 items-center gap-1.5 rounded-neo border-[3px] border-neo-cream bg-neo-navy-elevated px-3 font-neo-display text-sm font-black uppercase shadow-hard-sm hover:bg-neo-navy-light', PRESS)}
        >
          <LogOut className="size-4" aria-hidden="true" />
          {t('eduLiveRoom.studentResults.leave')}
        </button>
      </header>

      {scores.length === 0 ? (
        <ResultsSkeleton />
      ) : (
        <main className="flex min-h-0 flex-1 flex-col items-center gap-4 overflow-y-auto px-4 py-4">
          <section className="w-full max-w-sm rounded-neo-lg border-4 border-neo-black bg-neo-yellow p-4 text-center text-neo-black shadow-hard-lg motion-safe:animate-[edu-live-pop_220ms_cubic-bezier(0.23,1,0.32,1)_both]">
            <p className="inline-flex items-center gap-1.5 font-neo-display text-base font-black uppercase">
              <Trophy className="size-5" aria-hidden="true" />
              {t('eduLiveRoom.studentResults.placed')}
            </p>
            {placing && (
              <p data-testid="edu-student-rank" className="font-neo-display text-5xl font-black leading-tight">
                {t('eduLiveRoom.studentResults.rankOf', { rank: placing.rank, total: placing.total })}
              </p>
            )}
            <p className="font-neo-body text-lg font-bold">
              <span data-testid="edu-student-score" className="tabular-nums">{(placing?.score ?? 0).toLocaleString()}</span>{' '}
              {t('eduLiveRoom.studentResults.points')}
            </p>
          </section>

          {props.gameCode && (
            <div className="w-full max-w-sm">
              <ChestRewardCta gameCode={props.gameCode} roundId={rewardRoundId(props.gameSessionId, props.gameCode)} />
            </div>
          )}

          <section className="w-full max-w-sm rounded-neo-lg border-[3px] border-neo-cream bg-neo-navy-light p-3 shadow-hard">
            <h2 className="mb-2 font-neo-display text-lg font-black">{t('eduLiveRoom.studentResults.yourWords')}</h2>
            {words.length > 0 ? (
              <ul className="flex flex-wrap gap-1.5">
                {words.map((w) => (
                  <li key={w.word} data-testid="edu-student-word" dir="auto" className="rounded-full border-2 border-neo-black bg-neo-lime px-2.5 py-0.5 font-neo-display text-sm font-black uppercase text-neo-black">
                    {w.word}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="font-neo-body text-sm font-bold text-neo-cream/80">{t('eduLiveRoom.studentResults.noWords')}</p>
            )}
          </section>

          <StudentMissedWords
            words={missed}
            language={props.roomLanguage ?? c.language}
            t={t}
            onPractice={lessonId && missed.length > 0 ? () => openLessonPractice(lessonId) : undefined}
            className="w-full max-w-sm"
          />
          {props.gameCode && (
            <div className="w-full max-w-sm">
              <RoundShop gameCode={props.gameCode} />
            </div>
          )}

          <div className="flex w-full max-w-sm items-center gap-3 rounded-neo-lg border-[3px] border-neo-cream bg-neo-navy-light p-3 shadow-hard">
            {/* eslint-disable-next-line @next/next/no-img-element -- mascot art map path, decorative */}
            <img src={EDU_MASCOT.success} alt="" aria-hidden="true" className="size-14 shrink-0 select-none" />
            <p className="font-neo-body text-base font-bold">{t('eduLiveRoom.studentResults.nextRound')}</p>
          </div>
        </main>
      )}

      <ConfirmationDialog
        open={c.showExitConfirm}
        onOpenChange={c.setShowExitConfirm}
        title={t(exitCopy.titleKey)}
        description={t(exitCopy.bodyKey)}
        confirmText={t('common.confirm')}
        cancelText={t('common.cancel')}
        onConfirm={c.confirmExitRoom}
        variant="default"
        analyticsId="exit_room_confirm"
      />
    </div>
  );
}
