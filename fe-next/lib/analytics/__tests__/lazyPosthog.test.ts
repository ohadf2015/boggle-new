import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Lazy PostHog proxy — TDD spec.
 *
 * Goal: NO module statically imports `posthog-js`, so Turbopack stops hoisting
 * the 374KB lib into the always-loaded shared-commons chunk. Every `posthog.X`
 * call goes through this proxy, which dynamic-`import()`s posthog-js on first
 * `init()` and buffers fire-and-forget calls until then.
 *
 * The two non-trivial pieces (per review): the onFeatureFlags callback queue,
 * and nested people-set / register buffering + GDPR opt-out flush ordering.
 */

const mockPosthog = {
  init: vi.fn(),
  capture: vi.fn(),
  identify: vi.fn(),
  reset: vi.fn(),
  register: vi.fn(),
  register_once: vi.fn(),
  people: { set: vi.fn(), set_once: vi.fn() },
  opt_in_capturing: vi.fn(),
  opt_out_capturing: vi.fn(),
  has_opted_out_capturing: vi.fn(() => false),
  getFeatureFlag: vi.fn(() => 'real-variant'),
  onFeatureFlags: vi.fn(),
};

vi.mock('posthog-js', () => ({ default: mockPosthog }));

import lazyPosthog, { initLazyPostHog, _resetLazyPostHog } from '../lazyPosthog';

beforeEach(() => {
  _resetLazyPostHog();
  vi.clearAllMocks();
  mockPosthog.has_opted_out_capturing.mockReturnValue(false);
  mockPosthog.getFeatureFlag.mockReturnValue('real-variant');
});

describe('lazyPosthog proxy', () => {
  it('does not import/init posthog-js until init() is triggered', async () => {
    lazyPosthog.capture('e1');
    expect(mockPosthog.init).not.toHaveBeenCalled();
    expect(mockPosthog.capture).not.toHaveBeenCalled();
  });

  it('buffers capture before load and flushes in original order after init', async () => {
    lazyPosthog.capture('e1', { a: 1 });
    lazyPosthog.capture('e2');
    expect(mockPosthog.capture).not.toHaveBeenCalled();

    await initLazyPostHog('key', { opt_out_capturing_by_default: true });

    expect(mockPosthog.init).toHaveBeenCalledWith('key', { opt_out_capturing_by_default: true });
    expect(mockPosthog.capture).toHaveBeenNthCalledWith(1, 'e1', { a: 1 });
    expect(mockPosthog.capture).toHaveBeenNthCalledWith(2, 'e2');
  });

  it('calls init BEFORE flushing buffered captures (so opt-out gating applies)', async () => {
    lazyPosthog.capture('pre-consent');
    await initLazyPostHog('key', { opt_out_capturing_by_default: true });
    const initOrder = mockPosthog.init.mock.invocationCallOrder[0];
    const capOrder = mockPosthog.capture.mock.invocationCallOrder[0];
    expect(initOrder).toBeLessThan(capOrder);
  });

  it('buffers register / register_once / people.set / people.set_once before load', async () => {
    lazyPosthog.register({ a: 1 });
    lazyPosthog.register_once({ b: 2 });
    lazyPosthog.people.set({ c: 3 });
    lazyPosthog.people.set_once({ d: 4 });

    await initLazyPostHog('key', {});

    expect(mockPosthog.register).toHaveBeenCalledWith({ a: 1 });
    expect(mockPosthog.register_once).toHaveBeenCalledWith({ b: 2 });
    expect(mockPosthog.people.set).toHaveBeenCalledWith({ c: 3 });
    expect(mockPosthog.people.set_once).toHaveBeenCalledWith({ d: 4 });
  });

  it('getFeatureFlag returns undefined before load, real value after', async () => {
    expect(lazyPosthog.getFeatureFlag('flag')).toBeUndefined();
    await initLazyPostHog('key', {});
    expect(lazyPosthog.getFeatureFlag('flag')).toBe('real-variant');
  });

  it('onFeatureFlags callback registered BEFORE load is wired to real posthog after load', async () => {
    const cb = vi.fn();
    lazyPosthog.onFeatureFlags(cb);
    expect(mockPosthog.onFeatureFlags).not.toHaveBeenCalled();

    await initLazyPostHog('key', {});

    expect(mockPosthog.onFeatureFlags).toHaveBeenCalledWith(cb);
  });

  it('onFeatureFlags callback registered AFTER load wires immediately', async () => {
    await initLazyPostHog('key', {});
    const cb = vi.fn();
    lazyPosthog.onFeatureFlags(cb);
    expect(mockPosthog.onFeatureFlags).toHaveBeenCalledWith(cb);
  });

  it('has_opted_out_capturing returns true (safe: do-not-capture) before load', () => {
    expect(lazyPosthog.has_opted_out_capturing()).toBe(true);
  });

  it('forwards calls directly (no buffering) after load', async () => {
    await initLazyPostHog('key', {});
    lazyPosthog.capture('after', { x: 1 });
    expect(mockPosthog.capture).toHaveBeenCalledWith('after', { x: 1 });
  });

  it('initLazyPostHog is idempotent — single dynamic import + single init', async () => {
    await Promise.all([initLazyPostHog('key', {}), initLazyPostHog('key', {})]);
    await initLazyPostHog('key', {});
    expect(mockPosthog.init).toHaveBeenCalledTimes(1);
  });

  it('identify / reset / opt_in / opt_out forward after load', async () => {
    await initLazyPostHog('key', {});
    lazyPosthog.identify('u1', { plan: 'free' });
    lazyPosthog.reset();
    lazyPosthog.opt_in_capturing();
    lazyPosthog.opt_out_capturing();
    expect(mockPosthog.identify).toHaveBeenCalledWith('u1', { plan: 'free' });
    expect(mockPosthog.reset).toHaveBeenCalled();
    expect(mockPosthog.opt_in_capturing).toHaveBeenCalled();
    expect(mockPosthog.opt_out_capturing).toHaveBeenCalled();
  });
});
