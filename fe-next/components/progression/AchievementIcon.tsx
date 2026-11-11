'use client';

import { useState } from 'react';
import { getAchievementArt } from '@/lib/progression/artManifest';
import { cn } from '@/lib/utils';

export interface AchievementIconProps {
  achievementKey?: string;
  emoji: string;
  size?: number;
  className?: string;
}

export function AchievementIcon({ achievementKey, emoji, size = 18, className }: AchievementIconProps) {
  const [failed, setFailed] = useState(false);
  const src = achievementKey ? getAchievementArt(achievementKey) : undefined;
  if (!src || failed) return <span className={className}>{emoji}</span>;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- tiny static badge; next/image adds a wrapper that breaks inline layout
    <img
      data-testid="achievement-art"
      src={src}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      onError={() => setFailed(true)}
      className={cn('inline-block shrink-0 align-middle', className)}
    />
  );
}

export default AchievementIcon;
