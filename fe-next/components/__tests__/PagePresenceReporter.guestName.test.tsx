/**
 * Live monitor was a wall of "Guest" because PagePresenceReporter read a
 * storage key (`guestUsername`) that nothing ever writes.
 */
import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, profile: null }),
}));

import PagePresenceReporter from '../PagePresenceReporter';
import { clearStoredUsername, getStoredUsername } from '@/utils/profileStorage';
import { setGuestName } from '@/utils/guestManager';

describe('PagePresenceReporter — guest default name', () => {
  beforeEach(() => {
    clearStoredUsername();
    setGuestName('');
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true } as Response)));
  });

  it('does not read the dead guestUsername key', () => {
    const src = readFileSync(path.resolve(__dirname, '../PagePresenceReporter.tsx'), 'utf8');
    expect(src).not.toMatch(/guestUsername/);
  });

  it('heartbeats a generated fun name instead of null/Guest', async () => {
    render(<PagePresenceReporter />);

    await waitFor(() => expect(fetch).toHaveBeenCalled());

    const [, init] = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.find(
      (c) => typeof c[0] === 'string' && String(c[0]).includes('/api/presence/heartbeat'),
    ) as [string, RequestInit];
    const body = JSON.parse(String(init.body));
    expect(body.username).toBeTruthy();
    expect(String(body.username).toLowerCase()).not.toBe('guest');
    expect(getStoredUsername()).toBe(body.username);
  });
});
