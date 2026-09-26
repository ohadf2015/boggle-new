'use client';

import React, { type ReactNode } from 'react';
// Legacy module paths on purpose: the MultiplayerFlow.* guard tests mock
// './RoomListView', './JoinRoomModal' and './CreateRoomModal' (they re-export
// the entry's CreateSheet / JoinSheet).
import RoomListView from './RoomListView';
import JoinRoomModal from './JoinRoomModal';
import CreateRoomModal from './CreateRoomModal';
import CgLobbyHero from './CgLobbyHero';
import ArenaCTAStrip from './ArenaCTAStrip';
import type { Language, ActiveRoom } from '@/shared/types/game';
import { getStoredUsername } from '@/utils/profileStorage';
import ClassroomJoinNamePrompt from './ClassroomJoinNamePrompt';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { MatchmakingOverlay } from '@/components/multiplayer/MatchmakingOverlay';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';
import { QuickPlaySeekingOverlay } from '@/components/multiplayer/QuickPlaySeekingOverlay';
import { MpScreen } from './shell/MpScreen';
import { useMultiplayerFlowState } from './useMultiplayerFlowState';

export interface MultiplayerFlowProps {
  // Callbacks
  handleJoin: (
    isHostMode: boolean,
    roomLanguage?: Language | null,
    gameCode?: string,
    roomName?: string,
    overrideUsername?: string,
    options?: { isPrivate?: boolean; isClassroom?: boolean; quickPlay?: boolean },
  ) => void;
  refreshRooms: () => void;

  // State from parent
  activeRooms: ActiveRoom[];
  roomsLoading: boolean;
  isJoining: boolean;
  isAuthenticated: boolean;
  displayName: string;
  prefilledRoom?: string;
  defaultLanguage: Language;

  // When true and prefilledRoom is set, auto-CREATE a private room with that
  // gameCode rather than auto-joining. Used by the classroom flow where the
  // teacher generates the gameCode upstream (see ClassroomGameLobby) and
  // expects to host the room with that exact code.
  host?: boolean;

  // When true, suppress the public lobby chrome (room list, admin Ranked
  // button) — classroom users have a code via ClassroomModeBanner and shouldn't
  // see competing matchmaking CTAs while auto-join is in flight.
  isClassroomMode?: boolean;
  /** An early classroom joiner held until the teacher opens the room. */
  waitingForTeacher?: boolean;

  // Auto-create room on mount (e.g., from Word Hunt banner)
  autoCreate?: boolean;

  // Auto-fire Quick Play on mount (e.g., from landing Quick Play card).
  // Mutually exclusive with autoCreate; if both are passed, autoCreate wins.
  quickPlay?: boolean;

  // Profile avatar for authenticated users
  profileAvatar?: CustomAvatarConfig | null;

  // CrazyGames login callback
  onCrazyGamesLogin?: (() => void) | undefined;

  // Form state setters (for compatibility)
  setGameCode: (code: string) => void;
  setUsername: (name: string) => void;
  setRoomName: (name: string) => void;
  setHostUsername: (name: string) => void;

  /** The entry header (EntryScreen supplies the arcade header; classroom gets none). */
  header?: ReactNode;
}

const TEST_ID = 'mp-entry';

/**
 * MultiplayerFlow — the MP entry (DESIGN §b.1/§b.2): ONE no-scroll MpScreen with
 * the header slot, the arenas body (identity, join by code, open arenas) and a
 * QUICK START footer; create / join are MpSheets over it.
 *
 * State and join actions live in `useMultiplayerFlowState`; which view shows
 * comes from the pure `resolveEntryView` (classroom name prompt → classroom
 * waiting loader → quick-play seeking → lobby). ENTRY owns this file.
 */
const MultiplayerFlow: React.FC<MultiplayerFlowProps> = (props) => {
  const { t } = useLanguage();
  const { isAdmin, profile } = useAuth();
  const s = useMultiplayerFlowState(props);
  const {
    refreshRooms, activeRooms, roomsLoading, isJoining, isAuthenticated, displayName, prefilledRoom,
    defaultLanguage, waitingForTeacher, profileAvatar, header,
  } = props;

  // Classroom joins with a room code own the screen. A guest with NO stored
  // profile (QR target, share link, dashboard "JOIN NOW") cannot be auto-joined —
  // the server needs a name — so ask in place first. Without a room there is
  // nothing to wait for and the normal lobby renders (never a dead spinner).
  // Students routed through `/join/[code]` arrive with a name already stored.
  if (s.entryView === 'classroom-name' && prefilledRoom) {
    return (
      <MpScreen
        testId={TEST_ID}
        bodyScroll="inner"
        body={
          <ClassroomJoinNamePrompt
            roomCode={prefilledRoom}
            onSubmit={s.handleClassroomNameSubmit}
            initialName={getStoredUsername() || ''}
            disabled={isJoining}
          />
        }
      />
    );
  }

  if (s.entryView === 'classroom-waiting') {
    return (
      <MpScreen
        testId={TEST_ID}
        body={
          <div className="flex-1 flex items-center justify-center px-4 py-8" data-testid="classroom-waiting">
            <div className="flex flex-col items-center gap-3 text-neo-white font-neo-body">
              <div className="w-10 h-10 rounded-full border-4 border-neo-cyan/30 border-t-neo-cyan animate-spin" aria-hidden="true" />
              <p className="text-sm sm:text-base">{t(waitingForTeacher ? 'education.studentPreview.waiting.title' : 'education.classroomGame.waitingForPlayers')}</p>
            </div>
          </div>
        }
      />
    );
  }

  if (s.entryView === 'seeking') {
    return (
      <MpScreen
        testId={TEST_ID}
        header={header}
        body={<QuickPlaySeekingOverlay t={t as (key: string) => string} onCancel={s.dismissSeeking} />}
      />
    );
  }

  const heroOwnsScreen = s.showCgHero && !s.heroExpanded;

  const rankedSlot = isAdmin ? (
    <button
      type="button"
      onClick={() => s.matchmaking.joinQueue('classic', defaultLanguage)}
      disabled={s.matchmaking.status !== 'idle'}
      className="w-full rounded-neo border-3 border-neo-black bg-neo-pink px-4 py-2 font-neo-display font-bold uppercase tracking-tight text-neo-black shadow-hard-sm active:translate-y-0.5 active:shadow-hard-pressed disabled:opacity-50"
    >
      {t('matchmaking.rankedMatch')}
    </button>
  ) : null;

  return (
    <>
      <MpScreen
        testId={TEST_ID}
        header={header}
        body={
          heroOwnsScreen ? (
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <CgLobbyHero
                variant={s.heroVariant.variant}
                displayName={s.heroVariant.displayName}
                onPlay={s.onHeroPlay}
                onBrowse={s.onHeroBrowse}
              />
            </div>
          ) : (
            <RoomListView
              activeRooms={activeRooms}
              roomsLoading={roomsLoading}
              onRefreshRooms={refreshRooms}
              onRoomClick={s.handleRoomClick}
              onCreateRoom={s.openCreate}
              onQuickPlay={s.handleQuickPlay}
              isQuickPlayLoading={!!s.joiningRoomCode || isJoining || s.isQuickPlayPending}
              joiningRoomCode={s.joiningRoomCode}
              onJoinCode={s.handleCodeJoin}
              isJoining={isJoining || s.isQuickPlayPending}
              roomFetchTimedOut={s.roomFetchTimedOut}
              isAuthenticated={isAuthenticated}
              displayName={displayName}
              profileAvatar={profileAvatar}
              rankedSlot={rankedSlot}
            />
          )
        }
        footer={
          heroOwnsScreen ? undefined : (
            <ArenaCTAStrip
              onQuickPlay={s.handleQuickPlay}
              onCreateRoom={s.openCreate}
              isQuickPlayLoading={!!s.joiningRoomCode || isJoining || s.isQuickPlayPending}
            />
          )
        }
      />

      <MatchmakingOverlay
        status={s.matchmaking.status}
        elo={profile?.ranked_mmr ?? 1000}
        eloRange={s.matchmaking.eloRange}
        queueSize={s.matchmaking.queueSize}
        waitTime={s.matchmaking.waitTime}
        opponent={s.matchmaking.opponent}
        onCancel={s.matchmaking.leaveQueue}
        onCreateRoom={() => { s.matchmaking.leaveQueue(); s.openCreate(); }}
        t={t as (key: string, params?: Record<string, unknown>) => string}
      />

      <JoinRoomModal
        isOpen={s.flowView === 'join-modal'}
        onClose={s.handleModalClose}
        room={s.selectedRoom}
        isJoining={isJoining}
        onJoin={s.handleJoinFromModal}
        isAuthenticated={isAuthenticated}
        displayName={displayName || null}
        profileAvatar={profileAvatar}
      />

      <CreateRoomModal
        isOpen={s.flowView === 'create-modal'}
        onClose={s.handleModalClose}
        isCreating={isJoining}
        onCreate={s.handleCreateFromModal}
        defaultLanguage={defaultLanguage}
        isAuthenticated={isAuthenticated}
        displayName={displayName || null}
        profileAvatar={profileAvatar}
      />
    </>
  );
};

export default MultiplayerFlow;
