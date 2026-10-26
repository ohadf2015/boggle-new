'use client';

import { Users } from 'lucide-react';
import { NeoNote } from '@/components/ui/note';
import { MAX_PLAYERS_PER_ROOM } from '@/shared/constants/gameConstants';
import type { Translate } from './eduLiveStyles';

interface EduRoomFullNoticeProps {
  players: ReadonlyArray<{ isHost?: boolean; isBot?: boolean }>;
  watching: number;
  t: Translate;
}

export function EduRoomFullNotice({ players, watching, t }: EduRoomFullNoticeProps) {
  if (watching <= 0) return null;
  const seated = players.filter((p) => !p.isHost && !p.isBot).length;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-2 z-[70] flex justify-center px-4">
      <NeoNote
        tone="alert"
        role="status"
        aria-live="polite"
        data-testid="edu-room-full-notice"
        className="pointer-events-auto flex max-w-xl items-center gap-3 bg-neo-navy text-neo-cream shadow-hard"
      >
        <Users className="size-5 shrink-0 text-neo-pink-light" aria-hidden="true" />
        <p className="font-neo-body text-sm font-bold leading-snug md:text-base">
          <span className="block font-neo-display font-black">{t('eduLiveRoom.lobby.roomFull', { seated, max: MAX_PLAYERS_PER_ROOM })}</span>
          <span className="block text-neo-cream/80">{t('eduLiveRoom.lobby.roomFullWatching', { count: watching })}</span>
        </p>
      </NeoNote>
    </div>
  );
}

export default EduRoomFullNotice;
