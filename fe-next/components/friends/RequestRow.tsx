'use client';

import React from 'react';
import { Check, X } from 'lucide-react';
import { Loader } from '@/components/ui/Loader';
import { cn } from '@/lib/utils';
import Avatar from '@/components/Avatar';
import { useLanguage } from '@/contexts/LanguageContext';
import { resolveDisplayName } from '@/lib/displayName';
import type { FriendRequest } from '@/utils/friends';

interface RequestRowProps {
  request: FriendRequest;
  isDark: boolean;
  isLoading: boolean;
  onAccept: () => void;
  onDecline: () => void;
  language: string;
}

/**
 * RequestRow - Friend request item with accept/decline actions
 *
 * Features:
 * - Avatar and username display
 * - Accept button (green)
 * - Decline button (red)
 * - Loading state during actions
 */
export const RequestRow: React.FC<RequestRowProps> = ({
  request,
  isDark,
  isLoading,
  onAccept,
  onDecline,
}) => {
  const { t } = useLanguage();

  return (
    <div className={cn(
      'flex items-center gap-3 p-2 rounded-neo',
      isDark ? 'bg-black/20' : 'bg-white/50'
    )}>
      <Avatar
        avatarImage={request.fromAvatarImage}
        customAvatar={request.fromCustomAvatar}
        size="sm"
      />
      <div className="flex-1 min-w-0">
        <p className={cn('font-bold text-sm truncate', isDark ? 'text-white' : 'text-gray-900')}>
          {resolveDisplayName(
            [request.fromDisplayName, request.fromUsername],
            t('friends.aPlayer', 'a player')
          )}
        </p>
      </div>
      <div className="flex gap-1.5">
        <button
          onClick={onAccept}
          disabled={isLoading}
          aria-label={t('friends.acceptRequest')}
          className={cn(
            'p-1.5 rounded-neo border-2 border-neo-black shadow-hard-sm transition-all',
            'bg-neo-lime text-neo-black hover:shadow-hard hover:-translate-y-0.5',
            'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-hard-sm disabled:hover:translate-y-0'
          )}
        >
          {isLoading ? <Loader size="sm" /> : <Check className="w-4 h-4" strokeWidth={3} />}
        </button>
        <button
          onClick={onDecline}
          disabled={isLoading}
          aria-label={t('friends.declineRequest')}
          className={cn(
            'p-1.5 rounded-neo border-2 border-neo-black shadow-hard-sm transition-all',
            'bg-neo-pink text-white hover:shadow-hard hover:-translate-y-0.5',
            'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-hard-sm disabled:hover:translate-y-0'
          )}
        >
          <X className="w-4 h-4" strokeWidth={3} />
        </button>
      </div>
    </div>
  );
};

export default RequestRow;
