/**
 * userReportHandler tests — users:report / messages:report socket events.
 */

vi.mock('../../utils/logger', () => {
  const l = { info: vi.fn(), error: vi.fn(), debug: vi.fn(), warn: vi.fn() };
  return { __esModule: true, default: l, ...l };
});

vi.mock('../../utils/rateLimiter', () => ({
  __esModule: true,
  checkRateLimit: vi.fn().mockReturnValue(true),
}));

vi.mock('../../utils/errorHandler', async () => {
  const actual = await vi.importActual<typeof import('../../utils/errorHandler')>('../../utils/errorHandler');
  return { ...actual, emitError: vi.fn() };
});

vi.mock('../../modules/reportManager', () => ({
  __esModule: true,
  reportUser: vi.fn(),
  reportMessage: vi.fn(),
}));

vi.mock('../../utils/socialHelpers');

import { vi, describe, it, expect, beforeEach, type Mock } from 'vitest';
import { registerUserReportHandlers } from '../userReportHandler';
import * as reportManager from '../../modules/reportManager';
import { getAuthUserId } from '../../utils/socialHelpers';
import { emitError } from '../../utils/errorHandler';

const mockGetAuthUserId = getAuthUserId as Mock;
const mockEmitError = emitError as Mock;

function createTestHarness() {
  const handlers = new Map<string, (data?: unknown) => unknown>();
  const socket = {
    id: 'socket-1',
    emit: vi.fn(),
    on: vi.fn((event: string, handler: (data?: unknown) => unknown) => handlers.set(event, handler)),
  };
  const io = { to: vi.fn().mockReturnThis(), emit: vi.fn() };
  registerUserReportHandlers(io as never, socket as never);
  const trigger = (event: string, data?: unknown) => {
    const handler = handlers.get(event);
    if (!handler) throw new Error(`No handler for ${event}`);
    return handler(data);
  };
  return { socket, io, trigger };
}

describe('userReportHandler: users:report', () => {
  let harness: ReturnType<typeof createTestHarness>;
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthUserId.mockReturnValue('reporter-1');
    (reportManager.reportUser as Mock).mockResolvedValue({ success: true });
    (reportManager.reportMessage as Mock).mockResolvedValue({ success: true });
    harness = createTestHarness();
  });

  it('GIVEN authed reporter WHEN users:report THEN calls reportUser and confirms', async () => {
    await harness.trigger('users:report', { targetUserId: 'target-9', reason: 'harassment', context: 'x' });
    expect(reportManager.reportUser).toHaveBeenCalledWith('reporter-1', 'target-9', 'harassment', 'x');
    expect(harness.socket.emit).toHaveBeenCalledWith('report:submitted', expect.objectContaining({ success: true }));
  });

  it('GIVEN unauthenticated socket WHEN users:report THEN emits auth error and does not report', async () => {
    mockGetAuthUserId.mockReturnValue(null);
    await harness.trigger('users:report', { targetUserId: 'target-9', reason: 'harassment' });
    expect(mockEmitError).toHaveBeenCalled();
    expect(reportManager.reportUser).not.toHaveBeenCalled();
  });

  it('GIVEN missing targetUserId WHEN users:report THEN emits validation error', async () => {
    await harness.trigger('users:report', { reason: 'spam' });
    expect(harness.socket.emit).toHaveBeenCalledWith('friends:error', expect.objectContaining({ code: 'VALIDATION_FAILED' }));
    expect(reportManager.reportUser).not.toHaveBeenCalled();
  });

  it('GIVEN reportManager rejects the reason WHEN users:report THEN surfaces the error code', async () => {
    (reportManager.reportUser as Mock).mockResolvedValue({ success: false, errorCode: 'INVALID_REASON' });
    await harness.trigger('users:report', { targetUserId: 'target-9', reason: 'bogus' });
    expect(harness.socket.emit).toHaveBeenCalledWith('friends:error', expect.objectContaining({ code: 'INVALID_REASON' }));
  });
});

describe('userReportHandler: messages:report', () => {
  let harness: ReturnType<typeof createTestHarness>;
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthUserId.mockReturnValue('reporter-1');
    (reportManager.reportMessage as Mock).mockResolvedValue({ success: true });
    harness = createTestHarness();
  });

  it('GIVEN a room-chat report WHEN messages:report THEN calls reportMessage with surface + confirms', async () => {
    await harness.trigger('messages:report', {
      surface: 'room_chat',
      reason: 'inappropriate',
      gameCode: 'ABCD',
      messageSnapshot: { senderName: 'Troll', message: 'bad', timestamp: 1 },
    });
    expect(reportManager.reportMessage).toHaveBeenCalledWith('reporter-1', expect.objectContaining({ surface: 'room_chat', gameCode: 'ABCD' }));
    expect(harness.socket.emit).toHaveBeenCalledWith('report:submitted', expect.objectContaining({ success: true }));
  });
});
