'use client';

import React, { useEffect, useState, type ReactNode } from 'react';
import RoomListView from './RoomListView';
import JoinRoomModal from './entry/JoinSheet';
import CreateRoomModal from './entry/CreateSheet';
import CgLobbyHero from './CgLobbyHero';
import ArenaCTAStrip from './ArenaCTAStrip';
import type { Language, ActiveRoom } from '@/shared/types/game';
import { getStoredUsername } from '@/utils/profileStorage';
import ClassroomJoinNamePrompt from './ClassroomJoinNamePrompt';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useExperiment } from '@/hooks/useExperiment';
import { resolveRankedCta } from '@/lib/ranked/resolveRankedCta';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { LazyAuthModal as AuthModal } from './entry/entryLazy';
import { MatchmakingOverlay } from '@/components/multiplayer/MatchmakingOverlay';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';
import { QuickPlaySeekingOverlay } from '@/components/multiplayer/QuickPlaySeekingOverlay';
import { MpScreen } from './shell/MpScreen';
import { useMultiplayerFlowState } from './useMultiplayerFlowState';
import { useRoomEndedOffer } from './useRoomEndedOffer';
import ClassroomWaitStalled from '@/components/education/live/ClassroomWaitStalled';

export interface MultiplayerFlowProps {
  // Callbacks
  handleJoin: (
    isHostMode: boolean,
    roomLanguage?: Language | null,
    gameCode?: string,
    roomName?: string,
    overrideUsername?: string,
    options?: { isPrivate?: boolean; isClassroom?: boolean; quickPlay?: boolean; isRanked?: boolean },
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
  /** That wait has run a minute without the room opening. */
  waitStalled?: boolean;
  /** Re-ask for the room now. */
  onWaitRetry?: () => void;

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

  /** The arcade room this player tried to join is gone: offer one-tap Quick Play. */
  roomEndedOffer?: { seq: number } | null;
  /** The offer toast is on screen (the page clears the offer). */
  onRoomEndedOfferShown?: () => void;
  /**
   * Server-confirmed dead room, seq-bumped per report (useMpRoomSocket's
   * handleRoomGone). The flow closes a join sheet still open for that code —
   * its CTA into a dead room is what GR #14164 recorded rage clicks on.
   */
  joinRoomGone?: { code: string; seq: number } | null;
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
  const { isAuthenticated: authReady, canPlayRanked, gamesUntilRanked, profile } = useAuth();
  const { variant: rankedFlag } = useExperiment('ranked-public-v1');
  const [showRankedAuth, setShowRankedAuth] = useState(false);
  const s = useMultiplayerFlowState(props);
  useRoomEndedOffer({ offer: props.roomEndedOffer ?? null, onShown: props.onRoomEndedOfferShown, onPlayNow: s.handleQuickPlay, t });
  const {
    refreshRooms, activeRooms, roomsLoading, isJoining, isAuthenticated, displayName, prefilledRoom,
    defaultLanguage, waitingForTeacher, profileAvatar, header,
  } = props;
  // The language the open-games list shows; CREATE opens in it too.
  const [roomLanguage, setRoomLanguage] = useState<Language>(defaultLanguage);
  useEffect(() => setRoomLanguage(defaultLanguage), [defaultLanguage]);

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
              {waitingForTeacher && props.waitStalled ? (
                <div className="w-full max-w-sm text-center text-neo-cream">
                  <ClassroomWaitStalled language={defaultLanguage} onRetry={props.onWaitRetry} t={t} />
                </div>
              ) : (
                <>
                  <div className="w-10 h-10 rounded-full border-4 border-neo-cyan/30 border-t-neo-cyan animate-spin" aria-hidden="true" />
                  <p className="text-sm sm:text-base">{t(waitingForTeacher ? 'education.studentPreview.waiting.title' : 'education.classroomGame.waitingForPlayers')}</p>
                </>
              )}
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

  // Queue CTA only — ProfileRankedProgress / leagues / MMR badge stay mounted elsewhere.
  const rankedAction = resolveRankedCta({
    flagOn: rankedFlag === 'on',
    isAuthenticated: authReady,
    canPlayRanked,
  });

  const rankedSlot = rankedAction === 'hidden' ? null : (
    <button
      type="button"
      data-testid="ranked-cta"
      data-ranked-action={rankedAction}
      onClick={() => {
        if (rankedAction === 'auth') {
          setShowRankedAuth(true);
          return;
        }
        if (rankedAction === 'locked') return;
        s.matchmaking.joinQueue('classic', defaultLanguage);
        trackGrowthEvent('ranked_queue_joined', {
          elo: profile?.ranked_mmr ?? 1000,
          mode: 'classic',
          language: defaultLanguage,
        });
      }}
      disabled={rankedAction === 'locked' || s.matchmaking.status !== 'idle'}
      className="w-full rounded-neo border-3 border-neo-black bg-neo-pink px-4 py-2 font-neo-display font-bold uppercase tracking-tight text-neo-black shadow-hard-sm active:translate-y-0.5 active:shadow-hard-pressed disabled:opacity-50"
    >
      {rankedAction === 'locked'
        ? t('matchmaking.rankedLocked', { n: gamesUntilRanked })
        : rankedAction === 'auth'
          ? t('matchmaking.rankedSignIn')
          : t('matchmaking.rankedMatch')}
    </button>
  );

  return (
    <>
      <MpScreen
        testId={TEST_ID}
        header={header}
        // The arenas body scrolls inside its region on short phones rather than
        // clipping behind the QUICK START footer; the page itself never scrolls.
        bodyScroll={heroOwnsScreen ? 'none' : 'inner'}
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
              roomLanguage={roomLanguage}
              onRoomLanguageChange={setRoomLanguage}
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

      <AuthModal
        isOpen={showRankedAuth}
        onClose={() => setShowRankedAuth(false)}
        initialMode="signin"
      />

      <JoinRoomModal
        isOpen={s.flowView === 'join-modal'}
        onClose={s.handleModalClose}
        room={s.joinTarget}
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
        defaultLanguage={roomLanguage}
        isAuthenticated={isAuthenticated}
        displayName={displayName || null}
        profileAvatar={profileAvatar}
      />
    </>
  );
};

export default MultiplayerFlow;
