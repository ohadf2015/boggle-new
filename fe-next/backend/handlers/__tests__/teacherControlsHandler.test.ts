/**
 * Teacher live controls — socket handler authorization + dispatch.
 *
 * Every control is host-only AND classroom-only. A non-host student, or a host
 * of an ordinary (non-classroom) room, is ignored with a logged warning — no
 * error emit, nothing to probe. Authorized calls dispatch to the timer /
 * lifecycle services; the timer math itself is covered in gameTimer tests.
 */
import { vi, type Mock } from 'vitest';

const mocks = vi.hoisted(() => ({
  getGame: vi.fn(),
  getGameBySocketId: vi.fn(),
  pauseGameTimer: vi.fn(),
  resumeGameTimer: vi.fn(),
  extendGameTimer: vi.fn(),
  endGame: vi.fn(async () => {}),
  skipWordHuntTarget: vi.fn(async () => ({ targetLength: 5, targetCategory: null })),
  checkRateLimit: vi.fn(() => true),
  warn: vi.fn(),
}));

vi.mock('../../modules/gameStateManager', () => ({
  getGame: mocks.getGame,
  getGameBySocketId: mocks.getGameBySocketId,
}));
vi.mock('../../services/gameLifecycle/gameTimer', () => ({
  pauseGameTimer: mocks.pauseGameTimer,
  resumeGameTimer: mocks.resumeGameTimer,
  extendGameTimer: mocks.extendGameTimer,
}));
vi.mock('../../services/gameLifecycle/gameEnd', () => ({
  endGame: mocks.endGame,
}));
vi.mock('../wordHuntHandler', () => ({
  skipWordHuntTarget: mocks.skipWordHuntTarget,
}));
vi.mock('../../utils/rateLimiter', () => ({
  checkRateLimit: mocks.checkRateLimit,
  default: { checkRateLimit: mocks.checkRateLimit },
}));
vi.mock('../../utils/logger', () => ({
  default: { info: vi.fn(), warn: mocks.warn, error: vi.fn(), debug: vi.fn() },
}));

import { registerTeacherControlsHandlers } from '../teacherControlsHandler';

const io = { to: vi.fn().mockReturnThis(), emit: vi.fn() } as any;

function createSocket(id = 'host-sock', data: Record<string, unknown> = {}) {
  const handlers: Record<string, (...args: any[]) => any> = {};
  const socket = {
    id,
    data,
    emit: vi.fn(),
    on: vi.fn((event: string, h: (...args: any[]) => any) => { handlers[event] = h; }),
  };
  registerTeacherControlsHandlers(io, socket as any);
  return { socket, handlers };
}

function classroomGame(extra: Record<string, unknown> = {}) {
  return {
    gameCode: 'CLS1',
    hostSocketId: 'host-sock',
    isClassroom: true,
    gameState: 'in-progress',
    users: { Teacher: { isHost: true, authUserId: 'auth-teacher' } },
    ...extra,
  };
}

describe('teacherControlsHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.checkRateLimit.mockReturnValue(true);
    mocks.getGameBySocketId.mockReturnValue('CLS1');
    mocks.getGame.mockReturnValue(classroomGame());
    mocks.pauseGameTimer.mockReturnValue({ remainingTime: 42 });
    mocks.resumeGameTimer.mockReturnValue({ remainingTime: 42 });
    mocks.extendGameTimer.mockReturnValue({ addedSeconds: 30, remainingTime: 72 });
  });

  it('registers every teacher control event', () => {
    const { handlers } = createSocket();
    expect(Object.keys(handlers).sort()).toEqual(
      ['endRoundNow', 'extendTime', 'pauseGame', 'resumeGame', 'skipTargetWord'].sort(),
    );
  });

  describe('authorization', () => {
    it('ignores a non-host socket with a logged warning', async () => {
      const { handlers } = createSocket('student-sock');

      await handlers.pauseGame();

      expect(mocks.pauseGameTimer).not.toHaveBeenCalled();
      expect(mocks.warn).toHaveBeenCalledWith('TEACHER', expect.stringContaining('not host'), expect.anything());
    });

    it('ignores the host of a NON-classroom room with a logged warning', async () => {
      mocks.getGame.mockReturnValue(classroomGame({ isClassroom: false }));
      const { handlers } = createSocket();

      await handlers.pauseGame();
      await handlers.extendTime({ seconds: 30 });
      await handlers.endRoundNow();

      expect(mocks.pauseGameTimer).not.toHaveBeenCalled();
      expect(mocks.extendGameTimer).not.toHaveBeenCalled();
      expect(mocks.endGame).not.toHaveBeenCalled();
      expect(mocks.warn).toHaveBeenCalledWith('TEACHER', expect.stringContaining('not a classroom'), expect.anything());
    });

    it('ignores a socket that is not in any game', async () => {
      mocks.getGameBySocketId.mockReturnValue(null);
      const { handlers } = createSocket();

      await handlers.pauseGame();

      expect(mocks.pauseGameTimer).not.toHaveBeenCalled();
      expect(mocks.warn).toHaveBeenCalled();
    });

    it('accepts a reconnected host verified by auth id even when hostSocketId is stale', async () => {
      mocks.getGame.mockReturnValue(classroomGame({ hostSocketId: 'old-sock' }));
      const { handlers } = createSocket('new-sock', { verifiedUserId: 'auth-teacher' });

      await handlers.pauseGame();

      expect(mocks.pauseGameTimer).toHaveBeenCalledWith(io, 'CLS1');
    });

    it('drops rate-limited calls', async () => {
      mocks.checkRateLimit.mockReturnValue(false);
      const { socket, handlers } = createSocket();

      await handlers.pauseGame();

      expect(mocks.pauseGameTimer).not.toHaveBeenCalled();
      expect(socket.emit).toHaveBeenCalledWith('rateLimited');
    });
  });

  describe('dispatch (authorized classroom host)', () => {
    it('pauseGame → pauseGameTimer', async () => {
      const { handlers } = createSocket();
      await handlers.pauseGame();
      expect(mocks.pauseGameTimer).toHaveBeenCalledWith(io, 'CLS1');
    });

    it('resumeGame → resumeGameTimer', async () => {
      const { handlers } = createSocket();
      await handlers.resumeGame();
      expect(mocks.resumeGameTimer).toHaveBeenCalledWith(io, 'CLS1');
    });

    it('extendTime passes the requested seconds through (service clamps)', async () => {
      const { handlers } = createSocket();
      await handlers.extendTime({ seconds: 45 });
      expect(mocks.extendGameTimer).toHaveBeenCalledWith(io, 'CLS1', 45);
    });

    it('extendTime defaults to 30s when the payload is missing or malformed', async () => {
      const { handlers } = createSocket();
      await handlers.extendTime();
      await handlers.extendTime({ seconds: 'lots' });
      expect(mocks.extendGameTimer).toHaveBeenNthCalledWith(1, io, 'CLS1', 30);
      expect(mocks.extendGameTimer).toHaveBeenNthCalledWith(2, io, 'CLS1', 30);
    });

    it('endRoundNow → endGame (idempotent service)', async () => {
      const { handlers } = createSocket();
      await handlers.endRoundNow();
      await handlers.endRoundNow();
      expect(mocks.endGame).toHaveBeenCalledTimes(2);
      expect(mocks.endGame).toHaveBeenCalledWith(io, 'CLS1');
    });

    it('skipTargetWord → skipWordHuntTarget', async () => {
      const { handlers } = createSocket();
      await handlers.skipTargetWord();
      expect(mocks.skipWordHuntTarget).toHaveBeenCalledWith(io, 'CLS1');
    });

    it('tells the host when a control could not be applied', async () => {
      mocks.pauseGameTimer.mockReturnValue(null);
      mocks.skipWordHuntTarget.mockResolvedValue(null);
      const { socket, handlers } = createSocket();

      await handlers.pauseGame();
      await handlers.skipTargetWord();

      expect(socket.emit).toHaveBeenCalledWith('teacherControlRejected', { action: 'pauseGame' });
      expect(socket.emit).toHaveBeenCalledWith('teacherControlRejected', { action: 'skipTargetWord' });
    });
  });
});
