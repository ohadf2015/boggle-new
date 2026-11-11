/**
 * useMultiplayerJoin Hook
 *
 * Encapsulates the handleJoin logic for the multiplayer page.
 * Extracted from PageClient.tsx for maintainability.
 */

import { useCallback, useRef } from 'react';
import type { Socket } from 'socket.io-client';
import toast from 'react-hot-toast';
import logger from '@/utils/logger';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { MP_TOAST_IDS } from '@/utils/multiplayer/mpToastIds';
import { getRandomDefaultNameWithAvatar, getAvatarForName } from '@/utils/defaultNames';
import { getOrCreateStoredUsername, getStoredAvatarId, getStoredCustomAvatar, setStoredCustomAvatar } from '@/utils/profileStorage';
import { getAvatarEmojiAndColor } from '@/utils/avatarConfig';
import { getRandomAvatarConfig, type CustomAvatarConfig } from '@/shared/types/customAvatar';
import { sanitizeRoomName, sanitizeUsername } from '@/utils/consts';
import { sanitizeGameCode } from '@/lib/multiplayer/sanitizeGameCode';
import { getGuestSessionId, hashToken } from '@/utils/guestManager';
import { setRejoinIntent } from '@/utils/socketRejoin';
import { practiceSeatJoinFlag } from '@/utils/practiceSeatStorage';
import { getSharedSocketIfExists } from '@/utils/SocketContext';
import { clearHostCreateRefusal, setHostCreateRefusal } from './hostCreateRefusal';
import { waitForSignedInUser } from './classroomHostSignIn';
import type { Language, Avatar } from '@/shared/types/game';

// Hex color validation pattern (must match backend schema)
const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;
const DEFAULT_AVATAR_COLOR = '#FF6B6B';

// How long to wait for a cold socket before giving up. Was 5s, which a phone
// waking its radio routinely misses — every one of the 50 recorded dead-socket
// taps carried socketReady:false, and 26 of the 28 people affected were in
// their first 24 hours. The wait is not idle time for the player: the pending
// state is shown before it starts.
const SOCKET_CONNECT_TIMEOUT_MS = 12_000;

function sanitizeAvatarColor(
  color: string | undefined | null,
  avatarImage?: string | null
): string {
  if (color && HEX_COLOR_PATTERN.test(color)) return color;
  if (avatarImage) return getAvatarEmojiAndColor(avatarImage).color;
  return DEFAULT_AVATAR_COLOR;
}

function resolveCustomAvatar(
  profile: { avatar_config?: CustomAvatarConfig | null } | null,
  isGuest: boolean
): CustomAvatarConfig | undefined {
  if (profile?.avatar_config) return profile.avatar_config;
  if (isGuest) {
    const stored = getStoredCustomAvatar();
    if (stored) return stored;
    const generated = getRandomAvatarConfig();
    setStoredCustomAvatar(generated);
    return generated;
  }
  return undefined;
}

function buildAvatar(
  profile: { avatar_emoji?: string; avatar_color?: string; avatar_image?: string; avatar_config?: CustomAvatarConfig | null } | null,
  fallbackAvatar: { emoji: string; color: string },
  avatarImageId: string | null,
  isGuest: boolean
): { emoji?: string; color: string; avatarImage?: string; customAvatar?: CustomAvatarConfig } {
  const effectiveAvatarImage = avatarImageId || profile?.avatar_image;
  const customAvatar = resolveCustomAvatar(profile, isGuest);
  if (profile) {
    return {
      emoji: profile.avatar_emoji,
      color: sanitizeAvatarColor(profile.avatar_color, effectiveAvatarImage),
      avatarImage: effectiveAvatarImage,
      customAvatar,
    };
  }
  return {
    ...fallbackAvatar,
    color: sanitizeAvatarColor(fallbackAvatar.color, avatarImageId),
    avatarImage: avatarImageId || undefined,
    customAvatar,
  };
}

interface UseMultiplayerJoinOptions {
  socket: Socket | null;
  gameCode: string;
  username: string;
  roomName: string;
  hostUsername: string;
  language: Language;
  t: (path: string, params?: Record<string, string | number>) => string;
  isSupabaseEnabled: boolean;
  user: { id?: string; email?: string; user_metadata?: { full_name?: string; name?: string } } | null;
  profile: { display_name?: string; avatar_emoji?: string; avatar_color?: string; avatar_image?: string; avatar_config?: CustomAvatarConfig | null } | null;
  loading: boolean;
  authLoadingStartTime: number | null;
  guestAvatar: { emoji: string; color: string } | null;
  setGuestAvatar: (avatar: { emoji: string; color: string }) => void;
  setUsername: (username: string) => void;
  setError: (error: string) => void;
  setIsJoining: (isJoining: boolean) => void;
}

export type HandleJoinFn = (
  isHostMode: boolean,
  roomLang?: Language | null,
  overrideGameCode?: string,
  overrideRoomName?: string,
  overrideUsername?: string,
  options?: { isPrivate?: boolean; isClassroom?: boolean; quickPlay?: boolean; autoRetry?: boolean; isRanked?: boolean },
) => Promise<void>;

export function useMultiplayerJoin({
  socket: socketFromProps,
  gameCode,
  username,
  roomName,
  hostUsername,
  language,
  t,
  isSupabaseEnabled,
  user,
  profile,
  loading,
  authLoadingStartTime,
  guestAvatar,
  setGuestAvatar,
  setUsername,
  setError,
  setIsJoining,
}: UseMultiplayerJoinOptions): HandleJoinFn {
  // Synchronous double-submit guard. React's `isJoining` state (used to disable
  // the button) updates asynchronously, so two rapid invocations — Enter key +
  // button click, or auto-join racing a manual tap — can both pass the disabled
  // check and double-emit. Holds the live attempt so only that attempt can clear it.
  const attemptRef = useRef<object | null>(null);

  // Auth-sensitive values, re-read AFTER the await in the join body. The
  // callback's closure copies go stale the instant we yield, and picking up the
  // profile that just landed is the entire point of waiting for it.
  const latestAuthRef = useRef({ user, profile, username, guestAvatar, loading });
  latestAuthRef.current = { user, profile, username, guestAvatar, loading };

  return useCallback(
    async (
      isHostMode: boolean,
      roomLang?: Language | null,
      overrideGameCode?: string,
      overrideRoomName?: string,
      overrideUsername?: string,
      options?: { isPrivate?: boolean; isClassroom?: boolean; quickPlay?: boolean; autoRetry?: boolean; isRanked?: boolean },
    ) => {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[JOIN] handleJoin called - mode: ${isHostMode ? 'HOST' : 'PLAYER'}, socket connected: ${socketFromProps?.connected}`);
      }

      if (attemptRef.current) {
        logger.debug('[JOIN] Ignoring duplicate join — a join is already in flight');
        return;
      }
      const attempt = {};
      attemptRef.current = attempt;
      const releaseInFlight = (): void => { if (attemptRef.current === attempt) attemptRef.current = null; };
      // The page hands over its socket only after the first connect; an early tap must still reach the connect wait.
      const socket = socketFromProps ?? getSharedSocketIfExists();

      const joinStartedAt = Date.now();
      const isClassroomHost = isHostMode && !!options?.isClassroom;
      // Every entry path (typed, pasted, ?room=, auto-join) meets the backend's alphanumeric-only GameCodeSchema.
      const attemptCode = sanitizeGameCode(overrideGameCode || gameCode);
      if (isClassroomHost) clearHostCreateRefusal();

      // One terminal outcome per attempt, emitted from the points where the
      // attempt actually ENDS — the server's ack, the safety timeout, or a dead
      // socket. Deliberately NOT emitted right after socket.emit('join'): that
      // would only mean "the request was sent", and the server not replying is
      // a known failure mode (see mp_lobby_join_timeout below), so it would
      // score silently-stalled joins as successes. That name-vs-firing-point
      // mismatch is exactly the defect this event exists to correct in
      // `mp_lobby_join_attempted`.
      let joinOutcomeEmitted = false;
      /** True only for the first terminal outcome — see emitJoinOutcome. */
      let isFirstOutcome = false;
      const emitJoinOutcome = (outcome: string, reason?: string): void => {
        isFirstOutcome = !joinOutcomeEmitted;
        if (joinOutcomeEmitted) return;
        joinOutcomeEmitted = true;
        if (isClassroomHost && outcome !== 'joined') setHostCreateRefusal({ code: attemptCode, reason: reason || outcome });
        trackGrowthEvent('mp_join_outcome', {
          outcome,
          wait_ms: Date.now() - joinStartedAt,
          isHostMode,
          quickPlay: !!options?.quickPlay,
          // Only on failures — a `reason` on a success would just be noise.
          ...(reason ? { reason } : {}),
          // A waiting student's automatic re-ask (useClassroomRoomWait), not a tap.
          ...(options?.autoRetry ? { autoRetry: true } : {}),
        });
      };

      // Show the pending state BEFORE any waiting. The socket wait below can
      // take seconds on a cold mobile connection, and the button used to sit
      // visibly idle for all of it — so the player tapped again, and again.
      // Observed: one session tapped Quick Start 7 times, another hit "Let's
      // Go!" 9 times ending in a rageclick.
      setError('');
      setIsJoining(true);

      // Wait for socket connection.
      if (socket && !socket.connected) {
        logger.log('[JOIN] Socket exists but not connected, waiting...');
        trackGrowthEvent('mp_lobby_join_attempted', { socketReady: false });
        // Ask socket.io to redial. It does NOT retry on its own once its
        // reconnection budget is spent, so without this the wait below could
        // only ever listen to a socket that had already stopped trying.
        try { socket.connect(); } catch { /* already connecting — fine */ }
        const connected = await new Promise<boolean>((resolve) => {
          // 5s was too short for a cold mobile radio: 50 dead-socket taps from
          // 27 people in 11 days, 26 of them in their first 24 hours.
          const onConnect = (): void => { clearTimeout(timeout); resolve(true); };
          const timeout = setTimeout(() => { socket.off('connect', onConnect); resolve(false); }, SOCKET_CONNECT_TIMEOUT_MS);
          socket.once('connect', onConnect);
          if (socket.connected) { clearTimeout(timeout); socket.off('connect', onConnect); resolve(true); }
        });
        if (!connected) {
          releaseInFlight();
          setIsJoining(false);
          emitJoinOutcome('not_connected');
          setError(t('errors.notConnected'));
          toast.error(t('common.notConnected'), { duration: 3000, icon: '⚠️', id: MP_TOAST_IDS.notConnected });
          return;
        }
      }

      if (!socket?.connected) {
        trackGrowthEvent('mp_lobby_join_attempted', { socketReady: false });
        releaseInFlight();
        setIsJoining(false);
        emitJoinOutcome('not_connected');
        setError(t('errors.notConnected'));
        toast.error(t('common.notConnected'), { duration: 3000, icon: '⚠️', id: MP_TOAST_IDS.notConnected });
        return;
      }

      // Wait for auth to settle rather than dropping the tap. This callback is
      // the single emit chokepoint for EVERY entry path — create, join modal,
      // quick-play, ?room= auto-join — so bailing here silently killed all of
      // them whenever the Supabase profile was still in flight (cold load,
      // deep link). The user saw a toast and had to tap again; auto-join had
      // no one to re-tap for it, so it just never happened.
      // The pending state is already showing — it is set at the very top of
      // this callback, before the socket wait, so the button never looks idle
      // while a join is genuinely under way.

      const AUTH_LOADING_TIMEOUT = 5000;
      const authDeadline = (authLoadingStartTime ?? Date.now()) + AUTH_LOADING_TIMEOUT;
      while (latestAuthRef.current.loading && Date.now() < authDeadline) {
        // ponytail: polling a ref beats wiring an auth-settled subscription for
        // a wait that is normally one or two ticks. Swap for an event if this
        // ever needs to be precise.
        await new Promise((resolve) => setTimeout(resolve, 60));
      }
      if (latestAuthRef.current.loading) {
        logger.info('[AUTH] Auth still loading after timeout, proceeding without profile');
      }
      if (isClassroomHost && !(await waitForSignedInUser(() => latestAuthRef.current.user))) {
        releaseInFlight(); setIsJoining(false);
        emitJoinOutcome('error', 'AUTH_REQUIRED');
        return;
      }

      // Live auth values — the closure's copies predate the await above.
      const {
        user: liveUser,
        profile: liveProfile,
        username: liveUsername,
        guestAvatar: liveGuestAvatar,
      } = latestAuthRef.current;

      // Compute effective username
      let effectiveUsername = overrideUsername?.trim()
        ? overrideUsername.trim()
        : liveUser
          ? liveProfile?.display_name || liveUser?.user_metadata?.full_name || liveUser?.user_metadata?.name || liveUser?.email?.split('@')[0] || liveUsername
          : liveUsername;

      let generatedAvatar: { emoji: string; color: string } | null = null;
      if (!effectiveUsername?.trim() && !liveUser) {
        // Same persisted identity the room modals show. Previously this
        // invented a fresh random name every time and never stored it, so a
        // guest who bypassed the modals (quick-play, ?room= deep link) got a
        // different name each session than the one the modals displayed.
        effectiveUsername = getOrCreateStoredUsername(language);
        const { avatar } = getRandomDefaultNameWithAvatar(language);
        generatedAvatar = avatar;
        setGuestAvatar(avatar);
      }

      // Sanitize at the emit chokepoint, same as the game code and room name
      // below: this name is usually NOT typed by a human — it falls back to
      // profile.display_name / the OAuth full_name / the email prefix, none of
      // which agreed to the socket's UsernameSchema. An apostrophe, an emoji or a
      // long real name made createGame/join fail validation and the room never
      // opened (Sentry 1YP/22D/22E/22F "at most 30 characters", 20B pattern).
      effectiveUsername = sanitizeUsername(effectiveUsername) || getOrCreateStoredUsername(language);

      if (effectiveUsername !== liveUsername) {
        setUsername(effectiveUsername);
      }

      const avatarImageId = getStoredAvatarId();
      const isGuest = !liveUser;
      const fallbackAvatar = generatedAvatar || liveGuestAvatar || getAvatarForName(effectiveUsername);
      const effectiveAvatar = buildAvatar(liveProfile, fallbackAvatar, avatarImageId, isGuest);

      const safetyTimeout = setTimeout(() => {
        detachListeners();
        releaseInFlight();
        setIsJoining(false);
        logger.debug('[JOIN] Safety timeout triggered');
        trackGrowthEvent('mp_lobby_join_timeout', { isHostMode });
        emitJoinOutcome('timeout');
        toast.error(t('errors.connectionTimeout'), { duration: 4000, icon: '⚠️', id: MP_TOAST_IDS.connectionTimeout });
      }, 10000);

      // Resolve the in-flight join on any terminal server response. Use
      // .on + explicit .off of ALL four events so no stale listener leaks
      // across attempts — .once only auto-removes the one that fired, leaving
      // the other three registered forever (slow accumulation on retries).
      const resolveJoin = (
        result: 'joined' | 'error' | 'joinedAsSpectator' | 'rateLimited',
        reason?: string,
      ): void => {
        clearTimeout(safetyTimeout);
        releaseInFlight();
        trackGrowthEvent('mp_lobby_join_resolved', { result });
        // The server answered — THIS is the attempt's real outcome. One emit
        // here covers the create and join branches identically so they cannot
        // drift (Class 3 in .claude/rules/60-recurring-pitfalls.md).
        emitJoinOutcome(result, reason);
        // Quick Play conversion is emitted HERE, from the intent, not from a
        // `?quickPlay=true` URL param in PageClient. The param is only present on
        // the landing auto-fire path, but `handleQuickPlay()` also runs for the
        // in-lobby "Quick Start" button — so lobby taps counted as initiations that
        // could never convert, and the funnel read 46.8% when it was really 96.4%.
        // Guarded by isFirstOutcome for the same reason emitJoinOutcome is: one
        // conversion per attempt, even if the server answers more than once.
        if (isFirstOutcome && options?.quickPlay && (result === 'joined' || result === 'joinedAsSpectator')) {
          trackGrowthEvent('mp_quickplay_joined', {
            asHost: isHostMode,
            language: roomLang || language,
            asSpectator: result === 'joinedAsSpectator',
          });
        }
        detachListeners();
      };
      const detachListeners = (): void => {
        socket.off('joined', onJoined);
        socket.off('error', onError);
        socket.off('joinedAsSpectator', onSpectator);
        socket.off('rateLimited', onRateLimited);
        socket.off('rate-limited', onRoomCreateLimited);
      };
      const onJoined = (): void => resolveJoin('joined');
      // Keep the server's reason. This handler used to drop the payload, which is
      // why 291 `outcome:'error'` events (58 people, ~5 attempts each) carry no
      // attributable cause and the biggest join-failure bucket is undebuggable.
      // Falls back to 'unknown' rather than omitting the field: an absent property
      // cannot distinguish "server sent nothing" from "client dropped it".
      const onError = (payload?: unknown): void => {
        // Prefer `code` (e.g. GAME_NOT_FOUND): it is bounded, groupable, and
        // survives copy and i18n edits. `message` is user-facing prose that can
        // interpolate a room code or username — unbounded cardinality in
        // analytics, and a PII risk. Only fall back to it when there is no code.
        const p = payload as { code?: string; message?: string; error?: string } | undefined;
        const reason = typeof payload === 'string'
          ? payload
          : p?.code ?? p?.message ?? p?.error;
        resolveJoin('error', reason || 'unknown');
      };
      const onSpectator = (): void => resolveJoin('joinedAsSpectator');
      const onRateLimited = (): void => resolveJoin('rateLimited');
      // createGame answers its per-socket room limit on this event; without it the tap sat out the 10s timer.
      const onRoomCreateLimited = (payload?: { action?: string }): void => {
        if (payload?.action !== 'roomCreate') return;
        resolveJoin('rateLimited', 'roomCreate');
        setIsJoining(false);
        toast.error(t('errors.roomCreateTooSoon'), { duration: 4000, icon: '⏳', id: MP_TOAST_IDS.rateLimited });
      };
      socket.on('joined', onJoined);
      socket.on('error', onError);
      socket.on('joinedAsSpectator', onSpectator);
      socket.on('rateLimited', onRateLimited);
      socket.on('rate-limited', onRoomCreateLimited);


      // Build auth context
      let authUserId = null;
      let guestTokenHash = null;
      let guestSessionId: string | null = null;

      if (isSupabaseEnabled) {
        if (liveUser?.id) {
          authUserId = liveUser.id;
        } else {
          guestSessionId = getGuestSessionId();
          if (guestSessionId) {
            guestTokenHash = await hashToken(guestSessionId);
          }
        }
      }

      if (isHostMode) {
        const finalHostUsername = liveUser ? effectiveUsername : hostUsername || effectiveUsername;
        const finalRoomName = sanitizeRoomName(overrideRoomName || roomName || `${finalHostUsername} Room`);
        const hostFallbackAvatar = generatedAvatar || liveGuestAvatar || getAvatarForName(finalHostUsername);
        const hostAvatar = buildAvatar(liveProfile, hostFallbackAvatar, avatarImageId, isGuest);

        socket.emit('createGame', {
          gameCode: attemptCode,
          roomName: finalRoomName,
          hostUsername: finalHostUsername,
          language: roomLang || language,
          authUserId,
          guestTokenHash,
          guestSessionId,
          avatar: hostAvatar,
          ...(options?.isPrivate && { isPrivate: true }),
          // Audit T4 (2026-05-10): server-side flag protects against
          // student-promotion if teacher disconnects mid-session.
          ...(options?.isClassroom && { isClassroom: true }),
          // The duo bot only joins rooms Quick Play made, never a friend's room.
          ...(options?.quickPlay && { isQuickPlay: true }),
          ...(options?.isRanked && { isRanked: true }),
        });

        // Remember how to get back into this room after a socket reconnect
        // (esp. a server restart/deploy, which wipes the server's in-memory
        // socket→game map). The host reconnects via the SAME `join` path — the
        // server's reconnection branch rebinds the host by username.
        setRejoinIntent({
          gameCode: attemptCode,
          username: finalHostUsername,
          authUserId,
          guestTokenHash,
          guestSessionId,
          avatar: hostAvatar,
        });

        if (options?.quickPlay) {
          logger.log('[QUICK_PLAY] Room created — user will start from lobby');
        }
      } else {
        logger.log('[JOIN] Emitting join event:', {
          gameCode: attemptCode,
          username: effectiveUsername,
          hasAuth: !!authUserId,
          socketConnected: socket.connected,
        });

        socket.emit('join', {
          gameCode: attemptCode,
          username: effectiveUsername,
          authUserId,
          guestTokenHash,
          guestSessionId,
          avatar: effectiveAvatar,
          ...practiceSeatJoinFlag(),
        });

        // Remember how to re-join after a socket reconnect (esp. a server
        // restart/deploy that wiped the server's in-memory socket→game map).
        // SocketContext re-emits this exact `join` on reconnect.
        setRejoinIntent({
          gameCode: attemptCode,
          username: effectiveUsername,
          authUserId,
          guestTokenHash,
          guestSessionId,
          avatar: effectiveAvatar,
          ...practiceSeatJoinFlag(),
        });
      }
    },
    // user/profile/username/guestAvatar/loading deliberately absent: they are
    // read through latestAuthRef (they change across the await anyway), so
    // listing them here only churned handleJoin's identity on every auth
    // render and re-rendered the whole lobby with it.
    [
      socketFromProps, gameCode, roomName, language, t,
      isSupabaseEnabled, authLoadingStartTime,
      hostUsername, setGuestAvatar, setUsername, setError, setIsJoining,
    ]
  );
}
