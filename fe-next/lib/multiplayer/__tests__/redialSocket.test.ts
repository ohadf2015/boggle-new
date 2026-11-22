import { describe, it, expect, vi } from 'vitest';
import { redialSocket, redialSocketNow } from '../redialSocket';

type State = 'opening' | 'open' | 'closed';
const fakeSocket = (connected: boolean, active: boolean, readyState: State) =>
  ({ connected, active, io: { _readyState: readyState }, connect: vi.fn() });

describe('redialSocket', () => {
  it('Given a handshake already in flight on an open connection, When redialing, Then no second CONNECT is sent', () => {
    const socket = fakeSocket(false, true, 'open');
    redialSocket(socket);
    expect(socket.connect).not.toHaveBeenCalled();
  });

  it('Given a connected socket, When redialing, Then nothing happens', () => {
    const socket = fakeSocket(true, true, 'open');
    redialSocket(socket);
    expect(socket.connect).not.toHaveBeenCalled();
  });

  it('Given a socket the server dropped, When redialing, Then it connects', () => {
    const socket = fakeSocket(false, false, 'open');
    redialSocket(socket);
    expect(socket.connect).toHaveBeenCalledTimes(1);
  });

  it('Given a socket whose reconnection budget is spent, When redialing, Then it connects', () => {
    const socket = fakeSocket(false, true, 'closed');
    redialSocket(socket);
    expect(socket.connect).toHaveBeenCalledTimes(1);
  });
});

describe('redialSocketNow with a real socket.io client', () => {
  it('Given a retry waiting out its backoff, When a person asks to reconnect, Then it dials now instead of after the wait', async () => {
    const { io } = await vi.importActual<typeof import('socket.io-client')>('socket.io-client');
    const socket = io('http://127.0.0.1:9', {
      transports: ['websocket'],
      reconnectionDelay: 60_000,
      reconnectionDelayMax: 60_000,
      randomizationFactor: 0,
      timeout: 200,
    });
    try {
      const manager = socket.io as unknown as { _reconnecting: boolean; _readyState: string };
      await vi.waitFor(() => expect(manager._reconnecting && manager._readyState === 'closed').toBe(true), { timeout: 3000 });
      redialSocket(socket);
      expect(manager._readyState).toBe('closed');
      redialSocketNow(socket);
      expect(manager._readyState).toBe('opening');
    } finally {
      socket.close();
    }
  });
});
