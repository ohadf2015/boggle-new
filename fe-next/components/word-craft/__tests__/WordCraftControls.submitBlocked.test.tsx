import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WordCraftControls } from '../WordCraftControls';

const labels = { submit: 'Submit', recall: 'Recall', pass: 'Pass', swap: 'Swap' };
const noop = () => {};

function renderControls(extra: Record<string, unknown> = {}) {
  return render(
    <WordCraftControls
      canSubmit={false}
      canRecall={false}
      canSwap
      disabled={false}
      onSubmit={noop}
      onRecall={noop}
      onPass={noop}
      onSwap={noop}
      labels={labels}
      {...extra}
    />,
  );
}

describe('WordCraftControls submit with nothing placed', () => {
  it('tells the player why instead of ignoring the tap', () => {
    const onSubmit = vi.fn();
    const onSubmitBlocked = vi.fn();
    renderControls({ onSubmit, onSubmitBlocked });
    const btn = screen.getByRole('button', { name: 'Submit' });
    fireEvent.click(btn);
    expect(onSubmitBlocked).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
    expect(btn.getAttribute('aria-disabled')).toBe('true');
  });

  it('submits normally when a move is ready', () => {
    const onSubmit = vi.fn();
    const onSubmitBlocked = vi.fn();
    renderControls({ canSubmit: true, onSubmit, onSubmitBlocked });
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmitBlocked).not.toHaveBeenCalled();
  });

  it('stays hard-disabled when the whole control row is disabled (not the player turn)', () => {
    const onSubmitBlocked = vi.fn();
    renderControls({ disabled: true, onSubmitBlocked });
    const btn = screen.getByRole('button', { name: 'Submit' }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });
});
