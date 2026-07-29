/**
 * StickyReadyBar Auto-Ready Countdown Tests (Brawl Stars-inspired)
 *
 * Tests the unified 35s auto-countdown flow:
 * - All players (host + non-host) see a 35s countdown
 * - Non-host players are auto-readied when countdown hits 0
 * - Host auto-starts when countdown hits 0
 * - Players can manually ready/start before countdown expires
 * - Cancel button opts out of auto-countdown
 * - Bots are always counted as ready
 * - Non-1st-place players see "Revenge {winner}"
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

// Mock GameModeSelector exports
vi.mock('@/components/GameModeSelector', () => ({
  GameModeSelector: () => <div data-testid="game-mode-selector" />,
  MODE_ICONS: { random: '🔀', classic: '📄', blast: '💣', 'word-hunt': '🎯' },
  MODE_ACTIVE_COLORS: { random: '', classic: '', blast: '', 'word-hunt': '' },
  getModeLabel: (mode: string) => mode,
}));

// Mock Avatar
vi.mock('@/components/Avatar', () => ({
  __esModule: true,
  default: ({ userId }: { userId?: string }) => <div data-testid={`avatar-${userId}`} />,
}));

import StickyReadyBar from '../StickyReadyBar';

const AUTO_SECONDS = 35;

describe('StickyReadyBar auto-ready countdown (Brawl Stars flow)', () => {
  const baseProps = {
    isHost: false,
    isCurrentPlayerReady: false,
    currentPlayerRank: 2,
    winnerUsername: 'winner',
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

  // --- Non-host auto-ready ---

  it('shows auto-ready countdown for non-host players who have not readied', () => {
    render(<StickyReadyBar {...baseProps} />);

    expect(screen.getByTestId('auto-countdown')).toBeInTheDocument();
    expect(screen.getByText(String(AUTO_SECONDS))).toBeInTheDocument();
  });

  it('shows revenge text for non-first-place players', () => {
    render(<StickyReadyBar {...baseProps} />);

    expect(screen.getByText('Revenge on winner!')).toBeInTheDocument();
  });

  it('shows defend title for first-place player', () => {
    render(
      <StickyReadyBar
        {...baseProps}
        currentPlayerRank={1}
        winnerUsername={undefined}
      />
    );

    expect(screen.getByText('DEFEND TITLE')).toBeInTheDocument();
  });

  it('auto-marks player as ready when countdown reaches 0', () => {
    const onMarkReady = vi.fn();
    render(<StickyReadyBar {...baseProps} onMarkReady={onMarkReady} />);

    act(() => { vi.advanceTimersByTime(AUTO_SECONDS * 1000); });

    expect(onMarkReady).toHaveBeenCalledTimes(1);
  });

  it('clicking the CTA button readies immediately (skips countdown)', () => {
    const onMarkReady = vi.fn();
    render(<StickyReadyBar {...baseProps} onMarkReady={onMarkReady} />);

    const btn = screen.getByTestId('auto-countdown-cta');
    fireEvent.click(btn);

    expect(onMarkReady).toHaveBeenCalledTimes(1);
  });

  it('does not show auto-ready countdown when player is already ready', () => {
    render(<StickyReadyBar {...baseProps} isCurrentPlayerReady={true} />);

    expect(screen.queryByTestId('auto-countdown')).not.toBeInTheDocument();
    expect(screen.getByText('YOU ARE READY')).toBeInTheDocument();
  });

  it('cancelling countdown shows manual revenge button', () => {
    render(<StickyReadyBar {...baseProps} />);

    fireEvent.click(screen.getByTestId('auto-countdown-cancel'));

    expect(screen.queryByTestId('auto-countdown')).not.toBeInTheDocument();
    // Should show the revenge button (manual, no countdown)
    expect(screen.getByText('Revenge on winner!')).toBeInTheDocument();
  });

  // --- Host gets same 35s countdown ---

  it('host also gets 35s countdown (auto-starts game)', () => {
    render(
      <StickyReadyBar
        {...baseProps}
        isHost={true}
        currentPlayerRank={1}
      />
    );

    expect(screen.getByTestId('auto-countdown')).toBeInTheDocument();
    expect(screen.getByText(String(AUTO_SECONDS))).toBeInTheDocument();
  });

  it('host auto-starts game when countdown hits 0', () => {
    const onStartGame = vi.fn();
    render(
      <StickyReadyBar
        {...baseProps}
        isHost={true}
        onStartGame={onStartGame}
      />
    );

    act(() => { vi.advanceTimersByTime(AUTO_SECONDS * 1000); });
    expect(onStartGame).toHaveBeenCalledTimes(1);
  });

  // --- Countdown displays correctly ---

  it('countdown decrements each second', () => {
    render(<StickyReadyBar {...baseProps} />);

    expect(screen.getByText(String(AUTO_SECONDS))).toBeInTheDocument();

    act(() => { vi.advanceTimersByTime(1000); });
    expect(screen.getByText(String(AUTO_SECONDS - 1))).toBeInTheDocument();

    act(() => { vi.advanceTimersByTime(1000); });
    expect(screen.getByText(String(AUTO_SECONDS - 2))).toBeInTheDocument();
  });

  // --- Edge cases ---

  it('does not auto-ready if countdown cancelled then timer fires', () => {
    const onMarkReady = vi.fn();
    render(<StickyReadyBar {...baseProps} onMarkReady={onMarkReady} />);

    fireEvent.click(screen.getByTestId('auto-countdown-cancel'));

    act(() => { vi.advanceTimersByTime(AUTO_SECONDS * 1000); });

    expect(onMarkReady).not.toHaveBeenCalled();
  });

  it('does not show auto-ready for bots-only (totalPlayers=0)', () => {
    render(<StickyReadyBar {...baseProps} totalPlayers={0} />);

    expect(screen.queryByTestId('auto-countdown')).not.toBeInTheDocument();
  });

  // --- Bot counting ---

  it('counts bots as ready in the avatar strip', () => {
    render(
      <StickyReadyBar
        {...baseProps}
        readyCount={1}
        totalPlayers={3}
        players={[
          { username: 'human1' },
          { username: 'bot1', isBot: true },
          { username: 'bot2', isBot: true },
        ]}
        readyUsernames={['human1']}
      />
    );

    // readyCount=1 + 2 bots = 3, totalPlayers=3 → "3 / 3 Ready"
    expect(screen.getByText(/3 \/ 3/)).toBeInTheDocument();
  });
});
