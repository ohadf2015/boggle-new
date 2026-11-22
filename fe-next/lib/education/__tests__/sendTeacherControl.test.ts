import { describe, expect, it, vi } from 'vitest';
import { sendTeacherControl } from '../sendTeacherControl';

function fakeSocket(connected: boolean) {
  return { connected, emit: vi.fn(), connect: vi.fn(), active: false, io: { _readyState: 'closed' } };
}

describe('sendTeacherControl', () => {
  it('emits the control when the host is connected', () => {
    const socket = fakeSocket(true);
    const onOffline = vi.fn();
    expect(sendTeacherControl(socket, 'extendTime', { seconds: 30 }, onOffline)).toBe(true);
    expect(socket.emit).toHaveBeenCalledWith('extendTime', { seconds: 30 });
    expect(onOffline).not.toHaveBeenCalled();
  });

  it('emits a control without a payload as a bare event', () => {
    const socket = fakeSocket(true);
    sendTeacherControl(socket, 'endRoundNow', undefined, vi.fn());
    expect(socket.emit).toHaveBeenCalledWith('endRoundNow');
  });

  it('never queues a control while offline: tells the host and redials instead', () => {
    const socket = fakeSocket(false);
    const onOffline = vi.fn();
    expect(sendTeacherControl(socket, 'endRoundNow', undefined, onOffline)).toBe(false);
    expect(socket.emit).not.toHaveBeenCalled();
    expect(onOffline).toHaveBeenCalledTimes(1);
    expect(socket.connect).toHaveBeenCalledTimes(1);
  });

  it('treats a missing socket as offline', () => {
    const onOffline = vi.fn();
    expect(sendTeacherControl(null, 'pauseGame', undefined, onOffline)).toBe(false);
    expect(onOffline).toHaveBeenCalledTimes(1);
  });
});
