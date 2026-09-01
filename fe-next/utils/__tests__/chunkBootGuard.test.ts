import { describe, it, expect, vi } from 'vitest';
import { CHUNK_BOOT_GUARD_SCRIPT } from '../chunkBootGuard';

type Handler = (e: unknown) => void;

function makeWindow(storageThrows = false) {
  const listeners: Record<string, Handler[]> = {};
  const store: Record<string, string> = {};
  const sessionStorage = storageThrows
    ? {
        getItem: () => { throw new Error('blocked'); },
        setItem: () => { throw new Error('blocked'); },
        removeItem: () => { throw new Error('blocked'); },
      }
    : {
        getItem: (k: string) => (k in store ? store[k] : null),
        setItem: (k: string, v: string) => { store[k] = v; },
        removeItem: (k: string) => { delete store[k]; },
      };
  const win = {
    sessionStorage,
    location: { reload: vi.fn() },
    addEventListener: (type: string, fn: Handler) => {
      (listeners[type] ||= []).push(fn);
    },
  };
  return { win, listeners, store };
}

function runGuard(win: Record<string, unknown>) {
  // The guard is a plain IIFE string (no imports) meant to run in a real
  // <script> tag; `new Function('window', 'sessionStorage', ...)` runs it
  // against a fake window the same way, without needing a browser. In a real
  // document `sessionStorage` resolves off window — shadow it explicitly here
  // so the fake (or deliberately throwing) storage is what the script sees.
  const fn = new Function('window', 'sessionStorage', CHUNK_BOOT_GUARD_SCRIPT);
  fn(win, win.sessionStorage);
}

function fire(win: ReturnType<typeof makeWindow>, type: string, event: unknown) {
  for (const fn of win.listeners[type] ?? []) fn(event);
}

const script404 = { target: { tagName: 'SCRIPT', src: 'https://lexiclash.live/_next/static/chunks/14850.js' } };
const link404 = { target: { tagName: 'LINK', href: 'https://lexiclash.live/_next/static/css/app.css' } };
const chunkMessage = { message: 'Loading chunk 14850 failed.' };

describe('CHUNK_BOOT_GUARD_SCRIPT', () => {
  it('parses and runs without throwing, even with blocked storage', () => {
    const { win } = makeWindow(true);
    expect(() => runGuard(win as unknown as Record<string, unknown>)).not.toThrow();
  });

  it('hard-reloads once when an /_next/static script fails at boot', () => {
    const w = makeWindow();
    runGuard(w.win as unknown as Record<string, unknown>);
    fire(w, 'error', script404);
    expect(w.win.location.reload).toHaveBeenCalledTimes(1);
  });

  it('hard-reloads once when an /_next/static stylesheet fails at boot', () => {
    const w = makeWindow();
    runGuard(w.win as unknown as Record<string, unknown>);
    fire(w, 'error', link404);
    expect(w.win.location.reload).toHaveBeenCalledTimes(1);
  });

  it('hard-reloads once on a "Loading chunk" error message', () => {
    const w = makeWindow();
    runGuard(w.win as unknown as Record<string, unknown>);
    fire(w, 'error', chunkMessage);
    expect(w.win.location.reload).toHaveBeenCalledTimes(1);
  });

  it('never reloads twice — the sessionStorage guard stops reload loops', () => {
    const w = makeWindow();
    runGuard(w.win as unknown as Record<string, unknown>);
    fire(w, 'error', script404);
    fire(w, 'error', chunkMessage);
    fire(w, 'error', link404);
    expect(w.win.location.reload).toHaveBeenCalledTimes(1);
  });

  it('ignores unrelated resource failures and errors', () => {
    const w = makeWindow();
    runGuard(w.win as unknown as Record<string, unknown>);
    fire(w, 'error', { target: { tagName: 'IMG', src: 'https://lexiclash.live/_next/static/x.png' } });
    fire(w, 'error', { target: { tagName: 'SCRIPT', src: 'https://pagead2.googlesyndication.com/ads.js' } });
    fire(w, 'error', { message: 'ResizeObserver loop limit exceeded' });
    expect(w.win.location.reload).not.toHaveBeenCalled();
  });

  it('clears the guard on a clean load so later navigations can self-heal', () => {
    const w = makeWindow();
    runGuard(w.win as unknown as Record<string, unknown>);
    fire(w, 'error', script404);
    expect(w.store.lc_chunk_boot_reload).toBe('1');
    // Simulate the post-reload page: fresh script run, guard present → no reload…
    const w2 = makeWindow();
    w2.store.lc_chunk_boot_reload = '1';
    runGuard(w2.win as unknown as Record<string, unknown>);
    fire(w2, 'error', script404);
    expect(w2.win.location.reload).not.toHaveBeenCalled();
    // …but a clean load clears the flag so the next incident self-heals.
    fire(w2, 'load', {});
    expect(w2.store.lc_chunk_boot_reload).toBeUndefined();
    fire(w2, 'error', chunkMessage);
    expect(w2.win.location.reload).toHaveBeenCalledTimes(1);
  });
});
