'use client';

import React, { type ReactNode } from 'react';
import { Plus } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import CrazyGamesFriendsStrip from '@/components/multiplayer/CrazyGamesFriendsStrip';
import type { ActiveRoom } from '@/shared/types/game';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';
import { EntryIdentity } from './entry/EntryIdentity';
import { CodeEntry } from './entry/CodeEntry';
import { ArenaList } from './entry/ArenaList';

export interface RoomListViewProps {
  activeRooms: ActiveRoom[];
  roomsLoading: boolean;
  onRefreshRooms: () => void;
  onRoomClick: (room: ActiveRoom) => void;
  onCreateRoom: () => void;
  onQuickPlay?: () => void;
  isQuickPlayLoading?: boolean;
  joiningRoomCode?: string | null;
  /** JOIN BY CODE — the same join path an invite link takes. */
  onJoinCode?: (code: string) => void;
  /** A join (code / quick play / room) is in flight. */
  isJoining?: boolean;
  roomFetchTimedOut?: boolean;
  isAuthenticated?: boolean;
  displayName?: string;
  profileAvatar?: CustomAvatarConfig | null;
  /** Admin-only ranked queue control. */
  rankedSlot?: ReactNode;
}

/**
 * The MP entry body (DESIGN §b.1) — one screen, zero page scroll.
 * Phone: identity → join by code → open arenas (4 rows + "+N more").
 * Desktop/TV: left column identity, code and CREATE; right column arenas (8 rows).
 * QUICK START lives in the MpScreen footer (ArenaCTAStrip). The module path is
 * kept because the MultiplayerFlow.* guard tests mock it.
 */
const RoomListView: React.FC<RoomListViewProps> = ({
  activeRooms,
  roomsLoading,
  onRefreshRooms,
  onRoomClick,
  onCreateRoom,
  joiningRoomCode = null,
  onJoinCode,
  isJoining = false,
  roomFetchTimedOut = false,
  isAuthenticated = false,
  displayName = '',
  profileAvatar = null,
  rankedSlot,
}) => {
  const { t, dir } = useLanguage();

  return (
    <div
      dir={dir}
      data-testid="entry-body"
      className="mx-auto flex h-full min-h-0 w-full max-w-6xl tv:max-w-[1640px] flex-col gap-3 px-4 py-3 lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-8 lg:px-8 lg:py-6 desktop-short:py-3 tv:gap-12"
    >
      <div className="flex shrink-0 flex-col gap-3 lg:min-h-0 lg:gap-4 lg:justify-center desktop-short:gap-3">
        <EntryIdentity isAuthenticated={isAuthenticated} displayName={displayName} profileAvatar={profileAvatar} />
        {onJoinCode && <CodeEntry onSubmit={onJoinCode} busy={isJoining && !joiningRoomCode} />}
        <button
          type="button"
          data-testid="entry-create-side"
          onClick={onCreateRoom}
          className="hidden lg:flex items-center justify-center gap-2 h-[calc(64px*var(--mp-u,1))] rounded-neo-lg border-3 border-neo-pink bg-neo-navy-light px-4 font-neo-display text-lg tv:text-2xl font-bold uppercase text-neo-pink shadow-hard transition-transform duration-100 hover:-translate-y-0.5 hover:shadow-hard-lg active:translate-y-0.5 active:shadow-hard-pressed focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-lime"
        >
          <Plus aria-hidden="true" className="h-5 w-5" />
          {t('mpUi.entry.create')}
        </button>
        <CrazyGamesFriendsStrip />
        {rankedSlot}
      </div>

      <ArenaList
        className="flex-1 lg:h-full"
        rooms={activeRooms}
        loading={roomsLoading}
        joiningRoomCode={joiningRoomCode}
        onRoomClick={onRoomClick}
        onRefresh={onRefreshRooms}
        fetchTimedOut={roomFetchTimedOut}
      />
    </div>
  );
};

export default RoomListView;
