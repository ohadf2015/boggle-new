'use client';

/**
 * Per-phase view routing for the multiplayer page (the old `renderView`).
 * The phase comes from the pure `resolveMpPagePhase`; each phase renders the
 * screen stub its piece owns. FROZEN after FOUNDATION: pieces change their
 * screens, never this router.
 */
import React, { type ComponentProps } from 'react';
import nextDynamic from 'next/dynamic';
import type { Socket } from 'socket.io-client';
import { FeatureErrorBoundary } from '@/components/ErrorBoundaries';
import { PageLoader } from '@/components/ui/PageLoader';
import { PlayfulBackground } from '@/components/ui/PlayfulBackground';
import type { MpPagePhase } from '@/lib/multiplayer/mpPhase';
import type { EntryScreenProps } from '@/components/multiplayer/entry/EntryScreen';
import type { MpResultsScreenProps } from '@/components/multiplayer/results/MpResultsScreen';
import type { PlayerViewProps } from '@/player/types';
import type HostViewComponent from '@/host/HostView';
import type { Language } from '@/shared/types/game';
import type { useMultiplayerGameFlow } from '@/hooks/useMultiplayerGameFlow';
import type { useSeriesTracker } from '@/hooks/useSeriesTracker';

function ViewLoadingSkeleton(): React.JSX.Element {
  return (
    <div className="flex-1 flex relative">
      <PlayfulBackground intensity="medium" colorScheme="game" />
      <PageLoader size="md" className="relative z-10" />
    </div>
  );
}

// Dynamic imports for code splitting
const HostView = nextDynamic(() => import('@/host/HostView'), {
  loading: () => <ViewLoadingSkeleton />,
  ssr: false,
});

const PlayerView = nextDynamic(() => import('@/player/PlayerView'), {
  loading: () => <ViewLoadingSkeleton />,
  ssr: false,
});

// SSR the entry view: it is the first above-fold paint (the `!isActive`
// default). With ssr:false the hero + CTAs were absent from server HTML, so
// first paint waited on PageClient bundle + this chunk + hydration → ~3s blank
// FCP (field: /multiplayer FCP 2976ms vs 256ms on lighter routes). ssr:true
// emits the lobby into the initial HTML (FCP ≈ TTFB) while still
// code-splitting the chunk for hydration. Hydration-safe on web: the only
// non-deterministic branch (CgLobbyHero variant from localStorage) is gated
// behind isOnCrazyGamesPlatform, which is false off the CG platform.
// In-game views (HostView/PlayerView/results) stay ssr:false — they are behind
// interaction (isActive), never first paint, and depend on live socket state.
const EntryScreen = nextDynamic(() => import('@/components/multiplayer/entry/EntryScreen'), {
  loading: () => <ViewLoadingSkeleton />,
  ssr: true,
});

const MpResultsScreen = nextDynamic(() => import('@/components/multiplayer/results/MpResultsScreen'), {
  loading: () => <ViewLoadingSkeleton />,
  ssr: false,
});

type HostViewProps = ComponentProps<typeof HostViewComponent>;
type ResultsData = ReturnType<typeof useMultiplayerGameFlow>['resultsData'];
type SeriesTracker = ReturnType<typeof useSeriesTracker>;

export interface MpPhaseRouterProps {
  phase: MpPagePhase;
  // shared
  gameCode: string;
  username: string;
  isHost: boolean;
  socket: Socket | null;
  roomLanguage: Language | null;
  isClassroomMode: boolean;
  classroomGameMode: HostViewProps['classroomGameMode'];
  onExitToLobby: () => void;
  onUsernameChange: (name: string) => void;
  // results
  resultsData: ResultsData;
  handleReturnToRoom: () => void;
  gameDuration: number;
  seriesTracker: SeriesTracker;
  // entry
  entry: EntryScreenProps;
  // in-room
  playersInRoom: NonNullable<PlayerViewProps['initialPlayers']>;
  handleShowResults: (data: unknown) => void;
  pendingGameStart: ReturnType<typeof useMultiplayerGameFlow>['pendingGameStart'];
  handleGameStartConsumed: () => void;
  lessonData: HostViewProps['lessonData'];
  isPrivate: boolean;
  quickPlay: boolean;
  classroomLive: HostViewProps['classroomLive'];
}

export function MpPhaseRouter({
  phase, gameCode, username, isHost, socket, roomLanguage, isClassroomMode, classroomGameMode,
  onExitToLobby, onUsernameChange, resultsData, handleReturnToRoom, gameDuration, seriesTracker, entry,
  playersInRoom, handleShowResults, pendingGameStart, handleGameStartConsumed, lessonData, isPrivate,
  quickPlay, classroomLive,
}: MpPhaseRouterProps): React.JSX.Element {
  if (phase === 'results') {
    const results: MpResultsScreenProps = {
      finalScores: resultsData?.scores ?? null, gameCode,
      onReturnToRoom: handleReturnToRoom, onExitToLobby, username, socket,
      duplicateRuleDisabled: resultsData?.duplicateRuleDisabled,
      playerCount: resultsData?.playerCount, isHost,
      roomLanguage: roomLanguage ?? undefined,
      gridSize: Array.isArray(resultsData?.letterGrid) && resultsData.letterGrid.length > 0 ? resultsData.letterGrid.length : 4,
      gameDuration, seriesStandings: seriesTracker.standings,
      seriesRoundNumber: seriesTracker.roundNumber,
      seriesTotalGames: seriesTracker.totalGames,
      seriesLeader: seriesTracker.seriesLeader,
      onResetSeries: seriesTracker.reset,
      wordHuntSummary: resultsData?.wordHuntSummary,
      blastSummary: resultsData?.blastSummary,
      wheelRushSummary: resultsData?.wheelRushSummary,
      classroomSummary: resultsData?.classroomSummary,
    } as MpResultsScreenProps;
    return (
      <FeatureErrorBoundary featureName="Results">
        <MpResultsScreen {...results} />
      </FeatureErrorBoundary>
    );
  }

  if (phase === 'entry') {
    return (
      <FeatureErrorBoundary featureName="Lobby">
        <EntryScreen {...entry} />
      </FeatureErrorBoundary>
    );
  }

  if (phase === 'host') {
    return (
      <FeatureErrorBoundary featureName="Host Game">
        <HostView
          gameCode={gameCode} roomLanguage={roomLanguage ?? undefined}
          initialPlayers={playersInRoom} username={username}
          onShowResults={handleShowResults} pendingGameStart={pendingGameStart}
          onGameStartConsumed={handleGameStartConsumed} lessonData={lessonData}
          onUsernameChange={onUsernameChange} autoStart={false}
          isPrivate={isPrivate}
          isQuickPlay={quickPlay}
          onExitToLobby={onExitToLobby}
          isClassroomMode={isClassroomMode}
          classroomGameMode={classroomGameMode}
          classroomLive={classroomLive}
        />
      </FeatureErrorBoundary>
    );
  }

  return (
    <FeatureErrorBoundary featureName="Player Game">
      <PlayerView
        gameCode={gameCode} username={username}
        onShowResults={handleShowResults} initialPlayers={playersInRoom}
        pendingGameStart={pendingGameStart}
        onGameStartConsumed={handleGameStartConsumed}
        roomLanguage={roomLanguage} onUsernameChange={onUsernameChange}
        seriesRoundNumber={seriesTracker.roundNumber}
        onExitToLobby={onExitToLobby}
        isClassroomMode={isClassroomMode}
        classroomGameMode={classroomGameMode}
      />
    </FeatureErrorBoundary>
  );
}
