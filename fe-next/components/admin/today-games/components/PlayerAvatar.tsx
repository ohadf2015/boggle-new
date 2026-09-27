'use client';

import Avatar from '@/components/Avatar';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';

interface PlayerAvatarProps {
  emoji?: string | null;
  color?: string | null;
  customAvatar?: CustomAvatarConfig | null;
  userId?: string;
}

export function PlayerAvatar({ customAvatar, userId, emoji }: PlayerAvatarProps) {
  return (
    <Avatar
      customAvatar={customAvatar}
      userId={userId || emoji || undefined}
      size="sm"
    />
  );
}
