'use client';

import React, { memo, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Bot, Plus, Minus, Sparkles, Brain, Zap, X } from 'lucide-react';
import Avatar from '../../../components/Avatar';
import { useSocket } from '../../../utils/SocketContext';
import { useLanguage } from '../../../contexts/LanguageContext';
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
  const { language } = useLanguage();
  const isRTL = language === 'he';
  const [showBotPicker, setShowBotPicker] = useState(false);

  const isFull = players.length >= maxPlayers;
  const bots = players.filter(p => typeof p === 'object' && p.isBot);
  const botCount = bots.length;

  const handleAddBot = useCallback((difficulty: 'easy' | 'medium' | 'hard') => {
    socket?.emit('addBot', { difficulty, gameCode });
    setShowBotPicker(false);
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

      {/* Player avatars row */}
      <div className={cn('flex flex-wrap items-end', compact ? 'gap-2 pb-1' : 'gap-3 pb-2')}>
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

        {/* Add players section */}
        {!isFull && (
          <div className="shrink-0 flex flex-col items-center gap-2">
            {/* Bot buttons row */}
            <div className="flex items-center gap-1.5">
              {/* Add bot */}
              <div className="relative">
                <motion.button
                  onClick={() => setShowBotPicker(prev => !prev)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={cn(
                    'w-9 h-9 rounded-full border-2 border-dashed bg-white/5 flex items-center justify-center transition-colors',
                    showBotPicker ? 'border-neo-cyan/60 bg-white/10' : 'border-neo-cyan/30 hover:border-neo-cyan/60 hover:bg-white/10'
                  )}
                  aria-label={t('hostView.addBot')}
                >
                  <div className="relative">
                    <Bot className="w-4 h-4 text-neo-cyan/50" />
                    <Plus className="w-2.5 h-2.5 text-neo-cyan/70 absolute -bottom-0.5 -inset-e-1 stroke-3" />
                  </div>
                </motion.button>

                {/* Bot difficulty picker */}
                <AnimatePresence>
                  {showBotPicker && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.85, y: -5 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.85, y: -5 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                      className="absolute top-full inset-s-1/2 -translate-x-1/2 mt-2 z-50 bg-neo-navy-light border-3 border-neo-black rounded-neo shadow-hard p-2 flex flex-col gap-1 min-w-[140px]"
                    >
                      {([
                        { key: 'easy' as const, icon: Sparkles, color: 'text-neo-lime', bg: 'bg-neo-lime', emoji: '🌱' },
                        { key: 'medium' as const, icon: Brain, color: 'text-neo-yellow', bg: 'bg-neo-yellow', emoji: '🧠' },
                        { key: 'hard' as const, icon: Zap, color: 'text-neo-orange', bg: 'bg-neo-orange', emoji: '🔥' },
                      ]).map((diff, i) => (
                        <motion.button
                          key={diff.key}
                          initial={{ opacity: 0, x: isRTL ? 12 : -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.06, type: 'spring', stiffness: 500, damping: 25 }}
                          whileHover={{ x: isRTL ? -4 : 4, backgroundColor: 'rgba(255,255,255,0.1)' }}
                          whileTap={{ scale: 0.96 }}
                          onClick={() => handleAddBot(diff.key)}
                          className="flex items-center gap-2 px-2 py-2 rounded-md text-start transition-colors"
                        >
                          <div className={cn('w-6 h-6 rounded-full flex items-center justify-center border-2 border-neo-black shadow-hard-sm', diff.bg)}>
                            <diff.icon className="w-3.5 h-3.5 text-neo-black" />
                          </div>
                          <span className={cn('text-xs font-bold uppercase', diff.color)}>
                            {t(`hostView.bot${diff.key.charAt(0).toUpperCase() + diff.key.slice(1)}`)}
                          </span>
                        </motion.button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Remove last bot */}
              {botCount > 0 && (
                <motion.button
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  onClick={handleRemoveLastBot}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-9 h-9 rounded-full border-2 border-dashed border-neo-orange/30 bg-white/5 flex items-center justify-center hover:border-neo-orange/60 hover:bg-white/10 transition-colors"
                  aria-label={t('hostView.removeBot')}
                >
                  <div className="relative">
                    <Bot className="w-4 h-4 text-neo-orange/50" />
                    <Minus className="w-2.5 h-2.5 text-neo-orange/70 absolute -bottom-0.5 -inset-e-1 stroke-3" />
                  </div>
                </motion.button>
              )}
            </div>
            <span className="text-[10px] font-bold text-slate-600 uppercase">
              {t('hostView.addBot')}
            </span>
          </div>
        )}
      </div>

    </section>
  );
});
