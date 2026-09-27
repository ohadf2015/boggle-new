/**
 * Duel taunt handler — async duels only get interesting when the turn you are
 * waiting on can talk back. A taunt is a 1-of-4 mascot sticker id relayed to the
 * other side of the duel room; it carries no free text, so there is nothing to
 * moderate in a classroom.
 */

import { vi, type Mock } from 'vitest';
import type { Namespace } from 'socket.io';
import type { DuelSocket } from '../types';
import { registerTauntHandlers, DUEL_TAUNT_STICKERS } from '../taunt';

vi.mock('@/backend/utils/logger');

const DUEL_ID = '550e8400-e29b-41d4-a716-446655440042';

describe('duel:taunt handler', () => {
  let mockSocket: Partial<DuelSocket>;
  let mockNamespace: Partial<Namespace>;
  let emitted: Array<{ event: string; data: any }>;
  let roomEmit: Mock;

  function getHandler() {
    registerTauntHandlers(mockNamespace as Namespace, mockSocket as DuelSocket);
    return (mockSocket.on as Mock).mock.calls.find((c) => c[0] === 'duel:taunt')?.[1];
  }

  beforeEach(() => {
    vi.clearAllMocks();
    emitted = [];
    roomEmit = vi.fn();
    mockSocket = {
      id: 'socket-1',
      data: { userId: 'user-1', displayName: 'Maya', classroomIds: ['c-1'] },
      emit: vi.fn((event: string, data: any) => emitted.push({ event, data })),
      to: vi.fn().mockReturnValue({ emit: roomEmit }),
      on: vi.fn(),
    } as any;
    mockNamespace = { to: vi.fn().mockReturnValue({ emit: vi.fn() }) } as any;
  });

  it('exposes exactly four sticker ids', () => {
    expect(DUEL_TAUNT_STICKERS).toHaveLength(4);
  });

  it('relays a valid sticker to the duel room with the sender name', async () => {
    const handler = getHandler();

    await handler({ duelId: DUEL_ID, stickerId: DUEL_TAUNT_STICKERS[0] });

    expect(mockSocket.to).toHaveBeenCalledWith(`duel:${DUEL_ID}`);
    expect(roomEmit).toHaveBeenCalledWith('duel:taunt-received', {
      duelId: DUEL_ID,
      fromId: 'user-1',
      fromName: 'Maya',
      stickerId: DUEL_TAUNT_STICKERS[0],
    });
  });

  it('rejects a sticker id that is not on the allowlist', async () => {
    const handler = getHandler();

    await handler({ duelId: DUEL_ID, stickerId: 'not-a-sticker' });

    expect(roomEmit).not.toHaveBeenCalled();
    expect(emitted.find((e) => e.event === 'duel:error')).toBeDefined();
  });

  it('rejects a malformed duel id', async () => {
    const handler = getHandler();

    await handler({ duelId: 'nope', stickerId: DUEL_TAUNT_STICKERS[1] });

    expect(roomEmit).not.toHaveBeenCalled();
    expect(emitted.find((e) => e.event === 'duel:error')).toBeDefined();
  });

  it('rate-limits a taunt spammer instead of flooding the room', async () => {
    const handler = getHandler();

    for (let i = 0; i < 12; i++) {
      await handler({ duelId: DUEL_ID, stickerId: DUEL_TAUNT_STICKERS[2] });
    }

    expect(roomEmit.mock.calls.length).toBeLessThan(12);
  });
});
