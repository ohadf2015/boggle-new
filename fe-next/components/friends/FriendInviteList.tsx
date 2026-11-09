'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Check, Loader2, Send, UserPlus } from 'lucide-react';
import Avatar from '@/components/Avatar';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useFriends } from '@/hooks/useFriends';
import { useSocketOptional } from '@/utils/SocketContext';
import { sendChallengeWithAck } from '@/lib/friends/sendChallengeWithAck';
import { trackGrowthEvent } from '@/utils/growthTracking';
import type { Friend } from '@/utils/friendsTypes';

const MAX_SHOWN = 6;

/** Online first, then most recently seen. */
export function orderForInvite(friends: Friend[]): Friend[] {
  return [...friends].sort((a, b) => {
    if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
    return (b.lastSeenAt ?? '').localeCompare(a.lastSeenAt ?? '');
  });
}

type InviteState = 'idle' | 'busy' | 'sent';

/**
 * "Invite friends" inside a room's invite sheet: one tap sends the friend a
 * game invite to THIS room (live toast if they are online, push if not).
 * Signed-in players with no friends get a pointer to the leaderboard instead.
 */
export function FriendInviteList({ gameCode, className }: { gameCode: string; className?: string }) {
  const { isAuthenticated } = useAuth();
  const { t, language } = useLanguage();
  const { friends, isLoading } = useFriends();
  const socketContext = useSocketOptional();
  const [states, setStates] = useState<Record<string, InviteState>>({});

  const shown = useMemo(() => orderForInvite(friends).slice(0, MAX_SHOWN), [friends]);
  const onlineCount = useMemo(() => friends.filter((f) => f.isOnline).length, [friends]);

  if (!isAuthenticated || isLoading) return null;

  if (friends.length === 0) {
    return (
      <Link
        href={`/${language}/leaderboard`}
        data-testid="friend-invite-empty"
        className={cn('flex w-full items-center gap-2 rounded-neo border-2 border-dashed border-neo-cream/40 px-3 py-2.5 text-start text-sm font-bold text-neo-cream hover:border-neo-cyan', className)}
      >
        <UserPlus aria-hidden className="h-4 w-4 shrink-0 text-neo-cyan" />
        <span>{t('friendSocial.findFriendsHint')}</span>
      </Link>
    );
  }

  const invite = async (friend: Friend) => {
    const socket = socketContext?.socket;
    if (!socket || !socketContext?.isConnected) {
      toast.error(t('friendSocial.inviteFailed'));
      return;
    }
    setStates((s) => ({ ...s, [friend.odUserId]: 'busy' }));
    const res = await sendChallengeWithAck(socket, {
      friendUserId: friend.odUserId,
      challengeType: 'join_room',
      roomCode: gameCode,
    });
    if (res.ok) {
      setStates((s) => ({ ...s, [friend.odUserId]: 'sent' }));
      trackGrowthEvent('friend_invite_sent', { surface: 'room_invite_sheet', online: friend.isOnline });
      toast.success(t('friendSocial.invitedName').replace('{name}', friend.displayName || friend.username));
    } else {
      setStates((s) => ({ ...s, [friend.odUserId]: res.code === 'CHALLENGE_ALREADY_SENT' ? 'sent' : 'idle' }));
      if (res.code !== 'CHALLENGE_ALREADY_SENT') toast.error(t('friendSocial.inviteFailed'));
    }
  };

  return (
    <section data-testid="friend-invite-list" aria-labelledby="friend-invite-title" className={cn('w-full', className)}>
      <h3 id="friend-invite-title" className="mb-2 flex items-center justify-between font-neo-display text-sm font-bold uppercase tracking-wider text-neo-cream">
        <span>{t('friendSocial.inviteFriends')}</span>
        {onlineCount > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full border-2 border-neo-black bg-neo-lime px-2 py-0.5 text-[11px] text-neo-black">
            <span aria-hidden className="h-2 w-2 rounded-full bg-neo-black" />
            {t('friendSocial.onlineCount').replace('{count}', String(onlineCount))}
          </span>
        )}
      </h3>
      <ul className="flex flex-col gap-1.5">
        {shown.map((f) => {
          const state = states[f.odUserId] ?? 'idle';
          const name = f.displayName || f.username;
          return (
            <li key={f.odUserId} className="flex items-center gap-2.5 rounded-neo border-2 border-neo-black bg-neo-navy px-2 py-1.5">
              <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full border-2 border-neo-black">
                <Avatar avatarImage={f.avatarImage} customAvatar={f.customAvatar} userId={f.odUserId} size="sm" className="h-full w-full" />
              </span>
              <span className="min-w-0 flex-1">
                <span dir="auto" className="block truncate text-sm font-bold text-neo-white">{name}</span>
                <span className={cn('flex items-center gap-1 text-[11px] font-bold', f.isOnline ? 'text-neo-lime' : 'text-neo-white/50')}>
                  <span aria-hidden className={cn('h-2 w-2 rounded-full', f.isOnline ? 'bg-neo-lime' : 'bg-neo-white/30')} />
                  {f.isOnline ? t('friendSocial.online') : t('friendSocial.offline')}
                </span>
              </span>
              <button
                type="button"
                onClick={() => invite(f)}
                disabled={state !== 'idle'}
                aria-label={t('friendSocial.inviteName').replace('{name}', name)}
                className={cn(
                  'inline-flex h-9 shrink-0 items-center gap-1 rounded-neo border-2 border-neo-black px-3 font-neo-display text-xs font-bold uppercase shadow-hard-sm active:translate-y-0.5 active:shadow-none transition-[transform,box-shadow]',
                  state === 'sent' ? 'bg-neo-navy-elevated text-neo-lime shadow-none' : 'bg-neo-pink text-neo-black',
                )}
              >
                {state === 'busy' ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
                  : state === 'sent' ? <Check aria-hidden className="h-4 w-4" strokeWidth={3} />
                  : <Send aria-hidden className="h-4 w-4" />}
                <span>{state === 'sent' ? t('friendSocial.invited') : t('friendSocial.invite')}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default FriendInviteList;
