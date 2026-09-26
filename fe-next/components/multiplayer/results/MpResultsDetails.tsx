'use client';

import { useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import logger from '@/utils/logger';
import { MpSheet } from '../shell/MpSheet';
import { ResultsMainContent } from '@/components/results/ResultsMainContent';
import { ResultsDetailsContent } from '@/components/results/ResultsDetailsContent';
import BlastMpResults, { buildBlastMpResults } from '@/components/blast/legacy/BlastMpResults';
import { resolveWheelRushStats } from '@/lib/results/wheelRushStatsFallback';
import { toStandings } from '@/components/education/results/resultsStandings';
import { stageReteachLessonData } from '@/lib/education/classroomGameHandoff';
import { modeSceneOwnsHeroSlot } from '@/lib/education/roundEndResultsRoute';
import { useIsDesktop } from '@/hooks/useMediaQuery';
import { useWordHuntPlayerLives, useWordHuntEliminatedPlayers, useBlastPlayerStats, useWheelRushPlayerStats, useBlastBoardClearedByLocal } from '@/hooks/gameState/store';
import type { MpResultsController } from './useMpResultsController';
import { useOpenLessonPractice } from './useOpenLessonPractice';

const WordHuntResultsSummary = dynamic(() => import('@/components/results/WordHuntResultsSummary'), { ssr: false });
const BlastResultsScene = dynamic(() => import('@/components/results/BlastResultsScene'), { ssr: false });
const WheelRushResultsScene = dynamic(() => import('@/components/results/WheelRushResultsScene'), { ssr: false });
const GlobalRankBadge = dynamic(() => import('@/components/multiplayer/GlobalRankBadge').then((m) => m.GlobalRankBadge), { ssr: false });
const DailyChallengeInvite = dynamic(() => import('@/components/growth/DailyChallengeInvite').then((m) => m.DailyChallengeInvite), { ssr: false });
const PostGameEngagement = dynamic(() => import('@/components/growth/PostGameEngagement'), { ssr: false });
const PostGameWordReview = dynamic(() => import('@/components/education/PostGameWordReview'), { ssr: false });
const ClassroomResultsCard = dynamic(() => import('@/components/education/ClassroomResultsCard').then((m) => m.ClassroomResultsCard), { ssr: false });
const TeamBattleStandings = dynamic(() => import('@/components/education/TeamBattleStandings').then((m) => m.TeamBattleStandings), { ssr: false });

interface Props {
  open: boolean;
  onClose: () => void;
  c: MpResultsController;
}

/**
 * DETAILS — everything that is not "who won, where did I land": word lists,
 * missed words, insights, XP breakdown, mode scenes, the lesson recap. It only
 * mounts while open (the reveal screen stays one screen, nothing below the fold).
 */
export default function MpResultsDetails({ open, onClose, c }: Props) {
  const isDesktop = useIsDesktop();
  if (!open) return null;
  return (
    <MpSheet open onClose={onClose} title={c.t('mpUi.results.detailsTitle')} side={isDesktop ? 'end' : 'bottom'} testId="mp-results-details">
      <DetailsBody c={c} />
    </MpSheet>
  );
}

function DetailsBody({ c }: { c: MpResultsController }) {
  const { props, t, data, socketEvents, sideEffects, isGuest, resolvedGameMode, lessonGameData } = c;
  const { username, gameCode, isHost = false, classroomSummary, wordHuntSummary } = props;
  const { sortedScores, currentPlayerValidWords } = data;
  const wordHuntPlayerLives = useWordHuntPlayerLives();
  const wordHuntEliminatedPlayers = useWordHuntEliminatedPlayers();
  const blastPlayerStats = useBlastPlayerStats();
  const wheelRushPlayerStats = useWheelRushPlayerStats();
  const blastBoardClearedByLocal = useBlastBoardClearedByLocal();

  // A lesson recap owns the top slot in a classroom round; mode hero scenes yield to it.
  const heroSlotOwnedByMode = modeSceneOwnsHeroSlot({ hasClassroomSummary: !!classroomSummary });
  const isWheelRush = resolvedGameMode === 'wheel-rush';
  const effectiveWheelRushStats = useMemo(() => resolveWheelRushStats(wheelRushPlayerStats, sortedScores), [wheelRushPlayerStats, sortedScores]);
  const hasWheelRushStats = Object.keys(effectiveWheelRushStats).length > 0;
  const blastMpResults = useMemo(() => (resolvedGameMode !== 'blast' ? [] : buildBlastMpResults(sortedScores, {
    boardClearedByLocal: blastBoardClearedByLocal,
    localUsername: username,
    playerStats: blastPlayerStats,
  })), [sortedScores, resolvedGameMode, blastBoardClearedByLocal, username, blastPlayerStats]);
  const blastResultScores = useMemo(() => Object.fromEntries(sortedScores.map((p) => [p.username, p.score || 0])), [sortedScores]);

  const wordHuntResultsData = useMemo(() => resolvedGameMode !== 'word-hunt' ? undefined : {
    targetWord: wordHuntSummary?.targetWord || '',
    foundTarget: !!wordHuntSummary?.targetFoundBy,
    isFirstFinder: wordHuntSummary?.targetFoundBy === username,
    survivalTime: wordHuntSummary?.survivalTime ?? 0,
    discoveryWords: wordHuntSummary?.discoveryWords ?? 0,
    playerResults: sortedScores.map((p) => {
      const words = p.allWords || [];
      const valid = words.filter((w) => w && !w.isDuplicate && w.validated);
      const invalid = words.filter((w) => w && !w.isDuplicate && !w.validated);
      const avgLen = valid.length > 0 ? Math.round((valid.reduce((s, w) => s + w.word.length, 0) / valid.length) * 10) / 10 : 0;
      return {
        username: p.username,
        score: p.score || 0,
        survived: !(wordHuntSummary?.eliminatedPlayers ?? wordHuntEliminatedPlayers ?? []).includes(p.username),
        lifeRemaining: (wordHuntSummary?.playerLives ?? wordHuntPlayerLives ?? {})[p.username] ?? 0,
        validWordCount: valid.length,
        invalidWordCount: invalid.length,
        avgWordLength: avgLen,
        longestWordLength: valid.reduce((max, w) => Math.max(max, w.word.length), 0),
        attemptsToFind: wordHuntSummary?.playerAttempts?.[p.username],
        avatar: p.avatar,
      };
    }),
    currentUsername: username,
  }, [resolvedGameMode, wordHuntSummary, sortedScores, wordHuntEliminatedPlayers, wordHuntPlayerLives, username]);

  // Teacher reteach: restage the lesson narrowed to the missed words, then
  // reload so the session rehydrates it in the SAME room (students stay put).
  const handleReteachRound = useCallback(() => {
    if (!classroomSummary) return;
    if (!stageReteachLessonData(classroomSummary)) {
      logger.warn('[RESULTS] Could not stage reteach round');
      return;
    }
    window.location.reload();
  }, [classroomSummary]);
  // Teacher rematch: same lesson payload, same room — a plain reload rejoins it.
  const handleRematch = useCallback(() => {
    if (!classroomSummary) return;
    try {
      if (!sessionStorage.getItem('lessonGameData')) return;
    } catch (err) {
      logger.warn('[RESULTS] Could not verify rematch payload:', err);
      return;
    }
    window.location.reload();
  }, [classroomSummary]);
  const classroomStandings = useMemo(() => toStandings(sortedScores), [sortedScores]);
  const openLessonPractice = useOpenLessonPractice();

  // A classroom recap reaches account-less students (they join with a code), so it is NOT guest-gated.
  const postGameWordReviewNode = classroomSummary ? (
    <>
      {classroomSummary.teamBattle && (
        <div className="mb-4">
          <TeamBattleStandings teams={classroomSummary.teamBattle.teams} scores={classroomStandings} />
        </div>
      )}
      <ClassroomResultsCard
        summary={classroomSummary}
        username={username}
        isTeacher={isHost}
        standings={classroomStandings}
        onReteach={isHost && classroomSummary.missedWords.length > 0 ? handleReteachRound : undefined}
        onRematch={isHost ? handleRematch : undefined}
        onPractice={classroomSummary.lessonIds[0] ? () => openLessonPractice(classroomSummary.lessonIds[0]) : undefined}
      />
    </>
  ) : lessonGameData && !isGuest ? (
    <PostGameWordReview
      vocabularyWords={lessonGameData.vocabularyWords}
      wordsFound={currentPlayerValidWords.map((w: { word: string }) => w.word)}
      lessonId={lessonGameData.lessonId}
      onPractice={() => openLessonPractice(lessonGameData.lessonId)}
    />
  ) : null;

  const detailsContentProps = {
    allPlayerWords: c.allPlayerWords,
    username,
    gameCode,
    otherPlayers: data.otherPlayers,
    missedWords: data.missedWords,
    isHost,
    t,
  };

  const mainContentProps = {
    sortedScores,
    nearMisses: socketEvents.nearMisses,
    isHost,
    onStartGame: c.nextRound.handleStartGame,
    onMarkReady: socketEvents.handleMarkReady,
    onExit: c.requestExit,
    winStreakData: sideEffects.winStreakData ?? null,
    xpGainedData: socketEvents.xpGainedData,
    levelUpData: socketEvents.levelUpData,
    isAuthenticated: c.isAuthenticated,
    currentPlayerData: data.currentPlayerData ?? null,
    isCurrentUserWinner: data.isCurrentUserWinner,
    currentPlayerValidWords,
    currentPlayerRank: data.currentPlayerRank,
    scoreRevealComplete: true,
    normalizeUsername: data.normalizeUsername,
    username,
    gameCode,
    onReturnToRoom: props.onReturnToRoom,
    isBotsOnlyGame: data.isBotsOnlyGame,
    isCurrentPlayerReady: socketEvents.isCurrentPlayerReady,
    readyUsernames: socketEvents.readyUsernames,
    duplicateRuleDisabled: props.duplicateRuleDisabled ?? false,
    t,
    selectedGameMode: c.selectedGameMode,
    onSelectGameMode: c.setSelectedGameMode,
    seriesStandings: props.seriesStandings,
    seriesRoundNumber: props.seriesRoundNumber,
    seriesTotalGames: props.seriesTotalGames,
    seriesLeader: props.seriesLeader,
    gameMode: resolvedGameMode,
    missedWords: data.missedWords,
    allPlayerWords: c.allPlayerWords,
    gameDuration: props.gameDuration,
    wordHuntSummary,
    onPodiumReaction: c.reactions.sendReaction,
    coinReward: sideEffects.coinReward,
    shareCardStats: data.shareCardStats,
    // The reveal screen already owns the standings; the sheet is the deep dive.
    hideStandings: true,
    hideInlineCta: true,
    hideBestWord: resolvedGameMode === 'blast' && !!blastPlayerStats[username]?.bestWord,
  };

  return (
    <div data-testid="mp-results-details-body" className="flex flex-col gap-4 max-w-2xl mx-auto w-full">
      {heroSlotOwnedByMode && isWheelRush && hasWheelRushStats && (
        <WheelRushResultsScene playerStats={effectiveWheelRushStats} scores={sortedScores} currentUsername={username} />
      )}
      {heroSlotOwnedByMode && resolvedGameMode === 'blast' && blastMpResults.length > 0 && (
        <BlastMpResults results={blastMpResults} gameMode="blast" />
      )}
      {classroomSummary && <div>{postGameWordReviewNode}</div>}
      <ResultsMainContent
        {...(mainContentProps as unknown as React.ComponentProps<typeof ResultsMainContent>)}
        detailsSlot={
          <>
            <ResultsDetailsContent {...(detailsContentProps as unknown as React.ComponentProps<typeof ResultsDetailsContent>)} />
            {!classroomSummary && postGameWordReviewNode}
          </>
        }
      />
      {wordHuntResultsData && <WordHuntResultsSummary {...wordHuntResultsData} />}
      {resolvedGameMode === 'blast' && Object.keys(blastPlayerStats).length > 0 && (
        <BlastResultsScene playerStats={blastPlayerStats} scores={blastResultScores} currentUsername={username} />
      )}
      {c.userId && (
        <div className="flex justify-center">
          <GlobalRankBadge userId={c.userId} matchScore={data.currentPlayerData?.score ?? 0} />
        </div>
      )}
      {c.showDailyInvite && (
        <DailyChallengeInvite
          isWinner={data.isCurrentUserWinner}
          placement={data.currentPlayerRank}
          totalPlayers={sortedScores.length}
          marginToNext={c.marginToNext}
        />
      )}
      <PostGameEngagement />
    </div>
  );
}
