import { vi } from 'vitest';
import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * Guests carry local gold, so Buy was enabled for them — then the route's auth
 * check answered a raw English "Unauthorized". Gate before the network and say
 * why. Toasts come from translations, not hardcoded English.
 */
const h = vi.hoisted(() => ({
  auth: { user: null as null | { id: string }, isAuthenticated: false, profile: null },
  toast: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }),
}));

vi.mock('@/contexts/CoinContext', () => ({ useCoinsFromContext: () => ({ coins: 5000, refreshCoins: vi.fn().mockResolvedValue(0) }) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => h.auth }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => `t:${k}` }) }));
vi.mock('react-hot-toast', () => ({ __esModule: true, default: h.toast }));

import { useAvatarPremium } from '../useAvatarPremium';

function setup() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => React.createElement(QueryClientProvider, { client: qc }, children);
  return renderHook(() => useAvatarPremium(), { wrapper }).result;
}

describe('useAvatarPremium purchase feedback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn());
  });

  it('Given a guest, When buying, Then no request is sent and they are told to sign in', async () => {
    h.auth = { user: null, isAuthenticated: false, profile: null };
    const result = setup();
    let ok = true;
    await act(async () => { ok = await result.current.purchaseWithGold('eyes', 'laser'); });
    expect(ok).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
    expect(h.toast.error).toHaveBeenCalledWith('t:avatarBuilder.editor.signInToBuy', expect.anything());
  });

  it('Given the server refuses, When buying, Then the failure toast is translated', async () => {
    h.auth = { user: { id: 'u1' }, isAuthenticated: true, profile: null };
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false, json: async () => ({ error: 'Failed to save purchase' }) });
    const result = setup();
    await act(async () => { await result.current.purchaseWithGold('eyes', 'laser'); });
    expect(h.toast.error).toHaveBeenCalledWith('t:avatarBuilder.editor.purchaseFailed', expect.anything());
  });

  it('Given a successful buy, When it lands, Then the success toast is translated', async () => {
    h.auth = { user: { id: 'u1' }, isAuthenticated: true, profile: null };
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, json: async () => ({ success: true, premiumAvatarParts: ['eyes:laser'] }) });
    const result = setup();
    await act(async () => { await result.current.purchaseWithGold('eyes', 'laser'); });
    expect(h.toast).toHaveBeenCalledWith('t:avatarBuilder.editor.unlocked', expect.anything());
  });
});
