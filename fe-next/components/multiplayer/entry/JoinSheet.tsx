'use client';

import { KeyRound, Users } from 'lucide-react';
import AvatarStack from '@/components/multiplayer/AvatarStack';
import { useLanguage } from '@/contexts/LanguageContext';
import { LANGUAGE_FLAGS } from '@/lib/languageConfig';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';
import { cn } from '@/lib/utils';
import { MpPrimaryCta } from '../shell/MpPrimaryCta';
import { arenaModeStyle } from './arenaModes';
import { isRoomFull } from './ArenaRow';
import { EntrySheet } from './EntrySheet';
import type { JoinTarget } from './joinTarget';
import { SheetIdentityRow } from './SheetIdentityRow';
import { useSheetIdentity } from './useSheetIdentity';

export interface JoinSheetProps {
  isOpen: boolean;
  onClose: () => void;
  /** Resolved from the live listing for every path that opens the sheet (entry/joinTarget). */
  room: JoinTarget | null;
  isJoining: boolean;
  onJoin: (username: string) => void;
  onSpectate?: (username: string) => void;
  isAuthenticated: boolean;
  displayName: string | null;
  profileAvatar?: CustomAvatarConfig | null;
}

const TICKET = 'flex items-center gap-3 rounded-neo border-2 border-neo-black border-s-[6px] bg-neo-navy p-3 shadow-hard-sm';
const TILE = 'flex h-12 w-12 shrink-0 items-center justify-center rounded-neo border-2 border-neo-black shadow-hard-sm';

/** A listed room: its mode, name, host, language, who is inside and the seats (bumps as they fill). */
function RoomTicket({ room }: { room: JoinTarget }) {
  const { t } = useLanguage();
  const mode = arenaModeStyle(room.gameMode);
  const Icon = mode.icon;
  const full = isRoomFull(room);
  const seats = `${room.playerCount || 0}${room.maxPlayers ? `/${room.maxPlayers}` : ''}`;

  return (
    <div data-testid="join-ticket" className={cn(TICKET, mode.stripe)}>
      <span className={cn(TILE, mode.tile)}>
        <Icon aria-hidden="true" className="h-6 w-6 text-neo-black" />
      </span>
      <div className="min-w-0 flex-1">
        <p dir="auto" className="truncate font-neo-display text-lg font-bold leading-tight text-neo-white">
          {room.roomName || room.gameCode}
        </p>
        <p className="mt-0.5 flex min-w-0 items-center gap-2 text-sm font-bold text-neo-white/85">
          <span className={cn('shrink-0 uppercase tracking-wide', mode.text)}>{t(mode.labelKey)}</span>
          <span aria-hidden="true" className="shrink-0">{LANGUAGE_FLAGS[room.language] || '🎮'}</span>
          {room.hostUsername && (
            <span dir="auto" className="min-w-0 truncate">{t('mpUi.entry.hostedBy', { name: room.hostUsername })}</span>
          )}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        {room.playerAvatars && room.playerAvatars.length > 0 && (
          <AvatarStack avatars={room.playerAvatars} totalCount={room.playerCount || 0} maxVisible={3} size="sm" />
        )}
        <span
          key={seats}
          data-testid="join-seats"
          className={cn(
            'flex items-center gap-1 font-neo-display text-base font-bold tabular-nums animate-mp-bump',
            full ? 'text-neo-red' : 'text-neo-cyan',
          )}
        >
          <Users aria-hidden="true" className="h-4 w-4" />
          {seats}
        </span>
      </div>
    </div>
  );
}

/** A code nobody lists (private, brand new, or mistyped): the code itself, nothing guessed. */
function CodeTicket({ code }: { code: string }) {
  const { t } = useLanguage();
  return (
    <div data-testid="join-ticket" className={cn(TICKET, 'border-s-neo-yellow')}>
      <span className={cn(TILE, 'bg-neo-yellow')}>
        <KeyRound aria-hidden="true" className="h-6 w-6 text-neo-black" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-neo-yellow">{t('mpUi.entry.codeTicket')}</p>
        <p dir="ltr" className="font-neo-display text-2xl font-bold uppercase leading-tight tracking-[0.2em] text-neo-white">
          {code}
        </p>
      </div>
    </div>
  );
}

/**
 * JOIN (DESIGN §b.2): shown only when the player has no complete profile yet
 * (a player with one joins on tap). A room ticket, the name prefilled from the
 * entry identity, and one JOIN — or WATCH when the room is full (capacity is
 * re-checked at tap time; the server seats a join to a full room as a
 * spectator, so WATCH is what the tap does even without `onSpectate`).
 */
export default function JoinSheet({
  isOpen,
  onClose,
  room,
  isJoining,
  onJoin,
  onSpectate,
  isAuthenticated,
  displayName,
  profileAvatar,
}: JoinSheetProps) {
  const { t } = useLanguage();
  const id = useSheetIdentity({ isOpen, isAuthenticated, displayName, profileAvatar, nameLanguage: room?.language });

  if (!room) return null;
  const full = !room.unlisted && isRoomFull(room);

  const join = () => {
    if (isJoining) return;
    const name = id.commit();
    if (!name) return;
    if (full && onSpectate) onSpectate(name);
    else onJoin(name);
  };

  return (
    <EntrySheet open={isOpen} onClose={onClose} title={t('mpUi.entry.joinTitle')} testId="join-sheet">
      {room.unlisted ? <CodeTicket code={room.gameCode} /> : <RoomTicket room={room} />}

      {full && <p className="text-center text-sm font-bold text-neo-white">{t('mpUi.entry.roomFullWatch')}</p>}

      <SheetIdentityRow id={id} onEnter={join} />

      <div data-entry-cta="">
        <MpPrimaryCta
          tone={full ? 'cyan' : 'pink'}
          testId="join-submit"
          label={full ? t('mpUi.entry.watch') : t('mpUi.entry.join')}
          onPress={join}
          loading={isJoining}
          className="shadow-hard-lg"
        />
      </div>
    </EntrySheet>
  );
}
