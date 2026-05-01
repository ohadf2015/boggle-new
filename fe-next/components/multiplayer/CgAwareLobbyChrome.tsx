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
            onClick={() => matchmaking.joinQueue('classic', defaultLanguage)}
            disabled={matchmaking.status !== 'idle'}
            className="w-full rounded-neo border-neo bg-neo-pink px-4 py-3 font-neo-display text-neo-white shadow-hard-sm transition-transform active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed disabled:opacity-50"
          >
            ⚔️ {t('matchmaking.rankedMatch')}
          </button>
        </div>
      )}

      {/* UX-014: Room fetch timeout retry banner */}
      {roomFetchTimedOut && !roomsLoading && activeRooms.length === 0 && (
        <div className="mx-4 mb-3 p-3 bg-neo-red/20 border-2 border-neo-red rounded-neo flex items-center justify-between gap-3">
          <p className="text-sm font-bold text-neo-white">
            {t('multiplayerFlow.roomList.fetchTimeout')}
          </p>
          <button
            onClick={onRefreshRooms}
            className="text-sm font-black uppercase text-neo-red border-2 border-neo-red rounded-neo px-3 py-1 hover:bg-neo-red/30 transition-colors"
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
