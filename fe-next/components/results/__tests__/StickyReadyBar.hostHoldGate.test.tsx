/**
 * Host-hold-gate: host CTA must be disabled until 15s elapsed OR all
 * non-host players ready. Prevents host insta-skipping a results screen
 * before others can read it.
 */

import React from 'react';
import { vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const m: Record<string, string> = {
        'results.playAgain': 'START GAME',
        'results.imReady': "I'M READY",
        'results.youAreReady': 'YOU ARE READY',
        'results.revengeRematch': `Revenge on ${params?.player ?? ''}!`,
        'results.defendTitle': 'DEFEND TITLE',
        'autoPlay.exit': 'Exit',
        'results.ready': 'Ready',
      };
      return m[key] ?? key;
    },
    dir: 'ltr' as const,
  }),
}));

vi.mock('@/components/CrazyGamesSDK', () => ({
  useCrazyGames: () => ({ isOnCrazyGamesPlatform: false }),
}));

vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, className, style, ...p }: any) => <div className={className} style={style} {...p}>{children}</div>,
    button: React.forwardRef(function MB({ children, style, ...p }: any, ref: any) {
      return <button ref={ref} style={style} {...p}>{children}</button>;
    }),
    span: ({ children, className, ...p }: any) => <span className={className} {...p}>{children}</span>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useReducedMotion: () => false,
}));

vi.mock('@/components/Avatar', () => ({
  __esModule: true,
  default: ({ userId }: { userId?: string }) => <div data-testid={`avatar-${userId}`} />,
}));

vi.mock('@/components/GameModeSelector', () => ({
  GameModeSelector: () => <div data-testid="game-mode-selector" />,
  MODE_ICONS: { random: '🔀', classic: '📄', blast: '💣', 'word-hunt': '🎯', 'wheel-rush': '🎡' },
  MODE_ACTIVE_COLORS: { random: '', classic: '', blast: '', 'word-hunt': '', 'wheel-rush': '' },
  getModeLabel: (m: string) => m,
  getModeDescription: (m: string) => m,
}));

import StickyReadyBar from '../StickyReadyBar';

const HOLD_SECONDS = 15;

const hostBase = {
  isHost: true,
  isCurrentPlayerReady: false,
  currentPlayerRank: 1,
  readyCount: 0,
  totalPlayers: 3,
  onStartGame: vi.fn(),
  onMarkReady: vi.fn(),
};

describe('StickyReadyBar host-hold gate', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });
  afterEach(() => { vi.useRealTimers(); });

  it('blocks host click before 15s when not all ready', () => {
    const onStartGame = vi.fn();
    render(<StickyReadyBar {...hostBase} onStartGame={onStartGame} />);

    act(() => { vi.advanceTimersByTime(5_000); });
    fireEvent.click(screen.getByTestId('auto-countdown-cta'));

    expect(onStartGame).not.toHaveBeenCalled();
  });

  it('marks host CTA as aria-disabled while gated', () => {
    render(<StickyReadyBar {...hostBase} />);
    expect(screen.getByTestId('auto-countdown-cta')).toHaveAttribute('aria-disabled', 'true');
  });

  it('allows host click after 15s elapsed', () => {
    const onStartGame = vi.fn();
    render(<StickyReadyBar {...hostBase} onStartGame={onStartGame} />);

    act(() => { vi.advanceTimersByTime(HOLD_SECONDS * 1000); });
    fireEvent.click(screen.getByTestId('auto-countdown-cta'));

    expect(onStartGame).toHaveBeenCalledTimes(1);
  });

  it('allows host click before 15s when everyone is ready', () => {
    const onStartGame = vi.fn();
    render(
      <StickyReadyBar
        {...hostBase}
        readyCount={3}
        totalPlayers={3}
        onStartGame={onStartGame}
      />
    );

    act(() => { vi.advanceTimersByTime(2_000); });
    fireEvent.click(screen.getByTestId('auto-countdown-cta'));

    expect(onStartGame).toHaveBeenCalledTimes(1);
  });

  it('does not aria-disable when all ready before 15s', () => {
    render(<StickyReadyBar {...hostBase} readyCount={3} totalPlayers={3} />);
    expect(screen.getByTestId('auto-countdown-cta')).toHaveAttribute('aria-disabled', 'false');
  });

  it('does not gate non-host', () => {
    const onMarkReady = vi.fn();
    render(
      <StickyReadyBar
        {...hostBase}
        isHost={false}
        isCurrentPlayerReady={false}
        onMarkReady={onMarkReady}
      />
    );

    fireEvent.click(screen.getByTestId('auto-countdown-cta'));
    expect(onMarkReady).toHaveBeenCalledTimes(1);
  });

  it('keeps gate after countdown is cancelled (manual start blocked early)', () => {
    const onStartGame = vi.fn();
    render(<StickyReadyBar {...hostBase} onStartGame={onStartGame} />);

    fireEvent.click(screen.getByLabelText('Exit'));
    act(() => { vi.advanceTimersByTime(3_000); });

    const manual = screen.getByRole('button', { name: /start game/i });
    fireEvent.click(manual);
    expect(onStartGame).not.toHaveBeenCalled();
  });

  it('manual start fires after 15s elapsed even if cancelled early', () => {
    const onStartGame = vi.fn();
    render(<StickyReadyBar {...hostBase} onStartGame={onStartGame} />);

    fireEvent.click(screen.getByLabelText('Exit'));
    act(() => { vi.advanceTimersByTime(HOLD_SECONDS * 1000); });

    const manual = screen.getByRole('button', { name: /start game/i });
    fireEvent.click(manual);
    expect(onStartGame).toHaveBeenCalledTimes(1);
  });
});
