'use client';

import { useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { MpSheet } from '../shell/MpSheet';
import BlastMpResults, { buildBlastMpResults } from '@/components/blast/legacy/BlastMpResults';
import { resolveWheelRushStats } from '@/lib/results/wheelRushStatsFallback';
import { toStandings } from '@/components/education/results/resultsStandings';
import { useReplayMissedWords } from '@/components/education/live/useReteachRound';
import { useClassroomCardRematch } from './useClassroomCardRematch';
import { modeSceneOwnsHeroSlot } from '@/lib/education/roundEndResultsRoute';
import { useIsDesktop } from '@/hooks/useMediaQuery';
import { useWordHuntPlayerLives, useWordHuntEliminatedPlayers, useBlastPlayerStats, useWheelRushPlayerStats, useBlastBoardClearedByLocal } from '@/hooks/gameState/store';
import { useClassroomPressure } from '@/hooks/gameState/classroomPressureStore';
import { isLeaderboardHidden } from '@/shared/utils/classroomPressure';
import { SERIES_TOTAL_GAMES } from '@/hooks/useSeriesTracker';
import type { MpResultsController } from './useMpResultsController';
import { useOpenLessonPractice } from './useOpenLessonPractice';
import type { GameModeOption } from '@/components/GameModeSelector';
import { MpDetailsWords, useDetailsViewed } from './MpDetailsWords';
import { MpRoundAwards, MpSeriesGrid } from './MpResultsAlbum';
import { buildMpStandings } from './mpStandings';
import { seriesLadder } from './mpResultsView';
import { roundAwards, seriesGrid } from './mpResultsStory';

const WordHuntResultsSummary = dynamic(() => import('@/components/results/WordHuntResultsSummary'), { ssr: false });
const BlastResultsScene = dynamic(() => import('@/components/results/BlastResultsScene'), { ssr: false });
const WheelRushResultsScene = dynamic(() => import('@/components/results/WheelRushResultsScene'), { ssr: false });
const PostGameWordReview = dynamic(() => import('@/components/education/PostGameWordReview'), { ssr: false });
const ClassroomResultsCard = dynamic(() => import('@/components/education/ClassroomResultsCard').then((m) => m.ClassroomResultsCard), { ssr: false });
const ClassroomRoundReward = dynamic(() => import('@/components/education/economy/ClassroomRoundReward'), { ssr: false });
const TeamBattleStandings = dynamic(() => import('@/components/education/TeamBattleStandings').then((m) => m.TeamBattleStandings), { ssr: false });

interface Props {
  open: boolean;
  onClose: () => void;
  c: MpResultsController;
}

/**
 * DETAILS — the deep dive behind the reveal: the mode scene, the lesson recap,
 * my words (found / only me / missed) and the round awards or series grid.
 * Mounts only while open, so the reveal screen stays one screen.
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
  const { props, t, data, isGuest, resolvedGameMode, lessonGameData } = c;
  const { username, gameCode, isHost = false, classroomSummary, wordHuntSummary, blastSummary } = props;
  const { sortedScores, currentPlayerValidWords } = data;
  useDetailsViewed(resolvedGameMode, data.currentPlayerData?.score ?? 0);
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
    collection: blastSummary?.collection,
  })), [sortedScores, resolvedGameMode, blastBoardClearedByLocal, username, blastPlayerStats, blastSummary?.collection]);
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

  const { handleStartGame } = c.nextRound;
  const replayMode = resolvedGameMode as GameModeOption | undefined;
  const startSameMode = useCallback(() => handleStartGame(replayMode ? { gameMode: replayMode } : undefined), [handleStartGame, replayMode]);
  const rematch = useClassroomCardRematch({ socket: props.socket ?? null, start: startSameMode });
  const reteach = useReplayMissedWords({ summary: classroomSummary, gameCode, socket: props.socket ?? null, onRematch: rematch.rematch });
  const classroomStandings = useMemo(() => toStandings(sortedScores), [sortedScores]);
  const openLessonPractice = useOpenLessonPractice();

  // TRUE hidden: the recap keeps the pedagogy, drops the placings (final = reveal).
  const pressure = useClassroomPressure();
  const isFinalRound = (props.seriesRoundNumber ?? 0) >= (props.seriesTotalGames ?? SERIES_TOTAL_GAMES);
  const hideClassPlacings = pressure != null && isLeaderboardHidden(pressure) && !isFinalRound;

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
        hideClassPlacings={hideClassPlacings}
        onReteach={isHost ? reteach.start : undefined}
        reteachStatus={reteach.status}
        onRestoreFull={reteach.restoreFull}
        onRematch={isHost ? rematch.rematch : undefined}
        rematchOffline={rematch.offline}
        onPractice={classroomSummary.lessonIds[0] ? () => openLessonPractice(classroomSummary.lessonIds[0]) : undefined}
      />
      {!isHost && gameCode && (
        <ClassroomRoundReward gameCode={gameCode} />
      )}
    </>
  ) : lessonGameData && !isGuest ? (
    <PostGameWordReview
      vocabularyWords={lessonGameData.vocabularyWords}
      wordsFound={currentPlayerValidWords.map((w: { word: string }) => w.word)}
      lessonId={lessonGameData.lessonId}
      onPractice={() => openLessonPractice(lessonGameData.lessonId)}
    />
  ) : null;

  const isFinal = isFinalRound && (props.seriesRoundNumber ?? 0) >= 2;
  const rows = useMemo(() => buildMpStandings({
    sortedScores,
    username,
    normalizeUsername: data.normalizeUsername,
    series: { roundNumber: props.seriesRoundNumber ?? 0, standings: props.seriesStandings },
  }), [sortedScores, username, data.normalizeUsername, props.seriesRoundNumber, props.seriesStandings]);
  const grid = useMemo(
    () => (isFinal ? seriesGrid({ ladder: seriesLadder(rows), standings: props.seriesStandings, rounds: props.seriesRoundNumber ?? 0 }) : null),
    [isFinal, rows, props.seriesStandings, props.seriesRoundNumber],
  );
  const awards = useMemo(() => (grid || hideClassPlacings ? null : roundAwards(sortedScores)), [grid, hideClassPlacings, sortedScores]);

  return (
    <div data-testid="mp-results-details-body" className="flex flex-col gap-4 max-w-2xl mx-auto w-full">
      {heroSlotOwnedByMode && isWheelRush && hasWheelRushStats && (
        <WheelRushResultsScene playerStats={effectiveWheelRushStats} scores={sortedScores} currentUsername={username} />
      )}
      {heroSlotOwnedByMode && resolvedGameMode === 'blast' && blastMpResults.length > 0 && (
        <BlastMpResults results={blastMpResults} gameMode="blast" />
      )}
      {classroomSummary && <div>{postGameWordReviewNode}</div>}
      <MpDetailsWords
        myWords={data.currentPlayerData?.allWords}
        allPlayerWords={c.allPlayerWords}
        username={username ?? ''}
        missedWords={data.missedWords ?? []}
        language={c.language}
        t={t}
      />
      {!classroomSummary && postGameWordReviewNode}
      {grid ? <MpSeriesGrid grid={grid} t={t} /> : awards && <MpRoundAwards awards={awards} t={t} />}
      {wordHuntResultsData && <WordHuntResultsSummary {...wordHuntResultsData} />}
      {resolvedGameMode === 'blast' && Object.keys(blastPlayerStats).length > 0 && (
        <BlastResultsScene playerStats={blastPlayerStats} scores={blastResultScores} currentUsername={username} collection={blastSummary?.collection} />
      )}
    </div>
  );
}
