import { describe, it, expect } from 'vitest';
import {
  GRANT_POLL_MAX_TRIES,
  RETURN_INTENT_KEY,
  RETURN_INTENT_TTL_MS,
  checkoutIdFromSearch,
  checkoutReturnPhase,
  clearReturnIntent,
  isCheckoutSuccessSearch,
  normalizeCheckoutId,
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

describe('checkoutIdFromSearch', () => {
  const id = '4b9c2f1e-7a3d-4c5e-9f0a-1b2c3d4e5f6a';

  it('reads the checkout_id Polar substitutes into the success_url', () => {
    expect(checkoutIdFromSearch(`?checkout=success&checkout_id=${id}`)).toBe(id);
    expect(checkoutIdFromSearch(`checkout_id=${id}&checkout=success`)).toBe(id);
  });

  it('returns null for a stale success bookmark (no id) or a malformed one', () => {
    expect(checkoutIdFromSearch('?checkout=success')).toBe(null);
    expect(checkoutIdFromSearch('')).toBe(null);
    expect(checkoutIdFromSearch('?checkout=success&checkout_id=garbage')).toBe(null);
  });
});

describe('normalizeCheckoutId', () => {
  it('accepts only UUID-shaped ids', () => {
    expect(normalizeCheckoutId('4b9c2f1e-7a3d-4c5e-9f0a-1b2c3d4e5f6a')).toBe('4b9c2f1e-7a3d-4c5e-9f0a-1b2c3d4e5f6a');
    expect(normalizeCheckoutId('4B9C2F1E-7A3D-4C5E-9F0A-1B2C3D4E5F6A')).toBe('4B9C2F1E-7A3D-4C5E-9F0A-1B2C3D4E5F6A');
    expect(normalizeCheckoutId('not-a-uuid')).toBe(null);
    expect(normalizeCheckoutId(42)).toBe(null);
    expect(normalizeCheckoutId(undefined)).toBe(null);
    expect(normalizeCheckoutId(null)).toBe(null);
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
