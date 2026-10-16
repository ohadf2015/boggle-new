import { vi, type Mock, } from 'vitest';
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import TvActivityPanel from '../TvActivityPanel';
import { useGameMode } from '@/hooks/gameState/store';
import { useShouldReduceMotion } from '@/contexts/AccessibilityContext';

// Mock useGameMode
vi.mock('@/hooks/gameState/store', () => ({
  useGameMode: vi.fn(() => 'classic'),
}));

// Mock AdaptiveMotion
vi.mock('@/components/motion/AdaptiveMotion', () => ({
  AdaptiveMotion: {
    div: React.forwardRef(function MockDiv(
      { children, className, style, ...rest }: any,
      ref: any
    ) {
      return (
        <div ref={ref} className={className} style={style} data-testid={rest['data-testid']} role={rest.role} aria-label={rest['aria-label']}>
          {children}
        </div>
      );
    }),
  },
  AdaptiveAnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock framer-motion
vi.mock('framer-motion', () => {
  const actual = vi.importActual('framer-motion');
  return {
    ...actual,
    m: {
      div: React.forwardRef(function MotionDiv(
        { children, className, style, ...rest }: any,
        ref: any
      ) {
        return (
          <div ref={ref} className={className} style={style} data-testid={rest['data-testid']} role={rest.role} aria-label={rest['aria-label']}>
            {children}
          </div>
        );
      }),
      li: ({ children, className, ...rest }: any) => <li className={className} data-testid={rest['data-testid']}>{children}</li>,
      span: React.forwardRef(function MotionSpan(
        { children, className, ...rest }: any,
        ref: any
      ) {
        return <span className={className} data-testid={rest['data-testid']}>{children}</span>;
      }),
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
    useReducedMotion: () => false,
  };
});

// Mock AccessibilityContext
vi.mock('@/contexts/AccessibilityContext', () => ({
  useSuppressTimerUrgency: () => false,
  useShouldReduceMotion: vi.fn(() => false),
}));

const mockT = (key: string) => {
  const translations: Record<string, string> = {
    'tvBroadcast.modeClassic': 'CLASSIC',
    'tvBroadcast.modeBlast': 'BLAST',
    'tvBroadcast.modeWordHunt': 'WORD HUNT',
    'tvBroadcast.totalWords': 'Total Words',
    'tvBroadcast.avgLength': 'Avg Length',
    'tvBroadcast.activeCombos': 'Active Combos',
    'tvBroadcast.highestCombo': 'Highest Combo',
    'tvBroadcast.wordsHunted': 'Words Hunted',
    'tvBroadcast.hunting': 'HUNTING',
    'tvBroadcast.activityPanel': 'Activity Feed',
  };
  return translations[key] || key;
};

const defaultProps = {
  playerScores: { alice: 100, bob: 50 },
  playerWordCounts: { alice: 10, bob: 5 },
  socket: null,
  t: mockT,
};

describe('TvActivityPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useGameMode as Mock).mockReturnValue('classic');
  });

  it('renders classic panel when gameMode is classic', () => {
    (useGameMode as Mock).mockReturnValue('classic');
    render(<TvActivityPanel {...defaultProps} />);
    expect(screen.getByTestId('tv-classic-panel')).toBeInTheDocument();
  });

  it('renders classic panel when gameMode is null', () => {
    (useGameMode as Mock).mockReturnValue(null);
    render(<TvActivityPanel {...defaultProps} />);
    expect(screen.getByTestId('tv-classic-panel')).toBeInTheDocument();
  });

  it('renders blast panel when gameMode is blast', () => {
    (useGameMode as Mock).mockReturnValue('blast');
    render(<TvActivityPanel {...defaultProps} />);
    expect(screen.getByTestId('tv-blast-panel')).toBeInTheDocument();
  });

  it('renders word hunt panel when gameMode is word-hunt', () => {
    (useGameMode as Mock).mockReturnValue('word-hunt');
    render(<TvActivityPanel {...defaultProps} />);
    expect(screen.getByTestId('tv-wordhunt-panel')).toBeInTheDocument();
  });

  it('leaves the mode label to the header instead of repeating it on the panel', () => {
    for (const mode of ['classic', 'blast', 'word-hunt']) {
      (useGameMode as Mock).mockReturnValue(mode);
      const { unmount } = render(<TvActivityPanel {...defaultProps} />);
      expect(screen.queryByTestId('tv-mode-badge')).toBeNull();
      unmount();
    }
  });

  it('classic panel drops each found word as blank tiles, never the letters', () => {
    const handlers: Record<string, (d: any) => void> = {};
    const socket = { on: (ev: string, fn: any) => { handlers[ev] = fn; }, off: vi.fn() } as any;
    const { container } = render(<TvActivityPanel {...defaultProps} socket={socket} />);
    act(() => handlers.playerFoundWordBatch({ words: [{ username: 'maya', word: 'planet', comboLevel: 0 }] }));
    const row = screen.getByTestId('word-drop');
    expect(row.querySelectorAll('[data-testid="word-drop-tile"]')).toHaveLength(6);
    expect(container.textContent?.toLowerCase()).not.toContain('planet');
  });

  it('averages the real word lengths from the batch payload', () => {
    const handlers: Record<string, (d: any) => void> = {};
    const socket = { on: (ev: string, fn: any) => { handlers[ev] = fn; }, off: vi.fn() } as any;
    render(<TvActivityPanel {...defaultProps} socket={socket} />);
    act(() => handlers.playerFoundWordBatch({ words: [{ username: 'a', word: 'cat' }, { username: 'b', word: 'planets' }] }));
    expect(screen.getByTestId('word-drop-stat-avg')).toHaveTextContent('5.0');
    expect(screen.getByTestId('word-drop-stat-longest')).toHaveTextContent('7');
  });

  it('blast panel renders cascade visualization area', () => {
    (useGameMode as Mock).mockReturnValue('blast');
    render(<TvActivityPanel {...defaultProps} />);
    expect(screen.getByTestId('blast-cascade-area')).toBeInTheDocument();
  });

  it('word hunt panel renders search visualization', () => {
    (useGameMode as Mock).mockReturnValue('word-hunt');
    render(<TvActivityPanel {...defaultProps} />);
    expect(screen.getByTestId('wordhunt-radar')).toBeInTheDocument();
  });

  it('shows aggregate stats in classic panel', () => {
    render(<TvActivityPanel {...defaultProps} />);
    expect(screen.getByText('Total Words')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument(); // 10 + 5
  });

  it('respects reduced motion (no animations)', () => {

    useShouldReduceMotion.mockReturnValue(true);

    render(<TvActivityPanel {...defaultProps} />);
    // Component should still render, just without animations
    expect(screen.getByTestId('tv-activity-panel')).toBeInTheDocument();
    expect(screen.getByTestId('tv-classic-panel')).toBeInTheDocument();
  });
});
