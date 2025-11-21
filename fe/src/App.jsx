import React, { useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import HostView from './host/HostView';
import PlayerView from './player/PlayerView';
import JoinView from './JoinView';
import ResultsPage from './ResultsPage.jsx';
import { WebSocketContext } from './utils/WebSocketContext';
import { saveSession, getSession, clearSession } from './utils/session';
import { ThemeProvider } from './utils/ThemeContext';

const WS_CONFIG = {
  MAX_RECONNECT_ATTEMPTS: 10,
  BASE_RECONNECT_DELAY: 1000,
  MAX_RECONNECT_DELAY: 30000,
  HEARTBEAT_INTERVAL: 25000,
};

// Global flag to prevent multiple WebSocket instances (for React StrictMode)
// eslint-disable-next-line no-unused-vars
let globalWsInstance = null;
// eslint-disable-next-line no-unused-vars
let globalWsInitialized = false;

const getWebSocketURL = () => {
  if (process.env.REACT_APP_WS_URL) {
    return process.env.REACT_APP_WS_URL;
  }

  if (process.env.NODE_ENV === 'development') {
    return 'ws://localhost:3001';
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host;
  return `${protocol}//${host}`;
};

const useWebSocketConnection = () => {
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const heartbeatIntervalRef = useRef(null);
  const isConnectingRef = useRef(false);
  const messageHandlerRef = useRef(null);
  const hasInitializedRef = useRef(false);
  const [connectionError, setConnectionError] = useState('');

  const startHeartbeat = useCallback((ws) => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }
    heartbeatIntervalRef.current = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ action: 'ping' }));
      }
    }, WS_CONFIG.HEARTBEAT_INTERVAL);
  }, []);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  const connectWebSocket = useCallback(() => {
    // Check global flag first (prevents React StrictMode duplicates)
    if (globalWsInitialized && globalWsInstance && globalWsInstance.readyState <= 1) {
      wsRef.current = globalWsInstance;
      isConnectingRef.current = false;
      hasInitializedRef.current = true;
      return;
    }

    // Prevent multiple concurrent connection attempts
    if (isConnectingRef.current) {
      return;
    }

    // Check if we have a valid existing connection
    if (wsRef.current) {
      const state = wsRef.current.readyState;
      if (state === WebSocket.OPEN || state === WebSocket.CONNECTING) {
        return;
      }
    }

    // Prevent duplicate initialization in React StrictMode
    if (hasInitializedRef.current && wsRef.current && wsRef.current.readyState <= 1) {
      return;
    }

    hasInitializedRef.current = true;
    globalWsInitialized = true;
    isConnectingRef.current = true;

    try {
      const ws = new WebSocket(getWebSocketURL());
      wsRef.current = ws;
      globalWsInstance = ws;

      ws.onopen = () => {
        console.log('[WS] Connected');
        isConnectingRef.current = false;
        reconnectAttemptsRef.current = 0;
        setConnectionError('');

        startHeartbeat(ws);

        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ action: 'getActiveRooms' }));
        }
      };

      ws.onmessage = (event) => {
        if (messageHandlerRef.current) {
          messageHandlerRef.current(event);
        }
      };

      ws.onerror = (error) => {
        console.error('[WS] Error:', error);
        isConnectingRef.current = false;
        hasInitializedRef.current = false;
      };

      ws.onclose = (event) => {
        isConnectingRef.current = false;
        stopHeartbeat();

        // Reset global flags if this was the global instance
        if (ws === globalWsInstance) {
          globalWsInstance = null;
          globalWsInitialized = false;
        }

        // Only auto-reconnect on unexpected disconnects, not manual closes
        if (event.code !== 1000 && reconnectAttemptsRef.current < WS_CONFIG.MAX_RECONNECT_ATTEMPTS) {
          const delay = Math.min(
            WS_CONFIG.BASE_RECONNECT_DELAY * Math.pow(2, reconnectAttemptsRef.current),
            WS_CONFIG.MAX_RECONNECT_DELAY
          );

          console.log(`[WS] Reconnecting... (attempt ${reconnectAttemptsRef.current + 1}/${WS_CONFIG.MAX_RECONNECT_ATTEMPTS})`);

          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current += 1;
            hasInitializedRef.current = false;
            connectWebSocket();
          }, delay);
        } else if (event.code !== 1000) {
          console.error('[WS] Connection lost');
          setConnectionError('Connection lost. Please refresh the page.');
        }
      };
    } catch (error) {
      console.error('[WS] Error creating WebSocket:', error);
      isConnectingRef.current = false;
      setConnectionError('Failed to connect. Please refresh the page.');
    }
  }, [startHeartbeat, stopHeartbeat]);

  const setMessageHandler = useCallback((handler) => {
    messageHandlerRef.current = handler;
  }, []);

  const cleanup = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    stopHeartbeat();

    // Only close if this is the global instance
    if (wsRef.current && wsRef.current === globalWsInstance) {
      if (wsRef.current.readyState !== WebSocket.CLOSED) {
        wsRef.current.close();
      }
      globalWsInstance = null;
      globalWsInitialized = false;
    }

    hasInitializedRef.current = false;
    isConnectingRef.current = false;
  }, [stopHeartbeat]);

  return { wsRef, connectWebSocket, setMessageHandler, cleanup, connectionError };
};



const App = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const roomFromUrl = urlParams.get('room');
  const savedUsername = localStorage.getItem('boggle_username') || '';

  // Try to restore session from cookie
  const savedSession = getSession();

  const [gameCode, setGameCode] = useState(savedSession?.gameCode || roomFromUrl || '');
  const [username, setUsername] = useState(savedSession?.username || savedUsername);
  const [roomName, setRoomName] = useState(savedSession?.roomName || '');
  const [isActive, setIsActive] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [error, setError] = useState('');
  const [activeRooms, setActiveRooms] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [resultsData, setResultsData] = useState(null);
  const [attemptingReconnect, setAttemptingReconnect] = useState(!!savedSession);

  const { wsRef, connectWebSocket, setMessageHandler, cleanup, connectionError } = useWebSocketConnection();
  const [ws, setWs] = useState(null);

  const attemptingReconnectRef = useRef(attemptingReconnect);
  useEffect(() => {
    attemptingReconnectRef.current = attemptingReconnect;
  }, [attemptingReconnect]);

  // Update ws state when wsRef changes - use a polling approach to detect state changes
  useEffect(() => {
    const interval = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && wsRef.current !== ws) {
        setWs(wsRef.current);
      }
    }, 100);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ws]);

  const handleWebSocketMessage = useCallback((event) => {
    try {
      const message = JSON.parse(event.data);
      const { action, isHost: isHostResponse, rooms } = message;

      switch (action) {
        case 'updateUsers':
          // HostView handles this directly via its own WebSocket listener
          break;

        case 'joined':
          setIsHost(isHostResponse);
          setIsActive(true);
          setError('');
          setAttemptingReconnect(false);

          // Save username only if it's a player (not host)
          if (!isHostResponse && username) {
            localStorage.setItem('boggle_username', username);
          }

          // Save session to cookie
          saveSession({
            gameCode,
            username: isHostResponse ? '' : username,
            isHost: isHostResponse,
            roomName: isHostResponse ? roomName : '',
          });
          break;

        case 'gameDoesNotExist':
          // Check if this was an auto-reconnect attempt
          if (attemptingReconnectRef.current) {
            setError('הסשן הקודם פג תוקף. אנא הצטרף לחדר חדש.');
            toast.error('החדר הקודם כבר לא זמין', {
              duration: 3000,
              icon: '⚠️',
            });
            setGameCode('');
          } else {
            setError('Game code does not exist. Please check and try again.');
          }
          setIsActive(false);
          setAttemptingReconnect(false);
          // Clear invalid session
          clearSession();
          break;

        case 'usernameTaken':
          setError('Username is already taken in this game. Please choose another.');
          setIsActive(false);
          setAttemptingReconnect(false);
          // Clear invalid session
          clearSession();
          break;

        case 'gameExists':
          setError('Game code already exists. Please choose a different code.');
          setIsActive(false);
          setIsHost(false);
          setAttemptingReconnect(false);
          break;

        case 'activeRooms':
          setActiveRooms(rooms || []);
          break;

        case 'pong':
          break;

        default:
          break;
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  }, [username, gameCode, roomName]);

  useEffect(() => {
    connectWebSocket();
    return () => {
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Set the message handler
  useEffect(() => {
    setMessageHandler(handleWebSocketMessage);
  }, [handleWebSocketMessage, setMessageHandler]);

  useEffect(() => {
    if (connectionError) {
      setError(connectionError);
    }
  }, [connectionError]);

  const sendMessage = useCallback((message) => {
    const ws = wsRef.current;
    if (!ws) return;

    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    } else if (ws.readyState === WebSocket.CONNECTING) {
      const onOpen = () => {
        ws.send(JSON.stringify(message));
        ws.removeEventListener('open', onOpen);
      };
      ws.addEventListener('open', onOpen);
    } else {
      console.warn('WebSocket is not open. Current state:', ws.readyState);
    }
  }, [wsRef]);

  // Auto-reconnect to saved session when WebSocket is ready
  useEffect(() => {
    if (!savedSession || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    // Validate session has required fields
    if (!savedSession.gameCode) {
      console.warn('Invalid session: missing gameCode');
      clearSession();
      setAttemptingReconnect(false);
      return;
    }

    // Only attempt reconnect once
    if (attemptingReconnect && !isActive) {
      console.log('Attempting to restore session:', savedSession);

      if (savedSession.isHost) {
        // Reconnect as host - ensure we have roomName
        if (!savedSession.roomName) {
          console.warn('Invalid host session: missing roomName');
          clearSession();
          setAttemptingReconnect(false);
          return;
        }
        sendMessage({
          action: 'createGame',
          gameCode: savedSession.gameCode,
          roomName: savedSession.roomName,
        });
      } else {
        // Reconnect as player - ensure we have username
        if (!savedSession.username) {
          console.warn('Invalid player session: missing username');
          clearSession();
          setAttemptingReconnect(false);
          return;
        }
        sendMessage({
          action: 'join',
          gameCode: savedSession.gameCode,
          username: savedSession.username,
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wsRef.current?.readyState, attemptingReconnect, isActive, sendMessage]);

  const handleJoin = useCallback((isHostMode) => {
    setError('');

    if (isHostMode) {
      // Host needs game code and room name
      sendMessage({ action: 'createGame', gameCode, roomName });
    } else {
      // Players need both game code and username
      sendMessage({ action: 'join', gameCode, username });
    }
  }, [sendMessage, gameCode, username, roomName]);

  const refreshRooms = useCallback(() => {
    sendMessage({ action: 'getActiveRooms' });
  }, [sendMessage]);

  const handleReturnToRoom = useCallback(() => {
    setShowResults(false);
    setResultsData(null);
  }, []);

  const handleShowResults = useCallback((data) => {
    setResultsData(data);
    setShowResults(true);
  }, []);

  const renderView = () => {
    if (showResults) {
      return (
        <ResultsPage
          finalScores={resultsData?.scores}
          letterGrid={resultsData?.letterGrid}
          gameCode={gameCode}
          onReturnToRoom={handleReturnToRoom}
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
          prefilledRoom={roomFromUrl}
        />
      );
    }

    if (isHost) {
      return <HostView gameCode={gameCode} />;
    }

    return (
      <PlayerView
        handleJoin={handleJoin}
        gameCode={gameCode}
        username={username}
        setGameCode={setGameCode}
        setUsername={setUsername}
        onShowResults={handleShowResults}
      />
    );
  };

  return (
    <ThemeProvider>
      <WebSocketContext.Provider value={ws}>
        {renderView()}
      </WebSocketContext.Provider>
    </ThemeProvider>
  );
};

export default App;
