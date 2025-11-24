'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import HostView from '@/host/HostView';
import PlayerView from '@/player/PlayerView';
import JoinView from '@/JoinView';
import ResultsPage from '@/ResultsPage.jsx';
import Header from '@/components/Header';
import { WebSocketContext } from '@/utils/WebSocketContext';
import { saveSession, getSession, clearSession } from '@/utils/session';
import { useLanguage } from '@/contexts/LanguageContext';

// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic';

const WS_CONFIG = {
    MAX_RECONNECT_ATTEMPTS: 10,
    BASE_RECONNECT_DELAY: 1000,
    MAX_RECONNECT_DELAY: 30000,
    HEARTBEAT_INTERVAL: 25000,
    HIGH_LATENCY_THRESHOLD: 1000,
    VERY_HIGH_LATENCY_THRESHOLD: 3000,
};

let globalWsInstance = null;
let globalWsInitialized = false;

const getWebSocketURL = () => {
    if (process.env.NEXT_PUBLIC_WS_URL) {
        return process.env.NEXT_PUBLIC_WS_URL;
    }

    if (process.env.NODE_ENV === 'development') {
        return 'ws://localhost:3001';
    }

    if (typeof window === 'undefined') return '';

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
    const lastPingTimeRef = useRef(null);
    const [connectionQuality, setConnectionQuality] = useState('good');
    const highLatencyWarningShownRef = useRef(false);
    const { t } = useLanguage();

    const checkLatency = useCallback((latency) => {
        if (latency > WS_CONFIG.VERY_HIGH_LATENCY_THRESHOLD) {
            setConnectionQuality('poor');
            if (!highLatencyWarningShownRef.current) {
                toast.error(t('errors.unstableConnection'), {
                    duration: 5000,
                    icon: '⚠️',
                });
                highLatencyWarningShownRef.current = true;
                setTimeout(() => {
                    highLatencyWarningShownRef.current = false;
                }, 30000);
            }
        } else if (latency > WS_CONFIG.HIGH_LATENCY_THRESHOLD) {
            setConnectionQuality('unstable');
            if (!highLatencyWarningShownRef.current) {
                toast.warning(t('errors.slowConnection'), {
                    duration: 3000,
                    icon: '⚠️',
                });
                highLatencyWarningShownRef.current = true;
                setTimeout(() => {
                    highLatencyWarningShownRef.current = false;
                }, 30000);
            }
        } else {
            setConnectionQuality('good');
        }
    }, [t]);

    const startHeartbeat = useCallback((ws) => {
        if (heartbeatIntervalRef.current) {
            clearInterval(heartbeatIntervalRef.current);
        }
        heartbeatIntervalRef.current = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
                lastPingTimeRef.current = Date.now();
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

    const connectWebSocketRef = useRef(null);

    const connectWebSocket = useCallback(() => {
        if (typeof window === 'undefined') return;

        if (globalWsInitialized && globalWsInstance && globalWsInstance.readyState <= 1) {
            wsRef.current = globalWsInstance;
            isConnectingRef.current = false;
            hasInitializedRef.current = true;
            return;
        }

        if (isConnectingRef.current) {
            return;
        }

        if (wsRef.current) {
            const state = wsRef.current.readyState;
            if (state === WebSocket.OPEN || state === WebSocket.CONNECTING) {
                return;
            }
        }

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

                if (ws === globalWsInstance) {
                    globalWsInstance = null;
                    globalWsInitialized = false;
                }

                if (event.code !== 1000 && reconnectAttemptsRef.current < WS_CONFIG.MAX_RECONNECT_ATTEMPTS) {
                    const delay = Math.min(
                        WS_CONFIG.BASE_RECONNECT_DELAY * Math.pow(2, reconnectAttemptsRef.current),
                        WS_CONFIG.MAX_RECONNECT_DELAY
                    );

                    reconnectTimeoutRef.current = setTimeout(() => {
                        reconnectAttemptsRef.current += 1;
                        hasInitializedRef.current = false;
                        // Use ref to call the function recursively
                        if (connectWebSocketRef.current) {
                            connectWebSocketRef.current();
                        }
                    }, delay);
                } else if (event.code !== 1000) {
                    console.error('[WS] Connection lost');
                    setConnectionError(t('errors.unstableConnection'));
                }
            };
        } catch (error) {
            console.error('[WS] Error creating WebSocket:', error);
            isConnectingRef.current = false;
            setConnectionError(t('errors.unstableConnection'));
        }
    }, [startHeartbeat, stopHeartbeat, t]);

    // Store the function in ref for recursive calls
    useEffect(() => {
        connectWebSocketRef.current = connectWebSocket;
    }, [connectWebSocket]);

    const setMessageHandler = useCallback((handler) => {
        messageHandlerRef.current = handler;
    }, []);

    const cleanup = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
        }
        stopHeartbeat();

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

    return { wsRef, connectWebSocket, setMessageHandler, cleanup, connectionError, checkLatency, lastPingTimeRef, connectionQuality };
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

    const { wsRef, connectWebSocket, setMessageHandler, cleanup, connectionError, checkLatency, lastPingTimeRef } = useWebSocketConnection();
    const [ws, setWs] = useState(null);
    const { t, language } = useLanguage();

    const attemptingReconnectRef = useRef(attemptingReconnect);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        // Defer state updates to avoid synchronous setState in effect
        const initializeState = () => {
            const urlParams = new URLSearchParams(window.location.search);
            const roomFromUrl = urlParams.get('room');
            const savedUsername = localStorage.getItem('boggle_username') || '';
            const savedSession = getSession();

            if (savedSession?.gameCode) {
                setGameCode(savedSession.gameCode);
                setAttemptingReconnect(true);
            } else if (roomFromUrl) {
                setGameCode(roomFromUrl);
            }

            if (savedSession?.username) {
                setUsername(savedSession.username);
            } else if (savedUsername) {
                setUsername(savedUsername);
            }

            if (savedSession?.roomName) {
                setRoomName(savedSession.roomName);
            }
        };

        // Use Promise.resolve().then() to defer execution
        Promise.resolve().then(initializeState);
    }, []);

    useEffect(() => {
        attemptingReconnectRef.current = attemptingReconnect;
    }, [attemptingReconnect]);

    useEffect(() => {
        const interval = setInterval(() => {
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && wsRef.current !== ws) {
                setWs(wsRef.current);
            }
        }, 100);

        return () => clearInterval(interval);
    }, [ws, wsRef]);

    const handleWebSocketMessage = useCallback((event) => {
        try {
            const message = JSON.parse(event.data);
            const { action, isHost: isHostResponse, rooms, language: roomLang } = message;

            switch (action) {
                case 'updateUsers':
                    if (message.users) {
                        setPlayersInRoom(message.users);
                    }
                    break;

                case 'joined':
                    setIsHost(isHostResponse);
                    setIsActive(true);
                    setError('');
                    setAttemptingReconnect(false);
                    if (roomLang) {
                        setRoomLanguage(roomLang);
                    }

                    // Host now also has a username
                    const joinedUsername = message.username || username;
                    if (isHostResponse) {
                        setUsername(joinedUsername);
                        localStorage.setItem('boggle_username', joinedUsername);
                    } else if (username) {
                        localStorage.setItem('boggle_username', username);
                    }

                    saveSession({
                        gameCode,
                        username: joinedUsername,
                        isHost: isHostResponse,
                        roomName: isHostResponse ? roomName : '',
                        language: roomLang || roomLanguage, // Save room language
                    });
                    break;

                case 'hostTransferred':
                    // Handle host transfer - check if we're the new host
                    if (message.newHost === username) {
                        setIsHost(true);
                        toast.success('You are now the host!', {
                            duration: 5000,
                            icon: '👑',
                        });
                    } else {
                        toast.info(message.message || `${message.newHost} is now the host`, {
                            duration: 3000,
                        });
                    }
                    break;

                case 'gameDoesNotExist':
                    if (attemptingReconnectRef.current) {
                        setError(t('errors.sessionExpired'));
                        toast.error(t('errors.sessionExpired'), {
                            duration: 3000,
                            icon: '⚠️',
                        });
                        setGameCode('');
                    } else {
                        setError(t('errors.gameCodeNotExist'));
                    }
                    setIsActive(false);
                    setAttemptingReconnect(false);
                    clearSession();
                    break;

                case 'usernameTaken':
                    setError(t('errors.usernameTaken'));
                    setIsActive(false);
                    setAttemptingReconnect(false);
                    clearSession();
                    break;

                case 'gameExists':
                    setError(t('errors.gameCodeExists'));
                    setIsActive(false);
                    setIsHost(false);
                    setAttemptingReconnect(false);
                    break;

                case 'activeRooms':
                    setActiveRooms(rooms || []);
                    break;

                case 'pong':
                    if (lastPingTimeRef.current) {
                        const latency = Date.now() - lastPingTimeRef.current;
                        checkLatency(latency);
                    }
                    break;

                default:
                    break;
            }
        } catch (error) {
            console.error('Error parsing WebSocket message:', error);
        }
    }, [username, gameCode, roomName, checkLatency, lastPingTimeRef, t, roomLanguage]);

    useEffect(() => {
        connectWebSocket();
        return () => {
            cleanup();
        };
    }, [connectWebSocket, cleanup]);

    useEffect(() => {
        setMessageHandler(handleWebSocketMessage);
    }, [handleWebSocketMessage, setMessageHandler]);

    useEffect(() => {
        if (connectionError) {
            // Defer state update to avoid synchronous setState
            Promise.resolve().then(() => {
                setError(connectionError);
            });
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
        }
    }, [wsRef]);

    useEffect(() => {
        if (!attemptingReconnect || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || isActive) {
            return;
        }

        const savedSession = getSession();
        if (!savedSession?.gameCode) {
            // Defer state update to avoid synchronous setState
            Promise.resolve().then(() => {
                setAttemptingReconnect(false);
            });
            return;
        }

        // Add a small delay to ensure the old connection is fully closed on the backend
        // This prevents race conditions when the host refreshes the page
        const reconnectTimeout = setTimeout(() => {
            if (savedSession.isHost) {
                if (!savedSession.roomName) {
                    clearSession();
                    setAttemptingReconnect(false);
                    return;
                }
                sendMessage({
                    action: 'createGame',
                    gameCode: savedSession.gameCode,
                    roomName: savedSession.roomName,
                    hostUsername: savedSession.roomName,
                    language: savedSession.language || language, // Restore room language
                });
            } else {
                if (!savedSession.username) {
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
        }, 1000); // 1 second delay to allow disconnect to process

        return () => clearTimeout(reconnectTimeout);
    }, [attemptingReconnect, isActive, sendMessage, wsRef, language]);

    const handleJoin = useCallback((isHostMode, roomLanguage) => {
        setError('');

        if (isHostMode) {
            // Use roomName as both the room name and host's username
            sendMessage({ action: 'createGame', gameCode, roomName, hostUsername: roomName, language: roomLanguage || language });
        } else {
            sendMessage({ action: 'join', gameCode, username });
        }
    }, [sendMessage, gameCode, username, roomName, language]);

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
                    isHost={isHost}
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
                    prefilledRoom={gameCode}
                />
            );
        }

        if (isHost) {
            return <HostView gameCode={gameCode} roomLanguage={roomLanguage} initialPlayers={playersInRoom} />;
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
        <WebSocketContext.Provider value={ws}>
            <Header />
            {renderView()}
        </WebSocketContext.Provider>
    );
}
