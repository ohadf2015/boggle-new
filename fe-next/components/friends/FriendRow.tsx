'use client';

import React, { useMemo } from 'react';
import { m } from 'framer-motion';
import { Target, ChevronRight, Clock, Gift, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import Avatar from '@/components/Avatar';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Friend } from '@/utils/friends';

interface FriendRowProps {
  friend: Friend;
  isDark: boolean;
  compact?: boolean;
  onChallengeClick?: (friend: Friend) => void;
  onGiftClick?: (friend: Friend) => void;
  onMessageClick?: (friend: Friend) => void;
  onClick?: () => void;
}

/**
 * Get relative time string from a date
 */
function getRelativeTimeString(lastSeen: string | undefined, t: (key: string, params?: Record<string, string | number>) => string): string {
  if (!lastSeen) return t('friends.status.unknown');

  const now = Date.now();
  const lastSeenTime = new Date(lastSeen).getTime();
  const diffMs = now - lastSeenTime;
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) {
    return t('friends.status.justNow');
  } else if (diffMinutes < 60) {
    return t('friends.status.minutesAgo', { count: diffMinutes });
  } else if (diffHours < 24) {
    return t('friends.status.hoursAgo', { count: diffHours });
  } else if (diffDays < 7) {
    return t('friends.status.daysAgo', { count: diffDays });
  } else {
    return t('friends.status.longAgo');
  }
}

/**
 * FriendStatusIndicator - Visual status indicator with icon and dot
 */
const FriendStatusIndicator: React.FC<{
  isOnline: boolean;
  size?: 'sm' | 'md';
  isDark?: boolean;
}> = ({ isOnline, size = 'md', isDark = true }) => {
  const dotSize = size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3';

  return (
    <div
      className={cn(
        'absolute -bottom-0.5 -inset-e-0.5 rounded-full border-2 border-slate-800',
        dotSize,
        isOnline
          ? 'bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.6)]'
          : 'bg-gray-500'
      )}
      aria-label={isOnline ? 'Online' : 'Offline'}
    />
  );
};

/**
 * FriendRow - Individual friend list item
 *
 * Features:
 * - Avatar with online status indicator (green glow when online)
 * - Status text showing online/offline with "last seen" time
 * - Click to view friend details
 * - Challenge button (non-compact mode)
 * - Responsive design for compact/full views
 */
export const FriendRow: React.FC<FriendRowProps> = ({
  friend,
  isDark,
  compact,
  onChallengeClick,
  onGiftClick,
  onMessageClick,
  onClick,
}) => {
  const { t } = useLanguage();

  const statusText = useMemo(() => {
    if (friend.isOnline) {
      return t('friends.status.online');
    }
    const relativeTime = getRelativeTimeString(friend.lastSeenAt, t);
    return relativeTime;
  }, [friend.isOnline, friend.lastSeenAt, t]);

  return (
    <m.div
      role="button"
      tabIndex={0}
      whileHover={{ x: compact ? 0 : 2, y: compact ? 0 : -1 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      onKeyDown={(e: React.KeyboardEvent) => {
        if ((e.key === 'Enter' || e.key === ' ') && onClick) {
          e.preventDefault();
          onClick();
        }
      }}
      aria-label={friend.displayName || friend.username}
      className={cn(
        'flex items-center gap-3 p-2 rounded-neo border-2 cursor-pointer transition-colors',
        isDark
          ? 'bg-neo-navy-elevated/50 border-white/10 hover:border-cyan-500/50'
          : 'bg-white border-gray-200 hover:border-cyan-400',
        compact && 'p-1.5'
      )}
    >
      <div className="relative">
        <Avatar
          avatarImage={friend.avatarImage}
          customAvatar={friend.customAvatar}
          size={compact ? 'sm' : 'md'}
        />
        <FriendStatusIndicator
          isOnline={friend.isOnline}
          size={compact ? 'sm' : 'md'}
          isDark={isDark}
        />
      </div>

      <div className="flex-1 min-w-0">
        <p className={cn(
          'font-bold truncate',
          compact ? 'text-xs' : 'text-sm',
          isDark ? 'text-white' : 'text-gray-900'
        )}>
          {friend.displayName || friend.username}
        </p>
        {!compact && (
          <div className="flex items-center gap-1">
            {!friend.isOnline && (
              <Clock className={cn('w-3 h-3 shrink-0', isDark ? 'text-gray-500' : 'text-gray-400')} />
            )}
            <p className={cn(
              'text-xs truncate',
              friend.isOnline
                ? (isDark ? 'text-green-400' : 'text-green-600')
                : (isDark ? 'text-gray-400' : 'text-gray-500')
            )}>
              {statusText}
            </p>
          </div>
        )}
      </div>

      {!compact && (
        <div className="flex items-center gap-1">
          {onMessageClick && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMessageClick(friend);
              }}
              aria-label={t('friends.sendMessage')}
              className={cn(
                'p-1.5 rounded-full transition-colors',
                isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'
              )}
            >
              <MessageCircle className="w-4 h-4 text-neo-cyan" />
            </button>
          )}
          {onGiftClick && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onGiftClick(friend);
              }}
              aria-label={t('friends.sendGift')}
              className={cn(
                'p-1.5 rounded-full transition-colors',
                isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'
              )}
            >
              <Gift className="w-4 h-4 text-neo-orange" />
            </button>
          )}
          {onChallengeClick && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onChallengeClick(friend);
              }}
              aria-label={t('friends.challenges.send')}
              className={cn(
                'p-1.5 rounded-full transition-colors',
                isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'
              )}
            >
              <Target className="w-4 h-4 text-neo-lime" />
            </button>
          )}
        </div>
      )}

      {!compact && <ChevronRight className={cn('w-4 h-4 rtl:rotate-180', isDark ? 'text-gray-500' : 'text-gray-400')} />}
    </m.div>
  );
};

export default FriendRow;
