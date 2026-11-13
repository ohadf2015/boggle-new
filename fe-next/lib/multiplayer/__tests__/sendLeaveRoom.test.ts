import { describe, it, expect, vi } from 'vitest';
import { sendLeaveRoom } from '../sendLeaveRoom';

const fakeSocket = (connected: boolean) => ({ connected, connect: vi.fn(), emit: vi.fn() });

describe('sendLeaveRoom', () => {
  it('Given a live socket, When leaving, Then it emits leaveRoom without reconnecting', () => {
    const socket = fakeSocket(true);
    sendLeaveRoom(socket, 'ABC123', 'Teacher');
    expect(socket.connect).not.toHaveBeenCalled();
    expect(socket.emit).toHaveBeenCalledWith('leaveRoom', { gameCode: 'ABC123', username: 'Teacher' });
  });

  it('Given a socket the server dropped, When leaving, Then it reconnects so the queued leave reaches the room', () => {
    const socket = fakeSocket(false);
    sendLeaveRoom(socket, 'ABC123', 'Teacher');
    expect(socket.connect).toHaveBeenCalledTimes(1);
    expect(socket.emit).toHaveBeenCalledWith('leaveRoom', { gameCode: 'ABC123', username: 'Teacher' });
  });

  it('Given no room or no socket, When leaving, Then nothing is sent and nothing throws', () => {
    const socket = fakeSocket(false);
    sendLeaveRoom(socket, '', 'Teacher');
    expect(socket.emit).not.toHaveBeenCalled();
    expect(() => sendLeaveRoom(null, 'ABC123', 'Teacher')).not.toThrow();
  });

  it('Given a socket that throws, When leaving, Then the exit still goes on', () => {
    const socket = { connected: true, connect: vi.fn(), emit: vi.fn(() => { throw new Error('gone'); }) };
    expect(() => sendLeaveRoom(socket, 'ABC123', 'Teacher')).not.toThrow();
  });
});
