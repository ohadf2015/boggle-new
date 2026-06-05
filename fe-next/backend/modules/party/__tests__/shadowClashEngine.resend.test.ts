vi.mock('../../../utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  __esModule: true,
}));

import { vi, describe, it, expect, afterEach } from 'vitest';
import {
  initShadowClash,
  startShadowClash,
  resendShadowState,
  getShadowGameState,
  cleanupShadowClash,
} from '../shadowClashEngine';

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

const ROOM = 'SHRS1';
// 5 players so role assignment includes a seer (2 shadow, 1 seer, 2 citizen).
const PLAYERS = new Map([
  ['s1', 'Alice'],
  ['s2', 'Bob'],
  ['s3', 'Charlie'],
  ['s4', 'Dana'],
  ['s5', 'Eve'],
]);

describe('resendShadowState — fixes role-card mount-timing stall', () => {
  afterEach(() => {
    cleanupShadowClash(ROOM);
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('always replays the private roleAssigned to a single socket while the game is live', () => {
    vi.useFakeTimers();
    const io = createMockIO();
    initShadowClash(ROOM, PLAYERS, 'standard', 4);
    startShadowClash(io as never, ROOM); // assigns roles + emits the initial roleAssigned

    const io2 = createMockIO(); // fresh emitter so we measure only the resend
    resendShadowState(io2 as never, ROOM, 's1');

    const toS1 = io2.getEmittedTo('s1').filter((e) => e.event === 'party:shadow:roleAssigned');
    expect(toS1).toHaveLength(1);
    const data = toS1[0].data as { role: string; team: string };
    expect(['shadow', 'seer', 'medic', 'citizen']).toContain(data.role);
    expect(['evil', 'good']).toContain(data.team);
  });

  it('replays roleAssigned BEFORE the night prompt (order matters for the phone)', () => {
    vi.useFakeTimers();
    const io = createMockIO();
    initShadowClash(ROOM, PLAYERS, 'standard', 4);
    startShadowClash(io as never, ROOM);
    const game = getShadowGameState(ROOM)!;
    game.phase = 'night';

    const io2 = createMockIO();
    resendShadowState(io2 as never, ROOM, 's1');

    const events = io2.getEmittedTo('s1').map((e) => e.event);
    const roleIdx = events.indexOf('party:shadow:roleAssigned');
    const nightIdx = events.indexOf('party:shadow:nightAction');
    expect(roleIdx).toBeGreaterThanOrEqual(0);
    expect(nightIdx).toBeGreaterThan(roleIdx); // role first, then prompt
  });

  it('does nothing for a socket that has no role (not a participant)', () => {
    vi.useFakeTimers();
    const io = createMockIO();
    initShadowClash(ROOM, PLAYERS, 'standard', 4);
    startShadowClash(io as never, ROOM);

    const io2 = createMockIO();
    resendShadowState(io2 as never, ROOM, 'stranger');

    expect(io2.getEmittedTo('stranger')).toHaveLength(0);
  });
});
