'use client';

import { Lock } from 'lucide-react';
import { PartThumb } from '@/components/avatar/art/PartThumb';
import { RARITY_TOKENS } from '@/lib/avatar/rarity';
import type { LevelUnlock } from '@/lib/avatar/unlocks';
import { DEFAULT_AVATAR_CONFIG, type CustomAvatarConfig } from '@/shared/types/customAvatar';

export interface LockedUnlockThumbProps {
  unlock: LevelUnlock;
  config?: CustomAvatarConfig | null;
  size?: number;
}

/** A locked part as a dark silhouette on a rarity-tinted tile: you can tell what it is, not what it looks like. */
export function LockedUnlockThumb({ unlock, config, size = 48 }: LockedUnlockThumbProps) {
  const hex = RARITY_TOKENS[unlock.rarity].hex;
  return (
    <span
      data-testid="locked-unlock-thumb"
      data-rarity={unlock.rarity}
      className="relative inline-flex shrink-0 items-center justify-center rounded-lg border-2 border-neo-black bg-neo-navy-light"
      style={{ width: size + 8, height: size + 8, boxShadow: `inset 0 0 0 2px ${hex}` }}
    >
      <span className="brightness-0 opacity-80" aria-hidden="true">
        {unlock.category === 'bgColor' ? (
          <span className="block rounded-full" style={{ width: size * 0.7, height: size * 0.7, background: unlock.partId }} />
        ) : (
          <PartThumb category={unlock.category} id={unlock.partId} config={config ?? DEFAULT_AVATAR_CONFIG} size={size} />
        )}
      </span>
      <Lock
        className="absolute -bottom-1 -end-1 h-4 w-4 rounded-full border-2 border-neo-black bg-neo-navy p-0.5"
        style={{ color: hex }}
        aria-hidden="true"
      />
    </span>
  );
}

export default LockedUnlockThumb;
