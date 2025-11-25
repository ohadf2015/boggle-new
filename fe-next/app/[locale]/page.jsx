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

  const socketRef = useRef(null);
  const attemptingReconnectRef = useRef(attemptingReconnect);
  const hostKeepAliveIntervalRef = useRef(null);
  const wasConnectedRef = useRef(false);

  const { t, language } = useLanguage();

  // Track if we should auto-join (prefilled room + existing username)
  const [shouldAutoJoin, setShouldAutoJoin] = useState(false);
  const [prefilledRoomCode, setPrefilledRoomCode] = useState('');

  // Initialize state from URL and session
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const initializeState = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const roomFromUrl = urlParams.get('room');
      const savedUsername = localStorage.getItem('boggle_username') || '';
      const savedSession = getSession();

      let joiningNewRoomViaInvitation = false;
      const hasSession = savedSession && savedSession.gameCode;

      if (roomFromUrl) {
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
      });
      return;
    }

    const socketUrl = getSocketURL();
    console.log('[SOCKET.IO] Connecting to:', socketUrl);

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
      console.log('[SOCKET.IO] Connected:', newSocket.id);
      setIsConnected(true);
      setSocket(newSocket);

      // Request active rooms on connect
      newSocket.emit('getActiveRooms');

      // Handle reconnection to game
      if (wasConnectedRef.current) {
        const savedSession = getSession();
        if (savedSession?.gameCode) {
          console.log('[SOCKET.IO] Reconnecting to game:', savedSession.gameCode);
          toast.success(t('common.reconnecting') || 'Reconnecting to game...', {
            duration: 2000,
            icon: '🔄',
          });

          if (savedSession.isHost) {
            newSocket.emit('createGame', {
              gameCode: savedSession.gameCode,
              roomName: savedSession.roomName,
              language: savedSession.language || language,
              hostUsername: savedSession.username || savedSession.roomName,
            });
          } else {
            newSocket.emit('join', {
              gameCode: savedSession.gameCode,
              username: savedSession.username,
            });
          }
        }
      }
      wasConnectedRef.current = true;
    });

    newSocket.on('disconnect', (reason) => {
      console.log('[SOCKET.IO] Disconnected:', reason);
      setIsConnected(false);

      if (reason === 'io server disconnect') {
        newSocket.connect();
      }
    });

    newSocket.on('connect_error', (error) => {
      console.error('[SOCKET.IO] Connection error:', error.message);
      setError(t('errors.unstableConnection') || 'Connection error');
    });

    newSocket.on('reconnect', (attemptNumber) => {
      console.log('[SOCKET.IO] Reconnected after', attemptNumber, 'attempts');
      setIsConnected(true);
      toast.success(t('common.reconnected') || 'Reconnected!', {
        duration: 2000,
        icon: '✓',
      });
    });

    newSocket.on('reconnect_failed', () => {
      console.error('[SOCKET.IO] Reconnection failed');
      setError(t('errors.connectionLost') || 'Connection lost');
    });

    // Game events
    newSocket.on('joined', (data) => {
      console.log('[SOCKET.IO] Joined:', data);
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
    });

    newSocket.on('error', (data) => {
      console.error('[SOCKET.IO] Error:', data);

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
      console.log('[SOCKET.IO] Cleaning up');
      newSocket.removeAllListeners();
      // Don't disconnect on cleanup - let it persist
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

  // Auto-join effect
  useEffect(() => {
    if (!shouldAutoJoin || !socket || !isConnected || isActive || attemptingReconnect) {
      return;
    }

    if (prefilledRoomCode && username && username.trim()) {
      const autoJoinTimeout = setTimeout(() => {
        if (socket && isConnected && !isActive) {
          socket.emit('join', { gameCode: prefilledRoomCode, username });
          setShouldAutoJoin(false);
        }
      }, 200);
      return () => clearTimeout(autoJoinTimeout);
    }
  }, [shouldAutoJoin, prefilledRoomCode, username, isActive, attemptingReconnect, socket, isConnected]);

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
      console.log('[SESSION] Session too old for auto-reconnect, clearing session');
      clearSession();
      Promise.resolve().then(() => setAttemptingReconnect(false));
      return;
    }

    const reconnectTimeout = setTimeout(() => {
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
        });
      }
    }, 500);

    return () => clearTimeout(reconnectTimeout);
  }, [attemptingReconnect, isActive, socket, isConnected, language]);

  const handleJoin = useCallback((isHostMode, roomLang) => {
    if (!socket || !isConnected) {
      setError(t('errors.notConnected') || 'Not connected to server');
      return;
    }

    setError('');

    if (isHostMode) {
      socket.emit('createGame', {
        gameCode,
        roomName,
        hostUsername: roomName,
        language: roomLang || language,
      });
    } else {
      socket.emit('join', { gameCode, username });
    }
  }, [socket, isConnected, gameCode, username, roomName, language, t]);

  const refreshRooms = useCallback(() => {
    if (socket && isConnected) {
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
          isHost={isHost}
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
        />
      );
    }

    if (isHost) {
      return <HostView gameCode={gameCode} roomLanguage={roomLanguage} initialPlayers={playersInRoom} username={username} />;
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
