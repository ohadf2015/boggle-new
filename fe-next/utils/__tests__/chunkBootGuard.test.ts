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
    location: {
      href: 'https://lexiclash.live/en',
      reload: vi.fn(),
      replace: vi.fn(),
    },
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
  // URL is provided by the host environment (Node 20+ / jsdom).
  const fn = new Function('window', 'sessionStorage', 'URL', CHUNK_BOOT_GUARD_SCRIPT);
  fn(win, win.sessionStorage, URL);
}

function fire(win: ReturnType<typeof makeWindow>, type: string, event: unknown) {
  for (const fn of win.listeners[type] ?? []) fn(event);
}

function expectNavigatedOnce(w: ReturnType<typeof makeWindow>) {
  expect(w.win.location.replace).toHaveBeenCalledTimes(1);
  const dest = String(w.win.location.replace.mock.calls[0][0]);
  expect(dest).toContain('_lc_chunk=');
  expect(w.win.location.reload).not.toHaveBeenCalled();
}

const script404 = { target: { tagName: 'SCRIPT', src: 'https://lexiclash.live/_next/static/chunks/14850.js' } };
const link404 = { target: { tagName: 'LINK', href: 'https://lexiclash.live/_next/static/css/app.css' } };
const chunkMessage = { message: 'Loading chunk 14850 failed.' };

describe('CHUNK_BOOT_GUARD_SCRIPT', () => {
  it('parses and runs without throwing, even with blocked storage', () => {
    const { win } = makeWindow(true);
    expect(() => runGuard(win as unknown as Record<string, unknown>)).not.toThrow();
  });

  it('hard-navigates once when an /_next/static script fails at boot', () => {
    const w = makeWindow();
    runGuard(w.win as unknown as Record<string, unknown>);
    fire(w, 'error', script404);
    expectNavigatedOnce(w);
  });

  it('hard-navigates once when an /_next/static stylesheet fails at boot', () => {
    const w = makeWindow();
    runGuard(w.win as unknown as Record<string, unknown>);
    fire(w, 'error', link404);
    expectNavigatedOnce(w);
  });

  it('hard-navigates once on a "Loading chunk" error message', () => {
    const w = makeWindow();
    runGuard(w.win as unknown as Record<string, unknown>);
    fire(w, 'error', chunkMessage);
    expectNavigatedOnce(w);
  });

  it('never navigates twice — the sessionStorage guard stops reload loops', () => {
    const w = makeWindow();
    runGuard(w.win as unknown as Record<string, unknown>);
    fire(w, 'error', script404);
    fire(w, 'error', chunkMessage);
    fire(w, 'error', link404);
    expect(w.win.location.replace).toHaveBeenCalledTimes(1);
  });

  it('ignores unrelated resource failures and errors', () => {
    const w = makeWindow();
    runGuard(w.win as unknown as Record<string, unknown>);
    fire(w, 'error', { target: { tagName: 'IMG', src: 'https://lexiclash.live/_next/static/x.png' } });
    fire(w, 'error', { target: { tagName: 'SCRIPT', src: 'https://pagead2.googlesyndication.com/ads.js' } });
    fire(w, 'error', { message: 'ResizeObserver loop limit exceeded' });
    expect(w.win.location.replace).not.toHaveBeenCalled();
    expect(w.win.location.reload).not.toHaveBeenCalled();
  });

  it('keeps the guard after load so post-load chunk failures cannot loop (UR 2026-10-06 P1)', () => {
    const w = makeWindow();
    runGuard(w.win as unknown as Record<string, unknown>);
    fire(w, 'error', chunkMessage);
    expect(w.win.location.replace).toHaveBeenCalledTimes(1);
    expect(w.store.lc_chunk_boot_reload).toBe('1');
    // Clean load must NOT clear — that re-armed infinite reload loops when a
    // chunk failed after load (SEO /words/* Chrome/Linux crawls).
    fire(w, 'load', {});
    expect(w.store.lc_chunk_boot_reload).toBe('1');
    fire(w, 'error', chunkMessage);
    expect(w.win.location.replace).toHaveBeenCalledTimes(1);
  });

  it('keeps the session flag after load (no clear-on-load) and blocks a second navigate', () => {
    expect(CHUNK_BOOT_GUARD_SCRIPT).not.toMatch(/addEventListener\('load'/);
    expect(CHUNK_BOOT_GUARD_SCRIPT).toMatch(/var mem=false/);
    expect(CHUNK_BOOT_GUARD_SCRIPT).toMatch(/if\(mem\)return true/);
  });
  it('stops a storage-less client from looping across the hard navigation (window.name backstop)', () => {
    // Storage-less clients get a per-page in-memory sessionStorage from the
    // shim, and `mem` resets on navigation — only window.name survives.
    const w = makeWindow(true);
    runGuard(w.win as unknown as Record<string, unknown>);
    fire(w, 'error', chunkMessage);
    expect(w.win.location.replace).toHaveBeenCalledTimes(1);
    const name = (w.win as unknown as { name?: string }).name;
    expect(name).toContain('__lc_cbr1');
    // Post-navigation page: fresh realm, storage still blocked, same tab name.
    const w2 = makeWindow(true);
    (w2.win as unknown as { name?: string }).name = name;
    runGuard(w2.win as unknown as Record<string, unknown>);
    fire(w2, 'error', chunkMessage);
    expect(w2.win.location.replace).not.toHaveBeenCalled();
    expect(w2.win.location.reload).not.toHaveBeenCalled();
  });

  it('preserves an existing window.name when marking', () => {
    const w = makeWindow();
    (w.win as unknown as { name?: string }).name = 'oauth-popup';
    runGuard(w.win as unknown as Record<string, unknown>);
    fire(w, 'error', script404);
    expect((w.win as unknown as { name?: string }).name).toBe('oauth-popup__lc_cbr1');
  });
});
