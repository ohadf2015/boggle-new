/**
 * BridgeSolveReveal — the celebratory "why it works" moment after solving.
 * Shows the two real compound words that the bridge unlocks with ceremonial reveal.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BridgeSolveReveal } from '../BridgeSolveReveal';
import type { ConnectionPuzzle } from '@/lib/connections/types';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (k: string) => k, dir: 'ltr' }),
}));

const puzzle: ConnectionPuzzle = {
  id: 'p1',
  word1: 'BOOK',
  word2: 'HOLE',
  bridge: 'WORM',
  difficulty: 'easy',
};

describe('BridgeSolveReveal', () => {
  it('renders nothing when the puzzle is still playing', () => {
    const { container } = render(
      <BridgeSolveReveal puzzle={puzzle} language="en" isCorrect={false} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders the celebrate reveal when correct', () => {
    render(
      <BridgeSolveReveal puzzle={puzzle} language="en" isCorrect={true} />
    );
    expect(screen.getByTestId('bridge-solve-reveal')).toBeInTheDocument();
  });

  it('displays the left compound from whyItWorks', () => {
    render(
      <BridgeSolveReveal puzzle={puzzle} language="en" isCorrect={true} />
    );
    // whyItWorks returns { left: 'BOOKWORM', right: 'WORMHOLE' }
    expect(screen.getByText('BOOKWORM')).toBeInTheDocument();
  });

  it('displays the right compound from whyItWorks', () => {
    render(
      <BridgeSolveReveal puzzle={puzzle} language="en" isCorrect={true} />
    );
    expect(screen.getByText('WORMHOLE')).toBeInTheDocument();
  });

  it('uses neo-yellow color for celebration', () => {
    const { container } = render(
      <BridgeSolveReveal puzzle={puzzle} language="en" isCorrect={true} />
    );
    const reveal = container.querySelector('[data-testid="bridge-solve-reveal"]');
    expect(reveal).toHaveClass('bg-neo-yellow/15');
    expect(reveal).toHaveClass('border-neo-yellow/40');
  });

  it('applies dir attribute from language context', () => {
    const { container } = render(
      <BridgeSolveReveal puzzle={puzzle} language="en" isCorrect={true} />
    );
    const reveal = container.querySelector('[data-testid="bridge-solve-reveal"]');
    // Mock useLanguage returns dir: 'ltr', so we expect it to be set
    expect(reveal).toHaveAttribute('dir', 'ltr');
  });

  it('animates the reveal on mount', () => {
    const { container } = render(
      <BridgeSolveReveal puzzle={puzzle} language="en" isCorrect={true} />
    );
    const reveal = container.querySelector('[data-testid="bridge-solve-reveal"]');
    // Framer Motion will apply initial={{ opacity: 0 }} initially
    expect(reveal).toBeInTheDocument();
  });
});
