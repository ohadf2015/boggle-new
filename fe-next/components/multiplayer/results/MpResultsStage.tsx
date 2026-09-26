'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useReducedMotion } from 'framer-motion';
import { ChevronRight, ListOrdered, Trophy } from 'lucide-react';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { MpScreen } from '../shell/MpScreen';
import { ResultsModals } from '@/components/results/ResultsModals';
import { PostRoundSummary } from '@/components/results/PostRoundSummary';
import ResultsBannerSlot from '@/components/ads/ResultsBannerSlot';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { useCrazyGames } from '@/components/CrazyGamesSDK';
import { useShareOpenGuard } from '@/hooks/useShareOpenGuard';
import { useHostSelectedGameMode } from '@/hooks/gameState/store';
import { SERIES_TOTAL_GAMES } from '@/hooks/useSeriesTracker';
import type { GameModeOption } from '@/components/GameModeSelector';
import { cn } from '@/lib/utils';
import { buildMpStandings } from './mpStandings';
import { pickBestWord, pickVisibleRows, readyTally, rivalGap } from './mpResultsView';
import { buildRevealTimeline } from './revealTimeline';
import { useRevealStage } from './useRevealStage';
import { useAutoAdvance } from './useAutoAdvance';
import { useLockedBranch, useResultBeats } from './useResultBeats';
import { MpResultsHeader } from './MpResultsHeader';
import { MpStandingsBoard } from './MpStandingsBoard';
import { MpMyCard } from './MpMyCard';
import { MpNextModeCard } from './MpNextModeCard';
import { MpFinalFooter, MpIntermissionFooter } from './MpResultsFooter';
import MpResultsDetails from './MpResultsDetails';
import type { MpResultsController } from './useMpResultsController';
import fx from './mpResults.module.css';

const MultiplayerSignupSheet = dynamic(() => import('@/components/auth/MultiplayerSignupSheet'), { ssr: false });
const SignupToast = dynamic(() => import('@/components/auth/SignupToast'), { ssr: false });
const CrazyGamesBanner = dynamic(() => import('@/components/CrazyGamesBanner'), { ssr: false });
const FloatingReaction = dynamic(() => import('@/components/game/QuickReactions').then((m) => m.FloatingReaction), { ssr: false });

/** Max standings rows on one screen (8 seats; in a bigger room I stay visible). */
const MAX_ROWS = 8;
const AUTO_ADVANCE_SECONDS = 10;

/**
 * The results show: TIME! → standings rise last → 1st → my card rolls → footer.
 * One screen, zero page scroll; everything else is behind DETAILS.
 */
export function MpResultsStage({ c }: { c: MpResultsController }) {
  const { props, t, data, socketEvents } = c;
  const { username, isHost = false, seriesRoundNumber = 0, seriesTotalGames = SERIES_TOTAL_GAMES, seriesStandings, gameCode } = props;
  const reduced = !!useReducedMotion();

  const rows = useMemo(() => buildMpStandings({
    sortedScores: data.sortedScores,
    username,
    normalizeUsername: data.normalizeUsername,
    series: { roundNumber: seriesRoundNumber, standings: seriesStandings },
  }), [data.sortedScores, username, data.normalizeUsername, seriesRoundNumber, seriesStandings]);
  const visible = useMemo(() => pickVisibleRows(rows, MAX_ROWS), [rows]);
  const timeline = useMemo(() => buildRevealTimeline(visible.rows.length), [visible.rows.length]);

  const myRank = data.currentPlayerRank;
  const beats = useResultBeats({
    myRank,
    isWinner: data.isCurrentUserWinner,
    topScore: data.sortedScores[0]?.score ?? 0,
    runnerUpScore: data.sortedScores[1]?.score ?? 0,
    instant: reduced,
  });
  const { stage, done, skip } = useRevealStage(timeline, { instant: reduced, onBeat: beats.onBeat });
  const { branch, lock } = useLockedBranch(seriesRoundNumber >= seriesTotalGames);
  const handleSkip = useCallback(() => {
    lock();
    skip();
    beats.fireVerdict(true);
  }, [lock, skip, beats]);
  const seen = (name: Parameters<typeof timeline.stageOf>[0]) => stage >= timeline.stageOf(name);
  const footerShown = seen('footer') && branch !== null;

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Win share prompt: once per room, and only after the show (never over it).
  const { shouldFireShareOpen } = useShareOpenGuard();
  const { setShowShareModal } = c;
  useEffect(() => {
    if (!done || !data.isCurrentUserWinner || !gameCode) return;
    if (shouldFireShareOpen(gameCode)) setShowShareModal(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per room, after the reveal
  }, [done, gameCode, data.isCurrentUserWinner]);

  const tally = useMemo(() => readyTally(data.sortedScores, socketEvents.readyUsernames), [data.sortedScores, socketEvents.readyUsernames]);
  const isReady = socketEvents.isCurrentPlayerReady;
  const { isOnCrazyGamesPlatform } = useCrazyGames();
  const { handleStartGame } = c.nextRound;
  const { handleMarkReady } = socketEvents;
  const auto = useAutoAdvance({
    seconds: AUTO_ADVANCE_SECONDS,
    armed: footerShown,
    paused: detailsOpen || pickerOpen || c.showExitConfirm || c.showShareModal || socketEvents.showWordFeedback,
    enabled: branch === 'intermission' && !c.isClassroom && (isHost || !isReady),
    onFire: isHost ? handleStartGame : handleMarkReady,
    persistCancel: !isOnCrazyGamesPlatform,
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
    if (isHost) c.handleNewSeries();
    else handleMarkReady();
  }, [isHost, c, handleMarkReady]);

  const hostPick = useHostSelectedGameMode() as GameModeOption | null | undefined;
  const nextMode: GameModeOption | null = isHost ? c.selectedGameMode : (hostPick ?? null);
  const me = data.currentPlayerData;
  const bestWord = useMemo(() => pickBestWord(me?.allWords), [me]);
  const gap = useMemo(() => rivalGap(rows), [rows]);
  const showChampion = branch === 'final' && seriesRoundNumber >= 2 && !!props.seriesLeader;

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

  const body = (
    <div
      data-testid="mp-results-stage"
      data-branch={branch ?? 'pending'}
      onPointerDown={done ? undefined : handleSkip}
      className={cn(
        'relative flex-1 min-h-0 w-full max-w-6xl mx-auto flex flex-col',
        'gap-[calc(10px*var(--mp-u,1))] p-[calc(12px*var(--mp-u,1))] lg:p-[calc(24px*var(--mp-u,1))]',
        'lg:grid lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:gap-[calc(28px*var(--mp-u,1))] lg:items-center',
      )}
    >
      <div className="min-h-0 flex-1 flex flex-col gap-[calc(8px*var(--mp-u,1))] lg:h-full lg:justify-center">
        {showChampion && (
          <p className={cn('shrink-0 self-center inline-flex items-center gap-1.5 rounded-full border-2 border-neo-black bg-neo-yellow px-3 py-0.5 text-neo-black font-bold text-[calc(12px*var(--mp-u,1))]', fx.chipPop)}>
            <Trophy aria-hidden="true" className="w-4 h-4" />
            <span dir="auto" className="truncate max-w-[12rem]">{props.seriesLeader}</span>
            <span className="uppercase">· {t('mpUi.results.seriesChampion')}</span>
          </p>
        )}
        <MpStandingsBoard
          rows={visible.rows}
          hiddenCount={visible.hiddenCount}
          isRevealed={(pos) => seen(`row-${pos}`)}
          t={t}
          className="flex-1 lg:flex-none lg:h-[min(100%,calc(560px*var(--mp-u,1)))]"
        />
      </div>
      <div className="shrink-0 flex flex-col gap-[calc(10px*var(--mp-u,1))] lg:justify-center">
        <div className="relative">
        <button
          type="button"
          data-testid="mp-results-details-open"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => setDetailsOpen(true)}
          className={cn(
            'absolute z-10 -top-[calc(14px*var(--mp-u,1))] end-[calc(12px*var(--mp-u,1))] inline-flex items-center gap-1 rounded-full border-2 border-neo-black bg-neo-cyan text-neo-black shadow-hard-sm',
            'px-[calc(10px*var(--mp-u,1))] h-[calc(30px*var(--mp-u,1))] font-neo-display font-bold uppercase text-[calc(12px*var(--mp-u,1))]',
            'active:translate-x-[1px] active:translate-y-[1px] active:shadow-none',
          )}
        >
          <ListOrdered aria-hidden="true" className="w-4 h-4" />
          {t('mpUi.results.details')}
          <DirectionalIcon icon={ChevronRight} className="w-4 h-4" />
        </button>
        <MpMyCard
          rank={myRank}
          total={data.sortedScores.length}
          score={me?.score ?? 0}
          bestWord={bestWord}
          xp={socketEvents.xpGainedData?.xpEarned ?? null}
          coins={c.sideEffects.coinReward?.awarded ?? null}
          gap={gap}
          revealed={seen('card')}
          t={t}
        />
        </div>
        {branch === 'intermission' && (
          <MpNextModeCard
            mode={nextMode}
            onChange={isHost && !c.isClassroom ? c.setSelectedGameMode : undefined}
            onPickerOpenChange={setPickerOpen}
            t={t}
            className={cn(!seen('card') && 'invisible', seen('card') && fx.cardIn)}
          />
        )}
        {/* Native AdMob banner / CrazyGames banner. The web dev placeholder
            ([data-ad-zone], null in production) is hidden so dev matches prod. */}
        <div className="shrink-0 empty:hidden [&_[data-ad-zone]]:hidden">
          <ResultsBannerSlot placement="multiplayer-round-complete" />
          <CrazyGamesBanner size="320x50" />
        </div>
      </div>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-40 overflow-hidden">
        {c.reactions.floatingReactions.map((r) => (
          <FloatingReaction key={r.id} id={r.id} emoji={r.emoji} username={r.username} x={r.x} y={r.y} onComplete={c.reactions.dismissReaction} />
        ))}
      </div>
    </div>
  );

  const footer = (
    <div className="relative w-full max-w-xl mx-auto px-[calc(12px*var(--mp-u,1))] pt-2 pb-[calc(10px*var(--mp-u,1))] min-h-[calc(84px*var(--mp-u,1))] flex flex-col justify-center overflow-hidden">
      {footerShown ? (
        <div className={fx.footerUp}>
          {branch === 'final' ? (
            <MpFinalFooter isHost={isHost} isReady={isReady} onRematch={rematch} onLeave={c.requestExit} onShare={() => setShowShareModal(true)} t={t} />
          ) : (
            <MpIntermissionFooter
              isHost={isHost}
              isClassroom={c.isClassroom}
              isReady={isReady}
              ready={tally.ready}
              total={tally.total}
              auto={{ active: auto.active, secondsLeft: auto.secondsLeft, total: AUTO_ADVANCE_SECONDS, cancel: auto.cancel }}
              onStart={startNext}
              onReady={markReady}
              t={t}
            />
          )}
        </div>
      ) : (
        <button type="button" onClick={handleSkip} className="self-center rounded-full px-4 py-2 text-[calc(12px*var(--mp-u,1))] font-bold uppercase tracking-widest text-neo-white/60">
          {t('mpUi.results.skipHint')}
        </button>
      )}
    </div>
  );

  return (
    <>
      <MpScreen testId="mp-results" header={header} body={body} footer={footer} />
      {done && (
        <>
          <ResultsModals
            wordFeedback={{ showWordFeedback: socketEvents.showWordFeedback, wordToVote: socketEvents.wordToVote, wordQueue: socketEvents.wordQueue, onVote: socketEvents.handleVote, onSkip: socketEvents.handleFeedbackSkip }}
            referralMilestone={{ milestone: socketEvents.referralMilestone, showReferralMilestone: socketEvents.showReferralMilestone, onClose: socketEvents.handleReferralMilestoneClose }}
            levelUp={{ levelUpData: socketEvents.levelUpData, showLevelUpCelebration: socketEvents.showLevelUpCelebration, setShowLevelUpCelebration: socketEvents.setShowLevelUpCelebration, setLevelUpData: socketEvents.setLevelUpData }}
            authModal={{ showAuthModal: c.sideEffects.showAuthModal, setShowAuthModal: c.sideEffects.setShowAuthModal }}
            firstWinModal={{ showFirstWinModal: c.sideEffects.showFirstWinModal, setShowFirstWinModal: c.sideEffects.setShowFirstWinModal }}
            shareModal={{ showShareModal: c.showShareModal, setShowShareModal, gameCode }}
            t={t}
            language={c.language}
          />
          <MultiplayerSignupSheet isOpen={c.nudge.activeNudge === 'sheet'} onClose={c.nudge.dismissNudge} stats={c.nudge.stats} bottomOffset={0} />
          <SignupToast isVisible={c.nudge.activeNudge === 'toast'} onDismiss={c.nudge.dismissNudge} mpGamesThisSession={c.nudge.stats.mpGamesThisSession} />
          <PostRoundSummary />
        </>
      )}
      <MpResultsDetails open={detailsOpen} onClose={() => setDetailsOpen(false)} c={c} />
      <ConfirmationDialog
        open={c.showExitConfirm}
        onOpenChange={c.setShowExitConfirm}
        title={t('playerView.exitConfirmation')}
        description={t('results.exitWarning')}
        confirmText={t('common.confirm')}
        cancelText={t('common.cancel')}
        onConfirm={c.confirmExitRoom}
        variant="default"
        analyticsId="exit_room_confirm"
      />
    </>
  );
}
