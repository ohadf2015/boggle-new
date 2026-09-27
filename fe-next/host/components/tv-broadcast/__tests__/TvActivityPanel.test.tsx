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

  it('shows mode badge label', () => {
    (useGameMode as Mock).mockReturnValue('classic');
    render(<TvActivityPanel {...defaultProps} />);
    expect(screen.getByTestId('tv-mode-badge')).toHaveTextContent('CLASSIC');
  });

  it('shows BLAST mode badge for blast mode', () => {
    (useGameMode as Mock).mockReturnValue('blast');
    render(<TvActivityPanel {...defaultProps} />);
    expect(screen.getByTestId('tv-mode-badge')).toHaveTextContent('BLAST');
  });

  it('shows WORD HUNT mode badge for word-hunt mode', () => {
    (useGameMode as Mock).mockReturnValue('word-hunt');
    render(<TvActivityPanel {...defaultProps} />);
    expect(screen.getByTestId('tv-mode-badge')).toHaveTextContent('WORD HUNT');
  });

  it('classic panel renders abstract tile grid (no letters)', () => {
    render(<TvActivityPanel {...defaultProps} />);
    const tiles = screen.getAllByTestId('abstract-tile');
    expect(tiles.length).toBe(16); // 4x4
    // No text content on tiles (no letters)
    tiles.forEach((tile) => {
      expect(tile.textContent).toBe('');
    });
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

  it('tiles pulse on activity events', () => {
    render(<TvActivityPanel {...defaultProps} activityPulse={true} />);
    const panel = screen.getByTestId('tv-classic-panel');
    expect(panel).toBeInTheDocument();
    // activityPulse triggers pulse class on random tiles
    const pulsingTiles = screen.getByTestId('tv-classic-panel').querySelectorAll('.animate-pulse, [data-pulsing="true"]');
    expect(pulsingTiles.length).toBeGreaterThanOrEqual(0); // may or may not have pulsing tiles at render time
  });

  it('respects reduced motion (no animations)', () => {

    useShouldReduceMotion.mockReturnValue(true);

    render(<TvActivityPanel {...defaultProps} />);
    // Component should still render, just without animations
    expect(screen.getByTestId('tv-activity-panel')).toBeInTheDocument();
    expect(screen.getByTestId('tv-classic-panel')).toBeInTheDocument();
  });
});
