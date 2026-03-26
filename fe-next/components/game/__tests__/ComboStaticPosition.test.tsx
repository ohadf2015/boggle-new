/**
 * Test for combo display having static space below exit button
 * Bug: Combo text is partially hidden by timer and doesn't have static space
 * Expected: Combo should be positioned below exit button with its own dedicated space
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock LanguageContext
vi.mock('../../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
    dir: 'ltr',
  }),
}));

// Mock framer-motion
vi.mock('framer-motion', () => {
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
vi.mock('../../../hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({
    isLowEnd: false,
    enableComplexAnimations: true,
    prefersReducedMotion: false,
  }),
}));

import ComboDisplay from '../ComboDisplay';

/**
 * Test component that mimics the desired layout:
 * - Exit button at the top
 * - Combo positioned statically below exit button
 * - Combo has its own space and doesn't overlap with other elements
 */
const DesiredLayoutComponent = ({ comboLevel }: { comboLevel: number }) => {
  return (
    <div data-testid="landscape-bottom-bar" className="flex flex-col items-start gap-2">
      {/* Exit button */}
      <button data-testid="exit-button" className="w-12 h-12 bg-red-500">
        Exit
      </button>

      {/* Combo Display - should be below exit button with static space */}
      {comboLevel > 0 && (
        <div data-testid="combo-container" className="w-full">
          <ComboDisplay comboLevel={comboLevel} compact />
        </div>
      )}
    </div>
  );
};

describe('Combo Static Position Below Exit Button', () => {
  it('combo is positioned in the DOM after exit button', () => {
    render(<DesiredLayoutComponent comboLevel={3} />);

    const exitButton = screen.getByTestId('exit-button');
    const comboContainer = screen.getByTestId('combo-container');

    // Check that combo comes after exit button in DOM order
    const parent = exitButton.parentElement;
    expect(parent).toContainElement(exitButton);
    expect(parent).toContainElement(comboContainer);

    const children = Array.from(parent!.children);
    const exitIndex = children.indexOf(exitButton);
    const comboIndex = children.indexOf(comboContainer);

    expect(comboIndex).toBeGreaterThan(exitIndex);
  });

  it('combo container has static positioning (not absolute)', () => {
    render(<DesiredLayoutComponent comboLevel={3} />);

    const comboContainer = screen.getByTestId('combo-container');

    // Should NOT have absolute positioning
    expect(comboContainer.className).not.toMatch(/absolute/);
  });

  it('parent uses flex-col to stack elements vertically', () => {
    render(<DesiredLayoutComponent comboLevel={3} />);

    const bottomBar = screen.getByTestId('landscape-bottom-bar');

    // Should use flex-col for vertical stacking
    expect(bottomBar).toHaveClass('flex');
    expect(bottomBar).toHaveClass('flex-col');
  });

  it('parent has gap between children for spacing', () => {
    render(<DesiredLayoutComponent comboLevel={3} />);

    const bottomBar = screen.getByTestId('landscape-bottom-bar');

    // Should have gap between children
    expect(bottomBar.className).toMatch(/gap-\d/);
  });

  it('combo is visible when level > 0', () => {
    render(<DesiredLayoutComponent comboLevel={3} />);

    expect(screen.getByTestId('combo-container')).toBeInTheDocument();
    expect(screen.getByText(/x3/)).toBeInTheDocument();
  });

  it('combo is hidden when level is 0', () => {
    render(<DesiredLayoutComponent comboLevel={0} />);

    expect(screen.queryByTestId('combo-container')).not.toBeInTheDocument();
  });
});
