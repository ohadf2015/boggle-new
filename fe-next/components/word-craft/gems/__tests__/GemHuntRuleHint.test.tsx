import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GemHuntRuleHint } from '../GemHuntRuleHint';

describe('GemHuntRuleHint', () => {
  it('renders the one-line rule text so a first-timer sees the win condition and the how', () => {
    render(<GemHuntRuleHint text="Collect gems, transmute 3-of-a-kind, win a crown of all 4 colors" dismissLabel="Got it" onDismiss={() => {}} />);
    expect(screen.getByText(/transmute/i)).toBeTruthy();
  });

  it('calls onDismiss when the player closes it', () => {
    const onDismiss = vi.fn();
    render(<GemHuntRuleHint text="rule text" dismissLabel="Got it" onDismiss={onDismiss} />);
    fireEvent.click(screen.getByRole('button', { name: 'Got it' }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('renders nothing when dismissed is true (so it never re-clutters after the player confirms)', () => {
    const { container } = render(
      <GemHuntRuleHint text="rule text" dismissLabel="Got it" onDismiss={() => {}} dismissed />,
    );
    expect(container.firstChild).toBeNull();
  });
});
