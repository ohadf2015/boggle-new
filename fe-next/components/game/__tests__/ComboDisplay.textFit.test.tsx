/**
 * ComboDisplay Text Fitting Test
 *
 * Tests that combo text fits within the fixed width container in compact mode
 * without being cut off or causing layout shifts.
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

describe('ComboDisplay Text Fitting', () => {
  it('compact mode uses wider container to fit full text', () => {
    const { container } = render(<ComboDisplay comboLevel={3} compact />);

    // Container should have wider fixed width to fit full text (100px)
    const outerContainer = container.firstChild as HTMLElement;
    expect(outerContainer).toHaveClass('w-[100px]');

    // Text content should maintain readable size in compact mode (text-lg)
    const textContainer = container.querySelector('.text-lg');
    expect(textContainer).toBeInTheDocument();
  });

  it('text content fits within container without overflow', () => {
    const { container } = render(<ComboDisplay comboLevel={5} compact />);

    // Check that container allows glow overflow with overflow-visible
    const outerContainer = container.firstChild as HTMLElement;
    expect(outerContainer).toHaveClass('overflow-visible');

    // All text elements should be present and visible
    expect(screen.getByText(/x5/)).toBeInTheDocument();
    expect(screen.getByText(/game\.combo/)).toBeInTheDocument();
  });

  it('compact mode reduces spacing between elements', () => {
    const { container } = render(<ComboDisplay comboLevel={3} compact />);

    // Find the INNER flex container with the combo text (not the outer wrapper)
    const allFlexContainers = container.querySelectorAll('.flex.items-center');
    // The inner one has gap-1 or gap-0.5
    const textWrapper = Array.from(allFlexContainers).find(el =>
      el.className.includes('gap-')
    );

    expect(textWrapper).toBeTruthy();
    // Should have minimal gap in compact mode (gap-0.5 or gap-1)
    expect(textWrapper?.className).toMatch(/gap-(0\.5|1)/);
  });

  it('maintains readability even with compact sizing', () => {
    const { container } = render(<ComboDisplay comboLevel={10} compact />);

    // Double-digit combo should still be readable
    expect(screen.getByText(/x10/)).toBeInTheDocument();
    expect(screen.getByText(/game\.combo/)).toBeInTheDocument();

    // Container should allow glow overflow with overflow-visible
    const outerContainer = container.firstChild as HTMLElement;
    expect(outerContainer).toHaveClass('overflow-visible');
  });
});
