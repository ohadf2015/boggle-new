/**
 * CircularTimer progress ring — remaining time must match the visible arc.
 *
 * The main CircularTimer.test.tsx file is excluded from the vitest include
 * list (legacy flakiness). This file covers the user-facing "ring does not
 * look like the time" bug without touching that excluded suite.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import CircularTimer from '../CircularTimer';

vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, animate, initial, transition, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div {...props}>{children}</div>
    ),
    circle: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <circle {...props}>{children}</circle>
    ),
  },
}));

function progressCircle(container: HTMLElement): SVGCircleElement {
  const circles = Array.from(container.querySelectorAll('circle'));
  const withDash = circles.find((c) => c.getAttribute('stroke-dasharray'));
  if (!withDash) throw new Error('progress circle not found');
  return withDash;
}

describe('CircularTimer progress ring', () => {
  it('shouldDepleteTheRingAsRemainingTimeRunsOut', () => {
    // GIVEN a 180s match with half the time remaining
    const { container } = render(<CircularTimer remainingTime={90} totalTime={180} />);

    // WHEN the progress circle is measured
    const circle = progressCircle(container);
    const circumference = Number(circle.getAttribute('stroke-dasharray'));
    const offset = Number(circle.getAttribute('stroke-dashoffset'));

    // THEN half the ring is visible (offset === half circumference)
    expect(circumference).toBeGreaterThan(0);
    expect(offset).toBeCloseTo(circumference * 0.5, 5);
  });

  it('shouldShowAFullRingWhenTimeIsFullAndAnEmptyRingWhenTimeIsZero', () => {
    const full = render(<CircularTimer remainingTime={60} totalTime={60} />);
    const fullCircle = progressCircle(full.container);
    expect(Number(fullCircle.getAttribute('stroke-dashoffset'))).toBeCloseTo(0, 5);
    full.unmount();

    const empty = render(<CircularTimer remainingTime={0} totalTime={60} />);
    const emptyCircle = progressCircle(empty.container);
    const circ = Number(emptyCircle.getAttribute('stroke-dasharray'));
    expect(Number(emptyCircle.getAttribute('stroke-dashoffset'))).toBeCloseTo(circ, 5);
  });

  it('shouldClampProgressWhenRemainingExceedsTotal', () => {
    // GIVEN a reconnect tick that reports remaining > total
    const { container } = render(<CircularTimer remainingTime={200} totalTime={60} />);
    const circle = progressCircle(container);
    // THEN the ring never overfills (negative dashoffset looks inverted)
    expect(Number(circle.getAttribute('stroke-dashoffset'))).toBeGreaterThanOrEqual(0);
  });

  it('shouldDisplayFlooredClockTextForFractionalSeconds', () => {
    render(<CircularTimer remainingTime={65.7} totalTime={180} />);
    expect(screen.getByText('1:05')).toBeInTheDocument();
  });
});
