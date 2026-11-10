import { vi, type Mock, describe, it, expect, beforeEach } from 'vitest';
import { registerClassroomGameHandlers } from '../classroomGameHandler';
import * as classroomGameManager from '../../modules/classroomGameManager';

const profileWrites: Array<{ id: string; patch: Record<string, unknown> }> = [];
let profileReads = 0;

vi.mock('../../modules/classroomGameManager');
vi.mock('../../modules/gameStateManager', () => ({
  bindSocketToGame: vi.fn(),
  unbindSocketFromGame: vi.fn(),
  getGameUsers: vi.fn(() => []),
}));
vi.mock('../../modules/supabase/classroomMembership', () => ({
  isClassroomTeacher: vi.fn(),
  resolveClassroomTeacher: vi.fn(),
  resolveClassroomRole: vi.fn(),
  resolveClassroomName: vi.fn(async () => 'Class'),
}));
vi.mock('../../modules/supabase/client', () => ({
  getSupabase: () => ({
    from(table: string) {
      if (table !== 'profiles') return { select: () => ({ in: () => ({ eq: async () => ({ data: [], error: null }) }) }) };
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => {
              profileReads += 1;
              return { data: { last_seen_at: null }, error: null };
            },
          }),
          in: () => ({ eq: async () => ({ data: [], error: null }) }),
        }),
        update: (patch: Record<string, unknown>) => ({
          eq: async (_col: string, id: string) => {
            profileWrites.push({ id, patch });
            return { error: null };
          },
        }),
      };
    },
  }),
}));
vi.mock('../../utils/rateLimiter', () => ({ checkRateLimit: vi.fn(() => true) }));
vi.mock('../../utils/socketValidation', () => {
  const { z } = require('zod');
  return {
    validatePayload: vi.fn((_schema: unknown, data: unknown) => ({ success: true, data })),
    gameCodeSchema: z.string(),
    usernameSchema: z.string(),
  };
});
vi.mock('../../utils/logger', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));
vi.mock('@/lib/posthog', () => ({ getPostHogServer: () => ({ capture: vi.fn() }) }));

const TEACHER = '00000000-0000-4000-8000-000000000001';
const game = {
  gameCode: 'ABC123',
  classroomId: '00000000-0000-4000-8000-000000000002',
  teacherId: TEACHER,
  teacherName: 'Ms K',
  lessonIds: [],
  vocabularyWords: [],
  settings: { gameMode: 'classic' },
  players: [],
  status: 'waiting' as const,
  createdAt: '2026-01-01T00:00:00.000Z',
};

function startHandler(authUserId: string | null) {
  const socket: any = {
    id: 'socket-1',
    on: vi.fn(),
    emit: vi.fn(),
    join: vi.fn(),
    handshake: { auth: {} },
    data: authUserId ? { verifiedUserId: authUserId } : {},
  };
  const io: any = { to: vi.fn().mockReturnThis(), emit: vi.fn() };
  registerClassroomGameHandlers(io, socket);
  const handler = socket.on.mock.calls.find((c: any[]) => c[0] === 'startClassroomGame')[1];
  return { socket, handler };
}

describe('startClassroomGame — last_seen_at', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    profileWrites.length = 0;
    profileReads = 0;
    (classroomGameManager.getClassroomGame as Mock).mockResolvedValue(game);
    (classroomGameManager.updateClassroomGameStatus as Mock).mockResolvedValue(undefined);
  });

  it('bumps profiles.last_seen_at when an authenticated teacher starts the round', async () => {
    const { handler } = startHandler(TEACHER);
    await handler({ gameCode: 'ABC123' });
    expect(profileWrites).toHaveLength(1);
    expect(profileWrites[0].id).toBe(TEACHER);
    expect(profileWrites[0].patch.last_seen_at).toEqual(expect.any(String));
  });

  it('performs no profile read or write when the starter is anonymous', async () => {
    const { socket, handler } = startHandler(null);
    await handler({ gameCode: 'ABC123' });
    expect(socket.emit).toHaveBeenCalledWith('classroomGameError', { error: 'education.errors.signInRequired', code: 'AUTH_REQUIRED', gameCode: 'ABC123' });
    expect(profileReads).toBe(0);
    expect(profileWrites).toEqual([]);
    expect(classroomGameManager.updateClassroomGameStatus).not.toHaveBeenCalled();
  });
});
