import { vi, type Mock, } from 'vitest';
/**
 * TitleReveal Responsive Scaling Tests
 *
 * Verifies that TitleReveal scales font size based on composition width
 * via useVideoConfig() when no explicit fontSize prop is provided.
 */

import React from 'react';
import { render } from '@testing-library/react';

vi.mock('remotion', () => ({
  __esModule: true,
  useCurrentFrame: vi.fn(() => 0),
  useVideoConfig: vi.fn(() => ({ fps: 30, durationInFrames: 90, width: 1920, height: 1080 })),
  interpolate: vi.fn((frame: number, inputRange: number[], outputRange: number[]) => {
    if (frame <= inputRange[0]) return outputRange[0];
    if (frame >= inputRange[inputRange.length - 1]) return outputRange[outputRange.length - 1];
    const [inMin, inMax] = inputRange;
    const [outMin, outMax] = outputRange;
    const pct = Math.min(1, Math.max(0, (frame - inMin) / (inMax - inMin)));
    return outMin + pct * (outMax - outMin);
  }),
  spring: vi.fn(() => 0),
  Easing: { bezier: () => (t: number) => t },
  AbsoluteFill: ({ children, style, ...rest }: any) => (
    <div data-testid={rest['data-testid'] || 'absolute-fill'} style={style}>
      {children}
    </div>
  ),
}));


import * as remotion from 'remotion';

// Mock fonts
vi.mock('../../fonts', () => ({
  fredokaFamily: 'Fredoka, sans-serif',
  rubikFamily: 'Rubik, sans-serif',
}));

import { TitleReveal } from '../TitleReveal';

beforeEach(() => {
  vi.mocked(remotion.useCurrentFrame).mockReturnValue(10);
  vi.mocked(remotion.useVideoConfig).mockReturnValue({ width: 390, height: 219, fps: 30, durationInFrames: 90 });
  vi.mocked(remotion.spring).mockReturnValue(1);
});

describe('TitleReveal responsive scaling', () => {
  it('scales title font size based on composition width when no fontSize prop given', () => {
    // GIVEN: portrait mobile composition width=390
    // WHEN: TitleReveal rendered without explicit fontSize
    const { container } = render(
      <TitleReveal text="TEST" color="#FFE135" frame={10} fps={30} />,
    );

    // THEN: font size should scale with width (~390 * 0.07 ≈ 27)
    const titleEl = container.querySelector('[data-testid="title-text"]');
    expect(titleEl).toBeInTheDocument();
    const fontSize = parseInt((titleEl as HTMLElement)?.style?.fontSize ?? '0');
    expect(fontSize).toBeGreaterThan(20);
    expect(fontSize).toBeLessThan(50);
  });

  it('uses explicit fontSize prop when provided (backward compat)', () => {
    // GIVEN: explicit fontSize=96
    const { container } = render(
      <TitleReveal text="TEST" color="#FFE135" fontSize={96} frame={10} fps={30} />,
    );

    // THEN: uses the provided fontSize exactly
    const titleEl = container.querySelector('[data-testid="title-text"]');
    const fontSize = parseInt((titleEl as HTMLElement)?.style?.fontSize ?? '0');
    expect(fontSize).toBe(96);
  });

  it('adds data-testid="title-text" to the title element', () => {
    const { container } = render(
      <TitleReveal text="BOSS" color="#FF6B35" frame={10} fps={30} />,
    );
    const titleEl = container.querySelector('[data-testid="title-text"]');
    expect(titleEl).toBeInTheDocument();
    expect(titleEl?.textContent).toBe('BOSS');
  });
});
