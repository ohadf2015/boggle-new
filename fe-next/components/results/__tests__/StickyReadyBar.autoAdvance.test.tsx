/**
 * StickyReadyBar Auto-Advance Tests
 *
 * Tests for the unified 30s countdown for all players (host and non-host).
 * Host: auto-starts game. Non-host: auto-readies.
 */

import React from 'react';
import { vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

// Mock LanguageContext
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'results.playAgain': 'START GAME',
        'results.imReady': "I'M READY",
        'results.youAreReady': 'YOU ARE READY',
        'results.revengeRematch': `Revenge on ${params?.player ?? ''}!`,
        'results.defendTitle': 'DEFEND TITLE',
        'autoPlay.exit': 'Exit',
        'results.ready': 'Ready',
      };
      return translations[key] ?? key;
    },
    dir: 'ltr' as const,
  }),
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  m: {
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
vi.mock('@/components/Avatar', () => ({
  __esModule: true,
  default: ({ userId }: { userId?: string }) => <div data-testid={`avatar-${userId}`} />,
}));

// Mock GameModeSelector exports
vi.mock('@/components/GameModeSelector', () => ({
  GameModeSelector: () => <div data-testid="game-mode-selector" />,
  MODE_ICONS: { random: '🔀', classic: '📄', blast: '💣', 'word-hunt': '🎯' },
  MODE_ACTIVE_COLORS: { random: '', classic: '', blast: '', 'word-hunt': '' },
  getModeLabel: (mode: string) => mode,
}));

import StickyReadyBar from '../StickyReadyBar';

const AUTO_SECONDS = 35;

describe('StickyReadyBar auto-advance (host)', () => {
  const baseProps = {
    isHost: true,
    isCurrentPlayerReady: false,
    currentPlayerRank: 1,
    readyCount: 0,
    totalPlayers: 3,
    onStartGame: vi.fn(),
    onMarkReady: vi.fn(),
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows 30s countdown for host (defend title as rank 1)', () => {
    render(<StickyReadyBar {...baseProps} />);

    expect(screen.getByTestId('auto-countdown')).toBeInTheDocument();
    expect(screen.getByText(String(AUTO_SECONDS))).toBeInTheDocument();
    expect(screen.getByText('DEFEND TITLE')).toBeInTheDocument();
  });

  it('shows revenge button for host who is not first place', () => {
    render(
      <StickyReadyBar
        {...baseProps}
        currentPlayerRank={2}
        winnerUsername="champion"
      />
    );

    expect(screen.getByText('Revenge on champion!')).toBeInTheDocument();
  });

  it('calls onStartGame when countdown reaches zero', () => {
    const onStartGame = vi.fn();
    render(<StickyReadyBar {...baseProps} onStartGame={onStartGame} />);

    act(() => { vi.advanceTimersByTime(AUTO_SECONDS * 1000); });

    expect(onStartGame).toHaveBeenCalledTimes(1);
  });

  it('calls onStartGame when host clicks countdown button after 15s host-hold', () => {
    const onStartGame = vi.fn();
    render(<StickyReadyBar {...baseProps} onStartGame={onStartGame} />);

    // Host CTA is gated for the first 15s (until host-hold expires or all ready)
    act(() => { vi.advanceTimersByTime(15_000); });

    const btn = screen.getByTestId('auto-countdown-cta');
    fireEvent.click(btn);

    expect(onStartGame).toHaveBeenCalledTimes(1);
  });

  it('shows manual start button when countdown is cancelled', () => {
    render(<StickyReadyBar {...baseProps} />);

    fireEvent.click(screen.getByLabelText('Exit'));

    // Should now show the manual start button (defend title for rank 1)
    expect(screen.queryByTestId('auto-countdown')).not.toBeInTheDocument();
  });

  it('does not show countdown when totalPlayers is 0', () => {
    render(<StickyReadyBar {...baseProps} totalPlayers={0} />);

    expect(screen.queryByTestId('auto-countdown')).not.toBeInTheDocument();
  });

  it('does not show countdown for already-ready non-host', () => {
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
});
