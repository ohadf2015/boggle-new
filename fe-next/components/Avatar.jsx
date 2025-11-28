'use client';

import React, { useState } from 'react';
import Image from 'next/image';

/**
 * Unified Avatar Component - Displays profile pictures or emoji fallback
 *
 * @param {string} profilePictureUrl - URL of profile picture (optional)
 * @param {string} avatarEmoji - Fallback emoji (default: dog)
 * @param {string} avatarColor - Fallback background color
 * @param {'sm'|'md'|'lg'|'xl'} size - Size preset
 * @param {string} className - Additional CSS classes
 */
const Avatar = ({
  profilePictureUrl,
  avatarEmoji = '🐶',
  avatarColor = '#4ECDC4',
  size = 'md',
  className = ''
}) => {
  const [imageError, setImageError] = useState(false);

  const sizeConfig = {
    sm: { container: 'w-6 h-6', text: 'text-sm', px: 24 },
    md: { container: 'w-8 h-8', text: 'text-base', px: 32 },
    lg: { container: 'w-12 h-12', text: 'text-2xl', px: 48 },
    xl: { container: 'w-24 h-24', text: 'text-5xl', px: 96 }
  };

  const config = sizeConfig[size] || sizeConfig.md;

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
};

export default Avatar;
