import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';

const pathname = vi.hoisted(() => ({ current: '/en' as string | null }));
vi.mock('next/navigation', () => ({ usePathname: () => pathname.current }));

import {
  hasAuthParamsInUrl,
  isLandingAuthGateOpen,
  resetLandingAuthGateForTests,
  useLandingAuthGate,
} from '@/lib/auth/landingAuthGate';
import { ENGAGED_SESSION_KEY } from '@/lib/perf/onFirstEngagement';

function Probe() {
  return <span data-testid="gate">{useLandingAuthGate() ? 'open' : 'closed'}</span>;
}

function visit(url: string) {
  window.history.replaceState(null, '', url);
  pathname.current = new URL(url, 'https://x.test').pathname;
}

describe('landingAuthGate', () => {
  beforeEach(() => {
    resetLandingAuthGateForTests();
    localStorage.clear();
    sessionStorage.clear();
    visit('/en');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete (globalThis as { Capacitor?: unknown }).Capacitor;
    document.cookie = 'sb-test-auth-token=; max-age=0; path=/';
    resetLandingAuthGateForTests();
  });

  it.each(['/', '/en', '/he', '/en/'])('stays closed on a cold signed-out visit to %s', (url) => {
    visit(url);
    expect(isLandingAuthGateOpen()).toBe(false);
  });

  it.each(['/en/profile', '/en/auth/callback', '/en/teacher'])('is open on %s', (url) => {
    visit(url);
    expect(isLandingAuthGateOpen()).toBe(true);
  });

  it('is open for a session in localStorage', () => {
    localStorage.setItem('sb-test-auth-token', JSON.stringify({ access_token: 'x' }));
    expect(isLandingAuthGateOpen()).toBe(true);
  });

  it('is open for a session in a cookie', () => {
    const value = `base64-${btoa(JSON.stringify({ access_token: 'x' }))}`;
    document.cookie = `sb-test-auth-token=${encodeURIComponent(value)}; path=/`;
    expect(isLandingAuthGateOpen()).toBe(true);
  });

  it('stays closed for a signed-out leftover session value', () => {
    localStorage.setItem('sb-test-auth-token', 'null');
    expect(isLandingAuthGateOpen()).toBe(false);
  });

  it('is open in the native shell', () => {
    (globalThis as { Capacitor?: unknown }).Capacitor = { isNativePlatform: () => true };
    expect(isLandingAuthGateOpen()).toBe(true);
  });

  it('is open for a session that already engaged', () => {
    sessionStorage.setItem(ENGAGED_SESSION_KEY, '1');
    expect(isLandingAuthGateOpen()).toBe(true);
  });

  it.each([
    '/?code=abc',
    '/en?code=abc',
    '/en?token_hash=abc&type=recovery',
    '/en?error=access_denied&error_description=nope',
    '/en?error_code=otp_expired',
    '/en?auth_error=true&reason=timeout',
    '/en#access_token=abc&refresh_token=def&type=magiclink',
    '/en#refresh_token=def',
    '/en#error=access_denied&error_code=otp_expired',
    '/en#type=recovery',
  ])('is open on the auth return %s', (url) => {
    visit(url);
    expect(isLandingAuthGateOpen()).toBe(true);
  });

  it.each([
    ['', ''],
    ['?utm_source=x&room=ABCD', ''],
    ['', '#faq'],
    ['?ref=code', '#how-to-play'],
  ])('does not read %s %s as an auth return', (search, hash) => {
    expect(hasAuthParamsInUrl(search, hash)).toBe(false);
  });

  it('treats blocked storage as unknown, not as signed out', () => {
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(isLandingAuthGateOpen()).toBe(true);
  });

  it('treats a session read that throws as unknown, not as signed out', () => {
    vi.spyOn(document, 'cookie', 'get').mockImplementation(() => {
      throw new Error('cookies blocked');
    });
    expect(isLandingAuthGateOpen()).toBe(true);
  });

  it.each(['pointerdown', 'keydown', 'touchstart'])('opens and stays open on %s', async (type) => {
    render(<Probe />);
    expect(screen.getByTestId('gate').textContent).toBe('closed');
    await act(async () => {
      window.dispatchEvent(new Event(type));
    });
    expect(screen.getByTestId('gate').textContent).toBe('open');
    expect(sessionStorage.getItem(ENGAGED_SESSION_KEY)).toBe('1');
  });

  it.each(['scroll', 'pointermove', 'mousemove', 'focus'])('stays closed on %s', async (type) => {
    render(<Probe />);
    await act(async () => {
      window.dispatchEvent(new Event(type));
    });
    expect(screen.getByTestId('gate').textContent).toBe('closed');
  });

  it('never opens on a timer', async () => {
    vi.useFakeTimers();
    try {
      render(<Probe />);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(120_000);
      });
      expect(screen.getByTestId('gate').textContent).toBe('closed');
    } finally {
      vi.useRealTimers();
    }
  });

  it('the hook is open on a non-landing route without waiting for the browser', () => {
    pathname.current = '/en/profile';
    render(<Probe />);
    expect(screen.getByTestId('gate').textContent).toBe('open');
  });

  it('the hook fails open when the router has no pathname', () => {
    pathname.current = null;
    render(<Probe />);
    expect(screen.getByTestId('gate').textContent).toBe('open');
  });

  it('stays open after moving from an inner route back to landing', () => {
    visit('/en/profile');
    expect(isLandingAuthGateOpen()).toBe(true);
    visit('/en');
    expect(isLandingAuthGateOpen()).toBe(true);
  });
});
