'use client';

import { useEffect, useCallback, memo } from 'react';
import Image from 'next/image';
import { Users, UserPlus } from 'lucide-react';
import { m } from 'framer-motion';
import toast from 'react-hot-toast';
import { useCrazyGames } from '@/components/CrazyGamesSDK';
import { useCrazyGamesFriends } from '@/hooks/useCrazyGamesFriends';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface CrazyGamesFriendsStripProps {
  /** Room ID for invite links */
  roomId?: string;
}

/**
 * CrazyGamesFriendsStrip — Horizontal strip showing CG friends in the MP lobby.
 * Only renders when on CrazyGames platform. Auto-loads friends on mount.
 * Clicking a friend opens a CrazyGames invite link for the current room.
 */
const CrazyGamesFriendsStrip = memo(function CrazyGamesFriendsStrip({ roomId }: CrazyGamesFriendsStripProps) {
  const { isOnCrazyGamesPlatform, inviteLink, showInviteButton } = useCrazyGames();
  const { friends, isLoading, refresh } = useCrazyGamesFriends();
  const { t } = useLanguage();

  // Load friends on mount when on CrazyGames
  useEffect(() => {
    if (isOnCrazyGamesPlatform) {
      refresh();
    }
  }, [isOnCrazyGamesPlatform, refresh]);

  // Show CG invite button when room exists
  useEffect(() => {
    if (isOnCrazyGamesPlatform && roomId) {
      showInviteButton({ roomId });
    }
  }, [isOnCrazyGamesPlatform, roomId, showInviteButton]);

  const handleFriendClick = useCallback(() => {
    if (!roomId) return;
    const link = inviteLink({ roomId });
    if (link) {
      navigator.clipboard.writeText(link)
        .then(() => toast.success(t('common.copiedToClipboard', 'Link copied!')))
        .catch(() => {});
    }
  }, [roomId, inviteLink, t]);

  if (!isOnCrazyGamesPlatform || (friends.length === 0 && !isLoading)) {
    return null;
  }

  return (
    <m.section
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="flex flex-col gap-2"
    >
      <div className="flex items-center gap-2 px-1">
        <Users className="w-3.5 h-3.5 text-neo-cyan" />
        <h2 className="font-neo-display text-[11px] text-neo-white uppercase tracking-[0.2em]">
          {t('multiplayerFlow.crazyGamesFriends', 'Friends on CrazyGames')}
        </h2>
      </div>

      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
        {isLoading && friends.length === 0 ? (
          <div className="flex gap-3">
            {[0, 1, 2].map(i => (
              <div key={`friend-skel-${i}`} className="flex flex-col items-center gap-1.5 w-16 animate-pulse">
                <div className="w-10 h-10 rounded-full bg-neo-navy-light border-2 border-black" />
                <div className="w-12 h-2.5 rounded bg-neo-navy-light" />
              </div>
            ))}
          </div>
        ) : (
          friends.map(friend => (
            <button
              type="button"
              key={friend.id}
              onClick={handleFriendClick}
              aria-label={t('multiplayerFlow.inviteFriend', { name: friend.username })}
              title={t('multiplayerFlow.inviteFriend', { name: friend.username })}
              className={cn(
                'flex flex-col items-center gap-1.5 w-16 shrink-0',
                roomId ? 'cursor-pointer hover:scale-105 transition-transform' : 'cursor-default'
              )}
            >
              <div className="relative">
                {friend.profilePictureUrl ? (
                  <Image
                    src={friend.profilePictureUrl}
                    alt={friend.username}
                    width={40}
                    height={40}
                    className="w-10 h-10 rounded-full object-cover border-[2.5px] border-black shadow-hard-sm"
                    unoptimized
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-neo-navy-light border-[2.5px] border-black shadow-hard-sm flex items-center justify-center">
                    <Users className="w-4 h-4 text-neo-cyan" />
                  </div>
                )}
                {roomId && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-neo-lime border-2 border-black flex items-center justify-center">
                    <UserPlus className="w-2.5 h-2.5 text-black" />
                  </div>
                )}
              </div>
              <span className="font-neo-body text-[11px] font-bold text-neo-white truncate w-full text-center">
                {friend.username}
              </span>
            </button>
          ))
        )}
      </div>
    </m.section>
  );
});

export default CrazyGamesFriendsStrip;
