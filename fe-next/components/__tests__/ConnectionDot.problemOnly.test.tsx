import { render } from '@testing-library/react';
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

// Problem-only contract: showing "connected" / "connecting" is redundant noise
// in the lobby. The dot must only appear for genuine trouble.
describe('ConnectionDot (problem-only indicator)', () => {
  beforeEach(() => {
    mockSocket.isConnected = false;
    mockSocket.isReconnecting = false;
    mockSocket.connectionError = null;
  });

  afterEach(() => vi.restoreAllMocks());

  it('renders nothing when connected', () => {
    mockSocket.isConnected = true;
    const { container } = render(<ConnectionDot />);
    expect(container.querySelector('[role="status"]')).toBeNull();
  });

  it('renders nothing while connecting (initial, no error, not reconnecting)', () => {
    mockSocket.isConnected = false;
    const { container } = render(<ConnectionDot />);
    expect(container.querySelector('[role="status"]')).toBeNull();
  });

  it('renders the dot while reconnecting', () => {
    mockSocket.isReconnecting = true;
    const { container } = render(<ConnectionDot />);
    const dot = container.querySelector('[role="status"]');
    expect(dot).not.toBeNull();
    expect(dot?.getAttribute('aria-label')).toBe('common.reconnecting');
  });

  it('renders the dot when disconnected (connection error)', () => {
    mockSocket.connectionError = 'boom';
    const { container } = render(<ConnectionDot />);
    const dot = container.querySelector('[role="status"]');
    expect(dot).not.toBeNull();
    expect(dot?.getAttribute('aria-label')).toBe('common.notConnected');
  });

  it('hides again once reconnect succeeds', () => {
    mockSocket.isReconnecting = true;
    const { rerender, container } = render(<ConnectionDot />);
    expect(container.querySelector('[role="status"]')).not.toBeNull();

    mockSocket.isReconnecting = false;
    mockSocket.isConnected = true;
    rerender(<ConnectionDot />);
    expect(container.querySelector('[role="status"]')).toBeNull();
  });
});
