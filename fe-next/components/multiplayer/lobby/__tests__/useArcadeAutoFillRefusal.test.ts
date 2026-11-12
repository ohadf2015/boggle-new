import { vi, describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';

const { toastError } = vi.hoisted(() => ({ toastError: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: { error: toastError } }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k }) }));

import { useArcadeAutoFillRefusal } from '../useArcadeAutoFillRefusal';

function fakeSocket() {
  const handlers = new Map<string, (p: unknown) => void>();
  return { handlers, on: vi.fn((e: string, h: (p: unknown) => void) => { handlers.set(e, h); }), off: vi.fn((e: string) => { handlers.delete(e); }) };
}

describe('useArcadeAutoFillRefusal', () => {
  it('Given the lobby fill is rate limited, When the refusal arrives, Then the host sees one toast', () => {
    const socket = fakeSocket();
    renderHook(() => useArcadeAutoFillRefusal(socket as never));
    socket.handlers.get('autoFillRefused')?.({ reason: 'rate_limited' });
    expect(toastError).toHaveBeenCalledTimes(1);
    expect(toastError).toHaveBeenCalledWith('errors.rateLimited', expect.anything());
  });

  it('Given a full room, When the refusal arrives, Then nothing is shown (the fill had nothing to do)', () => {
    toastError.mockClear();
    const socket = fakeSocket();
    renderHook(() => useArcadeAutoFillRefusal(socket as never));
    socket.handlers.get('autoFillRefused')?.({ reason: 'room_full' });
    expect(toastError).not.toHaveBeenCalled();
  });
});
