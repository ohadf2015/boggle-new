import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Socket } from 'socket.io';

const warnMock = vi.fn();
const debugMock = vi.fn();
const errorMock = vi.fn();
const infoMock = vi.fn();

vi.mock('../logger', () => ({
  default: {
    warn: warnMock,
    debug: debugMock,
    error: errorMock,
    info: infoMock,
  },
}));

function makeSocket(): Socket {
  return {
    id: 'sock-1',
    emit: vi.fn(),
  } as unknown as Socket;
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe('emitError', () => {
  it('legacy raw-message branch logs at WARN (so prod surfaces untyped sites)', async () => {
    const { emitError } = await import('../errorHandler');
    const socket = makeSocket();

    emitError(socket, 'Must be authenticated to send friend requests');

    expect(warnMock).toHaveBeenCalledTimes(1);
    const [tag, msg] = warnMock.mock.calls[0];
    expect(tag).toBe('SOCKET_ERROR');
    expect(String(msg)).toContain('[LEGACY]');
    expect(debugMock).not.toHaveBeenCalled();
  });

  it('emits payload with INTERNAL_ERROR code for legacy messages', async () => {
    const { emitError } = await import('../errorHandler');
    const socket = makeSocket();

    emitError(socket, 'some freeform error');

    expect(socket.emit).toHaveBeenCalledWith('error', expect.objectContaining({
      code: 'INTERNAL_ERROR',
      message: 'some freeform error',
    }));
  });

  it('known error codes still log at debug (not warn) for LOW severity', async () => {
    const { emitError, ErrorCodes } = await import('../errorHandler');
    const socket = makeSocket();

    emitError(socket, ErrorCodes.AUTH_REQUIRED);

    expect(warnMock).not.toHaveBeenCalled();
  });
});
