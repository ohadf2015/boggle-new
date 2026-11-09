'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Check, Loader2, MessageCircle, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { useFriendStatus } from './FriendStatusContext';

interface FriendQuickActionProps {
  /** Signed-in player id. Guests and bots have none, and get no button. */
  userId: string | null | undefined;
  name: string;
  /** Analytics surface, e.g. 'global_leaderboard', 'daily_leaderboard', 'mp_results'. */
  surface: string;
  className?: string;
}

const BASE =
  'shrink-0 inline-flex items-center justify-center gap-1 h-9 min-w-9 px-2 rounded-neo border-2 border-neo-black font-neo-display font-bold text-xs uppercase shadow-hard-sm active:translate-y-0.5 active:shadow-none transition-[transform,box-shadow] disabled:opacity-60';

const stop = (e: React.SyntheticEvent) => e.stopPropagation();

/**
 * The one social action a leaderboard row needs: add a stranger, accept their
 * request, or chat with a friend. Renders nothing for the viewer's own row, for
 * guests/bots, outside a FriendStatusProvider, or where the Families Policy
 * turns the action off.
 */
export function FriendQuickAction({ userId, name, surface, className }: FriendQuickActionProps) {
  const ctx = useFriendStatus();
  const { t, language } = useLanguage();
  const [busy, setBusy] = useState(false);

  if (!ctx || !ctx.isAuthenticated || !userId) return null;
  const relation = ctx.relationFor(userId);
  if (relation === 'self') return null;

  if (relation === 'friend') {
    if (!ctx.canMessage) return null;
    const label = t('friendSocial.chatWith').replace('{name}', name);
    return (
      <Link
        href={`/${language}/friends?tab=messages&friendUserId=${encodeURIComponent(userId)}`}
        onClick={(e) => { stop(e); trackGrowthEvent('friend_chat_opened', { surface }); }}
        aria-label={label}
        title={label}
        data-testid="friend-quick-chat"
        className={cn(BASE, 'bg-neo-lime text-neo-black', className)}
      >
        <MessageCircle aria-hidden className="h-4 w-4" strokeWidth={2.75} />
      </Link>
    );
  }

  if (relation === 'sent') {
    return (
      <span
        role="status"
        aria-label={t('friendSocial.requestSent')}
        title={t('friendSocial.requestSent')}
        data-testid="friend-quick-sent"
        className={cn(BASE, 'bg-neo-navy-elevated text-neo-lime border-neo-black/60 shadow-none', className)}
      >
        <Check aria-hidden className="h-4 w-4" strokeWidth={3} />
      </span>
    );
  }

  if (!ctx.canManage) return null;

  const run = async (e: React.MouseEvent) => {
    stop(e);
    if (busy) return;
    setBusy(true);
    try {
      const ok = relation === 'incoming' ? await ctx.acceptFrom(userId, surface) : await ctx.sendTo(userId, surface);
      if (ok) {
        toast.success(
          (relation === 'incoming' ? t('friendSocial.nowFriends') : t('friendSocial.requestSentTo')).replace('{name}', name),
        );
      } else {
        toast.error(t('friendSocial.requestFailed'));
      }
    } finally {
      setBusy(false);
    }
  };

  if (relation === 'incoming') {
    const label = t('friendSocial.acceptFrom').replace('{name}', name);
    return (
      <button
        type="button"
        onClick={run}
        disabled={busy}
        aria-label={label}
        title={label}
        data-testid="friend-quick-accept"
        className={cn(BASE, 'bg-neo-yellow text-neo-black', className)}
      >
        {busy ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <Check aria-hidden className="h-4 w-4" strokeWidth={3} />}
        <span>{t('friendSocial.accept')}</span>
      </button>
    );
  }

  const label = t('friendSocial.addFriend').replace('{name}', name);
  return (
    <button
      type="button"
      onClick={run}
      disabled={busy}
      aria-label={label}
      title={label}
      data-testid="friend-quick-add"
      className={cn(BASE, 'bg-neo-cyan text-neo-black', className)}
    >
      {busy ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <UserPlus aria-hidden className="h-4 w-4" strokeWidth={2.75} />}
    </button>
  );
}

export default FriendQuickAction;
