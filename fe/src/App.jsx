import React, { useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import HostView from './host/HostView';
import PlayerView from './player/PlayerView';
import JoinView from './JoinView';
import ResultsPage from './ResultsPage.jsx';
import { WebSocketContext } from './utils/WebSocketContext';
import { saveSession, getSession, clearSession } from './utils/session';

const WS_CONFIG = {
  MAX_RECONNECT_ATTEMPTS: 10,
  BASE_RECONNECT_DELAY: 1000,
  MAX_RECONNECT_DELAY: 30000,
  HEARTBEAT_INTERVAL: 25000,
};

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

// Create a WebSocket wrapper that supports multiple message handlers
const createWebSocketWrapper = (ws) => {
  const handlers = new Set();
  
  const addHandler = (handler) => {
    handlers.add(handler);
    return () => handlers.delete(handler);
  };

  // Override the original onmessage to dispatch to all handlers
  const originalOnMessage = ws.onmessage;
  ws.onmessage = (event) => {
    // First call original handler if it exists
    if (originalOnMessage) {
      originalOnMessage(event);
    }
    
    // Then call all registered handlers
    handlers.forEach(handler => {
      try {
        handler(event);
      } catch (error) {
        console.error('Error in message handler:', error);
      }
    });
  };

  return {
    ...ws,
    addMessageHandler: addHandler,
    send: ws.send.bind(ws),
    close: ws.close.bind(ws),
    readyState: ws.readyState
  };
};

const useWebSocketConnection = () => {
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const heartbeatIntervalRef = useRef(null);
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

  const connectWebSocket = useCallback((messageHandler) => {
    try {
      const ws = new WebSocket(getWebSocketURL());
      const wrappedWs = createWebSocketWrapper(ws);
      wsRef.current = wrappedWs;

      ws.onopen = () => {
        console.log('WebSocket connected');
        reconnectAttemptsRef.current = 0;
        setConnectionError('');

        startHeartbeat(ws);

        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ action: 'getActiveRooms' }));
        }

        // ONLY reconnect if we were previously in an active game
        // This prevents creating duplicate connections on state changes
        // We use refs here to get the latest values without triggering reconnects
      };

      // Add the App-level message handler
      wrappedWs.addMessageHandler(messageHandler);

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      ws.onclose = (event) => {
        console.log('WebSocket disconnected', event.code, event.reason);
        stopHeartbeat();

        // Only auto-reconnect on unexpected disconnects, not manual closes
        if (event.code !== 1000 && reconnectAttemptsRef.current < WS_CONFIG.MAX_RECONNECT_ATTEMPTS) {
          const delay = Math.min(
            WS_CONFIG.BASE_RECONNECT_DELAY * Math.pow(2, reconnectAttemptsRef.current),
            WS_CONFIG.MAX_RECONNECT_DELAY
          );

          console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1}/${WS_CONFIG.MAX_RECONNECT_ATTEMPTS})`);

          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current += 1;
            connectWebSocket(messageHandler);
          }, delay);
        } else if (event.code === 1000) {
          console.log('WebSocket closed normally');
        } else {
          console.error('Max reconnection attempts reached');
          setConnectionError('Connection lost. Please refresh the page.');
        }
      };
    } catch (error) {
      console.error('Error creating WebSocket:', error);
      setConnectionError('Failed to connect. Please refresh the page.');
    }
    // Only depend on functions that don't change
  }, [startHeartbeat, stopHeartbeat]);

  const cleanup = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    stopHeartbeat();
    if (wsRef.current) {
      wsRef.current.close();
    }
  }, [stopHeartbeat]);

  return { wsRef, connectWebSocket, cleanup, connectionError };
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const { wsRef, connectWebSocket, cleanup, connectionError } = useWebSocketConnection();
  const [ws, setWs] = useState(null);

  const attemptingReconnectRef = useRef(attemptingReconnect);
  useEffect(() => {
    attemptingReconnectRef.current = attemptingReconnect;
  }, [attemptingReconnect]);

  // Update ws state when wsRef changes
  useEffect(() => {
    const checkConnection = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && wsRef.current !== ws) {
        setWs(wsRef.current);
      }
    }, 100); // Check every 100ms for a connected WebSocket

    return () => clearInterval(checkConnection);
  }, [wsRef, ws]);

  const handleWebSocketMessage = useCallback((event) => {
    try {
      const message = JSON.parse(event.data);
      const { action, isHost: isHostResponse, rooms } = message;

      console.log('[APP] Received WebSocket message:', action);

      switch (action) {
        case 'updateUsers':
          // HostView handles this directly via its own WebSocket listener
          console.log('[APP] Passing updateUsers to HostView');
          break;

        case 'joined':
          console.log('[APP] User joined successfully, setting active state');
          setIsHost(isHostResponse);
          setIsActive(true);
          setError('');
          setAttemptingReconnect(false);
          localStorage.setItem('boggle_username', username);

          // Save session to cookie
          saveSession({
            gameCode,
            username: isHostResponse ? '' : username,
            isHost: isHostResponse,
            roomName: isHostResponse ? roomName : '',
          });
          
          // Add a small delay to ensure component mounting
          setTimeout(() => {
            console.log('[APP] Ready to receive game messages');
          }, 100);
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

        // Pass through game messages that should be handled by PlayerView/HostView
        case 'startGame':
        case 'endGame':
        case 'timeUpdate':
        case 'updateLeaderboard':
        case 'wordAccepted':
        case 'wordAlreadyFound':
        case 'wordNotOnBoard':
        case 'playerFoundWord':
        case 'liveAchievementUnlocked':
        case 'validatedScores':
        case 'hostLeftRoomClosing':
        case 'resetGame':
          // These messages will be handled by PlayerView/HostView components
          // We don't handle them here to avoid duplication
          console.log('[APP] Passing game message to components:', action);
          break;

        default:
          break;
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  }, [username, gameCode, roomName]);

  useEffect(() => {
    connectWebSocket(handleWebSocketMessage);
    return cleanup;
  }, [connectWebSocket, handleWebSocketMessage, cleanup]);

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
    <WebSocketContext.Provider value={ws}>
      {renderView()}
    </WebSocketContext.Provider>
  );
};

export default App;
