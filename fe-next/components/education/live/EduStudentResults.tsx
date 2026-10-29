'use client';

/** Behaviour (XP, coins, game record, exit) stays in the shared results controller so it cannot drift from /multiplayer. */
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { useReducedMotion } from 'framer-motion';
import { LogOut, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ResultsFriendStatusProvider } from '@/components/results/ResultsFriendStatus';
import { useMpResultsController, type MpResultsProps } from '@/components/multiplayer/results/useMpResultsController';
import { useOpenLessonPractice } from '@/components/multiplayer/results/useOpenLessonPractice';
import ChestRewardCta from '@/components/education/economy/ChestRewardCta';
import { rewardRoundId } from '@/shared/constants/classroomEconomy';
import RoundShop from '@/components/education/economy/RoundShop';
import { StudentMissedWords } from '@/components/student/live/StudentMissedWords';
import { myMissedWords } from '@/components/student/live/missedWords';
import { BossOutcomeCard } from '@/components/education/boss/BossOutcomeCard';
import { StudentMomentumChips } from '@/components/education/results/StudentRoundOutcome';
import { useSessionRoundHistory } from '@/hooks/useSessionRoundHistory';
import { sessionKeyFor } from '@/lib/education/roundEndHistory';
import { classSwept } from '@/lib/education/roundEndSweep';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { resultsExitCopy } from '@/lib/multiplayer/resultsExitCopy';
import type { PlayerResult } from '@/types/components';
import { studentGap, studentPlacing } from './eduResultsModel';
import { EduStudentHero } from './EduStudentHero';
import { EduStudentNextStep } from './EduStudentNextStep';
import { EduStudentClassGoal, EduStudentWaitNext, EduStudentXpBar } from './EduStudentProgress';
import { LIVE_KEYFRAMES, PRESS } from './eduLiveStyles';

const LevelUpCelebration = dynamic(() => import('@/components/education/LevelUpCelebration'), { ssr: false });

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
    <div data-testid="edu-student-results-skeleton" aria-busy="true" className="flex flex-1 flex-col items-center gap-4 bg-neo-navy p-4">
      <div className="h-48 w-full max-w-sm animate-pulse rounded-neo-lg border-4 border-neo-cream/40 bg-neo-navy-light motion-reduce:animate-none" />
      <div className="h-24 w-full max-w-sm animate-pulse rounded-neo-lg border-[3px] border-neo-cream/40 bg-neo-navy-light motion-reduce:animate-none" />
      <div className="h-24 w-full max-w-sm animate-pulse rounded-neo-lg border-[3px] border-neo-cream/40 bg-neo-navy-light motion-reduce:animate-none" />
    </div>
  );
}

/** Each block arrives a beat after the one above it: a short transform-only pop, never an opacity fade (Class 5). */
function Beat({ index, children, className }: { index: number; children: ReactNode; className?: string }) {
  return (
    <div
      className={cn('w-full max-w-sm motion-safe:animate-[edu-live-pop_240ms_cubic-bezier(0.23,1,0.32,1)_both]', className)}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {children}
    </div>
  );
}

/** The level-up beat waits for my own card to land first, so it reads as the payoff, not an interruption. */
const HERO_LAND_MS = 700;

function useHeroLanded(reduceMotion: boolean): boolean {
  const [landed, setLanded] = useState(reduceMotion);
  useEffect(() => {
    if (landed) return;
    const id = setTimeout(() => setLanded(true), HERO_LAND_MS);
    return () => clearTimeout(id);
  }, [landed]);
  return landed;
}

function EduStudentResultsInner(props: EduStudentResultsProps) {
  const c = useMpResultsController(props);
  const { t } = c;
  const reduceMotion = !!useReducedMotion();
  const openLessonPractice = useOpenLessonPractice();
  const summary = props.classroomSummary;
  const teacher = summary?.teacherName ?? '';
  const scores = (c.data.sortedScores as PlayerResult[] | undefined) ?? [];
  const placing = studentPlacing(scores, props.username, teacher);
  const gap = studentGap(scores, props.username, teacher);
  const words = useMemo(
    () => [...(c.data.currentPlayerValidWords ?? [])].sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || b.word.length - a.word.length),
    [c.data.currentPlayerValidWords],
  );
  const best = words[0] ? { word: words[0].word, score: words[0].score ?? 0 } : null;
  const mastery = summary?.masteryByPlayer?.[props.username];
  const lesson = typeof mastery?.found === 'number' && typeof mastery?.total === 'number' ? { found: mastery.found, total: mastery.total } : null;
  const missed = useMemo(() => myMissedWords(summary, props.username), [summary, props.username]);
  const lessonId = summary?.lessonIds?.[0];
  const exitCopy = resultsExitCopy({ isClassroom: true, isHost: false });
  // The same session story the /multiplayer card banks, under the same key: only one of the two ever mounts on a phone.
  const { momentum } = useSessionRoundHistory({
    sessionKey: summary ? sessionKeyFor(summary) : '',
    score: placing?.score ?? 0,
    rank: placing?.rank ?? 0,
    players: placing?.total ?? 0,
    sweep: summary
      ? classSwept({ totalWords: summary.totalWords, classFoundCount: summary.classFoundCount, neverPlacedCount: summary.neverPlacedWords ? new Set(summary.neverPlacedWords.map((w) => w.toLowerCase())).size : undefined })
      : false,
    ready: !!summary && !!placing,
  });
  const xpGained = c.socketEvents?.xpGainedData ?? null;
  const heroLanded = useHeroLanded(reduceMotion);
  const levelUp = heroLanded && c.socketEvents?.showLevelUpCelebration ? c.socketEvents.levelUpData : null;
  const classFound = summary?.classFoundCount;
  const classTotal = typeof classFound === 'number' ? (summary?.totalWords ?? 0) : 0;
  let beat = 0;

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
        <main className="flex min-h-0 flex-1 flex-col items-center gap-4 overflow-y-auto px-4 pb-6 pt-3">
          {placing && (
            <Beat index={beat++}>
              <EduStudentHero
                rank={placing.rank}
                total={placing.total}
                score={placing.score}
                bestWord={best}
                lesson={lesson}
                xp={xpGained?.xpEarned ?? null}
                coins={c.sideEffects?.coinReward?.awarded ?? null}
                gap={gap}
                reduceMotion={reduceMotion}
                t={t}
              />
              {momentum && <StudentMomentumChips momentum={momentum} t={t} className="mt-3" />}
              {xpGained && xpGained.newTotalXp > 0 && <div className="mt-3"><EduStudentXpBar totalXp={xpGained.newTotalXp} /></div>}
              {classTotal > 0 && (
                <div className="mt-3 flex justify-center">
                  <EduStudentClassGoal found={classFound ?? 0} total={classTotal} t={t} />
                </div>
              )}
            </Beat>
          )}

          <BossOutcomeCard size="phone" className="w-full max-w-sm" />

          <Beat index={beat++}>
            <EduStudentNextStep
              t={t}
              language={c.language}
              placing={placing}
              onPractice={lessonId && missed.length > 0 ? () => openLessonPractice(lessonId) : undefined}
            />
          </Beat>

          <Beat index={beat++}>
            <EduStudentWaitNext username={props.username} t={t} />
          </Beat>

          {props.gameCode && (
            <Beat index={beat++}>
              <ChestRewardCta quiet gameCode={props.gameCode} roundId={rewardRoundId(props.gameSessionId, props.gameCode)} />
            </Beat>
          )}

          <Beat index={beat++}>
            <StudentMissedWords words={missed} language={props.roomLanguage ?? c.language} t={t} className="w-full" />
          </Beat>

          <Beat index={beat++}>
            <section className="rounded-neo-lg border-[3px] border-neo-cream bg-neo-navy-elevated p-3 shadow-hard">
              <h2 className="mb-2 flex items-baseline justify-between gap-2 font-neo-display text-lg font-black">
                {t('eduLiveRoom.studentResults.yourWords')}
                {words.length > 0 && <span className="font-neo-body text-sm font-bold tabular-nums text-neo-cream/70">{words.length}</span>}
              </h2>
              {words.length > 0 ? (
                <ul className="flex flex-wrap gap-1.5">
                  {words.map((w, i) => (
                    <li
                      key={w.word}
                      data-testid="edu-student-word"
                      dir="auto"
                      className={cn(
                        'inline-flex items-center gap-1 rounded-full border-2 border-neo-black px-2.5 py-0.5 font-neo-display text-sm font-black uppercase text-neo-black',
                        i === 0 ? 'bg-neo-yellow shadow-hard-sm' : 'bg-neo-lime'
                      )}
                    >
                      {i === 0 && <Star className="size-3.5 fill-neo-black" aria-hidden="true" />}
                      {w.word}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="font-neo-body text-sm font-bold text-neo-cream/80">{t('eduLiveRoom.studentResults.noWords')}</p>
              )}
            </section>
          </Beat>

          {props.gameCode && (
            <Beat index={beat++}>
              <RoundShop compact gameCode={props.gameCode} />
            </Beat>
          )}
        </main>
      )}

      <LevelUpCelebration levelUpData={levelUp} onClose={() => c.socketEvents?.setShowLevelUpCelebration(false)} />

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
