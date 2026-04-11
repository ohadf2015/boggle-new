'use client';

import React, { memo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Bot, Minus, X } from 'lucide-react';
import Avatar from '../../../components/Avatar';
import { useSocket } from '../../../utils/SocketContext';
import { cn } from '../../../lib/utils';
import type { Avatar as AvatarType, PresenceStatus } from '@/shared/types/game';

interface PlayerData {
  username: string;
  avatar?: AvatarType | null;
  isHost?: boolean;
  presenceStatus?: PresenceStatus;
  isWindowFocused?: boolean;
  isBot?: boolean;
  botDifficulty?: string;
}

type BotDifficulty = 'easy' | 'medium' | 'hard';

interface PlayerRosterProps {
  players: (string | PlayerData)[];
  username: string;
  gameCode: string;
  maxPlayers: number;
  hostLabel?: string;
  t: (path: string, params?: Record<string, string | number>) => string;
  /** Compact layout with smaller avatars for mobile */
  compact?: boolean;
}

const AVATAR_COLORS = ['bg-neo-cyan', 'bg-neo-pink', 'bg-purple-400', 'bg-neo-lime', 'bg-neo-yellow', 'bg-orange-400', 'bg-teal-400', 'bg-rose-400'];

const DIFFICULTY_CONFIG: Record<BotDifficulty, {
  bgColor: string;
  glowColor: string;
  emoji: string;
}> = {
  easy: { bgColor: 'bg-neo-lime', glowColor: 'rgba(132, 255, 0, 0.4)', emoji: '🌱' },
  medium: { bgColor: 'bg-neo-yellow', glowColor: 'rgba(255, 225, 53, 0.4)', emoji: '🧠' },
  hard: { bgColor: 'bg-neo-orange', glowColor: 'rgba(255, 107, 53, 0.5)', emoji: '🔥' },
};

/** Bot entrance: drops in with overshoot bounce */
const botEntranceVariants = {
  initial: { scale: 0, opacity: 0, y: -30, rotate: -15 },
  animate: {
    scale: 1, opacity: 1, y: 0, rotate: 0,
    transition: { type: 'spring' as const, stiffness: 500, damping: 18, mass: 0.8 },
  },
  exit: {
    scale: 0, opacity: 0, rotate: 20, y: 15,
    transition: { duration: 0.25, ease: 'easeIn' as const },
  },
};

/** Human player entrance: simpler scale-in */
const playerEntranceVariants = {
  initial: { scale: 0.8, opacity: 0 },
  animate: {
    scale: 1, opacity: 1,
    transition: { type: 'spring' as const, stiffness: 400, damping: 25 },
  },
  exit: {
    scale: 0.8, opacity: 0,
    transition: { duration: 0.2 },
  },
};

export const PlayerRoster = memo(function PlayerRoster({ players, username, gameCode, maxPlayers, hostLabel, t, compact = false }: PlayerRosterProps): React.ReactElement {
  const { socket } = useSocket();

  const isFull = players.length >= maxPlayers;
  const bots = players.filter(p => typeof p === 'object' && p.isBot);
  const botCount = bots.length;

  const handleAddBot = useCallback((difficulty: 'easy' | 'medium' | 'hard') => {
    socket?.emit('addBot', { difficulty, gameCode });
  }, [socket, gameCode]);

  const handleKick = useCallback((targetUsername: string) => {
    if (confirm(t('hostView.kickConfirm').replace('{{name}}', targetUsername))) {
      socket?.emit('kickPlayer', { targetUsername });
    }
  }, [socket, t]);

  const handleRemoveLastBot = useCallback(() => {
    const lastBot = bots[bots.length - 1];
    if (lastBot && typeof lastBot === 'object') {
      socket?.emit('removeBot', { username: lastBot.username, gameCode });
    }
  }, [socket, gameCode, bots]);

  return (
    <section className={compact ? 'space-y-1' : 'space-y-3'}>
      {/* Header row */}
      <div className="flex items-center justify-between px-1">
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500">
          {t('hostView.playersInRoom')}
        </h2>
        {hostLabel && (
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            {hostLabel}
          </span>
        )}
      </div>

      {/* Player avatars row — centered */}
      <div className={cn('flex flex-wrap items-end justify-center', compact ? 'gap-2 pb-1' : 'gap-3 pb-2')}>
        <AnimatePresence mode="popLayout">
          {players.map((player, index) => {
            const name = typeof player === 'string' ? player : player.username;
            const avatar = typeof player === 'object' ? player.avatar : null;
            const isHostPlayer = typeof player === 'object' ? player.isHost : false;
            const isBot = typeof player === 'object' ? player.isBot : false;
            const botDifficulty = (typeof player === 'object' ? player.botDifficulty : undefined) as BotDifficulty | undefined;
            const isMe = name === username;
            const diffConfig = botDifficulty ? DIFFICULTY_CONFIG[botDifficulty] : null;

            const variants = isBot ? botEntranceVariants : playerEntranceVariants;

            return (
              <motion.div
                key={name}
                layout
                variants={variants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="shrink-0 flex flex-col items-center gap-2 group/player"
              >
                <div className="relative">
                  {/* Host crown with wobble */}
                  {isHostPlayer && (
                    <motion.div
                      className="absolute -top-3 left-1/2 -translate-x-1/2 z-10"
                      initial={{ y: -10, opacity: 0, rotate: -20 }}
                      animate={{ y: 0, opacity: 1, rotate: [0, 5, -5, 0] }}
                      transition={{ rotate: { duration: 2, repeat: Infinity, repeatDelay: 4 } }}
                    >
                      <Crown className="w-4 h-4 text-neo-yellow" />
                    </motion.div>
                  )}

                  {/* Avatar — CSS animation replaces JS-driven infinite motion */}
                  <div
                    className="relative animate-avatar-float"
                    style={{ animationDelay: `${index * 200}ms` }}
                  >
                    {/* Difficulty glow ring for bots */}
                    {isBot && diffConfig && (
                      <div
                        className="absolute inset-0 rounded-full animate-[pulse_2s_ease-in-out_infinite]"
                        style={{ boxShadow: `0 0 12px 3px ${diffConfig.glowColor}` }}
                      />
                    )}

                    <div className={cn(
                      'rounded-full border-neo-black flex items-center justify-center overflow-hidden',
                      compact ? 'w-14 h-14 border-2' : 'w-16 h-16 border-3',
                      AVATAR_COLORS[index % AVATAR_COLORS.length],
                      isMe && 'ring-2 ring-neo-lime ring-offset-2 ring-offset-neo-navy',
                    )}>
                      {avatar?.customAvatar || avatar?.avatarImage ? (
                        <Avatar
                          customAvatar={avatar?.customAvatar ?? undefined}
                          avatarImage={avatar?.avatarImage}
                          size={compact ? 'lg' : 'xl'}
                        />
                      ) : (
                        <span className={cn('font-black text-neo-black', compact ? 'text-2xl' : 'text-3xl')}>
                          {name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Kick button — visible on hover for non-self players */}
                  {!isMe && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.5 }}
                      whileHover={{ scale: 1.2 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleKick(name)}
                      className="absolute -top-1 -inset-e-1 z-20 w-5 h-5 rounded-full bg-red-500 border-2 border-neo-black flex items-center justify-center opacity-0 group-hover/player:opacity-100 transition-opacity shadow-hard-sm"
                      aria-label={t('hostView.kickPlayer')}
                    >
                      <X className="w-3 h-3 text-white stroke-3" />
                    </motion.button>
                  )}

                  {/* Bot indicator — small emoji only */}
                  {isBot && diffConfig && (
                    <span className="absolute -bottom-1 -inset-e-1 text-sm" aria-label={t('hostView.bot')}>
                      {diffConfig.emoji}
                    </span>
                  )}
                </div>

                {/* Name */}
                <span className={cn('font-bold truncate text-center text-neo-cream', compact ? 'text-[11px] w-14' : 'text-xs w-16')}>
                  {name}
                </span>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Add bot — inline difficulty chips */}
        {!isFull && (
          <div className="shrink-0 flex flex-col items-center gap-2">
            <div className="flex items-center gap-1">
              {([
                { key: 'easy' as const, label: 'EASY', color: 'bg-neo-lime text-neo-black border-neo-lime' },
                { key: 'medium' as const, label: 'MED', color: 'bg-neo-yellow text-neo-black border-neo-yellow' },
                { key: 'hard' as const, label: 'HARD', color: 'bg-neo-orange text-neo-black border-neo-orange' },
              ]).map((diff) => (
                <motion.button
                  key={diff.key}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleAddBot(diff.key)}
                  className={cn(
                    'px-2 py-1 rounded-neo border-2 text-[10px] font-black uppercase shadow-hard-sm hover:shadow-none transition-all',
                    diff.color
                  )}
                >
                  +{diff.label}
                </motion.button>
              ))}
              {botCount > 0 && (
                <motion.button
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleRemoveLastBot}
                  className="px-2 py-1 rounded-neo border-2 border-neo-red/50 text-[10px] font-black uppercase text-neo-red bg-neo-red/10 hover:bg-neo-red/20 transition-all"
                >
                  <Minus className="w-3 h-3" />
                </motion.button>
              )}
            </div>
            <span className="text-[10px] font-bold text-slate-600 uppercase flex items-center gap-1">
              <Bot className="w-3 h-3" />
              {t('hostView.addBot')}
            </span>
          </div>
        )}
      </div>

    </section>
  );
});
