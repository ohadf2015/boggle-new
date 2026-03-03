/**
 * BlastMoveCounter — Tests for the move counter UI component.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock framer-motion
jest.mock('framer-motion', () => {
  const MockDiv = React.forwardRef(function MockDiv({ children, ...rest }: React.PropsWithChildren<Record<string, unknown>>, ref: React.Ref<HTMLDivElement>) {
    return <div ref={ref} {...rest}>{children}</div>;
  });
  const MockSpan = React.forwardRef(function MockSpan({ children, ...rest }: React.PropsWithChildren<Record<string, unknown>>, ref: React.Ref<HTMLSpanElement>) {
    return <span ref={ref} {...rest}>{children}</span>;
  });
  return {
    motion: { div: MockDiv, span: MockSpan },
    AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
  };
});

import { BlastMoveCounter } from '../BlastMoveCounter';

const mockT = (key: string) => {
  const translations: Record<string, string> = {
    'blast.movesLeft': 'Moves',
    'blast.bonusMove': '+1 Move!',
    'blast.bonusMoves': '+{count} Moves!',
  };
  return translations[key];
};

describe('BlastMoveCounter', () => {
  it('renders the move count', () => {
    render(<BlastMoveCounter movesRemaining={15} totalMoves={20} t={mockT} />);
    expect(screen.getByText('15')).toBeInTheDocument();
  });

  it('renders the label', () => {
    render(<BlastMoveCounter movesRemaining={15} totalMoves={20} t={mockT} />);
    expect(screen.getByText('Moves')).toBeInTheDocument();
  });

  it('applies green styling when moves > 5', () => {
    const { container } = render(
      <BlastMoveCounter movesRemaining={10} totalMoves={20} t={mockT} />
    );
    const counterEl = container.querySelector('[data-testid="move-counter"]');
    expect(counterEl).toBeInTheDocument();
    expect(counterEl?.className).toContain('green');
  });

  it('applies yellow styling when moves are 3-5', () => {
    const { container } = render(
      <BlastMoveCounter movesRemaining={4} totalMoves={20} t={mockT} />
    );
    const counterEl = container.querySelector('[data-testid="move-counter"]');
    expect(counterEl?.className).toContain('yellow');
  });

  it('applies red styling when moves are 1-2', () => {
    const { container } = render(
      <BlastMoveCounter movesRemaining={2} totalMoves={20} t={mockT} />
    );
    const counterEl = container.querySelector('[data-testid="move-counter"]');
    expect(counterEl?.className).toContain('red');
  });

  it('applies urgent shake styling at 1 move', () => {
    const { container } = render(
      <BlastMoveCounter movesRemaining={1} totalMoves={20} t={mockT} />
    );
    const counterEl = container.querySelector('[data-testid="move-counter"]');
    expect(counterEl?.className).toContain('shake');
  });

  it('shows bonus move popup when bonusMoveAwarded is set', () => {
    render(
      <BlastMoveCounter movesRemaining={16} totalMoves={20} t={mockT} bonusMoveAwarded={1} />
    );
    expect(screen.getByText('+1 Move!')).toBeInTheDocument();
  });

  it('does not render when totalMoves is Infinity (unlimited mode)', () => {
    const { container } = render(
      <BlastMoveCounter movesRemaining={Infinity} totalMoves={Infinity} t={mockT} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('has correct aria-label for accessibility', () => {
    render(<BlastMoveCounter movesRemaining={8} totalMoves={20} t={mockT} />);
    const counterEl = screen.getByTestId('move-counter');
    expect(counterEl).toHaveAttribute('aria-label');
  });
});
