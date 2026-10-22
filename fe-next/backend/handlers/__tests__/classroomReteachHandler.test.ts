import { vi, type Mock } from 'vitest';

const { mockGetClassroomGame, mockSetReteach, mockRestore } = vi.hoisted(() => ({
  mockGetClassroomGame: vi.fn(),
  mockSetReteach: vi.fn(),
  mockRestore: vi.fn(),
}));

vi.mock('../../modules/classroomGameManager.js', () => ({ getClassroomGame: mockGetClassroomGame }));
vi.mock('../../modules/classroomGameManager', () => ({ getClassroomGame: mockGetClassroomGame }));
vi.mock('../../modules/classroomReteach.js', () => ({ setClassroomReteachWords: mockSetReteach, restoreClassroomFullLesson: mockRestore }));
vi.mock('../../modules/classroomReteach', () => ({ setClassroomReteachWords: mockSetReteach, restoreClassroomFullLesson: mockRestore }));
vi.mock('../../utils/rateLimiter.js', () => ({ checkRateLimit: vi.fn(() => true) }));
vi.mock('../../utils/rateLimiter', () => ({ checkRateLimit: vi.fn(() => true) }));
vi.mock('../../utils/logger.js', () => ({ default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() } }));
vi.mock('../../utils/logger', () => ({ default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() } }));

import { registerClassroomReteachHandlers, RETEACH_FAILED } from '../classroomReteachHandler';

const TEACHER_ID = '00000000-0000-4000-8000-0000000000aa';
const CODE = 'ABC123';

function makeSocket(authUserId: string) {
  return { id: 'socket-1', on: vi.fn(), emit: vi.fn(), data: { verifiedUserId: authUserId }, handshake: { auth: {} } } as never as { on: Mock; emit: Mock };
}

function handlerOf(socket: { on: Mock }, event = 'classroomReteachWords') {
  const entry = socket.on.mock.calls.find((c: unknown[]) => c[0] === event);
  if (!entry) throw new Error(`${event} was never registered`);
  return entry[1] as (data: unknown) => Promise<void>;
}

const finishedGame = { gameCode: CODE, classroomId: 'c1', teacherId: TEACHER_ID, status: 'finished', vocabularyWords: ['enzyme', 'membrane'], settings: {} };

describe('classroomReteachWords', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetClassroomGame.mockResolvedValue(finishedGame);
    mockSetReteach.mockResolvedValue(['enzyme']);
  });

  it('given the teacher between rounds, when they replay missed words, then the room narrows and the teacher gets the applied list', async () => {
    const socket = makeSocket(TEACHER_ID);
    registerClassroomReteachHandlers(socket as never);
    await handlerOf(socket)({ gameCode: CODE, words: ['enzyme'] });
    expect(mockSetReteach).toHaveBeenCalledWith(CODE, ['enzyme']);
    expect(socket.emit).toHaveBeenCalledWith('classroomReteachApplied', { gameCode: CODE, words: ['enzyme'] });
  });

  it('given a student socket, when it sends a reteach, then the room is untouched and the refusal is said', async () => {
    const socket = makeSocket('00000000-0000-4000-8000-0000000000bb');
    registerClassroomReteachHandlers(socket as never);
    await handlerOf(socket)({ gameCode: CODE, words: ['enzyme'] });
    expect(mockSetReteach).not.toHaveBeenCalled();
    expect(socket.emit).toHaveBeenCalledWith('classroomReteachRefused', { error: RETEACH_FAILED, gameCode: CODE });
  });

  it('given a round in progress, when a reteach arrives, then it is refused rather than swapping words under the class', async () => {
    mockGetClassroomGame.mockResolvedValue({ ...finishedGame, status: 'playing' });
    const socket = makeSocket(TEACHER_ID);
    registerClassroomReteachHandlers(socket as never);
    await handlerOf(socket)({ gameCode: CODE, words: ['enzyme'] });
    expect(mockSetReteach).not.toHaveBeenCalled();
    expect(socket.emit).toHaveBeenCalledWith('classroomReteachRefused', { error: RETEACH_FAILED, gameCode: CODE });
  });

  it('given an empty or malformed list, when it arrives, then nothing is written and the teacher hears it failed', async () => {
    const socket = makeSocket(TEACHER_ID);
    registerClassroomReteachHandlers(socket as never);
    await handlerOf(socket)({ gameCode: CODE, words: [] });
    await handlerOf(socket)({ gameCode: CODE, words: 'enzyme' });
    expect(mockSetReteach).not.toHaveBeenCalled();
    expect(socket.emit).toHaveBeenCalledTimes(2);
  });

  it('given the write fails, when the teacher replays, then the refusal is emitted, never silence', async () => {
    mockSetReteach.mockResolvedValue(null);
    const socket = makeSocket(TEACHER_ID);
    registerClassroomReteachHandlers(socket as never);
    await handlerOf(socket)({ gameCode: CODE, words: ['pizza'] });
    expect(socket.emit).toHaveBeenCalledWith('classroomReteachRefused', { error: RETEACH_FAILED, gameCode: CODE });
  });
});

describe('classroomRestoreFullLesson', () => {
  const restore = (socket: { on: Mock }) => handlerOf(socket, 'classroomRestoreFullLesson');

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetClassroomGame.mockResolvedValue(finishedGame);
    mockRestore.mockResolvedValue(['enzyme', 'membrane']);
  });

  it('given a narrowed room between rounds, when the teacher asks for the full list, then it comes back and the teacher hears it', async () => {
    const socket = makeSocket(TEACHER_ID);
    registerClassroomReteachHandlers(socket as never);
    await restore(socket)({ gameCode: CODE });
    expect(mockRestore).toHaveBeenCalledWith(CODE);
    expect(socket.emit).toHaveBeenCalledWith('classroomFullLessonRestored', { gameCode: CODE, words: ['enzyme', 'membrane'] });
  });

  it('given a student socket, when it asks, then the room is untouched and the refusal is said', async () => {
    const socket = makeSocket('00000000-0000-4000-8000-0000000000bb');
    registerClassroomReteachHandlers(socket as never);
    await restore(socket)({ gameCode: CODE });
    expect(mockRestore).not.toHaveBeenCalled();
    expect(socket.emit).toHaveBeenCalledWith('classroomFullLessonRefused', { error: RETEACH_FAILED, gameCode: CODE });
  });

  it('given a round in progress or a failed write, when asked, then the refusal is emitted, never silence', async () => {
    const socket = makeSocket(TEACHER_ID);
    registerClassroomReteachHandlers(socket as never);
    mockGetClassroomGame.mockResolvedValueOnce({ ...finishedGame, status: 'playing' });
    await restore(socket)({ gameCode: CODE });
    mockRestore.mockResolvedValueOnce(null);
    await restore(socket)({ gameCode: CODE });
    await restore(socket)({ gameCode: 42 });
    expect(socket.emit.mock.calls.filter((c: unknown[]) => c[0] === 'classroomFullLessonRefused')).toHaveLength(3);
  });
});

