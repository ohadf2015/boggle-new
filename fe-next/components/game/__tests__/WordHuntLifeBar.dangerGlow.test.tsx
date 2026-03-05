/**
 * WordHuntLifeBar Danger Glow + Pulse Tests
 *
 * Tests danger glow when life is low and pulse on life decrease.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    dir: 'ltr',
  }),
}));

jest.mock('framer-motion', () => {
  const createMotionComponent = (Tag: string) => {
    const Component = React.forwardRef(
      (
        { children, className, ...props }: React.PropsWithChildren<Record<string, unknown>>,
        ref: React.Ref<Element>
      ) => {
        const {
          animate, initial, exit, transition,
          whileHover, whileTap, variants,
          whileInView, viewport, layout, layoutId,
          drag, dragConstraints,
          onAnimationComplete, onAnimationStart,
          style, ...domProps
        } = props as Record<string, unknown>;
        const cleanStyle = typeof style === 'object' ? style : undefined;
        return React.createElement(Tag, { ...domProps, className, style: cleanStyle, ref }, children);
      }
    );
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

import { WordHuntLifeBar } from '../WordHuntLifeBar';

describe('WordHuntLifeBar Danger Glow', () => {
  it('should not have danger glow when life is above 30%', () => {
    render(<WordHuntLifeBar life={80} maxLife={100} />);
    const container = screen.getByTestId('word-hunt-life-bar');
    expect(container.className).not.toContain('shadow-[0_0_');
  });

  it('should have red danger glow when life is at or below 30%', () => {
    render(<WordHuntLifeBar life={25} maxLife={100} />);
    const container = screen.getByTestId('word-hunt-life-bar');
    expect(container.className).toContain('shadow-[0_0_12px_rgba(255,0,0,0.4)]');
  });

  it('should have danger glow at exactly 30%', () => {
    render(<WordHuntLifeBar life={30} maxLife={100} />);
    const container = screen.getByTestId('word-hunt-life-bar');
    expect(container.className).toContain('shadow-[0_0_12px_rgba(255,0,0,0.4)]');
  });

  it('should have pulse class when life decreases', () => {
    const { rerender } = render(<WordHuntLifeBar life={80} maxLife={100} />);
    rerender(<WordHuntLifeBar life={60} maxLife={100} />);

    const container = screen.getByTestId('word-hunt-life-bar');
    expect(container.className).toContain('animate-pulse-once');
  });

  it('should not have pulse class on initial render', () => {
    render(<WordHuntLifeBar life={80} maxLife={100} />);
    const container = screen.getByTestId('word-hunt-life-bar');
    expect(container.className).not.toContain('animate-pulse-once');
  });
});
