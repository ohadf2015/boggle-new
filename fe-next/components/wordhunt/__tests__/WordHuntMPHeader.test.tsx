/**
 * Tests for WordHuntMPHeader
 * Timer + score + quit button for MP WordHunt
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock CircularTimer
jest.mock('@/components/CircularTimer', () => {
  return function MockCircularTimer(props: { remainingTime: number; totalTime?: number; size?: string }) {
    return <div data-testid="circular-timer" data-remaining={props.remainingTime} data-size={props.size} />;
  };
});

import { WordHuntMPHeader } from '../WordHuntMPHeader';

describe('WordHuntMPHeader', () => {
  const defaultProps = {
    remainingTime: 120,
    totalTime: 180,
    score: 450,
    onQuit: jest.fn(),
    t: (key: string) => key,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render CircularTimer with correct props', () => {
    render(<WordHuntMPHeader {...defaultProps} />);
    const timer = screen.getByTestId('circular-timer');
    expect(timer).toBeInTheDocument();
    expect(timer).toHaveAttribute('data-remaining', '120');
  });

  it('should display the score', () => {
    render(<WordHuntMPHeader {...defaultProps} />);
    expect(screen.getByText('450')).toBeInTheDocument();
  });

  it('should render quit button', () => {
    render(<WordHuntMPHeader {...defaultProps} />);
    const quitBtn = screen.getByRole('button');
    expect(quitBtn).toBeInTheDocument();
  });

  it('should call onQuit when quit button is clicked', () => {
    render(<WordHuntMPHeader {...defaultProps} />);
    fireEvent.click(screen.getByRole('button'));
    expect(defaultProps.onQuit).toHaveBeenCalledTimes(1);
  });

  it('should use small timer size', () => {
    render(<WordHuntMPHeader {...defaultProps} />);
    const timer = screen.getByTestId('circular-timer');
    expect(timer).toHaveAttribute('data-size', 'sm');
  });

  it('should handle null remainingTime gracefully', () => {
    render(<WordHuntMPHeader {...defaultProps} remainingTime={null as unknown as number} />);
    const timer = screen.getByTestId('circular-timer');
    expect(timer).toBeInTheDocument();
  });
});
