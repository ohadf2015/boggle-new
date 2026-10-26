// @vitest-environment jsdom
import { vi, describe, it, expect, beforeEach } from 'vitest';

const { mockSignInWithOAuth } = vi.hoisted(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
  return { mockSignInWithOAuth: vi.fn(async () => ({ data: {}, error: null })) };
});

vi.mock('@supabase/ssr', () => ({
  createBrowserClient: vi.fn(() => ({
    auth: {
      signInWithOAuth: (...args: unknown[]) => mockSignInWithOAuth(...(args as [])),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
  })),
}));
vi.mock('@/utils/logger', () => ({ default: { warn: vi.fn(), log: vi.fn(), error: vi.fn() } }));
vi.mock('@/utils/crossTabAuthSync', () => ({ broadcastSignedOut: vi.fn() }));
vi.mock('@/utils/platform', () => ({ isNative: vi.fn(() => false) }));

import { signInWithMicrosoft } from '../supabase';

describe('signInWithMicrosoft', () => {
  beforeEach(() => vi.clearAllMocks());

  it("uses Supabase's azure provider, asks for the email scope, and returns to the locale callback", async () => {
    await signInWithMicrosoft();
    expect(mockSignInWithOAuth).toHaveBeenCalledTimes(1);
    const arg = (mockSignInWithOAuth.mock.calls[0] as unknown as [{ provider: string; options: { scopes: string; redirectTo: string } }])[0];
    expect(arg.provider).toBe('azure');
    expect(arg.options.scopes).toBe('email');
    expect(new URL(arg.options.redirectTo).pathname).toMatch(/^\/[a-z]{2}\/auth\/callback$/);
  });
});
