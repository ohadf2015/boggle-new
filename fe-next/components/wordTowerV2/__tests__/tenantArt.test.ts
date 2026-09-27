import { describe, expect, it, vi } from 'vitest';
import { FLIGHT_MS, STAGGER_MS, TenantCrowd } from '../tenantArt';

describe('TenantCrowd', () => {
  it('given tenants in flight, when time passes, then each arrives exactly once, one after another', () => {
    const crowd = new TenantCrowd();
    const onArrive = vi.fn();
    crowd.moveIn('b1', 3, 40, 200);
    const target = () => ({ x: 40, y: -60, halfW: 80 });

    // Read off the real timings: the arrival ORDER is the contract, and the
    // flight/stagger have been re-tuned more than once.
    crowd.update(FLIGHT_MS + 1, 1, target, onArrive); // first flight done, others staggered behind
    expect(onArrive).toHaveBeenCalledTimes(1);
    for (let i = 0; i < 20; i += 1) crowd.update(STAGGER_MS, 1, target, onArrive);
    expect(onArrive).toHaveBeenCalledTimes(3);
    expect(crowd.layer.children).toHaveLength(0);
  });

  it('given the floor fell off before they arrived, when updated, then every tenant is still delivered (the counter must match the run)', () => {
    const crowd = new TenantCrowd();
    const onArrive = vi.fn();
    crowd.moveIn('gone', 4, -40, 200);
    for (let i = 0; i < 20; i += 1) crowd.update(100, 1, () => null, onArrive);
    expect(onArrive).toHaveBeenCalledTimes(4);
  });
});
