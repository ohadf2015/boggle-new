'use client';

import { useEffect, useRef, useState } from 'react';
import { claimProOfferSlot, newProOfferMountId, type ProOfferSlot } from './proOfferSession';

/**
 * Session cap for the Teacher Pro offer (see proOfferSession.ts). `null` until
 * `active` turns true and the claim is read, so a capped card never flashes
 * full before collapsing to the link.
 */
export function useProOfferSlot(userId: string | null | undefined, active: boolean): ProOfferSlot | null {
  const mountId = useRef<string | null>(null);
  if (mountId.current === null) mountId.current = newProOfferMountId();
  const [slot, setSlot] = useState<ProOfferSlot | null>(null);
  useEffect(() => {
    if (!active) return;
    setSlot(claimProOfferSlot(userId, mountId.current as string));
  }, [active, userId]);
  return active ? slot : null;
}
