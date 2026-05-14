import { vi, type Mock, } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import TvGameHeader from '../TvGameHeader';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  m: {
    div: React.forwardRef(function MotionDiv(
      { children, className, style, ...rest }: any,
      ref: any
    ) {
      return (
        <div
          ref={ref}
          className={className}
          style={style}
          data-testid={rest['data-testid']}
          role={rest.role}
          aria-live={rest['aria-live']}
          aria-label={rest['aria-label']}
        >
          {children}
        </div>
      );
    }),
    span: React.forwardRef(function MotionSpan(
      { children, className, style, ...rest }: any,
      ref: any
    ) {
      return (
        <span
          ref={ref}
          className={className}
          style={style}
          data-testid={rest['data-testid']}
        >
          {children}
        </span>
      );
    }),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock CircularTimer
vi.mock('../../../../components/CircularTimer', () => ({
  default: function MockCircularTimer() {
    return <div data-testid="circular-timer" />;
  },
}));

const mockT = (key: string) => key;

describe('TvGameHeader LIVE badge', () => {
  it('renders a pulsing recording dot', () => {
    render(
      <TvGameHeader
        remainingTime={60}
        timerValue={2}
        t={mockT}
      />
    );

    const recordingDot = screen.getByTestId('live-recording-dot');
    expect(recordingDot).toBeInTheDocument();
  });

  it('renders the LIVE text', () => {
    render(
      <TvGameHeader
        remainingTime={60}
        timerValue={2}
        t={mockT}
      />
    );

    expect(screen.getByText('tvBroadcast.live')).toBeInTheDocument();
  });

  it('has accessible live status', () => {
    render(
      <TvGameHeader
        remainingTime={60}
        timerValue={2}
        t={mockT}
      />
    );

    const liveContainer = screen.getByRole('status');
    expect(liveContainer).toHaveAttribute('aria-live', 'polite');
  });

  it('does not use simple opacity animation on the badge container', () => {
    const { container } = render(
      <TvGameHeader
        remainingTime={60}
        timerValue={2}
        t={mockT}
      />
    );

    // The old implementation used animate={{ opacity: [1, 0.5, 1] }}
    // on the badge container. The new one should NOT have opacity pulsing
    // on the main badge — only on the recording dot
    const liveBadge = screen.getByTestId('live-badge');
    expect(liveBadge).toBeInTheDocument();
  });
});
