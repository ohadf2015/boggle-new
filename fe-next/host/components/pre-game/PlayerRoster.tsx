'use client';

import React, { memo, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, X, Pencil, Check } from 'lucide-react';
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
  /** Fired when the self/host taps their avatar — open the avatar builder */
  onSelfAvatarClick?: () => void;
  /** Called with a trimmed new name when the self/host renames themselves */
  onSelfNameChange?: (newName: string) => void;
  /** Gate name editing (e.g., disallow for authenticated users with server-side names) */
  canEditSelfName?: boolean;
}

const AVATAR_COLORS = ['bg-neo-cyan', 'bg-neo-pink', 'bg-purple-400', 'bg-neo-lime', 'bg-neo-yellow', 'bg-orange-400', 'bg-teal-400', 'bg-rose-400'];
const AVATAR_RING_COLORS = ['ring-neo-cyan/40', 'ring-neo-pink/40', 'ring-purple-400/40', 'ring-neo-lime/40', 'ring-neo-yellow/40', 'ring-orange-400/40', 'ring-teal-400/40', 'ring-rose-400/40'];

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

export const PlayerRoster = memo(function PlayerRoster({ players, username, gameCode, maxPlayers, t, compact = false, onSelfAvatarClick, onSelfNameChange, canEditSelfName = false }: PlayerRosterProps): React.ReactElement {
  const { socket } = useSocket();

  const [isEditingSelfName, setIsEditingSelfName] = useState(false);
  const [selfNameDraft, setSelfNameDraft] = useState(username);

  const startSelfNameEdit = useCallback(() => {
    setSelfNameDraft(username);
    setIsEditingSelfName(true);
  }, [username]);

  const commitSelfNameEdit = useCallback(() => {
    const trimmed = selfNameDraft.trim();
    if (trimmed && trimmed !== username) onSelfNameChange?.(trimmed);
    setIsEditingSelfName(false);
  }, [selfNameDraft, username, onSelfNameChange]);

  const cancelSelfNameEdit = useCallback(() => {
    setIsEditingSelfName(false);
    setSelfNameDraft(username);
  }, [username]);

  const isFull = players.length >= maxPlayers;

  const handleAddBot = useCallback((difficulty: 'easy' | 'medium' | 'hard') => {
    socket?.emit('addBot', { difficulty, gameCode });
  }, [socket, gameCode]);

  const handleKick = useCallback((targetUsername: string) => {
    if (confirm(t('hostView.kickConfirm').replace('{{name}}', targetUsername))) {
      socket?.emit('kickPlayer', { targetUsername });
    }
  }, [socket, t]);

  const handleRemoveBot = useCallback((botUsername: string) => {
    socket?.emit('removeBot', { username: botUsername, gameCode });
  }, [socket, gameCode]);

  return (
    <section className={compact ? 'space-y-1' : 'space-y-3'}>
      {/* Header row */}
      <div className="flex items-center justify-between px-1">
        <h2 className={cn('font-bold uppercase tracking-widest text-slate-500', compact ? 'text-[10px]' : 'text-xs')}>
          {t('hostView.playersInRoom')}
        </h2>
      </div>

      {/* Player avatars grid — centered.
          pt-* reserves space for the host crown that's absolute-positioned at
          -top-4 above the avatar; without it the crown clips into whatever
          renders above (e.g. bot countdown banner) on short viewports. */}
      <div className={cn('flex flex-wrap items-end justify-center', compact ? 'gap-5 pt-5 pb-1' : 'gap-4 pt-6 pb-2')}>
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
                  {/* Host crown — larger, more prominent */}
                  {isHostPlayer && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10 animate-crown-bounce">
                      <Crown className={cn(compact ? 'w-5 h-5' : 'w-6 h-6', 'text-neo-yellow drop-shadow-[0_0_6px_rgba(255,225,53,0.6)]')} />
                    </div>
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

                    {(() => {
                      const tileInner = (
                        <div className={cn(
                          'box-content rounded-full border-neo-black flex items-center justify-center overflow-hidden shadow-hard',
                          compact ? 'w-16 h-16 border-4' : 'w-20 h-20 border-3',
                          AVATAR_COLORS[index % AVATAR_COLORS.length],
                          compact
                            ? cn('ring-4 ring-offset-2 ring-offset-neo-navy', AVATAR_RING_COLORS[index % AVATAR_RING_COLORS.length])
                            : cn(
                                isMe && 'ring-3 ring-neo-lime ring-offset-2 ring-offset-neo-navy',
                                isHostPlayer && 'ring-3 ring-neo-yellow ring-offset-2 ring-offset-neo-navy',
                              ),
                        )}>
                          {avatar?.customAvatar || avatar?.avatarImage ? (
                            <Avatar
                              customAvatar={avatar?.customAvatar ?? undefined}
                              avatarImage={avatar?.avatarImage}
                              size={compact ? 'lg' : 'xl'}
                            />
                          ) : (
                            <span className={cn('font-black text-neo-black', compact ? 'text-3xl' : 'text-4xl')}>
                              {name.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                      );
                      if (isMe && onSelfAvatarClick) {
                        return (
                          <button
                            type="button"
                            onClick={onSelfAvatarClick}
                            data-testid="self-edit-avatar-button"
                            className="relative transition-transform hover:scale-105 active:scale-95"
                            aria-label={t('playerView.editAvatar')}
                          >
                            {tileInner}
                            <span className="absolute -bottom-0.5 -inset-e-0.5 w-6 h-6 rounded-full bg-neo-cyan border-2 border-neo-black shadow-hard-sm flex items-center justify-center">
                              <Pencil className="w-3 h-3 text-neo-black" />
                            </span>
                          </button>
                        );
                      }
                      return tileInner;
                    })()}
                  </div>

                  {/* Remove/kick button — always visible for bots, hover-only for humans */}
                  {!isMe && (
                    <motion.button
                      initial={{ opacity: isBot ? 1 : 0, scale: isBot ? 1 : 0.5 }}
                      whileHover={{ scale: 1.2 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => isBot ? handleRemoveBot(name) : handleKick(name)}
                      className={cn(
                        'absolute -top-1 -inset-e-1 z-20 w-5 h-5 rounded-full bg-red-500 border-2 border-neo-black flex items-center justify-center transition-opacity shadow-hard-sm',
                        isBot ? 'opacity-100' : 'opacity-0 group-hover/player:opacity-100'
                      )}
                      aria-label={isBot ? t('hostView.removeBot') : t('hostView.kickPlayer')}
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

                {/* Name (inline editable for self) */}
                {isMe && isEditingSelfName ? (
                  <div className="flex items-center gap-1">
                    <input
                      data-testid="self-name-edit-input"
                      type="text"
                      value={selfNameDraft}
                      onChange={(e) => setSelfNameDraft(e.target.value)}
                      maxLength={20}
                      autoFocus
                      onBlur={commitSelfNameEdit}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitSelfNameEdit();
                        if (e.key === 'Escape') cancelSelfNameEdit();
                      }}
                      className={cn(
                        'bg-white/10 text-neo-cream border-2 border-neo-black rounded-neo px-1.5 py-0.5 text-center font-bold focus:outline-hidden focus:ring-2 focus:ring-neo-cyan',
                        compact ? 'text-[11px] w-16' : 'text-xs w-20',
                      )}
                    />
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={commitSelfNameEdit}
                      className="w-5 h-5 flex items-center justify-center bg-neo-lime border-2 border-neo-black rounded shadow-hard-sm"
                      aria-label={t('common.save')}
                    >
                      <Check className="w-2.5 h-2.5 text-neo-black" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={isMe && canEditSelfName ? startSelfNameEdit : undefined}
                    data-testid={isMe ? 'self-edit-name-button' : undefined}
                    className={cn(
                      'font-bold truncate text-center text-neo-cream flex items-center gap-1 justify-center',
                      compact ? 'text-[11px] w-16' : 'text-xs w-20',
                      isMe && canEditSelfName ? 'hover:text-neo-cyan transition-colors cursor-text' : 'cursor-default',
                    )}
                    disabled={!(isMe && canEditSelfName)}
                  >
                    <span className="truncate">{name}</span>
                    {isMe && canEditSelfName && <Pencil className="w-2.5 h-2.5 shrink-0 opacity-60" />}
                  </button>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Add bot button */}
        {!isFull && (
          <div className="shrink-0 flex flex-col items-center gap-2">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => handleAddBot('medium')}
              className={cn(
                'rounded-full border-4 border-dashed border-white/20 bg-white/5 flex items-center justify-center',
                'hover:bg-white/10 hover:border-neo-cyan/60 transition-all group',
                compact ? 'w-16 h-16' : 'w-20 h-20'
              )}
            >
              <div className="flex flex-col items-center">
                <span className="text-2xl text-white/60 group-hover:text-neo-cyan transition-colors">+</span>
                <span className="text-[8px] font-black uppercase tracking-tighter text-white/40 group-hover:text-neo-cyan/80 mt-0.5">
                  + BOT
                </span>
              </div>
            </motion.button>
          </div>
        )}
      </div>

    </section>
  );
});
