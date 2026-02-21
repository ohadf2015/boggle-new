/**
 * SparkleField Responsive Scaling Tests
 *
 * Verifies that SparkleField scales sparkle count based on composition width
 * via useVideoConfig() to reduce visual density on smaller screens.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock remotion with portrait mobile dimensions (width=390)
jest.mock('remotion', () => ({
  useVideoConfig: () => ({ width: 390, height: 219, fps: 30, durationInFrames: 90 }),
  interpolate: (
    f: number,
    [a, b]: number[],
    [c, d]: number[],
    _options?: unknown,
  ) => {
    const pct = Math.min(1, Math.max(0, (f - a) / (b - a)));
    return c + pct * (d - c);
  },
  AbsoluteFill: ({ children, style, ...rest }: React.PropsWithChildren<{ style?: React.CSSProperties; 'data-testid'?: string }>) => (
    <div data-testid={(rest as Record<string, unknown>)['data-testid'] as string || 'absolute-fill'} style={style}>
      {children}
    </div>
  ),
}));

// Mock seededRandom util
jest.mock('../../utils/seededRandom', () => ({
  createSeededRandom: (seed: number) => {
    let s = seed;
    return () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
  },
}));

import { SparkleField } from '../SparkleField';

describe('SparkleField responsive scaling', () => {
  it('reduces sparkle count proportionally at portrait mobile width (390px)', () => {
    // GIVEN: 30 sparkles requested, composition width=390
    // scale = min(1, 390/1280) ≈ 0.305
    // scaledCount = round(30 * 0.305) = round(9.14) = 9

    render(<SparkleField count={30} color="#FFE135" seed={42} frame={60} />);

    const sparkles = screen.getAllByTestId('sparkle');
    // Should be fewer than 30 (scaled down)
    expect(sparkles.length).toBeLessThan(30);
    // Should match the expected scaled count
    const expectedCount = Math.round(30 * Math.min(1, 390 / 1280));
    expect(sparkles.length).toBe(expectedCount);
  });

  it('preserves deterministic layout with same seed after scaling', () => {
    const { unmount } = render(
      <SparkleField count={20} color="#FFF" seed={42} frame={60} />,
    );
    const first = screen.getAllByTestId('sparkle').map((s) => s.style.left);
    unmount();

    render(<SparkleField count={20} color="#FFF" seed={42} frame={60} />);
    const second = screen.getAllByTestId('sparkle').map((s) => s.style.left);
    expect(first).toEqual(second);
  });
});
