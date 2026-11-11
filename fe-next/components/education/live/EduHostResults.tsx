'use client';

/**
 * The /education/live projector at round end: its own screen, built from the shared round-end pieces: the
 * staged podium, the winner bar, the class's numbers, the words the class missed, the boss verdict and one
 * labelled Teacher Pro preview (never after a bots-only practice round).
 * Mounts only in the host tree, so no student sees the report or the upsell; z-[75] clears the lobby's
 * z-[65]. Dark-only and painted from frame one: the reveal only swaps what is written inside (Class 5).
 * One primary (Practice these words when the class missed some, else Play again), a quiet Play again under
 * practice, everything rarer (Share with parents, PDF export, Next game, End game) under More, one Pro slot. Sized off its own size container, so a preview
 * frame or a zoomed TV lays out like the wall.
 */
import type { ReactNode } from 'react';
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
import { HardestWordsInsight } from '@/components/education/results/HardestWordsInsight';
import { roundHardestWords } from '@/components/education/results/roundHardestWords';
import { ProInsightLink } from '@/components/teacher/pro/ProInsightLink';
import { ParentShareLink } from '@/components/education/results/ParentShareLink';
import { reteachPanelWords } from '@/components/education/results/reteachPanelModel';
import { ClassReportButton } from '@/components/education/results/ClassReportButton';
import { ReportPdfExportButton } from '@/components/education/results/ReportPdfExportButton';
import { ResultsMoreTools } from '@/components/education/results/ResultsMoreTools';
import { ZeroRoundNote } from '@/components/education/results/ZeroRoundNote';
import { TeacherInviteNudge, showTeacherInvite } from '@/components/education/results/TeacherInviteNudge';
import { EmptyRoundCard } from '@/components/education/results/EmptyRoundCard';
import { useRoundEndReveal } from '@/components/education/results/useRoundEndReveal';
import { useIsPhoneRecap } from '@/components/education/results/useIsPhoneRecap';
import { buildTvRecap } from '@/components/education/results/tvRecapModel';
import { trackReteachStarted, trackResultsAction } from '@/components/education/results/trackResultsAction';
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
import { useReteachRound } from './useReteachRound';
import { NeoButton } from '@/components/ui/button';
import { KeepOpenHomework } from './KeepOpenHomework';
import { LessonPlanPrompt } from '@/components/education/LessonPlanPrompt';

/** Play again, Next mode and End game: room controls, drawn as a quiet row so they never compete with the one primary. */
const TERTIARY = cn(
  PRESS,
  'inline-flex min-h-11 min-w-0 grow basis-32 items-center justify-center gap-1.5 rounded-neo-lg border-[3px] border-neo-cream/50 bg-neo-navy-light px-3 text-center font-neo-display text-sm font-black normal-case text-neo-cream shadow-hard transition-[transform,box-shadow] duration-150 hover:-translate-y-px active:translate-x-[2px] active:translate-y-[2px] active:shadow-none motion-reduce:transition-none @5xl/results:text-base @[96rem]/results:min-h-14 @[96rem]/results:text-xl'
);

type FallbackTranslate = (key: string, fallback: string, params?: Record<string, string | number>) => string;

interface ActionsProps extends Pick<ClassroomTvResultsScreenProps, 'onRematch' | 'onClose' | 'onExitRoom'> {
  t: Translate;
  /** Present when the class left words to practice and a round can start: then practice is the primary, in the words panel. */
  practiceLeads: boolean;
  /** Share with parents (Pro), absent on a bots-only practice round. Lives under More. */
  secondary: ReactNode;
  /** The PDF export, also under More. */
  exportSlot?: ReactNode;
  /** A free teacher's Teacher Pro report preview: for the teacher, not the class watching the wall, so under More. */
  proSlot?: ReactNode;
}

/**
 * One primary on the wall (Practice these words, else Play again). When practice leads, Play again sits right
 * under it as the one quiet rematch. Everything rarer (share, next game, export, end) waits under More, so the
 * wall reads as one choice.
 */
function Actions({ t, onRematch, onClose, onExitRoom, practiceLeads, secondary, exportSlot, proSlot }: ActionsProps) {
  const playAgain = onRematch
    ? () => {
        trackResultsAction('rematch', 'projector');
        onRematch();
      }
    : undefined;
  const quietPlayAgain = practiceLeads && !!playAgain;
  const hasMore = !!secondary || !!exportSlot || !!proSlot || !!onClose || !!onExitRoom;

  return (
    <div data-testid="edu-results-actions" className="flex shrink-0 flex-col gap-2 @5xl/results:gap-3">
      {!practiceLeads && playAgain && (
        <NeoButton variant="livePrimary" data-testid="edu-results-play-again" data-results-primary="" onClick={playAgain} className={PRIMARY_SIZE}>
          <RotateCcw className="size-[0.9em]" aria-hidden="true" />
          {t('eduLiveRoom.hostResults.playAgain')}
        </NeoButton>
      )}
      {quietPlayAgain && (
        <button type="button" data-testid="edu-results-play-again" onClick={playAgain} className={cn(TERTIARY, 'basis-auto grow-0')}>
          <RotateCcw className="size-4 shrink-0" aria-hidden="true" />
          {t('eduLiveRoom.hostResults.playAgain')}
        </button>
      )}
      {hasMore && (
        <ResultsMoreTools label={t('eduLiveRoom.hostResults.more')}>
          <div data-testid="edu-results-tertiary" className="flex flex-col gap-2 @5xl/results:gap-3">
            {(onClose || onExitRoom) && (
              <div className="flex flex-wrap gap-2 @5xl/results:gap-3">
                {onClose && (
                  <button type="button" data-testid="edu-results-next-mode" onClick={onClose} className={TERTIARY}>
                    <Shuffle className="size-4 shrink-0" aria-hidden="true" />
                    {t('eduLiveRoom.hostResults.nextMode')}
                  </button>
                )}
                {onExitRoom && (
                  <button type="button" data-testid="edu-results-end" onClick={onExitRoom} className={TERTIARY}>
                    <LogOut className="size-4 shrink-0" aria-hidden="true" />
                    {t('eduLiveRoom.hostResults.endGame')}
                  </button>
                )}
              </div>
            )}
            {secondary}
            {exportSlot}
            {proSlot}
          </div>
        </ResultsMoreTools>
      )}
    </div>
  );
}


const PRIMARY_SIZE = cn(
  PRESS,
  'min-h-14 w-full px-4 py-2.5 normal-case tracking-normal text-xl @lg/results:px-6 @lg/results:text-2xl @5xl/results:text-3xl @[96rem]/results:min-h-20 @[96rem]/results:text-4xl'
);
const PRIMARY_CLASS = cn(PRIMARY_BUTTON, PRIMARY_SIZE);

/** Each student's found % this round (no names, host excluded), lowest first: the Pro preview's bars. */
function reportBars(summary: ClassroomTvResultsScreenProps['summary']): number[] {
  const host = (summary.teacherName ?? '').trim().toLowerCase();
  return Object.entries(summary.masteryByPlayer ?? {})
    .filter(([name, m]) => name.trim().toLowerCase() !== host && m && m.total > 0)
    .map(([, m]) => Math.round((m.found / m.total) * 100))
    .sort((a, b) => a - b);
}

export function EduHostResults({ summary, players, t, onRematch, onClose, onExitRoom, gameCode: roomCode, socket }: ClassroomTvResultsScreenProps) {
  const lang = useLanguage();
  const language = lang.language;
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
  const { hasPro, loading: proLoading } = useTeacherPro();
  const missed = reteachPanelWords(summary);
  const reteach = useReteachRound({ gameCode, socket: socket ?? getSharedSocketIfExists(), onApplied: () => onRematch?.() });
  const practiceLeads = !!onRematch && missed.length > 0;
  const pending = reteach.status === 'pending';
  // The surface's own `t` may be a (key, params) wrapper that drops a third argument; the context's `t` takes a fallback and params.
  const tf: FallbackTranslate = (key, fallback, params) =>
    typeof lang.t === 'function' ? (lang.t as unknown as FallbackTranslate)(key, fallback, params) : t(key, params);
  const startPractice = () => {
    trackReteachStarted({ surface: 'projector', words: missed.length, plan: hasPro ? 'pro' : 'free' });
    reteach.replay(missed.map((w) => w.word));
  };
  const students = stats?.students ?? 0;
  const shortWall = bossOver;
  const proCard = !proLoading && !hasPro && !isPracticeRound(players) && summary.totalWords > 0;
  const round = { gameMode: summary.gameMode ?? 'classic', coverage: summary.coverage, masteryByPlayer: summary.masteryByPlayer, hostName: summary.teacherName };
  // On the wall the class numbers stand under the winner, so the side column holds coverage, actions and the Pro card.
  const pulseBesideStage = showPodium && !phone && !bossOver;
  const podiumWidth = bossOver
    ? pulseBesideStage
      ? '@5xl/results:w-[min(100%,calc((100cqh-32rem)*1.768))] @[96rem]/results:w-[min(100%,calc((100cqh-36rem)*1.768))]'
      : '@5xl/results:w-[min(100%,calc((100cqh-27rem)*1.768))]'
    : pulseBesideStage
      ? '@5xl/results:w-[min(100%,calc((100cqh-21rem)*1.768))] @[96rem]/results:w-[min(100%,calc((100cqh-25rem)*1.768))]'
      : '@5xl/results:w-[min(100%,calc((100cqh-16rem)*1.768))]';
  // Only a round where lesson words landed can name its hardest ones honestly.
  const hardest = landed ? roundHardestWords(summary) : [];
  const insight = hardest.length > 0 ? (
    <div data-testid="edu-results-hardest" className="flex flex-col gap-2">
      <HardestWordsInsight words={hardest} t={t} />
      {!proLoading && !hasPro && !isPracticeRound(players) && (
        <ProInsightLink
          placement="results_hardest_words"
          language={language}
          label={tf('education.results.freeInsight.proLine', 'Full report for every student with Pro')}
          proLabel={tf('eduLiveRoom.hostResults.proPill', 'Pro')}
        />
      )}
    </div>
  ) : null;
  // The missed words grow to the podium's height on a wide wall, so the side column never ends in a blank half.
  const fillSide = hasStage && !phone && !bossOver && practiceLeads;
  const pulse = stats ? (
    <div className={cn(shortWall && '[@container_results_(height<56.25rem)]:hidden')}>
      <ClassPulse stats={stats} active={winnerBeat} size={phone ? 'card' : 'projector'} t={t} />
    </div>
  ) : null;

  return (
    <div
      data-testid="edu-host-results"
      data-round-end-stage={stage}
      data-outcome={outcome.kind}
      className="fixed inset-0 z-[75] flex flex-col gap-2 overflow-hidden bg-neo-navy px-3 pb-3 pt-4 text-neo-cream [container:results_/_size] lg:gap-4 lg:px-8 lg:pb-6 lg:pt-6"
    >
      <BossOutcomeCard size="tv" density="compact" className="shrink-0 rounded-neo-lg border-[3px] border-neo-cream/50 shadow-hard-xl" />
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
        <div className="grid grid-cols-1 gap-2 @5xl/results:min-h-0 @5xl/results:flex-1 @5xl/results:grid-cols-5 @5xl/results:gap-5 @[96rem]/results:grid-cols-3">
          {hasStage && (
            <div className="relative flex flex-col gap-2 @5xl/results:col-span-3 @5xl/results:min-h-0 @5xl/results:gap-4 @[96rem]/results:col-span-2">
              {/* The winner bar stands down to "top hitter" when the boss got away; so does the party. */}
              <CelebrationLoop active={winnerBeat && showPodium && bossStatus !== 'escaped'} className="z-10" />
              {outcome.kind === 'empty' && !bossOver && <EmptyRoundCard t={t} />}
              {showPodium && (
                <PodiumStage
                  entries={podium}
                  muted={!outcome.celebrate}
                  stage={stage}
                  t={t}
                  className={cn(phone && 'w-[min(100%,14rem)] @xl/results:w-[min(100%,24rem)]', podiumWidth)}
                >
                  {landed && <ClassChest found={summary.classFoundCount} total={summary.totalWords} open={isRevealed(1, stage)} tone="calm" t={t} />}
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
                  tone="calm"
                  t={t}
                  className={cn('z-20 shrink-0', phone && bossOver && 'hidden')}
                />
              )}
              {pulseBesideStage && pulse}
            </div>
          )}

          <div className={cn('flex flex-col gap-2 @5xl/results:min-h-0 @5xl/results:gap-3 @[96rem]/results:gap-4 [&>*]:shrink-0', hasStage ? '@5xl/results:col-span-2 @[96rem]/results:col-span-1' : '@5xl/results:col-span-5 @5xl/results:mx-auto @5xl/results:w-full @5xl/results:max-w-4xl @[96rem]/results:col-span-3')}>
            {!pulseBesideStage && pulse}
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
            {/* The free insight leads: the words the class missed, with the one primary that practices exactly them. */}
            <div className={cn('flex flex-col gap-2 @max-[64rem]/results:order-first @5xl/results:gap-3 [&>*]:shrink-0', fillSide && '@5xl/results:flex-1')}>
              {missed.length === 0 && insight}
              <MissedWordsList
                words={missed}
                lead={missed.length > 0 ? insight : null}
                maxChips={bossOver ? 6 : fillSide ? 14 : 8}
                fill={fillSide}
                title={tf('eduLiveRoom.hostResults.missedTitle', 'Words your class missed')}
                t={t}
              >
                {practiceLeads && (
                  <button
                    type="button"
                    data-testid="edu-replay-missed"
                    data-results-primary=""
                    disabled={pending}
                    aria-busy={pending}
                    onClick={startPractice}
                    className={PRIMARY_CLASS}
                  >
                    {pending ? <Loader2 className="size-[0.9em] animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Target className="size-[0.9em]" aria-hidden="true" />}
                    {tf('eduLiveRoom.hostResults.practiceWords', 'Practice these words ({count})', { count: missed.length })}
                  </button>
                )}
                {practiceLeads && <ReteachStatusNote status={reteach.status} onRestoreFull={reteach.restoreFull} t={t} />}
              </MissedWordsList>
              <Actions
                t={t}
                onRematch={onRematch}
                onClose={onClose}
                onExitRoom={onExitRoom}
                practiceLeads={practiceLeads}
                proSlot={proCard ? <ClassReportButton language={language} underHalf={studentsUnderHalf(summary)} bars={reportBars(summary)} round={round} proLabel={tf('eduLiveRoom.hostResults.proPill', 'Pro')} /> : null}
                exportSlot={
                  // Export class report (PDF): the real export for Pro, locked and straight to checkout for a free teacher.
                  !proLoading && summary.totalWords > 0 && students > 0 && !isPracticeRound(players) ? (
                    <ReportPdfExportButton
                      language={language}
                      summary={summary}
                      players={players}
                      proLabel={tf('eduLiveRoom.hostResults.proPill', 'Pro')}
                      hideOffer={proCard}
                    />
                  ) : null
                }
                secondary={
                  students > 0 && !isPracticeRound(players) ? (
                    <ParentShareLink
                      language={language}
                      hasPro={hasPro}
                      label={tf('eduLiveRoom.hostResults.shareParents', 'Share with parents')}
                      proLabel={tf('eduLiveRoom.hostResults.proPill', 'Pro')}
                    />
                  ) : null
                }
              />
              {summary.classroomId && summary.lessonIds?.[0] && students > 0 && !isPracticeRound(players) ? (
                <KeepOpenHomework classroomId={summary.classroomId} lessonId={summary.lessonIds[0]} />
              ) : null}
              {summary.classroomId && isPracticeRound(players) ? <LessonPlanPrompt classroomId={summary.classroomId} /> : null}
            </div>
            {!proLoading && hasPro && summary.totalWords > 0 && (
              <div className={cn((shortWall || phone) && '[@container_results_(height<56.25rem)]:hidden')}>
                <StrugglePreview masteryByPlayer={summary.masteryByPlayer ?? {}} teacherName={summary.teacherName ?? ''} language={language} t={t} round={round} />
              </div>
            )}
            {!proLoading && hasPro && showTeacherInvite(outcome.celebrate, students) && (
              <div className="[@container_results_(height<56.25rem)]:hidden">
                <TeacherInviteNudge students={students} language={language} whatsapp={phone} compact={phone} t={t} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default EduHostResults;
