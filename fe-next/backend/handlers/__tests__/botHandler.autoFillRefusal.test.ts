import { vi, type Mock } from 'vitest';
import { registerBotHandlers } from '../botHandler';
import { getGame, getGameBySocketId } from '../../modules/gameStateManager';
import * as botManager from '../../modules/botManager';
import { isInProgress } from '../../utils/gameStateMachine';
import { checkRateLimit } from '../../utils/rateLimiter';
import { emitError } from '../../utils/errorHandler';

vi.mock('../../utils/logger', () => ({ default: { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock('../../modules/gameStateManager');
vi.mock('../../modules/botManager');
vi.mock('../../utils/socketHelpers', () => ({ broadcastToRoom: vi.fn(), broadcastActiveRooms: vi.fn(), getGameRoom: (c: string) => `game:${c}` }));
vi.mock('../../utils/errorHandler', () => ({ emitError: vi.fn(), ErrorCodes: {} }));
vi.mock('../../utils/rateLimiter', () => ({ checkRateLimit: vi.fn().mockReturnValue(true) }));
vi.mock('../../utils/timerManager', () => ({ clearGameTimer: vi.fn() }));
vi.mock('../../utils/socketValidation', () => ({
  validatePayload: vi.fn((_s: unknown, d: unknown) => ({ success: true, data: d })),
  addBotSchema: {},
  removeBotSchema: {},
}));
vi.mock('../../utils/gameStateMachine');
vi.mock('@/shared/constants/gameConstants', () => ({ MAX_PLAYERS_PER_ROOM: 4, MAX_BOTS_PER_ROOM: 4 }));

function fill() {
  const handlers: Record<string, (d: unknown) => void> = {};
  const socket = { id: 'socket-host', on: vi.fn((e: string, h: (d: unknown) => void) => { handlers[e] = h; }), emit: vi.fn() };
  registerBotHandlers({ to: () => ({ emit: vi.fn() }) } as never, socket as never);
  handlers.setAutoFill({ enabled: true, targetCount: 3 });
  return socket.emit as Mock;
}

const refusal = (emit: Mock) => {
  const calls = emit.mock.calls.filter(([e]) => e === 'autoFillRefused');
  expect(calls.length).toBeLessThanOrEqual(1);
  if (calls.length) {
    expect(emitError, 'a refused fill must send one signal, not a generic error too').not.toHaveBeenCalled();
    expect(emit.mock.calls.some(([e]) => e === 'rateLimited' || e === 'autoFillComplete')).toBe(false);
  }
  return calls[0]?.[1];
};
const room = (over: Record<string, unknown> = {}) => ({ gameCode: 'G1', hostSocketId: 'socket-host', gameState: 'waiting', language: 'en', isClassroom: true, users: { Host: { isHost: true } }, ...over });

describe('botHandler — a practice-bots request that cannot be served is answered', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (checkRateLimit as Mock).mockReturnValue(true);
    (isInProgress as Mock).mockReturnValue(false);
    (getGameBySocketId as Mock).mockReturnValue('G1');
    (getGame as Mock).mockReturnValue(room());
    (botManager.addBot as Mock).mockImplementation(() => ({ id: `b${Math.random()}`, username: `Bot ${Math.random()}`, avatar: {} }));
  });

  it('Given a flood of taps, When the request is rate limited, Then the socket hears rate_limited', () => {
    (checkRateLimit as Mock).mockReturnValue(false);
    expect(refusal(fill())).toEqual({ reason: 'rate_limited' });
  });

  it('Given a socket the server no longer maps to a room, When it asks for bots, Then it hears not_in_room', () => {
    (getGameBySocketId as Mock).mockReturnValue(undefined);
    expect(refusal(fill())).toEqual({ reason: 'not_in_room' });
  });

  it('Given a room that is gone, When the host asks for bots, Then it hears room_gone', () => {
    (getGame as Mock).mockReturnValue(undefined);
    expect(refusal(fill())).toEqual({ reason: 'room_gone' });
  });

  it('Given a socket that is not the recognised host, When it asks for bots, Then it hears not_host', () => {
    (getGame as Mock).mockReturnValue(room({ hostSocketId: 'other' }));
    expect(refusal(fill())).toEqual({ reason: 'not_host' });
  });

  it('Given a round already running, When the host asks for bots, Then it hears in_progress', () => {
    (isInProgress as Mock).mockReturnValue(true);
    expect(refusal(fill())).toEqual({ reason: 'in_progress' });
  });

  it('Given no free seat for a bot, When the host asks for bots, Then it hears room_full', () => {
    (getGame as Mock).mockReturnValue(room({ isClassroom: false, users: { Host: { isHost: true }, A: {}, B: {}, C: {} } }));
    expect(refusal(fill())).toEqual({ reason: 'room_full' });
  });

  it('Given practice bots left from an earlier practice run, When the host asks again, Then it hears they are already seated, not a refusal', () => {
    (getGame as Mock).mockReturnValue(room({ users: { Host: { isHost: true }, B1: { isBot: true }, B2: { isBot: true }, Ms: { isPractice: true } } }));
    const emit = fill();
    expect(refusal(emit)).toBeUndefined();
    expect(emit).toHaveBeenCalledWith('autoFillComplete', { botsAdded: 0, alreadySeated: true });
  });

  it('Given real students already filling the classroom, When the teacher peeks with bots, Then it is refused as students_present and nothing starts', () => {
    (getGame as Mock).mockReturnValue(room({ users: { Host: { isHost: true }, Ana: {}, Ben: {}, Cy: {} } }));
    const emit = fill();
    expect(refusal(emit)).toEqual({ reason: 'students_present' });
    expect(botManager.addBot).not.toHaveBeenCalled();
  });

  it('Given leftover practice bots beside a real student, When the teacher peeks with bots, Then it is refused as students_present', () => {
    (getGame as Mock).mockReturnValue(room({ users: { Host: { isHost: true }, B1: { isBot: true }, B2: { isBot: true }, Ana: {} } }));
    expect(refusal(fill())).toEqual({ reason: 'students_present' });
  });

  it('Given a public room whose humans already meet the target, When it auto-fills, Then it just reports nothing added', () => {
    (getGame as Mock).mockReturnValue(room({ isClassroom: false, users: { Host: { isHost: true }, Ana: {}, Ben: {} } }));
    const emit = fill();
    expect(refusal(emit)).toBeUndefined();
    expect(emit).toHaveBeenCalledWith('autoFillComplete', { botsAdded: 0 });
  });

  it('Given an empty lobby, When the host asks for bots, Then bots are seated and nothing is refused', () => {
    const emit = fill();
    expect(refusal(emit)).toBeUndefined();
    expect(emit).toHaveBeenCalledWith('autoFillComplete', expect.objectContaining({ botsAdded: 2 }));
  });
});
