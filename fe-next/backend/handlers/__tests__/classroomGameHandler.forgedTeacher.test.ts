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
vi.mock('../../modules/gameStateManager', () => ({ bindSocketToGame: vi.fn(), unbindSocketFromGame: vi.fn(), getGameUsers: vi.fn(() => []) }));
vi.mock('@/utils/onboardingNameSuggestions', () => ({ suggestPlayerName: (lang: string) => `Fun ${lang}` }));
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
const CLASSROOM = '00000000-0000-4000-8000-000000000002';
const createPayload = { gameCode: 'ACT123', classroomId: CLASSROOM, teacherId: TEACHER, teacherName: 'Ms Cohen', settings: { gameMode: 'classic' } };
const liveGame = { gameCode: 'ACT123', classroomId: CLASSROOM, teacherId: TEACHER, status: 'waiting', settings: { gameMode: 'classic' }, players: [] };

function socketFor(data: Record<string, unknown>, handshakeAuth: Record<string, unknown> = {}) {
  const socket: any = { id: 's1', on: vi.fn(), emit: vi.fn(), join: vi.fn(), handshake: { auth: handshakeAuth }, data };
  registerClassroomGameHandlers({ to: vi.fn().mockReturnThis(), emit: vi.fn() } as any, socket);
  const send = (event: string, body: unknown) => socket.on.mock.calls.find((c: any[]) => c[0] === event)[1](body);
  return { socket, send };
}

const forged = () => socketFor({ verifiedUserId: null }, { authUserId: TEACHER });
const teacher = () => socketFor({ verifiedUserId: TEACHER });

describe('classroom teacher actions with a forged identity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (classroomMembership.resolveClassroomTeacher as Mock).mockResolvedValue('yes');
    (classroomGameManager.createClassroomGame as Mock).mockResolvedValue(undefined);
    (classroomGameManager.getClassroomGame as Mock).mockResolvedValue({ ...liveGame });
    (classroomGameManager.updateClassroomGameStatus as Mock).mockResolvedValue(undefined);
    mockResolveBoss.mockResolvedValue(undefined);
  });

  it("Given a socket claiming the teacher's id only in the handshake, When it creates a classroom game, Then it is refused with AUTH_REQUIRED", async () => {
    const { socket, send } = forged();
    await send('createClassroomGame', createPayload);
    expect(classroomGameManager.createClassroomGame).not.toHaveBeenCalled();
    expect(socket.emit).toHaveBeenCalledWith('classroomGameError', expect.objectContaining({ code: 'AUTH_REQUIRED' }));
  });

  it("Given a socket claiming the teacher's id only in the handshake, When it starts the round, Then the round does not start", async () => {
    const { socket, send } = forged();
    await send('startClassroomGame', { gameCode: 'ACT123' });
    expect(classroomGameManager.updateClassroomGameStatus).not.toHaveBeenCalled();
    expect(socket.emit).toHaveBeenCalledWith('classroomGameError', expect.objectContaining({ code: 'AUTH_REQUIRED' }));
  });

  it('Given the verified teacher, When she creates and starts the game, Then both go through', async () => {
    const { send } = teacher();
    await send('createClassroomGame', createPayload);
    await send('startClassroomGame', { gameCode: 'ACT123' });
    expect(classroomGameManager.createClassroomGame).toHaveBeenCalled();
    expect(classroomGameManager.updateClassroomGameStatus).toHaveBeenCalledWith('ACT123', 'playing');
  });

  it('Given a verified student, When she starts the round, Then she is told only the teacher can', async () => {
    const { socket, send } = socketFor({ verifiedUserId: '00000000-0000-4000-8000-000000000009' });
    await send('startClassroomGame', { gameCode: 'ACT123' });
    expect(classroomGameManager.updateClassroomGameStatus).not.toHaveBeenCalled();
    expect(socket.emit).toHaveBeenCalledWith('classroomGameError', { error: 'Only the teacher can start this game', code: 'NOT_TEACHER' });
  });

  it('Given any socket that knows a game code, When it asks for the lobby roster, Then it is not subscribed to the room and gets no names', () => {
    const { socket } = socketFor({});
    const handler = socket.on.mock.calls.find((c: any[]) => c[0] === 'getLobbyUsers')?.[1];
    handler?.({ gameCode: 'ACT123' });
    expect(socket.join).not.toHaveBeenCalled();
    expect(socket.emit).not.toHaveBeenCalledWith('updateUsers', expect.anything());
  });

  it('Given an enrolled student who types a profane name on the class hub banner, When she joins, Then the record and the broadcast carry a fun name', async () => {
    const STUDENT = '00000000-0000-4000-8000-000000000009';
    (classroomMembership.resolveClassroomRole as Mock).mockResolvedValue({ status: 'ok', role: 'student' });
    (classroomGameManager.getClassroomGame as Mock).mockResolvedValue({ ...liveGame, language: 'he' });
    (classroomGameManager.addPlayerToClassroomGame as Mock).mockResolvedValue(undefined);
    const { send } = socketFor({ verifiedUserId: STUDENT });
    await send('joinClassroomGame', { gameCode: 'ACT123', userId: STUDENT, username: 'זונה' });
    expect(classroomGameManager.addPlayerToClassroomGame).toHaveBeenCalledWith('ACT123', expect.objectContaining({ username: 'Fun he' }));
  });
});
