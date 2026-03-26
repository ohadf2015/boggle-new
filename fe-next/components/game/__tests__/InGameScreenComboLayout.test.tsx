/**
 * InGameScreen Combo Layout Tests
 *
 * Tests that the combo display is positioned correctly relative to the timer:
 * - Mobile: Combo appears in dedicated row above timer (centered)
 * - Desktop: Combo positioned absolutely on the right side
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock LanguageContext
vi.mock('../../../contexts/LanguageContext', () => ({
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
vi.mock('framer-motion', () => {
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
vi.mock('../../../hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({
    isLowEnd: false,
    enableComplexAnimations: true,
    prefersReducedMotion: false,
  }),
}));

// Mock useReducedMotion
vi.mock('../../../utils/accessibility', () => ({
  useReducedMotion: () => false,
}));

import ComboDisplay from '../ComboDisplay';
import CircularTimer from '../../CircularTimer';

/**
 * Component that mimics the NEW stats layout from InGameScreen
 * - Mobile: Combo in dedicated row above stats (centered, lg:hidden)
 *   - Container is ALWAYS present with fixed height to prevent layout shift
 *   - ComboDisplay returns null internally for level 0
 * - Desktop: Combo absolutely positioned on right (hidden lg:flex, z-30)
 * - Timer centered in stats row with z-20
 * - Mobile score is absolutely positioned to not affect timer centering
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
    <div data-testid="stats-section" className="flex flex-col gap-1">
      {/* Combo row - mobile only, centered. Container always present to prevent layout shift */}
      {showCombo && (
        <div
          data-testid="combo-row-mobile"
          className="flex lg:hidden justify-center items-center h-[40px]"
        >
          <ComboDisplay comboLevel={comboLevel} compact />
        </div>
      )}

      {/* Stats row - Timer centered on mobile, Timer + controls on desktop */}
      <div
        data-testid="stats-row"
        className="flex w-full items-center justify-center lg:justify-between relative min-h-[80px]"
      >
        {/* Timer (center) */}
        <div data-testid="timer-wrapper" className="relative z-20 shrink-0">
          <CircularTimer remainingTime={60} totalTime={180} size="xs" />
        </div>

        {/* Score (mobile) - absolutely positioned to not affect timer centering */}
        <div
          data-testid="score-display-mobile"
          className="absolute right-1 top-1/2 -translate-y-1/2 lg:hidden px-1.5 py-0.5 min-w-[50px]"
        >
          <div className="text-lg font-black">{score}</div>
          <div className="text-xs font-bold uppercase">Score</div>
        </div>

        {/* Desktop: Combo + Score - absolutely positioned on right */}
        {showCombo && (
          <div
            data-testid="combo-desktop"
            className="hidden lg:flex lg:absolute lg:right-4 rtl:lg:right-auto rtl:lg:left-4 lg:top-1/2 lg:-translate-y-1/2 z-30 flex-col items-end gap-2"
          >
            <div className="h-[32px] flex items-center justify-end">
              {comboLevel > 0 && <ComboDisplay comboLevel={comboLevel} compact />}
            </div>
            <div data-testid="score-display-desktop" className="px-4 py-1.5 min-w-[90px]">
              <div className="text-2xl font-black">{score}</div>
              <div className="text-xs font-bold uppercase">Score</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

describe('InGameScreen Combo Layout', () => {
  describe('mobile layout: combo in dedicated row above stats', () => {
    it('stats section uses vertical stacking for mobile', () => {
      render(<FixedStatsRowTestComponent comboLevel={3} />);

      const statsSection = screen.getByTestId('stats-section');
      expect(statsSection).toHaveClass('flex-col');
    });

    it('combo row exists and is hidden on desktop', () => {
      render(<FixedStatsRowTestComponent comboLevel={3} />);

      const comboRow = screen.getByTestId('combo-row-mobile');
      expect(comboRow).toHaveClass('lg:hidden');
    });

    it('combo row is centered horizontally', () => {
      render(<FixedStatsRowTestComponent comboLevel={3} />);

      const comboRow = screen.getByTestId('combo-row-mobile');
      expect(comboRow).toHaveClass('justify-center');
    });

    it('combo row has fixed height to prevent layout shifts', () => {
      render(<FixedStatsRowTestComponent comboLevel={3} />);

      const comboRow = screen.getByTestId('combo-row-mobile');
      expect(comboRow).toHaveClass('h-[40px]');
    });

    it('combo row container remains visible when combo level is 0 (prevents layout shift)', () => {
      render(<FixedStatsRowTestComponent comboLevel={0} />);

      // Container is always present to prevent layout shift
      const comboRow = screen.getByTestId('combo-row-mobile');
      expect(comboRow).toBeInTheDocument();
      // But content is empty (ComboDisplay returns null for level 0)
      expect(comboRow).not.toHaveTextContent(/game\.combo/);
    });
  });

  describe('desktop layout: combo positioned absolutely on right side', () => {
    it('stats row has relative positioning to anchor absolute children', () => {
      render(<FixedStatsRowTestComponent comboLevel={3} />);

      const statsRow = screen.getByTestId('stats-row');
      expect(statsRow).toHaveClass('relative');
    });

    it('desktop combo wrapper is hidden on mobile, shown on desktop', () => {
      render(<FixedStatsRowTestComponent comboLevel={3} />);

      const comboDesktop = screen.getByTestId('combo-desktop');
      expect(comboDesktop).toHaveClass('hidden');
      expect(comboDesktop).toHaveClass('lg:flex');
    });

    it('desktop combo is positioned absolutely on the right', () => {
      render(<FixedStatsRowTestComponent comboLevel={3} />);

      const comboDesktop = screen.getByTestId('combo-desktop');
      expect(comboDesktop).toHaveClass('lg:absolute');
      expect(comboDesktop).toHaveClass('lg:right-4');
    });

    it('desktop combo has RTL support with left positioning', () => {
      render(<FixedStatsRowTestComponent comboLevel={3} />);

      const comboDesktop = screen.getByTestId('combo-desktop');
      expect(comboDesktop.className).toMatch(/rtl:lg:left-4/);
    });

    it('desktop combo is vertically centered', () => {
      render(<FixedStatsRowTestComponent comboLevel={3} />);

      const comboDesktop = screen.getByTestId('combo-desktop');
      expect(comboDesktop).toHaveClass('lg:top-1/2');
      expect(comboDesktop).toHaveClass('lg:-translate-y-1/2');
    });
  });

  describe('combo visibility states', () => {
    it('hides combo when level is 0', () => {
      render(<FixedStatsRowTestComponent comboLevel={0} />);

      // ComboDisplay returns null when level < 1
      expect(screen.queryByText(/game\.combo/)).not.toBeInTheDocument();
    });

    it('shows combo when level is 1 or higher', () => {
      render(<FixedStatsRowTestComponent comboLevel={1} />);

      // Mobile combo row should contain combo text
      const comboRow = screen.getByTestId('combo-row-mobile');
      expect(comboRow).toHaveTextContent(/game\.combo/);
    });

    it('shows x2 combo text for level 2', () => {
      render(<FixedStatsRowTestComponent comboLevel={2} />);

      // Mobile combo row should contain x2
      const comboRow = screen.getByTestId('combo-row-mobile');
      expect(comboRow).toHaveTextContent(/x2/);
    });
  });

  describe('timer constraints', () => {
    it('timer has flex-shrink-0 to maintain fixed size', () => {
      render(<FixedStatsRowTestComponent comboLevel={3} />);

      const timerWrapper = screen.getByTestId('timer-wrapper');
      expect(timerWrapper).toHaveClass('shrink-0');
    });

    it('timer has z-20 for proper layering', () => {
      render(<FixedStatsRowTestComponent comboLevel={3} />);

      const timerWrapper = screen.getByTestId('timer-wrapper');
      expect(timerWrapper).toHaveClass('z-20');
    });
  });

  describe('mobile timer centering', () => {
    it('stats row uses justify-center on mobile for timer centering', () => {
      render(<FixedStatsRowTestComponent comboLevel={3} />);

      const statsRow = screen.getByTestId('stats-row');
      expect(statsRow).toHaveClass('justify-center');
    });

    it('stats row uses justify-between on desktop (lg breakpoint)', () => {
      render(<FixedStatsRowTestComponent comboLevel={3} />);

      const statsRow = screen.getByTestId('stats-row');
      expect(statsRow).toHaveClass('lg:justify-between');
    });

    it('mobile score is absolutely positioned to not affect timer centering', () => {
      render(<FixedStatsRowTestComponent comboLevel={3} />);

      const scoreMobile = screen.getByTestId('score-display-mobile');
      expect(scoreMobile).toHaveClass('absolute');
      expect(scoreMobile).toHaveClass('right-1');
      expect(scoreMobile).toHaveClass('top-1/2');
      expect(scoreMobile).toHaveClass('-translate-y-1/2');
    });

    it('stats row has minimum height for consistent spacing', () => {
      render(<FixedStatsRowTestComponent comboLevel={3} />);

      const statsRow = screen.getByTestId('stats-row');
      expect(statsRow).toHaveClass('min-h-[80px]');
    });
  });

  describe('z-index layering - desktop combo above timer', () => {
    it('desktop combo wrapper has higher z-index than timer', () => {
      render(<FixedStatsRowTestComponent comboLevel={3} />);

      const timerWrapper = screen.getByTestId('timer-wrapper');
      const comboDesktop = screen.getByTestId('combo-desktop');

      // Timer has z-20, desktop combo MUST have z-30 or higher
      expect(timerWrapper).toHaveClass('z-20');
      expect(comboDesktop).toHaveClass('z-30');
    });
  });

  describe('compact styling', () => {
    it('combo has compact styling with fixed width', () => {
      render(<FixedStatsRowTestComponent comboLevel={3} />);

      // Both mobile and desktop combos use compact mode with fixed width
      const comboRow = screen.getByTestId('combo-row-mobile');
      const comboContainer = comboRow.querySelector('div[class*="w-"]');
      expect(comboContainer).toHaveClass('w-[100px]');
    });
  });
});
