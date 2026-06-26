'use client';

import React from 'react';
import RoomListView from './RoomListView';
import { useLanguage } from '@/contexts/LanguageContext';
import { useMatchmaking } from '@/hooks/useMatchmaking';
import type { Language, ActiveRoom } from '@/shared/types/game';

interface CgAwareLobbyChromeProps {
  isAdmin: boolean;
  defaultLanguage: Language;
  activeRooms: ActiveRoom[];
  roomsLoading: boolean;
  roomFetchTimedOut: boolean;
  joiningRoomCode: string | null;
  isJoining: boolean;
  onRefreshRooms: () => void;
  onRoomClick: (room: ActiveRoom) => void;
  onCreateRoom: () => void;
  onQuickPlay: () => void;
  matchmaking: ReturnType<typeof useMatchmaking>;
}

const CgAwareLobbyChrome: React.FC<CgAwareLobbyChromeProps> = ({
  isAdmin,
  defaultLanguage,
  activeRooms,
  roomsLoading,
  roomFetchTimedOut,
  joiningRoomCode,
  isJoining,
  onRefreshRooms,
  onRoomClick,
  onCreateRoom,
  onQuickPlay,
  matchmaking,
}) => {
  const { t } = useLanguage();

  return (
    <>
      {/* Season presence moved to homepage — SeasonHero on /. The MP lobby
          stays focused on rooms + matchmaking. */}
      {isAdmin && (
        <div className="px-4 pt-3">
          <button
            type="button"
            onClick={() => matchmaking.joinQueue('classic', defaultLanguage)}
            disabled={matchmaking.status !== 'idle'}
            className="w-full rounded-neo border-neo-thick border-black bg-neo-pink px-4 py-3 font-neo-display uppercase tracking-tight text-black shadow-hard transition-transform active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed disabled:opacity-50"
          >
            ⚔️ {t('matchmaking.rankedMatch')}
          </button>
        </div>
      )}

      {/* UX-014: Room fetch timeout retry banner */}
      {roomFetchTimedOut && !roomsLoading && activeRooms.length === 0 && (
        <div className="mx-4 mb-3 p-3 bg-neo-navy-light border-neo-thick border-neo-red rounded-neo shadow-hard-sm flex items-center justify-between gap-3">
          <p className="text-sm font-neo-body font-bold text-neo-white">
            {t('multiplayerFlow.roomList.fetchTimeout')}
          </p>
          <button
            type="button"
            onClick={onRefreshRooms}
            className="text-xs font-neo-display uppercase tracking-tight text-black bg-neo-red border-neo-thick border-black rounded-neo px-3 py-1.5 shadow-hard-sm active:shadow-hard-pressed active:translate-x-[1px] active:translate-y-[1px] transition-transform duration-100"
          >
            {t('multiplayerFlow.roomList.retry')}
          </button>
        </div>
      )}

      <RoomListView
        activeRooms={activeRooms}
        roomsLoading={roomsLoading}
        onRefreshRooms={onRefreshRooms}
        onRoomClick={onRoomClick}
        onCreateRoom={onCreateRoom}
        onQuickPlay={onQuickPlay}
        isQuickPlayLoading={!!joiningRoomCode || isJoining}
      />
    </>
  );
};

export default CgAwareLobbyChrome;
