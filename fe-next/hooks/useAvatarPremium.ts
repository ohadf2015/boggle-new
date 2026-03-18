'use client';

import { useState, useCallback, useEffect } from 'react';
import { useCoinsFromContext } from '@/contexts/CoinContext';
import { useAuth } from '@/contexts/AuthContext';
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
  const { coins, refreshCoins } = useCoinsFromContext();
  const { user, isAuthenticated } = useAuth();
  const [permanentUnlocks, setPermanentUnlocks] = useState<string[]>([]);
  const [tempUnlocks, setTempUnlocks] = useState<TempUnlocks>({});
  const [isPurchasing, setIsPurchasing] = useState(false);

  // Load temp unlocks from localStorage after hydration (avoid SSR mismatch)
  useEffect(() => {
    setTempUnlocks(getTempUnlocks());
  }, []);

  // Load permanent unlocks from profile on mount
  useEffect(() => {
    if (!isAuthenticated || !user) return;
    fetch('/api/avatar/premium-parts')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.premiumAvatarParts) {
          setPermanentUnlocks(data.premiumAvatarParts);
        }
      })
      .catch(() => { /* silent fail */ });
  }, [isAuthenticated, user]);

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
    setIsPurchasing(true);
    try {
      const res = await fetch('/api/avatar/purchase-part', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, partId }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData?.error || 'Purchase failed', { duration: 2000 });
        setIsPurchasing(false);
        return false;
      }

      const data = await res.json();
      if (data.premiumAvatarParts) {
        setPermanentUnlocks(data.premiumAvatarParts);
      } else {
        setPermanentUnlocks(prev => [...prev, `${category}:${partId}`]);
      }
      await refreshCoins();
      toast('🎉 Unlocked!', { duration: 1500 });
      setIsPurchasing(false);
      return true;
    } catch {
      toast.error('Purchase failed \u2014 try again');
      setIsPurchasing(false);
      return false;
    }
  }, [refreshCoins]);

  return {
    isPartUnlocked,
    unlockTemporarily,
    purchaseWithGold,
    isPurchasing,
    permanentUnlocks,
    coins,
  };
}
