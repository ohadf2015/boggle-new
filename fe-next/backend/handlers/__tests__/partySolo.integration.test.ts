import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { registerPartyHandlers, partyRooms } from '../partyHandler';
import { getCaptionGameState } from '../../modules/party/captionClashEngine';
import { getShadowGameState } from '../../modules/party/shadowClashEngine';

// Real engines + real bot driver + real handler. Only the socket layer and the
// feature-flag/logger side-effects are mocked. This proves the solo loop
// actually advances with server-driven bots — the integration the unit tests
// (pure deciders / mocked dispatch) cannot cover.
vi.mock('../../utils/featureFlags', () => ({ canAccessFeature: vi.fn(async () => true) }));
vi.mock('../../utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

function createMockSocket(id = 'host') {
  const handlers: Record<string, (...a: unknown[]) => unknown> = {};
  const socket = {
    id,
    data: {},
    handshake: { auth: {} },
    on: vi.fn((e: string, h: (...a: unknown[]) => unknown) => { handlers[e] = h; }),
    emit: vi.fn(),
    join: vi.fn(),
    leave: vi.fn(),
  } as never;
  return { socket, handlers };
}
function createMockIo() {
  const emit = vi.fn();
  const to = vi.fn(() => ({ emit }));
  return { io: { to, in: vi.fn(() => ({ socketsLeave: vi.fn() })) } as never, emit };
}

describe('party solo integration (real engines + bot driver)', () => {
  beforeEach(() => {
    partyRooms.clear();
    process.env.NODE_ENV = 'test';
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('caption-clash: bots auto-submit and the writing round advances on its own', async () => {
    const { socket, handlers } = createMockSocket('host');
    const { io } = createMockIo();
    registerPartyHandlers(io, socket);

    await handlers['party:create']({ gameId: 'caption-clash', roomName: 'Solo', username: 'Host', avatar: {} });
    handlers['party:addBots'](); // fills to 4 non-host bots
    handlers['party:startGame']();

    const room = Array.from(partyRooms.values())[0];
    const game = getCaptionGameState(room.roomCode)!;
    expect(game).toBeDefined();
    // Host (TV) is excluded; only the 4 bots are participants.
    expect(game.playerUsernames.size).toBe(4);

    // Let the bot driver think + act (delay window 2.5–5.5s, tick 1.2s).
    await vi.advanceTimersByTimeAsync(9000);

    const round = game.rounds[game.rounds.length - 1];
    // All 4 bots submitted, so the engine early-advanced past writing.
    expect(round.submissions.size).toBe(4);
    expect(['lineup', 'voting', 'crown']).toContain(round.phase);
  });

  it('shadow-clash: bots take night actions and the game reaches a verdict', async () => {
    const { socket, handlers } = createMockSocket('host');
    const { io } = createMockIo();
    registerPartyHandlers(io, socket);

    await handlers['party:create']({ gameId: 'shadow-clash', roomName: 'Solo', username: 'Host', avatar: {} });
    handlers['party:addBots'](); // fills to 6 (avoids night-1 evil sweep)
    handlers['party:startGame']();

    const room = Array.from(partyRooms.values())[0];
    const game = getShadowGameState(room.roomCode)!;
    expect(game.playerUsernames.size).toBe(6);

    // Dealing (5s) -> night (bots act) -> dawn -> ... advance generously.
    await vi.advanceTimersByTimeAsync(20000);

    // The night resolved (someone acted) — either a player was eliminated or the
    // game moved beyond the first night.
    const movedOn = game.phase !== 'dealing' && game.phase !== 'night';
    expect(movedOn).toBe(true);
  });
});
