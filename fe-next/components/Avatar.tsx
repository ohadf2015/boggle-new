'use client';

import { useMemo, memo, useState, useEffect } from 'react';
import { getSeededAvatarConfig, hashString, type CustomAvatarConfig } from '@/shared/types/customAvatar';
import AvatarRenderer from '@/components/avatar/AvatarRenderer';
import { cn } from '@/lib/utils';
import { NeoSkeletonAvatar } from '@/components/ui/skeleton';

/** @deprecated No longer used — profile pictures removed in favor of custom avatars */
export const PROFILE_AVATAR_ID = '__profile_avatar__';

type AvatarSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl';

interface SizeConfig {
  container: string;
  px: number;
}

interface AvatarProps {
  /** @deprecated Profile pictures removed — this prop is ignored */
  profilePictureUrl?: string | null;
  /** @deprecated Use customAvatar instead */
  avatarImage?: string;
  customAvatar?: CustomAvatarConfig | null;
  /** Unique identifier for deterministic fallback avatar generation (e.g. user ID, username) */
  userId?: string;
  size?: AvatarSize;
  className?: string;
  /** Show loading skeleton instead of avatar */
  isLoading?: boolean;
}

const SIZE_CONFIG: Record<AvatarSize, SizeConfig> = {
  sm: { container: 'w-6 h-6', px: 24 },
  md: { container: 'w-8 h-8', px: 32 },
  lg: { container: 'w-12 h-12', px: 48 },
  xl: { container: 'w-20 h-20', px: 80 },
  '2xl': { container: 'w-28 h-28', px: 112 }
};

/**
 * Unified Avatar Component
 * Fallback chain: customAvatar (SVG) > deterministic random custom avatar.
 */
const Avatar = memo<AvatarProps>(({
  customAvatar,
  userId,
  avatarImage,
  size = 'md',
  className = '',
  isLoading,
}) => {
  const config = SIZE_CONFIG[size] || SIZE_CONFIG.md;

  // Hydration guard: always render skeleton on first paint to match SSR,
  // then show the real avatar after mount (client stores aren't available on server).
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Pre-compute fallback avatar (must be before conditionals to satisfy hook rules)
  const fallbackSeed = avatarImage || userId || 'default-avatar';
  const fallbackConfig = useMemo(
    () => getSeededAvatarConfig(hashString(fallbackSeed)),
    [fallbackSeed]
  );

  // Infer loading state: if isLoading is not explicitly set and there's no
  // avatar data or seed, the consumer likely hasn't loaded data yet — show skeleton.
  const hasIdentity = !!(customAvatar || userId || avatarImage);
  const shouldLoad = !mounted || isLoading === true || (isLoading === undefined && !hasIdentity);

  // 0. Loading state
  if (shouldLoad) {
    return (
      <NeoSkeletonAvatar size={config.px} className={className} />
    );
  }

  // 1. Custom SVG avatar (highest priority)
  if (customAvatar) {
    return (
      <div
        className={cn('relative rounded-full overflow-hidden flex-shrink-0', config.container, className)}
        data-testid="header-avatar"
        data-avatar-type="custom"
      >
        <AvatarRenderer config={customAvatar} size={config.px} circular className="w-full h-full" />
      </div>
    );
  }

  // 2. Fallback: deterministic random custom avatar
  return (
    <div
      className={cn('relative rounded-full overflow-hidden flex-shrink-0', config.container, className)}
      data-testid="header-avatar"
      data-avatar-type="generated"
    >
      <AvatarRenderer config={fallbackConfig} size={config.px} circular />
    </div>
  );
});

Avatar.displayName = 'Avatar';

export default Avatar;
