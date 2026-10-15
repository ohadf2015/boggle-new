/** The boss roster is enforced server-side: the stored boss is the one the teacher's plan allows. */
import { vi, type Mock, type MockInstance } from 'vitest';
import type { Server, Socket } from 'socket.io';
import { registerClassroomGameHandlers } from '../classroomGameHandler';
import * as classroomGameManager from '../../modules/classroomGameManager';
import * as gameStateManager from '../../modules/gameStateManager';
import * as classroomMembership from '../../modules/supabase/classroomMembership';

// Mock the modules
const { mockResolveBoss } = vi.hoisted(() => ({ mockResolveBoss: vi.fn() }));
vi.mock('../../services/classroomBoss/bossEntitlement', () => ({ resolveBossForTeacher: mockResolveBoss }));
vi.mock('../../services/classroomBoss/bossEntitlement.js', () => ({ resolveBossForTeacher: mockResolveBoss }));
vi.mock('../../modules/classroomGameManager');
vi.mock('../../modules/gameStateManager', () => ({
  bindSocketToGame: vi.fn(),
  unbindSocketFromGame: vi.fn(),
}));
vi.mock('../../modules/supabase/classroomMembership', () => ({
  isClassroomTeacher: vi.fn(),
  isClassroomStudent: vi.fn(),
  getClassroomRole: vi.fn(),
  // Three-state forms: the handler uses these so a server fault ("unavailable")
  // is reported as a server error instead of accusing the teacher.
  resolveClassroomTeacher: vi.fn(),
  resolveClassroomStudent: vi.fn(),
  resolveClassroomRole: vi.fn(),
  // Resolved server-side so the student banner can name the CLASSROOM, not
  // just the lesson — a lesson may be reused across several classes.
  resolveClassroomName: vi.fn(async () => 'Mr Smith\'s Class'),
}));
// Mock rate limiter - always allow
vi.mock('../../utils/rateLimiter', () => ({ checkRateLimit: vi.fn(() => true), default: {
  checkRateLimit: vi.fn(() => true),
} }));
vi.mock('../../utils/socketValidation', () => {
  const { z } = require('zod');
  return {
    validatePayload: vi.fn((schema: unknown, data: unknown) => ({
      success: true,
      data,
    })),
    gameCodeSchema: z.string(),
    usernameSchema: z.string(),
  };
});
vi.mock('../../utils/logger', () => ({ default: {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
} }));

describe('createClassroomGame — boss roster', () => {
  let mockSocket: any;
  let mockIo: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSocket = {
      id: 'socket-123',
      on: vi.fn(),
      emit: vi.fn(),
      join: vi.fn(),
      handshake: {
        auth: {
          authUserId: '00000000-0000-4000-8000-000000000001',
        },
      },
    };

    mockIo = {
      to: vi.fn().mockReturnThis(),
      emit: vi.fn(),
    };

    // Default: allow access for existing happy-path tests.
    // Individual tests override these for rejection scenarios.
    (classroomMembership.isClassroomTeacher as Mock).mockResolvedValue(true);
    (classroomMembership.isClassroomStudent as Mock).mockResolvedValue(true);
    (classroomMembership.resolveClassroomRole as Mock).mockResolvedValue({ status: 'ok', role: 'student' });
    (classroomMembership.resolveClassroomTeacher as Mock).mockResolvedValue('yes');
    (classroomMembership.resolveClassroomStudent as Mock).mockResolvedValue('yes');
    (classroomMembership.resolveClassroomRole as Mock).mockResolvedValue({ status: 'ok', role: 'student' });
  });

  it('stores the boss the server allows for this teacher, not the one the client asked for', async () => {
    (classroomGameManager.createClassroomGame as Mock).mockResolvedValue(undefined);
    mockResolveBoss.mockResolvedValue('lexiconDragon');
    registerClassroomGameHandlers(mockIo, mockSocket);
    const createHandler = mockSocket.on.mock.calls.find((call: any[]) => call[0] === 'createClassroomGame')[1];
    await createHandler({
      gameCode: 'BOS125',
      classroomId: '00000000-0000-4000-8000-000000000002',
      teacherId: '00000000-0000-4000-8000-000000000001',
      teacherName: 'Mr Smith',
      lessonIds: ['00000000-0000-4000-8000-000000000003'],
      settings: { gameMode: 'classic', classroomBossId: 'spellingBee' },
    });
    expect(mockResolveBoss).toHaveBeenCalledWith('00000000-0000-4000-8000-000000000001', 'spellingBee');
    const settings = (classroomGameManager.createClassroomGame as Mock).mock.calls.at(-1)![0].settings;
    expect(settings.classroomBossId).toBe('lexiconDragon');
  });

});
