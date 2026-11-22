import { render, act } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { ConnectionBanner } from '../ConnectionStatusIndicator';

vi.mock('@/utils/SocketContext', () => ({
  useSocket: () => ({
    isConnected: false,
    isReconnecting: false,
    isServerUpdating: false,
    connectionError: 'boom',
    manualReconnect: vi.fn(),
    getReconnectAttempt: () => 0,
    maxReconnectAttempts: 5,
  }),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

afterEach(() => vi.useRealTimers());

describe('ConnectionBanner and the floating mute button', () => {
  it('keeps its Reconnect button out of the top-end corner the mute button sits in', () => {
    vi.useFakeTimers();
    const { getByRole } = render(<ConnectionBanner />);
    act(() => { vi.advanceTimersByTime(1600); });
    const row = getByRole('alert').firstElementChild as HTMLElement;
    expect(row.className).toMatch(/\bpe-14\b/);
  });
});
