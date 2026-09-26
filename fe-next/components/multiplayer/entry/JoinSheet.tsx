'use client';

import { Users } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { LANGUAGE_FLAGS } from '@/lib/languageConfig';
import type { ActiveRoom } from '@/shared/types/game';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';
import { cn } from '@/lib/utils';
import { MpSheet } from '../shell/MpSheet';
import { MpPrimaryCta } from '../shell/MpPrimaryCta';
import { arenaModeStyle } from './arenaModes';
import { isRoomFull } from './ArenaRow';
import { SheetIdentityRow } from './SheetIdentityRow';
import { useSheetIdentity } from './useSheetIdentity';
import { useSheetSide } from './useSheetSide';

export interface JoinSheetProps {
  isOpen: boolean;
  onClose: () => void;
  room: ActiveRoom | null;
  isJoining: boolean;
  onJoin: (username: string) => void;
  onSpectate?: (username: string) => void;
  isAuthenticated: boolean;
  displayName: string | null;
  profileAvatar?: CustomAvatarConfig | null;
}

/**
 * JOIN (DESIGN §b.2): shown only when the player has no complete profile yet
 * (a player with one joins on tap). A room ticket, the name prefilled from the
 * entry identity, and one JOIN — or WATCH when the room is full (capacity is
 * re-checked at tap time: a seat may have freed up while the sheet was open).
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
  const side = useSheetSide();
  const id = useSheetIdentity({ isOpen, isAuthenticated, displayName, profileAvatar, nameLanguage: room?.language });

  if (!room) return null;
  const full = isRoomFull(room);
  const mode = arenaModeStyle(room.gameMode);
  const Icon = mode.icon;
  const title = room.roomName || room.gameCode;

  const join = () => {
    if (isJoining) return;
    const name = id.commit();
    if (!name) return;
    if (isRoomFull(room) && onSpectate) onSpectate(name);
    else onJoin(name);
  };

  return (
    <MpSheet open={isOpen} onClose={onClose} title={t('mpUi.entry.joinTitle')} side={side} testId="join-sheet">
      <div className="flex flex-col gap-4">
        <div
          data-testid="join-ticket"
          className={cn('flex items-center gap-3 rounded-neo border-2 border-neo-black border-s-[6px] bg-neo-navy p-3 shadow-hard-sm', mode.stripe)}
        >
          <span className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-neo border-2 border-neo-black', mode.tile)}>
            <Icon aria-hidden="true" className="h-6 w-6 text-neo-black" />
          </span>
          <div className="min-w-0 flex-1">
            <p dir="auto" className="truncate font-neo-display text-lg font-bold text-neo-white">{title}</p>
            <p className="flex items-center gap-2 text-sm font-bold text-neo-white/85">
              <span aria-hidden="true">{LANGUAGE_FLAGS[room.language] || '🎮'}</span>
              <span className={cn('flex items-center gap-1 tabular-nums', full ? 'text-neo-red' : 'text-neo-cyan')}>
                <Users aria-hidden="true" className="h-4 w-4" />
                {room.playerCount || 0}
                {room.maxPlayers ? `/${room.maxPlayers}` : ''}
              </span>
            </p>
          </div>
        </div>

        {full && <p className="text-center text-sm font-bold text-neo-white">{t('mpUi.entry.roomFullWatch')}</p>}

        <SheetIdentityRow id={id} onEnter={join} />

        <MpPrimaryCta
          tone={full ? 'cyan' : 'pink'}
          testId="join-submit"
          label={full ? t('mpUi.entry.watch') : t('mpUi.entry.join')}
          onPress={join}
          loading={isJoining}
          className="shadow-hard-lg"
        />
      </div>
    </MpSheet>
  );
}
