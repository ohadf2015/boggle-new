import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GemHuntRuleHint } from '../GemHuntRuleHint';

const gsapFromToMock = vi.fn().mockReturnValue(undefined);
vi.mock('gsap', () => ({
  gsap: {
    fromTo: (...args: unknown[]) => gsapFromToMock(...args),
  },
}));

function setReducedMotion(matches: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

describe('GemHuntRuleHint', () => {
  beforeEach(() => {
    gsapFromToMock.mockClear();
    setReducedMotion(false);
  });

  it('pops in on first mount so a first-timer notices the one rule they need', () => {
    render(<GemHuntRuleHint text="rule text" dismissLabel="Got it" onDismiss={() => {}} />);
    expect(gsapFromToMock).toHaveBeenCalledTimes(1);
  });

  it('skips the entrance tween when prefers-reduced-motion is set', () => {
    setReducedMotion(true);
    render(<GemHuntRuleHint text="rule text" dismissLabel="Got it" onDismiss={() => {}} />);
    expect(gsapFromToMock).not.toHaveBeenCalled();
  });

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
