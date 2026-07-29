/**
 * Tests for useAdventureTimerStore
 */

import { vi } from 'vitest';
import { createAdventureTimerStore } from '../useAdventureTimerStore';

describe('createAdventureTimerStore', () => {
  it('initializes with correct timeRemaining', () => {
    const store = createAdventureTimerStore(60);
    expect(store.getSnapshot()).toBe(60);
    store.destroy();
  });

  it('notify() updates the snapshot value', () => {
    const store = createAdventureTimerStore(60);
    store.notify(55);
    expect(store.getSnapshot()).toBe(55);
    store.destroy();
  });

  it('notify() calls subscribers when value changes', () => {
    const store = createAdventureTimerStore(60);
    const listener = vi.fn();
    store.subscribe(listener);
    store.notify(59);
    expect(listener).toHaveBeenCalledTimes(1);
    store.destroy();
  });

  it('notify() does NOT call subscribers when value is unchanged', () => {
    const store = createAdventureTimerStore(60);
    const listener = vi.fn();
    store.subscribe(listener);
    store.notify(60); // same value
    expect(listener).not.toHaveBeenCalled();
    store.destroy();
  });

  it('subscribe() returns an unsubscribe function', () => {
    const store = createAdventureTimerStore(60);
    const listener = vi.fn();
    const unsub = store.subscribe(listener);
    store.notify(59);
    unsub();
    store.notify(58);
    expect(listener).toHaveBeenCalledTimes(1);
    store.destroy();
  });

  it('multiple subscribers all get notified', () => {
    const store = createAdventureTimerStore(60);
    const a = vi.fn();
    const b = vi.fn();
    store.subscribe(a);
    store.subscribe(b);
    store.notify(55);
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
    store.destroy();
  });

  it('destroy() clears all subscribers', () => {
    const store = createAdventureTimerStore(60);
    const listener = vi.fn();
    store.subscribe(listener);
    store.destroy();
    store.notify(50);
    expect(listener).not.toHaveBeenCalled();
  });

  it('notify() after destroy() does not throw', () => {
    const store = createAdventureTimerStore(60);
    store.destroy();
    expect(() => store.notify(30)).not.toThrow();
  });
});
