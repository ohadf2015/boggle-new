/** Creating a live room stamps "room opened" — never the "ran a live game" step, which needs a real 2+ player round. */
import { vi, type Mock } from 'vitest';
import { registerClassroomGameHandlers } from '../classroomGameHandler';
import * as classroomGameManager from '../../modules/classroomGameManager';
import * as classroomMembership from '../../modules/supabase/classroomMembership';
import { markTeacherRoomOpened, markTeacherLiveStarted } from '../../modules/supabase/teacherActivation';

const { mockResolveBoss } = vi.hoisted(() => ({ mockResolveBoss: vi.fn() }));
vi.mock('../../services/classroomBoss/bossEntitlement', () => ({ resolveBossForTeacher: mockResolveBoss }));
vi.mock('../../services/classroomBoss/bossEntitlement.js', () => ({ resolveBossForTeacher: mockResolveBoss }));
vi.mock('../../modules/classroomGameManager');
vi.mock('../../modules/gameStateManager', () => ({ bindSocketToGame: vi.fn(), unbindSocketFromGame: vi.fn() }));
vi.mock('../../modules/supabase/teacherActivation', () => ({
  markTeacherRoomOpened: vi.fn(async () => undefined),
  markTeacherLiveStarted: vi.fn(async () => undefined),
}));
vi.mock('../../modules/supabase/classroomMembership', () => ({
  isClassroomTeacher: vi.fn(),
  isClassroomStudent: vi.fn(),
  getClassroomRole: vi.fn(),
  resolveClassroomTeacher: vi.fn(),
  resolveClassroomStudent: vi.fn(),
  resolveClassroomRole: vi.fn(),
  resolveClassroomName: vi.fn(async () => 'Class'),
  resolveClassroomLanguage: vi.fn(),
}));
vi.mock('../../utils/rateLimiter', () => ({ checkRateLimit: vi.fn(() => true), default: { checkRateLimit: vi.fn(() => true) } }));
vi.mock('../../utils/socketValidation', () => {
  const { z } = require('zod');
  return {
    validatePayload: vi.fn((_s: unknown, data: unknown) => ({ success: true, data })),
    gameCodeSchema: z.string(),
    usernameSchema: z.string(),
  };
});
vi.mock('../../utils/logger', () => ({ default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() } }));

const TEACHER = '00000000-0000-4000-8000-000000000001';
const payload = {
  gameCode: 'ACT123',
  classroomId: '00000000-0000-4000-8000-000000000002',
  teacherId: TEACHER,
  teacherName: 'Ms Cohen',
  settings: { gameMode: 'classic' },
};

async function create() {
  const socket: any = { id: 's1', on: vi.fn(), emit: vi.fn(), join: vi.fn(), handshake: { auth: { authUserId: TEACHER } } };
  const io: any = { to: vi.fn().mockReturnThis(), emit: vi.fn() };
  registerClassroomGameHandlers(io, socket);
  const handler = socket.on.mock.calls.find((c: any[]) => c[0] === 'createClassroomGame')[1];
  await handler(payload);
}

describe('createClassroomGame — onboarding activation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (classroomMembership.resolveClassroomTeacher as Mock).mockResolvedValue('yes');
    (classroomGameManager.createClassroomGame as Mock).mockResolvedValue(undefined);
    mockResolveBoss.mockResolvedValue(undefined);
  });

  it('stamps room-opened (not live-started) once the room exists', async () => {
    await create();
    expect(markTeacherRoomOpened).toHaveBeenCalledWith(TEACHER);
    expect(markTeacherLiveStarted).not.toHaveBeenCalled();
  });

  it('stamps nothing when the room could not be created', async () => {
    (classroomGameManager.createClassroomGame as Mock).mockRejectedValue(new Error('redis down'));
    await create();
    expect(markTeacherRoomOpened).not.toHaveBeenCalled();
    expect(markTeacherLiveStarted).not.toHaveBeenCalled();
  });
});
