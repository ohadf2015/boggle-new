'use client';

import React, { useState, useCallback, useMemo, useEffect, useRef, useContext } from 'react';
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
import { throttleLatest } from '@/utils/throttle';
import { useAchievementSocketBridge } from '@/hooks/useAchievementSocketBridge';
import { useMultiplayerAuth } from '@/hooks/useMultiplayerAuth';
import { useMultiplayerSession } from '@/hooks/useMultiplayerSession';
import { useMultiplayerGameFlow } from '@/hooks/useMultiplayerGameFlow';
import { useSeriesTracker } from '@/hooks/useSeriesTracker';
import { usePlayerJoinLeaveNotifications } from '@/hooks/usePlayerJoinLeaveNotifications';
import { useMultiplayerSounds } from '@/hooks/useMultiplayerSounds';
import { useHideNavigation } from '@/contexts/NavigationContext';
import { useMultiplayerJoin } from './useMultiplayerJoin';
import { useGameActions, useGameStore, useGameActive, useShowStartAnimation } from '@/hooks/gameState';
import { resolveMultiplayerMusicTrack } from './multiplayerMusic';
import { useCrazyGamesAuth } from '@/hooks/useCrazyGamesAuth';
import { neoInfoToast } from '@/components/NeoToast';
import { HostLeftGraceModal } from '@/components/multiplayer/HostLeftGraceModal';
import { stripMultiplayerExitParams } from '@/lib/multiplayer/stripExitParams';
import { roomGoneFeedback } from '@/lib/multiplayer/roomGoneFeedback';
import { trackInviteRoomDead, trackGrowthEvent, trackInviteConsumed } from '@/utils/growthTracking';
import type { Language, ActiveRoom, Avatar, GameMode } from '@/shared/types/game';
import type { Socket } from 'socket.io-client';
import { classifyRoomError } from '@/utils/multiplayer/roomErrorClassifier';
import { MP_TOAST_IDS } from '@/utils/multiplayer/mpToastIds';

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

export const VALID_MODES: GameMode[] = ['classic', 'blast', 'word-hunt', 'wheel-rush'];

function ViewLoadingSkeleton(): React.JSX.Element {
  return (
    <div className="flex-1 flex relative">
      <PlayfulBackground intensity="medium" colorScheme="game" />
      <PageLoader size="md" className="relative z-10" />
    </div>
  );
}

export default function MultiplayerPageClient(): React.JSX.Element {
  const searchParams = useSearchParams();
  const isClassroomMode = searchParams?.get('classroom') === 'true';
  const isClassroomHost = searchParams?.get('host') === 'true';
  const preselectedMode = searchParams?.get('mode') as GameMode | null;
  const autoCreate = searchParams?.get('autoCreate') === 'true';
  const quickPlay = searchParams?.get('quickPlay') === 'true';
  const { setGameMode: setStoreGameMode } = useGameActions();

  const [gameCode, setGameCode] = useState<string>('');
  const [roomName, setRoomName] = useState<string>('');
  const [hostUsername, setHostUsername] = useState<string>('');
  const [isActive, setIsActive] = useState<boolean>(false);
  const [isHost, setIsHost] = useState<boolean>(false);
  // Classroom flows create rooms with `isPrivate=true` (quick-play rooms are
  // now public so they surface in the lobby). The server echoes the flag in
  // `joined` — we plumb it through so the lobby can hide invite/share UI for
  // rooms that are not meant to be discovered.
  const [isPrivate, setIsPrivate] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [activeRooms, setActiveRooms] = useState<ActiveRoom[]>([]);
  const [roomLanguage, setRoomLanguage] = useState<Language | null>(null);
  const [playersInRoom, setPlayersInRoom] = useState<Array<{ username: string; score?: number; avatar?: Avatar; isHost?: boolean; isBot?: boolean; presenceStatus?: string; isWindowFocused?: boolean }>>([]);
  // Coalesce roster updates: in busy rooms `updateUsers` can fire many times/sec
  // (presence/focus/score pings). Throttling to one apply per 150ms collapses the
  // re-render storm to ~6.7/s while always landing the latest roster.
  const setPlayersInRoomThrottled = useMemo(
    () => throttleLatest((users: Parameters<typeof setPlayersInRoom>[0]) => setPlayersInRoom(users), 150),
    []
  );
  useEffect(() => () => setPlayersInRoomThrottled.cancel(), [setPlayersInRoomThrottled]);
  const [isJoining, setIsJoining] = useState<boolean>(false);
  // Soft-cushion modal state for `hostLeftRoomClosing` socket event.
  // Replaces the prior 2s `window.location` reload (audit 2026-05-10 #1) so
  // the player gets a 10-second readable explanation + manual exit button.
  const [hostLeftState, setHostLeftState] = useState<{
    reason?: 'explicit_no_successor' | 'grace_expired' | 'host_switched_room';
    message: string;
  } | null>(null);

  const setIsInGame = useHideNavigation();

  // Pre-select game mode from URL param (e.g., ?mode=word-hunt).
  // Default MP mode is 'random' when no URL override.
  useEffect(() => {
    if (preselectedMode && VALID_MODES.includes(preselectedMode)) {
      setStoreGameMode(preselectedMode);
    } else {
      setStoreGameMode('random');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useConnectionToasts();

  const { t, language } = useLanguage();
  const { user, isAuthenticated, isSupabaseEnabled, profile, loading, refreshProfile } = useAuth();
  // CrazyGames requires displaying their usernames in multiplayer (Full Launch requirement)
  const { user: cgUser, isCrazyGames, login: loginCrazyGames } = useCrazyGamesAuth();
  const { playTrack, TRACKS } = useMusic();
  // Countdown overlay flag — flips beforeGame → inGame music once play begins.
  const showStartAnimation = useShowStartAnimation();

  const {
    username, setUsername, guestAvatar, setGuestAvatar,
    authLoadingStartTime, usernameManuallySetRef, hasSetRandomNameRef,
  } = useMultiplayerAuth(language as Language);

  const [lessonDataState, setLessonDataState] = useState<{
    lessonId: string; lessonName: string; vocabularyWords: string[];
    language: Language; gameMode?: GameMode;
    templateSettings?: { timerSeconds: number; difficulty: string; minWordLength: number; allowLateJoin: boolean } | null;
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

  // Stable reference: this is in the dep array of PlayerView's pendingGameStart
  // effect — an inline arrow would re-fire game-start side effects every render.
  const handleGameStartConsumed = useCallback(() => setPendingGameStart(null), [setPendingGameStart]);

  // Native-safe exit to the multiplayer lobby: reset MP state IN PLACE (no page
  // reload). Shared by the results "Exit" button and the host-left grace modal.
  // A hard `window.location.href` nav blanks the Capacitor static-export WebView
  // (no server resolves the route); flipping showResults/isActive off renders the
  // lobby instantly within the live SPA instead.
  const handleExitToLobby = useCallback(() => {
    // Tell the server we left BEFORE resetting local state, so the room drops us
    // from its roster (and migrates host if we were it) instead of keeping a
    // ghost player around for the next round. socketRef is used because the
    // `socket`/`signalIntentionalLeave` from useMultiplayerSocket are declared
    // after this callback. Mirrors the ConnectionBanner onLeaveGame path.
    if (gameCode) {
      try { socketRef.current?.emit('leaveRoom', { gameCode, username }); } catch { /* socket gone */ }
    }
    clearSessionPreservingUsername(username);
    setIsActive(false); setIsHost(false); setIsPrivate(false); setGameCode('');
    setShowResults(false); setResultsData(null);
    try { sessionStorage.setItem('boggle_intentional_exit', '1'); } catch { /* storage blocked */ }
    if (typeof window !== 'undefined') {
      const stripped = stripMultiplayerExitParams(window.location.href);
      if (stripped !== window.location.href) {
        window.history.replaceState({}, '', stripped);
      }
    }
  }, [gameCode, username, setIsActive, setIsHost, setIsPrivate, setGameCode, setShowResults, setResultsData]);

  // Hide global footer only when in a game room or viewing results (not the lobby)
  useEffect(() => {
    setIsInGame(isActive || showResults);
  }, [setIsInGame, isActive, showResults]);
  useEffect(() => {
    return () => setIsInGame(false);
  }, [setIsInGame]);

  const seriesTracker = useSeriesTracker();

  const gameActive = useGameActive();
  usePlayerJoinLeaveNotifications({
    players: playersInRoom,
    currentUsername: username,
    t,
    enabled: isActive,
    deferToQueue: gameActive,
  });
  // Word Hunt elimination / danger feedback is owned by the in-game
  // WordHuntDangerToast (capped, auto-dismissing, per-type styled). A second
  // page-level toast stream was duplicating every elimination and stacking
  // uncapped over the board — removed in favour of the single in-game source.
  const mpSounds = useMultiplayerSounds();

  const {
    socket, isConnected, roomsLoading, attemptingReconnect,
    setAttemptingReconnect, refreshRooms, signalIntentionalLeave,
  } = useMultiplayerSocket({
    language: language as Language, gameCode, username, roomName,
    isActive, isHost, roomLanguage,
    onJoined: (data) => {
      setIsHost(data.isHost);
      setIsActive(true);
      setIsPrivate(!!data.isPrivate);
      setError('');
      setAttemptingReconnect(false);
      setShouldAutoJoin(false);
      setIsJoining(false);
      setPrefilledRoomCode('');
      if (quickPlay) trackGrowthEvent('mp_quickplay_joined', { asHost: data.isHost, language: data.language ?? language });
      // Track invite consumed for returning users who arrived via ?room= invite redirect.
      // New-user path fires this in useInviteOnboardingMode instead.
      const inviteLandedTs = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('invite_landed_ts') : null;
      if (inviteLandedTs && prefilledRoomCode) {
        const totalSeconds = Math.round((Date.now() - Number(inviteLandedTs)) / 1000);
        trackInviteConsumed({ roomCode: prefilledRoomCode, path: 'direct', totalSeconds });
        sessionStorage.removeItem('invite_landed_ts');
      }
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
    onUpdateUsers: (users) => setPlayersInRoomThrottled(users),
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
      // Classify by structured error CODE first (message substrings as legacy
      // fallback). The old message-only matcher leaked raw English for the
      // GAME_CLOSED paths whose custom message lacked "closed"/"not found".
      const kind = classifyRoomError(data);
      if (kind === 'gone') {
        // Snapshot identity BEFORE the resets below clear it: the dead-invite
        // toast needs the room code, and `cameFromInvite` is derived from the
        // `room=` param that this branch strips from the URL at the end.
        const cameFromInvite = typeof window !== 'undefined' && window.location.search.includes('room=');
        const urlRoom = typeof window !== 'undefined'
          ? new URLSearchParams(window.location.search).get('room') ?? ''
          : '';
        const goneCode = gameCode || prefilledRoomCode || urlRoom;
        // Stale lobby tap or room torn down mid-join. Drop the dead room from
        // the local list synchronously so a re-tap can't re-fire the same dead
        // join before the server round-trip refreshes the list.
        if (gameCode) setActiveRooms((rooms) => rooms.filter((r) => r.gameCode !== gameCode));
        // Feedback policy lives in `roomGoneFeedback`. Active players get the
        // "room timed out" nudge. Cold invite-link followers now get a clear
        // "that room is no longer available" message instead of being silently
        // dropped onto an empty lobby — that silent drop WAS the 2026-05-25
        // "empty page" report (invite → dead room → room= stripped → bare
        // "NO BATTLES IN PROGRESS" lobby with zero explanation). Stale lobby
        // taps (not active, no invite) stay silent as before.
        const feedback = roomGoneFeedback({ wasActive: isActive, cameFromInvite, roomCode: goneCode });
        if (feedback) {
          toast(t(feedback.key, feedback.params), { duration: 5000, icon: feedback.icon, id: MP_TOAST_IDS.roomGone });
        }
        if (!isActive && cameFromInvite) {
          trackInviteRoomDead({ roomCode: goneCode || 'unknown' });
        }
        setError('');
        setGameCode(''); setPrefilledRoomCode(''); setIsActive(false); setIsHost(false); setIsPrivate(false);
        setAttemptingReconnect(false); setShouldAutoJoin(false); clearSession();
        socket?.emit('getActiveRooms');
        if (typeof window !== 'undefined' && window.location.search.includes('room=')) {
          const url = new URL(window.location.href);
          url.searchParams.delete('room');
          window.history.replaceState({}, '', url.pathname + (url.search || ''));
        }
      } else if (kind === 'codeExists') {
        setError(t('errors.gameCodeExists'));
        toast.error(t('errors.gameCodeExists'), { duration: 4000, icon: '❌', id: MP_TOAST_IDS.codeExists });
        setIsActive(false); setIsHost(false); setAttemptingReconnect(false);
      } else if (kind === 'usernameTaken') {
        setError(t('errors.usernameTaken'));
        toast.error(t('errors.usernameTaken'), { duration: 4000, icon: '❌', id: MP_TOAST_IDS.usernameTaken });
        setIsActive(false); setAttemptingReconnect(false); setShouldAutoJoin(false); clearSession();
      } else {
        const errorMsg = data.message || t('errors.generic');
        setError(errorMsg);
        toast.error(errorMsg, { duration: 4000, icon: '❌', id: MP_TOAST_IDS.joinError });
      }
    },
    onGameStart: (data) => {
      setPendingGameStart(data);
      setGameStartTime(Date.now());
      setShowResults(false);
      setResultsData(null);
      mpSounds.onMatchStart();
    },
    onGameReset: () => {
      // Reset Zustand store so stale blast/word-hunt state doesn't leak into the next round.
      // Also clear results — PlayerView is unmounted during results screen, so its own
      // resetGame handler can't fire. PageClient must handle this since it's always mounted.
      useGameStore.getState().resetForNewRound();
      setShowResults(false);
      setResultsData(null);
      setPendingGameStart(null);
    },
    onHostLeftRoomClosing: (data) => {
      // Show grace modal — actual session/state cleanup happens in onExit.
      // The modal countdown gives the player time to read what happened
      // before being yanked back to the lobby.
      setHostLeftState({
        reason: data.reason,
        message: data.resolvedMessage || t('multiplayerFlow.roomClosed'),
      });
    },
    onSessionMigrated: () => {
      clearSessionPreservingUsername(username);
      setIsActive(false); setIsHost(false); setGameCode('');
      toast(t('multiplayerFlow.roomClosed'), { duration: 3000, icon: 'ℹ️' });
    },
    onWarning: () => {},
    onRateLimited: () => {
      setIsJoining(false);
      toast.error(t('multiplayerFlow.rateLimited'), { duration: 3000, icon: '⏳', id: MP_TOAST_IDS.rateLimited });
    },
    onHostTransferred: (data) => { if (data.newHost === username) setIsHost(true); },
    t,
  });

  // Sync ref bridge so hooks called before useMultiplayerSocket get the latest socket
  socketRef.current = socket;

  useAchievementSocketBridge(socket);

  // Listen for room language changes (host changed the game dictionary language)
  useEffect(() => {
    if (!socket) return;
    const handleRoomLanguageChanged = (data: { language: Language; changedBy: string }) => {
      setRoomLanguage(data.language);
      neoInfoToast(t('hostView.languageChangedNotification', { name: data.changedBy, language: t(`joinView.${data.language === 'en' ? 'english' : data.language === 'he' ? 'hebrew' : data.language === 'sv' ? 'swedish' : data.language === 'ja' ? 'japanese' : 'spanish'}`) }));
    };
    socket.on('roomLanguageChanged', handleRoomLanguageChanged);
    return () => { socket.off('roomLanguageChanged', handleRoomLanguageChanged); };
  }, [socket, t]);

  const handleJoin = useMultiplayerJoin({
    socket, gameCode, username, roomName, hostUsername,
    language: language as Language, t, isSupabaseEnabled,
    user, profile, loading, authLoadingStartTime,
    guestAvatar, setGuestAvatar,
    setUsername, setError, setIsJoining,
  });

  // Sound: game over — victory if first place, defeat otherwise
  useEffect(() => {
    if (!showResults || !resultsData?.scores?.length) return;
    const myRank = resultsData.scores.findIndex(s => s.username === username);
    if (myRank === 0) mpSounds.onVictory(true);
    else mpSounds.onDefeat();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showResults]);

  // Sound: roster changes — a join/leave cue when the player set changes (party
  // lobby feel). Diff against the previous username set so it fires ONCE per real
  // change, never on the initial population (null sentinel) or on presence/focus-
  // only updateUsers pings (same members → no diff). mpSounds callbacks are
  // useCallback-stable so depending only on playersInRoom is correct.
  const prevRosterRef = useRef<Set<string> | null>(null);
  useEffect(() => {
    const current = new Set(playersInRoom.map(p => p.username));
    const prev = prevRosterRef.current;
    prevRosterRef.current = current;
    if (!prev) return; // first population — don't replay a burst of joins
    let added = false;
    let removed = false;
    for (const u of current) if (!prev.has(u)) { added = true; break; }
    for (const u of prev) if (!current.has(u)) { removed = true; break; }
    if (added) mpSounds.onPlayerJoined();
    if (removed) mpSounds.onPlayerLeft();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playersInRoom]);

  // Series tracking
  useEffect(() => {
    if (showResults && resultsData?.scores) seriesTracker.recordRound(resultsData.scores, resultsData.gameSessionId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showResults, resultsData?.scores]);

  // Only reset series when user truly leaves the room (gameCode cleared),
  // not on transient isActive=false from reconnectable disconnects
  useEffect(() => {
    if (!isActive && !gameCode) seriesTracker.reset();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, gameCode]);

  // Music transitions: lobby → countdown bed → in-game track. The third phase
  // (inGame) was missing before — the countdown bed leaked through the whole
  // round, so the in-game music never replaced the lobby/homepage vibe.
  useEffect(() => {
    const next = resolveMultiplayerMusicTrack({ isActive, showResults, showStartAnimation });
    if (!next) return;
    playTrack(TRACKS[next === 'inGame' ? 'IN_GAME' : next === 'beforeGame' ? 'BEFORE_GAME' : 'LOBBY']);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, showResults, showStartAnimation]);

  const handleManualReconnect = useCallback(() => {
    if (socket && !socket.connected) socket.connect();
  }, [socket]);

  // PageClient renders UNDER the app-wide SocketProvider, so this reads the
  // global socket context (the local provider below only wraps children). The
  // global `serverShutdown` handler sets isServerUpdating during a deploy —
  // forward it so the in-game ConnectionBanner shows calm "updating" copy.
  const globalSocket = useContext(SocketContext);
  const isServerUpdating = globalSocket?.isServerUpdating ?? false;

  const socketContextValue = useMemo(() => ({
    socket, isConnected, connectionError: error, isReconnecting: attemptingReconnect,
    isServerUpdating,
    getReconnectAttempt: () => 0, maxReconnectAttempts: 20, manualReconnect: handleManualReconnect,
  }), [socket, isConnected, error, attemptingReconnect, isServerUpdating, handleManualReconnect]);

  const renderView = (): React.JSX.Element => {
    if (showResults) {
      return (
        <FeatureErrorBoundary featureName="Results">
          <ResultsPage
            finalScores={resultsData?.scores ?? null} gameCode={gameCode}
            onReturnToRoom={handleReturnToRoom} onExitToLobby={handleExitToLobby} username={username} socket={socket}
            duplicateRuleDisabled={resultsData?.duplicateRuleDisabled}
            playerCount={resultsData?.playerCount} isHost={isHost}
            roomLanguage={roomLanguage ?? undefined}
            gridSize={Array.isArray(resultsData?.letterGrid) && resultsData.letterGrid.length > 0 ? resultsData.letterGrid.length : 4}
            gameDuration={gameDuration} seriesStandings={seriesTracker.standings}
            seriesRoundNumber={seriesTracker.roundNumber}
            seriesTotalGames={seriesTracker.totalGames}
            seriesLeader={seriesTracker.seriesLeader}
            onResetSeries={seriesTracker.reset}
            wordHuntSummary={resultsData?.wordHuntSummary}
            blastSummary={resultsData?.blastSummary}
            wheelRushSummary={resultsData?.wheelRushSummary}
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
            isJoining={isJoining} isAuthenticated={isAuthenticated} autoCreate={autoCreate} quickPlay={quickPlay}
            displayName={(isCrazyGames && cgUser?.username) || profile?.display_name || ''} profileAvatar={profile?.avatar_config}
            onCrazyGamesLogin={isCrazyGames && !cgUser ? loginCrazyGames : undefined}
            prefilledRoom={prefilledRoomCode} defaultLanguage={language as Language}
            host={isClassroomHost}
            isClassroomMode={isClassroomMode}
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
            onGameStartConsumed={handleGameStartConsumed} lessonData={lessonData}
            onUsernameChange={setUsername} autoStart={false}
            isPrivate={isPrivate}
            isQuickPlay={quickPlay}
            onExitToLobby={handleExitToLobby}
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
          roomLanguage={roomLanguage} onUsernameChange={setUsername}
          seriesRoundNumber={seriesTracker.roundNumber}
          onExitToLobby={handleExitToLobby}
        />
      </FeatureErrorBoundary>
    );
  };

  return (
    <SocketContext.Provider value={socketContextValue}>
      <ErrorBoundary>
        <div tabIndex={-1} className="flex-1 flex flex-col min-h-0 w-full overflow-x-clip">
          {/* Root fills the flex-fit locked body (which reserves banner height via padding-bottom),
              so the banner never overlaps bottom CTAs / ready indicators. Lobby, results, and
              in-game states all use this single root — MP-root wraps all MP views. */}
          {isActive ? <ConnectionBanner showScoreSafe onLeaveGame={() => {
            signalIntentionalLeave();
            // Tell the server we're leaving and pass username so the schema
            // validates (server still derives identity from the socket map).
            socket?.emit('leaveRoom', { gameCode, username });
            setIsActive(false); setIsHost(false); setIsPrivate(false); setGameCode('');
            // Clear results so a subsequent rejoin doesn't render the prior
            // game's results page for a frame before the socket reconnects.
            setShowResults(false); setResultsData(null);
            // Preserve username so the next join modal pre-fills it; clearing
            // the session removes the room mapping so refresh / restore won't
            // throw the player back into this room.
            clearSessionPreservingUsername(username);
            // Mark intentional exit — tightens the auto-rejoin freshness guard
            // so even a same-second F5 stays on the lobby, not back in-game.
            try { sessionStorage.setItem('boggle_intentional_exit', '1'); } catch { /* blocked */ }
            // Clean ?room= so a back/forward nav doesn't auto-rejoin.
            if (typeof window !== 'undefined' && window.location.search.includes('room=')) {
              const url = new URL(window.location.href);
              url.searchParams.delete('room');
              window.history.replaceState({}, '', url.pathname + (url.search || ''));
            }
            toast(t('multiplayerFlow.roomList.leftGame'), { icon: '👋' });
          }} /> : <ConnectionDot />}
          <SpectatorBanner isSpectating={isSpectator} onRequestUpgrade={handleUpgradeToPlayer} t={t} spectatorCount={spectators.length} />
          {isClassroomMode ? (
            // Hide header + banner during active gameplay to maximize grid space;
            // show in lobby and results
            isActive && !showResults ? null : (
              <>
                <EducationHeader showBackButton title={t('education.classroomGame.title')} />
                <ClassroomModeBanner
                  lessonData={lessonDataState}
                  gameCode={gameCode}
                  expanded={!isActive}
                />
              </>
            )
          ) : (
            // Active lobby/in-game uses a full-bleed immersive layout with its
            // own sticky header — the AutoHideHeader spacer would just stack dead
            // space above the lobby's top accent bar. Drop it while active (keep
            // it for the room list + results so their CLS reservation holds).
            (isActive && !showResults) ? null : <AutoHideHeader />
          )}
          {renderView()}
          <HostLeftGraceModal
            isOpen={!!hostLeftState}
            seconds={10}
            reason={hostLeftState?.reason}
            onExit={() => {
              // Same native-safe in-place reset as the results "Exit" button,
              // then clear the grace modal.
              handleExitToLobby();
              setHostLeftState(null);
            }}
          />
        </div>
      </ErrorBoundary>
    </SocketContext.Provider>
  );
}
