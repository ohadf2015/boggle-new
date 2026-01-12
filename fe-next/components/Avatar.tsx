'use client';

import { useState, useEffect, memo } from 'react';
import Image from 'next/image';
import { User } from 'lucide-react';
import { getAvatarPath, getRandomAvatar, AVATARS } from '@/utils/avatarConfig';

// Special constant for "use profile avatar" selection - indicates profile picture should be used
export const PROFILE_AVATAR_ID = '__profile_avatar__';

/**
 * Avatar size type
 */
type AvatarSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/**
 * Size configuration
 */
interface SizeConfig {
  container: string;
  icon: string;
  px: number;
}

/**
 * Avatar Props
 */
interface AvatarProps {
  profilePictureUrl?: string | null;
  avatarImage?: string; // Avatar image ID (e.g., 'broccoli-bob') or PROFILE_AVATAR_ID
  size?: AvatarSize;
  className?: string;
}

/**
 * Size configuration map
 */
const SIZE_CONFIG: Record<AvatarSize, SizeConfig> = {
  sm: { container: 'w-6 h-6', icon: 'w-4 h-4', px: 24 },
  md: { container: 'w-8 h-8', icon: 'w-5 h-5', px: 32 },
  lg: { container: 'w-12 h-12', icon: 'w-8 h-8', px: 48 },
  xl: { container: 'w-20 h-20', icon: 'w-12 h-12', px: 80 },
  '2xl': { container: 'w-28 h-28', icon: 'w-16 h-16', px: 112 }
};

/**
 * Unified Avatar Component - Displays profile pictures or character avatar images
 * No emoji fallback - only supports custom character avatars or profile pictures
 * Memoized to prevent unnecessary re-renders in lists
 */
const Avatar = memo<AvatarProps>(({
  profilePictureUrl,
  avatarImage,
  size = 'md',
  className = ''
}) => {
  const [imageError, setImageError] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const config = SIZE_CONFIG[size] || SIZE_CONFIG.md;

  // Reset error states when URLs change
  useEffect(() => {
    setImageError(false);
    setAvatarError(false);
  }, [profilePictureUrl, avatarImage]);

  // 1. Show profile picture if available and using PROFILE_AVATAR_ID or explicitly provided
  const shouldShowProfilePicture = profilePictureUrl &&
    (avatarImage === PROFILE_AVATAR_ID || !avatarImage) &&
    !imageError;

  if (shouldShowProfilePicture) {
    return (
      <div
        className={`relative rounded-full overflow-hidden flex-shrink-0 ${config.container} ${className}`}
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
        />
      </div>
    );
  }

  // 2. Show character avatar image if provided and valid
  if (avatarImage && avatarImage !== PROFILE_AVATAR_ID && !avatarError) {
    // Check if it's a valid avatar ID
    const isValidAvatar = AVATARS.some(a => a.id === avatarImage);
    const avatarPath = avatarImage.includes('/') ? avatarImage : getAvatarPath(avatarImage);

    // If avatar ID is invalid, use a random one
    const finalPath = isValidAvatar ? avatarPath : getAvatarPath(getRandomAvatar());

    return (
      <div
        className={`relative rounded-full overflow-hidden flex-shrink-0 ${config.container} ${className}`}
      >
        <Image
          src={finalPath}
          alt="Avatar"
          fill
          sizes={`(max-width: 768px) ${config.px}px, ${config.px}px`}
          className="object-cover"
          onError={() => setAvatarError(true)}
          loading="lazy"
          priority={false}
        />
      </div>
    );
  }

  // 3. Fallback: Show default avatar (first in the list)
  // This handles cases where avatarImage is PROFILE_AVATAR_ID but no profile picture exists
  const fallbackAvatar = AVATARS[0];

  return (
    <div
      className={`relative rounded-full overflow-hidden flex-shrink-0 ${config.container} ${className}`}
    >
      <Image
        src={getAvatarPath(fallbackAvatar)}
        alt="Avatar"
        fill
        sizes={`(max-width: 768px) ${config.px}px, ${config.px}px`}
        className="object-cover"
        onError={() => {
          // If even fallback fails, show a generic user icon
          setAvatarError(true);
        }}
        loading="lazy"
        priority={false}
      />
      {avatarError && (
        <div className="absolute inset-0 bg-neo-navy/80 flex items-center justify-center" data-testid="avatar-fallback-icon">
          <User className={`${config.icon} text-neo-cyan`} />
        </div>
      )}
    </div>
  );
});

Avatar.displayName = 'Avatar';

export default Avatar;
