'use client';

import React, { memo, useCallback, useState } from 'react';
import { m, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Crown, X, Pencil, Check } from 'lucide-react';
import Avatar from '../../../components/Avatar';
import { useSocket } from '../../../utils/SocketContext';
import { useLobbyEmotes } from '@/hooks/useLobbyEmotes';
import { cn } from '../../../lib/utils';
import { ConfirmationDialog } from '../../../components/ui/ConfirmationDialog';
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
  /** Optional element rendered on the right side of the header row (e.g., TV/projector toggle) */
  headerExtra?: React.ReactNode;
  /** Optional self-only controls rendered beneath the avatar grid (e.g., emote picker + avatar reward) */
  selfActions?: React.ReactNode;
  /** Usernames the server reports as lobby-ready (non-host). Shows check badges + a count. */
  readyUsernames?: string[];
}

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

/** No-motion variants for prefers-reduced-motion users — instant fade only,
 *  no scale/rotate/spring overshoot (audit UX-LOW). */
const reducedMotionVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0 } },
  exit: { opacity: 0, transition: { duration: 0 } },
};

export const PlayerRoster = memo(function PlayerRoster({ players, username, gameCode, maxPlayers, t, compact = false, onSelfAvatarClick, onSelfNameChange, canEditSelfName = false, headerExtra, selfActions, readyUsernames = [] }: PlayerRosterProps): React.ReactElement {
  const { socket } = useSocket();

  // Receive lobby emotes from players and render them on the roster avatars.
  // Host has no tray — the player waiting view owns sending.
  const { emotesByUsername } = useLobbyEmotes({ socket });

  // Ready lookups — bots auto-count as ready; host clicks Start (never "Ready").
  const readySet = new Set(readyUsernames);
  const rosterReadyEligible = players.filter((p) => {
    const o = typeof p === 'object' ? p : null;
    return !o?.isHost && !o?.isBot;
  }).length;
  const rosterReadyCount = players.filter((p) => {
    const o = typeof p === 'object' ? p : null;
    const nm = typeof p === 'string' ? p : p.username;
    // Match server `getPlayersReadyCount`: humans only, host + bots excluded.
    if (o?.isHost || o?.isBot) return false;
    return readySet.has(nm);
  }).length;
  const showReadyCount = rosterReadyEligible > 0;

  const [isEditingSelfName, setIsEditingSelfName] = useState(false);
  const [selfNameDraft, setSelfNameDraft] = useState(username);
  // { name, description } so the dialog text stays stable during exit animation
  // even after we clear the pending kick on cancel/confirm.
  const [pendingKick, setPendingKick] = useState<{ name: string; description: string } | null>(null);
  const prefersReducedMotion = useReducedMotion() ?? false;

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
    setPendingKick({
      name: targetUsername,
      description: t('hostView.kickConfirm', { name: targetUsername }),
    });
  }, [t]);

  const confirmKick = useCallback(() => {
    if (pendingKick) {
      socket?.emit('kickPlayer', { targetUsername: pendingKick.name });
    }
    setPendingKick(null);
  }, [pendingKick, socket]);

  const handleRemoveBot = useCallback((botUsername: string) => {
    socket?.emit('removeBot', { username: botUsername, gameCode });
  }, [socket, gameCode]);

  return (
    <section className={cn(compact ? 'space-y-1' : 'space-y-3', 'overflow-visible')}>
      {/* Header row — title left, optional extra (e.g. TV toggle) right */}
      <div className="flex items-center justify-between gap-2 px-1">
        <h2 className={cn('font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2', compact ? 'text-[10px]' : 'text-xs')}>
          {t('hostView.playersInRoom')}
          {showReadyCount ? (
            <span
              data-testid="roster-ready-count"
              className={cn(
                'inline-flex items-center gap-1 rounded-full border-2 border-neo-black px-1.5 py-0.5 font-black leading-none',
                compact ? 'text-[9px]' : 'text-[10px]',
                rosterReadyCount >= rosterReadyEligible ? 'bg-neo-lime text-neo-black' : 'bg-white/10 text-neo-cream',
              )}
            >
              <Check className={cn('stroke-[3]', compact ? 'w-2.5 h-2.5' : 'w-3 h-3')} />
              {rosterReadyCount}/{rosterReadyEligible} {t('hostView.playersReady')}
            </span>
          ) : null}
        </h2>
        {headerExtra ? <div className="shrink-0">{headerExtra}</div> : null}
      </div>

      {/* Player avatars grid — centered.
          pt-* reserves space for the host crown that's absolute-positioned at
          -top-4 above the avatar; without it the crown clips into whatever
          renders above (e.g. bot countdown banner) on short viewports. */}
      <div className={cn('flex flex-wrap items-end justify-center', compact ? 'gap-4 pt-4 pb-1' : 'gap-4 pt-5 pb-1')}>
        <AnimatePresence mode="popLayout">
          {players.map((player, index) => {
            const name = typeof player === 'string' ? player : player.username;
            const avatar = typeof player === 'object' ? player.avatar : null;
            const isHostPlayer = typeof player === 'object' ? player.isHost : false;
            const isBot = typeof player === 'object' ? player.isBot : false;
            const botDifficulty = (typeof player === 'object' ? player.botDifficulty : undefined) as BotDifficulty | undefined;
            const isMe = name === username;
            const diffConfig = botDifficulty ? DIFFICULTY_CONFIG[botDifficulty] : null;

            const variants = prefersReducedMotion
              ? reducedMotionVariants
              : (isBot ? botEntranceVariants : playerEntranceVariants);

            return (
              <m.div
                key={name}
                layout
                variants={variants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="shrink-0 flex flex-col items-center gap-1.5 group/player"
              >
                <div className="relative">
                  {/* Host crown — sized close to avatar so it doesn't dominate vertical headroom */}
                  {isHostPlayer && (
                    <div className={cn('absolute left-1/2 -translate-x-1/2 z-10 animate-crown-bounce', compact ? '-top-3' : '-top-3')}>
                      <Crown className={cn(compact ? 'w-4 h-4' : 'w-5 h-5', 'text-neo-yellow drop-shadow-[0_0_5px_rgba(255,225,53,0.6)]')} />
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
                      const tilePx = compact ? 56 : 64;
                      // Avatar handles full fallback chain (customAvatar → seeded-from-userId).
                      // Don't gate on hasAvatar: backend may emit legacy `{emoji,color}` shape
                      // (userManager.ts:144) which has no customAvatar — Avatar still renders
                      // a deterministic seeded face from `userId={name}`.
                      const tileInner = (
                        <div className={cn(
                          'rounded-full border-neo-black flex items-center justify-center overflow-hidden shadow-hard aspect-square',
                          compact ? 'w-14 h-14 border-[3px]' : 'w-16 h-16 border-[3px]',
                          compact
                            ? cn('ring-2 ring-offset-1 ring-offset-neo-navy', AVATAR_RING_COLORS[index % AVATAR_RING_COLORS.length])
                            : cn(
                                isMe && 'ring-2 ring-neo-lime ring-offset-1 ring-offset-neo-navy',
                                isHostPlayer && 'ring-2 ring-neo-yellow ring-offset-1 ring-offset-neo-navy',
                              ),
                        )}>
                          <Avatar
                            customAvatar={avatar?.customAvatar ?? undefined}
                            userId={name}
                            pixelSize={tilePx}
                            mode="multiplayer"
                            className="w-full h-full"
                            mood={emotesByUsername[name]?.emote}
                          />
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
                            <span className="absolute -bottom-0.5 -inset-e-0.5 w-5 h-5 rounded-full bg-neo-cyan border-2 border-neo-black shadow-hard-sm flex items-center justify-center">
                              <Pencil className="w-2.5 h-2.5 text-neo-black" />
                            </span>
                          </button>
                        );
                      }
                      return tileInner;
                    })()}
                    {/* Lobby emote = avatar FACE-SWAP only (eyes/brows/mouth via
                        the `mood` prop above). No floating emoji bubble — the face
                        is the whole signal, mirrored to every player in the room. */}
                  </div>

                  {/* Remove/kick button — always visible for bots, hover-only for humans */}
                  {!isMe && (
                    <m.button
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
                    </m.button>
                  )}

                  {/* Bot indicator — small emoji only */}
                  {isBot && diffConfig && (
                    <span className="absolute -bottom-1 -inset-e-1 text-sm" aria-label={t('hostView.bot')}>
                      {diffConfig.emoji}
                    </span>
                  )}

                  {/* Ready badge — non-host humans the server marked ready */}
                  {!isHostPlayer && !isBot && readySet.has(name) && (
                    <span
                      data-testid="roster-ready-badge"
                      className="absolute -bottom-1 -inset-e-1 w-5 h-5 rounded-full bg-neo-lime border-2 border-neo-black flex items-center justify-center shadow-hard-sm"
                      aria-label={t('playerView.readyConfirmed')}
                    >
                      <Check className="w-3 h-3 text-neo-black stroke-3" />
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
                        compact ? 'text-[11px] w-[68px]' : 'text-[11px] w-[72px]',
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
                      'font-bold text-center text-neo-cream flex items-center gap-1 justify-center leading-tight',
                      compact ? 'text-[11px] w-[68px]' : 'text-[11px] w-[72px]',
                      isMe && canEditSelfName ? 'hover:text-neo-cyan transition-colors cursor-text' : 'cursor-default',
                    )}
                    disabled={!(isMe && canEditSelfName)}
                  >
                    <span className="truncate min-w-0">{name}</span>
                    {isBot && <span className="text-sm shrink-0">🤖</span>}
                    {isMe && canEditSelfName && <Pencil className="w-2.5 h-2.5 shrink-0 opacity-60" />}
                  </button>
                )}
              </m.div>
            );
          })}
        </AnimatePresence>

        {/* Add bot button — sized to match avatar tile so the row stays compact and aligned */}
        {!isFull && (
          <div className="shrink-0 flex flex-col items-center gap-1.5">
            <m.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => handleAddBot('medium')}
              aria-label={t('hostView.addBot')}
              className={cn(
                'rounded-full border-[3px] border-dashed border-white/30 bg-white/5 flex items-center justify-center shadow-hard aspect-square',
                'hover:bg-white/10 hover:border-neo-cyan/60 transition-all group',
                compact ? 'w-14 h-14' : 'w-16 h-16'
              )}
            >
              <span className="text-2xl font-black text-white/60 group-hover:text-neo-cyan transition-colors leading-none">+</span>
            </m.button>
            <span className={cn('font-black uppercase tracking-tight text-white/50 leading-tight text-center', compact ? 'text-[10px] w-[68px]' : 'text-[11px] w-[72px]')}>
              {t('hostView.bot')}
            </span>
          </div>
        )}
      </div>

      {selfActions ? <div className="pt-1">{selfActions}</div> : null}

      <ConfirmationDialog
        open={pendingKick !== null}
        onOpenChange={(open) => { if (!open) setPendingKick(null); }}
        title={t('hostView.kickPlayer')}
        description={pendingKick?.description}
        confirmText={t('hostView.kickPlayer')}
        cancelText={t('common.cancel')}
        onConfirm={confirmKick}
        variant="danger"
      />
    </section>
  );
});
