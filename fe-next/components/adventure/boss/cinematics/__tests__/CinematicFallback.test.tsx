/**
 * CinematicFallback Component Tests
 *
 * Tests for the CSS/Framer Motion fallback that replaces Remotion
 * when the Player stalls (black screen on mobile).
 */

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      // Forward data-testid and other relevant props
      const safeProps: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(props)) {
        if (key.startsWith('data-') || key === 'className' || key === 'style' || key === 'onClick' || key === 'role' || key === 'aria-valuenow' || key === 'aria-valuemin' || key === 'aria-valuemax' || key === 'aria-label') {
          safeProps[key] = value;
        }
      }
      return <div {...safeProps}>{children}</div>;
    },
    h1: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const safeProps: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(props)) {
        if (key.startsWith('data-') || key === 'className') {
          safeProps[key] = value;
        }
      }
      return <h1 {...safeProps}>{children}</h1>;
    },
    span: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const safeProps: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(props)) {
        if (key.startsWith('data-') || key === 'className') {
          safeProps[key] = value;
        }
      }
      return <span {...safeProps}>{children}</span>;
    },
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

// Mock LanguageContext
vi.mock('../../../../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'adventure.bosses.cinematics.skip': 'Skip',
        'adventure.bosses.cinematics.skipIn': `Skip in ${params?.seconds || 2}...`,
        'adventure.bosses.cinematics.progress': 'Cinematic progress',
        'adventure.bosses.cinematics.fallbackTitle.victory': 'VICTORY!',
        'adventure.bosses.cinematics.fallbackTitle.defeat': "Time's Up!",
        'adventure.bosses.cinematics.fallbackTitle.bossEntrance': 'Boss Approaches!',
        'adventure.bosses.cinematics.fallbackTitle.bossDefeat': 'Boss Defeated!',
        'adventure.bosses.cinematics.fallbackTitle.worldUnlock': 'World Unlocked!',
        'adventure.bosses.cinematics.fallbackStats.score': 'Score',
        'adventure.bosses.cinematics.fallbackStats.wordsFound': 'Words Found',
      };
      return translations[key] || key;
    },
  }),
}));

vi.useFakeTimers();

import { CinematicFallback, CinematicFallbackProps } from '../CinematicFallback';

describe('CinematicFallback', () => {
  const defaultProps: CinematicFallbackProps = {
    cinematicType: 'victory',
    compositionProps: {
      finalScore: 1500,
      wordsFound: 12,
    },
    durationSeconds: 8,
    onComplete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    jest.clearAllTimers();
  });

  describe('rendering', () => {
    it('should render the fallback container', () => {
      render(<CinematicFallback {...defaultProps} />);

      expect(screen.getByTestId('cinematic-fallback')).toBeInTheDocument();
    });

    it('should render the title for victory type', () => {
      render(<CinematicFallback {...defaultProps} cinematicType="victory" />);

      expect(screen.getByText('VICTORY!')).toBeInTheDocument();
    });

    it('should render the title for defeat type', () => {
      render(<CinematicFallback {...defaultProps} cinematicType="defeat" />);

      expect(screen.getByText("Time's Up!")).toBeInTheDocument();
    });

    it('should render score stat from compositionProps', () => {
      render(<CinematicFallback {...defaultProps} />);

      expect(screen.getByText('Score')).toBeInTheDocument();
      expect(screen.getByText('1500')).toBeInTheDocument();
    });

    it('should render wordsFound stat from compositionProps', () => {
      render(<CinematicFallback {...defaultProps} />);

      expect(screen.getByText('Words Found')).toBeInTheDocument();
      expect(screen.getByText('12')).toBeInTheDocument();
    });

    it('should render a progress bar', () => {
      render(<CinematicFallback {...defaultProps} />);

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  describe('skip button', () => {
    it('should render skip button', () => {
      render(<CinematicFallback {...defaultProps} />);

      expect(screen.getByTestId('fallback-skip-button')).toBeInTheDocument();
    });

    it('should disable skip button initially', () => {
      render(<CinematicFallback {...defaultProps} />);

      expect(screen.getByTestId('fallback-skip-button')).toBeDisabled();
    });

    it('should enable skip button after 2 seconds', () => {
      render(<CinematicFallback {...defaultProps} />);

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(screen.getByTestId('fallback-skip-button')).not.toBeDisabled();
    });

    it('should call onComplete when skip button is clicked after delay', () => {
      const onComplete = vi.fn();
      render(<CinematicFallback {...defaultProps} onComplete={onComplete} />);

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      fireEvent.click(screen.getByTestId('fallback-skip-button'));

      expect(onComplete).toHaveBeenCalledTimes(1);
    });
  });

  describe('auto-completion', () => {
    it('should call onComplete after durationSeconds', () => {
      const onComplete = vi.fn();
      render(
        <CinematicFallback {...defaultProps} durationSeconds={5} onComplete={onComplete} />
      );

      expect(onComplete).not.toHaveBeenCalled();

      // Advance to just past the duration
      act(() => {
        vi.advanceTimersByTime(5100);
      });

      expect(onComplete).toHaveBeenCalledTimes(1);
    });
  });

  describe('different cinematic types', () => {
    it('should render bossEntrance title', () => {
      render(<CinematicFallback {...defaultProps} cinematicType="bossEntrance" />);

      expect(screen.getByText('Boss Approaches!')).toBeInTheDocument();
    });

    it('should render bossDefeat title', () => {
      render(<CinematicFallback {...defaultProps} cinematicType="bossDefeat" />);

      expect(screen.getByText('Boss Defeated!')).toBeInTheDocument();
    });

    it('should render worldUnlock title', () => {
      render(<CinematicFallback {...defaultProps} cinematicType="worldUnlock" />);

      expect(screen.getByText('World Unlocked!')).toBeInTheDocument();
    });
  });

  describe('boss image and name display', () => {
    const bossProps: CinematicFallbackProps = {
      cinematicType: 'bossEntrance',
      compositionProps: {
        bossImagePath: '/images/bosses/dragon.png',
        bossName: 'Fire Dragon',
      },
      durationSeconds: 8,
      onComplete: vi.fn(),
    };

    it('should render boss image when cinematicType is bossEntrance', () => {
      render(<CinematicFallback {...bossProps} />);

      const img = screen.getByTestId('fallback-boss-image');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', '/images/bosses/dragon.png');
    });

    it('should render boss name when cinematicType is bossEntrance', () => {
      render(<CinematicFallback {...bossProps} />);

      expect(screen.getByTestId('fallback-boss-name')).toBeInTheDocument();
      expect(screen.getByText('Fire Dragon')).toBeInTheDocument();
    });

    it('should render boss image when cinematicType is bossDefeat', () => {
      render(
        <CinematicFallback
          {...bossProps}
          cinematicType="bossDefeat"
        />
      );

      const img = screen.getByTestId('fallback-boss-image');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', '/images/bosses/dragon.png');
    });

    it('should render boss name when cinematicType is bossDefeat', () => {
      render(
        <CinematicFallback
          {...bossProps}
          cinematicType="bossDefeat"
        />
      );

      expect(screen.getByText('Fire Dragon')).toBeInTheDocument();
    });

    it('should not render boss image for non-boss cinematics', () => {
      render(
        <CinematicFallback
          {...bossProps}
          cinematicType="victory"
        />
      );

      expect(screen.queryByTestId('fallback-boss-image')).not.toBeInTheDocument();
    });

    it('should not render boss section when bossImagePath is missing', () => {
      render(
        <CinematicFallback
          {...defaultProps}
          cinematicType="bossEntrance"
        />
      );

      expect(screen.queryByTestId('fallback-boss-image')).not.toBeInTheDocument();
    });
  });
});
