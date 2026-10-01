import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWordcraftLive, type WordcraftLiveSocket } from '../useWordcraftLive';
import type { WordcraftLiveSnapshot } from '@/shared/types/wordcraftLive';

function mockSocket() {
  const handlers: Record<string, (p: unknown) => void> = {};
  const emits: { event: string; payload: unknown }[] = [];
  const socket: WordcraftLiveSocket = {
    emit: (event, payload) => emits.push({ event, payload }),
    on: (event, fn) => { handlers[event] = fn; },
    off: (event) => { delete handlers[event]; },
  };
  return { socket, emits, trigger: (e: string, p: unknown) => act(() => handlers[e]?.(p)) };
}

const SNAPSHOT: WordcraftLiveSnapshot = {
  gameCode: 'CRAFT1',
  boardSize: 9,
  rack: [
    { id: 't-1', letter: 'C', value: 3, isBlank: false },
    { id: 't-2', letter: 'A', value: 1, isBlank: false },
    { id: 't-3', letter: 'T', value: 1, isBlank: false },
  ],
  cells: [],
  botScore: 0,
  myScore: 0,
  moves: 0,
  bagCount: 40,
  targets: [{ word: 'CAT', built: false }],
};

const WITH_TILE: WordcraftLiveSnapshot = { ...SNAPSHOT, cells: [{ row: 4, col: 4, letter: 'O', by: 'bot' } as WordcraftLiveSnapshot['cells'][number]] };

function setup(snapshot = SNAPSHOT) {
  const m = mockSocket();
  const hook = renderHook(() => useWordcraftLive({ socket: m.socket }));
  m.trigger('wordcraft:state', snapshot);
  return { m, result: hook.result };
}

describe('useWordcraftLive - the first move works without a board tap', () => {
  it('Given an empty board, Then the hint says to tap letters', () => {
    const { result } = setup();
    expect(result.current.hint).toBe('first');
  });

  it('Given one letter on an empty board, Then it asks for one more instead of silently disabling PLACE', () => {
    const { result } = setup();
    act(() => result.current.tapRackTile('t-1'));
    expect(result.current.hint).toBe('more');
    expect(result.current.canSubmit).toBe(false);
  });

  it('Given a word on an empty board and no anchor, Then it is centred on the middle square and PLACE works', () => {
    const { m, result } = setup();
    act(() => result.current.tapRackTile('t-1'));
    act(() => result.current.tapRackTile('t-2'));
    act(() => result.current.tapRackTile('t-3'));
    expect(result.current.autoCentered).toBe(true);
    expect(result.current.placements?.map((p) => [p.row, p.col])).toEqual([[4, 3], [4, 4], [4, 5]]);
    expect(result.current.canSubmit).toBe(true);
    expect(result.current.hint).toBe('ready');
    act(() => result.current.submit());
    expect(m.emits.some((e) => e.event === 'wordcraft:place')).toBe(true);
  });

  it('Given the student taps a square, Then their choice beats the auto-centre', () => {
    const { result } = setup();
    act(() => result.current.tapRackTile('t-1'));
    act(() => result.current.tapRackTile('t-2'));
    act(() => result.current.setAnchor(0, 0));
    expect(result.current.autoCentered).toBe(false);
    expect(result.current.placements?.[0]).toMatchObject({ row: 0, col: 0 });
  });

  it('Given tiles already on the board, Then it never guesses: it asks for a square', () => {
    const { result } = setup(WITH_TILE);
    act(() => result.current.tapRackTile('t-1'));
    act(() => result.current.tapRackTile('t-2'));
    expect(result.current.autoCentered).toBe(false);
    expect(result.current.canSubmit).toBe(false);
    expect(result.current.hint).toBe('anchor');
  });

  it('When a word is accepted, Then the score pops for the student', () => {
    const { m, result } = setup();
    m.trigger('wordcraft:placeResult', { accepted: true, score: 14, words: [{ word: 'CAT', score: 14 }] });
    expect(result.current.lastPlaced).toMatchObject({ score: 14, word: 'CAT' });
  });
});
