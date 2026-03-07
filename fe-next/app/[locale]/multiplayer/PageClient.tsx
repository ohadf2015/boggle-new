'use client';

import React, { useState, useCallback, useMemo } from 'react';
import nextDynamic from 'next/dynamic';
import toast from 'react-hot-toast';
import type { Socket } from 'socket.io-client';
import AutoHideHeader from '@/components/AutoHideHeader';
import ErrorBoundary from '@/app/components/ErrorBoundary';
import { FeatureErrorBoundary } from '@/components/ErrorBoundaries';
import { ConnectionDot } from '@/components/ConnectionStatusIndicator';
import SpectatorBanner from '@/components/SpectatorBanner';
import { SocketContext } from '@/utils/SocketContext';
import { saveSession, clearSession, clearSessionPreservingUsername } from '@/utils/session';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useMusic } from '@/contexts/MusicContext';
import { getGuestSessionId, hashToken } from '@/utils/guestManager';
import logger from '@/utils/logger';
import { getRandomDefaultNameWithAvatar, getAvatarForName } from '@/utils/defaultNames';
import { setStoredUsername, getStoredAvatarId } from '@/utils/profileStorage';
import { getAvatarEmojiAndColor } from '@/utils/avatarConfig';
import { sanitizeRoomName } from '@/utils/consts';
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
import type { Language, ActiveRoom, Avatar } from '@/shared/types/game';

// Hex color validation pattern (must match backend schema)
const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;
const DEFAULT_AVATAR_COLOR = '#FF6B6B';

/**
 * Sanitizes avatar color to ensure it matches the required hex format.
 */
function sanitizeAvatarColor(
  color: string | undefined | null,
  avatarImage?: string | null
): string {
  if (color && HEX_COLOR_PATTERN.test(color)) {
    return color;
  }

  if (avatarImage) {
    const avatarData = getAvatarEmojiAndColor(avatarImage);
    return avatarData.color;
  }

  return DEFAULT_AVATAR_COLOR;
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
    <div className="min-h-[60vh] flex items-center justify-center bg-neo-navy dark:from-neo-navy dark:via-neo-navy-light dark:to-neo-navy relative">
      <PlayfulBackground intensity="medium" colorScheme="game" />
      <div className="relative z-10">
        <PageLoader size="md" />
      </div>
    </div>
  );
}

export default function MultiplayerPageClient(): React.JSX.Element {
  const [gameCode, setGameCode] = useState<string>('');
  const [roomName, setRoomName] = useState<string>('');
  const [hostUsername, setHostUsername] = useState<string>('');
  const [isActive, setIsActive] = useState<boolean>(false);
  const [isHost, setIsHost] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [activeRooms, setActiveRooms] = useState<ActiveRoom[]>([]);
  const [roomLanguage, setRoomLanguage] = useState<Language | null>(null);
  const [playersInRoom, setPlayersInRoom] = useState<Array<{ username: string; score?: number; avatar?: Avatar; isHost?: boolean; isBot?: boolean; presenceStatus?: string; isWindowFocused?: boolean }>>(
    []
  );
  const [isJoining, setIsJoining] = useState<boolean>(false);

  useConnectionToasts();

  const { t, language } = useLanguage();
  const { user, isAuthenticated, isSupabaseEnabled, profile, loading, refreshProfile } = useAuth();
  const { playTrack, TRACKS } = useMusic();

  // Custom hooks for modular functionality
  const {
    username,
    setUsername,
    guestAvatar,
    setGuestAvatar,
    authLoadingStartTime,
    usernameManuallySetRef,
    hasSetRandomNameRef,
  } = useMultiplayerAuth(language as Language);

  // Memoize lesson data setter to prevent infinite loops in useMultiplayerSession
  // CRITICAL: Inline arrow functions like `() => {}` create new references each render,
  // causing useEffect deps to trigger, which sets state, causing another render → infinite loop
  // Fixes JAVASCRIPT-NEXTJS-EX: Maximum update depth exceeded
  const [lessonDataState, setLessonDataState] = useState<{
    lessonId: string;
    lessonName: string;
    vocabularyWords: string[];
    language: Language;
    templateSettings?: {
      timerSeconds: number;
      difficulty: string;
      minWordLength: number;
      allowLateJoin: boolean;
    } | null;
  } | null>(null);

  const handleSetLessonData = useCallback((data: typeof lessonDataState) => {
    setLessonDataState(data);
  }, []);

  const handleSetAttemptingReconnect = useCallback(() => {
    // Will be overridden by socket hook
  }, []);

  const {
    setShouldAutoJoin,
    prefilledRoomCode,
    setPrefilledRoomCode,
    lessonData,
  } = useMultiplayerSession({
    language: language as Language,
    socket: null, // Will be set by socket hook
    isConnected: false, // Will be set by socket hook
    isActive,
    attemptingReconnect: false, // Will be set by socket hook
    username,
    profile,
    usernameManuallySetRef,
    hasSetRandomNameRef,
    onSetGameCode: setGameCode,
    onSetUsername: setUsername,
    onSetRoomName: setRoomName,
    onSetGuestAvatar: setGuestAvatar,
    onSetAttemptingReconnect: handleSetAttemptingReconnect,
    onSetRoomLanguage: setRoomLanguage,
    onSetLessonData: handleSetLessonData,
    t,
  });

  const {
    showResults,
    setShowResults,
    resultsData,
    setResultsData,
    isSpectator,
    setIsSpectator,
    spectators,
    setSpectators,
    pendingGameStart,
    setPendingGameStart,
    setGameStartTime,
    gameDuration,
    handleShowResults,
    handleReturnToRoom,
    handleUpgradeToPlayer: baseHandleUpgradeToPlayer,
  } = useMultiplayerGameFlow({
    isActive,
    showResults: false,
    socket: null, // Will be set by socket hook
    gameCode,
    isAuthenticated,
    refreshProfile,
  });

  // Track accumulated scores across multiple games in the same room
  const seriesTracker = useSeriesTracker();

  // Show toast notifications when players join/leave the lobby
  usePlayerJoinLeaveNotifications({
    players: playersInRoom,
    currentUsername: username,
    t,
    enabled: isActive,
  });

  // Dramatic notifications for eliminations and last-life warnings
  useMultiplayerEventNotifications({
    currentUsername: username,
    t,
    enabled: isActive,
  });

  const {
    socket,
    isConnected,
    roomsLoading,
    attemptingReconnect,
    setAttemptingReconnect,
    refreshRooms,
  } = useMultiplayerSocket({
    language: language as Language,
    gameCode,
    username,
    roomName,
    isActive,
    isHost,
    roomLanguage,
    onJoined: (data) => {
      logger.log('[SOCKET.IO] ✅ Joined successfully:', data);
      setIsHost(data.isHost);
      setIsActive(true);
      setError('');
      setAttemptingReconnect(false);
      setShouldAutoJoin(false);
      setIsJoining(false);
      setPrefilledRoomCode('');

      if (data.language) {
        setRoomLanguage(data.language);
      }

      const joinedUsername = data.username || username;
      if (data.isHost) {
        setUsername(joinedUsername);
        setStoredUsername(joinedUsername);
      } else if (username) {
        setStoredUsername(username);
      }

      saveSession({
        gameCode: data.gameCode || gameCode,
        username: joinedUsername,
        isHost: data.isHost,
        roomName: data.roomName || roomName || '',
        hostUsername: data.isHost ? joinedUsername : undefined,
        language: data.language || roomLanguage || 'en',
      });
    },
    onUpdateUsers: (users) => {
      setPlayersInRoom(users);
    },
    onActiveRooms: (rooms) => {
      setActiveRooms(rooms);
    },
    onJoinedAsSpectator: (data) => {
      setIsSpectator(true);
      setGameCode(data.gameCode);
      setRoomName(data.roomName);
      setRoomLanguage(data.language);
      setIsJoining(false);

      saveSession({
        gameCode: data.gameCode,
        username: data.username || username,
        isHost: false,
        roomName: data.roomName,
        language: data.language,
      });

      toast(t('spectator.youAreSpectating') || 'Watching as spectator', {
        duration: 4000,
        icon: '👀',
      });
    },
    onSpectatorList: (spectatorList) => {
      setSpectators(spectatorList);
    },
    onSpectatorUpgraded: (data) => {
      if (data.success) {
        setIsSpectator(false);
        setIsActive(true);
        setPlayersInRoom(data.users || []);

        toast.success(t('spectator.upgraded') || 'You can now play!', {
          duration: 3000,
          icon: '🎮',
        });
      }
    },
    onError: (data) => {
      setIsJoining(false);

      if (
        data.message?.includes('not found') ||
        data.message?.includes('Game not found') ||
        data.message?.includes('closed')
      ) {
        if (attemptingReconnect) {
          setError(t('errors.sessionExpired'));
          toast.error(t('errors.sessionExpired'), { duration: 4000, icon: '⚠️' });
        } else {
          const errorKey = data.message?.includes('closed')
            ? 'errors.roomClosed'
            : 'errors.gameCodeNotExist';
          setError(t(errorKey) || t('errors.gameCodeNotExist'));
          toast.error(
            t('errors.roomNoLongerExists') || t('errors.gameCodeNotExist'),
            { duration: 4000, icon: '❌' }
          );
        }
        setGameCode('');
        setPrefilledRoomCode('');
        setIsActive(false);
        setAttemptingReconnect(false);
        setShouldAutoJoin(false);
        clearSession();

        if (socket) {
          socket.emit('getActiveRooms');
        }

        // Remove room parameter from URL
        if (typeof window !== 'undefined' && window.location.search.includes('room=')) {
          const url = new URL(window.location.href);
          url.searchParams.delete('room');
          window.history.replaceState({}, '', url.pathname + (url.search || ''));
        }
      } else if (
        data.message?.includes('already in use') ||
        data.message?.includes('Game code already')
      ) {
        setError(t('errors.gameCodeExists'));
        toast.error(t('errors.gameCodeExists'), { duration: 4000, icon: '❌' });
        setIsActive(false);
        setIsHost(false);
        setAttemptingReconnect(false);
      } else if (data.message?.includes('username') || data.message?.includes('Username')) {
        setError(t('errors.usernameTaken'));
        toast.error(t('errors.usernameTaken'), { duration: 4000, icon: '❌' });
        setIsActive(false);
        setAttemptingReconnect(false);
        setShouldAutoJoin(false);
        clearSession();
      } else {
        const errorMsg = data.message || 'An error occurred';
        setError(errorMsg);
        toast.error(errorMsg, { duration: 4000, icon: '❌' });
      }
    },
    onGameStart: (data) => {
      setPendingGameStart(data);
      setGameStartTime(Date.now());

      if (showResults) {
        logger.log('[SOCKET.IO] Closing results to start new game');
        setShowResults(false);
        setResultsData(null);
      }
    },
    onGameReset: () => {
      setShowResults(false);
      setResultsData(null);
    },
    onHostLeftRoomClosing: () => {
      clearSessionPreservingUsername(username);
      setIsActive(false);
      setIsHost(false);
      setGameCode('');
      toast.error(t('multiplayerFlow.roomClosed') || 'Room closed', { duration: 4000, icon: '🚪' });
    },
    onSessionMigrated: () => {
      clearSessionPreservingUsername(username);
      setIsActive(false);
      setIsHost(false);
      setGameCode('');
      toast(t('multiplayerFlow.roomClosed') || 'Session moved', { duration: 3000, icon: 'ℹ️' });
    },
    onWarning: () => {},
    onRateLimited: () => {
      setIsJoining(false);
      toast.error(t('multiplayerFlow.rateLimited') || 'Slow down!', { duration: 3000, icon: '⏳' });
    },
    onHostTransferred: (data) => {
      if (data.newHost === username) {
        setIsHost(true);
      }
    },
    t,
  });

  // Record round scores for series tracking when results come in
  React.useEffect(() => {
    if (showResults && resultsData?.scores) {
      seriesTracker.recordRound(resultsData.scores);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showResults, resultsData?.scores]);

  // Reset series tracker when leaving the room
  React.useEffect(() => {
    if (!isActive) {
      seriesTracker.reset();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  // Music transitions based on game state
  React.useEffect(() => {
    if (showResults) {
      return;
    } else if (!isActive) {
      playTrack(TRACKS.LOBBY);
    } else if (isActive) {
      playTrack(TRACKS.BEFORE_GAME);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, showResults]);

  const handleJoin = useCallback(
    async (
      isHostMode: boolean,
      roomLang?: Language | null,
      overrideGameCode?: string,
      overrideRoomName?: string,
      overrideUsername?: string,
    ) => {
      if (process.env.NODE_ENV === 'development') {
        console.log(
          `[JOIN] handleJoin called - mode: ${isHostMode ? 'HOST' : 'PLAYER'}, socket connected: ${socket?.connected}`
        );
      }

      // Wait for socket connection if socket exists but isn't connected yet
      // This handles the race condition where join fires before connection completes
      if (socket && !socket.connected) {
        logger.log('[JOIN] Socket exists but not connected, waiting...');
        const connected = await new Promise<boolean>((resolve) => {
          const timeout = setTimeout(() => resolve(false), 5000);
          const onConnect = () => { clearTimeout(timeout); resolve(true); };
          socket.once('connect', onConnect);
          // If it connects while we're setting up the listener
          if (socket.connected) { clearTimeout(timeout); socket.off('connect', onConnect); resolve(true); }
        });
        if (!connected) {
          logger.log('[JOIN] Socket connection timed out after 5s');
          setError(t('errors.notConnected') || 'Not connected to server');
          toast.error(t('common.notConnected') || 'Not connected to server', {
            duration: 3000,
            icon: '⚠️',
          });
          return;
        }
        logger.log('[JOIN] Socket connected after waiting');
      }

      if (!socket?.connected) {
        logger.log('[JOIN] No socket available');
        setError(t('errors.notConnected') || 'Not connected to server');
        toast.error(t('common.notConnected') || 'Not connected to server', {
          duration: 3000,
          icon: '⚠️',
        });
        return;
      }

      // Wait for auth to finish loading
      const AUTH_LOADING_TIMEOUT = 5000;
      const authLoadingTooLong =
        authLoadingStartTime && Date.now() - authLoadingStartTime > AUTH_LOADING_TIMEOUT;

      if (loading && !authLoadingTooLong) {
        logger.log('[AUTH] Auth still loading, waiting...');
        toast.error(t('common.loadingProfile') || 'Loading profile, please wait...', {
          duration: 2000,
          icon: '⏳',
        });
        return;
      }

      if (authLoadingTooLong) {
        logger.warn('[AUTH] Auth loading timed out, proceeding without profile');
      }

      // Compute effective username
      // overrideUsername takes precedence — avoids stale closure when called immediately after setUsername
      let effectiveUsername = overrideUsername?.trim()
        ? overrideUsername.trim()
        : user
          ? profile?.display_name ||
            user?.user_metadata?.full_name ||
            user?.user_metadata?.name ||
            user?.email?.split('@')[0] ||
            username
          : username;

      // Generate random name for guests without username
      let generatedAvatar: { emoji: string; color: string } | null = null;
      if (!effectiveUsername?.trim() && !user) {
        const { name, avatar } = getRandomDefaultNameWithAvatar(language as Language);
        effectiveUsername = name;
        generatedAvatar = avatar;
        setGuestAvatar(avatar);
        logger.log('[JOIN] Generated random name for guest:', name);
      }

      if (effectiveUsername !== username) {
        setUsername(effectiveUsername);
      }

      const avatarImageId = getStoredAvatarId();
      const effectiveAvatarImage = avatarImageId || profile?.avatar_image;
      const fallbackAvatar = generatedAvatar || guestAvatar || getAvatarForName(effectiveUsername);
      const effectiveAvatar = profile
        ? {
            emoji: profile.avatar_emoji,
            color: sanitizeAvatarColor(profile.avatar_color, effectiveAvatarImage),
            avatarImage: effectiveAvatarImage,
          }
        : {
            ...fallbackAvatar,
            color: sanitizeAvatarColor(fallbackAvatar.color, avatarImageId),
            avatarImage: avatarImageId || undefined,
          };

      setError('');
      setIsJoining(true);

      const safetyTimeout = setTimeout(() => {
        setIsJoining(false);
        if (process.env.NODE_ENV === 'development') console.warn('[JOIN] Safety timeout triggered');
        logger.warn('[JOIN] Safety timeout triggered');
        toast.error(
          t('errors.connectionTimeout') || 'Connection timeout. Please try again.',
          {
            duration: 4000,
            icon: '⚠️',
          }
        );
      }, 10000);

      const clearSafetyTimeout = () => clearTimeout(safetyTimeout);
      socket.once('joined', clearSafetyTimeout);
      socket.once('error', clearSafetyTimeout);
      socket.once('joinedAsSpectator', clearSafetyTimeout);
      socket.once('rateLimited', clearSafetyTimeout);

      const codeToUse = overrideGameCode || gameCode;

      // Build auth context
      let authUserId = null;
      let guestTokenHash = null;
      let guestSessionId: string | null = null;

      if (isSupabaseEnabled) {
        if (user?.id) {
          authUserId = user.id;
          logger.log('[AUTH] Joining as authenticated user:', {
            authUserId,
            username: effectiveUsername,
            hasProfile: !!profile,
          });
        } else {
          guestSessionId = getGuestSessionId();
          if (guestSessionId) {
            guestTokenHash = await hashToken(guestSessionId);
          }
          logger.log('[AUTH] Joining as guest:', {
            hasUser: !!user,
            guestTokenHash: !!guestTokenHash,
            guestSessionId: !!guestSessionId,
          });
        }
      }

      if (isHostMode) {
        const finalHostUsername = user ? effectiveUsername : hostUsername || effectiveUsername;
        const finalRoomName = sanitizeRoomName(
          overrideRoomName || roomName || `${finalHostUsername} Room`
        );

        const hostAvatarImage = avatarImageId || profile?.avatar_image;
        const hostFallbackAvatar =
          generatedAvatar || guestAvatar || getAvatarForName(finalHostUsername);
        const hostAvatar = profile
          ? {
              emoji: profile.avatar_emoji,
              color: sanitizeAvatarColor(profile.avatar_color, hostAvatarImage),
              avatarImage: hostAvatarImage,
            }
          : {
              ...hostFallbackAvatar,
              color: sanitizeAvatarColor(hostFallbackAvatar.color, avatarImageId),
              avatarImage: avatarImageId || undefined,
            };

        const createGamePayload = {
          gameCode: codeToUse,
          roomName: finalRoomName,
          hostUsername: finalHostUsername,
          language: roomLang || language,
          authUserId,
          guestTokenHash,
          guestSessionId,
          avatar: hostAvatar,
          profilePictureUrl: profile?.profile_picture_url,
        };

        socket.emit('createGame', createGamePayload);
      } else {
        const joinPayload = {
          gameCode: codeToUse,
          username: effectiveUsername,
          authUserId,
          guestTokenHash,
          guestSessionId,
          avatar: effectiveAvatar,
          profilePictureUrl: profile?.profile_picture_url,
        };

        logger.log('[JOIN] Emitting join event:', {
          gameCode: codeToUse,
          username: effectiveUsername,
          hasAuth: !!authUserId,
          hasGuestToken: !!guestTokenHash,
          socketConnected: socket.connected,
          socketId: socket.id,
        });

        socket.emit('join', joinPayload);
      }
    },
     
    [
      socket,
      gameCode,
      username,
      roomName,
      language,
      t,
      isSupabaseEnabled,
      user,
      profile,
      loading,
      authLoadingStartTime,
      guestAvatar,
      hostUsername,
      setGuestAvatar,
      setUsername,
    ]
  );

  const handleUpgradeToPlayer = useCallback(() => {
    baseHandleUpgradeToPlayer(username);
  }, [baseHandleUpgradeToPlayer, username]);

  const handleManualReconnect = useCallback(() => {
    if (socket && !socket.connected) {
      socket.connect();
    }
  }, [socket]);

  const socketContextValue = useMemo(
    () => ({
      socket,
      isConnected,
      connectionError: error,
      isReconnecting: attemptingReconnect,
      reconnectAttempt: 0,
      maxReconnectAttempts: 20,
      manualReconnect: handleManualReconnect,
    }),
    [socket, isConnected, error, attemptingReconnect, handleManualReconnect]
  );

  const renderView = () => {
    if (showResults) {
      return (
        <FeatureErrorBoundary featureName="Results">
          <ResultsPage
            finalScores={resultsData?.scores ?? null}
            gameCode={gameCode}
            onReturnToRoom={handleReturnToRoom}
            username={username}
            socket={socket}
            duplicateRuleDisabled={resultsData?.duplicateRuleDisabled}
            playerCount={resultsData?.playerCount}
            isHost={isHost}
            roomLanguage={roomLanguage ?? undefined}
            gridSize={
              resultsData?.letterGrid &&
              Array.isArray(resultsData.letterGrid) &&
              resultsData.letterGrid.length > 0
                ? resultsData.letterGrid.length
                : 4
            }
            gameDuration={gameDuration}
            seriesStandings={seriesTracker.standings}
            seriesRoundNumber={seriesTracker.roundNumber}
          />
        </FeatureErrorBoundary>
      );
    }

    if (!isActive) {
      return (
        <FeatureErrorBoundary featureName="Lobby">
          <MultiplayerFlow
            handleJoin={handleJoin}
            refreshRooms={refreshRooms}
            activeRooms={activeRooms}
            roomsLoading={roomsLoading}
            isJoining={isJoining}
            isAuthenticated={isAuthenticated}
            displayName={profile?.display_name ?? ''}
            profileAvatarId={profile?.avatar_image}
            profilePictureUrl={profile?.profile_picture_url}
            prefilledRoom={prefilledRoomCode}
            defaultLanguage={language as Language}
            setGameCode={setGameCode}
            setUsername={setUsername}
            setRoomName={setRoomName}
            setHostUsername={setHostUsername}
          />
        </FeatureErrorBoundary>
      );
    }

    if (isHost) {
      return (
        <FeatureErrorBoundary featureName="Host Game">
          <HostView
            gameCode={gameCode}
            roomLanguage={roomLanguage ?? undefined}
            initialPlayers={playersInRoom}
            username={username}
            onShowResults={handleShowResults}
            pendingGameStart={pendingGameStart}
            onGameStartConsumed={() => setPendingGameStart(null)}
            lessonData={lessonData}
          />
        </FeatureErrorBoundary>
      );
    }

    return (
      <FeatureErrorBoundary featureName="Player Game">
        <PlayerView
          gameCode={gameCode}
          username={username}
          onShowResults={handleShowResults}
          initialPlayers={playersInRoom}
          pendingGameStart={pendingGameStart}
          onGameStartConsumed={() => setPendingGameStart(null)}
          roomLanguage={roomLanguage}
          onUsernameChange={setUsername}
        />
      </FeatureErrorBoundary>
    );
  };

  return (
    <SocketContext.Provider value={socketContextValue}>
      <ConnectionDot />

      <SpectatorBanner
        isSpectating={isSpectator}
        onRequestUpgrade={handleUpgradeToPlayer}
        t={t}
        spectatorCount={spectators.length}
      />

      <AutoHideHeader />
      <ErrorBoundary>
        <div tabIndex={-1} className="h-dvh flex flex-col min-h-0 w-full overflow-hidden">
          {renderView()}
        </div>
      </ErrorBoundary>
    </SocketContext.Provider>
  );
}
