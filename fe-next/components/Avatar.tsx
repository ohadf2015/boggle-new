'use client';

import React, { useState, memo } from 'react';
import Image from 'next/image';

/**
 * Avatar size type
 */
type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

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
  avatarColor?: string;
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
  xl: { container: 'w-24 h-24', text: 'text-5xl', px: 96 }
};

/**
 * Unified Avatar Component - Displays profile pictures or emoji fallback
 * Memoized to prevent unnecessary re-renders in lists
 */
const Avatar = memo<AvatarProps>(({
  profilePictureUrl,
  avatarEmoji = '🐶',
  avatarColor = '#4ECDC4',
  size = 'md',
  className = ''
}) => {
  const [imageError, setImageError] = useState(false);
  const config = SIZE_CONFIG[size] || SIZE_CONFIG.md;

  // Show profile picture if available and hasn't errored
  if (profilePictureUrl && !imageError) {
    return (
      <div
        className={`relative rounded-full overflow-hidden flex-shrink-0 ${config.container} ${className}`}
      >
        <Image
          src={profilePictureUrl}
          alt="Profile"
          fill
          sizes={`${config.px}px`}
          className="object-cover"
          onError={() => setImageError(true)}
          referrerPolicy="no-referrer"
        />
      </div>
    );
  }

  // Fallback to emoji avatar
  return (
    <div
      className={`rounded-full flex items-center justify-center flex-shrink-0 ${config.container} ${config.text} ${className}`}
      style={{ backgroundColor: avatarColor }}
    >
      {avatarEmoji}
    </div>
  );
});

Avatar.displayName = 'Avatar';

export default Avatar;
