'use client';

import React, { memo, useCallback, useState } from 'react';
import { Bot, Check, Crown, Pencil, Plus, X } from 'lucide-react';
import Avatar from '../../../components/Avatar';
import { useSocket } from '../../../utils/SocketContext';
import { useLobbyEmotes } from '@/hooks/useLobbyEmotes';
import { cn } from '../../../lib/utils';
import { ConfirmationDialog } from '../../../components/ui/ConfirmationDialog';
import { MAX_BOTS_PER_ROOM } from '@/shared/constants/gameConstants';
import { lobbySeats, readyTally, LOBBY_SEATS, type LobbyPlayerInput, type LobbySeat } from '@/components/multiplayer/lobby/lobbySeats';
import styles from '@/components/multiplayer/lobby/lobby.module.css';

type T = (path: string, params?: Record<string, string | number>) => string;

interface PlayerRosterProps {
  players: LobbyPlayerInput[];
  username: string;
  gameCode: string;
  maxPlayers: number;
  /** @deprecated the crown is the host label now. */
  hostLabel?: string;
  t: T;
  /** @deprecated seat size is responsive now. */
  compact?: boolean;
  /** Fired when I tap my own avatar — open the avatar builder. */
  onSelfAvatarClick?: () => void;
  /** Called with a trimmed new name when I rename myself. */
  onSelfNameChange?: (newName: string) => void;
  /** Gate name editing (authenticated names are server-owned). */
  canEditSelfName?: boolean;
  /** Rendered at the end of the header row (e.g. the TV/projector toggle). */
  headerExtra?: React.ReactNode;
  /** My own seat controls (the emote trigger), at the end of the header row. */
  selfActions?: React.ReactNode;
  /** Usernames the server reports as lobby-ready. */
  readyUsernames?: string[];
  /**
   * `host`: empty seats are "+ BOT" buttons, bots/players can be removed.
   * `guest`: read-only, empty seats say "Join".
   * `tv`: read-only projector seats at couch-distance size.
   */
  variant?: 'host' | 'guest' | 'tv';
  className?: string;
}

/** Seat size is one CSS var so the whole grid scales per breakpoint (and by --mp-u on TV). */
const SEAT_SIZE = {
  host: '[--seat:calc(64px*var(--mp-u,1))] tall:[--seat:calc(72px*var(--mp-u,1))] min-[720px]:[--seat:calc(84px*var(--mp-u,1))] desktop-tall:[--seat:calc(96px*var(--mp-u,1))]',
  guest: '[--seat:calc(64px*var(--mp-u,1))] tall:[--seat:calc(72px*var(--mp-u,1))] min-[720px]:[--seat:calc(84px*var(--mp-u,1))] desktop-tall:[--seat:calc(96px*var(--mp-u,1))]',
  tv: '[--seat:112px] desktop-tall:[--seat:128px] tv:[--seat:160px]',
} as const;

const AVATAR_PX = { host: 96, guest: 96, tv: 160 } as const;

const seatBox = { width: 'var(--seat)', height: 'var(--seat)' } as const;

/**
 * The lobby seat grid: 8 chairs, 4×2, for host, joiner and TV alike — every
 * seat comes from `lobbySeats` → `toMpRoster`, the one roster source. A join
 * pops a seat in, a ready player gets a lime check stamp, the host's empty
 * chairs are "+ BOT" buttons.
 */
export const PlayerRoster = memo(function PlayerRoster({
  players,
  username,
  gameCode,
  maxPlayers,
  t,
  onSelfAvatarClick,
  onSelfNameChange,
  canEditSelfName = false,
  headerExtra,
  selfActions,
  readyUsernames = [],
  variant = 'host',
  className,
}: PlayerRosterProps): React.ReactElement {
  const { socket } = useSocket();
  // Emotes face-swap the avatar for the whole room (server-echoed).
  const { emotesByUsername } = useLobbyEmotes({ socket });
  const seats = lobbySeats(players, username, readyUsernames);
  const tally = readyTally(seats);
  const isHostView = variant === 'host';
  const chairs = Math.min(maxPlayers, LOBBY_SEATS);
  const emptyCount = Math.max(0, chairs - seats.length);
  const botCount = seats.filter((s) => s.isBot).length;
  const canAddBot = isHostView && seats.length < chairs && botCount < MAX_BOTS_PER_ROOM;

  const [isEditingSelfName, setIsEditingSelfName] = useState(false);
  const [selfNameDraft, setSelfNameDraft] = useState(username);
  // { name, description } keeps the dialog text stable through its exit.
  const [pendingKick, setPendingKick] = useState<{ name: string; description: string } | null>(null);

  const commitSelfNameEdit = useCallback(() => {
    const trimmed = selfNameDraft.trim();
    if (trimmed && trimmed !== username) onSelfNameChange?.(trimmed);
    setIsEditingSelfName(false);
  }, [selfNameDraft, username, onSelfNameChange]);

  const addBot = useCallback(() => {
    socket?.emit('addBot', { difficulty: 'medium', gameCode });
  }, [socket, gameCode]);

  const removeSeat = useCallback((seat: LobbySeat) => {
    if (seat.isBot) {
      socket?.emit('removeBot', { username: seat.id, gameCode });
      return;
    }
    setPendingKick({ name: seat.id, description: t('hostView.kickConfirm', { name: seat.id }) });
  }, [socket, gameCode, t]);

  const confirmKick = useCallback(() => {
    if (pendingKick) socket?.emit('kickPlayer', { targetUsername: pendingKick.name });
    setPendingKick(null);
  }, [pendingKick, socket]);

  const renderSeat = (seat: LobbySeat) => {
    const isMe = seat.id === username;
    const face = (
      <span
        className={cn(
          'block rounded-full border-[3px] border-neo-black overflow-hidden bg-neo-navy-light shadow-hard-sm',
          isMe && 'outline-[3px] outline-solid outline-neo-lime outline-offset-2',
          seat.conn !== 'ok' && 'grayscale',
        )}
        style={seatBox}
      >
        <Avatar
          customAvatar={seat.avatar?.customAvatar ?? undefined}
          userId={seat.name}
          pixelSize={AVATAR_PX[variant]}
          mode="multiplayer"
          className="w-full h-full"
          mood={emotesByUsername[seat.name]?.emote}
        />
      </span>
    );
    return (
      <div
        key={seat.id}
        data-testid="lobby-seat"
        data-player={seat.id}
        data-me={String(isMe)}
        className={cn('group/seat relative flex flex-col items-center gap-1 min-w-0', styles.seatIn)}
      >
        <div className="relative shrink-0" style={seatBox}>
          {isMe && onSelfAvatarClick ? (
            <button
              type="button"
              onClick={onSelfAvatarClick}
              data-testid="self-edit-avatar-button"
              aria-label={t('playerView.editAvatar')}
              className="relative block rounded-full transition-transform hover:scale-105 active:scale-95"
            >
              {face}
              <span className="absolute -bottom-0.5 -start-0.5 w-6 h-6 rounded-full bg-neo-cyan border-2 border-neo-black shadow-hard-sm flex items-center justify-center">
                <Pencil aria-hidden="true" className="w-3 h-3 text-neo-black" />
              </span>
            </button>
          ) : face}
          {seat.isHost && (
            <Crown
              data-testid="lobby-seat-crown"
              aria-label={t('mpUi.shell.host')}
              className="absolute -top-4 start-1/2 -translate-x-1/2 rtl:translate-x-1/2 w-6 h-6 text-neo-yellow fill-neo-yellow stroke-neo-black stroke-[1.5]"
            />
          )}
          {seat.isBot && (
            <span
              aria-label={t('hostView.bot')}
              className="absolute -bottom-1 -start-1 w-6 h-6 rounded-full bg-neo-cyan border-2 border-neo-black flex items-center justify-center shadow-hard-sm"
            >
              <Bot aria-hidden="true" className="w-3.5 h-3.5 text-neo-black" />
            </span>
          )}
          {seat.isReady && (
            <span
              data-testid="roster-ready-badge"
              aria-label={t('playerView.readyConfirmed')}
              className={cn(
                'absolute -bottom-1 -end-1 w-7 h-7 rounded-full bg-neo-lime border-2 border-neo-black flex items-center justify-center shadow-hard-sm',
                styles.stamp,
              )}
            >
              <Check aria-hidden="true" className="w-4 h-4 text-neo-black stroke-[3.5]" />
            </span>
          )}
          {isHostView && !isMe && (
            <button
              type="button"
              onClick={() => removeSeat(seat)}
              aria-label={seat.isBot ? t('hostView.removeBot') : t('hostView.kickPlayer')}
              className={cn(
                'absolute -top-1 -end-1 z-10 w-6 h-6 rounded-full bg-neo-red border-2 border-neo-black flex items-center justify-center shadow-hard-sm transition-opacity',
                seat.isBot ? 'opacity-100' : 'opacity-0 group-hover/seat:opacity-100 focus-visible:opacity-100',
              )}
            >
              <X aria-hidden="true" className="w-3.5 h-3.5 text-neo-black stroke-[3]" />
            </button>
          )}
        </div>
        {isMe && isEditingSelfName ? (
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
              if (e.key === 'Escape') { setIsEditingSelfName(false); setSelfNameDraft(username); }
            }}
            className="w-full max-w-24 bg-neo-navy-light text-neo-white border-2 border-neo-lime rounded-neo px-1 py-0.5 text-center text-xs font-bold focus:outline-hidden"
          />
        ) : (
          <button
            type="button"
            data-testid={isMe ? 'self-edit-name-button' : undefined}
            disabled={!(isMe && canEditSelfName)}
            onClick={isMe && canEditSelfName ? () => { setSelfNameDraft(username); setIsEditingSelfName(true); } : undefined}
            className={cn(
              'max-w-full flex items-center justify-center gap-1 font-neo-body font-bold leading-tight disabled:cursor-default',
              variant === 'tv' ? 'text-lg tv:text-2xl' : 'text-xs desktop-tall:text-sm',
              isMe ? 'text-neo-lime' : 'text-neo-white',
            )}
          >
            <span dir="auto" className="truncate min-w-0">{seat.name}</span>
            {isMe && canEditSelfName && <Pencil aria-hidden="true" className="w-3 h-3 shrink-0 opacity-70" />}
          </button>
        )}
      </div>
    );
  };

  // Only the first empty chair shouts its label; the rest whisper it, so a
  // near-empty room reads as "one obvious next step", not seven.
  const renderEmptySeat = (i: number) => {
    const circle = (
      <span
        className={cn(
          'flex items-center justify-center rounded-full border-[3px] border-dashed',
          canAddBot ? 'border-neo-cyan/60 text-neo-cyan bg-neo-cyan/5' : 'border-neo-white/25 text-neo-white/40',
        )}
        style={seatBox}
      >
        <Plus aria-hidden="true" className={cn('w-1/3 h-1/3', styles.plus)} />
      </span>
    );
    const label = canAddBot ? t('hostView.bot') : t('common.join');
    const labelClass = cn(
      'font-neo-display font-bold uppercase tracking-wide leading-tight',
      variant === 'tv' ? 'text-lg' : 'text-[11px] desktop-tall:text-xs',
      canAddBot ? 'text-neo-cyan' : 'text-neo-white/40',
      i > 0 && 'opacity-40',
    );
    if (canAddBot) {
      return (
        <button
          key={`empty-${i}`}
          type="button"
          data-testid="lobby-seat-empty"
          onClick={addBot}
          aria-label={t('hostView.addBot')}
          className={cn('flex flex-col items-center gap-1 min-w-0 rounded-neo focus-visible:outline-2 focus-visible:outline-neo-cyan', styles.emptySeat)}
        >
          {circle}
          <span className={labelClass}>+ {label}</span>
        </button>
      );
    }
    return (
      <div key={`empty-${i}`} data-testid="lobby-seat-empty" className="flex flex-col items-center gap-1 min-w-0">
        {circle}
        <span className={labelClass}>{label}</span>
      </div>
    );
  };

  return (
    <section className={cn('relative flex flex-col gap-2 min-w-0', SEAT_SIZE[variant], className)}>
      <div className="flex items-center justify-between gap-2 min-h-11">
        <h2 className={cn('flex items-center gap-2 font-neo-display font-bold uppercase tracking-wider text-neo-white/80', variant === 'tv' ? 'text-2xl' : 'text-sm')}>
          <span>{t('mpUi.lobby.squad')}</span>
          <span className="tabular-nums text-neo-white" dir="ltr">{seats.length}/{chairs}</span>
          {tally.total > 0 && (
            <span
              data-testid="roster-ready-count"
              className={cn(
                'inline-flex items-center gap-1 rounded-full border-2 border-neo-black px-2 py-0.5 text-[11px] leading-none shadow-hard-sm normal-case tracking-normal',
                tally.allReady ? 'bg-neo-lime text-neo-black' : 'bg-neo-navy-light text-neo-white',
              )}
            >
              <Check aria-hidden="true" className="w-3 h-3 stroke-[3]" />
              {tally.ready}/{tally.total} {t('hostView.playersReady')}
            </span>
          )}
        </h2>
        {(selfActions || headerExtra) && (
          <div className="flex items-center gap-2 shrink-0">
            {selfActions}
            {headerExtra}
          </div>
        )}
      </div>
      <div className="grid grid-cols-4 justify-items-center gap-x-2 gap-y-3 pt-3">
        {seats.map(renderSeat)}
        {Array.from({ length: emptyCount }, (_, i) => renderEmptySeat(i))}
      </div>
      {isHostView && (
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
      )}
    </section>
  );
});
