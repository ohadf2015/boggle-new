import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { User } from '@supabase/supabase-js';

type AuthCallback = (event: string, session: { user: User; access_token: string } | null) => Promise<void> | void;

const auth = vi.hoisted(() => ({
  listeners: [] as AuthCallback[],
  getSession: vi.fn(),
}));
const captureBackgroundError = vi.hoisted(() => vi.fn());

vi.mock('@/lib/supabase', () => ({
  isSupabaseConfigured: () => Promise.resolve(true),
  supabase: {
    auth: {
      getSession: auth.getSession,
      signOut: vi.fn(() => Promise.resolve({ error: null })),
      onAuthStateChange: (cb: AuthCallback) => {
        auth.listeners.push(cb);
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      },
    },
  },
}));
vi.mock('@/utils/sessionTracking', () => ({ linkSessionToUser: () => Promise.resolve() }));
vi.mock('@/utils/pushNotifications/tokenRegistration', () => ({
  registerPushToken: () => Promise.resolve(),
  unregisterPushToken: () => Promise.resolve(),
}));
vi.mock('@/utils/crossTabAuthSync', () => ({ broadcastSessionRefreshed: vi.fn() }));
vi.mock('@/utils/sentry', () => ({ captureBackgroundError }));
vi.mock('@/lib/welcome/triggerWelcomeEmail', () => ({ triggerWelcomeEmail: () => Promise.resolve() }));
vi.mock('@/lib/auth/triggerExternalIdentityLink', () => ({ triggerExternalIdentityLink: () => Promise.resolve() }));

import { useAuthState } from '../useAuthState';
import { useAuthInitialization } from '../useAuthInitialization';

const USER = { id: 'user-1', user_metadata: {}, is_anonymous: false } as unknown as User;

function useHarness() {
  const state = useAuthState();
  useAuthInitialization({
    userIdRef: state.userIdRef,
    lastVisibleTimeRef: state.lastVisibleTimeRef,
    setters: state.setters,
    fetchUserData: () => Promise.resolve(),
  });
  return state;
}

async function emit(event: string, user: User | null) {
  const listener = auth.listeners[auth.listeners.length - 1];
  await act(async () => {
    await listener(event, user ? { user, access_token: 't' } : null);
  });
}

describe('useAuthInitialization when the session check is slow', () => {
  const reload = vi.fn();
  const originalLocation = window.location;

  beforeEach(() => {
    vi.useFakeTimers();
    auth.listeners.length = 0;
    auth.getSession.mockReset();
    captureBackgroundError.mockReset();
    reload.mockReset();
    sessionStorage.clear();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, pathname: '/en', reload },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
  });

  it('keeps loading through the timeout and takes a late SIGNED_IN without reloading', async () => {
    // Given a resume where getSession never answers
    auth.getSession.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useHarness());

    // When the 5s session timeout and the 6s safety timeout pass
    await act(async () => {
      await vi.advanceTimersByTimeAsync(7000);
    });

    // Then the guest screen never showed
    expect(result.current.loading).toBe(true);
    expect(result.current.user).toBeNull();

    // When the token refresh finally lands
    await emit('SIGNED_IN', USER);

    // Then the user is signed in in place, with no full reload
    expect(result.current.user?.id).toBe('user-1');
    expect(result.current.loading).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });

  it('stays out of loading on the 1.5s tab-visible timer while the session is unknown', async () => {
    auth.getSession.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useHarness());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5500);
    });

    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
      await vi.advanceTimersByTimeAsync(1600);
    });

    expect(result.current.loading).toBe(true);
  });

  it('falls back to the guest screen and reports it when no answer ever arrives', async () => {
    auth.getSession.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useHarness());

    await act(async () => {
      await vi.advanceTimersByTimeAsync(20000);
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.user).toBeNull();
    expect(captureBackgroundError).toHaveBeenCalledTimes(1);
  });

  it('still reloads once on a real guest sign-up after the session said "no session"', async () => {
    auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
    const { result } = renderHook(() => useHarness());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current.loading).toBe(false);

    await emit('SIGNED_IN', USER);

    expect(reload).toHaveBeenCalledTimes(1);
  });
});
