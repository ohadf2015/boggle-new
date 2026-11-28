'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSocket } from '@/utils/SocketContext';
import type { PartyGameId } from '@/lib/holidays/arcade/party/games';
import type { PartySeat } from './scenes/feed';

export type PartyPhase = 'connecting' | 'lobby' | 'playing' | 'podium' | 'missing' | 'full';

export interface PodiumRow extends PartySeat {
  score: number;
  place: number;
}

export interface PartyView {
  code: string | null;
  phase: PartyPhase;
  players: (PartySeat & { connected: boolean })[];
  podium: PodiumRow[];
  scores: Record<string, number>;
}

const read = <T,>(key: string): T | null => {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
};

const write = (key: string, value: unknown) => {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // private mode: a reload starts a new seat, nothing else breaks
  }
};

const initial: PartyView = { code: null, phase: 'connecting', players: [], podium: [], scores: {} };

function useShared() {
  const { socket, isConnected } = useSocket();
  const [view, setView] = useState<PartyView>(initial);
  const events = useRef<Record<string, unknown>[]>([]);

  useEffect(() => {
    if (!socket) return;
    const onRoster = (d: { phase: PartyPhase; players: PartyView['players'] }) => setView((v) => ({ ...v, players: d.players, phase: v.phase === 'connecting' ? d.phase : v.phase }));
    const onGo = (d: { players: PartyView['players'] }) => setView((v) => ({ ...v, phase: 'playing', players: d.players, podium: [], scores: {} }));
    const onEnd = (d: { podium: PodiumRow[] }) => setView((v) => ({ ...v, phase: 'podium', podium: d.podium }));
    const onScores = (d: Record<string, number>) => setView((v) => ({ ...v, scores: d }));
    const onEvents = (d: Record<string, unknown>[]) => {
      events.current.push(...d);
      if (events.current.length > 200) events.current.splice(0, events.current.length - 200);
    };
    socket.on('party:roster', onRoster);
    socket.on('party:go', onGo);
    socket.on('party:end', onEnd);
    socket.on('party:scores', onScores);
    socket.on('party:events', onEvents);
    return () => {
      socket.off('party:roster', onRoster);
      socket.off('party:go', onGo);
      socket.off('party:end', onEnd);
      socket.off('party:scores', onScores);
      socket.off('party:events', onEvents);
    };
  }, [socket]);

  return { socket, isConnected, view, setView, events };
}

export function useTvParty(game: PartyGameId) {
  const { socket, isConnected, view, setView, events } = useShared();
  const snap = useRef<unknown>(null);
  const key = `party-host:${game}`;

  useEffect(() => {
    if (!socket || !isConnected) return;
    const saved = read<{ code: string; hostToken: string }>(key);
    socket.emit('party:host', { game, ...(saved ?? {}) }, (r: { ok: boolean; code: string; hostToken: string; phase: PartyPhase; players: PartyView['players'] }) => {
      if (!r?.ok) return;
      write(key, { code: r.code, hostToken: r.hostToken });
      setView((v) => ({ ...v, code: r.code, phase: r.phase, players: r.players }));
    });
  }, [socket, isConnected, game, key, setView]);

  useEffect(() => {
    if (!socket) return;
    const onState = (d: unknown) => (snap.current = d);
    socket.on('party:state', onState);
    return () => {
      socket.off('party:state', onState);
    };
  }, [socket]);

  const start = useCallback(() => {
    const saved = read<{ hostToken: string }>(key);
    socket?.emit('party:start', { hostToken: saved?.hostToken });
  }, [socket, key]);

  return { view, start, snap, events };
}

interface Seat {
  playerId: string;
  token: string;
  name: string;
  color: string;
  game: PartyGameId;
}

export function usePhoneParty(code: string) {
  const { socket, isConnected, view, setView } = useShared();
  const key = `party-seat:${code}`;
  const [seat, setSeat] = useState<Seat | null>(() => (typeof window === 'undefined' ? null : read<Seat>(key)));
  const last = useRef(0);
  const seatRef = useRef(seat);
  seatRef.current = seat;

  const join = useCallback(
    (name: string, prior: Seat | null = null) => {
      if (!socket) return;
      socket.emit('party:join', { code, name, playerId: prior?.playerId, token: prior?.token }, (r: { ok: boolean; reason?: string; game: PartyGameId; phase: PartyPhase; player: { id: string; name: string; color: string }; token: string }) => {
        if (!r?.ok) {
          setView((v) => ({ ...v, phase: r?.reason === 'full' ? 'full' : 'missing' }));
          return;
        }
        const next = { playerId: r.player.id, token: r.token, name: r.player.name, color: r.player.color, game: r.game };
        write(key, next);
        setSeat(next);
        setView((v) => ({ ...v, code, phase: r.phase }));
      });
    },
    [socket, code, key, setView],
  );

  useEffect(() => {
    const saved = seatRef.current;
    if (isConnected && saved) join(saved.name, saved);
  }, [isConnected, join]);

  const input = useCallback(
    (data: Record<string, number | boolean>, force = false) => {
      const now = performance.now();
      if (!force && now - last.current < 50) return;
      last.current = now;
      socket?.emit('party:input', data);
    },
    [socket],
  );

  const again = useCallback(() => socket?.emit('party:start', {}), [socket]);

  return { view, seat, join, input, again, connected: isConnected };
}
