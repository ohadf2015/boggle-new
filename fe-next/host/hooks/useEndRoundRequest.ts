import { useCallback, useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';

export const END_ROUND_TIMEOUT_MS = 6000;

export type EndRoundStatus = 'idle' | 'pending' | 'rejected' | 'rateLimited' | 'timeout' | 'offline';

export interface EndRoundRequest {
  status: EndRoundStatus;
  request: () => void;
  reset: () => void;
  reconnect: () => void;
}

/**
 * The teacher's "End this round": the same `endRoundNow` the live controls send, which the server
 * ends through the timer-end path. Done only when the round actually stops running here.
 */
export function useEndRoundRequest(args: {
  socket: Socket | null | undefined;
  roundRunning: boolean;
  onEnded: () => void;
  reconnect: () => void;
}): EndRoundRequest {
  const { socket, roundRunning, onEnded, reconnect } = args;
  const [status, setStatus] = useState<EndRoundStatus>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ended = useRef(onEnded);
  useEffect(() => {
    ended.current = onEnded;
  }, [onEnded]);

  const clear = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  const settle = useCallback((next: EndRoundStatus) => {
    clear();
    setStatus(next);
  }, [clear]);

  const request = useCallback(() => {
    // A socket.io emit while disconnected is buffered and replayed later: never queue an end.
    if (!socket?.connected) {
      settle('offline');
      return;
    }
    clear();
    socket.emit('endRoundNow');
    setStatus('pending');
    timer.current = setTimeout(() => settle('timeout'), END_ROUND_TIMEOUT_MS);
  }, [socket, clear, settle]);

  const reset = useCallback(() => settle('idle'), [settle]);

  useEffect(() => {
    if (status === 'pending' && !roundRunning) {
      settle('idle');
      ended.current();
    }
  }, [status, roundRunning, settle]);

  useEffect(() => {
    if (!socket) return;
    const onRejected = (data?: { action?: string }) => {
      if (data?.action === 'endRoundNow') setStatus((s) => (s === 'pending' ? (clear(), 'rejected') : s));
    };
    const onRateLimited = () => setStatus((s) => (s === 'pending' ? (clear(), 'rateLimited') : s));
    const onDisconnect = () => setStatus((s) => (s === 'pending' ? (clear(), 'offline') : s));
    const onConnect = () => setStatus((s) => (s === 'offline' ? 'idle' : s));
    socket.on('teacherControlRejected', onRejected);
    socket.on('rateLimited', onRateLimited);
    socket.on('disconnect', onDisconnect);
    socket.on('connect', onConnect);
    return () => {
      socket.off('teacherControlRejected', onRejected);
      socket.off('rateLimited', onRateLimited);
      socket.off('disconnect', onDisconnect);
      socket.off('connect', onConnect);
    };
  }, [socket, clear]);

  useEffect(() => clear, [clear]);

  return { status, request, reset, reconnect };
}
