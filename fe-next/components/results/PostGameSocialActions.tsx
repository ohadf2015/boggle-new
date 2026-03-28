'use client';

/**
 * PostGameSocialActions (E-10, E-14)
 *
 * Social action strip shown on multiplayer results pages.
 * Surfaces "Add Friend" for non-friend opponents and share CTA.
 * Composes existing utilities — no new infrastructure needed.
 */

import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { UserPlus, Share2, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { searchUsers, sendFriendRequest } from '@/utils/friends';

interface Opponent {
  username: string;
  isBot?: boolean;
}

interface PostGameSocialActionsProps {
  opponents: Opponent[];
  reducedMotion: boolean | null;
}

/**
 * PostGameSocialActions — renders after multiplayer results
 * Shows "Add Friend" buttons for non-friend opponents
 */
export const PostGameSocialActions: React.FC<PostGameSocialActionsProps> = ({
  opponents,
  reducedMotion,
}) => {
  const { t } = useLanguage();
  const { isAuthenticated } = useAuth();
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState<string | null>(null);
  const [friendStatuses, setFriendStatuses] = useState<Map<string, 'friend' | 'pending' | 'none'>>(new Map());
  const [loaded, setLoaded] = useState(false);

  // Check friendship status for all opponents on mount
  const checkFriendships = useCallback(async () => {
    if (!isAuthenticated || opponents.length === 0 || loaded) return;

    const humanOpponents = opponents.filter(p => !p.isBot);
    if (humanOpponents.length === 0) return;

    try {
      // Search for each opponent by username to get friendship status
      const statuses = new Map<string, 'friend' | 'pending' | 'none'>();
      for (const opp of humanOpponents) {
        const results = await searchUsers(opp.username);
        const match = results.find(r => r.username === opp.username);
        if (match) {
          if (match.status === 'accepted') statuses.set(opp.username, 'friend');
          else if (match.status === 'pending') statuses.set(opp.username, 'pending');
          else statuses.set(opp.username, 'none');
        } else {
          statuses.set(opp.username, 'none');
        }
      }
      setFriendStatuses(statuses);
    } catch {
      // Silent fail — don't block results
    } finally {
      setLoaded(true);
    }
  }, [isAuthenticated, opponents, loaded]);

  // Trigger check on first render
  React.useEffect(() => {
    checkFriendships();
  }, [checkFriendships]);

  const handleAddFriend = useCallback(async (username: string) => {
    if (sending) return;
    setSending(username);
    try {
      // Search to get userId
      const results = await searchUsers(username);
      const match = results.find(r => r.username === username);
      const friendUserId = match?.odUserId || match?.id;
      if (friendUserId) {
        const result = await sendFriendRequest(friendUserId);
        if (result.success) {
          setSentRequests(prev => new Set(prev).add(username));
        }
      }
    } catch {
      // Silent fail
    } finally {
      setSending(null);
    }
  }, [sending]);

  if (!isAuthenticated) return null;

  // Filter to non-friend, non-bot opponents (only after friendship check completes)
  const addableOpponents = !loaded ? [] : opponents.filter(p =>
    !p.isBot &&
    friendStatuses.get(p.username) === 'none' &&
    !sentRequests.has(p.username)
  );

  const pendingOpponents = opponents.filter(p =>
    sentRequests.has(p.username) || friendStatuses.get(p.username) === 'pending'
  );

  if (addableOpponents.length === 0 && pendingOpponents.length === 0) return null;

  return (
    <motion.div
      initial={reducedMotion ? undefined : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="flex flex-wrap gap-2 mt-3"
    >
      {addableOpponents.map(opp => (
        <button
          key={opp.username}
          onClick={() => handleAddFriend(opp.username)}
          disabled={sending === opp.username}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-neo border-2 border-neo-black shadow-hard-sm',
            'bg-neo-cyan text-neo-black font-bold text-xs uppercase',
            'hover:shadow-hard hover:-translate-y-0.5 transition-all',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          {sending === opp.username ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <UserPlus className="w-3.5 h-3.5" />
          )}
          {t('results.addFriend').replace('{name}', opp.username)}
        </button>
      ))}

      {pendingOpponents.map(opp => (
        <span
          key={opp.username}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-neo border-2 border-neo-black/50',
            'bg-slate-700 text-slate-300 font-bold text-xs uppercase'
          )}
        >
          <Check className="w-3.5 h-3.5 text-green-400" />
          {t('results.requestSent')}
        </span>
      ))}
    </motion.div>
  );
};

export default PostGameSocialActions;
