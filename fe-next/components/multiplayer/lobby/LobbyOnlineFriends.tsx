'use client';

import { useMemo } from 'react';
import { Check, Loader2, Send } from 'lucide-react';
import Avatar from '@/components/Avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useFriends } from '@/hooks/useFriends';
import { useFriendRoomInvite } from '@/components/friends/useFriendRoomInvite';
import { cn } from '@/lib/utils';

const SHOWN = 3;

type Props = { gameCode: string; onMore: () => void; className?: string };

/** Online friends on the lobby itself, one tap to invite; the rest live in the invite sheet. */
export function LobbyOnlineFriends(props: Props) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <OnlineFriendsRow {...props} /> : null;
}

function OnlineFriendsRow({ gameCode, onMore, className }: Props) {
  const { t } = useLanguage();
  const { friends } = useFriends();
  const { states, invite } = useFriendRoomInvite(gameCode, 'room_lobby_strip');
  const online = useMemo(() => friends.filter((f) => f.isOnline), [friends]);

  if (online.length === 0) return null;
  const extra = online.length - SHOWN;

  return (
    <section
      data-testid="lobby-online-friends"
      aria-label={t('friendSocial.onlineNowLabel')}
      className={cn('flex items-center gap-2 rounded-neo border-2 border-neo-black bg-neo-navy-light/70 px-2 py-1.5 shadow-hard-sm', className)}
    >
      <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full border border-neo-black bg-neo-lime" />
      <ul className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
        {online.slice(0, SHOWN).map((f) => {
          const name = f.displayName || f.username;
          const state = states[f.odUserId] ?? 'idle';
          return (
            <li key={f.odUserId} className="flex min-w-0 items-center gap-1">
              <span className="h-8 w-8 shrink-0 overflow-hidden rounded-full border-2 border-neo-black">
                <Avatar avatarImage={f.avatarImage} customAvatar={f.customAvatar} userId={f.odUserId} size="sm" className="h-full w-full" />
              </span>
              <button
                type="button"
                onClick={() => invite(f)}
                disabled={state !== 'idle'}
                aria-label={t('friendSocial.inviteName', { name })}
                className={cn(
                  'inline-flex h-8 min-w-[44px] items-center justify-center rounded-neo border-2 border-neo-black px-2 shadow-hard-sm transition-[transform,box-shadow] active:translate-y-0.5 active:shadow-none',
                  state === 'sent' ? 'bg-neo-navy-elevated text-neo-lime shadow-none' : 'bg-neo-pink text-neo-black',
                )}
              >
                {state === 'busy' ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
                  : state === 'sent' ? <Check aria-hidden className="h-4 w-4" strokeWidth={3} />
                  : <Send aria-hidden className="h-4 w-4 rtl:-scale-x-100" />}
              </button>
            </li>
          );
        })}
      </ul>
      {extra > 0 && (
        <button
          type="button"
          onClick={onMore}
          aria-label={t('friendSocial.moreOnline', { count: extra })}
          className="inline-flex h-8 min-w-[44px] shrink-0 items-center justify-center rounded-full border-2 border-neo-black bg-neo-cyan px-2 font-neo-display text-xs font-bold text-neo-black"
        >
          <span dir="ltr">+{extra}</span>
        </button>
      )}
    </section>
  );
}
