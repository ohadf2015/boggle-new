import { vi, type Mock } from 'vitest';
import { registerClassroomGameHandlers } from '../classroomGameHandler';
import * as classroomGameManager from '../../modules/classroomGameManager';
import * as classroomMembership from '../../modules/supabase/classroomMembership';

const captured: Array<{ distinctId: string; event: string; properties: Record<string, unknown> }> = [];

vi.mock('@/lib/posthog', () => ({
  getPostHogServer: () => ({
    capture: (arg: { distinctId: string; event: string; properties: Record<string, unknown> }) => {
      captured.push(arg);
    },
  }),
}));
vi.mock('../../modules/classroomGameManager');
const flaggedProfiles = new Set<string>();
vi.mock('../../modules/supabase/client', () => ({
  getSupabase: () => ({
    from: () => ({
      select: () => ({
        in: (_c: string, ids: string[]) => ({
          eq: async () => ({ data: ids.filter((id) => flaggedProfiles.has(id)).map((id) => ({ id })), error: null }),
        }),
      }),
    }),
  }),
}));
vi.mock('../../modules/gameStateManager', () => ({
  bindSocketToGame: vi.fn(),
  unbindSocketFromGame: vi.fn(),
}));
vi.mock('../../modules/supabase/classroomMembership', () => ({
  isClassroomTeacher: vi.fn(),
  isClassroomStudent: vi.fn(),
  getClassroomRole: vi.fn(),
  resolveClassroomTeacher: vi.fn(),
  resolveClassroomStudent: vi.fn(),
  resolveClassroomRole: vi.fn(),
  resolveClassroomName: vi.fn(async () => 'Mr Smith\'s Class'),
}));
vi.mock('../../utils/rateLimiter', () => ({ checkRateLimit: vi.fn(() => true), default: {
  checkRateLimit: vi.fn(() => true),
} }));
vi.mock('../../utils/socketValidation', () => {
  const { z } = require('zod');
  return {
    validatePayload: vi.fn((_schema: unknown, data: unknown) => ({ success: true, data })),
    gameCodeSchema: z.string(),
    usernameSchema: z.string(),
  };
});
vi.mock('../../utils/logger', () => ({ default: {
  info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn(),
} }));

const TEACHER = '00000000-0000-4000-8000-000000000001';
const CLASSROOM = '00000000-0000-4000-8000-000000000002';

const game = {
  gameCode: 'ABC123',
  classroomId: CLASSROOM,
  teacherId: TEACHER,
  teacherName: 'Mr Smith',
  lessonIds: ['00000000-0000-4000-8000-000000000003'],
  vocabularyWords: ['cat', 'dog'],
  settings: { gameMode: 'classic' },
  players: [{ userId: 'student-1', username: 'Alice', socketId: 's1' }],
  status: 'waiting' as const,
  createdAt: '2026-01-01T00:00:00.000Z',
};

const named = (name: string) => captured.filter((c) => c.event === name);

describe('startClassroomGame — education telemetry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    captured.length = 0;
    flaggedProfiles.clear();
    (classroomMembership.isClassroomTeacher as Mock).mockResolvedValue(true);
    (classroomMembership.isClassroomStudent as Mock).mockResolvedValue(true);
    (classroomGameManager.getClassroomGame as Mock).mockResolvedValue(game);
    (classroomGameManager.updateClassroomGameStatus as Mock).mockResolvedValue(undefined);
  });

  it('Given a waiting game, When the teacher starts it, Then edu_live_round_started fires exactly once for the teacher', async () => {
    const socket: any = {
      id: 'socket-1', on: vi.fn(), emit: vi.fn(), join: vi.fn(),
      handshake: { auth: { authUserId: TEACHER } },
    };
    const io: any = { to: vi.fn().mockReturnThis(), emit: vi.fn() };
    registerClassroomGameHandlers(io, socket);
    const startHandler = socket.on.mock.calls.find((c: any[]) => c[0] === 'startClassroomGame')[1];

    await startHandler({ gameCode: 'ABC123' });

    const evs = named('edu_live_round_started');
    expect(evs).toHaveLength(1);
    expect(evs[0].distinctId).toBe(TEACHER);
    expect(evs[0].properties).toMatchObject({ classroom_id: CLASSROOM, game_code: 'ABC123', game_mode: 'classic' });
  });

  it('Given a waiting game, When started, Then the legacy edu_classroom_game_started fires exactly once alongside it', async () => {
    const socket: any = {
      id: 'socket-1', on: vi.fn(), emit: vi.fn(), join: vi.fn(),
      handshake: { auth: { authUserId: TEACHER } },
    };
    const io: any = { to: vi.fn().mockReturnThis(), emit: vi.fn() };
    registerClassroomGameHandlers(io, socket);
    const startHandler = socket.on.mock.calls.find((c: any[]) => c[0] === 'startClassroomGame')[1];

    await startHandler({ gameCode: 'ABC123' });

    expect(named('edu_classroom_game_started')).toHaveLength(1);
    expect(named('edu_live_round_started')).toHaveLength(1);
  });

  it('Given a teacher whose profile is a test account, When started, Then both start events carry is_test_account true', async () => {
    flaggedProfiles.add(TEACHER);
    const socket: any = {
      id: 'socket-1', on: vi.fn(), emit: vi.fn(), join: vi.fn(),
      handshake: { auth: { authUserId: TEACHER } },
    };
    const io: any = { to: vi.fn().mockReturnThis(), emit: vi.fn() };
    registerClassroomGameHandlers(io, socket);
    const startHandler = socket.on.mock.calls.find((c: any[]) => c[0] === 'startClassroomGame')[1];

    await startHandler({ gameCode: 'ABC123' });

    expect(named('edu_classroom_game_started')[0].properties.is_test_account).toBe(true);
    expect(named('edu_live_round_started')[0].properties.is_test_account).toBe(true);
  });

  it('Given a real teacher, When started, Then is_test_account is an explicit false', async () => {
    const socket: any = {
      id: 'socket-1', on: vi.fn(), emit: vi.fn(), join: vi.fn(),
      handshake: { auth: { authUserId: TEACHER } },
    };
    const io: any = { to: vi.fn().mockReturnThis(), emit: vi.fn() };
    registerClassroomGameHandlers(io, socket);
    const startHandler = socket.on.mock.calls.find((c: any[]) => c[0] === 'startClassroomGame')[1];

    await startHandler({ gameCode: 'ABC123' });

    expect(named('edu_live_round_started')[0].properties.is_test_account).toBe(false);
  });
});
