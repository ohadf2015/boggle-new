'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { LayoutList, RefreshCw } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import ArenaEmptyState from '@/components/multiplayer/ArenaEmptyState';
import { trackMpRoomJoinBlocked, trackMpRoomJoinClicked } from '@/utils/posthogEngagement';
import { cn } from '@/lib/utils';
import { ArenaRow, isRoomFull, isRoomLive, type ArenaRoom } from './ArenaRow';
import { EntrySheet } from './EntrySheet';
import './arenaList.css';

/** Rows shown before "+N more": phone / desktop+TV. CSS breakpoints decide, never JS (pitfall class 1). */
export const PHONE_ROW_CAP = 4;
export const DESKTOP_ROW_CAP = 8;

interface ArenaListProps {
  rooms: ArenaRoom[];
  loading: boolean;
  joiningRoomCode: string | null;
  onRoomClick: (room: ArenaRoom) => void;
  onRefresh: () => void;
  fetchTimedOut?: boolean;
  className?: string;
}

/** Joinable first (waiting, seats free), then live, then full; server order within each (stable sort). */
function rank(r: ArenaRoom): number {
  if (isRoomFull(r)) return 2;
  if (isRoomLive(r)) return 1;
  return 0;
}

/**
 * OPEN ARENAS (DESIGN §b.1). The list never extends the page: phone shows 4
 * rows, desktop/TV 8, and a "+N more" chip opens every room in an MpSheet.
 */
export function ArenaList({ rooms, loading, joiningRoomCode, onRoomClick, onRefresh, fetchTimedOut, className }: ArenaListProps) {
  const { t } = useLanguage();
  const [showAll, setShowAll] = useState(false);

  const sorted = useMemo(
    () => [...rooms].sort((a, b) => rank(a) - rank(b)),
    [rooms],
  );
  const online = useMemo(() => rooms.reduce((sum, r) => sum + (r.playerCount || 0), 0), [rooms]);
  const locked = joiningRoomCode != null;

  const pick = (room: ArenaRoom) => {
    if (locked) {
      trackMpRoomJoinBlocked({ gameMode: room.gameMode || 'classic' });
      return;
    }
    trackMpRoomJoinClicked({ gameMode: room.gameMode || 'classic' });
    setShowAll(false);
    onRoomClick(room);
  };

  const row = (room: ArenaRoom) => (
    <ArenaRow room={room} joining={joiningRoomCode === room.gameCode} locked={locked} onPick={pick} />
  );

  const phoneMore = sorted.length - PHONE_ROW_CAP;
  const desktopMore = sorted.length - DESKTOP_ROW_CAP;
  // A short list ends in a live tail line that fills the column (never a dead
  // band under two rows). It steps aside once the rows fill the breakpoint's cap,
  // and hides itself when too little height is left (arenaList.css).
  const showTail = desktopMore < 0;
  const moreChip =
    'inline-flex items-center gap-1 rounded-full border-2 border-neo-black bg-neo-yellow px-3 py-1 font-neo-display text-xs tv:text-lg font-bold uppercase text-neo-black shadow-hard-sm transition-transform hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-hard-pressed focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-lime';

  return (
    <section aria-busy={loading} className={cn('flex min-h-0 flex-col gap-2', className)}>
      <div className="flex items-center gap-2 px-0.5">
        <h2 className="font-neo-display text-sm tv:text-2xl font-bold uppercase tracking-[0.12em] text-neo-white">
          {t('mpUi.entry.openArenas')}
        </h2>
        {online > 0 && (
          <span
            data-testid="arena-online"
            className="inline-flex items-center gap-1.5 rounded-full border-2 border-neo-black bg-neo-navy-light px-2 py-0.5 text-[11px] tv:text-base font-bold text-neo-cyan"
          >
            <span aria-hidden="true" className="h-2 w-2 rounded-full bg-neo-lime" />
            {t('mpUi.entry.playingNow', { count: online })}
          </span>
        )}
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          aria-label={t('common.refresh')}
          className="ms-auto inline-flex h-9 w-9 tv:h-14 tv:w-14 items-center justify-center rounded-neo border-2 border-neo-black bg-neo-navy-light text-neo-white shadow-hard-sm transition-transform hover:rotate-90 active:translate-y-0.5 active:shadow-hard-pressed disabled:opacity-50 focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-lime"
        >
          <RefreshCw aria-hidden="true" className={cn('h-4 w-4', loading && 'animate-spin')} />
        </button>
      </div>

      {fetchTimedOut && !loading && rooms.length === 0 && (
        <div className="flex items-center justify-between gap-3 rounded-neo border-2 border-neo-red bg-neo-navy-light px-3 py-2">
          <p className="text-xs font-bold text-neo-white">{t('multiplayerFlow.roomList.fetchTimeout')}</p>
          <button
            type="button"
            onClick={onRefresh}
            className="rounded-neo border-2 border-neo-black bg-neo-red px-3 py-1 font-neo-display text-xs font-bold uppercase text-neo-black shadow-hard-sm"
          >
            {t('multiplayerFlow.roomList.retry')}
          </button>
        </div>
      )}

      {loading && rooms.length === 0 ? (
        <div data-testid="room-list-skeleton" aria-hidden="true" className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex h-[60px] items-center gap-3 rounded-neo border-2 border-neo-black border-s-[6px] border-s-neo-cyan/40 bg-neo-navy-light/50 px-3 motion-safe:animate-pulse">
              <div className="h-10 w-10 rounded-neo bg-neo-navy" />
              <div className="flex flex-1 flex-col gap-1.5">
                <div className="h-3 w-2/3 rounded bg-neo-navy" />
                <div className="h-2.5 w-1/3 rounded bg-neo-navy" />
              </div>
            </div>
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <ArenaEmptyState />
      ) : (
        <>
          <ul role="list" aria-label={t('multiplayerFlow.roomList.roomsListLabel')} className="flex min-h-0 flex-col gap-2 overflow-y-auto overscroll-contain p-0.5">
            {sorted.slice(0, DESKTOP_ROW_CAP).map((room, i) => (
              <li
                key={room.gameCode}
                className={cn('animate-mp-drop', i >= PHONE_ROW_CAP ? 'hidden lg:block' : 'block')}
              >
                {row(room)}
              </li>
            ))}
          </ul>
          {showTail && (
            <div
              data-testid="arena-list-tail"
              className={cn('mp-arena-tail min-h-0 flex-1', phoneMore >= 0 ? 'hidden lg:flex' : 'flex')}
            >
              <div className="mp-arena-tail-inner flex w-full flex-col items-center justify-center gap-2 rounded-neo-lg border-3 border-dashed border-neo-white/15 px-4 text-center">
                <Image
                  src="/mascot/waiting.webp"
                  alt=""
                  aria-hidden="true"
                  width={176}
                  height={176}
                  className="mp-arena-tail-img h-[clamp(64px,34cqh,176px)] w-auto object-contain motion-safe:animate-mp-bump"
                />
                <p className="font-neo-display text-sm lg:text-base tv:text-2xl font-bold text-neo-white/75">
                  {t('mpUi.entry.moreSoon')}
                </p>
              </div>
            </div>
          )}
          {(phoneMore > 0 || desktopMore > 0) && (
            <div className="flex justify-center">
              {phoneMore > 0 && (
                <button type="button" data-testid="arena-more-phone" onClick={() => setShowAll(true)} className={cn(moreChip, 'lg:hidden')}>
                  {t('mpUi.entry.moreArenas', { count: phoneMore })}
                </button>
              )}
              {desktopMore > 0 && (
                <button type="button" data-testid="arena-more-desktop" onClick={() => setShowAll(true)} className={cn(moreChip, 'hidden lg:inline-flex')}>
                  {t('mpUi.entry.moreArenas', { count: desktopMore })}
                </button>
              )}
            </div>
          )}
        </>
      )}

      <EntrySheet open={showAll} onClose={() => setShowAll(false)} title={t('mpUi.entry.allArenas')} icon={LayoutList} tone="cyan" testId="arena-all-sheet">
        <ul role="list" aria-label={t('mpUi.entry.allArenas')} className="flex flex-col gap-2 p-0.5">
          {sorted.map((room) => (
            <li key={room.gameCode}>{row(room)}</li>
          ))}
        </ul>
      </EntrySheet>
    </section>
  );
}
