'use client';

import { memo, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { ChevronRight, Loader2, Users } from 'lucide-react';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import AvatarStack from '@/components/multiplayer/AvatarStack';
import { useLanguage } from '@/contexts/LanguageContext';
import { LANGUAGE_FLAGS } from '@/lib/languageConfig';
import type { ActiveRoom } from '@/shared/types/game';
import { cn } from '@/lib/utils';
import { arenaModeStyle } from './arenaModes';

/** The lobby payload also carries the host (backend getActiveRooms). */
export type ArenaRoom = ActiveRoom & { hostUsername?: string };

export const isRoomFull = (r: ActiveRoom) => !!r.maxPlayers && r.playerCount >= r.maxPlayers;
export const isRoomLive = (r: ActiveRoom) => r.gameState === 'in-progress';

interface ArenaRowProps {
  room: ArenaRoom;
  joining: boolean;
  locked: boolean;
  onPick: (room: ArenaRoom) => void;
}

/** Arrow keys walk the rows; rows hidden at this breakpoint cannot take focus and are skipped. */
function moveFocus(e: KeyboardEvent<HTMLButtonElement>, step: 1 | -1) {
  const buttons = Array.from(
    e.currentTarget.closest('[role="list"]')?.querySelectorAll<HTMLButtonElement>('button[data-code]') ?? [],
  );
  for (let i = buttons.indexOf(e.currentTarget) + step; i >= 0 && i < buttons.length; i += step) {
    buttons[i].focus();
    if (document.activeElement === buttons[i]) {
      e.preventDefault();
      return;
    }
  }
}

/** How many times `value` has changed since mount (0 on first paint). */
function useChangeCount(value: unknown): number {
  const [count, setCount] = useState(0);
  const last = useRef(value);
  useEffect(() => {
    if (Object.is(last.current, value)) return;
    last.current = value;
    setCount((c) => c + 1);
  }, [value]);
  return count;
}

/**
 * One open arena: mode stripe + icon, the room title in its own direction (never
 * upper-cased — the name is the host's, not ours), the host on its own line,
 * language, seats and a live/full pill. Press = lift → push (transform only).
 */
export const ArenaRow = memo(function ArenaRow({ room, joining, locked, onPick }: ArenaRowProps) {
  const { t } = useLanguage();
  const mode = arenaModeStyle(room.gameMode);
  const Icon = mode.icon;
  const full = isRoomFull(room);
  const live = isRoomLive(room);
  const title = room.roomName || room.gameCode;
  // Seats bump when they change live (someone joined or left) — never on first paint.
  const seatsBump = useChangeCount(room.playerCount);

  return (
    <button
      type="button"
      data-code={room.gameCode}
      aria-label={t('multiplayerFlow.roomList.joinRoomAction', { roomName: title })}
      aria-busy={joining}
      disabled={locked}
      onClick={() => onPick(room)}
      onKeyDown={(e) => {
        if (e.key === 'ArrowDown') moveFocus(e, 1);
        else if (e.key === 'ArrowUp') moveFocus(e, -1);
      }}
      className={cn(
        'group relative flex w-full items-center gap-3 tv:gap-4 rounded-neo border-2 border-neo-black border-s-[6px] bg-neo-navy-light px-3 py-2 tv:px-4 tv:py-3 text-start shadow-hard-sm',
        'transition-transform duration-100 hover:-translate-y-0.5 hover:shadow-hard active:translate-y-0.5 active:shadow-hard-pressed',
        'focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-lime disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0',
        mode.stripe,
      )}
    >
      <span className={cn('flex h-10 w-10 tv:h-12 tv:w-12 shrink-0 items-center justify-center rounded-neo border-2 border-neo-black shadow-hard-sm', mode.tile)}>
        {joining ? (
          <Loader2 data-testid="room-join-spinner" aria-hidden="true" className="h-5 w-5 animate-spin text-neo-black" />
        ) : (
          <Icon aria-hidden="true" className="h-5 w-5 tv:h-7 tv:w-7 text-neo-black transition-transform group-hover:-rotate-12" />
        )}
      </span>

      <span className="min-w-0 flex-1 tv:flex tv:items-center tv:gap-6">
        <span className="flex min-w-0 items-center gap-2">
          <span dir="auto" className="truncate font-neo-display text-base tv:text-2xl font-bold leading-tight text-neo-white">
            {title}
          </span>
          {live && (
            <span className="shrink-0 rounded-full border-2 border-neo-black bg-neo-lime px-1.5 text-[10px] tv:text-sm font-bold uppercase text-neo-black">
              {t('mpUi.entry.live')}
            </span>
          )}
          {full && (
            <span className="shrink-0 rounded-full border-2 border-neo-black bg-neo-red px-1.5 text-[10px] tv:text-sm font-bold uppercase text-neo-black">
              {t('mpUi.entry.full')}
            </span>
          )}
        </span>
        <span className="mt-0.5 tv:mt-0 flex min-w-0 items-center gap-2 text-xs tv:text-lg text-neo-white/85">
          <span className={cn('font-bold uppercase tracking-wide', mode.text)}>{t(mode.labelKey)}</span>
          <span aria-hidden="true">{LANGUAGE_FLAGS[room.language] || '🎮'}</span>
          {room.hostUsername && (
            <span dir="auto" className="min-w-0 truncate">{t('mpUi.entry.hostedBy', { name: room.hostUsername })}</span>
          )}
        </span>
      </span>

      <span className="flex shrink-0 items-center gap-2">
        {room.playerAvatars && room.playerAvatars.length > 0 ? (
          <span className="hidden sm:block">
            <AvatarStack avatars={room.playerAvatars} totalCount={room.playerCount || 0} maxVisible={3} size="sm" />
          </span>
        ) : null}
        <span
          key={seatsBump}
          data-testid="arena-row-seats"
          className={cn(
            'flex items-center gap-1 font-neo-display text-sm tv:text-xl font-bold tabular-nums',
            full ? 'text-neo-red' : 'text-neo-white',
            seatsBump > 0 && 'animate-mp-bump',
          )}
        >
          <Users aria-hidden="true" className="h-3.5 w-3.5" />
          {room.playerCount || 0}
          {room.maxPlayers ? `/${room.maxPlayers}` : ''}
        </span>
        <DirectionalIcon icon={ChevronRight} className="h-4 w-4 text-neo-white/70 transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" />
      </span>
    </button>
  );
});
