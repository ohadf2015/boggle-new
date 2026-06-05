'use client';

/**
 * usePartySocket — manages socket connection for party games.
 * Handles room creation, joining, input relay, and phase sync.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { getSocketURL } from '@/utils/SocketContext';
import type {
  PartyGameId,
  PartyPlayer,
  PartyPhase,
  PartyInput,
  PartyGameStatePublic,
  PartyRoundResults,
  PartyGameResults,
} from '@/shared/types/partyGame';
import type { Avatar } from '@/shared/types/game';

export interface PartyRoomState {
  roomCode: string;
  roomName: string;
  gameId: PartyGameId;
  players: Record<string, PartyPlayer>;
  spectators: Record<string, PartyPlayer>;
  phase: PartyPhase;
  round: number;
  totalRounds: number;
  hostSocketId: string;
}

export interface UsePartySocketReturn {
  /** Current room state (null if not in a room) */
  room: PartyRoomState | null;
  /** Current game-specific state */
  gameState: PartyGameStatePublic | null;
  /** This player's socket ID */
  playerId: string | null;
  /** Whether this player is the host */
  isHost: boolean;
  /** Whether this player is a spectator */
  isSpectator: boolean;
  /** Connection status */
  connected: boolean;
  /** Latest error */
  error: string | null;
  /** Round results (updated each round) */
  roundResults: PartyRoundResults | null;
  /** Final game results */
  gameResults: PartyGameResults | null;
  /** Socket instance for game-specific event listeners */
  socket: Socket | null;
  /** Create a new party room */
  createRoom: (gameId: PartyGameId, roomName: string, username: string, avatar: Avatar) => void;
  /** Join an existing party room */
  joinRoom: (roomCode: string, username: string, avatar: Avatar, asSpectator?: boolean) => void;
  /** Leave the current room */
  leaveRoom: () => void;
  /** Start the game (host only) */
  startGame: () => void;
  /** Fill empty seats with bots for solo play (host only) */
  addBots: () => void;
  /** Send player input */
  sendInput: (input: PartyInput) => void;
}

export function usePartySocket(authUserId?: string | null, enabled: boolean = true): UsePartySocketReturn {
  const socketRef = useRef<Socket | null>(null);
  const [room, setRoom] = useState<PartyRoomState | null>(null);
  const [gameState, setGameState] = useState<PartyGameStatePublic | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roundResults, setRoundResults] = useState<PartyRoundResults | null>(null);
  const [gameResults, setGameResults] = useState<PartyGameResults | null>(null);

  // Initialize socket connection — only when enabled (feature flag passed)
  useEffect(() => {
    if (!enabled) return;

    const socketUrl = getSocketURL();
    const newSocket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      auth: { userId: authUserId || undefined },
      autoConnect: true,
    });

    socketRef.current = newSocket;

    newSocket.on('connect', () => {
      setConnected(true);
      setError(null);
    });

    newSocket.on('connect_error', (err) => {
      console.error('[PARTY] Socket connect error:', err.message);
      setError(err.message);
    });

    newSocket.on('disconnect', () => {
      setConnected(false);
    });

    // Party events
    newSocket.on('party:joined', (data: { room: Record<string, unknown>; playerId: string }) => {
      setRoom(data.room as unknown as PartyRoomState);
      setGameState((data.room as Record<string, unknown>).gameState as PartyGameStatePublic);
      setPlayerId(data.playerId);
      setError(null);
    });

    newSocket.on('party:playerJoined', (data: { player: PartyPlayer }) => {
      setRoom(prev => {
        if (!prev) return prev;
        const target = data.player.isSpectator ? 'spectators' : 'players';
        return {
          ...prev,
          [target]: { ...prev[target], [data.player.socketId]: data.player },
        };
      });
    });

    newSocket.on('party:playerLeft', (data: { socketId: string }) => {
      setRoom(prev => {
        if (!prev) return prev;
        const newPlayers = { ...prev.players };
        const newSpectators = { ...prev.spectators };
        delete newPlayers[data.socketId];
        delete newSpectators[data.socketId];
        return { ...prev, players: newPlayers, spectators: newSpectators };
      });
    });

    newSocket.on('party:phaseChange', (data: { phase: PartyPhase; gameState: PartyGameStatePublic }) => {
      setRoom(prev => prev ? { ...prev, phase: data.phase } : prev);
      setGameState(data.gameState);
    });

    newSocket.on('party:gameUpdate', (data: Record<string, unknown>) => {
      setRoom(data as unknown as PartyRoomState);
      setGameState(data.gameState as PartyGameStatePublic);
    });

    newSocket.on('party:roundResults', (data: PartyRoundResults) => {
      setRoundResults(data);
    });

    newSocket.on('party:gameResults', (data: PartyGameResults) => {
      setGameResults(data);
      setRoom(prev => prev ? { ...prev, phase: 'results' } : prev);
    });

    newSocket.on('party:error', (data: { error: string; message: string }) => {
      console.error('[PARTY] Error:', data.error, data.message);
      setError(data.message);
    });

    return () => {
      newSocket.removeAllListeners();
      newSocket.disconnect();
      socketRef.current = null;
    };
  }, [authUserId, enabled]);

  const createRoom = useCallback((gameId: PartyGameId, roomName: string, username: string, avatar: Avatar) => {
    socketRef.current?.emit('party:create', { gameId, roomName, username, avatar });
  }, []);

  const joinRoom = useCallback((roomCode: string, username: string, avatar: Avatar, asSpectator?: boolean) => {
    socketRef.current?.emit('party:join', { roomCode, username, avatar, asSpectator });
  }, []);

  const leaveRoom = useCallback(() => {
    socketRef.current?.emit('party:leave');
    setRoom(null);
    setGameState(null);
    setPlayerId(null);
    setRoundResults(null);
    setGameResults(null);
  }, []);

  const startGame = useCallback(() => {
    socketRef.current?.emit('party:startGame');
  }, []);

  const addBots = useCallback(() => {
    socketRef.current?.emit('party:addBots');
  }, []);

  const sendInput = useCallback((input: PartyInput) => {
    socketRef.current?.emit('party:input', input);
  }, []);

  const isHost = room?.hostSocketId === playerId;
  const isSpectator = playerId ? !!room?.spectators[playerId] : false;

  return {
    room,
    gameState,
    playerId,
    isHost,
    isSpectator,
    connected,
    error,
    roundResults,
    gameResults,
    socket: socketRef.current,
    createRoom,
    joinRoom,
    leaveRoom,
    startGame,
    addBots,
    sendInput,
  };
}
