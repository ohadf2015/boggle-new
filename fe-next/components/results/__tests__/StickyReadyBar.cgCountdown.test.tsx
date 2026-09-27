/**
 * StickyReadyBar — CrazyGames-specific countdown tests.
 *
 * On CG the result-screen pause is dropped from 35s to 15s. Counter-intuitive
 * but correct: shorter result pause = more matches per session = more CG
 * playtime metric. Default (non-CG) behavior is preserved.
 */

import React from 'react';
import { vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const map: Record<string, string> = {
        'results.playAgain': 'START GAME',
        'results.imReady': "I'M READY",
        'results.youAreReady': 'YOU ARE READY',
        'results.revengeRematch': `Revenge on ${params?.player ?? ''}!`,
        'results.defendTitle': 'DEFEND TITLE',
        'autoPlay.exit': 'Exit',
        'results.ready': 'Ready',
      };
      return map[key] ?? key;
    },
    dir: 'ltr' as const,
  }),
}));

vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: React.forwardRef(function MB({ children, ...props }: any, ref: any) {
      return <button ref={ref} {...props}>{children}</button>;
    }),
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useReducedMotion: () => false,
}));

vi.mock('@/components/Avatar', () => ({
  __esModule: true,
  default: () => <div />,
}));

vi.mock('@/components/GameModeSelector', () => ({
  GameModeSelector: () => null,
  MODE_ICONS: { random: '🔀', classic: '📄', blast: '💣', 'word-hunt': '🎯' },
  MODE_ACTIVE_COLORS: { random: '', classic: '', blast: '', 'word-hunt': '' },
  getModeLabel: (m: string) => m,
}));

const mockCrazyGames = vi.fn();
vi.mock('@/components/CrazyGamesSDK', () => ({
  useCrazyGames: () => mockCrazyGames(),
}));

import StickyReadyBar from '../StickyReadyBar';

const baseProps = {
  isHost: true,
  isCurrentPlayerReady: false,
  currentPlayerRank: 1,
  readyCount: 0,
  totalPlayers: 3,
  onStartGame: vi.fn(),
  onMarkReady: vi.fn(),
};

describe('StickyReadyBar CG countdown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    sessionStorage.clear();
    mockCrazyGames.mockReturnValue({ isOnCrazyGamesPlatform: false });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('uses 35s default countdown off CrazyGames', () => {
    render(<StickyReadyBar {...baseProps} />);
    expect(screen.getByText('35')).toBeInTheDocument();
  });

  it('uses 20s shortened countdown on CrazyGames embed', () => {
    mockCrazyGames.mockReturnValue({ isOnCrazyGamesPlatform: true });
    render(<StickyReadyBar {...baseProps} />);
    expect(screen.getByText('20')).toBeInTheDocument();
    expect(screen.queryByText('35')).not.toBeInTheDocument();
  });

  it('auto-starts after 20s on CG', () => {
    mockCrazyGames.mockReturnValue({ isOnCrazyGamesPlatform: true });
    const onStartGame = vi.fn();
    render(<StickyReadyBar {...baseProps} onStartGame={onStartGame} />);
    act(() => { vi.advanceTimersByTime(20_000); });
    expect(onStartGame).toHaveBeenCalledTimes(1);
  });

  it('does NOT auto-start before 20s on CG', () => {
    mockCrazyGames.mockReturnValue({ isOnCrazyGamesPlatform: true });
    const onStartGame = vi.fn();
    render(<StickyReadyBar {...baseProps} onStartGame={onStartGame} />);
    act(() => { vi.advanceTimersByTime(19_000); });
    expect(onStartGame).not.toHaveBeenCalled();
  });

  it('on CG: ignores prior session cancel flag — each round restarts countdown', () => {
    mockCrazyGames.mockReturnValue({ isOnCrazyGamesPlatform: true });
    sessionStorage.setItem('mp-auto-advance-cancelled', '1');
    render(<StickyReadyBar {...baseProps} />);
    expect(screen.getByTestId('auto-countdown')).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();
  });

  it('off CG: respects prior session cancel flag', () => {
    mockCrazyGames.mockReturnValue({ isOnCrazyGamesPlatform: false });
    sessionStorage.setItem('mp-auto-advance-cancelled', '1');
    render(<StickyReadyBar {...baseProps} />);
    expect(screen.queryByTestId('auto-countdown')).not.toBeInTheDocument();
  });
});
