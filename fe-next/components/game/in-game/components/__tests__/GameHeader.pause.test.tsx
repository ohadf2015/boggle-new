/**
 * Pause is a single-player-only affordance: live multiplayer has no pause, so the
 * MP shell never rendered one. Solo is being moved onto this same shell, so the
 * header has to become a superset — otherwise solo silently loses its pause
 * button in the swap.
 *
 * Opt-in via `onPauseToggle`, so every existing MP call site is unchanged.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';

import { GameHeader } from '../GameHeader';

const t = ((key: string) => key) as never;

describe('GameHeader pause affordance', () => {
  it('renders no pause control for multiplayer (no onPauseToggle supplied)', () => {
    render(<GameHeader gameActive t={t} onExitRoom={vi.fn()} />);
    expect(screen.queryByTestId('game-header-pause')).toBeNull();
  });

  it('renders a pause control when a handler is supplied, and calls it', async () => {
    const user = userEvent.setup();
    const onPauseToggle = vi.fn();
    render(<GameHeader gameActive t={t} onExitRoom={vi.fn()} onPauseToggle={onPauseToggle} />);

    const btn = screen.getByTestId('game-header-pause');
    await user.click(btn);
    expect(onPauseToggle).toHaveBeenCalledTimes(1);
  });

  it('reflects paused state in its accessible label', () => {
    const { rerender } = render(
      <GameHeader gameActive t={t} onPauseToggle={vi.fn()} isPaused={false} />,
    );
    expect(screen.getByTestId('game-header-pause').getAttribute('aria-label')).toBe('common.pause');

    rerender(<GameHeader gameActive t={t} onPauseToggle={vi.fn()} isPaused />);
    expect(screen.getByTestId('game-header-pause').getAttribute('aria-label')).toBe('common.resume');
  });
});
