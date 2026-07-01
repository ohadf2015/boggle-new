import { describe, it, expect, beforeEach } from 'vitest';
import {
  registerNavigationGuard,
  isNavigationGuardActive,
  __resetNavigationGuardsForTest,
} from '../navigationGuardRegistry';

describe('navigationGuardRegistry', () => {
  beforeEach(() => __resetNavigationGuardsForTest());

  it('is inactive with no guards registered', () => {
    expect(isNavigationGuardActive()).toBe(false);
  });

  it('becomes active while a guard is registered', () => {
    const unregister = registerNavigationGuard();
    expect(isNavigationGuardActive()).toBe(true);
    unregister();
    expect(isNavigationGuardActive()).toBe(false);
  });

  it('stays active until the LAST of several guards unregisters', () => {
    const a = registerNavigationGuard();
    const b = registerNavigationGuard();
    a();
    expect(isNavigationGuardActive()).toBe(true);
    b();
    expect(isNavigationGuardActive()).toBe(false);
  });

  it('unregister is idempotent (double-call cannot underflow the count)', () => {
    const a = registerNavigationGuard();
    const b = registerNavigationGuard();
    a();
    a(); // second call is a no-op — must NOT drop b's registration
    expect(isNavigationGuardActive()).toBe(true);
    b();
    expect(isNavigationGuardActive()).toBe(false);
  });
});
