import { describe, it, expect } from 'vitest';
import {
  GRANT_POLL_MAX_TRIES,
  RETURN_INTENT_KEY,
  RETURN_INTENT_TTL_MS,
  checkoutReturnPhase,
  clearReturnIntent,
  isCheckoutSuccessSearch,
  readReturnIntent,
  rememberReturnIntent,
} from '../checkoutReturn';

function mem(): Storage {
  const bag = new Map<string, string>();
  return {
    getItem: (k) => bag.get(k) ?? null,
    setItem: (k, v) => { bag.set(k, v); },
    removeItem: (k) => { bag.delete(k); },
    clear: () => bag.clear(),
    key: (i) => [...bag.keys()][i] ?? null,
    get length() { return bag.size; },
  };
}

describe('isCheckoutSuccessSearch', () => {
  it('accepts the Polar success query with or without a leading ?', () => {
    expect(isCheckoutSuccessSearch('?checkout=success')).toBe(true);
    expect(isCheckoutSuccessSearch('checkout=success')).toBe(true);
    expect(isCheckoutSuccessSearch('?checkout=success&utm=x')).toBe(true);
  });

  it('rejects a normal teacher visit and a cancelled checkout', () => {
    expect(isCheckoutSuccessSearch('')).toBe(false);
    expect(isCheckoutSuccessSearch('?checkout=cancel')).toBe(false);
    expect(isCheckoutSuccessSearch('?classroomId=c1')).toBe(false);
  });
});

describe('return intent', () => {
  it('remembers a return and forgets it after 30 minutes', () => {
    const storage = mem();
    rememberReturnIntent(storage, 1_000);
    expect(storage.getItem(RETURN_INTENT_KEY)).toBe('1000');
    expect(readReturnIntent(storage, 1_000 + RETURN_INTENT_TTL_MS - 1)).toBe(true);
    expect(readReturnIntent(storage, 1_000 + RETURN_INTENT_TTL_MS)).toBe(false);
  });

  it('clears the intent on dismiss', () => {
    const storage = mem();
    rememberReturnIntent(storage, 1_000);
    clearReturnIntent(storage);
    expect(readReturnIntent(storage, 1_000)).toBe(false);
  });

  it('does not throw when storage is blocked', () => {
    const blocked = {
      getItem: () => { throw new Error('blocked'); },
      setItem: () => { throw new Error('blocked'); },
      removeItem: () => { throw new Error('blocked'); },
    };
    expect(() => rememberReturnIntent(blocked)).not.toThrow();
    expect(readReturnIntent(blocked)).toBe(false);
    expect(() => clearReturnIntent(blocked)).not.toThrow();
  });
});

describe('checkoutReturnPhase', () => {
  it('stays idle unless this visit is a checkout return', () => {
    expect(checkoutReturnPhase({ active: false, hasPro: false, loading: false, attempts: 0 })).toBe('idle');
  });

  it('shows activating while the webhook grant has not landed', () => {
    expect(checkoutReturnPhase({ active: true, hasPro: false, loading: true, attempts: 0 })).toBe('activating');
    expect(checkoutReturnPhase({
      active: true, hasPro: false, loading: false, attempts: GRANT_POLL_MAX_TRIES - 1,
    })).toBe('activating');
  });

  it('shows success as soon as the server grant is visible, even after a failure poll', () => {
    expect(checkoutReturnPhase({
      active: true, hasPro: true, loading: false, attempts: GRANT_POLL_MAX_TRIES,
    })).toBe('success');
  });

  it('shows failure only after the poll budget, and never grants from the phase', () => {
    expect(checkoutReturnPhase({
      active: true, hasPro: false, loading: false, attempts: GRANT_POLL_MAX_TRIES,
    })).toBe('failure');
  });
});
