'use client';

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { m } from 'framer-motion';
import { UserPlus, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useFriends } from '@/hooks/useFriends';
import { searchUsers } from '@/utils/friends';

type FriendStatus = 'self' | 'friend' | 'pending' | 'sent' | 'none';

interface ResultsFriendStatusValue {
  /** Friend status for a username, or 'none' when unknown. */
  statusFor: (username: string) => FriendStatus;
  /** Trigger send-friend-request for a target username. */
  sendByUsername: (username: string) => Promise<void>;
  /** Usernames marked sent locally this session (optimistic). */
  isSent: (username: string) => boolean;
  /** True only when current user is signed in. */
  isAuthenticated: boolean;
  /** Current user's username (lowercased) for self-detection. */
  currentUsername: string | null;
}

const ResultsFriendStatusContext = createContext<ResultsFriendStatusValue | null>(null);

export function ResultsFriendStatusProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const { friends, outgoingRequests, sendRequest } = useFriends();
  const [sentUsernames, setSentUsernames] = useState<Set<string>>(new Set());

  const currentUsername = useMemo(() => {
    const u = (user as { username?: string } | null)?.username;
    return u ? u.toLowerCase() : null;
  }, [user]);

  const friendSet = useMemo(
    () => new Set(friends.map(f => f.username.toLowerCase())),
    [friends]
  );
  const pendingSet = useMemo(
    () => new Set(outgoingRequests.map(r => r.fromUsername.toLowerCase())),
    [outgoingRequests]
  );

  const statusFor = useCallback((username: string): FriendStatus => {
    const u = username.toLowerCase();
    if (currentUsername && u === currentUsername) return 'self';
    if (friendSet.has(u)) return 'friend';
    if (sentUsernames.has(u)) return 'sent';
    if (pendingSet.has(u)) return 'pending';
    return 'none';
  }, [currentUsername, friendSet, pendingSet, sentUsernames]);

  const isSent = useCallback((username: string) => sentUsernames.has(username.toLowerCase()), [sentUsernames]);

  const sendByUsername = useCallback(async (username: string) => {
    const matches = await searchUsers(username);
    const match = matches.find(m => m.username.toLowerCase() === username.toLowerCase());
    const targetId = match?.odUserId || match?.id;
    if (!targetId) return;
    const result = await sendRequest(targetId);
    if (result.success) {
      setSentUsernames(prev => {
        const next = new Set(prev);
        next.add(username.toLowerCase());
        return next;
      });
    }
  }, [sendRequest]);

  const value = useMemo<ResultsFriendStatusValue>(() => ({
    statusFor,
    sendByUsername,
    isSent,
    isAuthenticated,
    currentUsername,
  }), [statusFor, sendByUsername, isSent, isAuthenticated, currentUsername]);

  return (
    <ResultsFriendStatusContext.Provider value={value}>
      {children}
    </ResultsFriendStatusContext.Provider>
  );
}

export function useResultsFriendStatus(): ResultsFriendStatusValue | null {
  return useContext(ResultsFriendStatusContext);
}

interface AddFriendBadgeProps {
  username: string;
  isBot?: boolean;
  /** Visual variant — 'compact' is icon-only (avatar overlay), 'inline' is small chip with text. */
  variant?: 'compact' | 'inline';
  className?: string;
}

/**
 * AddFriendBadge — inline friend-add affordance for results player tiles.
 *
 * Renders nothing for bots, current user, already-friends, or unauthenticated viewers.
 * Renders a "Sent" pill when an outgoing request is already pending.
 * Renders a clickable "+" button otherwise; on success shows a "Sent" pill.
 */
export function AddFriendBadge({
  username,
  isBot,
  variant = 'compact',
  className,
}: AddFriendBadgeProps) {
  const ctx = useResultsFriendStatus();
  const { t } = useLanguage();
  const [busy, setBusy] = useState(false);

  if (!ctx || isBot || !ctx.isAuthenticated) return null;

  const status = ctx.statusFor(username);
  if (status === 'self' || status === 'friend') return null;

  const showSent = status === 'sent' || status === 'pending';

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (busy || showSent) return;
    setBusy(true);
    try {
      await ctx.sendByUsername(username);
    } finally {
      setBusy(false);
    }
  };

  if (showSent) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-neo border-2 border-neo-black/40',
          'bg-neo-navy/80 text-green-300 font-bold text-[9px] uppercase shadow-hard-sm',
          className
        )}
        aria-label={t('results.requestSent') || 'Request Sent'}
      >
        <Check className="w-3 h-3" />
        {variant === 'inline' && (t('results.requestSent') || 'Request Sent')}
      </span>
    );
  }

  const ariaLabel = (t('results.addFriend') || 'Add {name}').replace('{name}', username);

  if (variant === 'inline') {
    return (
      <m.button
        type="button"
        onClick={handleClick}
        disabled={busy}
        whileTap={{ scale: 0.95 }}
        className={cn(
          'inline-flex items-center gap-1 px-2 py-1 rounded-neo border-2 border-neo-black',
          'bg-neo-cyan text-neo-black font-black text-[10px] uppercase shadow-hard-sm',
          'hover:shadow-hard hover:-translate-y-px transition-all',
          'disabled:opacity-60 disabled:cursor-not-allowed',
          className
        )}
        aria-label={ariaLabel}
      >
        {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserPlus className="w-3 h-3" />}
        {ariaLabel}
      </m.button>
    );
  }

  return (
    <m.button
      type="button"
      onClick={handleClick}
      disabled={busy}
      whileTap={{ scale: 0.9 }}
      className={cn(
        'w-7 h-7 inline-flex items-center justify-center rounded-neo',
        'bg-neo-cyan text-neo-black border-2 border-neo-black shadow-hard-sm',
        'hover:shadow-hard hover:-translate-y-px transition-all',
        'disabled:opacity-60 disabled:cursor-not-allowed',
        className
      )}
      aria-label={ariaLabel}
      title={ariaLabel}
    >
      {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
    </m.button>
  );
}

export default AddFriendBadge;
