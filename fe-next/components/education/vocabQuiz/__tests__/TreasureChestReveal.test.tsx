/**
 * Treasure Chest Reveal — test suite.
 *
 * Tests the animation and display of a chest outcome.
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { TreasureChestReveal } from '../TreasureChestReveal';
import type { TreasureChestState } from '@/shared/types/vocabQuiz';

const mockT = (key: string, params?: Record<string, string | number>) => {
  if (key === 'vocabQuiz.treasure.outcome.gain') return `Gain {amount}`;
  if (key === 'vocabQuiz.treasure.outcome.double') return `Double ({amount})`;
  if (key === 'vocabQuiz.treasure.outcome.steal') return `Steal from {target}: {amount}`;
  if (key === 'vocabQuiz.treasure.outcome.swap') return `Swap with {target}`;
  if (key === 'vocabQuiz.treasure.outcome.small-loss') return `Lost {amount}`;
  return key;
};

describe('TreasureChestReveal', () => {
  it('renders gain outcome with amount', () => {
    const chest: TreasureChestState = {
      outcome: 'gain',
      amount: 10,
      standings: [],
    };

    render(<TreasureChestReveal state={chest} t={mockT} />);

    expect(screen.getByText(/Gain/)).toBeInTheDocument();
    expect(screen.getByText(/10/)).toBeInTheDocument();
  });

  it('renders double outcome', () => {
    const chest: TreasureChestState = {
      outcome: 'double',
      amount: 20,
      standings: [],
    };

    render(<TreasureChestReveal state={chest} t={mockT} />);

    expect(screen.getByText(/Double/)).toBeInTheDocument();
  });

  it('renders steal outcome with target username', () => {
    const chest: TreasureChestState = {
      outcome: 'steal',
      amount: 8,
      targetUsername: 'Alice',
      standings: [],
    };

    render(<TreasureChestReveal state={chest} t={mockT} />);

    expect(screen.getByText(/Steal/)).toBeInTheDocument();
    expect(screen.getByText(/Alice/)).toBeInTheDocument();
  });

  it('renders swap outcome with target username', () => {
    const chest: TreasureChestState = {
      outcome: 'swap',
      amount: 15,
      targetUsername: 'Bob',
      standings: [],
    };

    render(<TreasureChestReveal state={chest} t={mockT} />);

    expect(screen.getByText(/Swap/)).toBeInTheDocument();
    expect(screen.getByText(/Bob/)).toBeInTheDocument();
  });

  it('renders small-loss outcome', () => {
    const chest: TreasureChestState = {
      outcome: 'small-loss',
      amount: -7,
      standings: [],
    };

    render(<TreasureChestReveal state={chest} t={mockT} />);

    expect(screen.getByText(/Lost/)).toBeInTheDocument();
  });

  it('uses dark background (neo-navy) for full-screen overlay', () => {
    const chest: TreasureChestState = {
      outcome: 'gain',
      amount: 5,
      standings: [],
    };

    const { container } = render(<TreasureChestReveal state={chest} t={mockT} />);
    const wrapper = container.firstChild as HTMLElement;

    expect(wrapper.classList.contains('bg-neo-navy')).toBe(true);
  });
});
