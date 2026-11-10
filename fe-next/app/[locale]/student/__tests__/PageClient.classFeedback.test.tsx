import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

/**
 * ONE story: after a class round pays out, the student class page offers a
 * one-tap feedback bubble tagged for the class surface — and the bubble
 * outlives the 5-second reward toast it shares a moment with.
 */

vi.mock('@/components/feedback/GameFeedback', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => (
    <div
      data-testid="class-feedback-bubble"
      data-surface={String(props.surface)}
      data-game-mode={String(props.gameMode)}
      data-throttle-key={String(props.throttleKey)}
    />
  ),
}));

import { knobs, resetKnobs } from './academyTestMocks';
import StudentPageClient from '../PageClient';

const PAYOUT = { userId: 's1', xpEarned: 40, lessonIds: [], gameCode: 'ABC123' };

describe('StudentPageClient — class round feedback bubble', () => {
  beforeEach(() => resetKnobs());

  it('shows no feedback bubble before any class round has paid out', async () => {
    render(<StudentPageClient />);
    await screen.findByTestId('academy-hub');
    expect(screen.queryByTestId('class-feedback-bubble')).toBeNull();
  });

  it('asks for feedback on the class surface after a class round pays out', async () => {
    knobs.reward = PAYOUT;
    render(<StudentPageClient />);
    const bubble = await screen.findByTestId('class-feedback-bubble');
    expect(bubble.getAttribute('data-surface')).toBe('class_round');
    expect(bubble.getAttribute('data-game-mode')).toBe('classroom');
    expect(bubble.getAttribute('data-throttle-key')).toBe('ABC123');
  });

  it('keeps the bubble after the reward toast clears', async () => {
    knobs.reward = PAYOUT;
    const { rerender } = render(<StudentPageClient />);
    await screen.findByTestId('class-feedback-bubble');
    // The hub clears the reward after ~5s; the bubble must not vanish with it.
    knobs.reward = null;
    rerender(<StudentPageClient />);
    expect(screen.getByTestId('class-feedback-bubble')).toBeInTheDocument();
  });
});
