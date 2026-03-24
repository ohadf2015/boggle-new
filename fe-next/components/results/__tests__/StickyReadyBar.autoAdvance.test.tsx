/**
 * StickyReadyBar Auto-Advance Tests
 *
 * Tests for the host auto-advance inline countdown when all players are ready.
 * The countdown is now built into StickyReadyBar (no external AutoPlayCountdown).
 */

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';

// Mock LanguageContext
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'results.playAgain': 'START GAME',
        'results.imReady': "I'M READY",
        'results.youAreReady': 'YOU ARE READY',
        'results.revengeRematch': `Revenge on ${params?.player ?? ''}!`,
        'autoPlay.exit': 'Exit',
      };
      return translations[key] ?? key;
    },
    dir: 'ltr' as const,
  }),
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, style, ...props }: any) => (
      <div className={className} style={style} {...props}>{children}</div>
    ),
    button: React.forwardRef(function MotionButton({ children, style, ...props }: any, ref: any) {
      return <button ref={ref} style={style} {...props}>{children}</button>;
    }),
    span: ({ children, className, ...props }: any) => (
      <span className={className} {...props}>{children}</span>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useReducedMotion: () => false,
}));

// Mock Avatar
jest.mock('@/components/Avatar', () => ({
  __esModule: true,
  default: ({ userId }: { userId?: string }) => <div data-testid={`avatar-${userId}`} />,
}));

// Mock GameModeSelector exports
jest.mock('@/components/GameModeSelector', () => ({
  GameModeSelector: () => <div data-testid="game-mode-selector" />,
  MODE_ICONS: { random: '🔀', classic: '📄', blast: '💣', 'word-hunt': '🎯' },
  MODE_ACTIVE_COLORS: { random: '', classic: '', blast: '', 'word-hunt': '' },
  getModeLabel: (mode: string) => mode,
}));

import StickyReadyBar from '../StickyReadyBar';

describe('StickyReadyBar auto-advance', () => {
  const baseProps = {
    isHost: true,
    isCurrentPlayerReady: false,
    currentPlayerRank: 1,
    readyCount: 0,
    totalPlayers: 3,
    onStartGame: jest.fn(),
    onMarkReady: jest.fn(),
  };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows normal start button when not all players are ready', () => {
    render(
      <StickyReadyBar
        {...baseProps}
        readyCount={1}
        totalPlayers={3}
      />
    );

    expect(screen.getByText('START GAME')).toBeInTheDocument();
  });

  it('shows inline countdown when all players are ready (host)', () => {
    render(
      <StickyReadyBar
        {...baseProps}
        readyCount={3}
        totalPlayers={3}
      />
    );

    // Should show the countdown number (starts at 5)
    expect(screen.getByText('5')).toBeInTheDocument();
    // Should show exit button
    expect(screen.getByLabelText('Exit')).toBeInTheDocument();
    // Should NOT show START GAME text
    expect(screen.queryByText('START GAME')).not.toBeInTheDocument();
  });

  it('calls onStartGame when countdown reaches zero', () => {
    const onStartGame = jest.fn();
    render(
      <StickyReadyBar
        {...baseProps}
        readyCount={3}
        totalPlayers={3}
        onStartGame={onStartGame}
      />
    );

    // Advance through 5 seconds
    act(() => { jest.advanceTimersByTime(5000); });

    expect(onStartGame).toHaveBeenCalledTimes(1);
  });

  it('calls onStartGame immediately when countdown button is clicked', () => {
    const onStartGame = jest.fn();
    render(
      <StickyReadyBar
        {...baseProps}
        readyCount={3}
        totalPlayers={3}
        onStartGame={onStartGame}
      />
    );

    // Click the countdown button to start immediately
    const countdownNumber = screen.getByText('5');
    fireEvent.click(countdownNumber.closest('button')!);

    expect(onStartGame).toHaveBeenCalledTimes(1);
  });

  it('shows normal start button when countdown is cancelled', () => {
    render(
      <StickyReadyBar
        {...baseProps}
        readyCount={3}
        totalPlayers={3}
      />
    );

    // Cancel the countdown
    fireEvent.click(screen.getByLabelText('Exit'));

    // Should now show the normal start button
    expect(screen.getByText('START GAME')).toBeInTheDocument();
  });

  it('does not show countdown for non-host players', () => {
    render(
      <StickyReadyBar
        {...baseProps}
        isHost={false}
        isCurrentPlayerReady={true}
        readyCount={3}
        totalPlayers={3}
      />
    );

    expect(screen.getByText('YOU ARE READY')).toBeInTheDocument();
  });

  it('does not show countdown when totalPlayers is 0', () => {
    render(
      <StickyReadyBar
        {...baseProps}
        readyCount={0}
        totalPlayers={0}
      />
    );

    expect(screen.getByText('START GAME')).toBeInTheDocument();
  });
});
