import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BlastCakeOverlay } from '../BlastCakeOverlay';

describe('BlastCakeOverlay', () => {
  it('renders 5 pips when maxHp=5 on anchor', () => {
    render(<BlastCakeOverlay hp={5} maxHp={5} isAnchor />);
    expect(screen.getAllByTestId(/^blast-cake-hp-pip-/)).toHaveLength(5);
  });

  it('shows 2 filled pips when hp=2', () => {
    render(<BlastCakeOverlay hp={2} maxHp={5} isAnchor />);
    expect(screen.getAllByTestId('blast-cake-hp-pip-filled')).toHaveLength(2);
  });

  it('renders no pips on satellite cells', () => {
    render(<BlastCakeOverlay hp={5} maxHp={5} isAnchor={false} />);
    expect(screen.queryByTestId(/blast-cake-hp-pip/)).toBeNull();
  });

  it('still renders the cake background on satellites', () => {
    render(<BlastCakeOverlay hp={5} maxHp={5} isAnchor={false} />);
    expect(screen.getByTestId('blast-cake-overlay')).toBeInTheDocument();
  });
});
