'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import { io } from 'socket.io-client';
import HostView from '@/host/HostView';
import PlayerView from '@/player/PlayerView';
import JoinView from '@/JoinView';
import ResultsPage from '@/ResultsPage.jsx';
import Header from '@/components/Header';
import { SocketContext } from '@/utils/SocketContext';
import { saveSession, getSession, clearSession } from '@/utils/session';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useMusic } from '@/contexts/MusicContext';
import { getGuestSessionId, hashToken } from '@/utils/guestManager';
import { getSession as getSupabaseSession } from '@/lib/supabase';
import logger from '@/utils/logger';

// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic';

const SOCKET_CONFIG = {
  RECONNECTION_ATTEMPTS: 10,
  RECONNECTION_DELAY: 1000,
  RECONNECTION_DELAY_MAX: 30000,
  PING_INTERVAL: 25000,
  PING_TIMEOUT: 60000,
  HOST_KEEP_ALIVE_INTERVAL: 30000,
};

// Singleton socket instance
let globalSocketInstance = null;

const getSocketURL = () => {
  if (process.env.NEXT_PUBLIC_WS_URL) {
    // Convert ws:// to http:// for Socket.IO
    return process.env.NEXT_PUBLIC_WS_URL.replace(/^ws:/, 'http:').replace(/^wss:/, 'https:');
  }

  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3001';
  }

  if (typeof window === 'undefined') return '';

  const protocol = window.location.protocol;
  const host = window.location.host;
  return `${protocol}//${host}`;
};

export default function GamePage() {
  const [gameCode, setGameCode] = useState('');
  const [username, setUsername] = useState('');
  const [roomName, setRoomName] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [error, setError] = useState('');
  const [activeRooms, setActiveRooms] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [resultsData, setResultsData] = useState(null);
  const [attemptingReconnect, setAttemptingReconnect] = useState(false);
  const [roomLanguage, setRoomLanguage] = useState(null);
  const [playersInRoom, setPlayersInRoom] = useState([]);
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [roomsLoading, setRoomsLoading] = useState(true); // Track rooms loading state

  const socketRef = useRef(null);
  const attemptingReconnectRef = useRef(attemptingReconnect);
  const hostKeepAliveIntervalRef = useRef(null);
  const wasConnectedRef = useRef(false);

  const { t, language } = useLanguage();
  const { user, isAuthenticated, isSupabaseEnabled, profile, loading, refreshProfile } = useAuth();
  const { playTrack, fadeToTrack, TRACKS, audioUnlocked } = useMusic();

  // Track if we should auto-join (prefilled room + existing username)
  const [shouldAutoJoin, setShouldAutoJoin] = useState(false);
  const [prefilledRoomCode, setPrefilledRoomCode] = useState('');

  // Music transitions based on game state
  useEffect(() => {
    // Don't attempt to play music until audio is unlocked by user interaction
    if (!audioUnlocked) return;

    if (showResults) {
      // Results screen - fade to before_game music (players often start another game)
      fadeToTrack(TRACKS.BEFORE_GAME, 1200, 1200);
    } else if (!isActive) {
      // Lobby - play lobby music
      playTrack(TRACKS.LOBBY);
    } else if (isActive) {
      // In room waiting - play before game music
      // (in_game music is triggered by HostView/PlayerView when game actually starts)
      playTrack(TRACKS.BEFORE_GAME);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, showResults, audioUnlocked]);

  // Initialize state from URL and session
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const initializeState = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const roomFromUrl = urlParams.get('room');
      logger.log('[Init] URL search:', window.location.search, '| roomFromUrl:', roomFromUrl);
      const savedUsername = typeof window !== 'undefined'
        ? localStorage.getItem('boggle_username') || ''
        : '';
      const savedSession = getSession();

      let joiningNewRoomViaInvitation = false;
      const hasSession = savedSession && savedSession.gameCode;

      if (roomFromUrl) {
        logger.log('[Init] Setting prefilledRoomCode to:', roomFromUrl);
        setGameCode(roomFromUrl);
        setPrefilledRoomCode(roomFromUrl);
        if (savedSession?.gameCode && savedSession.gameCode !== roomFromUrl) {
          clearSession();
          joiningNewRoomViaInvitation = true;
        }
        if (savedUsername && savedUsername.trim()) {
          setUsername(savedUsername);
          setShouldAutoJoin(true);
        }
      } else if (hasSession) {
        setGameCode(savedSession.gameCode);
        setAttemptingReconnect(true);
      }

      if (roomFromUrl && savedUsername) {
        // Already set above
      } else if (joiningNewRoomViaInvitation) {
        if (savedUsername) {
          setUsername(savedUsername);
        }
      } else if (savedSession?.username) {
        setUsername(savedSession.username);
      } else if (savedUsername) {
        setUsername(savedUsername);
      }

      if (!joiningNewRoomViaInvitation && savedSession?.roomName) {
        setRoomName(savedSession.roomName);
      }
    };

    Promise.resolve().then(initializeState);
  }, []);

  // Set username and roomName from profile display_name for authenticated users
  // Uses fallback chain from OAuth metadata if profile hasn't loaded yet
  useEffect(() => {
    if (!user) return;

    // Fallback chain for display name
    const displayName =
      profile?.display_name ||                    // Best: profile display name
      user?.user_metadata?.full_name ||           // Good: OAuth full name
      user?.user_metadata?.name ||                // Okay: OAuth name
      user?.email?.split('@')[0] ||               // Fallback: email prefix
      '';

    if (displayName) {
      setUsername(displayName);
      setRoomName(displayName);
    }
  }, [user, profile?.display_name]);

  // Refresh profile on mount for authenticated users to get latest display_name
  useEffect(() => {
    if (isAuthenticated && user?.id && refreshProfile) {
      refreshProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  useEffect(() => {
    attemptingReconnectRef.current = attemptingReconnect;
  }, [attemptingReconnect]);

  // Initialize Socket.IO connection
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Use existing socket if available
    if (globalSocketInstance && globalSocketInstance.connected) {
      socketRef.current = globalSocketInstance;
      // Defer state updates to avoid calling setState directly within effect
      Promise.resolve().then(() => {
        setSocket(globalSocketInstance);
        setIsConnected(true);
        // Request active rooms since we're reusing an existing connection
        globalSocketInstance.emit('getActiveRooms');
      });

      // Set up activeRooms listener for existing socket
      const handleActiveRooms = (data) => {
        setActiveRooms(data.rooms || []);
        setRoomsLoading(false);
      };
      globalSocketInstance.on('activeRooms', handleActiveRooms);

      // Fallback timeout for rooms loading
      const roomsLoadingTimeout = setTimeout(() => {
        setRoomsLoading(false);
      }, 5000);

      return () => {
        clearTimeout(roomsLoadingTimeout);
        globalSocketInstance.off('activeRooms', handleActiveRooms);
      };
    }

    const socketUrl = getSocketURL();
    logger.log('[SOCKET.IO] Connecting to:', socketUrl);

    const newSocket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: SOCKET_CONFIG.RECONNECTION_ATTEMPTS,
      reconnectionDelay: SOCKET_CONFIG.RECONNECTION_DELAY,
      reconnectionDelayMax: SOCKET_CONFIG.RECONNECTION_DELAY_MAX,
      timeout: 20000,
      autoConnect: true,
    });

    globalSocketInstance = newSocket;
    socketRef.current = newSocket;

    // Connection events
    newSocket.on('connect', () => {
      logger.log('[SOCKET.IO] Connected:', newSocket.id);
      setIsConnected(true);
      setSocket(newSocket);

      // Request active rooms on connect
      newSocket.emit('getActiveRooms');

      // Handle reconnection to game
      if (wasConnectedRef.current) {
        const savedSession = getSession();
        if (savedSession?.gameCode) {
          logger.log('[SOCKET.IO] Reconnecting to game:', savedSession.gameCode);
          toast.success(t('common.reconnecting') || 'Reconnecting to game...', {
            duration: 2000,
            icon: '🔄',
          });

          // Build auth context inline for reconnection
          const buildAuthContext = async () => {
            try {
              // First check if user is authenticated via Supabase session
              // (user state may not be set yet during reconnect, so check session directly)
              const { data: { session } } = await getSupabaseSession();
              if (session?.user?.id) {
                return { authUserId: session.user.id, guestTokenHash: null };
              }

              // Fall back to guest token
              const guestSessionId = getGuestSessionId();
              if (guestSessionId) {
                const hash = await hashToken(guestSessionId);
                return { authUserId: null, guestTokenHash: hash };
              }
              return { authUserId: null, guestTokenHash: null };
            } catch (error) {
              logger.error('[AUTH] Failed to build auth context during reconnection:', error);
              return { authUserId: null, guestTokenHash: null };
            }
          };

          buildAuthContext().then((authContext) => {
            if (savedSession.isHost) {
              newSocket.emit('createGame', {
                gameCode: savedSession.gameCode,
                roomName: savedSession.roomName,
                language: savedSession.language || language,
                hostUsername: savedSession.username || savedSession.roomName,
                ...authContext,
              });
            } else {
              newSocket.emit('join', {
                gameCode: savedSession.gameCode,
                username: savedSession.username,
                ...authContext,
              });
            }
          });
        }
      }
      wasConnectedRef.current = true;
    });

    newSocket.on('disconnect', (reason) => {
      logger.log('[SOCKET.IO] Disconnected:', reason);
      setIsConnected(false);

      if (reason === 'io server disconnect') {
        newSocket.connect();
      }
    });

    newSocket.on('connect_error', (error) => {
      logger.error('[SOCKET.IO] Connection error:', error.message);
      setError(t('errors.unstableConnection') || 'Connection error');
    });

    newSocket.on('reconnect', (attemptNumber) => {
      logger.log('[SOCKET.IO] Reconnected after', attemptNumber, 'attempts');
      setIsConnected(true);
      toast.success(t('common.reconnected') || 'Reconnected!', {
        duration: 2000,
        icon: '✓',
      });
    });

    newSocket.on('reconnect_failed', () => {
      logger.error('[SOCKET.IO] Reconnection failed');
      setError(t('errors.connectionLost') || 'Connection lost');
    });

    // Game events
    newSocket.on('joined', (data) => {
      logger.log('[SOCKET.IO] Joined:', data);
      setIsHost(data.isHost);
      setIsActive(true);
      setError('');
      setAttemptingReconnect(false);
      setShouldAutoJoin(false);

      if (data.language) {
        setRoomLanguage(data.language);
      }

      const joinedUsername = data.username || username;
      if (data.isHost) {
        setUsername(joinedUsername);
        localStorage.setItem('boggle_username', joinedUsername);
      } else if (username) {
        localStorage.setItem('boggle_username', username);
      }

      saveSession({
        gameCode: data.gameCode || gameCode,
        username: joinedUsername,
        isHost: data.isHost,
        roomName: data.isHost ? roomName : '',
        language: data.language || roomLanguage,
      });
    });

    newSocket.on('updateUsers', (data) => {
      if (data.users) {
        setPlayersInRoom(data.users);
      }
    });

    newSocket.on('activeRooms', (data) => {
      setActiveRooms(data.rooms || []);
      setRoomsLoading(false);
    });

    // Fallback: if rooms don't load within 5 seconds, stop showing loading state
    const roomsLoadingTimeout = setTimeout(() => {
      setRoomsLoading(false);
    }, 5000);

    newSocket.on('error', (data) => {
      logger.error('[SOCKET.IO] Error:', data);

      // Handle specific error cases
      if (data.message?.includes('not found') || data.message?.includes('Game not found')) {
        if (attemptingReconnectRef.current) {
          setError(t('errors.sessionExpired'));
          toast.error(t('errors.sessionExpired'), { duration: 4000, icon: '⚠️' });
        } else {
          setError(t('errors.gameCodeNotExist'));
          toast.error(t('errors.gameCodeNotExist'), { duration: 4000, icon: '❌' });
        }
        setGameCode('');
        setIsActive(false);
        setAttemptingReconnect(false);
        setShouldAutoJoin(false);
        clearSession();
      } else if (data.message?.includes('already in use') || data.message?.includes('Game code already')) {
        setError(t('errors.gameCodeExists'));
        setIsActive(false);
        setIsHost(false);
        setAttemptingReconnect(false);
      } else if (data.message?.includes('username') || data.message?.includes('Username')) {
        setError(t('errors.usernameTaken'));
        setIsActive(false);
        setAttemptingReconnect(false);
        setShouldAutoJoin(false);
        clearSession();
      } else {
        setError(data.message || 'An error occurred');
      }
    });

    // Auto-join next game if player is viewing results
    // Note: The actual "Game Started" toast is shown by PlayerView/HostView components
    // This handler only manages state transitions
    newSocket.on('startGame', () => {
      logger.log('[SOCKET.IO] New game starting - auto-joining from results');
      setShowResults(false);
      setResultsData(null);
      // Toast notification is handled by PlayerView/HostView to avoid duplicates
    });

    // Handle game reset - keep players in the room for new game
    // Note: Toast notification is handled by PlayerView/HostView to avoid duplicates
    newSocket.on('resetGame', () => {
      logger.log('[SOCKET.IO] Game reset - staying in room for new game');
      setShowResults(false);
      setResultsData(null);
      // Toast notification is handled by PlayerView/HostView to avoid duplicates
    });

    newSocket.on('hostLeftRoomClosing', (data) => {
      toast.error(data.message || t('playerView.roomClosed'), {
        icon: '🚪',
        duration: 5000,
      });
      clearSession();
      setIsActive(false);
      setIsHost(false);
      setGameCode('');
      setTimeout(() => window.location.reload(), 2000);
    });

    newSocket.on('hostTransferred', (data) => {
      if (data.newHost === username) {
        setIsHost(true);
        saveSession({
          gameCode,
          username,
          isHost: true,
          roomName: roomName || username,
          language: roomLanguage,
        });
        toast.success(t('hostView.youAreNowHost'), { duration: 5000, icon: '👑' });
      } else {
        toast.info(`${data.newHost} ${t('hostView.newHostAssigned')}`, { duration: 3000, icon: '🔄' });
      }
    });

    newSocket.on('pong', () => {
      // Heartbeat response - connection is alive
    });

    // Defer state update to avoid calling setState directly within effect
    Promise.resolve().then(() => {
      setSocket(newSocket);
    });

    return () => {
      logger.log('[SOCKET.IO] Cleaning up');
      clearTimeout(roomsLoadingTimeout);
      newSocket.removeAllListeners();
      // Only keep socket connected if it's the global instance
      if (!globalSocketInstance || globalSocketInstance !== newSocket) {
        newSocket.disconnect();
      }
    };
  }, [t, language]);

  // Host keep-alive
  useEffect(() => {
    if (!isActive || !isHost || !socket || !isConnected) {
      if (hostKeepAliveIntervalRef.current) {
        clearInterval(hostKeepAliveIntervalRef.current);
        hostKeepAliveIntervalRef.current = null;
      }
      return;
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && socket && isConnected) {
        socket.emit('hostReactivate', { gameCode });
      }
    };

    hostKeepAliveIntervalRef.current = setInterval(() => {
      if (document.visibilityState === 'visible' && socket && isConnected) {
        socket.emit('hostKeepAlive', { gameCode });
      }
    }, SOCKET_CONFIG.HOST_KEEP_ALIVE_INTERVAL);

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Send initial reactivation
    socket.emit('hostReactivate', { gameCode });

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (hostKeepAliveIntervalRef.current) {
        clearInterval(hostKeepAliveIntervalRef.current);
        hostKeepAliveIntervalRef.current = null;
      }
    };
  }, [isActive, isHost, socket, isConnected, gameCode]);

  // Helper to get auth context for socket events
  const getAuthContext = useCallback(async () => {
    if (!isSupabaseEnabled) return { authUserId: null, guestTokenHash: null };

    if (isAuthenticated && user?.id) {
      return { authUserId: user.id, guestTokenHash: null };
    }

    const guestSessionId = getGuestSessionId();
    if (guestSessionId) {
      const hash = await hashToken(guestSessionId);
      return { authUserId: null, guestTokenHash: hash };
    }

    return { authUserId: null, guestTokenHash: null };
  }, [isSupabaseEnabled, isAuthenticated, user]);

  // Auto-join effect
  useEffect(() => {
    if (!shouldAutoJoin || !socket || !isConnected || isActive || attemptingReconnect) {
      return;
    }

    if (prefilledRoomCode && username && username.trim()) {
      const autoJoinTimeout = setTimeout(async () => {
        if (socket && isConnected && !isActive) {
          const authContext = await getAuthContext();
          socket.emit('join', {
            gameCode: prefilledRoomCode,
            username,
            ...authContext,
            avatar: profile ? {
              emoji: profile.avatar_emoji,
              color: profile.avatar_color,
            } : undefined,
            profilePictureUrl: profile?.profile_picture_url,
          });
          setShouldAutoJoin(false);
        }
      }, 200);
      return () => clearTimeout(autoJoinTimeout);
    }
  }, [shouldAutoJoin, prefilledRoomCode, username, isActive, attemptingReconnect, socket, isConnected, getAuthContext, profile]);

  // Session reconnection
  useEffect(() => {
    if (!attemptingReconnect || !socket || !isConnected || isActive) {
      return;
    }

    const savedSession = getSession();
    if (!savedSession?.gameCode) {
      Promise.resolve().then(() => setAttemptingReconnect(false));
      return;
    }

    // Check if session is too old (more than 5 minutes of inactivity)
    const sessionAge = Date.now() - savedSession.timestamp;
    const maxInactivity = 5 * 60 * 1000; // 5 minutes

    if (sessionAge > maxInactivity) {
      // Session is too old, don't auto-reconnect - user needs to manually rejoin
      logger.log('[SESSION] Session too old for auto-reconnect, clearing session');
      clearSession();
      Promise.resolve().then(() => setAttemptingReconnect(false));
      return;
    }

    const reconnectTimeout = setTimeout(async () => {
      const authContext = await getAuthContext();

      if (savedSession.isHost) {
        if (!savedSession.roomName) {
          clearSession();
          setAttemptingReconnect(false);
          return;
        }
        socket.emit('createGame', {
          gameCode: savedSession.gameCode,
          roomName: savedSession.roomName,
          hostUsername: savedSession.roomName,
          language: savedSession.language || language,
          ...authContext,
          avatar: profile ? {
            emoji: profile.avatar_emoji,
            color: profile.avatar_color,
          } : undefined,
          profilePictureUrl: profile?.profile_picture_url,
        });
      } else {
        if (!savedSession.username) {
          clearSession();
          setAttemptingReconnect(false);
          return;
        }
        socket.emit('join', {
          gameCode: savedSession.gameCode,
          username: savedSession.username,
          ...authContext,
          avatar: profile ? {
            emoji: profile.avatar_emoji,
            color: profile.avatar_color,
          } : undefined,
          profilePictureUrl: profile?.profile_picture_url,
        });
      }
    }, 500);

    return () => clearTimeout(reconnectTimeout);
  }, [attemptingReconnect, isActive, socket, isConnected, language, getAuthContext, profile]);

  const handleJoin = useCallback(async (isHostMode, roomLang) => {
    if (!socket || !isConnected) {
      setError(t('errors.notConnected') || 'Not connected to server');
      toast.error(t('common.notConnected') || 'Not connected to server', {
        duration: 3000,
        icon: '⚠️',
      });
      return;
    }

    // Wait for auth to finish loading before creating/joining game
    if (loading) {
      logger.log('[AUTH] Auth still loading, waiting...');
      toast.error(t('common.loadingProfile') || 'Loading profile, please wait...', {
        duration: 2000,
        icon: '⏳',
      });
      return;
    }

    setError('');

    // Build auth context for game result tracking
    let authUserId = null;
    let guestTokenHash = null;

    if (isSupabaseEnabled) {
      if (isAuthenticated && user?.id) {
        // Authenticated user
        authUserId = user.id;
        logger.log('[AUTH] Joining as authenticated user:', { authUserId, username });
      } else {
        // Guest user - get or create guest session
        const guestSessionId = getGuestSessionId();
        if (guestSessionId) {
          guestTokenHash = await hashToken(guestSessionId);
        }
        logger.log('[AUTH] Joining as guest:', { isAuthenticated, hasUser: !!user, userId: user?.id, guestTokenHash: !!guestTokenHash });
      }
    }

    if (isHostMode) {
      socket.emit('createGame', {
        gameCode,
        roomName,
        hostUsername: roomName,
        language: roomLang || language,
        authUserId,
        guestTokenHash,
        avatar: profile ? {
          emoji: profile.avatar_emoji,
          color: profile.avatar_color,
        } : undefined,
        profilePictureUrl: profile?.profile_picture_url,
      });
    } else {
      socket.emit('join', {
        gameCode,
        username,
        authUserId,
        guestTokenHash,
        avatar: profile ? {
          emoji: profile.avatar_emoji,
          color: profile.avatar_color,
        } : undefined,
        profilePictureUrl: profile?.profile_picture_url,
      });
    }
  }, [socket, isConnected, gameCode, username, roomName, language, t, isSupabaseEnabled, isAuthenticated, user, profile, loading]);

  const refreshRooms = useCallback(() => {
    if (socket && isConnected) {
      setRoomsLoading(true);
      socket.emit('getActiveRooms');
    }
  }, [socket, isConnected]);

  const handleReturnToRoom = useCallback(() => {
    setShowResults(false);
    setResultsData(null);
  }, []);

  const handleShowResults = useCallback((data) => {
    setResultsData(data);
    setShowResults(true);
  }, []);

  // Create context value
  const socketContextValue = {
    socket,
    isConnected,
    connectionError: error,
  };

  const renderView = () => {
    if (showResults) {
      return (
        <ResultsPage
          finalScores={resultsData?.scores}
          letterGrid={resultsData?.letterGrid}
          gameCode={gameCode}
          onReturnToRoom={handleReturnToRoom}
          username={username}
        />
      );
    }

    if (!isActive) {
      return (
        <JoinView
          handleJoin={handleJoin}
          gameCode={gameCode}
          username={username}
          roomName={roomName}
          setGameCode={setGameCode}
          setUsername={setUsername}
          setRoomName={setRoomName}
          error={error}
          activeRooms={activeRooms}
          refreshRooms={refreshRooms}
          prefilledRoom={prefilledRoomCode}
          isAutoJoining={shouldAutoJoin}
          roomsLoading={roomsLoading}
          isAuthenticated={isAuthenticated}
          displayName={profile?.display_name}
          isProfileLoading={loading}
        />
      );
    }

    if (isHost) {
      return <HostView gameCode={gameCode} roomLanguage={roomLanguage} initialPlayers={playersInRoom} username={username} onShowResults={handleShowResults} />;
    }

    return (
      <PlayerView
        handleJoin={handleJoin}
        gameCode={gameCode}
        username={username}
        setGameCode={setGameCode}
        setUsername={setUsername}
        onShowResults={handleShowResults}
        initialPlayers={playersInRoom}
      />
    );
  };

  return (
    <SocketContext.Provider value={socketContextValue}>
      <Header />
      {renderView()}
    </SocketContext.Provider>
  );
}
