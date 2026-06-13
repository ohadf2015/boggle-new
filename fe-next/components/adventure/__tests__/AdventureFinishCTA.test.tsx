/**
 * AdventureFinishCTA — the "I'm done, end the level now" button.
 *
 * Surfaces when every PRIMARY objective is met but a secondary is still open,
 * so the player can claim their earned stars without waiting out the timer.
 * (When ALL objectives are met the level auto-ends, so this never shows then.)
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import AdventureFinishCTA from '../AdventureFinishCTA';

const t = (k: string, vars?: Record<string, string | number>) =>
  vars ? `${k}:${JSON.stringify(vars)}` : k;

describe('AdventureFinishCTA', () => {
  it('renders nothing when not visible', () => {
    const { container } = render(
      <AdventureFinishCTA visible={false} starsSoFar={2} onFinish={vi.fn()} t={t} isRTL={false} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders a finish button when visible', () => {
    render(
      <AdventureFinishCTA visible starsSoFar={1} onFinish={vi.fn()} t={t} isRTL={false} />
    );
    expect(screen.getByRole('button', { name: /finish/i })).toBeInTheDocument();
  });

  it('calls onFinish when clicked', () => {
    const onFinish = vi.fn();
    render(
      <AdventureFinishCTA visible starsSoFar={3} onFinish={onFinish} t={t} isRTL={false} />
    );
    fireEvent.click(screen.getByRole('button', { name: /finish/i }));
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it('communicates the stars the player will keep', () => {
    render(
      <AdventureFinishCTA visible starsSoFar={2} onFinish={vi.fn()} t={t} isRTL={false} />
    );
    // The keep-stars hint passes the star count through to t()
    expect(screen.getByText(/"stars":2|adventure\.game\.finishKeepStars/)).toBeInTheDocument();
  });
});
