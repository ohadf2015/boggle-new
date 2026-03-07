/**
 * TitleReveal Responsive Scaling Tests
 *
 * Verifies that TitleReveal scales font size based on composition width
 * via useVideoConfig() when no explicit fontSize prop is provided.
 */

import React from 'react';
import { render } from '@testing-library/react';

// Mock remotion with useVideoConfig returning portrait mobile dimensions
jest.mock('remotion', () => ({
  useCurrentFrame: () => 10,
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
  spring: () => 1,
  Easing: { bezier: () => (t: number) => t },
  AbsoluteFill: ({ children, style, ...rest }: React.PropsWithChildren<{ style?: React.CSSProperties; 'data-testid'?: string }>) => (
    <div data-testid={(rest as Record<string, unknown>)['data-testid'] as string || 'absolute-fill'} style={style}>
      {children}
    </div>
  ),
}));

// Mock fonts
jest.mock('../../fonts', () => ({
  fredokaFamily: 'Fredoka, sans-serif',
  rubikFamily: 'Rubik, sans-serif',
}));

import { TitleReveal } from '../TitleReveal';

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
