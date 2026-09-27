/**
 * The celebration is decorative. It must never be the thing a tap lands on.
 *
 * From the r5 capture: a click aimed at a lobby control failed with
 * `covered by <video>` — the trophy loop was the topmost element at that
 * point. `aria-hidden` hides it from assistive tech; it does nothing about
 * hit-testing. The layer that actually covers the lobby is the recap screen
 * (fixed inset-0, z-75) and that is fixed separately with a dismiss control,
 * but a decorative <video> sitting on top of any control is its own defect:
 * it also sits inside the recap, above the Rematch button's column.
 *
 * `CelebrationLoop` already carries `pointer-events-none`; this pins the same
 * rule on the mascot frame so the two celebration layers cannot diverge.
 */
import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';

import { WinnerSpotlight } from '../WinnerSpotlight';

const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${JSON.stringify(params)}` : key;

const winner = { username: 'Noa', score: 80, rank: 1 };

describe('WinnerSpotlight — the trophy never eats a tap', () => {
  afterEach(cleanup);

  it('the mascot frame is transparent to pointer events while revealed', () => {
    render(<WinnerSpotlight winner={winner} active t={t} />);
    expect(screen.getByTestId('winner-mascot-frame').className).toMatch(/pointer-events-none/);
  });

  it('and before the reveal, when it is still a drumroll', () => {
    render(<WinnerSpotlight winner={winner} active={false} t={t} />);
    expect(screen.getByTestId('winner-mascot-frame').className).toMatch(/pointer-events-none/);
  });

  it('the video itself is aria-hidden AND unhittable', () => {
    render(<WinnerSpotlight winner={winner} active t={t} />);
    const video = screen.getByTestId('winner-mascot-video');
    expect(video).toHaveAttribute('aria-hidden');
    expect(video.className).toMatch(/pointer-events-none/);
  });
});
