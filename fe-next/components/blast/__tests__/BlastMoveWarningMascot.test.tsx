/**
 * Tests for BlastMoveWarningMascot — low-moves sweating mascot overlay.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { BlastMoveWarningMascot } from '../BlastMoveWarningMascot';

jest.mock('@/components/motion/AdaptiveMotion', () => ({
  AdaptiveMotion: {
    div: (props: React.PropsWithChildren<{ className?: string; style?: React.CSSProperties }>) => <div {...props} />,
  },
  AdaptiveAnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

const mockT = (key: string) => {
  const map: Record<string, string> = {
    'blast.moveWarning.label': 'LOW MOVES!',
    'blast.mascot.sweating': 'Sweating mascot',
  };
  return map[key];
};

describe('BlastMoveWarningMascot', () => {
  it('renders nothing when movesRemaining > 3', () => {
    const { container } = render(<BlastMoveWarningMascot movesRemaining={4} t={mockT} />);
    expect(container.textContent).toBe('');
  });

  it('renders nothing when movesRemaining is 0', () => {
    const { container } = render(<BlastMoveWarningMascot movesRemaining={0} t={mockT} />);
    expect(container.textContent).toBe('');
  });

  it.each([1, 2, 3])('renders sweating mascot when movesRemaining=%i', (moves) => {
    render(<BlastMoveWarningMascot movesRemaining={moves} t={mockT} />);
    const img = screen.getByTestId('blast-move-warning-mascot') as HTMLImageElement;
    expect(img.src).toContain('mascot-new-scared');
    expect(img.getAttribute('data-mascot-key')).toBe('sweating');
  });

  it('renders translated label when active', () => {
    render(<BlastMoveWarningMascot movesRemaining={2} t={mockT} />);
    expect(screen.getByText('LOW MOVES!')).toBeInTheDocument();
  });
});
