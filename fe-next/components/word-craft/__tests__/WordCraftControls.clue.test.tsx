import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WordCraftControls } from '../WordCraftControls';

const baseLabels = { submit: 'Submit', recall: 'Recall', pass: 'Pass', swap: 'Swap' };
const noop = () => {};

function renderControls(extra: Record<string, unknown> = {}) {
  return render(
    <WordCraftControls
      canSubmit
      canRecall
      canSwap
      disabled={false}
      onSubmit={noop}
      onRecall={noop}
      onPass={noop}
      onSwap={noop}
      labels={baseLabels}
      {...extra}
    />,
  );
}

describe('WordCraftControls clue button', () => {
  it('shows the clue button + remaining count when onClue is wired', () => {
    renderControls({ onClue: noop, cluesRemaining: 2, labels: { ...baseLabels, clue: 'Clue' } });
    const btn = screen.getByRole('button', { name: /clue/i });
    expect(btn).toBeTruthy();
    expect(btn.textContent).toContain('2');
  });

  it('fires onClue when tapped', () => {
    const onClue = vi.fn();
    renderControls({ onClue, cluesRemaining: 1, labels: { ...baseLabels, clue: 'Clue' } });
    fireEvent.click(screen.getByRole('button', { name: /clue/i }));
    expect(onClue).toHaveBeenCalledTimes(1);
  });

  it('stays tappable at 0 clues (so the player can watch an ad for more)', () => {
    const onClue = vi.fn();
    renderControls({ onClue, cluesRemaining: 0, labels: { ...baseLabels, clue: 'Clue' } });
    const btn = screen.getByRole('button', { name: /clue/i });
    expect((btn as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(btn);
    expect(onClue).toHaveBeenCalled();
  });

  it('omits the clue button entirely when onClue is not provided (e.g. hot-seat)', () => {
    renderControls();
    expect(screen.queryByRole('button', { name: /clue/i })).toBeNull();
  });
});
