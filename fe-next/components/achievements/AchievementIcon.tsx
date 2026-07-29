'use client';

import React, { memo, useState } from 'react';
import Image from 'next/image';
import { getAchievementIcon } from '@/constants/achievementIcons';

/** Returns image path for achievement if exists, null otherwise */
function getAchievementImage(_key: string): string | null {
  return null; // TODO: Add WebP images when ready
}

interface AchievementIconProps {
  /** Achievement key (e.g., 'FIRST_BLOOD') */
  achievementKey: string;
  /** Size in pixels (default 32) */
  size?: number;
  /** Additional CSS classes */
  className?: string;
  /** Emoji fallback override (e.g., from socket payload) */
  fallbackEmoji?: string;
}

/**
 * AchievementIcon - Renders achievement as WebP image with emoji fallback
 *
 * Displays the 128x128 transparent WebP achievement image.
 * Falls back to emoji if image fails to load or key has no image.
 * Memoized to prevent re-renders in achievement lists.
 */
export const AchievementIcon = memo<AchievementIconProps>(({
  achievementKey,
  size = 32,
  className = '',
  fallbackEmoji,
}) => {
  const [imgError, setImgError] = useState(false);
  const imagePath = getAchievementImage(achievementKey);
  const emoji = fallbackEmoji || getAchievementIcon(achievementKey);

  // Use image if available and not errored
  if (imagePath && !imgError) {
    return (
      <Image
        src={imagePath}
        alt={achievementKey}
        width={size}
        height={size}
        className={`inline-block object-contain ${className}`}
        onError={() => setImgError(true)}
        unoptimized // Already compressed WebP at 128x128
      />
    );
  }

  // Emoji fallback
  return (
    <span
      className={`inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.7 }}
      role="img"
      aria-label={achievementKey}
    >
      {emoji}
    </span>
  );
});

AchievementIcon.displayName = 'AchievementIcon';
