import { describe, it, expect } from 'vitest';
import { createNonePortal, createPortal } from './portal';

describe('portal (none / standalone)', () => {
  it('defaults to the none portal when VITE_PORTAL is unset', () => {
    expect(createPortal().name).toBe('none');
  });

  it('none portal is all safe no-ops and never throws', async () => {
    const p = createNonePortal();
    expect(p.name).toBe('none');
    await expect(p.ready()).resolves.toBeUndefined();
    expect(() => { p.gameplayStart(); p.gameplayStop(); p.happytime(); }).not.toThrow();
    await expect(p.commercialBreak()).resolves.toBeUndefined();
    await expect(p.rewardedBreak()).resolves.toBe(false);
  });
});
