/**
 * Graceful shutdown must tell only THIS instance's clients to reconnect.
 *
 * Socket.IO runs on the Redis adapter, so a plain `io.emit` fans out to every
 * instance sharing that Redis. A draining instance (rolling deploy, a zombie QA
 * service on the prod Redis, a local worktree server stopping) then sent
 * `serverShutdown` to clients of HEALTHY instances: they disconnect themselves,
 * show "Fresh update incoming", and miss room broadcasts meanwhile — the MP
 * baseline caught a host's lobby missing a joiner exactly then
 * (.gauntlet/baseline defect #2: the host sockets dropped with
 * "client namespace disconnect" while that server never restarted).
 */
import { vi, describe, it, expect, afterEach } from 'vitest';

vi.mock('@sentry/nextjs', () => ({ withScope: vi.fn(), captureException: vi.fn() }));
vi.mock('../logger', () => ({ lifecycleLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock('../../backend/dictionary', () => ({}));
vi.mock('../../backend/modules/tournamentManager', () => ({ restoreTournamentsFromRedis: vi.fn() }));
vi.mock('../../backend/modules/wordValidatorPool', () => ({ pool: { shutdown: vi.fn(async () => {}) } }));
vi.mock('../../backend/utils/metrics', () => ({ setEventLoopLag: vi.fn() }));
vi.mock('../redisAdapter', () => ({ setupRedisAdapter: vi.fn(), cleanupRedisAdapter: vi.fn(async () => {}) }));
vi.mock('../shutdownSingletons', () => ({ shutdownInMemorySingletons: vi.fn() }));
vi.mock('../socketSetup', () => ({ clearCleanupTimers: vi.fn() }));
vi.mock('../../backend/handlers/presenceHandler', () => ({ stopConnectionHealthCheck: vi.fn() }));
vi.mock('../../backend/modules/notificationService', () => ({ sendOpsAlert: vi.fn() }));
vi.mock('../../backend/socketHandlers', () => ({ stopEmptyRoomCleanup: vi.fn() }));
vi.mock('../../backend/modules/gameStateManager', () => ({
  shutdownCacheInvalidation: vi.fn(async () => {}),
  getAllGameCodes: vi.fn(() => []),
  persistGameStateNow: vi.fn(async () => {}),
}));
vi.mock('../../backend/services/cronScheduler', () => ({ startAllCronJobs: vi.fn(), stopAllCronJobs: vi.fn() }));
vi.mock('../../backend/queues/cronQueue', () => ({ initCronQueue: vi.fn(), registerAllCronJobs: vi.fn(), shutdownCronQueue: vi.fn() }));
vi.mock('../clientDisconnect', () => ({ isClientDisconnectError: vi.fn(() => false) }));

import { createShutdownHandler } from '../lifecycle';

describe('graceful shutdown → serverShutdown notice', () => {
  afterEach(() => vi.useRealTimers());

  it('is emitted to this instance\'s own sockets (io.local), never across the Redis adapter', async () => {
    vi.useFakeTimers();
    const exit = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
    const io = {
      emit: vi.fn(),
      local: { emit: vi.fn() },
      close: vi.fn(),
    };
    const httpServer = { close: vi.fn() };

    const done = createShutdownHandler(httpServer as never, io as never)();
    await vi.runAllTimersAsync();
    await done;

    expect(io.local.emit).toHaveBeenCalledWith('serverShutdown', expect.objectContaining({ reconnectIn: expect.any(Number) }));
    expect(io.emit).not.toHaveBeenCalledWith('serverShutdown', expect.anything());
    exit.mockRestore();
  });
});
