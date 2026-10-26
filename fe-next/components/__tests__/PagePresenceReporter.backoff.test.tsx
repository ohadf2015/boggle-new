/**
 * PagePresenceReporter — presence heartbeats must (a) pause while the tab is
 * hidden (the server's 45s TTL already reaps hidden tabs) and (b) back off
 * exponentially after repeated failures.
 * UR audit 2026-10-26: ONE admin /en/teacher tab fired 2,603 failing
 * heartbeats in 24h (~2/min for a day straight), flooding FDT telemetry.
 */
import React from 'react';
import { render, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, profile: null }),
}));
vi.mock('next/navigation', () => ({
  usePathname: () => '/en/teacher',
}));

import PagePresenceReporter from '../PagePresenceReporter';

function setVisibility(state: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state });
  document.dispatchEvent(new Event('visibilitychange'));
}

const fetchMock = () => fetch as unknown as ReturnType<typeof vi.fn>;

describe('PagePresenceReporter — hidden-tab pause + failure backoff', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.sessionStorage.clear();
    setVisibility('visible');
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true } as Response)));
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('heartbeats on mount and every 20s while visible', async () => {
    render(<PagePresenceReporter />);
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(fetchMock()).toHaveBeenCalledTimes(1);

    await act(async () => { await vi.advanceTimersByTimeAsync(20_000); });
    expect(fetchMock()).toHaveBeenCalledTimes(2);
    await act(async () => { await vi.advanceTimersByTimeAsync(20_000); });
    expect(fetchMock()).toHaveBeenCalledTimes(3);
  });

  it('sends nothing while hidden, and one heartbeat immediately on return to visible', async () => {
    render(<PagePresenceReporter />);
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(fetchMock()).toHaveBeenCalledTimes(1);

    await act(async () => { setVisibility('hidden'); });
    await act(async () => { await vi.advanceTimersByTimeAsync(120_000); });
    expect(fetchMock()).toHaveBeenCalledTimes(1); // no hidden heartbeats

    await act(async () => { setVisibility('visible'); });
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(fetchMock()).toHaveBeenCalledTimes(2); // immediate re-announce
  });

  it('backs off exponentially after 3 consecutive failures (next interval >= 60s)', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('net down'))));
    render(<PagePresenceReporter />);

    // t=0, 20s, 40s: three fast attempts, all fail.
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    await act(async () => { await vi.advanceTimersByTimeAsync(20_000); });
    await act(async () => { await vi.advanceTimersByTimeAsync(20_000); });
    expect(fetchMock()).toHaveBeenCalledTimes(3);

    // Failure #3 trips the backoff: next attempt is ~60s out, NOT 20s.
    await act(async () => { await vi.advanceTimersByTimeAsync(59_999); });
    expect(fetchMock()).toHaveBeenCalledTimes(3);
    await act(async () => { await vi.advanceTimersByTimeAsync(2); });
    expect(fetchMock()).toHaveBeenCalledTimes(4); // t=100s

    // Failure #4 doubles again: ~120s until the next attempt (t=220s).
    await act(async () => { await vi.advanceTimersByTimeAsync(119_997); });
    expect(fetchMock()).toHaveBeenCalledTimes(4);
    await act(async () => { await vi.advanceTimersByTimeAsync(2); });
    expect(fetchMock()).toHaveBeenCalledTimes(5); // t=220s
  });

  it('resets to the fast cadence after a success', async () => {
    let fail = true;
    vi.stubGlobal('fetch', vi.fn(() => (fail ? Promise.reject(new Error('x')) : Promise.resolve({ ok: true } as Response))));
    render(<PagePresenceReporter />);

    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    await act(async () => { await vi.advanceTimersByTimeAsync(20_000); });
    await act(async () => { await vi.advanceTimersByTimeAsync(20_000); });
    expect(fetchMock()).toHaveBeenCalledTimes(3); // 3 failures, now backing off

    fail = false;
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); }); // t=100s: backoff attempt succeeds
    expect(fetchMock()).toHaveBeenCalledTimes(4);
    await act(async () => { await vi.advanceTimersByTimeAsync(20_000); }); // back to 20s cadence
    expect(fetchMock()).toHaveBeenCalledTimes(5);
  });
});
