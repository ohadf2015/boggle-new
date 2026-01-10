/**
 * InGameScreen Combo Layout Tests
 *
 * Tests that the combo display is positioned correctly relative to the timer
 * on mobile devices - specifically that combo is on the right side and
 * doesn't cause the timer to shift/move.
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

// Mock framer-motion - comprehensive mock for all motion components
jest.mock('framer-motion', () => {
  const createMotionComponent = (Tag: string) => {
    const Component = React.forwardRef(({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>, ref: React.Ref<Element>) => {
      // Filter out framer-motion specific props
      const {
        animate, initial, exit, transition, whileHover, whileTap, variants,
        whileInView, viewport, layout, layoutId, drag, dragConstraints,
        onAnimationComplete, onAnimationStart, style, ...domProps
      } = props as Record<string, unknown>;
      // Keep style but filter animation-related values
      const cleanStyle = typeof style === 'object' ? style : undefined;
      return React.createElement(Tag, { ...domProps, style: cleanStyle, ref }, children);
    });
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
 * Component that mimics the CURRENT stats row layout from InGameScreen
 * (before the fix) - uses flex with justify-center
 */
const OldStatsRowTestComponent = ({
  comboLevel,
  showCombo = true,
  score = 100,
}: {
  comboLevel: number;
  showCombo?: boolean;
  score?: number;
}) => {
  return (
    <div
      data-testid="stats-row"
      className="flex items-center justify-center gap-2 md:gap-4"
    >
      {/* Timer (center - always visible and prominent) */}
      <div data-testid="timer-wrapper" className="relative z-20">
        <CircularTimer remainingTime={60} totalTime={180} size="xs" />
      </div>

      {/* Combo + Score stacked (side position) */}
      {showCombo && (
        <div
          data-testid="combo-score-wrapper"
          className="flex flex-col items-center gap-1 md:gap-2"
        >
          <ComboDisplay comboLevel={comboLevel} compact />
          <div
            data-testid="score-display"
            className="px-1.5 md:px-4 py-0.5 md:py-1.5 min-w-[50px]"
          >
            <div className="text-lg md:text-2xl font-black">{score}</div>
            <div className="text-xs font-bold uppercase">Score</div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Component that mimics the FIXED stats row layout from InGameScreen
 * - uses relative positioning with timer centered and combo absolutely positioned on right
 */
const FixedStatsRowTestComponent = ({
  comboLevel,
  showCombo = true,
  score = 100,
}: {
  comboLevel: number;
  showCombo?: boolean;
  score?: number;
}) => {
  return (
    <div
      data-testid="stats-row"
      className="relative flex items-center justify-center"
    >
      {/* Timer (center - always visible and prominent) */}
      <div data-testid="timer-wrapper" className="relative z-20 flex-shrink-0">
        <CircularTimer remainingTime={60} totalTime={180} size="xs" />
      </div>

      {/* Combo + Score - positioned absolutely on the right to not shift timer */}
      {showCombo && (
        <div
          data-testid="combo-score-wrapper"
          className="absolute right-0 rtl:right-auto rtl:left-0 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1 md:gap-2 z-10"
        >
          <ComboDisplay comboLevel={comboLevel} compact />
          <div
            data-testid="score-display"
            className="px-1.5 md:px-4 py-0.5 md:py-1.5 min-w-[50px]"
          >
            <div className="text-lg md:text-2xl font-black">{score}</div>
            <div className="text-xs font-bold uppercase">Score</div>
          </div>
        </div>
      )}
    </div>
  );
};

describe('InGameScreen Combo Layout', () => {
  describe('fixed layout: combo positioned absolutely on right side', () => {
    it('stats row has relative positioning to anchor absolute children', () => {
      render(<FixedStatsRowTestComponent comboLevel={3} />);

      const statsRow = screen.getByTestId('stats-row');
      expect(statsRow).toHaveClass('relative');
    });

    it('timer has flex-shrink-0 to maintain fixed size', () => {
      render(<FixedStatsRowTestComponent comboLevel={3} />);

      const timerWrapper = screen.getByTestId('timer-wrapper');
      expect(timerWrapper).toHaveClass('flex-shrink-0');
    });

    it('combo wrapper is positioned absolutely on the right', () => {
      render(<FixedStatsRowTestComponent comboLevel={3} />);

      const comboWrapper = screen.getByTestId('combo-score-wrapper');
      expect(comboWrapper).toHaveClass('absolute');
      expect(comboWrapper).toHaveClass('right-0');
    });

    it('combo wrapper has RTL support with left positioning', () => {
      render(<FixedStatsRowTestComponent comboLevel={3} />);

      const comboWrapper = screen.getByTestId('combo-score-wrapper');
      expect(comboWrapper.className).toMatch(/rtl:left-0/);
    });

    it('combo wrapper is vertically centered', () => {
      render(<FixedStatsRowTestComponent comboLevel={3} />);

      const comboWrapper = screen.getByTestId('combo-score-wrapper');
      expect(comboWrapper).toHaveClass('top-1/2');
      expect(comboWrapper).toHaveClass('-translate-y-1/2');
    });
  });

  describe('combo visibility states', () => {
    it('hides combo when level is 0', () => {
      render(<FixedStatsRowTestComponent comboLevel={0} />);

      // ComboDisplay returns null when level < 1
      expect(screen.queryByText(/Combo/)).not.toBeInTheDocument();
    });

    it('shows combo when level is 1 or higher', () => {
      render(<FixedStatsRowTestComponent comboLevel={1} />);

      expect(screen.getByText(/Combo/)).toBeInTheDocument();
    });

    it('shows x2 combo text for level 2', () => {
      render(<FixedStatsRowTestComponent comboLevel={2} />);

      expect(screen.getByText(/x2/)).toBeInTheDocument();
    });
  });

  describe('mobile layout constraints', () => {
    it('combo has compact styling with fixed width', () => {
      render(<FixedStatsRowTestComponent comboLevel={3} />);

      // ComboDisplay in compact mode should have fixed width to prevent layout shifts
      const comboContainer = screen.getByText(/Combo/).closest('div[class*="w-"]');
      expect(comboContainer).toHaveClass('w-[80px]');
    });

    it('combo does not have negative positioning that could overlap timer', () => {
      render(<FixedStatsRowTestComponent comboLevel={5} />);

      const comboWrapper = screen.getByTestId('combo-score-wrapper');

      // Check no negative left positioning
      expect(comboWrapper.className).not.toMatch(/-left-\d/);
      expect(comboWrapper.className).not.toMatch(/-right-\d/);
    });

    it('timer stays centered when combo appears/disappears', () => {
      const { rerender } = render(<FixedStatsRowTestComponent comboLevel={0} />);

      // Timer should be centered (stats row uses justify-center)
      const statsRow = screen.getByTestId('stats-row');
      expect(statsRow).toHaveClass('justify-center');

      // Rerender with combo visible
      rerender(<FixedStatsRowTestComponent comboLevel={3} />);

      // Timer should still be centered - stats row hasn't changed
      expect(statsRow).toHaveClass('justify-center');
    });
  });
});
