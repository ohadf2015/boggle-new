'use client';

import { useEffect, useState } from 'react';
import type { ClearSubmission } from './anti-cheat';
import type { ChestContents } from './chest-roll';

export type BlastProgressState = {
  coins: number;
  chestNumber: number;
  chestProgress: number;
  chestContents: ChestContents | null;
  unlocksSeenFlag: Record<string, boolean>;
  veteranBonusGranted: boolean;
};

type UseMutationState<T> = { status: 'idle' | 'loading' | 'success' | 'error'; data?: T; error?: string };

export function useBlastProgress() {
  const [state, setState] = useState<BlastProgressState>({
    coins: 0,
    chestNumber: 1,
    chestProgress: 0,
    chestContents: null,
    unlocksSeenFlag: {},
    veteranBonusGranted: false,
  });

  const [clearMutation, setClearMutation] = useState<UseMutationState<void>>({ status: 'idle' });
  const [openMutation, setOpenMutation] = useState<UseMutationState<ChestContents>>({ status: 'idle' });

  // Load initial progress on mount
  useEffect(() => {
    // Plan 3 stub: server-side loaded via API on route init
    // BlastV2PageClient will call an initial fetch endpoint (deferred to Plan 3b)
  }, []);

  const clearLevel = async (submission: ClearSubmission, earnedCoins: number, earnedGems: number) => {
    setClearMutation({ status: 'loading' });
    try {
      const res = await fetch('/api/blast/clear-level', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...submission,
          earnedCoins,
          earnedGems,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setState((s) => ({
        ...s,
        coins: data.coins,
        chestProgress: data.chestProgress,
        chestNumber: data.chestNumber,
      }));
      setClearMutation({ status: 'success' });
    } catch (e) {
      setClearMutation({ status: 'error', error: String(e) });
    }
  };

  const openChest = async () => {
    setOpenMutation({ status: 'loading' });
    try {
      const res = await fetch('/api/blast/open-chest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json() as { coins: number; contents: ChestContents; nextChestNumber: number };
      setState((s) => ({
        ...s,
        coins: data.coins,
        chestProgress: 0,
        chestNumber: data.nextChestNumber,
        chestContents: data.contents,
      }));
      setOpenMutation({ status: 'success', data: data.contents });
    } catch (e) {
      setOpenMutation({ status: 'error', error: String(e) });
    }
  };

  return {
    state,
    clearLevel,
    openChest,
    clearMutation,
    openMutation,
  };
}
