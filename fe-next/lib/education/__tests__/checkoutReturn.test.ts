import { describe, it, expect } from 'vitest';
import {
  isFreshCheckoutLanding,
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
  PENDING_RETURN_CHECKOUT_KEY,
  PENDING_RETURN_CHECKOUT_TTL_MS,
  clearPendingReturnCheckout,
  pendingReturnCheckoutId,
  readPendingReturnCheckout,
  rememberPendingReturnCheckout,
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

describe('isFreshCheckoutLanding', () => {
  const ID = '52e32342-5f87-49e6-ac1c-7c636b5192ff';
  const search = `?checkout=success&checkout_id=${ID}`;
  const store = () => {
    const m = new Map<string, string>();
    return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
  };

  it('Given a first landing, When asked twice in the same moment, Then both surfaces count it as fresh', () => {
    const s = store();
    expect(isFreshCheckoutLanding(s, search, 1_000)).toBe(true);
    expect(isFreshCheckoutLanding(s, search, 1_500)).toBe(true);
  });

  it('Given it was shown a minute ago, When the same checkout lands again, Then it is not fresh', () => {
    const s = store();
    isFreshCheckoutLanding(s, search, 1_000);
    expect(isFreshCheckoutLanding(s, search, 61_000)).toBe(false);
  });

  it('Given no checkout id or no storage, When asked, Then it stays fresh', () => {
    expect(isFreshCheckoutLanding(store(), '?checkout=success', 0)).toBe(true);
    const broken = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
    expect(isFreshCheckoutLanding(broken, search, 0)).toBe(true);
  });
});

describe('pending return checkout id', () => {
  const ID = '52e32342-5f87-49e6-ac1c-7c636b5192ff';

  it('stores a Polar checkout id so a later sign-in can still claim it', () => {
    const storage = mem();
    rememberPendingReturnCheckout(storage, ID, 1_000);
    expect(readPendingReturnCheckout(storage, 1_000)).toBe(ID);
    expect(storage.getItem(PENDING_RETURN_CHECKOUT_KEY)).toBeTruthy();
  });

  it('prefers the success-URL checkout id over the stored one', () => {
    const storage = mem();
    rememberPendingReturnCheckout(storage, ID, 1_000);
    const fromUrl = '4b9c2f1e-7a3d-4c5e-9f0a-1b2c3d4e5f6a';
    expect(pendingReturnCheckoutId(`?checkout=success&checkout_id=${fromUrl}`, storage, 1_000)).toBe(fromUrl);
  });

  it('falls back to the stored id when the URL has none, and forgets an expired one', () => {
    const storage = mem();
    rememberPendingReturnCheckout(storage, ID, 1_000);
    expect(pendingReturnCheckoutId('?checkout=success', storage, 1_000)).toBe(ID);
    expect(readPendingReturnCheckout(storage, 1_000 + PENDING_RETURN_CHECKOUT_TTL_MS + 1)).toBeNull();
    rememberPendingReturnCheckout(storage, ID, 1_000);
    clearPendingReturnCheckout(storage);
    expect(readPendingReturnCheckout(storage, 1_000)).toBeNull();
  });

  it('ignores a malformed stored id', () => {
    const storage = mem();
    rememberPendingReturnCheckout(storage, 'not-a-uuid', 1_000);
    expect(readPendingReturnCheckout(storage, 1_000)).toBeNull();
  });
});
