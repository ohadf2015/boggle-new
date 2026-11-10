import { vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const { toastError, setStored } = vi.hoisted(() => ({ toastError: vi.fn(), setStored: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: { error: toastError, success: vi.fn() } }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, p?: Record<string, string>) => (p ? `${k}:${JSON.stringify(p)}` : k) }),
}));
vi.mock('@/utils/profileStorage', () => ({ setStoredUsername: setStored }));

import { usePlayerLobby } from '../usePlayerLobby';

type Handler = (...args: unknown[]) => void;
function makeSocket() {
  const handlers: Record<string, Handler[]> = {};
  return {
    emit: vi.fn(),
    on: (e: string, cb: Handler) => { (handlers[e] ||= []).push(cb); },
    off: (e: string, cb: Handler) => { handlers[e] = (handlers[e] || []).filter((h) => h !== cb); },
    fire: (e: string, ...a: unknown[]) => (handlers[e] || []).forEach((h) => h(...a)),
  };
}

describe('usePlayerLobby — a refused classroom rename', () => {
  it('Given the server refuses the new name, When the refusal arrives, Then the student sees a kind message with a fun name and keeps the old name', async () => {
    const socket = makeSocket();
    renderHook(() => usePlayerLobby({ socket: socket as never, gameActive: false, showModeReveal: false, showStartAnimation: false, username: 'Alice' }));
    act(() => socket.fire('error', { error: 'NAME_NOT_ALLOWED', suggestedName: 'Pixel Panda' }));
    expect(toastError).toHaveBeenCalledWith('education.student.join.nameNotAllowed:{"suggestedName":"Pixel Panda"}');
    await vi.waitFor(() => expect(setStored).toHaveBeenCalledWith('Alice'));
  });

  it('Given an unrelated socket error, When it arrives, Then no name message is shown', () => {
    toastError.mockClear();
    const socket = makeSocket();
    renderHook(() => usePlayerLobby({ socket: socket as never, gameActive: false, showModeReveal: false, showStartAnimation: false, username: 'Alice' }));
    act(() => socket.fire('error', { error: 'GAME_NOT_FOUND' }));
    expect(toastError).not.toHaveBeenCalled();
  });
});
