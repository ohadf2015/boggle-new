/**
 * ComboDisplay Overflow Prevention Test
 *
 * Tests that combo text, mascot, and effects stay within visible bounds
 * and don't overflow behind timer or off-screen.
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

import ComboDisplay from '../ComboDisplay';

describe('ComboDisplay Overflow Prevention', () => {
  describe('container overflow settings', () => {
    it('uses overflow-visible to allow glow effect to extend beyond bounds', () => {
      const { container } = render(<ComboDisplay comboLevel={5} compact />);

      // The outermost div should have overflow-visible to allow glow to render fully
      const comboContainer = container.firstChild as HTMLElement;
      expect(comboContainer).toHaveClass('overflow-visible');
    });

    it('has fixed width in compact mode to prevent layout shifts', () => {
      const { container } = render(<ComboDisplay comboLevel={5} compact />);

      const comboContainer = container.firstChild as HTMLElement;
      expect(comboContainer).toHaveClass('w-[100px]');
    });
  });

  describe('mascot positioning constraints', () => {
    it('does not position mascot too far left in compact mode', () => {
      render(<ComboDisplay comboLevel={5} compact />);

      const mascot = screen.queryByTestId('combo-mascot');

      if (mascot) {
        // Mascot should not extend more than the container width to the left
        // In compact mode with 80px width, mascot should not be positioned at -left-10 (40px)
        expect(mascot.className).not.toMatch(/-left-10/);
      }
    });

    it('hides mascot in compact mode to prevent overflow', () => {
      render(<ComboDisplay comboLevel={5} compact />);

      // Mascot should not be rendered in compact mode
      const mascot = screen.queryByTestId('combo-mascot');
      expect(mascot).not.toBeInTheDocument();
    });
  });

  describe('status text positioning', () => {
    it('positions status text within container bounds', () => {
      const { container } = render(<ComboDisplay comboLevel={10} compact />);

      // Status text should not extend too far below
      const statusText = container.querySelector('[class*="-bottom-"]');

      if (statusText) {
        // Should use minimal bottom offset in compact mode
        expect(statusText.className).not.toMatch(/-bottom-4/);
      }
    });
  });

  describe('responsive positioning in game layout', () => {
    it('has appropriate right margin when positioned in stats row', () => {
      // Simulate the actual layout from InGameScreen
      const { container } = render(
        <div className="absolute right-2 top-1/2 -translate-y-1/2">
          <div className="h-[28px] flex items-center justify-end">
            <ComboDisplay comboLevel={5} compact />
          </div>
        </div>
      );

      const wrapper = container.firstChild as HTMLElement;
      // Should have right-2 (8px from edge)
      expect(wrapper).toHaveClass('right-2');

      // ComboDisplay should fit within this constraint
      const comboDisplay = wrapper.querySelector('[class*="w-[100px]"]');
      expect(comboDisplay).toBeInTheDocument();
    });
  });
});
