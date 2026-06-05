vi.mock('../../../utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  __esModule: true,
}));

import { vi, describe, it, expect, afterEach } from 'vitest';
import {
  initPixelClash,
  startPixelRound,
  resendPixelState,
  getPixelGameState,
  cleanupPixelClash,
} from '../pixelClashEngine';

function createMockIO() {
  const emitted: Array<{ event: string; data: unknown; room?: string }> = [];
  const toRooms = new Map<string, typeof emitted>();
  return {
    to: vi.fn((room: string) => ({
      emit: vi.fn((event: string, data: unknown) => {
        emitted.push({ event, data, room });
        if (!toRooms.has(room)) toRooms.set(room, []);
        toRooms.get(room)!.push({ event, data, room });
      }),
    })),
    emitted,
    getEmittedTo: (room: string) => toRooms.get(room) || [],
  };
}

const ROOM = 'PXRS1';
const PLAYERS = new Map([
  ['s1', 'Alice'],
  ['s2', 'Bob'],
  ['s3', 'Charlie'],
]);

describe('resendPixelState (showdown) — fixes mount-timing stall', () => {
  afterEach(() => {
    cleanupPixelClash(ROOM);
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('replays phaseUpdate(showdown-draw) to a single socket during the draw phase', () => {
    vi.useFakeTimers();
    const io = createMockIO();
    initPixelClash(ROOM, PLAYERS, 'showdown', 3);
    startPixelRound(io as never, ROOM); // enters showdown-draw + broadcasts phaseUpdate

    resendPixelState(io as never, ROOM, 'lateSock');

    const toLate = io.getEmittedTo('lateSock').filter((e) => e.event === 'party:pixel:phaseUpdate');
    expect(toLate).toHaveLength(1);
    const p = toLate[0].data as { phase: string; prompt: string };
    expect(p.phase).toBe('showdown-draw');
    expect(typeof p.prompt).toBe('string');
  });

  it('replays showdownCanvases to a single socket during the vote phase', () => {
    vi.useFakeTimers();
    const io = createMockIO();
    initPixelClash(ROOM, PLAYERS, 'showdown', 3);
    startPixelRound(io as never, ROOM);
    const game = getPixelGameState(ROOM)!;
    const round = game.rounds[game.rounds.length - 1];
    round.phase = 'showdown-vote';
    round.canvases = new Map([['s1', []], ['s2', []]]) as never;

    resendPixelState(io as never, ROOM, 'lateSock');

    const toLate = io.getEmittedTo('lateSock').filter((e) => e.event === 'party:pixel:showdownCanvases');
    expect(toLate).toHaveLength(1);
    expect((toLate[0].data as { canvases: unknown[] }).canvases.length).toBe(2);
  });

  it('does nothing with no active game', () => {
    const io = createMockIO();
    resendPixelState(io as never, 'NOPE', 'sock');
    expect(io.emitted).toHaveLength(0);
  });
});
