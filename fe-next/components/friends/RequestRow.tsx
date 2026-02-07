'use client';

import React from 'react';
import { Check, X } from 'lucide-react';
import { Loader } from '@/components/ui/Loader';
import { cn } from '@/lib/utils';
import Avatar from '@/components/Avatar';
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
  language,
}) => {
  return (
    <div className={cn(
      'flex items-center gap-3 p-2 rounded-neo',
      isDark ? 'bg-black/20' : 'bg-white/50'
    )}>
      <Avatar
        avatarImage={request.fromAvatarImage}
        size="sm"
      />
      <div className="flex-1 min-w-0">
        <p className={cn('font-bold text-sm truncate', isDark ? 'text-white' : 'text-gray-900')}>
          {request.fromUsername}
        </p>
      </div>
      <div className="flex gap-1">
        <button
          onClick={onAccept}
          disabled={isLoading}
          className={cn(
            'p-1.5 rounded-full transition-colors',
            'bg-green-500 text-white hover:bg-green-600'
          )}
        >
          {isLoading ? <Loader size="sm" /> : <Check className="w-4 h-4" />}
        </button>
        <button
          onClick={onDecline}
          disabled={isLoading}
          className={cn(
            'p-1.5 rounded-full transition-colors',
            isDark ? 'bg-red-500/20 text-red-400 hover:bg-red-500/40' : 'bg-red-100 text-red-600 hover:bg-red-200'
          )}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default RequestRow;
