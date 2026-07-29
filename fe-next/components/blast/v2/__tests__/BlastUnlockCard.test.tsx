import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BlastUnlockCard } from '../BlastUnlockCard';

// Mock LanguageContext
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, fallback: string) => fallback,
  }),
}));

describe('BlastUnlockCard', () => {
  it('renders card with title, body, and Got it button', () => {
    const onDismiss = vi.fn();
    render(
      <BlastUnlockCard mechanic="frozenTiles" cardIndex={0} onDismiss={onDismiss} />
    );

    expect(screen.getByText('NEW: frozenTiles')).toBeInTheDocument();
    expect(screen.getByText('A new mechanic has been unlocked')).toBeInTheDocument();
    expect(screen.getByTestId('unlock-card-got-it')).toBeInTheDocument();
  });

  it('displays icon asset', () => {
    const onDismiss = vi.fn();
    render(
      <BlastUnlockCard mechanic="frozenTiles" cardIndex={0} onDismiss={onDismiss} />
    );

    expect(screen.getByText('❄️')).toBeInTheDocument();
  });

  it('calls onDismiss when Got it button is clicked', () => {
    const onDismiss = vi.fn();
    render(
      <BlastUnlockCard mechanic="frozenTiles" cardIndex={0} onDismiss={onDismiss} />
    );

    const button = screen.getByTestId('unlock-card-got-it');
    fireEvent.click(button);

    expect(onDismiss).toHaveBeenCalled();
  });

  it('shows Skip tutorials link for card #2+ (cardIndex >= 1)', () => {
    const onDismiss = vi.fn();
    const onSkipAll = vi.fn();
    render(
      <BlastUnlockCard mechanic="gemTiles" cardIndex={1} onDismiss={onDismiss} onSkipAll={onSkipAll} />
    );

    const skipLink = screen.getByTestId('unlock-card-skip-all');
    expect(skipLink).toBeInTheDocument();
    expect(skipLink.textContent).toContain('Skip future tutorials');
  });

  it('does not show Skip tutorials link for card #1 (cardIndex = 0)', () => {
    const onDismiss = vi.fn();
    render(
      <BlastUnlockCard mechanic="frozenTiles" cardIndex={0} onDismiss={onDismiss} />
    );

    const skipLink = screen.queryByTestId('unlock-card-skip-all');
    expect(skipLink).not.toBeInTheDocument();
  });

  it('calls onSkipAll when Skip tutorials link is clicked', () => {
    const onDismiss = vi.fn();
    const onSkipAll = vi.fn();
    render(
      <BlastUnlockCard mechanic="gemTiles" cardIndex={2} onDismiss={onDismiss} onSkipAll={onSkipAll} />
    );

    const skipLink = screen.getByTestId('unlock-card-skip-all');
    fireEvent.click(skipLink);

    expect(onSkipAll).toHaveBeenCalled();
  });

  it('renders different mechanic cards correctly', () => {
    const onDismiss = vi.fn();
    const { rerender } = render(
      <BlastUnlockCard mechanic="coinOverlay" cardIndex={0} onDismiss={onDismiss} />
    );

    expect(screen.getByText('💰')).toBeInTheDocument();

    rerender(
      <BlastUnlockCard mechanic="gemTiles" cardIndex={0} onDismiss={onDismiss} />
    );

    expect(screen.getByText('💎')).toBeInTheDocument();
  });
});
