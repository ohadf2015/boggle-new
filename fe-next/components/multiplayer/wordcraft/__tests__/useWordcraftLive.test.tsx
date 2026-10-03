/**
 * useWordcraftLive — the student's live-race brain, mapped socket ↔ UI state.
 *
 * The server is authoritative (board, rack, scores); this hook owns only the
 * placement UX: which rack tiles are staged, where the word starts, which way
 * it runs. A staged word is recomputed into placements client-side, the server
 * re-validates everything — a mismatch just rejects, never corrupts.
 */
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWordcraftLive, type WordcraftLiveSocket } from '../useWordcraftLive';
import type { WordcraftLiveSnapshot } from '@/shared/types/wordcraftLive';
import type { RackTile } from '@/lib/word-craft/types';

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

const RACK: RackTile[] = [
  { id: 't-1', letter: 'C', value: 3, isBlank: false },
  { id: 't-2', letter: 'A', value: 1, isBlank: false },
  { id: 't-3', letter: 'T', value: 1, isBlank: false },
  { id: 't-4', letter: 'E', value: 1, isBlank: false },
];

const SNAPSHOT: WordcraftLiveSnapshot = {
  gameCode: 'CRAFT1',
  boardSize: 9,
  rack: RACK,
  cells: [],
  botScore: 0,
  myScore: 0,
  moves: 0,
  bagCount: 40,
  targets: [
    { word: 'CAT', built: false },
    { word: 'DOG', built: false },
  ],
};

describe('useWordcraftLive', () => {
  it('requests personal state on mount — reconnect and first paint take one path', () => {
    const m = mockSocket();
    renderHook(() => useWordcraftLive({ socket: m.socket }));
    expect(m.emits.some((e) => e.event === 'wordcraft:requestState')).toBe(true);
  });

  it('re-requests when the server broadcasts the race init (mount-before-start race)', () => {
    const m = mockSocket();
    renderHook(() => useWordcraftLive({ socket: m.socket }));
    const before = m.emits.filter((e) => e.event === 'wordcraft:requestState').length;
    m.trigger('wordcraft:init', { gameCode: 'CRAFT1', boardSize: 9, targets: ['CAT'] });
    const after = m.emits.filter((e) => e.event === 'wordcraft:requestState').length;
    expect(after).toBe(before + 1);
  });

  it('applies the snapshot: rack, cells, rival score, targets', () => {
    const m = mockSocket();
    const { result } = renderHook(() => useWordcraftLive({ socket: m.socket }));
    m.trigger('wordcraft:state', SNAPSHOT);
    expect(result.current.snapshot?.rack).toHaveLength(4);
    expect(result.current.snapshot?.botScore).toBe(0);
    expect(result.current.snapshot?.targets).toHaveLength(2);
  });

  it('stages rack tiles in tap order and recalls them', () => {
    const m = mockSocket();
    const { result } = renderHook(() => useWordcraftLive({ socket: m.socket }));
    m.trigger('wordcraft:state', SNAPSHOT);

    act(() => result.current.tapRackTile('t-1'));
    act(() => result.current.tapRackTile('t-2'));
    expect(result.current.stagedIds).toEqual(['t-1', 't-2']);
    expect(result.current.stagedWord).toBe('CA');

    act(() => result.current.recallTile('t-1'));
    expect(result.current.stagedIds).toEqual(['t-2']);
  });

  it('builds placements from staged tiles + anchor + direction and submits them', () => {
    const m = mockSocket();
    const { result } = renderHook(() => useWordcraftLive({ socket: m.socket }));
    m.trigger('wordcraft:state', SNAPSHOT);

    act(() => result.current.tapRackTile('t-1'));
    act(() => result.current.tapRackTile('t-2'));
    act(() => result.current.tapRackTile('t-3'));
    act(() => result.current.setAnchor(4, 2));
    expect(result.current.direction).toBe('across');

    act(() => result.current.submit());
    const place = m.emits.find((e) => e.event === 'wordcraft:place');
    expect(place).toBeDefined();
    expect(place!.payload).toEqual({
      placements: [
        { row: 4, col: 2, letter: 'C', value: 3, isBlank: false, rackTileId: 't-1' },
        { row: 4, col: 3, letter: 'A', value: 1, isBlank: false, rackTileId: 't-2' },
        { row: 4, col: 4, letter: 'T', value: 1, isBlank: false, rackTileId: 't-3' },
      ],
    });
  });

  it('runs the word down instead of across when the direction is toggled', () => {
    const m = mockSocket();
    const { result } = renderHook(() => useWordcraftLive({ socket: m.socket }));
    m.trigger('wordcraft:state', SNAPSHOT);
    act(() => result.current.tapRackTile('t-1'));
    act(() => result.current.setAnchor(1, 1));
    act(() => result.current.toggleDirection());
    act(() => result.current.submit());
    const place = m.emits.find((e) => e.event === 'wordcraft:place');
    expect((place!.payload as { placements: { row: number; col: number }[] }).placements[0]).toEqual(
      expect.objectContaining({ row: 1, col: 1 }),
    );
    expect(result.current.direction).toBe('down');
  });

  it('will not submit without an anchor — the board tap is required', () => {
    const m = mockSocket();
    const { result } = renderHook(() => useWordcraftLive({ socket: m.socket }));
    m.trigger('wordcraft:state', SNAPSHOT);
    act(() => result.current.tapRackTile('t-1'));
    act(() => result.current.submit());
    expect(m.emits.some((e) => e.event === 'wordcraft:place')).toBe(false);
    expect(result.current.canSubmit).toBe(false);
  });

  it('clears the stage on accept and shows the server error on reject', () => {
    const m = mockSocket();
    const { result } = renderHook(() => useWordcraftLive({ socket: m.socket }));
    m.trigger('wordcraft:state', SNAPSHOT);
    act(() => result.current.tapRackTile('t-1'));
    act(() => result.current.setAnchor(4, 2));

    m.trigger('wordcraft:placeResult', { accepted: false, error: 'INVALID_WORD', invalidWord: 'C' });
    expect(result.current.lastError).toBe('INVALID_WORD');
    expect(result.current.stagedIds).toEqual(['t-1']); // tiles stay staged for a retry

    m.trigger('wordcraft:placeResult', { accepted: true, words: [{ word: 'C', score: 3 }], score: 3 });
    expect(result.current.stagedIds).toEqual([]);
    expect(result.current.lastError).toBeNull();
  });

  it('tracks the class activity feed for the race ticker', () => {
    const m = mockSocket();
    const { result } = renderHook(() => useWordcraftLive({ socket: m.socket }));
    m.trigger('wordcraft:activity', {
      username: 'Ben',
      words: [{ word: 'DOG', score: 5 }],
      score: 5,
      bingo: false,
      lessonWord: 'DOG',
    });
    expect(result.current.activity).toHaveLength(1);
    expect(result.current.activity[0].username).toBe('Ben');
  });

  it('blocks staging onto occupied cells: the preview knows the board', () => {
    const m = mockSocket();
    const { result } = renderHook(() => useWordcraftLive({ socket: m.socket }));
    m.trigger('wordcraft:state', {
      ...SNAPSHOT,
      cells: [{ row: 4, col: 2, letter: 'X', value: 8, isBlank: false, by: 'bot' as const }],
    });
    act(() => result.current.tapRackTile('t-1'));
    act(() => result.current.setAnchor(4, 2));
    expect(result.current.canSubmit).toBe(false);
  });
});
