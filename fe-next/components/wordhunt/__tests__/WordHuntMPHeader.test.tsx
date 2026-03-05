/**
 * Tests for WordHuntMPHeader
 * Score badge + quit button for MP WordHunt (no timer — life meter is core mechanic)
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

import { WordHuntMPHeader } from '../WordHuntMPHeader';

describe('WordHuntMPHeader', () => {
  const defaultProps = {
    score: 450,
    onQuit: jest.fn(),
    t: (key: string) => key,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should NOT render a CircularTimer', () => {
    render(<WordHuntMPHeader {...defaultProps} />);
    expect(screen.queryByTestId('circular-timer')).not.toBeInTheDocument();
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

  it('should use neo-brutalist styling on score badge', () => {
    const { container } = render(<WordHuntMPHeader {...defaultProps} />);
    const scoreEl = screen.getByText('450');
    const badge = scoreEl.closest('div');
    expect(badge?.className).toContain('border-3');
    expect(badge?.className).toContain('shadow-hard-sm');
  });
});
