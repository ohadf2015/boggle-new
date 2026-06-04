import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { WheelRushHeader, type WheelRushPlayer } from '../WheelRushHeader';

const t = (k: string, p?: Record<string, string | number>) => (p ? `${k}` : k);

function setup(overrides: Partial<React.ComponentProps<typeof WheelRushHeader>> = {}) {
  const props: React.ComponentProps<typeof WheelRushHeader> = {
    leaderboard: [
      { username: 'alice', score: 30 },
      { username: 'bob', score: 50 },
      { username: 'carol', score: 10 },
    ],
    username: 'alice',
    fogActive: false,
    onQuit: vi.fn(),
    t,
    ...overrides,
  };
  return { props, ...render(<WheelRushHeader {...props} />) };
}

describe('WheelRushHeader', () => {
  it('shows the current player in a prominent self badge with name, score and avatar', () => {
    setup();
    const badge = screen.getByTestId('wheel-self-badge');
    expect(within(badge).getByText('alice')).toBeTruthy();
    expect(within(badge).getByTestId('wheel-self-score').textContent).toBe('30');
    expect(within(badge).getByTestId('wheel-self-avatar')).toBeTruthy();
  });

  it('renders the rival with name, score and avatar in the opponent rail', () => {
    // alice=30; bob gap 20 (ahead), carol gap 20 (behind) → tie breaks to bob.
    setup();
    const rail = screen.getByTestId('wheel-opponent-rail');
    const bob = within(rail).getByTestId('wheel-opp-bob');
    expect(within(bob).getByText('bob')).toBeTruthy();
    expect(within(bob).getByText('50')).toBeTruthy();
    expect(within(bob).getByTestId('wheel-opp-avatar-bob')).toBeTruthy();
  });

  it('excludes the current player from the opponent rail', () => {
    setup();
    const rail = screen.getByTestId('wheel-opponent-rail');
    expect(within(rail).queryByTestId('wheel-opp-alice')).toBeNull();
  });

  it('shows only the single closest rival — never a crowd of opponents', () => {
    // alice=5; the nearest opponent by score is erin (60). Everyone else,
    // including the board leader bob (90), is hidden to keep the player focused
    // on one head-to-head.
    setup({
      leaderboard: [
        { username: 'alice', score: 5 },
        { username: 'bob', score: 90 },
        { username: 'carol', score: 80 },
        { username: 'dave', score: 70 },
        { username: 'erin', score: 60 },
      ],
    });
    const rail = screen.getByTestId('wheel-opponent-rail');
    expect(within(rail).getByTestId('wheel-opp-erin')).toBeTruthy();
    expect(within(rail).queryByTestId('wheel-opp-bob')).toBeNull();
    expect(within(rail).queryByTestId('wheel-opp-carol')).toBeNull();
    expect(within(rail).queryByTestId('wheel-opp-dave')).toBeNull();
  });

  it('masks opponent scores with ??? while fog is active but keeps the self score visible', () => {
    setup({ fogActive: true });
    const rail = screen.getByTestId('wheel-opponent-rail');
    const bob = within(rail).getByTestId('wheel-opp-bob');
    expect(within(bob).getByText('???')).toBeTruthy();
    expect(within(bob).queryByText('50')).toBeNull();
    // self score never masked
    expect(screen.getByTestId('wheel-self-score').textContent).toBe('30');
  });

  it('renders the round timer when remainingTime is provided and hides it when null', () => {
    const { unmount } = setup({ remainingTime: 75 });
    expect(screen.getByTestId('wheel-rush-timer').textContent).toContain('1:15');
    unmount();
    setup({ remainingTime: null });
    expect(screen.queryByTestId('wheel-rush-timer')).toBeNull();
  });

  it('calls onQuit when the quit button is clicked', () => {
    const { props } = setup();
    fireEvent.click(screen.getByRole('button', { name: /quit/i }));
    expect(props.onQuit).toHaveBeenCalled();
  });
});
