'use client';

import React, { memo, useMemo } from 'react';
import { m, AnimatePresence } from 'framer-motion';
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
  /** TV mode enabled - when true, host is filtered from the list (they're spectating, not playing) */
  tvMode?: boolean;
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
export const EnhancedPlayerList = memo(function EnhancedPlayerList({
  players,
  currentUsername,
  t,
  className,
  tvMode = false,
}: EnhancedPlayerListProps): React.ReactElement {
  // Filter out host when TV mode is enabled (host is spectating, not playing)
  const filteredPlayers = useMemo(() => {
    if (!tvMode) return players;

    return players.filter(player => {
      const name = typeof player === 'string' ? player : player.username;
      const isHostPlayer = typeof player === 'object' ? player.isHost : false;

      // Filter out player if they are the host (by isHost flag OR by matching currentUsername)
      if (isHostPlayer || name === currentUsername) {
        return false;
      }
      return true;
    });
  }, [players, tvMode, currentUsername]);
  return (
    <div
      data-testid="enhanced-player-list"
      className={cn(
        'relative flex flex-col rounded-neo-lg border-4 border-neo-black bg-slate-800 shadow-hard overflow-hidden h-full',
        className
      )}
    >
      {/* Decorative top accent - slightly taller on desktop */}
      <div className="absolute top-0 left-0 right-0 h-1.5 xl:h-2 bg-linear-to-r from-neo-yellow via-neo-pink to-neo-purple" />

      {/* Header - larger on desktop */}
      <div className="flex items-center gap-2 xl:gap-3 px-4 py-3 xl:px-5 xl:py-4 border-b border-neo-black/30 shrink-0">
        <Users className="w-5 h-5 xl:w-6 xl:h-6 text-neo-pink" />
        <span className="text-sm xl:text-base font-black uppercase text-neo-cream">
          {t('hostView.playersJoined')} ({filteredPlayers.length})
        </span>
      </div>

      {/* Player List - responsive spacing */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain scrollable-area p-3 xl:p-4 space-y-2 xl:space-y-3">
        <AnimatePresence mode="popLayout">
          {filteredPlayers.map((player, index) => {
            const name = typeof player === 'string' ? player : player.username;
            const avatar = typeof player === 'object' ? player.avatar : null;
            const isHostPlayer = typeof player === 'object' ? player.isHost : false;
            const presence =
              typeof player === 'object' ? player.presenceStatus : ('active' as PresenceStatus);
            const isBot = typeof player === 'object' ? player.isBot : false;
            const isMe = name === currentUsername;

            return (
              <m.div
                key={name}
                data-testid={`player-card-${name}`}
                initial={{ opacity: 0, x: -20, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 20, scale: 0.9 }}
                transition={{ delay: index * 0.05, type: 'spring', stiffness: 200 }}
                className={cn(
                  // Responsive padding and gap for desktop
                  'flex items-center gap-3 xl:gap-4 p-3 xl:p-4 rounded-neo border-2 xl:border-3 transition-all',
                  isMe
                    ? 'bg-neo-lime/10 border-neo-lime/50'
                    : isBot
                      ? 'bg-neo-cyan/10 border-neo-cyan/30'
                      : 'bg-white/5 border-neo-black/30 hover:bg-white/10'
                )}
              >
                {/* Avatar - larger on desktop */}
                <div className="relative shrink-0">
                  <Avatar
                    customAvatar={avatar?.customAvatar ?? undefined}

                    avatarImage={avatar?.avatarImage}
                    size="md"
                    className="w-12 h-12 xl:w-14 xl:h-14"
                    mode="multiplayer"
                  />
                  {/* Online indicator dot - slightly larger on desktop */}
                  {!isBot && (
                    <div
                      className={cn(
                        'absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 xl:w-4 xl:h-4 rounded-full border-2 border-slate-800',
                        presence === 'active'
                          ? 'bg-neo-lime'
                          : presence === 'idle'
                            ? 'bg-neo-yellow'
                            : 'bg-neo-red'
                      )}
                    />
                  )}
                </div>

                {/* Player Info - larger text on desktop */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'font-bold truncate xl:text-lg',
                        isMe ? 'text-neo-lime' : 'text-neo-cream'
                      )}
                    >
                      {name}
                    </span>
                    {isMe && (
                      <span className="text-[10px] xl:text-xs px-1.5 xl:px-2 py-0.5 xl:py-1 rounded bg-neo-lime/20 text-neo-lime font-bold">
                        {t('playerView.me')}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 xl:mt-1">
                    {isHostPlayer && (
                      <div className="flex items-center gap-1 text-xs xl:text-sm text-neo-yellow">
                        <Crown className="w-3 h-3 xl:w-4 xl:h-4" />
                        <span className="font-bold uppercase">{t('hostView.host')}</span>
                      </div>
                    )}
                    {isBot && (
                      <div className="flex items-center gap-1 text-xs xl:text-sm text-neo-cyan">
                        <Bot className="w-3 h-3 xl:w-4 xl:h-4" />
                        <span className="font-bold uppercase">{t('common.bot')}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Presence Indicator for non-bots, non-self */}
                {!isMe && !isBot && (
                  <PresenceIndicator status={presence} size="md" />
                )}
              </m.div>
            );
          })}
        </AnimatePresence>

        {/* Empty State - larger on desktop */}
        {filteredPlayers.length === 0 && (
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-8 xl:py-12 text-center"
          >
            <Users className="w-12 h-12 xl:w-16 xl:h-16 text-neo-cream/20 mb-3 xl:mb-4" />
            <p className="text-sm xl:text-base text-neo-cream/50">
              {t('hostView.waitingForPlayers')}
            </p>
          </m.div>
        )}
      </div>
    </div>
  );
});

export default EnhancedPlayerList;
