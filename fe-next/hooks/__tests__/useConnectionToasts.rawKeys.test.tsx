/**
 * Connection toasts must never show a raw translation key (RED first).
 *
 * A critic saw `common.reconnected` render verbatim in a toast on
 * /en/multiplayer. The key is NOT missing — it is present in all six locales
 * and in the served bundle. The bug is the fallback:
 *
 *     t('common.reconnected') || 'Connected!'
 *
 * `LanguageContext`'s `t` returns the KEY PATH when the dictionary has not
 * loaded yet, and a key path is a non-empty string, so `||` never fires. The
 * dead branch made the code look defended while guaranteeing the raw key.
 *
 * A reconnect toast is exactly when this bites: the socket reconnects on its
 * own schedule and can easily beat the i18n fetch on a cold load. In a
 * classroom that is a student's screen saying "common.reconnected" mid-lesson.
 *
 * `t` natively takes a fallback as its second argument, which IS returned when
 * translations are missing. These tests pin every toast in the hook.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const toastCalls: string[] = [];

vi.mock('react-hot-toast', () => {
  const record = (msg: unknown) => {
    toastCalls.push(String(msg));
    return 'toast-id';
  };
  const toast = Object.assign(record, {
    success: record,
    error: record,
    loading: record,
    dismiss: vi.fn(),
  });
  return { default: toast };
});

let connected = true;
let reconnecting = false;
vi.mock('@/utils/SocketContext', () => ({
  useSocketOptional: () => ({
    isConnected: connected,
    isReconnecting: reconnecting,
    connectionError: null,
  }),
}));

/**
 * `t` exactly as LanguageContext behaves BEFORE the dictionary loads: it
 * echoes the key path, and returns the fallback only when one is supplied.
 */
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (path: string, fallbackOrParams?: string | Record<string, unknown>) =>
      typeof fallbackOrParams === 'string' ? fallbackOrParams : path,
    language: 'en',
  }),
}));

import { useConnectionToasts } from '../useConnectionToasts';

const looksLikeRawKey = (s: string) => /^[a-z][a-zA-Z0-9]*(\.[a-zA-Z0-9]+)+$/.test(s.trim());

beforeEach(() => {
  toastCalls.length = 0;
  connected = true;
  reconnecting = false;
});

describe('useConnectionToasts with translations not yet loaded', () => {
  it('shows human text, not a raw key, when the connection drops', () => {
    const { rerender } = renderHook(() => useConnectionToasts());
    connected = false;
    rerender();

    expect(toastCalls.length).toBeGreaterThan(0);
    for (const msg of toastCalls) {
      expect(looksLikeRawKey(msg), `toast rendered the raw key "${msg}"`).toBe(false);
    }
  });

  it('shows human text, not a raw key, on reconnect', () => {
    const { rerender } = renderHook(() => useConnectionToasts());
    connected = false;
    rerender();
    toastCalls.length = 0;
    connected = true;
    rerender();

    expect(toastCalls.length).toBeGreaterThan(0);
    for (const msg of toastCalls) {
      expect(looksLikeRawKey(msg), `toast rendered the raw key "${msg}"`).toBe(false);
    }
  });
});

describe('the dead-fallback pattern is gone from this hook', () => {
  it('uses t(key, fallback) rather than t(key) || fallback', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const src = fs.readFileSync(
      path.resolve(__dirname, '../useConnectionToasts.ts'),
      'utf8'
    );
    // Strip comments first — the file's own header documents the banned form
    // as an example, and a pin that flags its own explanation is useless.
    const code = src
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    // The banned form reads as defended but can never reach its fallback.
    const dead = code.match(/t\('[^']+'\)\s*\|\|/g) ?? [];
    expect(dead, `dead fallbacks left: ${dead.join(', ')}`).toHaveLength(0);
  });
});
