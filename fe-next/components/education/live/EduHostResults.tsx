'use client';

/**
 * The /education/live projector at round end: its own screen (the rebuild gives the live route its own
 * lobby and results), built from the shared round-end pieces: the staged podium, the winner bar, the
 * class's numbers, the words still to teach, the boss verdict, the "See who struggled" Pro preview and the
 * Teacher Pro trial / school quote card.
 * Mounts only in the host tree, so no student sees the report or the upsell; z-[75] clears the lobby's
 * z-[65]. Dark-only and painted from frame one: the reveal only swaps what is written inside (Class 5).
 */
import { LogOut, RotateCcw, Shuffle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import type { ClassroomTvResultsScreenProps } from '@/host/components/tv-results/ClassroomTvResultsScreen';
import { BossOutcomeCard } from '@/components/education/boss/BossOutcomeCard';
import { useClassroomBossStore } from '@/stores/classroomBossStore';
import { PodiumStage } from '@/components/education/results/PodiumStage';
import { ClassChest } from '@/components/education/results/ClassChest';
import { WinnerSpotlight } from '@/components/education/results/WinnerSpotlight';
import { CelebrationLoop } from '@/components/education/results/CelebrationLoop';
import { ClassPulse } from '@/components/education/results/ClassPulse';
import { TvCoveragePanel } from '@/components/education/results/TvCoveragePanel';
import { TvRecapHeader } from '@/components/education/results/TvRecapHeader';
import { StrugglePreview } from '@/components/education/results/StrugglePreview';
import { ResultsTeacherProTrialCard } from '@/components/education/results/ResultsTeacherProTrialCard';
import { ZeroRoundNote } from '@/components/education/results/ZeroRoundNote';
import { TeacherInviteNudge, showTeacherInvite } from '@/components/education/results/TeacherInviteNudge';
import { EmptyRoundCard } from '@/components/education/results/EmptyRoundCard';
import { useRoundEndReveal } from '@/components/education/results/useRoundEndReveal';
import { useIsPhoneRecap } from '@/components/education/results/useIsPhoneRecap';
import { buildTvRecap } from '@/components/education/results/tvRecapModel';
import { trackResultsAction } from '@/components/education/results/trackResultsAction';
import { isRevealed } from '@/lib/education/roundEndStage';
import { classSwept } from '@/lib/education/roundEndSweep';
import { useSearchParams } from 'next/navigation';
import { getSharedSocketIfExists } from '@/utils/SocketContext';
import { PRESS, PRIMARY_BUTTON, SECONDARY_BUTTON, type Translate } from './eduLiveStyles';
import { EduReteachPanel } from './EduReteachPanel';
import { reteachVerdict, studentsUnderHalf } from './eduReteachModel';
import { useReplayMissedWords } from './useReteachRound';

function Actions({ t, onRematch, onClose, onExitRoom }: Pick<ClassroomTvResultsScreenProps, 'onRematch' | 'onClose' | 'onExitRoom'> & { t: Translate }) {
  return (
    <div data-testid="edu-results-actions" className="flex shrink-0 flex-col gap-2 max-lg:order-first lg:gap-3">
      {onRematch && (
        <button
          type="button"
          data-testid="edu-results-play-again"
          onClick={() => {
            trackResultsAction('rematch', 'projector');
            onRematch();
          }}
          className={cn(PRIMARY_BUTTON, PRESS, 'min-h-16 w-full px-6 py-3 text-2xl lg:text-3xl 2xl:min-h-20 2xl:text-4xl')}
        >
          <RotateCcw className="size-[0.9em]" aria-hidden="true" />
          {t('eduLiveRoom.hostResults.playAgain')}
        </button>
      )}
      {(onClose || onExitRoom) && (
        <div className="grid grid-cols-2 gap-2 lg:gap-3">
          {onClose && (
            <button type="button" data-testid="edu-results-next-mode" onClick={onClose} className={cn(SECONDARY_BUTTON, PRESS, '2xl:text-base')}>
              <Shuffle className="size-4" aria-hidden="true" />
              {t('eduLiveRoom.hostResults.nextMode')}
            </button>
          )}
          {onExitRoom && (
            <button type="button" data-testid="edu-results-end" onClick={onExitRoom} className={cn(SECONDARY_BUTTON, PRESS, '2xl:text-base')}>
              <LogOut className="size-4" aria-hidden="true" />
              {t('eduLiveRoom.hostResults.endGame')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function EduHostResults({ summary, players, t, onRematch, onClose, onExitRoom, gameCode: roomCode, socket }: ClassroomTvResultsScreenProps) {
  const { language } = useLanguage();
  const phone = useIsPhoneRecap();
  const { podium, outcome, landed, stats } = buildTvRecap(summary, players, t);
  const bossStatus = useClassroomBossStore((s) => s.view?.status);
  const bossOver = bossStatus === 'defeated' || bossStatus === 'escaped';
  // A boss round's points can all be zero while the class dealt real damage: then the boss card is the story.
  const showPodium = podium.length > 0 && !(bossOver && !outcome.celebrate);
  const hasStage = showPodium || (outcome.kind === 'empty' && !bossOver);
  const stage = useRoundEndReveal(outcome.celebrate);
  const winnerBeat = outcome.celebrate && isRevealed(1, stage);
  const neverPlaced = new Set((summary.neverPlacedWords ?? []).map((w) => w.toLowerCase()));
  const swept = classSwept({
    totalWords: summary.totalWords,
    classFoundCount: summary.classFoundCount,
    neverPlacedCount: summary.neverPlacedWords ? neverPlaced.size : undefined,
  });
  const roomParam = useSearchParams()?.get('room') ?? null;
  const gameCode = roomCode || roomParam;
  const reteach = useReplayMissedWords({ summary, gameCode, socket: socket ?? getSharedSocketIfExists(), onRematch });
  const missed = reteach.missed;

  return (
    <div
      data-testid="edu-host-results"
      data-round-end-stage={stage}
      data-outcome={outcome.kind}
      className="fixed inset-0 z-[75] flex flex-col gap-3 overflow-hidden bg-neo-navy px-3 pb-4 pt-16 text-neo-cream lg:gap-4 lg:px-8 lg:pb-6 lg:pt-6"
    >
      <BossOutcomeCard size="tv" className="shrink-0" />
      <TvRecapHeader
        title={
          !hasStage
            ? null
            : outcome.celebrate
              ? t('education.results.podium.title')
              : t(outcome.kind === 'empty' ? 'eduLive.results.emptyTitle' : 'eduLive.results.lineupTitle')
        }
        lessonNames={summary.lessonNames ?? []}
      />

      <div data-testid="edu-host-results-scroll" className="-mx-3 flex min-h-0 flex-1 flex-col overflow-y-auto px-3 lg:mx-0 lg:overflow-hidden lg:px-0">
        <div className="grid grid-cols-1 gap-3 lg:min-h-0 lg:flex-1 lg:grid-cols-5 lg:gap-5 2xl:grid-cols-3">
          {hasStage && (
            <div className="relative flex flex-col gap-3 lg:col-span-3 lg:min-h-0 lg:gap-4 2xl:col-span-2">
              {/* The winner bar stands down to "top hitter" when the boss got away; so does the party. */}
              <CelebrationLoop active={winnerBeat && showPodium && bossStatus !== 'escaped'} className="z-10" />
              {outcome.kind === 'empty' && !bossOver && <EmptyRoundCard t={t} />}
              {showPodium && (
                <PodiumStage
                  entries={podium}
                  muted={!outcome.celebrate}
                  stage={stage}
                  t={t}
                  className={bossOver ? 'lg:w-[min(100%,calc((100dvh_-_30rem)*1.768))]' : 'lg:w-[min(100%,calc((100dvh_-_19rem)*1.768))]'}
                >
                  {landed && <ClassChest found={summary.classFoundCount} total={summary.totalWords} open={winnerBeat} t={t} />}
                  {!outcome.celebrate && <ZeroRoundNote t={t} />}
                </PodiumStage>
              )}
              {showPodium && podium[0] && (
                <WinnerSpotlight
                  winner={{ username: podium[0].username, score: podium[0].score }}
                  outcome={outcome.kind}
                  leaders={outcome.leaders}
                  active={isRevealed(1, stage)}
                  cue={!swept}
                  size={phone ? 'card' : 'projector'}
                  t={t}
                  className="z-20 shrink-0"
                />
              )}
            </div>
          )}

          <div className={cn('flex flex-col gap-3 lg:min-h-0 lg:gap-4', hasStage ? 'lg:col-span-2 2xl:col-span-1' : 'lg:col-span-5 lg:mx-auto lg:w-full lg:max-w-4xl 2xl:col-span-3')}>
            {stats && (
              <div className={cn(!phone && bossOver && 'lg:[@media(max-height:900px)]:hidden')}>
                <ClassPulse stats={stats} active={winnerBeat} size={phone ? 'card' : 'projector'} t={t} />
              </div>
            )}
            {summary.totalWords > 0 && missed.length === 0 && (
              <TvCoveragePanel
                summary={summary}
                players={players}
                neverPlaced={neverPlaced}
                stage={stage}
                pointsWithoutLesson={!landed && outcome.celebrate}
                phone={phone}
                maxChips={bossOver ? 6 : 9}
                verdict={reteachVerdict(summary).kind}
                t={t}
              />
            )}
            <Actions t={t} onRematch={onRematch} onClose={onClose} onExitRoom={onExitRoom} />
            <EduReteachPanel words={missed} underHalf={studentsUnderHalf(summary)} status={reteach.status} onReplay={reteach.replay} onRestoreFull={reteach.restoreFull} t={t} />
            {summary.totalWords > 0 && (
              // With the boss card up, a short wall keeps the words to reteach over the report teaser.
              <div className={cn(!phone && bossOver && 'lg:[@media(max-height:900px)]:hidden')}>
                <StrugglePreview masteryByPlayer={summary.masteryByPlayer ?? {}} teacherName={summary.teacherName ?? ''} language={language} t={t} />
              </div>
            )}
            {/* Teacher Pro trial + school quote, after a class has actually played. Host tree only. On a short wall the reteach outranks it. */}
            <div className={cn('flex flex-col gap-3', !phone && (bossOver || missed.length > 0) && 'lg:[@media(max-height:900px)]:hidden')}>
              <ResultsTeacherProTrialCard language={language} />
              {showTeacherInvite(outcome.celebrate, stats?.students ?? 0) && <TeacherInviteNudge students={stats?.students ?? 0} language={language} whatsapp={phone} t={t} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EduHostResults;
