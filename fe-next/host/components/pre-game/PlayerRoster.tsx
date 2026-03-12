'use client';

import React, { useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Bot, Plus } from 'lucide-react';
import Avatar from '../../../components/Avatar';
import { useNativeShare } from '../../../hooks/useNativeShare';
import { getJoinUrl, copyJoinUrl } from '../../../utils/share';
import { cn } from '../../../lib/utils';
import type { Avatar as AvatarType, PresenceStatus } from '@/shared/types/game';

interface PlayerData {
  username: string;
  avatar?: AvatarType | null;
  isHost?: boolean;
  presenceStatus?: PresenceStatus;
  isWindowFocused?: boolean;
  isBot?: boolean;
}

interface PlayerRosterProps {
  players: (string | PlayerData)[];
  username: string;
  gameCode: string;
  maxPlayers: number;
  hostLabel?: string;
  t: (path: string, params?: Record<string, string | number>) => string;
}

const AVATAR_COLORS = ['bg-neo-cyan', 'bg-neo-pink', 'bg-purple-400', 'bg-neo-lime', 'bg-neo-yellow', 'bg-orange-400', 'bg-teal-400', 'bg-rose-400'];

export function PlayerRoster({ players, username, gameCode, maxPlayers, hostLabel, t }: PlayerRosterProps): React.ReactElement {
  const { tryNativeShare } = useNativeShare();
  const emptySlots = Math.max(0, Math.min(5, maxPlayers) - players.length);

  const handleEmptySlotClick = useCallback(async () => {
    const joinUrl = getJoinUrl(gameCode, 'lobby-slot');
    const shared = await tryNativeShare({
      title: t('share.inviteTitle'),
      text: `${t('share.inviteMessage')}\n${t('share.code')}: ${gameCode}`,
      url: joinUrl,
    });
    if (!shared) {
      copyJoinUrl(gameCode, t, 'lobby-slot');
    }
  }, [gameCode, t, tryNativeShare]);

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">
          {t('hostView.playersInRoom')}
        </h3>
        {hostLabel && (
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            {hostLabel}
          </span>
        )}
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
        <AnimatePresence>
          {players.map((player, index) => {
            const name = typeof player === 'string' ? player : player.username;
            const avatar = typeof player === 'object' ? player.avatar : null;
            const isHostPlayer = typeof player === 'object' ? player.isHost : false;
            const isBot = typeof player === 'object' ? player.isBot : false;
            const isMe = name === username;

            return (
              <motion.div
                key={name}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1, y: [0, -4, 0] }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{
                  y: { duration: 3, repeat: Infinity, ease: 'easeInOut', delay: index * 0.2 },
                }}
                className="flex-shrink-0 flex flex-col items-center gap-2"
              >
                <div className="relative">
                  {isHostPlayer && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Crown className="w-4 h-4 text-neo-yellow" />
                    </div>
                  )}
                  <div className={cn(
                    'w-16 h-16 rounded-full border-3 border-neo-black flex items-center justify-center overflow-hidden',
                    AVATAR_COLORS[index % AVATAR_COLORS.length],
                    isMe ? 'ring-2 ring-neo-lime ring-offset-2 ring-offset-neo-navy' : ''
                  )}>
                    {avatar?.customAvatar || avatar?.profilePictureUrl || avatar?.avatarImage ? (
                      <Avatar
                        customAvatar={avatar?.customAvatar ?? undefined}
                        profilePictureUrl={avatar?.profilePictureUrl ?? undefined}
                        avatarImage={avatar?.avatarImage}
                        size="md"
                      />
                    ) : (
                      <span className="text-2xl font-black text-neo-black">
                        {name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  {isBot && (
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-neo-cyan border-2 border-neo-black rounded-full flex items-center justify-center">
                      <Bot className="w-3 h-3 text-neo-black" />
                    </div>
                  )}
                </div>
                <span className="text-[11px] font-bold truncate w-16 text-center text-neo-cream">
                  {name}
                </span>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {Array.from({ length: emptySlots }).map((_, i) => (
          <button
            key={`empty-${i}`}
            onClick={handleEmptySlotClick}
            className="flex-shrink-0 flex flex-col items-center gap-2 pt-2 cursor-pointer group"
            aria-label={t('hostView.invitePlayer')}
          >
            <div className="w-16 h-16 rounded-full border-2 border-dashed border-neo-cyan/30 bg-white/5 flex items-center justify-center group-hover:border-neo-cyan/60 group-hover:bg-white/10 transition-colors">
              <Plus className="w-5 h-5 text-neo-cyan/50 group-hover:text-neo-cyan transition-colors" />
            </div>
            <span className="text-xs font-bold text-slate-600 uppercase group-hover:text-slate-400 transition-colors">
              {t('share.invite')}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
