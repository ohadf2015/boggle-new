import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { BraceControl } from '../rescue/BraceControl';

afterEach(cleanup);

const t = (key: string) => key;
const api = {
  offered: true, price: 40, affordable: true, spent: 0, buy: vi.fn(), rescue: null, rescuesLeft: 2,
  startRescue: vi.fn(), submitRescue: vi.fn(), cancelRescue: vi.fn(),
} as never;

/**
 * Under the HUD, the offer sat in the crane's swing lane: on a phone the
 * hanging slab passed right beneath it and the button covered what you were
 * aiming. It belongs by the dock, next to DROP, where the thumb already is.
 */
describe('BraceControl placement', () => {
  it('given an offer, when shown, then it is anchored above the dock, not under the HUD', () => {
    render(<BraceControl t={t} api={api} reducedMotion />);
    const box = screen.getByText('wordTowerV2.brace.button').closest('div')!;
    expect(box.className).toMatch(/--wt2-dock/);
    expect(box.className).not.toMatch(/--wt2-hud/);
  });
});
