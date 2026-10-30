import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const { mockToast } = vi.hoisted(() => ({ mockToast: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: mockToast }));

import { useClassroomSeatCapNotice } from '../useClassroomSeatCapNotice';

function fakeSocket() {
  const handlers = new Map<string, Set<(payload?: unknown) => void>>();
  return {
    on(event: string, fn: (payload?: unknown) => void) {
      if (!handlers.has(event)) handlers.set(event, new Set());
      handlers.get(event)!.add(fn);
    },
    off(event: string, fn: (payload?: unknown) => void) {
      handlers.get(event)?.delete(fn);
    },
    fire(event: string, payload?: unknown) {
      for (const fn of handlers.get(event) ?? []) fn(payload);
    },
    count(event: string) {
      return handlers.get(event)?.size ?? 0;
    },
  };
}

const t = (key: string) => (key === 'eduPolish.seatCapReached' ? '{name} is watching: the class is full ({cap} players)' : key);

beforeEach(() => mockToast.mockClear());

describe('useClassroomSeatCapNotice', () => {
  it('tells the teacher, in their language, which student could not get a seat', () => {
    const socket = fakeSocket();
    renderHook(() => useClassroomSeatCapNotice(socket as never, true, 'ABC123', t));

    socket.fire('classroomSeatCapReached', { gameCode: 'ABC123', username: 'Noa', cap: 50 });

    expect(mockToast).toHaveBeenCalledWith('Noa is watching: the class is full (50 players)', expect.anything());
  });

  it('ignores another room and never listens on a student screen', () => {
    const socket = fakeSocket();
    renderHook(() => useClassroomSeatCapNotice(socket as never, true, 'ABC123', t));
    socket.fire('classroomSeatCapReached', { gameCode: 'OTHER1', username: 'Noa', cap: 50 });
    expect(mockToast).not.toHaveBeenCalled();

    const studentSocket = fakeSocket();
    renderHook(() => useClassroomSeatCapNotice(studentSocket as never, false, 'ABC123', t));
    expect(studentSocket.count('classroomSeatCapReached')).toBe(0);
  });

  it('removes its listener on unmount', () => {
    const socket = fakeSocket();
    const { unmount } = renderHook(() => useClassroomSeatCapNotice(socket as never, true, 'ABC123', t));
    unmount();
    expect(socket.count('classroomSeatCapReached')).toBe(0);
  });
});
