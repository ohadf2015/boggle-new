import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWordTowerVersus, type VersusSocket } from '../useWordTowerVersus';

function mockSocket() {
  const handlers: Record<string, (p: unknown) => void> = {};
  const emits: { event: string; payload: unknown }[] = [];
  const socket: VersusSocket = {
    emit: (event, payload) => emits.push({ event, payload }),
    on: (event, fn) => { handlers[event] = fn; },
    off: (event) => { delete handlers[event]; },
  };
  return { socket, emits, trigger: (e: string, p: unknown) => act(() => handlers[e]?.(p)) };
}

const youView = { tray: ['A', 'T', 'R', 'E'], anchorLetter: 'C', scramblesLeft: 3, heightM: 10, combo: 0, floors: 4, bombCharge: 0 };

describe('useWordTowerVersus', () => {
  it('requests tower state on mount', () => {
    const m = mockSocket();
    renderHook(() => useWordTowerVersus({ socket: m.socket, selfId: 'me' }));
    expect(m.emits.some((e) => e.event === 'requestTowerState')).toBe(true);
  });

  it('re-requests tower state when the server signals the match is ready', () => {
    const m = mockSocket();
    renderHook(() => useWordTowerVersus({ socket: m.socket, selfId: 'me' }));
    const before = m.emits.filter((e) => e.event === 'requestTowerState').length;
    m.trigger('towerMatchReady', {});
    const after = m.emits.filter((e) => e.event === 'requestTowerState').length;
    expect(after).toBe(before + 1);
  });

  it('applies towerStateSync (own tower + standings)', () => {
    const m = mockSocket();
    const { result } = renderHook(() => useWordTowerVersus({ socket: m.socket, selfId: 'me' }));
    m.trigger('towerStateSync', { you: youView, standings: [{ rank: 1, playerId: 'me', username: 'Me', heightM: 10, floors: 4, biome: 'city', banked: 0, belowMedian: false }], endsAtMs: 999 });
    expect(result.current.state.you?.anchorLetter).toBe('C');
    expect(result.current.state.standings).toHaveLength(1);
    expect(result.current.state.endsAtMs).toBe(999);
  });

  it('builds + submits a word from anchor + selected tray tiles', () => {
    const m = mockSocket();
    const { result } = renderHook(() => useWordTowerVersus({ socket: m.socket, selfId: 'me' }));
    m.trigger('towerStateSync', { you: youView });
    act(() => result.current.selectTile(0)); // A
    act(() => result.current.selectTile(1)); // T
    expect(result.current.word).toBe('CAT');
    act(() => result.current.submit());
    expect(m.emits.find((e) => e.event === 'submitTowerWord')?.payload).toEqual({ word: 'CAT' });
  });

  it('updates own tower + clears selection on accepted result', () => {
    const m = mockSocket();
    const { result } = renderHook(() => useWordTowerVersus({ socket: m.socket, selfId: 'me' }));
    m.trigger('towerStateSync', { you: youView });
    act(() => result.current.selectTile(0));
    m.trigger('towerWordResult', { accepted: true, state: { ...youView, heightM: 13, floors: 5 } });
    expect(result.current.state.you?.heightM).toBe(13);
    expect(result.current.state.selected).toEqual([]);
    expect(result.current.state.resultKey).toBe(1);
  });

  it('records error on rejected result', () => {
    const m = mockSocket();
    const { result } = renderHook(() => useWordTowerVersus({ socket: m.socket, selfId: 'me' }));
    m.trigger('towerWordResult', { accepted: false, error: 'bad_chain' });
    expect(result.current.state.lastError).toBe('bad_chain');
    expect(result.current.state.errorKey).toBe(1);
  });

  it('bumps bombKey only when YOU are the bomb target', () => {
    const m = mockSocket();
    const { result } = renderHook(() => useWordTowerVersus({ socket: m.socket, selfId: 'me' }));
    m.trigger('towerBombHit', { fromId: 'rival', targetId: 'other', removed: 3, damage: 4 });
    expect(result.current.state.bombKey).toBe(0);
    m.trigger('towerBombHit', { fromId: 'rival', targetId: 'me', removed: 3, damage: 4 });
    expect(result.current.state.bombKey).toBe(1);
  });

  it('emits scramble + bomb actions', () => {
    const m = mockSocket();
    const { result } = renderHook(() => useWordTowerVersus({ socket: m.socket, selfId: 'me' }));
    act(() => result.current.scramble());
    act(() => result.current.sendBomb('rival'));
    expect(m.emits.some((e) => e.event === 'scrambleTower')).toBe(true);
    expect(m.emits.find((e) => e.event === 'sendTowerBomb')?.payload).toEqual({ targetPlayerId: 'rival' });
  });
});
