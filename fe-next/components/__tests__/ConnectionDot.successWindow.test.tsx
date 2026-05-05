import { render, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ConnectionDot } from '../ConnectionStatusIndicator';

const mockSocket = {
  isConnected: false as boolean,
  isReconnecting: false as boolean,
  connectionError: null as string | null,
};

vi.mock('@/utils/SocketContext', () => ({
  useSocket: () => ({
    isConnected: mockSocket.isConnected,
    isReconnecting: mockSocket.isReconnecting,
    connectionError: mockSocket.connectionError,
  }),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

describe('ConnectionDot success window (UX audit 2026-05-04 #7)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockSocket.isConnected = false;
    mockSocket.isReconnecting = false;
    mockSocket.connectionError = null;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('shows confirmation dot for 3s after transitioning into connected', () => {
    mockSocket.isConnected = false;
    const { rerender, container } = render(<ConnectionDot />);
    expect(container.querySelector('[role="status"]')).not.toBeNull();

    mockSocket.isConnected = true;
    rerender(<ConnectionDot />);
    const dot = container.querySelector('[role="status"]');
    expect(dot).not.toBeNull();
    expect(dot?.getAttribute('aria-label')).toBe('common.connected');

    act(() => {
      vi.advanceTimersByTime(3001);
    });
    rerender(<ConnectionDot />);
    expect(container.querySelector('[role="status"]')).toBeNull();
  });

  it('shows confirmation dot for 3s when mounted already-connected (first paint)', () => {
    mockSocket.isConnected = true;
    const { container } = render(<ConnectionDot />);
    expect(container.querySelector('[role="status"]')).not.toBeNull();

    act(() => {
      vi.advanceTimersByTime(3001);
    });
    expect(container.querySelector('[role="status"]')).toBeNull();
  });

  it('hides immediately when status leaves connected before 3s elapse', () => {
    mockSocket.isConnected = true;
    const { rerender, container } = render(<ConnectionDot />);
    expect(container.querySelector('[role="status"]')).not.toBeNull();

    act(() => {
      vi.advanceTimersByTime(500);
    });

    mockSocket.isConnected = false;
    mockSocket.isReconnecting = true;
    rerender(<ConnectionDot />);
    const dot = container.querySelector('[role="status"]');
    expect(dot?.getAttribute('aria-label')).toBe('common.reconnecting');
  });

  it('re-fires success window after disconnect → reconnect cycle', () => {
    mockSocket.isConnected = true;
    const { rerender, container } = render(<ConnectionDot />);

    act(() => {
      vi.advanceTimersByTime(3001);
    });
    rerender(<ConnectionDot />);
    expect(container.querySelector('[role="status"]')).toBeNull();

    mockSocket.isConnected = false;
    mockSocket.isReconnecting = true;
    rerender(<ConnectionDot />);
    expect(container.querySelector('[role="status"]')).not.toBeNull();

    mockSocket.isConnected = true;
    mockSocket.isReconnecting = false;
    rerender(<ConnectionDot />);
    expect(
      container.querySelector('[role="status"]')?.getAttribute('aria-label'),
    ).toBe('common.connected');

    act(() => {
      vi.advanceTimersByTime(3001);
    });
    rerender(<ConnectionDot />);
    expect(container.querySelector('[role="status"]')).toBeNull();
  });
});
