'use client';

/**
 * PactFriendSelector - Modal to select a friend for a Word Pact.
 * Lists accepted friends, shows warning if friend already has a pact.
 */

import React, { memo, useEffect, useState, useCallback } from 'react';
import { X, UserPlus } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useWordPact } from '@/hooks/useWordPact';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

interface Friend {
  id: string;
  username: string;
  avatar_image: string | null;
  hasActivePact: boolean;
}

interface PactFriendSelectorProps {
  onClose: () => void;
}

export const PactFriendSelector: React.FC<PactFriendSelectorProps> = memo(
  function PactFriendSelector({ onClose }) {
    const { t } = useLanguage();
    const { user } = useAuth();
    const { createPact } = useWordPact();
    const [friends, setFriends] = useState<Friend[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      async function fetchFriends() {
        if (!user?.id || !supabase) {
          setLoading(false);
          return;
        }

        try {
          // Get accepted friends
          const { data: friendRows } = await supabase
            .from('friends')
            .select('user_id, friend_id')
            .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
            .eq('status', 'accepted');

          if (!friendRows || friendRows.length === 0) {
            setLoading(false);
            return;
          }

          const friendIds = friendRows.map((r) =>
            r.user_id === user.id ? r.friend_id : r.user_id
          );

          // Get profiles (public view: leaderboard-safe columns only)
          const { data: profiles } = await supabase
            .from('public_profiles')
            .select('id, username, avatar_image')
            .in('id', friendIds);

          // Get who already has active pacts
          const { data: activePacts } = await supabase
            .from('word_pacts')
            .select('player1_id, player2_id')
            .eq('active', true);

          const pactPlayerIds = new Set<string>();
          activePacts?.forEach((p) => {
            pactPlayerIds.add(p.player1_id);
            pactPlayerIds.add(p.player2_id);
          });

          const mapped: Friend[] = (profiles ?? []).map((p) => ({
            id: p.id,
            username: p.username ?? 'Unknown',
            avatar_image: p.avatar_image ?? null,
            hasActivePact: pactPlayerIds.has(p.id),
          }));

          setFriends(mapped);
        } catch {
          // Graceful degradation
        } finally {
          setLoading(false);
        }
      }

      fetchFriends();
    }, [user?.id]);

    const handleInvite = useCallback(
      async (friendId: string) => {
        await createPact(friendId);
        onClose();
      },
      [createPact, onClose]
    );

    return (
      <div
        data-testid="pact-friend-selector"
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
        onClick={onClose}
      >
        <div
          className={cn(
            'w-full max-w-sm mx-4 p-4 rounded-neo',
            'bg-neo-navy border-neo border-neo-pink shadow-hard',
            'flex flex-col gap-3'
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="font-neo-display text-lg text-neo-white">
              {t('wordPact.selectFriend')}
            </h3>
            <button
              data-testid="close-selector-btn"
              onClick={onClose}
              className="text-neo-white hover:text-neo-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Friend list */}
          {loading ? (
            <div className="text-center text-neo-white py-4">...</div>
          ) : friends.length === 0 ? (
            <p className="text-sm text-neo-white text-center py-4">
              {t('friendsActivity.empty')}
            </p>
          ) : (
            <ul className="flex flex-col gap-2 max-h-60 overflow-y-auto">
              {friends.map((friend) => (
                <li
                  key={friend.id}
                  data-testid={`friend-row-${friend.id}`}
                  className="flex items-center justify-between p-2 rounded-neo bg-neo-navy-dark/50"
                >
                  <span className="text-sm text-neo-white font-medium">
                    {friend.username}
                  </span>
                  {friend.hasActivePact ? (
                    <span
                      data-testid={`already-in-pact-${friend.id}`}
                      className="text-xs text-neo-white"
                    >
                      {t('wordPact.alreadyInPact')}
                    </span>
                  ) : (
                    <button
                      data-testid={`invite-btn-${friend.id}`}
                      onClick={() => handleInvite(friend.id)}
                      className={cn(
                        'flex items-center gap-1 px-3 py-1 rounded-neo text-sm font-bold',
                        'bg-neo-pink text-neo-white border-neo shadow-hard-sm',
                        'hover:shadow-hard-pressed active:translate-y-0.5'
                      )}
                    >
                      <UserPlus className="w-4 h-4" />
                      {t('wordPact.invite')}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  }
);
