import { vi, type Mock, } from 'vitest';
/**
 * SparkleField Responsive Scaling Tests
 *
 * Verifies that SparkleField scales sparkle count based on composition width
 * via useVideoConfig() to reduce visual density on smaller screens.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

vi.mock('remotion', () => ({
  __esModule: true,
  useVideoConfig: vi.fn(() => ({ fps: 30, durationInFrames: 90, width: 1920, height: 1080 })),
  interpolate: vi.fn((frame: number, inputRange: number[], outputRange: number[]) => {
    if (frame <= inputRange[0]) return outputRange[0];
    if (frame >= inputRange[inputRange.length - 1]) return outputRange[outputRange.length - 1];
    const [inMin, inMax] = inputRange;
    const [outMin, outMax] = outputRange;
    const pct = Math.min(1, Math.max(0, (frame - inMin) / (inMax - inMin)));
    return outMin + pct * (outMax - outMin);
  }),
  AbsoluteFill: ({ children, style, ...rest }: any) => (
    <div data-testid={rest['data-testid'] || 'absolute-fill'} style={style}>
      {children}
    </div>
  ),
}));


import * as remotion from 'remotion';

// Mock seededRandom util
vi.mock('../../utils/seededRandom', () => ({
  createSeededRandom: (seed: number) => {
    let s = seed;
    return () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
  },
}));

import { SparkleField } from '../SparkleField';

beforeEach(() => {
  vi.mocked(remotion.useVideoConfig).mockReturnValue({ width: 390, height: 219, fps: 30, durationInFrames: 90 });
});

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
