'use client';

import React, { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Bot, X, UserPlus } from 'lucide-react';
import Avatar from '../../../components/Avatar';
import { useNativeShare } from '../../../hooks/useNativeShare';
import { getJoinUrl, copyJoinUrl } from '../../../utils/share';
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

export function PlayerRoster({ players, username, gameCode, maxPlayers, hostLabel, t }: PlayerRosterProps): React.ReactElement {
  const { socket } = useSocket();
  const { tryNativeShare } = useNativeShare();
  const [removingBot, setRemovingBot] = useState<string | null>(null);

  const isFull = players.length >= maxPlayers;

  const handleInvite = useCallback(async () => {
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

  const handleRemoveBot = useCallback((botUsername: string) => {
    setRemovingBot(botUsername);
    socket?.emit('removeBot', { username: botUsername, gameCode });
    setTimeout(() => setRemovingBot(null), 600);
  }, [socket, gameCode]);

  return (
    <section className="space-y-3">
      {/* Header row */}
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

      {/* Player avatars row */}
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide items-end">
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
                className={cn(
                  'flex-shrink-0 flex flex-col items-center gap-2 group/player',
                  removingBot === name && 'pointer-events-none'
                )}
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

                  {/* Avatar with floating animation */}
                  <motion.div
                    animate={{
                      y: [0, -4, 0],
                    }}
                    transition={{
                      y: { duration: isBot ? 2.5 : 3, repeat: Infinity, ease: 'easeInOut', delay: index * 0.2 },
                      scale: { duration: 0.4 },
                    }}
                    className="relative"
                  >
                    {/* Difficulty glow ring for bots */}
                    {isBot && diffConfig && (
                      <motion.div
                        className="absolute inset-0 rounded-full"
                        animate={{ opacity: [0.4, 0.8, 0.4] }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                        style={{ boxShadow: `0 0 12px 3px ${diffConfig.glowColor}` }}
                      />
                    )}

                    <div className={cn(
                      'w-16 h-16 rounded-full border-3 border-neo-black flex items-center justify-center overflow-hidden',
                      AVATAR_COLORS[index % AVATAR_COLORS.length],
                      isMe && 'ring-2 ring-neo-lime ring-offset-2 ring-offset-neo-navy',
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
                  </motion.div>

                  {/* Bot badge with difficulty color */}
                  {isBot && (
                    <>
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 600, damping: 15, delay: 0.2 }}
                        className={cn(
                          'absolute -bottom-1 -end-1 w-6 h-6 border-2 border-neo-black rounded-full flex items-center justify-center',
                          diffConfig ? diffConfig.bgColor : 'bg-neo-cyan'
                        )}
                      >
                        <Bot className="w-3.5 h-3.5 text-neo-black" />
                      </motion.div>

                      {/* Remove bot — appears on hover with bounce */}
                      <motion.button
                        onClick={() => handleRemoveBot(name)}
                        disabled={removingBot === name}
                        initial={{ scale: 0 }}
                        whileHover={{ scale: 1.2, rotate: 90 }}
                        whileTap={{ scale: 0.9 }}
                        className="absolute -top-1 -end-1 w-5 h-5 bg-neo-red border-2 border-neo-black rounded-full flex items-center justify-center opacity-0 group-hover/player:opacity-100 transition-opacity z-10"
                        aria-label={t('hostView.removeBot')}
                      >
                        <X className="w-3 h-3 text-neo-black" />
                      </motion.button>
                    </>
                  )}
                </div>

                {/* Name with difficulty emoji for bots */}
                <span className="text-[11px] font-bold truncate w-16 text-center text-neo-cream">
                  {isBot && diffConfig ? `${diffConfig.emoji} ` : ''}{name}
                </span>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Invite player */}
        {!isFull && (
          <motion.button
            onClick={handleInvite}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex-shrink-0 flex flex-col items-center gap-2 cursor-pointer group/invite"
            aria-label={t('hostView.invitePlayer')}
          >
            <div className="w-16 h-16 rounded-full border-2 border-dashed border-neo-pink/30 bg-white/5 flex items-center justify-center group-hover/invite:border-neo-pink/60 group-hover/invite:bg-white/10 transition-colors">
              <UserPlus className="w-5 h-5 text-neo-pink/50 group-hover/invite:text-neo-pink transition-colors" />
            </div>
            <span className="text-[11px] font-bold text-slate-600 uppercase group-hover/invite:text-slate-400 transition-colors">
              {t('share.invite')}
            </span>
          </motion.button>
        )}
      </div>

    </section>
  );
}
