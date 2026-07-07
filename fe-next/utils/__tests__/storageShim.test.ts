import { describe, it, expect } from 'vitest';
import { STORAGE_SHIM_SCRIPT } from '../storageShim';

function runShim(win: Record<string, unknown>) {
  // The shim is a plain IIFE string (no imports) meant to run in a
  // real <script> tag; `new Function('window', ...)` runs it against a
  // fake window the same way, without needing a browser.
  const fn = new Function('window', STORAGE_SHIM_SCRIPT);
  fn(win);
}

function workingStorage() {
  const store: Record<string, string> = {};
  return {
    getItem: (k: string) => (k in store ? store[k] : null),
    setItem: (k: string, v: string) => {
      store[k] = v;
    },
    removeItem: (k: string) => {
      delete store[k];
    },
  };
}

function throwingStorage() {
  return {
    getItem: () => {
      throw new Error('blocked');
    },
    setItem: () => {
      throw new Error('blocked');
    },
    removeItem: () => {
      throw new Error('blocked');
    },
  };
}

describe('STORAGE_SHIM_SCRIPT', () => {
  it('leaves working localStorage/sessionStorage untouched', () => {
    const localStorage = workingStorage();
    const sessionStorage = workingStorage();
    const win = { localStorage, sessionStorage };

    runShim(win);

    expect(win.localStorage).toBe(localStorage);
    expect(win.sessionStorage).toBe(sessionStorage);
  });

  it('replaces throwing localStorage with a working in-memory fallback', () => {
    const win = { localStorage: throwingStorage(), sessionStorage: workingStorage() };

    runShim(win);

    const ls = win.localStorage as unknown as Storage;
    expect(() => ls.setItem('k', 'v')).not.toThrow();
    expect(ls.getItem('k')).toBe('v');
    ls.removeItem('k');
    expect(ls.getItem('k')).toBeNull();
  });

  it('replaces throwing sessionStorage independently of localStorage', () => {
    const win = { localStorage: workingStorage(), sessionStorage: throwingStorage() };

    runShim(win);

    expect(win.localStorage).not.toHaveProperty('__replaced__');
    const ss = win.sessionStorage as unknown as Storage;
    expect(() => ss.setItem('k', 'v')).not.toThrow();
    expect(ss.getItem('k')).toBe('v');
  });

  it('never throws even when window has no storage objects at all', () => {
    expect(() => runShim({})).not.toThrow();
  });
});
