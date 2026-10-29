import { vi, type Mock } from 'vitest';
import { registerClassroomGameHandlers } from '../classroomGameHandler';
import * as classroomGameManager from '../../modules/classroomGameManager';
import * as classroomMembership from '../../modules/supabase/classroomMembership';
import * as gameStateManager from '../../modules/gameStateManager';

vi.mock('../../modules/classroomGameManager');
vi.mock('../../modules/gameStateManager');
vi.mock('../../modules/supabase/classroomMembership', () => ({
  isClassroomTeacher: vi.fn(),
  isClassroomStudent: vi.fn(),
  getClassroomRole: vi.fn(),
  resolveClassroomTeacher: vi.fn(),
  resolveClassroomStudent: vi.fn(),
  resolveClassroomRole: vi.fn(),
  resolveClassroomName: vi.fn(async () => "Mr Smith's Class"),
}));
vi.mock('../../utils/rateLimiter', () => ({
  checkRateLimit: vi.fn(() => true),
  default: { checkRateLimit: vi.fn(() => true) },
}));
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
vi.mock('./classroomGamePersistence.js', () => ({ persistClassroomGameScores: vi.fn() }));
vi.mock('../classroomGamePersistence', () => ({ persistClassroomGameScores: vi.fn() }));

const STUDENT_ID = '00000000-0000-4000-8000-0000000000aa';
const CLASSROOM_ID = '00000000-0000-4000-8000-0000000000bb';

function makeSocket() {
  return {
    id: 'socket-123',
    on: vi.fn(),
    emit: vi.fn(),
    join: vi.fn(),
    leave: vi.fn(),
    data: {},
    handshake: { auth: { authUserId: STUDENT_ID } },
  } as never as { on: Mock; emit: Mock };
}

const makeIo = () => ({ to: vi.fn(() => ({ emit: vi.fn() })), emit: vi.fn() }) as never;

function joinHandlerOf(socket: { on: Mock }) {
  const entry = socket.on.mock.calls.find((c: unknown[]) => c[0] === 'joinClassroomGame');
  if (!entry) throw new Error('joinClassroomGame handler was never registered');
  return entry[1] as (data: unknown) => Promise<void>;
}

const lockedGame = (players: Array<{ userId: string }> = []) => ({
  gameCode: 'ABC123',
  classroomId: CLASSROOM_ID,
  teacherId: 'teacher-1',
  players,
  status: 'waiting',
  settings: { lobbyLocked: true },
});

describe('joinClassroomGame — the teacher locked the room', () => {
  let socket: ReturnType<typeof makeSocket>;

  beforeEach(() => {
    vi.clearAllMocks();
    socket = makeSocket();
    (classroomMembership.resolveClassroomRole as Mock).mockResolvedValue({ status: 'ok', role: 'student' });
    (classroomGameManager.addPlayerToClassroomGame as Mock).mockResolvedValue(undefined);
    (gameStateManager.getGameUsers as Mock).mockReturnValue([]);
  });

  it('GIVEN a locked room WHEN a new student taps join on the class hub THEN they are refused with ROOM_LOCKED', async () => {
    (classroomGameManager.getClassroomGame as Mock).mockResolvedValue(lockedGame());
    registerClassroomGameHandlers(makeIo(), socket as never);
    await joinHandlerOf(socket)({ gameCode: 'ABC123', userId: STUDENT_ID, username: 'Alice' });

    expect(classroomGameManager.addPlayerToClassroomGame).not.toHaveBeenCalled();
    expect(socket.emit).toHaveBeenCalledWith('classroomGameError', expect.objectContaining({ code: 'ROOM_LOCKED', gameCode: 'ABC123' }));
  });

  it('GIVEN a locked room whose round is running WHEN a new student taps join THEN the lock stays out of it', async () => {
    (classroomGameManager.getClassroomGame as Mock).mockResolvedValue({ ...lockedGame(), status: 'playing' });
    registerClassroomGameHandlers(makeIo(), socket as never);
    await joinHandlerOf(socket)({ gameCode: 'ABC123', userId: STUDENT_ID, username: 'Alice' });
    expect(classroomGameManager.addPlayerToClassroomGame).toHaveBeenCalled();
  });

  it('GIVEN a locked room WHEN a student seated at lock time rejoins THEN they get in', async () => {
    (classroomGameManager.getClassroomGame as Mock).mockResolvedValue({ ...lockedGame(), settings: { lobbyLocked: true, lobbyLockedSeats: [`a:${STUDENT_ID}`] } });
    registerClassroomGameHandlers(makeIo(), socket as never);
    await joinHandlerOf(socket)({ gameCode: 'ABC123', userId: STUDENT_ID, username: 'Alice' });
    expect(classroomGameManager.addPlayerToClassroomGame).toHaveBeenCalled();
  });

  it('GIVEN a locked room WHEN a student already on the record rejoins THEN they get in', async () => {
    (classroomGameManager.getClassroomGame as Mock).mockResolvedValue(lockedGame([{ userId: STUDENT_ID }]));
    registerClassroomGameHandlers(makeIo(), socket as never);
    await joinHandlerOf(socket)({ gameCode: 'ABC123', userId: STUDENT_ID, username: 'Alice' });
    expect(classroomGameManager.addPlayerToClassroomGame).toHaveBeenCalled();
  });

  it('GIVEN a locked room WHEN a student already seated in the live room rejoins THEN they get in', async () => {
    (classroomGameManager.getClassroomGame as Mock).mockResolvedValue(lockedGame());
    (gameStateManager.getGameUsers as Mock).mockReturnValue([{ username: 'Alice', authUserId: STUDENT_ID }]);
    registerClassroomGameHandlers(makeIo(), socket as never);
    await joinHandlerOf(socket)({ gameCode: 'ABC123', userId: STUDENT_ID, username: 'Alice' });
    expect(classroomGameManager.addPlayerToClassroomGame).toHaveBeenCalled();
  });
});
