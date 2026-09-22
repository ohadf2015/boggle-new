// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, isAuthenticated: false }),
}));

import { useDailyPlayedStatus } from '../useDailyPlayedStatus';

/*
 * The daily hub SSRs since #1121. A guest's lazy useState init read
 * localStorage on the server → "ReferenceError: localStorage is not defined"
 * on every GET /[locale]/daily (Sentry JAVASCRIPT-NEXTJS-29G).
 */
function Probe() {
  const s = useDailyPlayedStatus();
  return <span>{String(s.today.wordHunt)}</span>;
}

describe('useDailyPlayedStatus — server render', () => {
  it('given a guest on the server, renders without touching localStorage', () => {
    expect(typeof (globalThis as { localStorage?: unknown }).localStorage).toBe('undefined');
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(() => renderToString(<Probe />)).not.toThrow();
    // Warnings reach Sentry too — no useLayoutEffect-on-server noise.
    expect(err).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });
});
