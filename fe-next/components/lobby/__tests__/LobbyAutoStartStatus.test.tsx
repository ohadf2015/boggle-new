import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import LobbyAutoStartStatus from '../LobbyAutoStartStatus';

// Socket is irrelevant to render output here — the countdown value is driven
// entirely by useLobbyAutoStart, which we mock to control `secondsLeft`.
vi.mock('@/utils/SocketContext', () => ({
  useSocketOptional: () => ({ socket: { on: vi.fn(), off: vi.fn(), emit: vi.fn() } }),
}));

let mockSecondsLeft: number | null = null;
vi.mock('@/hooks/useLobbyAutoStart', () => ({
  __esModule: true,
  default: () => ({ secondsLeft: mockSecondsLeft, isAutoStarting: mockSecondsLeft !== null, cancel: vi.fn() }),
  useLobbyAutoStart: () => ({ secondsLeft: mockSecondsLeft, isAutoStarting: mockSecondsLeft !== null, cancel: vi.fn() }),
}));

const t = (key: string, params?: Record<string, unknown>) =>
  params ? `${key}:${JSON.stringify(params)}` : key;

describe('LobbyAutoStartStatus', () => {
  beforeEach(() => {
    mockSecondsLeft = null;
  });

  it('shows "host will start" when idle and nobody is ready', () => {
    render(<LobbyAutoStartStatus readyCount={0} readyTotal={3} t={t} />);
    expect(screen.getByText('playerView.hostWillStart')).toBeInTheDocument();
  });

  it('shows the ready tally when idle and at least one player is ready', () => {
    render(<LobbyAutoStartStatus readyCount={2} readyTotal={3} t={t} />);
    expect(screen.getByText(/2\/3/)).toBeInTheDocument();
    expect(screen.getByText(/hostView\.playersReady/)).toBeInTheDocument();
  });

  it('shows the auto-start countdown when the server is counting down', () => {
    mockSecondsLeft = 5;
    render(<LobbyAutoStartStatus readyCount={0} readyTotal={3} t={t} />);
    expect(screen.getByText(/playerView\.autoStartingSoon/)).toBeInTheDocument();
    expect(screen.getByText(/"seconds":5/)).toBeInTheDocument();
  });
});
