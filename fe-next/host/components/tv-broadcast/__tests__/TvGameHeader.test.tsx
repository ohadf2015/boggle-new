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
          data-urgency={rest['data-urgency']}
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

describe('TvGameHeader', () => {
  it('renders LIVE badge', () => {
    render(
      <TvGameHeader remainingTime={60} timerValue={2} t={mockT} />
    );
    expect(screen.getByTestId('live-badge')).toBeInTheDocument();
    expect(screen.getByText('tvBroadcast.live')).toBeInTheDocument();
  });

  it('renders CircularTimer when remainingTime is provided', () => {
    render(
      <TvGameHeader remainingTime={60} timerValue={2} t={mockT} />
    );
    expect(screen.getByTestId('circular-timer')).toBeInTheDocument();
  });

  it('does not render CircularTimer when remainingTime is null', () => {
    render(
      <TvGameHeader remainingTime={null} timerValue={2} t={mockT} />
    );
    expect(screen.queryByTestId('circular-timer')).not.toBeInTheDocument();
  });

  it('timer has no pulse wrapper when urgencyLevel is normal', () => {
    render(
      <TvGameHeader remainingTime={120} timerValue={2} t={mockT} urgencyLevel="normal" />
    );
    expect(screen.queryByTestId('timer-heartbeat')).not.toBeInTheDocument();
  });

  it('timer has heartbeat wrapper when urgencyLevel is urgent', () => {
    render(
      <TvGameHeader remainingTime={50} timerValue={2} t={mockT} urgencyLevel="urgent" />
    );
    expect(screen.getByTestId('timer-heartbeat')).toBeInTheDocument();
  });

  it('timer has heartbeat wrapper when urgencyLevel is critical', () => {
    render(
      <TvGameHeader remainingTime={20} timerValue={2} t={mockT} urgencyLevel="critical" />
    );
    expect(screen.getByTestId('timer-heartbeat')).toBeInTheDocument();
  });

  it('timer has extreme urgency data attribute when urgencyLevel is extreme', () => {
    render(
      <TvGameHeader remainingTime={5} timerValue={2} t={mockT} urgencyLevel="extreme" />
    );
    const heartbeat = screen.getByTestId('timer-heartbeat');
    expect(heartbeat).toBeInTheDocument();
    expect(heartbeat).toHaveAttribute('data-urgency', 'extreme');
  });

  it('shows mode badge when gameMode is provided', () => {
    render(
      <TvGameHeader remainingTime={60} timerValue={2} t={mockT} gameMode="classic" />
    );
    expect(screen.getByTestId('mode-badge')).toBeInTheDocument();
  });

  it('does not show mode badge when gameMode is null', () => {
    render(
      <TvGameHeader remainingTime={60} timerValue={2} t={mockT} gameMode={null} />
    );
    expect(screen.queryByTestId('mode-badge')).not.toBeInTheDocument();
  });

  it('renders fire round badge correctly', () => {
    render(
      <TvGameHeader
        remainingTime={60}
        timerValue={2}
        t={mockT}
        fireRoundActive={true}
        fireRoundRemaining={15}
      />
    );
    expect(screen.getByText('tvBroadcast.fireRound')).toBeInTheDocument();
  });

  it('renders earthquake warning correctly', () => {
    render(
      <TvGameHeader
        remainingTime={60}
        timerValue={2}
        t={mockT}
        earthquakeState="warning"
      />
    );
    expect(screen.getByText('tvBroadcast.earthquake')).toBeInTheDocument();
  });
});
