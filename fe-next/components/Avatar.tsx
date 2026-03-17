'use client';

import { useState, useEffect, useMemo, memo } from 'react';
import Image from 'next/image';
import { getSeededAvatarConfig, hashString, type CustomAvatarConfig } from '@/shared/types/customAvatar';
import AvatarRenderer from '@/components/avatar/AvatarRenderer';

// Special constant for "use profile avatar" selection - indicates profile picture should be used
export const PROFILE_AVATAR_ID = '__profile_avatar__';

type AvatarSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl';

interface SizeConfig {
  container: string;
  px: number;
}

interface AvatarProps {
  profilePictureUrl?: string | null;
  avatarImage?: string;
  customAvatar?: CustomAvatarConfig | null;
  size?: AvatarSize;
  className?: string;
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
 * Fallback chain: customAvatar (SVG) > profilePictureUrl > deterministic random custom avatar.
 */
const Avatar = memo<AvatarProps>(({
  profilePictureUrl,
  avatarImage,
  customAvatar,
  size = 'md',
  className = ''
}) => {
  const [imageError, setImageError] = useState(false);
  const config = SIZE_CONFIG[size] || SIZE_CONFIG.md;

  useEffect(() => {
    setImageError(false);
  }, [profilePictureUrl]);

  // Pre-compute fallback avatar (must be before conditionals to satisfy hook rules)
  const fallbackSeed = avatarImage || profilePictureUrl || 'default-avatar';
  const fallbackConfig = useMemo(
    () => getSeededAvatarConfig(hashString(fallbackSeed)),
    [fallbackSeed]
  );

  // 1. Custom SVG avatar (highest priority)
  if (customAvatar) {
    return (
      <div
        className={`relative rounded-full overflow-hidden flex-shrink-0 ${config.container} ${className}`}
        data-testid="header-avatar"
        data-avatar-type="custom"
      >
        <AvatarRenderer config={customAvatar} size={config.px} circular />
      </div>
    );
  }

  // 2. Profile picture (when PROFILE_AVATAR_ID or no avatarImage set)
  const shouldShowProfilePicture = profilePictureUrl &&
    (avatarImage === PROFILE_AVATAR_ID || !avatarImage) &&
    !imageError;

  if (shouldShowProfilePicture) {
    return (
      <div
        className={`relative rounded-full overflow-hidden flex-shrink-0 ${config.container} ${className}`}
        data-testid="header-avatar"
        data-avatar-image={avatarImage || PROFILE_AVATAR_ID}
        data-profile-picture-url={profilePictureUrl}
      >
        <Image
          src={profilePictureUrl}
          alt="Profile"
          fill
          sizes={`(max-width: 768px) ${config.px}px, ${config.px}px`}
          className="object-cover"
          onError={() => setImageError(true)}
          referrerPolicy="no-referrer"
          loading="lazy"
          priority={false}
          unoptimized={profilePictureUrl.startsWith('http')}
        />
      </div>
    );
  }

  // 3. Fallback: deterministic random custom avatar
  return (
    <div
      className={`relative rounded-full overflow-hidden flex-shrink-0 ${config.container} ${className}`}
      data-testid="header-avatar"
      data-avatar-type="generated"
    >
      <AvatarRenderer config={fallbackConfig} size={config.px} circular />
    </div>
  );
});

Avatar.displayName = 'Avatar';

export default Avatar;
