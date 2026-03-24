/**
 * StickyReadyBar Auto-Ready Countdown Tests (Brawl Stars-inspired)
 *
 * Tests the new auto-ready flow:
 * - All players see a countdown (AUTO_READY_SECONDS = 15s)
 * - Non-host players are auto-readied when countdown hits 0
 * - Host auto-starts when all players ready (existing 5s countdown)
 * - Players can manually ready/start before countdown expires
 * - "Leave Room" cancels the countdown (opt-out vs opt-in)
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
        'autoPlay.nextGameIn': `Next game in ${params?.seconds ?? ''}...`,
        'results.autoReadyIn': `Auto-ready in ${params?.seconds ?? ''}`,
        'results.nextRoundIn': `Next round in ${params?.seconds ?? ''}`,
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

// Mock GameModeSelector exports
jest.mock('@/components/GameModeSelector', () => ({
  GameModeSelector: () => <div data-testid="game-mode-selector" />,
  MODE_ICONS: { random: '🔀', classic: '📄', blast: '💣', 'word-hunt': '🎯' },
  MODE_ACTIVE_COLORS: { random: '', classic: '', blast: '', 'word-hunt': '' },
  getModeLabel: (mode: string) => mode,
}));

import StickyReadyBar from '../StickyReadyBar';

const AUTO_READY_SECONDS = 15;

describe('StickyReadyBar auto-ready countdown (Brawl Stars flow)', () => {
  const baseProps = {
    isHost: false,
    isCurrentPlayerReady: false,
    currentPlayerRank: 2,
    winnerUsername: 'winner',
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

  // --- Non-host auto-ready ---

  it('shows auto-ready countdown for non-host players who have not readied', () => {
    render(<StickyReadyBar {...baseProps} />);

    // Should show countdown seconds
    expect(screen.getByTestId('auto-ready-countdown')).toBeInTheDocument();
    expect(screen.getByText(String(AUTO_READY_SECONDS))).toBeInTheDocument();
  });

  it('auto-marks player as ready when countdown reaches 0', () => {
    const onMarkReady = jest.fn();
    render(<StickyReadyBar {...baseProps} onMarkReady={onMarkReady} />);

    // Advance through all seconds
    act(() => { jest.advanceTimersByTime(AUTO_READY_SECONDS * 1000); });

    expect(onMarkReady).toHaveBeenCalledTimes(1);
  });

  it('clicking the CTA button readies immediately (skips countdown)', () => {
    const onMarkReady = jest.fn();
    render(<StickyReadyBar {...baseProps} onMarkReady={onMarkReady} />);

    // Click the main button before countdown finishes
    const btn = screen.getByTestId('auto-ready-cta');
    fireEvent.click(btn);

    expect(onMarkReady).toHaveBeenCalledTimes(1);
  });

  it('does not show auto-ready countdown when player is already ready', () => {
    render(<StickyReadyBar {...baseProps} isCurrentPlayerReady={true} />);

    expect(screen.queryByTestId('auto-ready-countdown')).not.toBeInTheDocument();
    expect(screen.getByText('YOU ARE READY')).toBeInTheDocument();
  });

  it('cancelling auto-ready shows normal ready button', () => {
    render(<StickyReadyBar {...baseProps} />);

    // Cancel
    fireEvent.click(screen.getByTestId('auto-ready-cancel'));

    // Should now show the normal "I'M READY" or revenge button instead of countdown
    expect(screen.queryByTestId('auto-ready-countdown')).not.toBeInTheDocument();
  });

  // --- Host auto-start (existing behavior preserved) ---

  it('host sees auto-start countdown (5s) when all players are ready', () => {
    render(
      <StickyReadyBar
        {...baseProps}
        isHost={true}
        readyCount={3}
        totalPlayers={3}
      />
    );

    // Should show the 5-second host auto-advance countdown
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('host sees start button when not all players are ready', () => {
    render(
      <StickyReadyBar
        {...baseProps}
        isHost={true}
        readyCount={1}
        totalPlayers={3}
      />
    );

    expect(screen.getByText('START GAME')).toBeInTheDocument();
  });

  it('host auto-starts game when 5s countdown hits 0', () => {
    const onStartGame = jest.fn();
    render(
      <StickyReadyBar
        {...baseProps}
        isHost={true}
        readyCount={3}
        totalPlayers={3}
        onStartGame={onStartGame}
      />
    );

    act(() => { jest.advanceTimersByTime(5000); });
    expect(onStartGame).toHaveBeenCalledTimes(1);
  });

  // --- Countdown displays correctly ---

  it('countdown decrements each second', () => {
    render(<StickyReadyBar {...baseProps} />);

    expect(screen.getByText(String(AUTO_READY_SECONDS))).toBeInTheDocument();

    act(() => { jest.advanceTimersByTime(1000); });
    expect(screen.getByText(String(AUTO_READY_SECONDS - 1))).toBeInTheDocument();

    act(() => { jest.advanceTimersByTime(1000); });
    expect(screen.getByText(String(AUTO_READY_SECONDS - 2))).toBeInTheDocument();
  });

  // --- Edge cases ---

  it('does not auto-ready if countdown cancelled then timer fires', () => {
    const onMarkReady = jest.fn();
    render(<StickyReadyBar {...baseProps} onMarkReady={onMarkReady} />);

    // Cancel the countdown
    fireEvent.click(screen.getByTestId('auto-ready-cancel'));

    // Advance past countdown
    act(() => { jest.advanceTimersByTime(AUTO_READY_SECONDS * 1000); });

    // Should NOT have been called
    expect(onMarkReady).not.toHaveBeenCalled();
  });

  it('does not show auto-ready for bots-only (totalPlayers=0)', () => {
    render(<StickyReadyBar {...baseProps} totalPlayers={0} />);

    expect(screen.queryByTestId('auto-ready-countdown')).not.toBeInTheDocument();
  });
});
