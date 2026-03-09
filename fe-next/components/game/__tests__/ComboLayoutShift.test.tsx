/**
 * Test for combo display NOT causing layout shifts
 * Bug: Combo appearance/disappearance shifts other elements down/up
 * Expected: Combo container should always reserve space (fixed height),
 *           regardless of whether combo is visible or not
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock LanguageContext
jest.mock('../../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
    dir: 'ltr',
  }),
}));

// Mock framer-motion
jest.mock('framer-motion', () => {
  const createMotionComponent = (Tag: string) => {
    const Component = React.forwardRef(({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>, ref: React.Ref<Element>) => {
      const {
        animate, initial, exit, transition, whileHover, whileTap, variants,
        whileInView, viewport, layout, layoutId, drag, dragConstraints,
        onAnimationComplete, onAnimationStart, style, ...domProps
      } = props as Record<string, unknown>;
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

import ComboDisplay from '../ComboDisplay';

/**
 * Test component that implements the correct pattern:
 * - Container always has fixed height
 * - Content is hidden/shown with visibility, not conditional rendering
 */
const LayoutStableComponent = ({ comboLevel }: { comboLevel: number }) => {
  return (
    <div data-testid="game-layout" className="flex flex-col">
      {/* Timer - should NOT move when combo appears/disappears */}
      <div data-testid="timer" className="h-20 bg-blue-500">
        Timer
      </div>

      {/* Combo row - container ALWAYS present with fixed height */}
      <div
        data-testid="combo-row"
        className="h-[40px] flex justify-center items-center"
      >
        {/* Combo only renders content, container is always there */}
        <ComboDisplay comboLevel={comboLevel} compact />
      </div>

      {/* Score - should NOT move when combo appears/disappears */}
      <div data-testid="score" className="h-16 bg-green-500">
        Score
      </div>
    </div>
  );
};

describe('Combo Layout Shift Prevention', () => {
  it('combo row container is always present regardless of combo level', () => {
    const { rerender } = render(<LayoutStableComponent comboLevel={0} />);

    // Container should exist even when combo is 0
    const comboRow = screen.getByTestId('combo-row');
    expect(comboRow).toBeInTheDocument();

    // Rerender with combo active
    rerender(<LayoutStableComponent comboLevel={3} />);

    // Container should still be there
    expect(screen.getByTestId('combo-row')).toBeInTheDocument();
  });

  it('combo row has fixed height to prevent layout shifts', () => {
    render(<LayoutStableComponent comboLevel={0} />);

    const comboRow = screen.getByTestId('combo-row');
    // Should have fixed height class
    expect(comboRow).toHaveClass('h-[40px]');
  });

  it('elements after combo row maintain their DOM order', () => {
    render(<LayoutStableComponent comboLevel={3} />);

    const layout = screen.getByTestId('game-layout');
    const children = Array.from(layout.children);

    const timerIndex = children.findIndex((el) => el.getAttribute('data-testid') === 'timer');
    const comboIndex = children.findIndex((el) => el.getAttribute('data-testid') === 'combo-row');
    const scoreIndex = children.findIndex((el) => el.getAttribute('data-testid') === 'score');

    // Order should always be: timer -> combo-row -> score
    expect(timerIndex).toBeLessThan(comboIndex);
    expect(comboIndex).toBeLessThan(scoreIndex);
  });

  it('ComboDisplay renders null internally for level 0, but container remains', () => {
    render(<LayoutStableComponent comboLevel={0} />);

    // Container is there
    const comboRow = screen.getByTestId('combo-row');
    expect(comboRow).toBeInTheDocument();

    // But the combo text is not present (ComboDisplay returns null for level 0)
    expect(screen.queryByText(/x0/)).not.toBeInTheDocument();
    expect(screen.queryByText(/game\.combo/)).not.toBeInTheDocument();
  });

  it('ComboDisplay shows content for level > 0', () => {
    render(<LayoutStableComponent comboLevel={3} />);

    // Combo content should be visible
    expect(screen.getByText(/x3/)).toBeInTheDocument();
    expect(screen.getByText(/game\.combo/)).toBeInTheDocument();
  });
});
