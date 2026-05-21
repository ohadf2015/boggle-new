'use client';

/**
 * Word Tower — client versus brain. Maps socket events ↔ local UI state for a
 * real-time versus match. Server is authoritative; this optimistically tracks
 * the tile selection and reflects server-pushed tower/standings.
 *
 * Socket is injected (minimal structural type) so this is unit-testable with a
 * mock socket. The visual versus shell wires a real socket in.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { VersusStanding } from './versusMatch';
import type { TowerClientView } from './wordTowerManager';

export interface VersusSocket {
  emit(event: string, payload?: unknown): void;
  on(event: string, fn: (payload: unknown) => void): void;
  off(event: string, fn: (payload: unknown) => void): void;
}

export interface BombHit {
  fromId: string;
  targetId: string;
  removed: number;
  damage: number;
}

export interface VersusUIState {
  you: TowerClientView | null;
  standings: VersusStanding[];
  endsAtMs: number;
  selected: number[];
  lastError: string | null;
  errorKey: number;
  lastBombHit: BombHit | null;
  /** Bumps when YOU are bombed — drives the incoming-bomb FX. */
  bombKey: number;
  resultKey: number;
}

const INITIAL: VersusUIState = {
  you: null,
  standings: [],
  endsAtMs: 0,
  selected: [],
  lastError: null,
  errorKey: 0,
  lastBombHit: null,
  bombKey: 0,
  resultKey: 0,
};

export function currentVersusWord(s: VersusUIState): string {
  if (!s.you) return '';
  return s.you.anchorLetter + s.selected.map((i) => s.you!.tray[i] ?? '').join('');
}

export function useWordTowerVersus(opts: { socket: VersusSocket | null; selfId: string }) {
  const { socket, selfId } = opts;
  const [state, setState] = useState<VersusUIState>(INITIAL);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    if (!socket) return;

    const onSync = (p: unknown) => {
      const d = p as { you?: TowerClientView; standings?: VersusStanding[]; endsAtMs?: number };
      setState((s) => ({
        ...s,
        you: d.you ?? s.you,
        standings: d.standings ?? s.standings,
        endsAtMs: d.endsAtMs ?? s.endsAtMs,
      }));
    };
    const onStandings = (p: unknown) => {
      const d = p as { standings?: VersusStanding[] };
      setState((s) => ({ ...s, standings: d.standings ?? s.standings }));
    };
    const onWordResult = (p: unknown) => {
      const d = p as { accepted: boolean; error?: string; state?: TowerClientView };
      setState((s) =>
        d.accepted
          ? { ...s, you: d.state ?? s.you, selected: [], lastError: null, resultKey: s.resultKey + 1 }
          : { ...s, lastError: d.error ?? 'rejected', errorKey: s.errorKey + 1, selected: [] },
      );
    };
    const onTray = (p: unknown) => {
      const d = p as { state?: TowerClientView };
      setState((s) => ({ ...s, you: d.state ?? s.you, selected: [] }));
    };
    const onBombHit = (p: unknown) => {
      const d = p as BombHit;
      setState((s) => (d.targetId === selfId ? { ...s, lastBombHit: d, bombKey: s.bombKey + 1 } : { ...s, lastBombHit: d }));
    };

    socket.on('towerStateSync', onSync);
    socket.on('towerStandings', onStandings);
    socket.on('towerWordResult', onWordResult);
    socket.on('towerTrayUpdate', onTray);
    socket.on('towerBombHit', onBombHit);
    socket.emit('requestTowerState');

    return () => {
      socket.off('towerStateSync', onSync);
      socket.off('towerStandings', onStandings);
      socket.off('towerWordResult', onWordResult);
      socket.off('towerTrayUpdate', onTray);
      socket.off('towerBombHit', onBombHit);
    };
  }, [socket, selfId]);

  const selectTile = useCallback((i: number) => {
    setState((s) => (s.you && i >= 0 && i < s.you.tray.length && !s.selected.includes(i) ? { ...s, selected: [...s.selected, i] } : s));
  }, []);
  const backspace = useCallback(() => setState((s) => (s.selected.length ? { ...s, selected: s.selected.slice(0, -1) } : s)), []);
  const clear = useCallback(() => setState((s) => ({ ...s, selected: [] })), []);
  const submit = useCallback(() => {
    const w = currentVersusWord(stateRef.current);
    if (w.length >= 3) socket?.emit('submitTowerWord', { word: w });
  }, [socket]);
  const scramble = useCallback(() => socket?.emit('scrambleTower', {}), [socket]);
  const sendBomb = useCallback((targetPlayerId: string) => socket?.emit('sendTowerBomb', { targetPlayerId }), [socket]);

  return { state, word: currentVersusWord(state), selectTile, backspace, clear, submit, scramble, sendBomb };
}
