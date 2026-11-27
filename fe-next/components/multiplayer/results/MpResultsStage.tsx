'use client';

import { mpH2hRival } from '@/lib/rivals/pickers';
import { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useReducedMotion } from 'framer-motion';
import { ChevronRight, ListOrdered, Trophy } from 'lucide-react';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { MpScreen } from '../shell/MpScreen';
import { AmbientBackdrop } from '@/components/motion/AmbientBackdrop';
import { ResultsModals } from '@/components/results/ResultsModals';
import { PostRoundSummary } from '@/components/results/PostRoundSummary';
import ResultsBannerSlot from '@/components/ads/ResultsBannerSlot';
import InlineSignupCard from '@/components/auth/InlineSignupCard';
import { useCrazyGames } from '@/components/CrazyGamesSDK';
import { SERIES_TOTAL_GAMES } from '@/hooks/useSeriesTracker';
import type { GameModeOption } from '@/components/GameModeSelector';
import { cn } from '@/lib/utils';
import { buildMpStandings, podiumTier } from './mpStandings';
import { guestAskPlan, nextModeForViewer, pickBestWord, pickVisibleRows, readyTally, seriesLadder, seriesPlacing, showInlineSignup } from './mpResultsView';
import { MpPodium } from './MpPodium';
import { MpDetailsExtras } from './MpDetailsExtras';
import { ResultsSocialSlot } from '@/components/results/ResultsSocialSlot';
import { MpStandingsSection } from './MpFullStandings';
import { useMpResultsChallenge } from './useMpResultsChallenge';
import { useNextModeRelay } from './useNextModeRelay';
import { CLASSROOM_NEXT_OPTIONS, useTeacherNextMode } from './useTeacherNextMode';
import { getModePresentation } from '@/lib/multiplayer/modePresentation';
import { buildRevealTimeline } from './revealTimeline';
import { useRevealStage } from './useRevealStage';
import { useMpAutoContinue } from './useMpAutoContinue';
import { useLockedBranch, useResultBeats } from './useResultBeats';
import { MpResultsHeader } from './MpResultsHeader';
import { MpMyCard } from './MpMyCard';
import { pickBestMissedWord } from '@/components/results/bestMissedWord';
import { useClassroomPressure } from '@/hooks/gameState/classroomPressureStore';
import { isLeaderboardHidden } from '@/shared/utils/classroomPressure';
import { MpNextModeCard } from './MpNextModeCard';
import { MpResultsReactionBar } from './MpResultsReactionBar';
import { MpFinalFooter, MpIntermissionFooter } from './MpResultsFooter';
import { useMpBrag } from './MpBragStrip';
import { MpGuestAddPromptProvider } from './MpGuestAddChip';
import MpResultsDetails from './MpResultsDetails';
import { useFriends } from '@/hooks/useFriends';
import ChestRewardCta from '@/components/education/economy/ChestRewardCta';
import { rewardRoundId } from '@/shared/constants/classroomEconomy';
import RoundShop from '@/components/education/economy/RoundShop';
import { calloutRival, resultCallout } from './mpResultsStory';
import { useFrozenAfter, useRivalHeadToHead } from './useRivalHeadToHead';
import { selectUniqueWords } from '@/lib/results/selectUniqueWords';
import type { MpResultsController } from './useMpResultsController';
import fx from './mpResults.module.css';
import { useOpenLessonPractice } from './useOpenLessonPractice';
import { classroomRoundModeMeta } from '../round/roundModes';
import { StudentMissedWords } from '@/components/student/live/StudentMissedWords';
import { MpResultsExitDialog } from './MpResultsExitDialog';
import { myMissedWords } from '@/components/student/live/missedWords';
import { resultsExitCopy } from '@/lib/multiplayer/resultsExitCopy';
import { trackGrowthEvent } from '@/utils/growthTracking';
import posthog from '@/lib/analytics/lazyPosthog';
import { startSameRoomRematch } from '@/lib/quickPlay/seededChallengeLink';
import { useMpExit } from '@/hooks/useMpExit';
import { BossOutcomeCard } from '@/components/education/boss/BossOutcomeCard';
import { useClassroomBossStore } from '@/stores/classroomBossStore';
import { useRevealHost } from '@/lib/levelUp/useRevealHost';

const MultiplayerSignupSheet = dynamic(() => import('@/components/auth/MultiplayerSignupSheet'), { ssr: false });
const SignupToast = dynamic(() => import('@/components/auth/SignupToast'), { ssr: false });
const CrazyGamesBanner = dynamic(() => import('@/components/CrazyGamesBanner'), { ssr: false });
const FloatingReaction = dynamic(() => import('@/components/game/QuickReactions').then((m) => m.FloatingReaction), { ssr: false });
const MmrChangeBadge = dynamic(() => import('@/components/results/MmrChangeBadge'), { ssr: false });

/** Podium (3) + up to 2 rows below it; in a bigger room I stay visible. */
const MAX_ROWS = 5;
const NO_CHAMPIONS: readonly string[] = [];
/** Signup nudge lands this long after the reveal ends (never on the verdict). */
const NUDGE_DELAY_MS = 4000;

/**
 * The results show: TIME! → standings rise last → 1st → my card rolls → footer.
 * One screen, zero page scroll; everything else is behind DETAILS.
 */
export function MpResultsStage({ c }: { c: MpResultsController }) {
  // ResultsModals' levelUp slot shows the unlock reveal once the stage is done.
  useRevealHost();
  const { props, t, data, socketEvents } = c;
  const { username, isHost = false, seriesRoundNumber = 0, seriesTotalGames = SERIES_TOTAL_GAMES, seriesStandings, gameCode } = props;
  const reduced = !!useReducedMotion();
  const { friends } = useFriends();
  const { challengeFriend, setChallengeFriend, challengeDialog } = useMpResultsChallenge({ gameCode, t });

  const rows = useMemo(() => buildMpStandings({
    sortedScores: data.sortedScores,
    username,
    normalizeUsername: data.normalizeUsername,
    series: { roundNumber: seriesRoundNumber, standings: seriesStandings },
  }), [data.sortedScores, username, data.normalizeUsername, seriesRoundNumber, seriesStandings]);
  const isFinalLive = seriesRoundNumber >= seriesTotalGames;
  const { branch, lock } = useLockedBranch(isFinalLive);
  // The teacher's hidden dial means TRUE hidden — the final screen IS the reveal.
  const pressure = useClassroomPressure();
  const hideOutcome = branch !== 'final' && pressure != null && isLeaderboardHidden(pressure);
  // A series final is judged on the series: board, card, verdict and champion chip all read the ladder.
  // (The branch locks on the TIME! beat, before any row shows, so the reorder is never seen.)
  const ladder = useMemo(() => (branch === 'final' ? seriesLadder(rows) : null), [branch, rows]);
  const series = useMemo(() => (ladder ? seriesPlacing(ladder) : null), [ladder]);
  const boardRows = ladder ?? rows;
  const visible = useMemo(() => pickVisibleRows(boardRows, MAX_ROWS), [boardRows]);
  const timeline = useMemo(() => buildRevealTimeline(visible.rows.length), [visible.rows.length]);

  // Otherwise "where did I land" is my standings row: the live HUD's shared competition rank (1, 2, 2, 4).
  const myRow = useMemo(() => rows.find((r) => r.isMe), [rows]);
  const myRank = series?.rank ?? myRow?.rank ?? data.currentPlayerRank;
  const myScore = series?.seriesTotal ?? data.currentPlayerData?.score ?? 0;
  const myPodium = series ? podiumTier({ rank: series.rank, score: series.seriesTotal }) : myRow ? podiumTier(myRow) : null;
  const iWon = myPodium === 1;
  const topTwo = useMemo(() => {
    const nums = boardRows.map((r) => r.score);
    return { top: nums[0] ?? 0, runnerUp: nums[1] ?? 0 };
  }, [boardRows]);
  const beats = useResultBeats({
    podium: myPodium,
    isWinner: iWon,
    topScore: topTwo.top,
    runnerUpScore: topTwo.runnerUp,
    instant: reduced,
    ready: branch !== null,
  });
  const { stage, done, skip } = useRevealStage(timeline, { instant: reduced, onBeat: beats.onBeat });
  const handleSkip = useCallback(() => {
    lock();
    skip();
    beats.fireVerdict(true);
  }, [lock, skip, beats]);
  // Nothing shows before intermission vs final is locked (reduced motion would flash the round order, then the ladder).
  const seen = (name: Parameters<typeof timeline.stageOf>[0]) => branch !== null && stage >= timeline.stageOf(name);
  const footerShown = seen('footer');
  const expectedBranch = branch ?? (isFinalLive ? 'final' : 'intermission');
  const nextModeSlot = expectedBranch === 'intermission' || (isHost && !c.isClassroom);

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [standingsOpen, setStandingsOpen] = useState(false);

  // A guest's first MP game of the session ends on the replay countdown alone (guestAskPlan).
  const asks = guestAskPlan({ isGuest: c.isGuest, isClassroom: c.isClassroom, sessionGame: c.mpSessionGame });
  // Fired here, on the always-mounted reveal; DETAILS only mounts on open.
  useEffect(() => {
    if (data.sortedScores.length > 1) {
      trackGrowthEvent('mp_results_viewed', { gameMode: c.resolvedGameMode ?? 'unknown', language: c.language, isGuest: c.isGuest, mpSessionGame: c.mpSessionGame, guestAsksDeferred: asks.deferred });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire once per stage mount
  }, []);

  const { setShowShareModal } = c;
  // The signup nudge waits a beat after the show, so it never lands on the verdict.
  const [nudgeReady, setNudgeReady] = useState(false);
  useEffect(() => {
    if (!done) return undefined;
    const id = setTimeout(() => setNudgeReady(true), NUDGE_DELAY_MS);
    return () => clearTimeout(id);
  }, [done]);
  const nudgeSheetOpen = nudgeReady && c.nudge.activeNudge === 'sheet';

  const tally = useMemo(() => readyTally(data.sortedScores, socketEvents.readyUsernames), [data.sortedScores, socketEvents.readyUsernames]);
  const isReady = socketEvents.isCurrentPlayerReady;
  const { isOnCrazyGamesPlatform } = useCrazyGames();
  const mpExit = useMpExit();
  const { handleStartGame } = c.nextRound;
  const { handleMarkReady } = socketEvents;
  const { handleNewSeries } = c;
  // exp-mp-auto-continue-v1 extends this ring (series final, one-screen cancel).
  const auto = useMpAutoContinue({
    branch,
    isClassroom: c.isClassroom,
    isHost,
    isReady,
    armed: footerShown,
    paused: detailsOpen || standingsOpen || nudgeSheetOpen || c.showExitConfirm || c.showShareModal || !!challengeFriend || socketEvents.showWordFeedback || c.adGate.anyAdActive,
    persistCancel: !isOnCrazyGamesPlatform,
    onStartNext: handleStartGame,
    onNewSeries: handleNewSeries,
    onReady: handleMarkReady,
  });
  const startNext = useCallback(() => {
    auto.clearCancel();
    handleStartGame();
  }, [auto, handleStartGame]);
  const markReady = useCallback(() => {
    auto.clearCancel();
    handleMarkReady();
  }, [auto, handleMarkReady]);
  const rematch = useCallback(() => {
    startSameRoomRematch(isHost ? 'host' : 'player', () => {
      if (isHost) handleNewSeries();
      else handleMarkReady();
    }, (event, props) => posthog.capture(event, props));
  }, [isHost, handleNewSeries, handleMarkReady]);

  const relayedMode = useNextModeRelay<GameModeOption>({ socket: props.socket ?? null, gameCode, isHost, pick: c.selectedGameMode, enabled: !c.isClassroom });
  const nextMode = nextModeForViewer<GameModeOption>({ isHost, hostPick: c.selectedGameMode, relayed: relayedMode });
  const teacherNext = useTeacherNextMode({
    enabled: isHost && c.isClassroom,
    socket: props.socket ?? null,
    gameCode: gameCode ?? '',
    current: (props.classroomNextMode ?? c.resolvedGameMode ?? 'classic') as Parameters<typeof useTeacherNextMode>[0]['current'],
    t,
    onBoardMode: c.setSelectedGameMode,
  });
  const openLessonPractice = useOpenLessonPractice();
  const classroomStudent = c.isClassroom && !isHost && !!props.classroomSummary;
  const missedWords = useMemo(() => myMissedWords(props.classroomSummary, username), [props.classroomSummary, username]);
  const practiceLessonId = props.classroomSummary?.lessonIds?.[0];
  const switchedTo = classroomStudent && props.classroomNextMode && props.classroomNextMode !== c.resolvedGameMode ? props.classroomNextMode : null;
  const nextModeLabel = switchedTo ? t(classroomRoundModeMeta(switchedTo).nameKey) : undefined;
  const me = data.currentPlayerData;
  const bestWord = useMemo(() => pickBestWord(me?.allWords), [me]);
  // The best board word others found and I didn't; a classroom student gets the lesson's missed list instead.
  const boardLanguage = props.roomLanguage ?? c.language;
  const bestMissed = useMemo(
    () => (classroomStudent ? null : pickBestMissedWord((data.missedWords ?? []).map((w) => w.word), [], boardLanguage)),
    [classroomStudent, data.missedWords, boardLanguage],
  );
  const uniqueCount = useMemo(() => (username ? selectUniqueWords(c.allPlayerWords, username).length : 0), [c.allPlayerWords, username]);
  const rival = useMemo(() => calloutRival(boardRows), [boardRows]);
  const rivalRow = rival ? boardRows.find((r) => r.username === rival.username) : undefined;
  const bragInput = {
    gameCode,
    gameMode: c.resolvedGameMode,
    language: c.language,
    isWinner: iWon,
    rank: myRank,
    playerCount: data.sortedScores.length,
    score: myScore,
    wordsFound: (me?.allWords ?? []).filter((w) => w.validated && !w.isDuplicate).length,
    longestWord: bestWord?.word,
    opponent: rival ? { name: rival.username, score: rivalRow?.score ?? 0, avatar: rivalRow?.avatar } : undefined,
  };
  const brag = useMpBrag(bragInput, t);
  const canBrag = (branch === 'final' || (branch === 'intermission' && iWon)) && !c.isClassroom && !hideOutcome && !!me && !!username && data.sortedScores.length >= 2;
  const h2hLive = useRivalHeadToHead(rival, c.isAuthenticated && !c.isGuest);
  const h2h = useFrozenAfter(h2hLive, seen('card'));
  // The shared rival card owns the H2H record (meetings >= 2), so the card callout never reprints it.
  const showH2hStrip = !!h2h && h2h.meetings >= 2 && !hideOutcome && !c.isClassroom;
  const callout = useMemo(
    () => resultCallout({ rows: boardRows, uniqueCount, h2h: showH2hStrip ? null : h2h }),
    [boardRows, uniqueCount, h2h, showH2hStrip],
  );
  const rivalFriend = useMemo(() => {
    if (!rival?.userId) return null;
    return friends.find((f) => f.odUserId === rival.userId) ?? null;
  }, [friends, rival]);
  const openChallenge = useCallback(() => {
    auto.cancel();
    const isFriend = !!rivalFriend;
    trackGrowthEvent('results_challenge_cta_tapped', { hasRival: !!rival, isFriend });
    trackGrowthEvent('mp_results_challenge_cta', { surface: 'mp_results' });
    if (!c.isAuthenticated || c.isGuest || !rivalFriend) {
      setShowShareModal(true);
      return;
    }
    setChallengeFriend({
      odUserId: rivalFriend.odUserId,
      username: rivalFriend.username,
      displayName: rivalFriend.displayName,
    });
  }, [auto, rivalFriend, rival, c.isAuthenticated, c.isGuest, setShowShareModal, setChallengeFriend]);
  const champions = series?.champions ?? NO_CHAMPIONS;

  const signupShown = showInlineSignup({ isGuest: c.isGuest, isClassroom: c.isClassroom, footerShown, branch });
  const signupSlot = showInlineSignup({ isGuest: c.isGuest, isClassroom: c.isClassroom, footerShown: true, branch: expectedBranch });

  const exitCopy = resultsExitCopy({ isClassroom: c.isClassroom, isHost });
  const bossOutcome = useClassroomBossStore((s) => s.view?.status === 'defeated' || s.view?.status === 'escaped');

  const header = (
    <MpResultsHeader
      branch={branch}
      round={Math.max(1, seriesRoundNumber)}
      totalRounds={seriesTotalGames}
      playedMode={c.resolvedGameMode}
      onLeave={c.requestExit}
      t={t}
    />
  );

  const podiumShown = !hideOutcome && boardRows.length >= 2;
  const detailsExtras = c.isClassroom ? null : (
    <MpDetailsExtras
      onChallenge={branch === 'final' ? () => { setDetailsOpen(false); openChallenge(); } : undefined}
      allPlayerWords={c.allPlayerWords}
      username={username}
      bestMissed={bestMissed}
      hideOutcome={hideOutcome}
      mode={c.resolvedGameMode}
      playerCount={data.sortedScores.length}
      t={t}
    />
  );
  const body = (
    <>
    <div
      data-testid="mp-results-stage"
      data-branch={branch ?? 'pending'}
      onPointerDown={done ? undefined : handleSkip}
      className={cn(
        'relative isolate flex-[1_0_100%] w-full max-w-xl mx-auto flex flex-col items-center justify-center [@media(min-height:780px)]:[--mp-u:1.22] lg:[--mp-u:1.15] tv:[--mp-u:1.6]',
        'gap-[calc(12px*var(--mp-u,1))] px-[calc(16px*var(--mp-u,1))] py-[calc(12px*var(--mp-u,1))]',
      )}
    >
      <BossOutcomeCard size="phone" className="relative z-10 shrink-0 w-full" />
      {champions.length > 0 && (
        <p data-testid="mp-series-champion" className={cn('shrink-0 inline-flex items-center gap-1.5 rounded-full border-2 border-neo-black bg-neo-yellow px-3 py-0.5 text-neo-black font-bold text-[calc(12px*var(--mp-u,1))]', fx.chipPop)}>
          <Trophy aria-hidden="true" className="w-4 h-4" />
          <span dir="auto" className="truncate max-w-[12rem]">{champions[0]}</span>
          {champions.length > 1 && <span className="tabular-nums">+{champions.length - 1}</span>}
          <span className="uppercase">· {t('mpUi.results.seriesChampion')}</span>
        </p>
      )}
      {hideOutcome && (
        <p data-testid="mp-results-reveal-note" className="rounded-neo border-[2px] border-neo-cream bg-neo-navy-elevated p-3 text-center font-neo-body font-bold text-neo-cream">
          {t('education.classroomGame.pressure.revealAtEnd')}
        </p>
      )}
      {!bossOutcome && podiumShown && (
        <>
          <MpPodium rows={visible.rows} isRevealed={(pos) => seen(`row-${pos}`)} label={t('mpUi.results.podium')} t={t} />
          {visible.rows.length > 3 && (
            <MpStandingsSection
              allRows={boardRows}
              rows={visible.rows.slice(3)}
              hiddenCount={visible.hiddenCount}
              gapBeforeLast={visible.gapBeforeLast}
              isRevealed={(pos) => seen(`row-${pos + 3}`)}
              onOpenChange={setStandingsOpen}
              layout="list"
              t={t}
              className="w-full"
            />
          )}
        </>
      )}
      {!bossOutcome && (
        <div className="relative w-full pt-[calc(14px*var(--mp-u,1))]">
          <button
            type="button"
            data-testid="mp-results-details-open"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => setDetailsOpen(true)}
            className={cn(
              'absolute z-10 top-0 end-[calc(12px*var(--mp-u,1))] inline-flex items-center gap-1 rounded-full border-2 border-neo-cream/50 bg-neo-navy text-neo-cream',
              'px-[calc(10px*var(--mp-u,1))] h-[calc(30px*var(--mp-u,1))] font-neo-display font-bold uppercase text-[calc(12px*var(--mp-u,1))] active:translate-y-[1px]',
              !seen('card') && 'invisible',
            )}
          >
            <ListOrdered aria-hidden="true" className="w-4 h-4" />
            {props.classroomSummary ? t('mpUi.results.lessonRecap') : t('mpUi.results.details')}
            <DirectionalIcon icon={ChevronRight} className="w-4 h-4" />
          </button>
          <MpMyCard
            rank={myRank}
            winner={iWon && rows.length > 1}
            total={data.sortedScores.length}
            score={myScore}
            tied={boardRows.filter((r) => r.rank === myRank).length > 1}
            allZero={boardRows.length > 1 && topTwo.top === 0}
            bestWord={bestWord}
            xp={socketEvents.xpGainedData?.xpEarned ?? null}
            coins={c.sideEffects.coinReward?.awarded ?? null}
            bestMissed={bestMissed}
            language={boardLanguage}
            callout={callout}
            revealed={seen('card')}
            series={!!series}
            hideClassPosition={hideOutcome}
            t={t}
          />
        </div>
      )}
      {!c.isClassroom && <MpResultsReactionBar onSend={c.reactions.sendReaction} t={t} className="w-full" />}
      {username ? (
        <div className="shrink-0 empty:hidden" data-testid="mp-mmr-change">
          <MmrChangeBadge username={username} />
        </div>
      ) : null}
      {classroomStudent && props.gameCode && (
        <div className={cn('shrink-0 w-full empty:hidden', seen('card') ? fx.chestStagger : 'invisible')}>
          <ChestRewardCta gameCode={props.gameCode} roundId={rewardRoundId(props.gameSessionId, props.gameCode)} />
        </div>
      )}
      {classroomStudent && props.gameCode && <RoundShop gameCode={props.gameCode} />}
      {classroomStudent ? (
        <StudentMissedWords
          words={missedWords}
          language={props.roomLanguage ?? c.language}
          t={t}
          onPractice={practiceLessonId && missedWords.length > 0 ? () => openLessonPractice(practiceLessonId) : undefined}
          className={cn('shrink-0 w-full', !seen('card') && 'invisible', seen('card') && fx.cardIn)}
        />
      ) : null}
      {/* Native AdMob banner / CrazyGames banner. The web dev placeholder
          ([data-ad-zone], null in production) is hidden so dev matches prod.
          Classroom rounds are ad-free (for-schools pricing promise). */}
      {!c.isClassroom && (
        <div className="shrink-0 empty:hidden [&_[data-ad-zone]]:hidden">
          <ResultsBannerSlot placement="multiplayer-round-complete" />
          <CrazyGamesBanner size="320x50" />
        </div>
      )}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-40 overflow-hidden">
        {c.reactions.floatingReactions.map((r) => (
          <FloatingReaction key={r.id} id={r.id} emoji={r.emoji} username={r.username} x={r.x} y={r.y} onComplete={c.reactions.dismissReaction} />
        ))}
      </div>
    </div>
    {seen('card') && !c.isClassroom && (
        <div className="w-full max-w-xl mx-auto px-[calc(16px*var(--mp-u,1))] pb-6"><ResultsSocialSlot
            mode="multiplayer"
            subMode={c.resolvedGameMode}
            score={myScore}
            xp={socketEvents.xpGainedData && { gained: socketEvents.xpGainedData.xpEarned, total: socketEvents.xpGainedData.newTotalXp }}
            opponentUserIds={boardRows.flatMap((r) => (!r.isMe && !r.isBot && r.userId ? [r.userId] : []))}
            holdNamePrompt={!asks.namePrompt}
            holdGuestSave={!asks.saveCard}
            {...(showH2hStrip ? { rival: mpH2hRival(rival, h2h), onRematch: rematch } : {})}
          /></div>
      )}
    </>
  );

  const pickNext = (mode: string) => {
    c.setSelectedGameMode(mode as GameModeOption);
    auto.restart();
  };
  const teacherPicks = isHost && c.isClassroom;
  const nextModeCard = classroomStudent || !nextModeSlot ? null : teacherPicks ? (
    branch === 'final' ? null : <MpNextModeCard mode={teacherNext.mode} options={CLASSROOM_NEXT_OPTIONS} onChange={(m) => { teacherNext.pick(m); auto.restart(); }} t={t} />
  ) : (
    <MpNextModeCard mode={nextMode} onChange={isHost ? pickNext : undefined} t={t} />
  );
  const joinerReady = !isHost && isReady && !c.isClassroom;

  const footer = (
    <div className="relative w-full max-w-xl lg:max-w-2xl tv:max-w-4xl lg:[--mp-u:1.15] tv:[--mp-u:1.6] mx-auto px-[calc(16px*var(--mp-u,1))] pt-2 pb-[calc(12px*var(--mp-u,1))] min-h-[calc(84px*var(--mp-u,1))] flex flex-col justify-center gap-[calc(10px*var(--mp-u,1))]">
      {nextModeCard && !joinerReady && (
        <div className={cn(!seen('card') && 'invisible', seen('card') && fx.cardIn)}>{nextModeCard}</div>
      )}
      {footerShown ? (
        <div className={fx.footerUp}>
          {branch === 'final' ? (
            <MpFinalFooter isHost={isHost} isReady={isReady} onRematch={rematch} onLeave={c.requestExit} onShare={canBrag ? () => { auto.cancel(); void brag.share('mp_results_footer'); } : () => setShowShareModal(true)} leaveKey={exitCopy.leaveKey} auto={auto} t={t} />
          ) : (
            <MpIntermissionFooter
              isHost={isHost}
              isClassroom={c.isClassroom}
              isReady={isReady}
              ready={tally.ready}
              total={tally.total}
              auto={auto}
              adHold={c.adGate.anyAdActive}
              onStart={startNext}
              onReady={markReady}
              nextModeLabel={classroomStudent ? nextModeLabel : nextMode ? t(getModePresentation(nextMode).labelKey) : undefined}
              t={t}
            />
          )}
        </div>
      ) : (
        <button type="button" onClick={handleSkip} className="self-center rounded-full px-4 py-2 text-[calc(12px*var(--mp-u,1))] font-bold uppercase tracking-widest text-neo-white/60">
          {t('mpUi.results.skipHint')}
        </button>
      )}
      {signupSlot && (
        <InlineSignupCard isAuthenticated={c.isAuthenticated} analyticsSource="results_inline" compact held={!signupShown} className={cn('shrink-0', signupShown ? fx.cardIn : 'invisible')} />
      )}
    </div>
  );

  return (
    <MpGuestAddPromptProvider value={!c.isClassroom}>
      <MpScreen testId="mp-results" header={header} body={body} footer={footer} bodyScroll="inner" backdrop={<AmbientBackdrop theme="multiplayer" />} />
      {done && (
        <>
          <ResultsModals
            wordFeedback={{ showWordFeedback: socketEvents.showWordFeedback, wordToVote: socketEvents.wordToVote, wordQueue: socketEvents.wordQueue, onVote: socketEvents.handleVote, onSkip: socketEvents.handleFeedbackSkip }}
            referralMilestone={{ milestone: socketEvents.referralMilestone, showReferralMilestone: socketEvents.showReferralMilestone, onClose: socketEvents.handleReferralMilestoneClose }}
            levelUp={{ levelUpData: socketEvents.levelUpData, showLevelUpCelebration: socketEvents.showLevelUpCelebration, setShowLevelUpCelebration: socketEvents.setShowLevelUpCelebration, setLevelUpData: socketEvents.setLevelUpData }}
            authModal={{ showAuthModal: c.sideEffects.showAuthModal, setShowAuthModal: c.sideEffects.setShowAuthModal }}
            firstWinModal={{ showFirstWinModal: c.sideEffects.showFirstWinModal, setShowFirstWinModal: c.sideEffects.setShowFirstWinModal }}
            shareModal={{ showShareModal: c.showShareModal, setShowShareModal, gameCode, userRequested: true }}
            t={t}
            language={c.language}
          />
          <MultiplayerSignupSheet isOpen={nudgeSheetOpen} onClose={c.nudge.dismissNudge} stats={c.nudge.stats} bottomOffset={0} />
          <SignupToast isVisible={nudgeReady && c.nudge.activeNudge === 'toast'} onDismiss={c.nudge.dismissNudge} mpGamesThisSession={c.nudge.stats.mpGamesThisSession} />
          <PostRoundSummary />
        </>
      )}
      <MpResultsDetails open={detailsOpen} onClose={() => setDetailsOpen(false)} c={c} extra={detailsExtras} />
      <MpResultsExitDialog c={c} classroomStudent={classroomStudent} copy={exitCopy} />
      {challengeDialog}
    </MpGuestAddPromptProvider>
  );
}
