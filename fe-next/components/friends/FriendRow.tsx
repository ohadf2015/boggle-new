'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Circle, Target, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import Avatar from '@/components/Avatar';
import type { Friend } from '@/utils/friends';

interface FriendRowProps {
  friend: Friend;
  isDark: boolean;
  compact?: boolean;
  onChallengeClick?: (friend: Friend) => void;
  onClick?: () => void;
}

/**
 * FriendRow - Individual friend list item
 *
 * Features:
 * - Avatar with online status indicator
 * - Click to view friend details
 * - Challenge button (non-compact mode)
 * - Responsive design for compact/full views
 */
export const FriendRow: React.FC<FriendRowProps> = ({
  friend,
  isDark,
  compact,
  onChallengeClick,
  onClick,
}) => {
  return (
    <motion.div
      whileHover={{ x: compact ? 0 : 2 }}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 p-2 rounded-neo border-2 cursor-pointer transition-colors',
        isDark
          ? 'bg-slate-700/50 border-white/10 hover:border-cyan-500/50'
          : 'bg-white border-gray-200 hover:border-cyan-400',
        compact && 'p-1.5'
      )}
    >
      <div className="relative">
        <Avatar
          avatarImage={friend.avatarImage}
          size={compact ? 'sm' : 'md'}
        />
        <Circle
          className={cn(
            'absolute -bottom-0.5 -right-0.5 w-3 h-3',
            friend.isOnline ? 'text-green-500 fill-green-500' : 'text-gray-400 fill-gray-400'
          )}
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
          <p className={cn('text-xs truncate', isDark ? 'text-gray-400' : 'text-gray-500')}>
            {friend.isOnline ? 'Online' : 'Offline'}
          </p>
        )}
      </div>

      {onChallengeClick && !compact && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onChallengeClick(friend);
          }}
          className={cn(
            'p-1.5 rounded-full transition-colors',
            isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'
          )}
        >
          <Target className="w-4 h-4 text-neo-lime" />
        </button>
      )}

      {!compact && <ChevronRight className={cn('w-4 h-4 rtl:rotate-180', isDark ? 'text-gray-500' : 'text-gray-400')} />}
    </motion.div>
  );
};

export default FriendRow;
