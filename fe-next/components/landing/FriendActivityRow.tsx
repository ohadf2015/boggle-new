'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import Avatar from '@/components/Avatar';
import { cn } from '@/lib/utils';
import type { FriendActivityEvent } from '@/hooks/useFriendsActivity';

interface FriendActivityRowProps {
  event: FriendActivityEvent;
}

export function FriendActivityRow({ event }: FriendActivityRowProps) {
  const { t } = useLanguage();

  return (
    <div
      className={cn(
        'flex items-center gap-2 h-12 px-2 border-b border-neo-white/10 last:border-b-0',
        event.beatPlayer && 'bg-neo-pink/10'
      )}
    >
      {/* Avatar */}
      <div className="shrink-0">
        <Avatar
          avatarImage={event.friendAvatar ?? undefined}
          customAvatar={event.friendAvatarConfig}
          userId={event.friendId}
          size="sm"
        />
      </div>

      {/* Name + action */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 truncate">
          <span className="font-bold text-neo-white text-xs truncate">
            {event.friendName}
          </span>
          {event.beatPlayer && (
            <span className="text-neo-pink font-black text-[10px] uppercase whitespace-nowrap">
              {t('friendsActivity.beatYou')}
            </span>
          )}
        </div>
        <p className="text-neo-white text-[11px] truncate">
          {t(event.actionKey, event.actionParams as Record<string, string | number>)}
        </p>
      </div>

      {/* Time ago */}
      <span className="text-neo-white text-[10px] font-medium shrink-0">
        {event.timeAgo}
      </span>
    </div>
  );
}
