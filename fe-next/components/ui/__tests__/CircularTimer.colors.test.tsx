import React from 'react';
import { render, screen } from '@testing-library/react';
import CircularTimer from '../CircularTimer';

vi.mock('react-countdown-circle-timer', () => ({
  CountdownCircleTimer: ({
    colors,
    colorsTime,
    children,
  }: {
    colors: string[];
    colorsTime: number[];
    children: (args: { remainingTime: number }) => React.ReactNode;
  }) => (
    <div
      data-testid="countdown-ring"
      data-colors={JSON.stringify(colors)}
      data-colors-time={JSON.stringify(colorsTime)}
    >
      {children({ remainingTime: 90 })}
    </div>
  ),
}));

describe('ui/CircularTimer color stops', () => {
  it('shouldHoldTheNormalColorUntilTheWarningThreshold', () => {
    // GIVEN a 180s timer that only warns at 10s
    render(<CircularTimer duration={180} isPlaying warningAt={10} criticalAt={5} />);

    // WHEN color stops are read off the ring
    const ring = screen.getByTestId('countdown-ring');
    const colors = JSON.parse(ring.getAttribute('data-colors') ?? '[]') as string[];
    const times = JSON.parse(ring.getAttribute('data-colors-time') ?? '[]') as number[];

    // THEN the first two stops are the same color so the ring does not
    // interpolate toward orange across the whole match
    expect(colors.length).toBeGreaterThanOrEqual(2);
    expect(colors[0]).toBe(colors[1]);
    expect(times[0]).toBe(180);
    expect(times[1]).toBe(10);
  });

  it('shouldRenderMmSsClockTextRatherThanBareSeconds', () => {
    render(<CircularTimer duration={180} isPlaying />);
    // remainingTime mocked at 90 → 1:30, not "90"
    expect(screen.getByText('1:30')).toBeInTheDocument();
  });
});
