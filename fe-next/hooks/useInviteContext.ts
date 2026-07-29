'use client';

import { useEffect, useState, useCallback } from 'react';
import { getPendingRoomInvite, type PendingRoomInvite } from '@/utils/onboardingStorage';

/**
 * SSR-safe reactive reader for the pending MP-room invite.
 * Re-renders consumers when `'invite-changed'` is dispatched (save or consume).
 */
export const useInviteContext = (): PendingRoomInvite | null => {
  const [invite, setInvite] = useState<PendingRoomInvite | null>(null);

  const refresh = useCallback(() => {
    setInvite(getPendingRoomInvite());
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener('invite-changed', refresh);
    return () => window.removeEventListener('invite-changed', refresh);
  }, [refresh]);

  return invite;
};
