'use client';

/** Behaviour (XP, coins, game record, exit) stays in the shared results controller so it cannot drift from /multiplayer. */
import { ResultsSocialSlot } from '@/components/results/ResultsSocialSlot';
import { classroomRival } from '@/lib/rivals/pickers';
import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useReducedMotion } from 'framer-motion';
import { LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ResultsFriendStatusProvider } from '@/components/results/ResultsFriendStatus';
import { useMpResultsController, type MpResultsProps } from '@/components/multiplayer/results/useMpResultsController';
import { useOpenLessonPractice } from '@/components/multiplayer/results/useOpenLessonPractice';
import { useRoundReward } from '@/components/education/economy/useRoundReward';
import { rewardRoundId } from '@/shared/constants/classroomEconomy';
import RoundShop from '@/components/education/economy/RoundShop';
import { StudentRevealHero } from '@/components/education/results/StudentRevealHero';
import { StudentChestBeat } from '@/components/education/results/StudentChestBeat';
import { StudentRoundPair, StudentWaitBar } from '@/components/education/results/StudentRoundPair';
import { useStudentReveal } from '@/components/education/results/useStudentReveal';
import { STUDENT_REVEAL_FINAL, studentVerdict } from '@/components/education/results/studentReveal';
import { HardestWordsInsight } from '@/components/education/results/HardestWordsInsight';
import { roundHardestWords } from '@/components/education/results/roundHardestWords';
import { lessonWordsLanded } from '@/components/education/results/lessonTally';
import { StudentMissedWords } from '@/components/student/live/StudentMissedWords';
import { myMissedWords } from '@/components/student/live/missedWords';
import { deckCardsFor, useStudyDeck } from '@/lib/education/studyDeckStore';
import { BossOutcomeCard } from '@/components/education/boss/BossOutcomeCard';
import { StudentMomentumChips } from '@/components/education/results/StudentRoundOutcome';
import { useSessionRoundHistory } from '@/hooks/useSessionRoundHistory';
import { sessionKeyFor } from '@/lib/education/roundEndHistory';
import { classSwept } from '@/lib/education/roundEndSweep';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { resultsExitCopy } from '@/lib/multiplayer/resultsExitCopy';
import type { PlayerResult } from '@/types/components';
import { studentGap, studentPlacing } from './eduResultsModel';
import { missedDefinitions } from './EduMissedRecall';
import { EduStudentResultsMore } from './EduStudentResultsMore';
import { EduStudentResultsPractice, missedPracticeKind } from './EduStudentResultsPractice';
import { useRival } from './useRival';
import { EduStudentShareButton } from './EduStudentShareButton';
import { EduStudentClassGoal, EduStudentXpBar } from './EduStudentProgress';
import { LIVE_KEYFRAMES, PRESS } from './eduLiveStyles';
import { useClaimedLevelUp } from './useClaimedLevelUp';
import { AcademyBackdrop } from '@/components/student/academy/AcademyBackdrop';
import { classModeBridgeOffer } from '@/lib/education/classModeBridge';
import { ClassModeBridgeCard } from '@/components/education/results/ClassModeBridgeCard';

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
      <div className="h-48 w-full max-w-sm animate-pulse rounded-neo-lg border-4 border-neo-cream/50 bg-neo-navy-light motion-reduce:animate-none" />
      <div className="h-24 w-full max-w-sm animate-pulse rounded-neo-lg border-[3px] border-neo-cream/50 bg-neo-navy-light motion-reduce:animate-none" />
      <div className="h-24 w-full max-w-sm animate-pulse rounded-neo-lg border-[3px] border-neo-cream/50 bg-neo-navy-light motion-reduce:animate-none" />
    </div>
  );
}

const COLUMN = 'w-full max-w-xl';

function EduStudentResultsInner(props: EduStudentResultsProps) {
  const c = useMpResultsController(props);
  const { t } = c;
  const reduceMotion = !!useReducedMotion();
  const summary = props.classroomSummary;
  const teacher = summary?.teacherName ?? '';
  const scores = (c.data.sortedScores as PlayerResult[] | undefined) ?? [];
  const placing = studentPlacing(scores, props.username, teacher);
  const gap = studentGap(scores, props.username, teacher);
  const { rivalOutcome } = useRival(props.socket as Parameters<typeof useRival>[0]);
  const words = useMemo(
    () => [...(c.data.currentPlayerValidWords ?? [])].sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || b.word.length - a.word.length),
    [c.data.currentPlayerValidWords],
  );
  // A quiz round's words carry no per-word points; a "+0" best word would read as a mistake.
  const best = words[0] && (words[0].score ?? 0) > 0 ? { word: words[0].word, score: words[0].score ?? 0 } : null;
  const mastery = summary?.masteryByPlayer?.[props.username];
  const lesson = typeof mastery?.found === 'number' && typeof mastery?.total === 'number' ? { found: mastery.found, total: mastery.total } : null;
  const missed = useMemo(() => myMissedWords(summary, props.username), [summary, props.username]);
  const deck = useStudyDeck((state) => deckCardsFor(state, props.gameCode));
  const definitions = useMemo(() => missedDefinitions(missed, deck), [missed, deck]);
  const practiceKind = missedPracticeKind(missed, deck);
  const [practising, setPractising] = useState(false);
  const showPractice = practising && !!practiceKind;
  if (practising && !practiceKind) setPractising(false);
  const lessonId = summary?.lessonIds?.[0];
  const openLessonPractice = useOpenLessonPractice();
  const scrollRef = useRef<HTMLElement>(null);
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
  const beat = useStudentReveal(reduceMotion);
  const reveal = useRoundReward(props.gameCode || null, rewardRoundId(props.gameSessionId, props.gameCode));
  const [claimedLevelUp, releaseLevelUp] = useClaimedLevelUp();
  // The level-up overlay waits for the chest to settle, so it reads as the last payoff, not an interruption.
  const levelUp = beat === STUDENT_REVEAL_FINAL ? claimedLevelUp : null;
  const verdict = placing ? studentVerdict({ ...placing, rivalDiff: rivalOutcome?.diff ?? null, gapKind: gap?.kind ?? null }) : 'lost';
  const classFound = summary?.classFoundCount;
  const classTotal = typeof classFound === 'number' ? (summary?.totalWords ?? 0) : 0;
  const hardest = useMemo(() => (summary && lessonWordsLanded(summary) ? roundHardestWords(summary) : []), [summary]);
  const bridge = classModeBridgeOffer({
    isTeacher: false,
    classId: summary?.classroomId,
    teacherName: teacher,
    rank: placing?.rank ?? null,
    hideRank: false,
    locale: c.language,
  });

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [showPractice]);

  if (c.isExiting) return <div data-testid="results-exit-wash" className="fixed inset-0 z-[9999] bg-neo-navy" />;

  return (
    <div data-testid="edu-student-results" className="relative isolate flex min-h-0 flex-1 flex-col overflow-hidden bg-neo-navy text-neo-cream">
      <AcademyBackdrop art="podium" />
      <style>{LIVE_KEYFRAMES}</style>
      <header className="flex shrink-0 items-center justify-end gap-2 pe-16 ps-4 pt-1.5">
        <EduStudentShareButton t={t} language={c.language} placing={placing} />
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
        <main
          ref={scrollRef}
          data-testid="edu-student-results-scroll"
          className="flex min-h-0 flex-1 flex-col items-center gap-3 overflow-y-auto px-4 pb-6 pt-1.5"
        >
          {showPractice && practiceKind && (
            <EduStudentResultsPractice kind={practiceKind} missed={missed} deck={deck} username={props.username} onBack={() => setPractising(false)} t={t} />
          )}

          {/* Hidden, not unmounted: the chest reveal must not replay when the student comes back. */}
          <div hidden={showPractice} className={showPractice ? undefined : 'contents'}>
            {placing && (
              <div className={COLUMN}>
                <StudentRevealHero
                  rank={placing.rank}
                  total={placing.total}
                  score={placing.score}
                  verdict={verdict}
                  beat={beat}
                  rival={rivalOutcome}
                  gap={gap}
                  reduceMotion={reduceMotion}
                  chest={reveal ? <StudentChestBeat reveal={reveal} beat={beat} reduceMotion={reduceMotion} t={t} /> : null}
                  t={t}
                />
              </div>
            )}

            <BossOutcomeCard size="phone" density="compact" className={cn(COLUMN, 'rounded-neo-lg border-[3px] border-neo-cream/50 shadow-hard-lg')} />

            {(summary?.coverage?.length ?? 0) > 0 && (
              <div className={COLUMN}>
                <StudentMissedWords words={missed} definitions={definitions} language={props.roomLanguage ?? c.language} t={t} className="w-full" />
              </div>
            )}

            {props.gameCode && (
              <div className={COLUMN}>
                <RoundShop compact gameCode={props.gameCode} />
              </div>
            )}

            <div className={COLUMN}>
              <EduStudentResultsMore words={words} t={t}>
                <StudentRoundPair bestWord={best} lesson={lesson} t={t} />
                {xpGained && xpGained.newTotalXp > 0 && <EduStudentXpBar totalXp={xpGained.newTotalXp} />}
                {(classTotal > 0 || momentum) && (
                  <div className="flex flex-wrap gap-1.5">
                    {classTotal > 0 && <EduStudentClassGoal found={classFound ?? 0} total={classTotal} t={t} />}
                    {momentum && <StudentMomentumChips momentum={momentum} t={t} className="contents" />}
                  </div>
                )}
                {hardest.length > 0 && <HardestWordsInsight words={hardest} t={t} />}
                <ResultsSocialSlot mode="edu" score={placing?.score} rival={classroomRival(scores.filter((s) => s.username !== teacher), props.username)} />
                {bridge && <ClassModeBridgeCard offer={bridge} />}
              </EduStudentResultsMore>
            </div>
          </div>
        </main>
      )}

      {scores.length > 0 && (
        <footer data-testid="edu-student-results-bar" className="flex shrink-0 justify-center border-t-2 border-neo-cream/50 px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2.5">
          <div className={COLUMN}>
            <StudentWaitBar onPractice={practiceKind ? (showPractice ? undefined : () => setPractising(true)) : lessonId && missed.length > 0 ? () => openLessonPractice(lessonId) : undefined} t={t} />
          </div>
        </footer>
      )}

      <LevelUpCelebration levelUpData={levelUp} onClose={() => { releaseLevelUp(); c.socketEvents?.setShowLevelUpCelebration(false); }} />

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
