/**
 * WordHuntLifeBar Danger Glow + Shake Tests
 *
 * Tests danger glow class when life is low and shake on life decrease.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    dir: 'ltr',
  }),
}));

vi.mock('framer-motion', () => {
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
    Component.displayName = `m.${Tag}`;
    return Component;
  };

  return {
    m: {
      div: createMotionComponent('div'),
      span: createMotionComponent('span'),
    },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

import { WordHuntLifeBar } from '../WordHuntLifeBar';

describe('WordHuntLifeBar Danger Glow', () => {
  it('should not have danger glow when life is above 33%', () => {
    render(<WordHuntLifeBar life={80} maxLife={100} />);
    const track = screen.getByTestId('word-hunt-life-bar-track');
    expect(track.className).not.toContain('life-bar-danger-glow');
  });

  it('should have danger glow class when life is at or below 33%', () => {
    render(<WordHuntLifeBar life={25} maxLife={100} />);
    const track = screen.getByTestId('word-hunt-life-bar-track');
    expect(track.className).toContain('life-bar-danger-glow');
  });

  it('should have danger glow at exactly 33%', () => {
    render(<WordHuntLifeBar life={33} maxLife={100} />);
    const track = screen.getByTestId('word-hunt-life-bar-track');
    expect(track.className).toContain('life-bar-danger-glow');
  });

  it('should NOT have shake class when life decreases (drip replaces shake)', () => {
    const { rerender } = render(<WordHuntLifeBar life={80} maxLife={100} />);
    rerender(<WordHuntLifeBar life={60} maxLife={100} />);

    const container = screen.getByTestId('word-hunt-life-bar');
    expect(container.className).not.toContain('animate-neo-shake');
  });

  it('should show drip droplets when life decreases', () => {
    const { rerender } = render(<WordHuntLifeBar life={80} maxLife={100} />);
    rerender(<WordHuntLifeBar life={60} maxLife={100} />);

    const droplets = screen.getAllByTestId('life-drip-droplet');
    expect(droplets.length).toBeGreaterThanOrEqual(1);
  });

  it('should not show drip droplets on initial render', () => {
    render(<WordHuntLifeBar life={80} maxLife={100} />);
    expect(screen.queryAllByTestId('life-drip-droplet')).toHaveLength(0);
  });
});
