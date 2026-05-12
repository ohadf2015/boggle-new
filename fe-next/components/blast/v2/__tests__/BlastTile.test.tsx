import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BlastTile } from '../BlastTile';
import { cellId } from '@/lib/blast/v2/engine';

describe('BlastTile', () => {
  const defaultProps = {
    letter: 'A',
    cellId: cellId(0, 0),
    flags: [] as any[],
    state: 'normal' as const,
    fontStack: 'Fredoka, sans-serif',
    onPointerDown: vi.fn(),
    onPointerEnter: vi.fn(),
    onPointerUp: vi.fn(),
  };

  it('renders letter text', () => {
    render(<BlastTile {...defaultProps} />);
    expect(screen.getByText('A')).toBeInTheDocument();
  });

  it('selected state adds data-state=selected attribute', () => {
    const { container } = render(<BlastTile {...defaultProps} state="selected" />);
    const tile = container.querySelector('[data-cell-id]');
    expect(tile).toHaveAttribute('data-state', 'selected');
  });

  it('coin flag renders coin overlay', () => {
    const { container } = render(<BlastTile {...defaultProps} flags={['coin']} />);
    expect(container.querySelector('[data-flag="coin"]')).toBeInTheDocument();
  });

  it('frozen flag adds data-state-frozen attribute', () => {
    const { container } = render(<BlastTile {...defaultProps} flags={['frozen']} />);
    const tile = container.querySelector('[data-cell-id]');
    expect(tile).toHaveAttribute('data-state-frozen');
  });

  it('double_bonus flag adds data-double-bonus attribute', () => {
    const { container } = render(<BlastTile {...defaultProps} flags={['double_bonus']} />);
    const tile = container.querySelector('[data-cell-id]');
    expect(tile).toHaveAttribute('data-double-bonus');
  });
});
