'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useIsGuest } from '@/hooks/useIsGuest';
import { getGuestDailyPlayer, getGuestFingerprint } from '@/utils/dailyChallenge/guestPlayer';
import { GuestNameEditor } from './GuestNameEditor';
import type { GuestNameT } from './useGuestNameSave';

interface DailyGuestNameSlotProps {
  t: GuestNameT;
  rank?: number | null;
  totalPlayers?: number | null;
  onRenamed: (name: string) => void;
}

/** The guest's board name on a daily results screen that doesn't already track guest identity itself. */
export function DailyGuestNameSlot({ t, rank, totalPlayers, onRenamed }: DailyGuestNameSlotProps) {
  const { isAuthenticated } = useAuth();
  const isGuest = useIsGuest(isAuthenticated);
  const [guest, setGuest] = useState<{ name: string; fingerprint: string } | null>(null);

  useEffect(() => {
    if (!isGuest) return;
    let live = true;
    void Promise.all([getGuestDailyPlayer(), getGuestFingerprint()]).then(([player, fingerprint]) => {
      if (live) setGuest({ name: player.displayName, fingerprint });
    });
    return () => {
      live = false;
    };
  }, [isGuest]);

  if (!isGuest || !guest) return null;
  return (
    <GuestNameEditor
      name={guest.name}
      guestFingerprint={guest.fingerprint || null}
      rank={rank}
      totalPlayers={totalPlayers}
      onRenamed={(name) => {
        setGuest((g) => (g ? { ...g, name } : g));
        onRenamed(name);
      }}
      t={t}
    />
  );
}
