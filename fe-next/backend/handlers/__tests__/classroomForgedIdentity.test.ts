import { vi } from 'vitest';

const { mockGetClassroomGame, mockSetPressure, mockHasPro, mockLog } = vi.hoisted(() => ({
  mockGetClassroomGame: vi.fn(),
  mockSetPressure: vi.fn(),
  mockHasPro: vi.fn(async () => true),
  mockLog: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('../../modules/classroomGameManager', () => ({ getClassroomGame: mockGetClassroomGame }));
vi.mock('../../modules/classroomGameSettings', () => ({ setClassroomPressureSettings: mockSetPressure }));
vi.mock('../../utils/socketHelpers', () => ({ broadcastToRoom: vi.fn(), getGameRoom: (c: string) => `game:${c}` }));
vi.mock('../../utils/rateLimiter', () => ({ checkRateLimit: () => true }));
vi.mock('@/lib/subscriptions', () => ({ checkTeacherSubscription: vi.fn(async () => ({ has_pro: true })) }));
vi.mock('@/lib/education/accessTrialServer', () => ({ teacherHasProAccess: mockHasPro }));
vi.mock('../../utils/logger', () => ({ default: mockLog }));

import { getAuthUserId, classroomIdentityRefusal } from '../classroomSocketAuth';
import { registerClassroomPressureHandlers } from '../classroomPressureHandler';

const TEACHER = '11111111-1111-4111-8111-111111111111';
const GAME = { gameCode: 'ABC123', classroomId: 'c1', teacherId: TEACHER, status: 'waiting', settings: { gameMode: 'classic' }, players: [] };

function socketWith(data: Record<string, unknown>, handshakeAuth: Record<string, unknown> = {}) {
  return { id: 's1', emit: vi.fn(), on: vi.fn(), join: vi.fn(), handshake: { auth: handshakeAuth }, data };
}

async function sendPressure(socket: ReturnType<typeof socketWith>) {
  registerClassroomPressureHandlers({ to: vi.fn(() => ({ emit: vi.fn() })) } as never, socket as never);
  const handler = socket.on.mock.calls.find((c) => c[0] === 'updateClassroomGamePressure')?.[1];
  await handler({ gameCode: 'ABC123', pressure: { timer: 'gentle' } });
}

describe('classroom socket identity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetClassroomGame.mockResolvedValue(JSON.parse(JSON.stringify(GAME)));
    mockSetPressure.mockResolvedValue(true);
  });

  it('Given a socket with no verified user but a handshake authUserId claim, When identity is read, Then the claim is ignored', () => {
    const forged = socketWith({ verifiedUserId: null }, { authUserId: TEACHER });
    expect(getAuthUserId(forged as never)).toBeNull();
  });

  it('Given a verified socket, When identity is read, Then the verified id is returned', () => {
    expect(getAuthUserId(socketWith({ verifiedUserId: TEACHER }) as never)).toBe(TEACHER);
  });

  it("Given a student socket claiming the teacher's id in the handshake, When it changes the pressure dials, Then it is refused with an error and nothing is written", async () => {
    const forged = socketWith({ verifiedUserId: null }, { authUserId: TEACHER });
    await sendPressure(forged);
    expect(mockSetPressure).not.toHaveBeenCalled();
    expect(forged.emit).toHaveBeenCalledWith('classroomGameError', expect.objectContaining({ code: 'AUTH_REQUIRED' }));
    expect(mockLog.warn).toHaveBeenCalled();
  });

  it('Given the real teacher on a verified socket, When she changes the pressure dials, Then they are saved', async () => {
    const teacher = socketWith({ verifiedUserId: TEACHER });
    await sendPressure(teacher);
    expect(mockSetPressure).toHaveBeenCalled();
  });

  it('Given a sign-in token the server could not verify, When the teacher acts, Then the refusal says the check failed, not that she is not the teacher', async () => {
    const unverified = socketWith({ verifiedUserId: null, authUnverified: true });
    await sendPressure(unverified);
    expect(mockSetPressure).not.toHaveBeenCalled();
    expect(unverified.emit).toHaveBeenCalledWith('classroomGameError', expect.objectContaining({ code: 'AUTH_UNVERIFIED' }));
  });

  it('Given a guest socket, When the refusal is built, Then it is AUTH_REQUIRED with a translatable key', () => {
    expect(classroomIdentityRefusal(socketWith({}) as never)).toEqual({ error: 'education.errors.signInRequired', code: 'AUTH_REQUIRED' });
    expect(classroomIdentityRefusal(socketWith({ authUnverified: true }) as never)).toEqual({ error: 'education.errors.signInCheckFailed', code: 'AUTH_UNVERIFIED' });
  });
});
