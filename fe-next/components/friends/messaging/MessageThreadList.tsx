'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { MessageCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Loader } from '@/components/ui/Loader';
import { useTheme } from '@/utils/ThemeContext';
import { cn } from '@/lib/utils';
import Avatar from '@/components/Avatar';
import type { MessageThread } from '@/shared/types/friends';

interface MessageThreadListProps {
  threads: MessageThread[];
  isLoading: boolean;
  unreadCount: number;
  onThreadClick: (thread: MessageThread) => void;
  className?: string;
}

/**
 * Pure utility function to format timestamp as relative time
 * @param now - Current timestamp in milliseconds
 * @param timestamp - Message timestamp in milliseconds
 * @param language - Language code for localization
 * @returns Formatted relative time string
 */
function formatRelativeTime(now: number, timestamp: number, t: (key: string) => string): string {
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return t('messaging.timeNow');
  if (minutes < 60) return `${minutes}${t('messaging.timeMinutes')}`;
  if (hours < 24) return `${hours}${t('messaging.timeHours')}`;
  return `${days}${t('messaging.timeDays')}`;
}

/**
 * MessageThreadList - Message inbox showing recent conversations
 *
 * Features:
 * - List of recent conversations with friends
 * - Unread badge with pulse animation
 * - Last message preview (truncated)
 * - Relative timestamps (5m ago, 2h ago, etc.)
 * - Online status indicators
 */
export const MessageThreadList: React.FC<MessageThreadListProps> = ({
  threads,
  isLoading,
  unreadCount,
  onThreadClick,
  className,
}) => {
  const { t, language } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const isRTL = language === 'he';

  // Capture current time once during render for relative time calculations
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();

  // Loading state
  if (isLoading) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-12', className)}>
        <Loader size="md" />
        <p className={cn('mt-3 text-sm font-medium', isDark ? 'text-gray-400' : 'text-gray-600')}>
          {t('common.loading')}
        </p>
      </div>
    );
  }

  // Empty state
  if (threads.length === 0) {
    return (
      <div className={cn(
        'flex flex-col items-center justify-center py-12 rounded-neo border-2',
        isDark ? 'bg-slate-800/50 border-white/10' : 'bg-gray-50 border-gray-200',
        className
      )}>
        <MessageCircle className="w-12 h-12 text-gray-400 mb-3" />
        <p className={cn('font-bold', isDark ? 'text-gray-300' : 'text-gray-600')}>
          {t('friends.noMessages')}
        </p>
        <p className={cn('text-sm mt-1', isDark ? 'text-gray-400' : 'text-gray-500')}>
          {t('friends.startConversation')}
        </p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      {threads.map((thread, index) => (
        <motion.button
          key={thread.conversationId}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          onClick={() => onThreadClick(thread)}
          className={cn(
            'w-full rounded-neo border-2 border-neo-black shadow-hard p-3',
            'hover:shadow-hard-lg hover:-translate-y-0.5 transition-all',
            'flex items-center gap-3 text-left',
            isDark ? 'bg-slate-800' : 'bg-white'
          )}
        >
          {/* Avatar with online indicator */}
          <div className="relative flex-shrink-0">
            <Avatar
              avatarImage={thread.friendAvatar.image}
              size="md"
              className="border-2 border-neo-black"
            />
            {thread.isOnline && (
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-neo-black rounded-full" />
            )}
          </div>

          {/* Message content */}
          <div className={cn('flex-1 min-w-0', isRTL && 'text-right')}>
            <div className="flex items-center justify-between mb-1">
              <p className={cn('font-black text-white truncate', 'ms-2')}>
                {thread.friendDisplayName || thread.friendUsername}
              </p>
              <span className={cn(
                'text-xs font-medium flex-shrink-0',
                isDark ? 'text-gray-400' : 'text-gray-500',
                'me-2'
              )}>
                {formatRelativeTime(now, thread.lastMessageAt, t)}
              </span>
            </div>
            <p className={cn(
              'text-sm truncate',
              isDark ? 'text-gray-400' : 'text-gray-600'
            )}>
              {thread.lastMessage}
            </p>
          </div>

          {/* Unread badge */}
          {thread.unreadCount > 0 && (
            <span className={cn(
              'flex-shrink-0 bg-neo-pink text-white font-black text-xs px-2 py-1',
              'rounded-full animate-pulse min-w-[1.5rem] text-center'
            )}>
              {thread.unreadCount > 9 ? '9+' : thread.unreadCount}
            </span>
          )}
        </motion.button>
      ))}
    </div>
  );
};

export default MessageThreadList;
