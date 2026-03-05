/**
 * WordHuntTargetArea Celebration Tests
 *
 * Tests that a found word triggers celebration animation.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { WordHuntTargetArea } from '../WordHuntTargetArea';
import type { LetterFeedback } from '@/shared/types/game';

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

describe('WordHuntTargetArea Celebration', () => {
  const defaultProps = {
    targetLength: 5,
    attempts: [] as Array<{ guess: string; feedback: LetterFeedback[] }>,
    onSubmit: jest.fn(),
    found: false,
  };

  it('should not show celebration when not found', () => {
    render(<WordHuntTargetArea {...defaultProps} found={false} />);
    const container = screen.getByTestId('word-hunt-target-area');
    expect(container.className).not.toContain('found-celebration');
  });

  it('should show celebration class when word is found', () => {
    render(<WordHuntTargetArea {...defaultProps} found={true} />);
    const container = screen.getByTestId('word-hunt-target-area');
    expect(container.className).toContain('found-celebration');
  });
});
