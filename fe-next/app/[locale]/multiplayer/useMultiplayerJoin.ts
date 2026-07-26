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
import { setStoredUsername, getStoredAvatarId, getStoredCustomAvatar, setStoredCustomAvatar } from '@/utils/profileStorage';
import { getAvatarEmojiAndColor } from '@/utils/avatarConfig';
import { getRandomAvatarConfig, type CustomAvatarConfig } from '@/shared/types/customAvatar';
import { sanitizeRoomName } from '@/utils/consts';
import { sanitizeGameCode } from '@/lib/multiplayer/sanitizeGameCode';
import { getGuestSessionId, hashToken } from '@/utils/guestManager';
import { setRejoinIntent } from '@/utils/socketRejoin';
import type { Language, Avatar } from '@/shared/types/game';

// Hex color validation pattern (must match backend schema)
const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;
const DEFAULT_AVATAR_COLOR = '#FF6B6B';

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

type HandleJoinFn = (
  isHostMode: boolean,
  roomLang?: Language | null,
  overrideGameCode?: string,
  overrideRoomName?: string,
  overrideUsername?: string,
  options?: { isPrivate?: boolean; isClassroom?: boolean; quickPlay?: boolean },
) => Promise<void>;

export function useMultiplayerJoin({
  socket,
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
  // check and double-emit. A ref flips synchronously, closing that window.
  const inFlightRef = useRef(false);

  return useCallback(
    async (
      isHostMode: boolean,
      roomLang?: Language | null,
      overrideGameCode?: string,
      overrideRoomName?: string,
      overrideUsername?: string,
      options?: { isPrivate?: boolean; isClassroom?: boolean; quickPlay?: boolean },
    ) => {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[JOIN] handleJoin called - mode: ${isHostMode ? 'HOST' : 'PLAYER'}, socket connected: ${socket?.connected}`);
      }

      if (inFlightRef.current) {
        logger.debug('[JOIN] Ignoring duplicate join — a join is already in flight');
        return;
      }
      inFlightRef.current = true;
      const releaseInFlight = (): void => { inFlightRef.current = false; };

      // Wait for socket connection
      if (socket && !socket.connected) {
        logger.log('[JOIN] Socket exists but not connected, waiting...');
        trackGrowthEvent('mp_lobby_join_attempted', { socketReady: false });
        const connected = await new Promise<boolean>((resolve) => {
          const timeout = setTimeout(() => resolve(false), 5000);
          const onConnect = (): void => { clearTimeout(timeout); resolve(true); };
          socket.once('connect', onConnect);
          if (socket.connected) { clearTimeout(timeout); socket.off('connect', onConnect); resolve(true); }
        });
        if (!connected) {
          releaseInFlight();
          setError(t('errors.notConnected'));
          toast.error(t('common.notConnected'), { duration: 3000, icon: '⚠️', id: MP_TOAST_IDS.notConnected });
          return;
        }
      }

      if (!socket?.connected) {
        trackGrowthEvent('mp_lobby_join_attempted', { socketReady: false });
        releaseInFlight();
        setError(t('errors.notConnected'));
        toast.error(t('common.notConnected'), { duration: 3000, icon: '⚠️', id: MP_TOAST_IDS.notConnected });
        return;
      }

      // Wait for auth
      const AUTH_LOADING_TIMEOUT = 5000;
      const authLoadingTooLong = authLoadingStartTime && Date.now() - authLoadingStartTime > AUTH_LOADING_TIMEOUT;

      if (loading && !authLoadingTooLong) {
        releaseInFlight();
        toast.error(t('common.loadingProfile'), { duration: 2000, icon: '⏳', id: MP_TOAST_IDS.loadingProfile });
        return;
      }

      if (authLoadingTooLong) {
        logger.info('[AUTH] Auth loading timed out, proceeding without profile');
      }

      // Compute effective username
      let effectiveUsername = overrideUsername?.trim()
        ? overrideUsername.trim()
        : user
          ? profile?.display_name || user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || username
          : username;

      let generatedAvatar: { emoji: string; color: string } | null = null;
      if (!effectiveUsername?.trim() && !user) {
        const { name, avatar } = getRandomDefaultNameWithAvatar(language);
        effectiveUsername = name;
        generatedAvatar = avatar;
        setGuestAvatar(avatar);
      }

      if (effectiveUsername !== username) {
        setUsername(effectiveUsername);
      }

      const avatarImageId = getStoredAvatarId();
      const isGuest = !user;
      const fallbackAvatar = generatedAvatar || guestAvatar || getAvatarForName(effectiveUsername);
      const effectiveAvatar = buildAvatar(profile, fallbackAvatar, avatarImageId, isGuest);

      setError('');
      setIsJoining(true);

      const safetyTimeout = setTimeout(() => {
        releaseInFlight();
        setIsJoining(false);
        logger.debug('[JOIN] Safety timeout triggered');
        toast.error(t('errors.connectionTimeout'), { duration: 4000, icon: '⚠️', id: MP_TOAST_IDS.connectionTimeout });
      }, 10000);

      // Resolve the in-flight join on any terminal server response. Use
      // .on + explicit .off of ALL four events so no stale listener leaks
      // across attempts — .once only auto-removes the one that fired, leaving
      // the other three registered forever (slow accumulation on retries).
      const resolveJoin = (): void => {
        clearTimeout(safetyTimeout);
        releaseInFlight();
        socket.off('joined', resolveJoin);
        socket.off('error', resolveJoin);
        socket.off('joinedAsSpectator', resolveJoin);
        socket.off('rateLimited', resolveJoin);
      };
      socket.on('joined', resolveJoin);
      socket.on('error', resolveJoin);
      socket.on('joinedAsSpectator', resolveJoin);
      socket.on('rateLimited', resolveJoin);

      // Sanitize at the emit chokepoint so EVERY entry path (typed input,
      // paste, ?room= URL param, auto-join) is covered before it hits the
      // backend's alphanumeric-only GameCodeSchema. Fixes Sentry
      // JAVASCRIPT-NEXTJS-1NE ("JPX9SL\" — stray backslash failed the join).
      const codeToUse = sanitizeGameCode(overrideGameCode || gameCode);

      // Build auth context
      let authUserId = null;
      let guestTokenHash = null;
      let guestSessionId: string | null = null;

      if (isSupabaseEnabled) {
        if (user?.id) {
          authUserId = user.id;
        } else {
          guestSessionId = getGuestSessionId();
          if (guestSessionId) {
            guestTokenHash = await hashToken(guestSessionId);
          }
        }
      }

      if (isHostMode) {
        const finalHostUsername = user ? effectiveUsername : hostUsername || effectiveUsername;
        const finalRoomName = sanitizeRoomName(overrideRoomName || roomName || `${finalHostUsername} Room`);
        const hostFallbackAvatar = generatedAvatar || guestAvatar || getAvatarForName(finalHostUsername);
        const hostAvatar = buildAvatar(profile, hostFallbackAvatar, avatarImageId, isGuest);

        socket.emit('createGame', {
          gameCode: codeToUse,
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
        });

        // Remember how to get back into this room after a socket reconnect
        // (esp. a server restart/deploy, which wipes the server's in-memory
        // socket→game map). The host reconnects via the SAME `join` path — the
        // server's reconnection branch rebinds the host by username.
        setRejoinIntent({
          gameCode: codeToUse,
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
          gameCode: codeToUse,
          username: effectiveUsername,
          hasAuth: !!authUserId,
          socketConnected: socket.connected,
        });

        socket.emit('join', {
          gameCode: codeToUse,
          username: effectiveUsername,
          authUserId,
          guestTokenHash,
          guestSessionId,
          avatar: effectiveAvatar,
        });

        // Remember how to re-join after a socket reconnect (esp. a server
        // restart/deploy that wiped the server's in-memory socket→game map).
        // SocketContext re-emits this exact `join` on reconnect.
        setRejoinIntent({
          gameCode: codeToUse,
          username: effectiveUsername,
          authUserId,
          guestTokenHash,
          guestSessionId,
          avatar: effectiveAvatar,
        });
      }
    },
    [
      socket, gameCode, username, roomName, language, t,
      isSupabaseEnabled, user, profile, loading, authLoadingStartTime,
      guestAvatar, hostUsername, setGuestAvatar, setUsername, setError, setIsJoining,
    ]
  );
}
