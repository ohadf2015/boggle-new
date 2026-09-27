/**
 * Treasure Chest Reveal — test suite.
 *
 * Tests the animation and display of a chest outcome.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TreasureChestReveal } from '../TreasureChestReveal';
import type { TreasureChestState } from '@/shared/types/vocabQuiz';

const TEMPLATES: Record<string, string> = {
  'vocabQuiz.treasure.outcome.gain': 'Gain {amount}',
  'vocabQuiz.treasure.outcome.double': 'Double ({amount})',
  'vocabQuiz.treasure.outcome.steal': 'Steal from {target}: {amount}',
  'vocabQuiz.treasure.outcome.swap': 'Swap with {target}',
  'vocabQuiz.treasure.outcome.small-loss': 'Lost {amount}',
};

/**
 * Mirrors LanguageContext.t: `t(key, params)` or `t(key, fallback, params)`,
 * substituting `{name}` placeholders. A mock that returns the raw template
 * would hide a component that forgets to pass its params.
 */
const mockT = (
  key: string,
  fallbackOrParams?: string | Record<string, string | number>,
  maybeParams?: Record<string, string | number>
): string => {
  const params = typeof fallbackOrParams === 'object' ? fallbackOrParams : maybeParams ?? {};
  const template = TEMPLATES[key] ?? (typeof fallbackOrParams === 'string' ? fallbackOrParams : key);
  return template.replace(/\{(\w+)\}/g, (m, name) => (name in params ? String(params[name]) : m));
};

describe('TreasureChestReveal', () => {
  it('renders gain outcome with amount', () => {
    const chest: TreasureChestState = {
      actor: 'me',
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
      actor: 'me',
      outcome: 'double',
      amount: 20,
      standings: [],
    };

    render(<TreasureChestReveal state={chest} t={mockT} />);

    expect(screen.getByText(/Double/)).toBeInTheDocument();
  });

  it('renders steal outcome with target username', () => {
    const chest: TreasureChestState = {
      actor: 'me',
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
      actor: 'me',
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
      actor: 'me',
      outcome: 'small-loss',
      amount: -7,
      standings: [],
    };

    render(<TreasureChestReveal state={chest} t={mockT} />);

    expect(screen.getByText(/Lost/)).toBeInTheDocument();
  });

  it('uses dark background (neo-navy) for full-screen overlay', () => {
    const chest: TreasureChestState = {
      actor: 'me',
      outcome: 'gain',
      amount: 5,
      standings: [],
    };

    const { container } = render(<TreasureChestReveal state={chest} t={mockT} />);
    const wrapper = container.firstChild as HTMLElement;

    expect(wrapper.classList.contains('bg-neo-navy')).toBe(true);
  });

  it('shows a small loss as a positive number with kind wording, never "-7"', () => {
    const chest: TreasureChestState = { actor: 'me', outcome: 'small-loss', amount: -7, standings: [] };
    render(<TreasureChestReveal state={chest} t={mockT} />);
    expect(screen.getByText('Lost 7')).toBeInTheDocument();
    expect(screen.queryByText(/-7/)).toBeNull();
  });

  it('shows the new total when the server sent one', () => {
    const chest: TreasureChestState = { actor: 'me', outcome: 'gain', amount: 30, standings: [], myScore: 230 };
    const t = (key: string, p?: string | Record<string, string | number>) =>
      key === 'vocabQuiz.treasure.newTotal' && typeof p === 'object' ? `Total ${p.score}` : mockT(key, p);
    render(<TreasureChestReveal state={chest} t={t} />);
    expect(screen.getByText('Total 230')).toBeInTheDocument();
  });

  it('tapping anywhere dismisses the reveal', () => {
    const onDismiss = vi.fn();
    const chest: TreasureChestState = { actor: 'me', outcome: 'gain', amount: 30, standings: [] };
    render(<TreasureChestReveal state={chest} t={mockT} onDismiss={onDismiss} />);
    fireEvent.click(screen.getByRole('dialog'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
