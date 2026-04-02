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
    onQuit: vi.fn(),
    t: (key: string) => key,
  };

  beforeEach(() => {
    vi.clearAllMocks();
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

  it('should render help button when onShowHelp is provided', () => {
    const onShowHelp = vi.fn();
    render(<WordHuntMPHeader {...defaultProps} onShowHelp={onShowHelp} />);
    const helpBtn = screen.getByTestId('wh-help-button');
    expect(helpBtn).toBeInTheDocument();
  });

  it('should call onShowHelp when help button is clicked', () => {
    const onShowHelp = vi.fn();
    render(<WordHuntMPHeader {...defaultProps} onShowHelp={onShowHelp} />);
    fireEvent.click(screen.getByTestId('wh-help-button'));
    expect(onShowHelp).toHaveBeenCalledTimes(1);
  });

  it('should render spacer when onShowHelp is not provided', () => {
    render(<WordHuntMPHeader {...defaultProps} />);
    expect(screen.queryByTestId('wh-help-button')).not.toBeInTheDocument();
  });
});
