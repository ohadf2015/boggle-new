'use client';

import React, { memo } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

interface ClickableUsernameProps {
  playerId: string;
  displayName?: string;
  className?: string;
  /** If true, navigate to profile page on click. Default: true */
  linked?: boolean;
}

/**
 * Username component that links to the player's public profile
 * Drop-in replacement for raw username text across the app
 */
const ClickableUsername = memo<ClickableUsernameProps>(({
  playerId,
  displayName,
  className,
  linked = true,
}) => {
  const { language } = useLanguage();
  const label = displayName || playerId;

  if (!linked) {
    return <span className={className}>{label}</span>;
  }

  return (
    <Link
      href={`/${language}/player/${encodeURIComponent(playerId)}`}
      className={cn(
        'hover:underline hover:text-neo-cyan transition-colors cursor-pointer',
        className
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {label}
    </Link>
  );
});

ClickableUsername.displayName = 'ClickableUsername';

export default ClickableUsername;
