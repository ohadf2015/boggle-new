/**
 * StickyReadyBar Auto-Advance Tests
 *
 * Tests for the host auto-advance countdown when all non-host players are ready.
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
        'results.waitingForHostToStart': 'Waiting for host...',
        'results.waitingForPlayers': 'Waiting for players...',
        'results.revengeRematch': `Revenge on ${params?.player ?? ''}!`,
      };
      return translations[key] ?? key;
    },
    dir: 'ltr' as const,
  }),
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) => (
      <div className={className} {...props}>{children}</div>
    ),
    button: React.forwardRef(function MotionButton({ children, ...props }: any, ref: any) {
      return <button ref={ref} {...props}>{children}</button>;
    }),
    span: ({ children, className, ...props }: React.HTMLAttributes<HTMLSpanElement> & { children?: React.ReactNode }) => (
      <span className={className} {...props}>{children}</span>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useReducedMotion: () => false,
}));

// Mock AutoPlayCountdown
const mockOnComplete = jest.fn();
const mockOnCancel = jest.fn();
jest.mock('../AutoPlayCountdown', () => ({
  __esModule: true,
  default: ({ onComplete, onCancel }: { onComplete: () => void; onCancel: () => void }) => (
    <div data-testid="auto-play-countdown">
      <button data-testid="countdown-complete" onClick={onComplete}>Complete</button>
      <button data-testid="countdown-cancel" onClick={onCancel}>Cancel</button>
    </div>
  ),
}));

// Mock Avatar
jest.mock('@/components/Avatar', () => ({
  __esModule: true,
  default: () => <div data-testid="avatar" />,
}));

// Mock GameModeSelector
jest.mock('@/components/GameModeSelector', () => ({
  GameModeSelector: () => <div data-testid="game-mode-selector" />,
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
    readyUsernames: [] as string[],
    players: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
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
    expect(screen.queryByTestId('auto-play-countdown')).not.toBeInTheDocument();
  });

  it('shows AutoPlayCountdown when all non-host players are ready', () => {
    render(
      <StickyReadyBar
        {...baseProps}
        readyCount={3}
        totalPlayers={3}
      />
    );

    expect(screen.getByTestId('auto-play-countdown')).toBeInTheDocument();
  });

  it('auto-calls onStartGame when countdown completes', () => {
    const onStartGame = jest.fn();
    render(
      <StickyReadyBar
        {...baseProps}
        readyCount={3}
        totalPlayers={3}
        onStartGame={onStartGame}
      />
    );

    fireEvent.click(screen.getByTestId('countdown-complete'));
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
    fireEvent.click(screen.getByTestId('countdown-cancel'));

    // Should now show the normal start button
    expect(screen.getByText('START GAME')).toBeInTheDocument();
    expect(screen.queryByTestId('auto-play-countdown')).not.toBeInTheDocument();
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

    expect(screen.queryByTestId('auto-play-countdown')).not.toBeInTheDocument();
  });

  it('does not show countdown when totalPlayers is 0', () => {
    render(
      <StickyReadyBar
        {...baseProps}
        readyCount={0}
        totalPlayers={0}
      />
    );

    expect(screen.queryByTestId('auto-play-countdown')).not.toBeInTheDocument();
  });
});
