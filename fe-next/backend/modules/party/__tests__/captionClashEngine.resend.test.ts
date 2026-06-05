vi.mock('../../../utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  __esModule: true,
}));

import { vi, describe, it, expect, afterEach } from 'vitest';
import {
  initCaptionClash,
  startCaptionRound,
  resendCaptionState,
  cleanupCaptionClash,
} from '../captionClashEngine';

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

const ROOM = 'RESEND1';
const PLAYERS = new Map([
  ['socket1', 'Alice'],
  ['socket2', 'Bob'],
  ['socket3', 'Charlie'],
]);

describe('resendCaptionState — fixes the round-1 "Starting..." race', () => {
  afterEach(() => {
    cleanupCaptionClash(ROOM);
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('re-emits the current image to a SINGLE late socket during the writing phase', () => {
    vi.useFakeTimers();
    const io = createMockIO();
    initCaptionClash(ROOM, PLAYERS, 5);
    startCaptionRound(io as never, ROOM); // writing phase, image set + broadcast to room

    const late = 'lateJoinerSocket';
    resendCaptionState(io as never, ROOM, late);

    const toLate = io.getEmittedTo(late).filter((e) => e.event === 'party:caption:imageReady');
    expect(toLate).toHaveLength(1);
    const payload = toLate[0].data as { round: number; imageUrl: string; totalRounds: number };
    expect(payload.round).toBe(1);
    expect(payload.totalRounds).toBe(5);
    expect(payload.imageUrl).toBeTruthy();
  });

  it('does nothing when there is no active game', () => {
    const io = createMockIO();
    resendCaptionState(io as never, 'NO_SUCH_ROOM', 'sock');
    expect(io.emitted).toHaveLength(0);
  });

  it('does not resend an image before any round has started (lobby)', () => {
    const io = createMockIO();
    initCaptionClash(ROOM, PLAYERS, 5); // no startCaptionRound yet
    resendCaptionState(io as never, ROOM, 'sock');
    expect(io.getEmittedTo('sock').filter((e) => e.event === 'party:caption:imageReady')).toHaveLength(0);
  });
});
