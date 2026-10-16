/** A classroom round is dealt and validated in the lesson/class language, never the teacher's UI locale. */
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
  resolveClassroomLanguage: vi.fn(),
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

describe('createClassroomGame — round language', () => {
  let mockSocket: any;
  let mockIo: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSocket = { id: 'socket-123', on: vi.fn(), emit: vi.fn(), join: vi.fn(), handshake: { auth: { authUserId: '00000000-0000-4000-8000-000000000001' } } };
    mockIo = { to: vi.fn().mockReturnThis(), emit: vi.fn() };
    (classroomMembership.resolveClassroomTeacher as Mock).mockResolvedValue('yes');
    (classroomGameManager.createClassroomGame as Mock).mockResolvedValue(undefined);
    mockResolveBoss.mockResolvedValue(undefined);
  });

  async function create(extra: Record<string, unknown>) {
    registerClassroomGameHandlers(mockIo, mockSocket);
    const createHandler = mockSocket.on.mock.calls.find((call: any[]) => call[0] === 'createClassroomGame')[1];
    await createHandler({
      gameCode: 'LNG123',
      classroomId: '00000000-0000-4000-8000-000000000002',
      teacherId: '00000000-0000-4000-8000-000000000001',
      teacherName: 'Ms Cohen',
      settings: { gameMode: 'classic' },
      ...extra,
    });
    return (classroomGameManager.createClassroomGame as Mock).mock.calls.at(-1)![0];
  }

  it('GIVEN a Hebrew class running an English list WHEN the room is created THEN the record says English', async () => {
    (classroomMembership.resolveClassroomLanguage as Mock).mockResolvedValue('he');
    const record = await create({ language: 'en', vocabularyWords: ['house', 'garden'] });
    expect(record.language).toBe('en');
  });

  it('GIVEN a Hebrew class and no list WHEN the room is created THEN the class language is used', async () => {
    (classroomMembership.resolveClassroomLanguage as Mock).mockResolvedValue('he');
    const record = await create({});
    expect(record.language).toBe('he');
  });

  it('GIVEN Hebrew words sent with an English label WHEN the room is created THEN the words decide', async () => {
    (classroomMembership.resolveClassroomLanguage as Mock).mockResolvedValue(null);
    const record = await create({ language: 'en', vocabularyWords: ['שולחן', 'מחברת'] });
    expect(record.language).toBe('he');
  });
});
