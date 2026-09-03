import React from 'react';
import { render } from '@testing-library/react';
import { EnhancedTimer } from '../EnhancedTimer';

vi.mock('@/hooks/usePrefersReducedMotion', () => ({
  usePrefersReducedMotion: () => true,
}));

vi.mock('@/components/motion/AdaptiveMotion', () => {
  const passthrough = ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
    <div {...props}>{children}</div>
  );
  return {
    AdaptiveMotion: {
      div: passthrough,
      span: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
        <span {...props}>{children}</span>
      ),
    },
    AdaptiveAnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

describe('EnhancedTimer', () => {
  it('shouldSizeTheProgressStrokeToTheRoundedRectPerimeter', () => {
    // GIVEN a timer at 50% remaining
    const { container } = render(
      <EnhancedTimer timeRemaining={30} totalTime={60} />
    );

    // WHEN the progress rect is measured
    const rect = container.querySelector('rect');
    expect(rect).toBeTruthy();
    const dash = Number(rect?.getAttribute('stroke-dasharray')?.split(' ')[0]);
    const offset = Number(rect?.getAttribute('stroke-dashoffset'));

    // THEN dasharray matches the rounded-rect perimeter
    // 2*(96+96-32) + 2*π*8 ≈ 370.27 (not the old 384 guess)
    expect(dash).toBeCloseTo(2 * (96 + 96 - 32) + 2 * Math.PI * 8, 1);
    expect(offset).toBeCloseTo(dash * 0.5, 1);
  });

  it('shouldShowReadableMmSsDigits', () => {
    const { container } = render(<EnhancedTimer timeRemaining={75} totalTime={180} />);
    const readout = container.querySelector('[dir="ltr"]');
    expect(readout?.textContent).toBe('01:15');
  });
});
