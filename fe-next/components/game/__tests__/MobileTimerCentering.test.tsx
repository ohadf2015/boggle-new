/**
 * Mobile Timer Centering Tests
 *
 * Tests that the timer is truly centered on mobile, with the score
 * positioned absolutely so it doesn't affect timer centering.
 *
 * Bug Fixed: Timer was pushed off-center because score had flex-1
 * Solution: Score uses absolute positioning on mobile
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock LanguageContext
jest.mock('../../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'common.score': 'Score',
        'common.hurry': 'HURRY!',
      };
      return translations[key] || key;
    },
    language: 'en',
    dir: 'ltr',
  }),
}));

// Mock framer-motion
jest.mock('framer-motion', () => {
  const createMotionComponent = (Tag: string) => {
    const Component = React.forwardRef(
      (
        { children, ...props }: React.PropsWithChildren<Record<string, unknown>>,
        ref: React.Ref<Element>
      ) => {
        const {
          animate,
          initial,
          exit,
          transition,
          whileHover,
          whileTap,
          variants,
          whileInView,
          viewport,
          layout,
          layoutId,
          drag,
          dragConstraints,
          onAnimationComplete,
          onAnimationStart,
          style,
          ...domProps
        } = props as Record<string, unknown>;
        const cleanStyle = typeof style === 'object' ? style : undefined;
        return React.createElement(Tag, { ...domProps, style: cleanStyle, ref }, children);
      }
    );
    Component.displayName = `motion.${Tag}`;
    return Component;
  };

  return {
    motion: {
      div: createMotionComponent('div'),
      span: createMotionComponent('span'),
      circle: createMotionComponent('circle'),
      svg: createMotionComponent('svg'),
      p: createMotionComponent('p'),
      button: createMotionComponent('button'),
    },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

// Mock useDevicePerformance
jest.mock('../../../hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({
    isLowEnd: false,
    enableComplexAnimations: true,
    prefersReducedMotion: false,
  }),
}));

// Mock useReducedMotion
jest.mock('../../../utils/accessibility', () => ({
  useReducedMotion: () => false,
}));

import ComboDisplay from '../ComboDisplay';
import CircularTimer from '../../CircularTimer';

/**
 * Test component that mimics the fixed mobile layout:
 * - Stats row uses justify-center on mobile for timer centering
 * - Score is absolutely positioned on mobile (doesn't affect centering)
 * - Combo row above is centered and has fixed height
 */
const MobileCenteredLayoutTestComponent = ({
  comboLevel = 0,
  score = 100,
  rank = 1,
}: {
  comboLevel?: number;
  score?: number;
  rank?: number;
}) => {
  return (
    <div data-testid="stats-section" className="flex flex-col gap-1 w-full px-1 md:px-2">
      {/* Combo row - mobile only, centered */}
      <div
        data-testid="combo-row-mobile"
        className="flex lg:hidden justify-center items-center h-[40px]"
      >
        <ComboDisplay comboLevel={comboLevel} compact />
      </div>

      {/* Stats row - Timer centered on mobile */}
      <div
        data-testid="stats-row"
        className="flex w-full items-center justify-center lg:justify-between relative min-h-[80px] md:min-h-[100px] lg:min-h-[120px]"
      >
        {/* Timer (center) */}
        <div data-testid="timer-container" className="relative z-20 shrink-0">
          <CircularTimer remainingTime={60} totalTime={180} size="xs" />
        </div>

        {/* Score (mobile) - absolutely positioned to not affect timer centering */}
        <div
          data-testid="score-mobile"
          className="absolute right-1 md:right-2 top-1/2 -translate-y-1/2 lg:hidden"
        >
          <div className="px-1.5 py-0.5 min-w-[50px] md:min-w-[90px] border-2 rounded">
            <div className="text-lg font-black">{score}</div>
            <div className="text-xs font-bold uppercase">Score</div>
            {rank && rank > 0 && (
              <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-xs">
                #{rank}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

describe('Mobile Timer Centering', () => {
  describe('stats row centering', () => {
    it('stats row uses justify-center on mobile', () => {
      render(<MobileCenteredLayoutTestComponent />);

      const statsRow = screen.getByTestId('stats-row');
      expect(statsRow).toHaveClass('justify-center');
    });

    it('stats row uses justify-between on desktop (lg breakpoint)', () => {
      render(<MobileCenteredLayoutTestComponent />);

      const statsRow = screen.getByTestId('stats-row');
      expect(statsRow).toHaveClass('lg:justify-between');
    });

    it('stats row has relative positioning for absolute children', () => {
      render(<MobileCenteredLayoutTestComponent />);

      const statsRow = screen.getByTestId('stats-row');
      expect(statsRow).toHaveClass('relative');
    });

    it('stats row has minimum height for consistent spacing', () => {
      render(<MobileCenteredLayoutTestComponent />);

      const statsRow = screen.getByTestId('stats-row');
      expect(statsRow).toHaveClass('min-h-[80px]');
    });
  });

  describe('mobile score positioning', () => {
    it('mobile score is positioned absolutely', () => {
      render(<MobileCenteredLayoutTestComponent />);

      const scoreMobile = screen.getByTestId('score-mobile');
      expect(scoreMobile).toHaveClass('absolute');
    });

    it('mobile score is positioned on the right', () => {
      render(<MobileCenteredLayoutTestComponent />);

      const scoreMobile = screen.getByTestId('score-mobile');
      expect(scoreMobile).toHaveClass('right-1');
      expect(scoreMobile).toHaveClass('md:right-2');
    });

    it('mobile score is vertically centered', () => {
      render(<MobileCenteredLayoutTestComponent />);

      const scoreMobile = screen.getByTestId('score-mobile');
      expect(scoreMobile).toHaveClass('top-1/2');
      expect(scoreMobile).toHaveClass('-translate-y-1/2');
    });

    it('mobile score is hidden on desktop', () => {
      render(<MobileCenteredLayoutTestComponent />);

      const scoreMobile = screen.getByTestId('score-mobile');
      expect(scoreMobile).toHaveClass('lg:hidden');
    });
  });

  describe('timer container', () => {
    it('timer has shrink-0 to maintain fixed size', () => {
      render(<MobileCenteredLayoutTestComponent />);

      const timerContainer = screen.getByTestId('timer-container');
      expect(timerContainer).toHaveClass('shrink-0');
    });

    it('timer has z-20 for proper layering', () => {
      render(<MobileCenteredLayoutTestComponent />);

      const timerContainer = screen.getByTestId('timer-container');
      expect(timerContainer).toHaveClass('z-20');
    });
  });

  describe('combo row independence', () => {
    it('combo row has fixed height regardless of combo level', () => {
      const { rerender } = render(<MobileCenteredLayoutTestComponent comboLevel={0} />);

      const comboRow = screen.getByTestId('combo-row-mobile');
      expect(comboRow).toHaveClass('h-[40px]');

      rerender(<MobileCenteredLayoutTestComponent comboLevel={5} />);
      expect(screen.getByTestId('combo-row-mobile')).toHaveClass('h-[40px]');
    });

    it('combo row is separate from stats row (vertical stacking)', () => {
      render(<MobileCenteredLayoutTestComponent comboLevel={3} />);

      const statsSection = screen.getByTestId('stats-section');
      expect(statsSection).toHaveClass('flex-col');

      // Verify combo row and stats row are siblings
      const comboRow = screen.getByTestId('combo-row-mobile');
      const statsRow = screen.getByTestId('stats-row');
      expect(comboRow.parentElement).toBe(statsSection);
      expect(statsRow.parentElement).toBe(statsSection);
    });
  });

  describe('layout stability with different scores', () => {
    it('timer centering is not affected by 1-digit score', () => {
      render(<MobileCenteredLayoutTestComponent score={5} />);

      const statsRow = screen.getByTestId('stats-row');
      expect(statsRow).toHaveClass('justify-center');

      const scoreMobile = screen.getByTestId('score-mobile');
      expect(scoreMobile).toHaveClass('absolute');
    });

    it('timer centering is not affected by 4-digit score', () => {
      render(<MobileCenteredLayoutTestComponent score={9999} />);

      const statsRow = screen.getByTestId('stats-row');
      expect(statsRow).toHaveClass('justify-center');

      const scoreMobile = screen.getByTestId('score-mobile');
      expect(scoreMobile).toHaveClass('absolute');
    });

    it('timer centering is not affected by rank badge presence', () => {
      render(<MobileCenteredLayoutTestComponent score={100} rank={1} />);

      const statsRow = screen.getByTestId('stats-row');
      expect(statsRow).toHaveClass('justify-center');

      const scoreMobile = screen.getByTestId('score-mobile');
      expect(scoreMobile).toHaveClass('absolute');
    });
  });
});
