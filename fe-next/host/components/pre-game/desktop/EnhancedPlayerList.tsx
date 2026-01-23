'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Crown, Bot } from 'lucide-react';
import Avatar from '../../../../components/Avatar';
import PresenceIndicator from '../../../../components/PresenceIndicator';
import { cn } from '../../../../lib/utils';
import type { Avatar as AvatarType, PresenceStatus } from '@/shared/types/game';

// ==================== Types ====================

export interface PlayerData {
  username: string;
  avatar?: AvatarType | null;
  isHost?: boolean;
  presenceStatus?: PresenceStatus;
  isWindowFocused?: boolean;
  isBot?: boolean;
}

export interface EnhancedPlayerListProps {
  /** List of players (can be string or PlayerData) */
  players: (string | PlayerData)[];
  /** Current user's username */
  currentUsername: string;
  /** Translation function */
  t: (path: string, params?: Record<string, string | number>) => string;
  /** Additional className */
  className?: string;
}

// ==================== Component ====================

/**
 * Enhanced player list with avatar-centric cards
 *
 * Features:
 * - Large avatars with presence indicators
 * - Host and bot badges
 * - Animated entry/exit
 * - "You" indicator for current user
 */
export function EnhancedPlayerList({
  players,
  currentUsername,
  t,
  className,
}: EnhancedPlayerListProps): React.ReactElement {
  return (
    <div
      data-testid="enhanced-player-list"
      className={cn(
        'relative flex flex-col rounded-neo-lg border-4 border-neo-black bg-slate-800 shadow-hard overflow-hidden h-full',
        className
      )}
    >
      {/* Decorative top accent */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-neo-yellow via-neo-pink to-neo-purple" />

      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-neo-black/30 flex-shrink-0">
        <Users className="w-5 h-5 text-neo-pink" />
        <span className="text-sm font-black uppercase text-neo-cream">
          {t('hostView.playersJoined')} ({players.length})
        </span>
      </div>

      {/* Player List */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain scrollable-area p-3 space-y-2">
        <AnimatePresence mode="popLayout">
          {players.map((player, index) => {
            const name = typeof player === 'string' ? player : player.username;
            const avatar = typeof player === 'object' ? player.avatar : null;
            const isHostPlayer = typeof player === 'object' ? player.isHost : false;
            const presence =
              typeof player === 'object' ? player.presenceStatus : ('active' as PresenceStatus);
            const isBot = typeof player === 'object' ? player.isBot : false;
            const isMe = name === currentUsername;

            return (
              <motion.div
                key={name}
                data-testid={`player-card-${name}`}
                initial={{ opacity: 0, x: -20, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 20, scale: 0.9 }}
                transition={{ delay: index * 0.05, type: 'spring', stiffness: 200 }}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-neo border-2 transition-all',
                  isMe
                    ? 'bg-neo-lime/10 border-neo-lime/50'
                    : isBot
                      ? 'bg-neo-cyan/10 border-neo-cyan/30'
                      : 'bg-white/5 border-neo-black/30 hover:bg-white/10'
                )}
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <Avatar
                    profilePictureUrl={avatar?.profilePictureUrl ?? undefined}
                    avatarImage={avatar?.avatarImage}
                    size="md"
                    className="w-12 h-12"
                  />
                  {/* Online indicator dot */}
                  {!isBot && (
                    <div
                      className={cn(
                        'absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-slate-800',
                        presence === 'active'
                          ? 'bg-neo-lime'
                          : presence === 'idle'
                            ? 'bg-neo-yellow'
                            : 'bg-neo-red'
                      )}
                    />
                  )}
                </div>

                {/* Player Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'font-bold truncate',
                        isMe ? 'text-neo-lime' : 'text-neo-cream'
                      )}
                    >
                      {name}
                    </span>
                    {isMe && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-neo-lime/20 text-neo-lime font-bold">
                        {t('playerView.me') || 'YOU'}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {isHostPlayer && (
                      <div className="flex items-center gap-1 text-xs text-neo-yellow">
                        <Crown className="w-3 h-3" />
                        <span className="font-bold uppercase">{t('hostView.host') || 'Host'}</span>
                      </div>
                    )}
                    {isBot && (
                      <div className="flex items-center gap-1 text-xs text-neo-cyan">
                        <Bot className="w-3 h-3" />
                        <span className="font-bold uppercase">{t('common.bot') || 'Bot'}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Presence Indicator for non-bots, non-self */}
                {!isMe && !isBot && (
                  <PresenceIndicator status={presence} size="md" />
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Empty State */}
        {players.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-8 text-center"
          >
            <Users className="w-12 h-12 text-neo-cream/20 mb-3" />
            <p className="text-sm text-neo-cream/50">
              {t('hostView.waitingForPlayers') || 'Waiting for players...'}
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default EnhancedPlayerList;
