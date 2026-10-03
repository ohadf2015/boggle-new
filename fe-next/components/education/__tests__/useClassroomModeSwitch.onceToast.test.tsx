import { renderHook, act } from '@testing-library/react';

const { toastSuccess, toastError } = vi.hoisted(() => ({ toastSuccess: vi.fn(), toastError: vi.fn() }));
vi.mock('react-hot-toast', () => ({ __esModule: true, default: { success: toastSuccess, error: toastError } }));
vi.mock('@/hooks/gameState', () => ({
  useGameActions: () => ({ setGameMode: vi.fn(), setHostSelectedGameMode: vi.fn() }),
}));

import { useClassroomModeSwitch } from '../lobby/useClassroomModeSwitch';

const CODE = 'E3JVZR';

function multiListenerSocket() {
  const listeners: Record<string, Set<(d?: unknown) => void>> = {};
  return {
    emit: vi.fn(),
    on: (e: string, fn: (d?: unknown) => void) => {
      (listeners[e] ??= new Set()).add(fn);
    },
    off: (e: string, fn: (d?: unknown) => void) => {
      listeners[e]?.delete(fn);
    },
    fire: (e: string, d?: unknown) => act(() => listeners[e]?.forEach((fn) => fn(d))),
  };
}

describe('useClassroomModeSwitch — one switch, one toast', () => {
  beforeEach(() => vi.clearAllMocks());

  it('Given the server acks the teacher directly AND via the room broadcast, Then "Now playing" shows once', () => {
    const socket = multiListenerSocket();
    const { result } = renderHook(() =>
      useClassroomModeSwitch({ gameCode: CODE, currentMode: 'classic', socket: socket as never, t: (k) => k })
    );
    act(() => result.current.switchTo('wordcraft' as never));
    socket.fire('classroomGameModeChanged', { gameCode: CODE, gameMode: 'wordcraft' });
    socket.fire('classroomGameModeChanged', { gameCode: CODE, gameMode: 'wordcraft' });

    expect(toastSuccess).toHaveBeenCalledTimes(1);
    expect(result.current.liveMode).toBe('wordcraft');
  });

  it('Given two acks land in the same tick, Then the toast still shows once', () => {
    const socket = multiListenerSocket();
    const { result } = renderHook(() =>
      useClassroomModeSwitch({ gameCode: CODE, currentMode: 'classic', socket: socket as never, t: (k) => k })
    );
    act(() => result.current.switchTo('blast' as never));
    act(() => {
      socket.fire('classroomGameModeChanged', { gameCode: CODE, gameMode: 'blast' });
      socket.fire('classroomGameModeChanged', { gameCode: CODE, gameMode: 'blast' });
    });
    expect(toastSuccess).toHaveBeenCalledTimes(1);
  });
});
