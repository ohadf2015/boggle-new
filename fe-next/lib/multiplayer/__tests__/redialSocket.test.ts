import { describe, it, expect, vi } from 'vitest';
import { redialSocket } from '../redialSocket';

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
