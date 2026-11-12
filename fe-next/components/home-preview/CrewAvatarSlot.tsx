'use client';

import { useCallback, useEffect, useState } from 'react';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';
import { setCrewAvatarSlot } from './heroAvatarBridge';

interface Props {
  slotKey: string;
  userId: string;
  customAvatar: CustomAvatarConfig | null;
  avatarImage?: string | null;
  pixelSize?: number;
  className?: string;
}

/** A fixed-size box the lazy avatar island fills; keeps Avatar.tsx out of the landing bundle. */
export function CrewAvatarSlot({ slotKey, userId, customAvatar, avatarImage = null, pixelSize = 44, className = '' }: Props) {
  const [el, setEl] = useState<HTMLDivElement | null>(null);
  const ref = useCallback((node: HTMLDivElement | null) => setEl(node), []);

  useEffect(() => {
    if (!el) return;
    setCrewAvatarSlot(slotKey, { el, userId, customAvatar, avatarImage, pixelSize: pixelSize - 6 });
    return () => setCrewAvatarSlot(slotKey, null);
  }, [el, slotKey, userId, customAvatar, avatarImage, pixelSize]);

  return (
    <div
      ref={ref}
      data-testid={`crew-avatar-${slotKey}`}
      style={{ width: pixelSize, height: pixelSize }}
      className={`shrink-0 overflow-hidden rounded-full border-[3px] border-black bg-neo-cream ${className}`}
    />
  );
}
