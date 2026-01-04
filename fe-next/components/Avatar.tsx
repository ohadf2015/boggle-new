'use client';

import { useState, useEffect, memo } from 'react';
import Image from 'next/image';
import { Bot } from 'lucide-react';
import { getAvatarPath, mapEmojiToAvatar } from '@/utils/avatarConfig';

// Special constant for "use profile avatar" selection - indicates profile picture/emoji should be used
const PROFILE_AVATAR_ID = '__profile_avatar__';

/**
 * Avatar size type
 */
type AvatarSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/**
 * Size configuration
 */
interface SizeConfig {
  container: string;
  text: string;
  px: number;
}

/**
 * Avatar Props
 */
interface AvatarProps {
  profilePictureUrl?: string;
  avatarEmoji?: string;
  avatarImage?: string; // New: Avatar image filename or ID
  avatarColor?: string; // Deprecated: kept for backward compatibility
  size?: AvatarSize;
  className?: string;
}

/**
 * Size configuration map
 */
const SIZE_CONFIG: Record<AvatarSize, SizeConfig> = {
  sm: { container: 'w-6 h-6', text: 'text-sm', px: 24 },
  md: { container: 'w-8 h-8', text: 'text-base', px: 32 },
  lg: { container: 'w-12 h-12', text: 'text-2xl', px: 48 },
  xl: { container: 'w-20 h-20', text: 'text-5xl', px: 80 },
  '2xl': { container: 'w-28 h-28', text: 'text-6xl', px: 112 }
};

/**
 * Unified Avatar Component - Displays profile pictures or image avatar fallback
 * Memoized to prevent unnecessary re-renders in lists
 */
const Avatar = memo<AvatarProps>(({
  profilePictureUrl,
  avatarEmoji,
  avatarImage,
  avatarColor,
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

  // 1. Show profile picture if available and hasn't errored
  if (profilePictureUrl && !imageError) {
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

  // 2. Show avatar image if provided (either directly or via emoji migration)
  // Skip if avatarImage is PROFILE_AVATAR_ID - that means use profile picture/emoji fallback
  let avatarPath: string | undefined;

  if (avatarImage && avatarImage !== PROFILE_AVATAR_ID) {
    // Direct avatar image provided (not the special profile marker)
    avatarPath = avatarImage.includes('/') ? avatarImage : getAvatarPath(avatarImage);
  } else if (avatarEmoji) {
    // Legacy emoji avatar - map to image avatar
    const mappedAvatar = mapEmojiToAvatar(avatarEmoji);
    avatarPath = getAvatarPath(mappedAvatar);
  }

  if (avatarPath && !avatarError) {
    return (
      <div
        className={`relative rounded-full overflow-hidden flex-shrink-0 ${config.container} ${className}`}
      >
        <Image
          src={avatarPath}
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

  // 3. Fallback to emoji if all else fails (backward compatibility)
  // Special case: show FaRobot icon for robot emoji to maintain flat icon consistency
  const isRobotEmoji = avatarEmoji === '🤖';
  const fallbackEmoji = avatarEmoji || '🐶';
  const fallbackColor = avatarColor || '#4ECDC4';

  return (
    <div
      className={`rounded-full flex items-center justify-center flex-shrink-0 ${config.container} ${config.text} ${className}`}
      style={{ backgroundColor: fallbackColor }}
    >
      {isRobotEmoji ? <Bot className="text-neo-cream" style={{ fontSize: '0.7em' }} /> : fallbackEmoji}
    </div>
  );
});

Avatar.displayName = 'Avatar';

export default Avatar;
