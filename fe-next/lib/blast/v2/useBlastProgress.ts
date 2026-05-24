'use client';

import { useEffect, useState } from 'react';
import type { ClearSubmission } from './anti-cheat';
import type { ChestContents } from './chest-roll';
import { readGuestProgress, clearGuestProgress, writeResumeHint } from './guestProgress';

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

  // Progression / resume state (Plan 3b). currentLevel is the high-water mark
  // the player should resume at; progressLoaded gates the page boot to avoid a
  // level-1 → level-N flicker.
  const [currentLevel, setCurrentLevel] = useState(1);
  const [maxLevelCleared, setMaxLevelCleared] = useState(0);
  const [progressLoaded, setProgressLoaded] = useState(false);
  const [isGuest, setIsGuest] = useState(false);

  // Load saved progress on mount and resume the player there.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/blast/progress');
        if (res.status === 401) {
          // Logged out — fall back to the guest level position in localStorage.
          const guest = readGuestProgress();
          if (cancelled) return;
          const lvl = guest?.currentLevel ?? 1;
          setIsGuest(true);
          setCurrentLevel(lvl);
          setMaxLevelCleared(Math.max(lvl - 1, 0));
          writeResumeHint(lvl); // paint fast-path for next visit
          setProgressLoaded(true);
          return;
        }
        if (!res.ok) throw new Error('blast progress fetch failed');
        const data = await res.json();
        if (cancelled) return;
        setState((s) => ({
          ...s,
          coins: data.coins ?? 0,
          chestNumber: data.chestNumber ?? 1,
          chestProgress: data.chestProgress ?? 0,
          unlocksSeenFlag: data.unlocksSeen ?? {},
        }));
        let resumeLevel = data.currentLevel ?? 1;
        // Claim-on-login: if the player got further as a guest than the server
        // knows, carry that resume position up. Only current_level moves — no
        // coins/clears are granted (see handleClaimBlastProgress).
        const guest = readGuestProgress();
        if (guest && guest.currentLevel > resumeLevel) {
          try {
            const claimRes = await fetch('/api/blast/progress', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ currentLevel: guest.currentLevel, locale: guest.locale }),
            });
            if (claimRes.ok) {
              const claimed = await claimRes.json();
              resumeLevel = claimed.currentLevel ?? resumeLevel;
            }
          } catch {
            // Claim is best-effort — fall back to the server level.
          }
        }
        if (cancelled) return;
        setCurrentLevel(resumeLevel);
        setMaxLevelCleared(data.maxLevelCleared ?? 0);
        setIsGuest(false);
        clearGuestProgress(); // server is the source of truth for authed players
        writeResumeHint(resumeLevel); // paint fast-path for next visit
        setProgressLoaded(true);
      } catch {
        // Never strand the boot — degrade to level 1.
        if (cancelled) return;
        setCurrentLevel(1);
        setProgressLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const clearLevel = async (
    submission: ClearSubmission,
    earnedCoins: number,
    earnedGems: number,
    unlocksSeen?: Record<string, boolean>,
  ) => {
    setClearMutation({ status: 'loading' });
    try {
      const res = await fetch('/api/blast/clear-level', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...submission,
          earnedCoins,
          earnedGems,
          unlocksSeen,
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
    currentLevel,
    maxLevelCleared,
    progressLoaded,
    isGuest,
  };
}

/**
 * The full progress API returned by {@link useBlastProgress}. BlastGame receives
 * this from BlastV2PageClient (which owns the single instance) rather than
 * calling the hook itself — one progress GET per page load, and coins/chest
 * survive the keyed remount on each level advance.
 */
export type BlastProgressApi = ReturnType<typeof useBlastProgress>;
