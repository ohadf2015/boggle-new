import { vi } from 'vitest';
import React from 'react';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LEVEL_UNLOCK_LADDER } from '@/lib/avatar/unlocks';

const auth = vi.hoisted(() => ({
  value: { user: null as null | { id: string }, isAuthenticated: false, profile: null as null | { current_level?: number } },
}));

vi.mock('@/contexts/CoinContext', () => ({
  useCoinsFromContext: () => ({ coins: 0, spendCoins: vi.fn(), refreshCoins: vi.fn() }),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => auth.value }));

import { useAvatarPremium } from '../useAvatarPremium';

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(
    QueryClientProvider,
    { client: new QueryClient({ defaultOptions: { queries: { retry: false } } }) },
    children,
  );

describe('useAvatarPremium — level unlocks', () => {
  const part = LEVEL_UNLOCK_LADDER[0];

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ premiumAvatarParts: [] }) }));
  });

  it('guests are level 1: ladder parts stay locked', () => {
    // Given a guest (no profile)
    auth.value = { user: null, isAuthenticated: false, profile: null };
    const { result } = renderHook(() => useAvatarPremium(), { wrapper });
    // Then a level-2 part is still locked, free parts open
    expect(result.current.isPartUnlocked(part.category, part.partId)).toBe(false);
    expect(result.current.isPartUnlocked('eyes', 'round')).toBe(true);
  });

  it('a player at the unlock level can use the part without buying it', () => {
    // Given an authed player at exactly the ladder level
    auth.value = { user: { id: 'u1' }, isAuthenticated: true, profile: { current_level: part.level } };
    const { result } = renderHook(() => useAvatarPremium(), { wrapper });
    // Then the part is usable and the level is exposed for lock labels
    expect(result.current.isPartUnlocked(part.category, part.partId)).toBe(true);
    expect(result.current.level).toBe(part.level);
  });

  it('legendary parts stay locked at any level (gold only)', () => {
    auth.value = { user: { id: 'u1' }, isAuthenticated: true, profile: { current_level: 50 } };
    const { result } = renderHook(() => useAvatarPremium(), { wrapper });
    expect(result.current.isPartUnlocked('accessory', 'crystalCrown')).toBe(false);
  });
});
