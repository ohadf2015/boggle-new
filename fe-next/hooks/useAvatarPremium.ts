'use client';

import { useState, useCallback, useEffect } from 'react';
import { useCoinContext } from '@/contexts/CoinContext';
import { useAuth } from '@/contexts/AuthContext';
import { isPremiumPart, getPartPrice } from '@/shared/types/customAvatar';
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
  const { coins, refreshCoins } = useCoinContext();
  const { user, isAuthenticated } = useAuth();
  const [permanentUnlocks, setPermanentUnlocks] = useState<string[]>([]);
  const [tempUnlocks, setTempUnlocks] = useState<TempUnlocks>(() => getTempUnlocks());
  const [isPurchasing, setIsPurchasing] = useState(false);

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
        toast.error(errData?.error === 'Insufficient gold'
          ? 'Not enough gold! Keep playing to earn more.'
          : errData?.error || 'Purchase failed',
          { duration: 3000, style: { fontWeight: 700, background: '#1a1a2e', color: '#FF6B35', border: '2px solid #FF6B35' } }
        );
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
      const price = getPartPrice(category, partId);
      toast.success(`Unlocked ${partId}! -${price} gold`, {
        duration: 3000,
        style: { fontWeight: 700, background: '#1a1a2e', color: '#BFFF00', border: '2px solid #BFFF00' },
      });
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
