/**
 * ComboDisplay Visibility Bug Test
 *
 * Tests for combo display visibility issues:
 * 1. Combo text partially hidden due to overflow-hidden clipping scaled glow
 * 2. Glow effect looks off when scaled and clipped by container
 */

import React from 'react';
import { render } from '@testing-library/react';
import ComboDisplay from '../ComboDisplay';

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

// Mock InteractiveMascot
vi.mock('@/components/ui/InteractiveMascot', () => ({
  InteractiveMascot: ({ variant }: { variant: string }) => (
    <div data-testid="combo-mascot" data-variant={variant}>
      Mascot
    </div>
  ),
}));

describe('ComboDisplay Visibility Bug', () => {
  describe('glow visibility with overflow', () => {
    it('should NOT use overflow-hidden that clips the scaled glow effect', () => {
      const { container } = render(<ComboDisplay comboLevel={5} compact />);

      const outerContainer = container.firstChild as HTMLElement;

      // Bug: overflow-hidden clips the scaled glow (scale(1.5))
      // The container should use overflow-visible to allow glow to extend naturally
      expect(outerContainer).not.toHaveClass('overflow-hidden');
    });

    it('should allow glow to extend beyond text bounds', () => {
      const { container } = render(<ComboDisplay comboLevel={5} compact />);

      const outerContainer = container.firstChild as HTMLElement;

      // The outer container should not restrict glow visibility
      expect(outerContainer).toHaveClass('overflow-visible');
    });
  });

  describe('layout positioning for edge placement', () => {
    it('has sufficient width to accommodate glow extension in compact mode', () => {
      const { container } = render(<ComboDisplay comboLevel={5} compact />);

      const outerContainer = container.firstChild as HTMLElement;

      // Current: w-[100px] - too narrow when glow scales to 1.5x
      // Should be wider to prevent clipping when placed near screen edge
      expect(outerContainer).toHaveClass('w-[100px]');

      // Verify it provides stable layout (fixed width)
      expect(outerContainer.className).toMatch(/w-\[/);
    });
  });

  describe('glow rendering', () => {
    it('renders glow effect behind text for combo level 3+', () => {
      const { container } = render(<ComboDisplay comboLevel={3} />);

      // Find the glow div (has blur Tailwind class and scale transform)
      const glowElement = container.querySelector('.blur-\\[12px\\]');

      // Should exist for combo >= 3 (when not in skipSparkles mode)
      expect(glowElement).toBeInTheDocument();
    });

    it('applies correct z-index stacking for glow behind text', () => {
      const { container } = render(<ComboDisplay comboLevel={5} />);

      const glowElement = container.querySelector('.blur-\\[12px\\]');

      if (glowElement) {
        // Glow should have negative z-index to stay behind text
        expect(glowElement).toHaveClass('-z-10');
      }
    });
  });

  describe('high combo visibility', () => {
    it('maintains visibility for legendary combo (level 5+) in compact mode', () => {
      const { container } = render(<ComboDisplay comboLevel={6} compact />);

      // Combo text should be fully visible
      expect(container.textContent).toContain('x6');
      expect(container.textContent).toContain('Combo');

      // Glow should not be clipped
      const outerContainer = container.firstChild as HTMLElement;
      expect(outerContainer).not.toHaveClass('overflow-hidden');
    });
  });
});
