'use client';

/**
 * The /education/live projector at round end: its own screen (the rebuild gives the live route its own
 * lobby and results), built from the shared round-end pieces: the staged podium, the winner bar, the
 * class's numbers, the words still to teach, the boss verdict, the "See who struggled" Pro preview and the
 * Teacher Pro trial / school quote card (never after a bots-only practice round).
 * Mounts only in the host tree, so no student sees the report or the upsell; z-[75] clears the lobby's
 * z-[65]. Dark-only and painted from frame one: the reveal only swaps what is written inside (Class 5).
 * One primary (reteach when the class missed words, else Play again), at most three quiet secondaries,
 * one Pro slot. Sized off its own size container, so a preview frame or a zoomed TV lays out like the wall.
 */
import { Loader2, LogOut, RotateCcw, Shuffle, Target } from 'lucide-react';
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
import { MissedWordsList } from '@/components/education/results/MissedWordsList';
import { ResultsTeacherProTrialCard } from '@/components/education/results/ResultsTeacherProTrialCard';
import { ZeroRoundNote } from '@/components/education/results/ZeroRoundNote';
import { TeacherInviteNudge, showTeacherInvite } from '@/components/education/results/TeacherInviteNudge';
import { EmptyRoundCard } from '@/components/education/results/EmptyRoundCard';
import { useRoundEndReveal } from '@/components/education/results/useRoundEndReveal';
import { useIsPhoneRecap } from '@/components/education/results/useIsPhoneRecap';
import { buildTvRecap } from '@/components/education/results/tvRecapModel';
import { trackResultsAction } from '@/components/education/results/trackResultsAction';
import { isPracticeRound } from '@/components/education/results/isPracticeRound';
import { useOverlayQuietZoneClaim } from '@/lib/overlayQuietZone';
import { isRevealed } from '@/lib/education/roundEndStage';
import { classSwept } from '@/lib/education/roundEndSweep';
import { useSearchParams } from 'next/navigation';
import { useTeacherPro } from '@/hooks/useTeacherPro';
import { getSharedSocketIfExists } from '@/utils/SocketContext';
import { PRESS, PRIMARY_BUTTON, SECONDARY_BUTTON, type Translate } from './eduLiveStyles';
import { ReteachStatusNote } from './ReteachStatusNote';
import { reteachVerdict, studentsUnderHalf } from './eduReteachModel';
import { useReplayMissedWords, type ReteachStatus } from './useReteachRound';

const SECONDARY = cn(SECONDARY_BUTTON, PRESS, 'min-h-14 min-w-0 grow basis-40 text-center @[96rem]/results:text-base');

interface ActionsProps extends Pick<ClassroomTvResultsScreenProps, 'onRematch' | 'onClose' | 'onExitRoom'> {
  t: Translate;
  reteach: { count: number; status: ReteachStatus; start?: () => void; restoreFull: () => void };
}

function Actions({ t, onRematch, onClose, onExitRoom, reteach }: ActionsProps) {
  const reteachFirst = !!reteach.start;
  const pending = reteach.status === 'pending';
  const playAgain = onRematch
    ? () => {
        trackResultsAction('rematch', 'projector');
        onRematch();
      }
    : undefined;
  const primaryClass = cn(PRIMARY_BUTTON, PRESS, 'min-h-16 w-full px-6 py-3 text-2xl @5xl/results:text-3xl @[96rem]/results:min-h-20 @[96rem]/results:text-4xl');
  const hasSecondary = (reteachFirst && !!playAgain) || !!onClose || !!onExitRoom;

  return (
    <div data-testid="edu-results-actions" className="flex shrink-0 flex-col gap-2 @max-[64rem]/results:order-first @5xl/results:gap-3">
      {reteachFirst ? (
        <button
          type="button"
          data-testid="edu-replay-missed"
          data-results-primary=""
          disabled={pending}
          aria-busy={pending}
          onClick={reteach.start}
          className={primaryClass}
        >
          {pending ? <Loader2 className="size-[0.9em] animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Target className="size-[0.9em]" aria-hidden="true" />}
          {t('eduLiveRoom.hostResults.replayMissed', { count: reteach.count })}
        </button>
      ) : (
        playAgain && (
          <button type="button" data-testid="edu-results-play-again" data-results-primary="" onClick={playAgain} className={primaryClass}>
            <RotateCcw className="size-[0.9em]" aria-hidden="true" />
            {t('eduLiveRoom.hostResults.playAgain')}
          </button>
        )
      )}
      <ReteachStatusNote status={reteach.status} onRestoreFull={reteach.restoreFull} t={t} />
      {hasSecondary && (
        <div data-testid="edu-results-secondary" className="flex flex-wrap gap-2 @5xl/results:gap-3">
          {reteachFirst && playAgain && (
            <button type="button" data-testid="edu-results-play-again" onClick={playAgain} className={SECONDARY}>
              <RotateCcw className="size-4 shrink-0" aria-hidden="true" />
              {t('eduLiveRoom.hostResults.playAgain')}
            </button>
          )}
          {onClose && (
            <button type="button" data-testid="edu-results-next-mode" onClick={onClose} className={SECONDARY}>
              <Shuffle className="size-4 shrink-0" aria-hidden="true" />
              {t('eduLiveRoom.hostResults.nextMode')}
            </button>
          )}
          {onExitRoom && (
            <button type="button" data-testid="edu-results-end" onClick={onExitRoom} className={SECONDARY}>
              <LogOut className="size-4 shrink-0" aria-hidden="true" />
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
  useOverlayQuietZoneClaim(true, 'classroom-host-results');
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
  const { hasPro, loading: proLoading } = useTeacherPro();
  const students = stats?.students ?? 0;
  const shortWall = !phone && bossOver;

  return (
    <div
      data-testid="edu-host-results"
      data-round-end-stage={stage}
      data-outcome={outcome.kind}
      className="fixed inset-0 z-[75] flex flex-col gap-3 overflow-hidden bg-neo-navy px-3 pb-4 pt-16 text-neo-cream [container:results_/_size] lg:gap-4 lg:px-8 lg:pb-6 lg:pt-6"
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

      <div data-testid="edu-host-results-scroll" className="-mx-3 flex min-h-0 flex-1 flex-col overflow-y-auto px-3 [scrollbar-width:thin] @5xl/results:mx-0 @5xl/results:px-0">
        <div className="grid grid-cols-1 gap-3 @5xl/results:min-h-0 @5xl/results:flex-1 @5xl/results:grid-cols-5 @5xl/results:gap-5 @[96rem]/results:grid-cols-3">
          {hasStage && (
            <div className="relative flex flex-col gap-3 @5xl/results:col-span-3 @5xl/results:min-h-0 @5xl/results:gap-4 @[96rem]/results:col-span-2">
              {/* The winner bar stands down to "top hitter" when the boss got away; so does the party. */}
              <CelebrationLoop active={winnerBeat && showPodium && bossStatus !== 'escaped'} className="z-10" />
              {outcome.kind === 'empty' && !bossOver && <EmptyRoundCard t={t} />}
              {showPodium && (
                <PodiumStage
                  entries={podium}
                  muted={!outcome.celebrate}
                  stage={stage}
                  t={t}
                  className={bossOver ? '@5xl/results:w-[min(100%,calc((100cqh-27rem)*1.768))]' : '@5xl/results:w-[min(100%,calc((100cqh-16rem)*1.768))]'}
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

          <div className={cn('flex flex-col gap-3 @5xl/results:min-h-0 @5xl/results:gap-4 [&>*]:shrink-0', hasStage ? '@5xl/results:col-span-2 @[96rem]/results:col-span-1' : '@5xl/results:col-span-5 @5xl/results:mx-auto @5xl/results:w-full @5xl/results:max-w-4xl @[96rem]/results:col-span-3')}>
            {stats && (
              <div className={cn(shortWall && '[@container_results_(height<56.25rem)]:hidden')}>
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
            <Actions
              t={t}
              onRematch={onRematch}
              onClose={onClose}
              onExitRoom={onExitRoom}
              reteach={{ count: missed.length, status: reteach.status, start: reteach.start, restoreFull: reteach.restoreFull }}
            />
            <MissedWordsList words={missed} underHalf={studentsUnderHalf(summary)} maxChips={bossOver ? 6 : 8} t={t} />
            {!proLoading && hasPro && summary.totalWords > 0 && (
              <div className={cn(shortWall && '[@container_results_(height<56.25rem)]:hidden')}>
                <StrugglePreview masteryByPlayer={summary.masteryByPlayer ?? {}} teacherName={summary.teacherName ?? ''} language={language} t={t} />
              </div>
            )}
            {!proLoading && !hasPro && !isPracticeRound(players) && <ResultsTeacherProTrialCard language={language} />}
            {!proLoading && hasPro && showTeacherInvite(outcome.celebrate, students) && (
              <TeacherInviteNudge students={students} language={language} whatsapp={phone} t={t} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default EduHostResults;
