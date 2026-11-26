import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNextModeRelay } from '../useNextModeRelay';

function fakeSocket() {
  const handlers: Record<string, (data: unknown) => void> = {};
  return {
    handlers,
    emit: vi.fn(),
    on: vi.fn((e: string, h: (data: unknown) => void) => { handlers[e] = h; }),
    off: vi.fn((e: string) => { delete handlers[e]; }),
  };
}

describe('useNextModeRelay', () => {
  it('given the host, when results open and when the pick changes, then the pick is sent to the room', () => {
    const socket = fakeSocket();
    const { rerender } = renderHook(({ pick }) => useNextModeRelay({ socket: socket as never, gameCode: 'ABC123', isHost: true, pick, enabled: true }), { initialProps: { pick: 'classic' } });
    expect(socket.emit).toHaveBeenCalledWith('updateNextMode', { gameCode: 'ABC123', mode: 'classic' });
    rerender({ pick: 'blast' });
    expect(socket.emit).toHaveBeenLastCalledWith('updateNextMode', { gameCode: 'ABC123', mode: 'blast' });
  });

  it('given a joiner, when results open, then it asks for the current pick and shows each relayed one', () => {
    const socket = fakeSocket();
    const { result } = renderHook(() => useNextModeRelay({ socket: socket as never, gameCode: 'ABC123', isHost: false, pick: 'random', enabled: true }));
    expect(socket.emit).toHaveBeenCalledWith('requestNextMode');
    expect(socket.emit).not.toHaveBeenCalledWith('updateNextMode', expect.anything());
    expect(result.current).toBeNull();
    act(() => socket.handlers.nextMode({ gameCode: 'ABC123', mode: 'blast' }));
    expect(result.current).toBe('blast');
    act(() => socket.handlers.nextMode({ gameCode: 'OTHER1', mode: 'classic' }));
    expect(result.current).toBe('blast');
  });

  it('given a classroom (disabled), then nothing is sent or requested', () => {
    const socket = fakeSocket();
    renderHook(() => useNextModeRelay({ socket: socket as never, gameCode: 'ABC123', isHost: true, pick: 'classic', enabled: false }));
    expect(socket.emit).not.toHaveBeenCalled();
  });
});
