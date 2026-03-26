'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCoinsFromContext } from '@/contexts/CoinContext';
import { useAuth } from '@/contexts/AuthContext';
import { queryKeys } from '@/lib/queryKeys';
import { isPremiumPart } from '@/shared/types/customAvatar';
import toast from 'react-hot-toast';

const TEMP_PREMIUM_KEY = 'lexiclash_temp_premium';
const TEMP_UNLOCK_DURATION = 24 * 60 * 60 * 1000; // 24 hours

interface TempUnlocks {
  [partKey: string]: number; // expiry timestamp
}

function getTempUnlocks(): TempUnlocks {
  if (typeof window === 'undefined') return {};
  try {
    const stored = localStorage.getItem(TEMP_PREMIUM_KEY);
    if (!stored) return {};
    return JSON.parse(stored) as TempUnlocks;
  } catch {
    return {};
  }
}

function saveTempUnlocks(unlocks: TempUnlocks): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TEMP_PREMIUM_KEY, JSON.stringify(unlocks));
}

export function useAvatarPremium() {
  const queryClient = useQueryClient();
  const { coins, refreshCoins } = useCoinsFromContext();
  const { user, isAuthenticated } = useAuth();
  const [tempUnlocks, setTempUnlocks] = useState<TempUnlocks>({});

  // Load temp unlocks from localStorage after hydration (avoid SSR mismatch)
  useEffect(() => {
    setTempUnlocks(getTempUnlocks());
  }, []);

  // Load permanent unlocks from profile via TanStack Query
  const { data: premiumData } = useQuery<{ premiumAvatarParts: string[] }>({
    queryKey: queryKeys.avatar.premiumParts(),
    queryFn: async () => {
      const res = await fetch('/api/avatar/premium-parts');
      if (!res.ok) throw new Error('Failed to fetch premium parts');
      return res.json();
    },
    enabled: !!isAuthenticated && !!user,
    staleTime: 5 * 60_000,
  });

  const permanentUnlocks = useMemo(() => premiumData?.premiumAvatarParts ?? [], [premiumData?.premiumAvatarParts]);

  const purchaseMutation = useMutation({
    mutationFn: async ({ category, partId }: { category: string; partId: string }) => {
      const res = await fetch('/api/avatar/purchase-part', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, partId }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error || 'Purchase failed');
      }

      return res.json();
    },
    onSuccess: async (data) => {
      if (data.premiumAvatarParts) {
        queryClient.setQueryData(queryKeys.avatar.premiumParts(), { premiumAvatarParts: data.premiumAvatarParts });
      } else {
        queryClient.invalidateQueries({ queryKey: queryKeys.avatar.premiumParts() });
      }
      await refreshCoins();
      toast('🎉 Unlocked!', { duration: 1500 });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Purchase failed \u2014 try again', { duration: 2000 });
    },
  });

  const isPartUnlocked = useCallback((category: string, value: string): boolean => {
    if (!isPremiumPart(category, value)) return true;

    const partKey = `${category}:${value}`;

    if (permanentUnlocks.includes(partKey)) return true;

    const expiry = tempUnlocks[partKey];
    if (expiry && expiry > Date.now()) return true;

    return false;
  }, [permanentUnlocks, tempUnlocks]);

  const unlockTemporarily = useCallback((category: string, value: string) => {
    const partKey = `${category}:${value}`;
    const expiry = Date.now() + TEMP_UNLOCK_DURATION;
    setTempUnlocks(prev => {
      const next = { ...prev, [partKey]: expiry };
      saveTempUnlocks(next);
      return next;
    });
  }, []);

  const purchaseWithGold = useCallback(async (category: string, partId: string): Promise<boolean> => {
    try {
      await purchaseMutation.mutateAsync({ category, partId });
      return true;
    } catch {
      return false;
    }
  }, [purchaseMutation]);

  return {
    isPartUnlocked,
    unlockTemporarily,
    purchaseWithGold,
    isPurchasing: purchaseMutation.isPending,
    permanentUnlocks,
    coins,
  };
}
