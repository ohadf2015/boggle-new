'use client';

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import nextDynamic from 'next/dynamic';
import toast from 'react-hot-toast';
import { useSearchParams } from 'next/navigation';
import AutoHideHeader from '@/components/AutoHideHeader';
import ErrorBoundary from '@/app/components/ErrorBoundary';
import { EducationHeader } from '@/components/education/EducationHeader';
import { ClassroomModeBanner } from '@/components/education/ClassroomModeBanner';
import { FeatureErrorBoundary } from '@/components/ErrorBoundaries';
import { ConnectionDot, ConnectionBanner } from '@/components/ConnectionStatusIndicator';
import SpectatorBanner from '@/components/SpectatorBanner';
import { SocketContext } from '@/utils/SocketContext';
import { saveSession, clearSession, clearSessionPreservingUsername } from '@/utils/session';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useMusic } from '@/contexts/MusicContext';
import { setStoredUsername } from '@/utils/profileStorage';
import { PageLoader } from '@/components/ui/PageLoader';
import { PlayfulBackground } from '@/components/ui/PlayfulBackground';
import { useConnectionToasts } from '@/hooks/useConnectionToasts';
import { useMultiplayerSocket } from '@/hooks/useMultiplayerSocket';
import { useMultiplayerAuth } from '@/hooks/useMultiplayerAuth';
import { useMultiplayerSession } from '@/hooks/useMultiplayerSession';
import { useMultiplayerGameFlow } from '@/hooks/useMultiplayerGameFlow';
import { useSeriesTracker } from '@/hooks/useSeriesTracker';
import { usePlayerJoinLeaveNotifications } from '@/hooks/usePlayerJoinLeaveNotifications';
import { useMultiplayerEventNotifications } from '@/hooks/useMultiplayerEventNotifications';
import { useHideNavigation } from '@/contexts/NavigationContext';
import { useMultiplayerJoin } from './useMultiplayerJoin';
import { useGameActions } from '@/hooks/gameState';
import { useCrazyGamesAuth } from '@/hooks/useCrazyGamesAuth';
import type { Language, ActiveRoom, Avatar, GameMode } from '@/shared/types/game';
import type { Socket } from 'socket.io-client';

// Dynamic imports for code splitting
const HostView = nextDynamic(() => import('@/host/HostView'), {
  loading: () => <ViewLoadingSkeleton />,
  ssr: false,
});

const PlayerView = nextDynamic(() => import('@/player/PlayerView'), {
  loading: () => <ViewLoadingSkeleton />,
  ssr: false,
});

const MultiplayerFlow = nextDynamic(() => import('@/components/multiplayer/MultiplayerFlow'), {
  loading: () => <ViewLoadingSkeleton />,
  ssr: false,
});

const ResultsPage = nextDynamic(() => import('@/components/views/ResultsPage'), {
  loading: () => <ViewLoadingSkeleton />,
  ssr: false,
});

function ViewLoadingSkeleton(): React.JSX.Element {
  return (
    <div className="flex-1 flex items-center justify-center bg-neo-navy relative">
      <PlayfulBackground intensity="medium" colorScheme="game" />
      <div className="relative z-10">
        <PageLoader size="md" />
      </div>
    </div>
  );
}

export default function MultiplayerPageClient(): React.JSX.Element {
  const searchParams = useSearchParams();
  const isClassroomMode = searchParams?.get('classroom') === 'true';
  const preselectedMode = searchParams?.get('mode') as GameMode | null;
  const autoCreate = searchParams?.get('autoCreate') === 'true';
  const validModes: GameMode[] = ['classic', 'blast', 'word-hunt'];
  const { setGameMode: setStoreGameMode } = useGameActions();

  const [gameCode, setGameCode] = useState<string>('');
  const [roomName, setRoomName] = useState<string>('');
  const [hostUsername, setHostUsername] = useState<string>('');
  const [isActive, setIsActive] = useState<boolean>(false);
  const [isHost, setIsHost] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [activeRooms, setActiveRooms] = useState<ActiveRoom[]>([]);
  const [roomLanguage, setRoomLanguage] = useState<Language | null>(null);
  const [playersInRoom, setPlayersInRoom] = useState<Array<{ username: string; score?: number; avatar?: Avatar; isHost?: boolean; isBot?: boolean; presenceStatus?: string; isWindowFocused?: boolean }>>([]);
  const [isJoining, setIsJoining] = useState<boolean>(false);

  const setIsInGame = useHideNavigation();

  // Pre-select game mode from URL param (e.g., ?mode=word-hunt)
  useEffect(() => {
    if (preselectedMode && validModes.includes(preselectedMode)) {
      setStoreGameMode(preselectedMode);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useConnectionToasts();

  const { t, language } = useLanguage();
  const { user, isAuthenticated, isSupabaseEnabled, profile, loading, refreshProfile } = useAuth();
  // CrazyGames requires displaying their usernames in multiplayer (Full Launch requirement)
  const { user: cgUser, isCrazyGames } = useCrazyGamesAuth();
  const { playTrack, TRACKS } = useMusic();

  const {
    username, setUsername, guestAvatar, setGuestAvatar,
    authLoadingStartTime, usernameManuallySetRef, hasSetRandomNameRef,
  } = useMultiplayerAuth(language as Language);

  const [lessonDataState, setLessonDataState] = useState<{
    lessonId: string; lessonName: string; vocabularyWords: string[];
    language: Language; templateSettings?: { timerSeconds: number; difficulty: string; minWordLength: number; allowLateJoin: boolean } | null;
  } | null>(null);

  // Ref bridge: allows hooks called before useMultiplayerSocket to access the socket
  const socketRef = useRef<Socket | null>(null);

  const handleSetLessonData = useCallback((data: typeof lessonDataState) => { setLessonDataState(data); }, []);
  const handleSetAttemptingReconnect = useCallback(() => {}, []);

  const {
    setShouldAutoJoin, prefilledRoomCode, setPrefilledRoomCode, lessonData,
  } = useMultiplayerSession({
    language: language as Language, socket: null, isConnected: false,
    isActive, attemptingReconnect: false, username, profile,
    usernameManuallySetRef, hasSetRandomNameRef,
    onSetGameCode: setGameCode, onSetUsername: setUsername, onSetRoomName: setRoomName,
    onSetGuestAvatar: setGuestAvatar, onSetAttemptingReconnect: handleSetAttemptingReconnect,
    onSetRoomLanguage: setRoomLanguage, onSetLessonData: handleSetLessonData, t,
  });

  const {
    showResults, setShowResults, resultsData, setResultsData,
    isSpectator, setIsSpectator, spectators, setSpectators,
    pendingGameStart, setPendingGameStart, setGameStartTime,
    gameDuration, handleShowResults, handleReturnToRoom, handleUpgradeToPlayer,
  } = useMultiplayerGameFlow({ socketRef, gameCode, isAuthenticated, refreshProfile });

  // Hide global footer only when in a game room or viewing results (not the lobby)
  useEffect(() => {
    setIsInGame(isActive || showResults);
  }, [setIsInGame, isActive, showResults]);
  useEffect(() => {
    return () => setIsInGame(false);
  }, [setIsInGame]);

  const seriesTracker = useSeriesTracker();

  usePlayerJoinLeaveNotifications({ players: playersInRoom, currentUsername: username, t, enabled: isActive });
  useMultiplayerEventNotifications({ currentUsername: username, t, enabled: isActive });

  const {
    socket, isConnected, roomsLoading, attemptingReconnect,
    setAttemptingReconnect, refreshRooms,
  } = useMultiplayerSocket({
    language: language as Language, gameCode, username, roomName,
    isActive, isHost, roomLanguage,
    onJoined: (data) => {
      setIsHost(data.isHost);
      setIsActive(true);
      setError('');
      setAttemptingReconnect(false);
      setShouldAutoJoin(false);
      setIsJoining(false);
      setPrefilledRoomCode('');
      if (data.language) setRoomLanguage(data.language);
      const joinedUsername = data.username || username;
      if (data.isHost) { setUsername(joinedUsername); setStoredUsername(joinedUsername); }
      else if (username) { setStoredUsername(username); }
      saveSession({
        gameCode: data.gameCode || gameCode, username: joinedUsername,
        isHost: data.isHost, roomName: data.roomName || roomName || '',
        hostUsername: data.isHost ? joinedUsername : undefined,
        language: data.language || roomLanguage || 'en',
      });
    },
    onUpdateUsers: (users) => setPlayersInRoom(users),
    onActiveRooms: (rooms) => setActiveRooms(rooms),
    onJoinedAsSpectator: (data) => {
      setIsSpectator(true);
      setGameCode(data.gameCode);
      setRoomName(data.roomName);
      setRoomLanguage(data.language);
      setIsJoining(false);
      saveSession({ gameCode: data.gameCode, username: data.username || username, isHost: false, roomName: data.roomName, language: data.language });
      toast(t('spectator.youAreSpectating'), { duration: 4000, icon: '👀' });
    },
    onSpectatorList: (spectatorList) => setSpectators(spectatorList),
    onSpectatorUpgraded: (data) => {
      if (data.success) {
        setIsSpectator(false);
        setIsActive(true);
        setPlayersInRoom(data.users || []);
        toast.success(t('spectator.upgraded'), { duration: 3000, icon: '🎮' });
      }
    },
    onError: (data) => {
      setIsJoining(false);
      if (data.message?.includes('not found') || data.message?.includes('Game not found') || data.message?.includes('closed')) {
        if (attemptingReconnect) {
          setError(t('errors.sessionExpired'));
          toast.error(t('errors.sessionExpired'), { duration: 5000, icon: '⚠️' });
        } else {
          const isClosed = data.message?.includes('closed');
          const errorKey = isClosed ? 'errors.roomClosed' : 'errors.gameCodeNotExist';
          setError(t(errorKey) || t('errors.gameCodeNotExist'));
          // Show a helpful error with longer duration so the user can read it
          toast.error(
            t(isClosed ? 'errors.roomClosedJoinAnother' : 'errors.roomNotFoundJoinAnother')
              || t('errors.roomNoLongerExists')
              || t('errors.gameCodeNotExist'),
            { duration: 6000, icon: isClosed ? '🚪' : '❌' }
          );
        }
        setGameCode(''); setPrefilledRoomCode(''); setIsActive(false); setAttemptingReconnect(false); setShouldAutoJoin(false); clearSession();
        socket?.emit('getActiveRooms');
        if (typeof window !== 'undefined' && window.location.search.includes('room=')) {
          const url = new URL(window.location.href);
          url.searchParams.delete('room');
          window.history.replaceState({}, '', url.pathname + (url.search || ''));
        }
      } else if (data.message?.includes('already in use') || data.message?.includes('Game code already')) {
        setError(t('errors.gameCodeExists'));
        toast.error(t('errors.gameCodeExists'), { duration: 4000, icon: '❌' });
        setIsActive(false); setIsHost(false); setAttemptingReconnect(false);
      } else if (data.message?.includes('username') || data.message?.includes('Username')) {
        setError(t('errors.usernameTaken'));
        toast.error(t('errors.usernameTaken'), { duration: 4000, icon: '❌' });
        setIsActive(false); setAttemptingReconnect(false); setShouldAutoJoin(false); clearSession();
      } else {
        const errorMsg = data.message || 'An error occurred';
        setError(errorMsg);
        toast.error(errorMsg, { duration: 4000, icon: '❌' });
      }
    },
    onGameStart: (data) => {
      setPendingGameStart(data);
      setGameStartTime(Date.now());
      setShowResults(false);
      setResultsData(null);
    },
    onGameReset: () => { /* Keep results visible until startGame arrives with new grid */ },
    onHostLeftRoomClosing: () => {
      clearSessionPreservingUsername(username);
      setIsActive(false); setIsHost(false); setGameCode('');
      toast.error(t('multiplayerFlow.roomClosed'), { duration: 4000, icon: '🚪' });
    },
    onSessionMigrated: () => {
      clearSessionPreservingUsername(username);
      setIsActive(false); setIsHost(false); setGameCode('');
      toast(t('multiplayerFlow.roomClosed'), { duration: 3000, icon: 'ℹ️' });
    },
    onWarning: () => {},
    onRateLimited: () => {
      setIsJoining(false);
      toast.error(t('multiplayerFlow.rateLimited'), { duration: 3000, icon: '⏳' });
    },
    onHostTransferred: (data) => { if (data.newHost === username) setIsHost(true); },
    t,
  });

  // Sync ref bridge so hooks called before useMultiplayerSocket get the latest socket
  socketRef.current = socket;

  const handleJoin = useMultiplayerJoin({
    socket, gameCode, username, roomName, hostUsername,
    language: language as Language, t, isSupabaseEnabled,
    user, profile, loading, authLoadingStartTime,
    guestAvatar, setGuestAvatar,
    setUsername, setError, setIsJoining,
  });

  // Series tracking
  React.useEffect(() => {
    if (showResults && resultsData?.scores) seriesTracker.recordRound(resultsData.scores);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showResults, resultsData?.scores]);

  React.useEffect(() => {
    if (!isActive) seriesTracker.reset();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  // Music transitions
  React.useEffect(() => {
    if (showResults) return;
    if (!isActive) { playTrack(TRACKS.LOBBY); } else { playTrack(TRACKS.BEFORE_GAME); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, showResults]);

  const handleManualReconnect = useCallback(() => {
    if (socket && !socket.connected) socket.connect();
  }, [socket]);

  const socketContextValue = useMemo(() => ({
    socket, isConnected, connectionError: error, isReconnecting: attemptingReconnect,
    reconnectAttempt: 0, maxReconnectAttempts: 20, manualReconnect: handleManualReconnect,
  }), [socket, isConnected, error, attemptingReconnect, handleManualReconnect]);

  const renderView = (): React.JSX.Element => {
    if (showResults) {
      return (
        <FeatureErrorBoundary featureName="Results">
          <ResultsPage
            finalScores={resultsData?.scores ?? null} gameCode={gameCode}
            onReturnToRoom={handleReturnToRoom} username={username} socket={socket}
            duplicateRuleDisabled={resultsData?.duplicateRuleDisabled}
            playerCount={resultsData?.playerCount} isHost={isHost}
            roomLanguage={roomLanguage ?? undefined}
            gridSize={Array.isArray(resultsData?.letterGrid) && resultsData.letterGrid.length > 0 ? resultsData.letterGrid.length : 4}
            gameDuration={gameDuration} seriesStandings={seriesTracker.standings}
            seriesRoundNumber={seriesTracker.roundNumber}
            wordHuntSummary={resultsData?.wordHuntSummary}
            blastSummary={resultsData?.blastSummary}
          />
        </FeatureErrorBoundary>
      );
    }

    if (!isActive) {
      return (
        <FeatureErrorBoundary featureName="Lobby">
          <MultiplayerFlow
            handleJoin={handleJoin} refreshRooms={refreshRooms}
            activeRooms={activeRooms} roomsLoading={roomsLoading}
            isJoining={isJoining} isAuthenticated={isAuthenticated} autoCreate={autoCreate}
            displayName={(isCrazyGames && cgUser?.username) || profile?.display_name || ''} profileAvatar={profile?.avatar_config}
            prefilledRoom={prefilledRoomCode} defaultLanguage={language as Language}
            setGameCode={setGameCode} setUsername={setUsername}
            setRoomName={setRoomName} setHostUsername={setHostUsername}
          />
        </FeatureErrorBoundary>
      );
    }

    if (isHost) {
      return (
        <FeatureErrorBoundary featureName="Host Game">
          <HostView
            gameCode={gameCode} roomLanguage={roomLanguage ?? undefined}
            initialPlayers={playersInRoom} username={username}
            onShowResults={handleShowResults} pendingGameStart={pendingGameStart}
            onGameStartConsumed={() => setPendingGameStart(null)} lessonData={lessonData}
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
          onGameStartConsumed={() => setPendingGameStart(null)}
          roomLanguage={roomLanguage} onUsernameChange={setUsername}
        />
      </FeatureErrorBoundary>
    );
  };

  return (
    <SocketContext.Provider value={socketContextValue}>
      <ErrorBoundary>
        <div tabIndex={-1} className="h-dvh flex flex-col min-h-0 w-full overflow-x-hidden">
          {/* Banners inside h-dvh so they participate in flex layout */}
          {isActive ? <ConnectionBanner showScoreSafe onLeaveGame={() => {
            setIsActive(false); setIsHost(false); setGameCode('');
            clearSession();
            toast(t('multiplayerFlow.roomList.leftGame'), { icon: '👋' });
          }} /> : <ConnectionDot />}
          <SpectatorBanner isSpectating={isSpectator} onRequestUpgrade={handleUpgradeToPlayer} t={t} spectatorCount={spectators.length} />
          {isClassroomMode ? (
            <>
              <EducationHeader showBackButton title={t('education.classroomGame.title')} />
              <ClassroomModeBanner lessonData={lessonDataState} />
            </>
          ) : (
            <AutoHideHeader />
          )}
          {renderView()}
        </div>
      </ErrorBoundary>
    </SocketContext.Provider>
  );
}
