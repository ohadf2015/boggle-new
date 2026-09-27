/**
 * useMatchmaking — client-side hook for ranked matchmaking queue
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { getSharedSocketIfExists } from '@/utils/SocketContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';

export type MatchmakingStatus = 'idle' | 'searching' | 'found' | 'timeout';

export interface MatchmakingOpponent {
  username: string;
  elo: number;
  tier: string;
}

export interface UseMatchmakingReturn {
  status: MatchmakingStatus;
  opponent: MatchmakingOpponent | null;
  waitTime: number;
  queueSize: number;
  eloRange: number;
  roomId: string | null;
  joinQueue: (gameMode: string, language: string) => void;
  leaveQueue: () => void;
}

export function useMatchmaking(): UseMatchmakingReturn {
  const [status, setStatus] = useState<MatchmakingStatus>('idle');
  const [opponent, setOpponent] = useState<MatchmakingOpponent | null>(null);
  const [waitTime, setWaitTime] = useState(0);
  const [queueSize, setQueueSize] = useState(0);
  const [eloRange, setEloRange] = useState(100);
  const [roomId, setRoomId] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const socket = getSharedSocketIfExists();
  const { playMatchFoundSound } = useSoundEffects();

  const joinQueue = useCallback(
    (gameMode: string, language: string) => {
      if (!socket) return;
      socket.emit('joinMatchmaking', { gameMode, language });
      setStatus('searching');
      setWaitTime(0);
      timerRef.current = setInterval(() => {
        setWaitTime((prev) => prev + 1);
      }, 1000);
    },
    [socket]
  );

  const leaveQueue = useCallback(() => {
    if (!socket) return;
    socket.emit('leaveMatchmaking');
    setStatus('idle');
    setOpponent(null);
    setRoomId(null);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [socket]);

  useEffect(() => {
    if (!socket) return;

    const onMatchFound = (data: {
      roomId: string;
      opponent: MatchmakingOpponent;
    }) => {
      setStatus('found');
      setOpponent(data.opponent);
      setRoomId(data.roomId);
      playMatchFoundSound();
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };

    const onMatchmakingUpdate = (data: {
      queueSize: number;
      eloRange: number;
    }) => {
      setQueueSize(data.queueSize);
      setEloRange(data.eloRange);
    };

    const onMatchmakingTimeout = () => {
      setStatus('timeout');
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };

    socket.on('matchFound', onMatchFound);
    socket.on('matchmakingUpdate', onMatchmakingUpdate);
    socket.on('matchmakingTimeout', onMatchmakingTimeout);

    return () => {
      socket.off('matchFound', onMatchFound);
      socket.off('matchmakingUpdate', onMatchmakingUpdate);
      socket.off('matchmakingTimeout', onMatchmakingTimeout);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [socket, playMatchFoundSound]);

  return {
    status,
    opponent,
    waitTime,
    queueSize,
    eloRange,
    roomId,
    joinQueue,
    leaveQueue,
  };
}
