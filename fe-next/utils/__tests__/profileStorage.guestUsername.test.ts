import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getOrCreateStoredUsername, getStoredUsername, setStoredUsername, clearStoredUsername } from '../profileStorage';
import { validateUsername } from '../validation';

describe('getOrCreateStoredUsername', () => {
  beforeEach(() => {
    clearStoredUsername();
    vi.clearAllMocks();
  });

  it('returns the stored name when the guest already has one', () => {
    setStoredUsername('ExistingGuest');
    expect(getOrCreateStoredUsername('en')).toBe('ExistingGuest');
  });

  it('invents and persists a name for a first-time guest', () => {
    expect(getStoredUsername()).toBeFalsy();

    const name = getOrCreateStoredUsername('en');

    expect(name).toBeTruthy();
    // Persisted, so the create modal, the join modal and the emit chokepoint
    // all show the SAME guest identity instead of three different randoms.
    expect(getStoredUsername()).toBe(name);
  });

  it('is stable across calls', () => {
    const first = getOrCreateStoredUsername('en');
    const second = getOrCreateStoredUsername('en');
    expect(second).toBe(first);
  });

  it('only returns names the room modals will actually accept', () => {
    // A prefilled name that fails validateUsername would be worse than no
    // prefill — the Create button would sit disabled with a name in the box.
    for (let i = 0; i < 25; i++) {
      clearStoredUsername();
      const name = getOrCreateStoredUsername('en');
      expect(validateUsername(name).isValid, `generated "${name}" must validate`).toBe(true);
    }
  });
});
