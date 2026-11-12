import type { Server } from 'socket.io';
import * as friendsManager from './friendsManager';
import { getSupabase } from './supabaseServer';
import { notifyFriendRequest, notifyFriendAccepted } from './pushNotificationTriggers';
import { getUserProfile } from '../utils/socialHelpers';
import { resolveUserSocialCapabilities } from '../utils/socialPolicyServer';
import logger from '../utils/logger';

export type FriendAction = 'request' | 'accept' | 'unfriend' | 'block' | 'unblock';
export const FRIEND_ACTIONS: readonly FriendAction[] = ['request', 'accept', 'unfriend', 'block', 'unblock'];

export interface FriendActionResult {
  success: boolean;
  code?: string;
}

// Next routes and the socket server share one process but not one module graph; server/socketSetup publishes io here.
function emitToUser(userId: string, event: string, data: Record<string, unknown>): void {
  const io = (globalThis as { __lcIo?: Server }).__lcIo;
  if (!io) {
    logger.warn('FRIENDS', `socket server not reachable; ${event} for ${userId} not delivered live`);
    return;
  }
  io.to(`user:${userId}`).emit(event, { ...data, timestamp: Date.now() });
}

async function nameOf(userId: string): Promise<string> {
  const profile = await getUserProfile(userId);
  return profile?.displayName || profile?.username || '';
}

/**
 * The one write path for friendships. `target` is a user id, except for 'accept' where it is the request id.
 * Client listeners only refetch on these events, so payloads carry ids, not profiles.
 */
export async function runFriendAction(
  actorId: string,
  action: FriendAction,
  target: string,
): Promise<FriendActionResult> {
  if (action === 'request' || action === 'accept') {
    const caps = await resolveUserSocialCapabilities(actorId);
    if (!caps.friendManagement) return { success: false, code: 'SOCIAL_RESTRICTED' };
  }

  switch (action) {
    case 'request': {
      if (target === actorId) return { success: false, code: 'CANNOT_ADD_SELF' };
      const result = await friendsManager.sendFriendRequest(actorId, target);
      if (!result.success) return { success: false, code: result.errorCode || 'SERVER_ERROR' };
      const ids = { requestId: result.request?.requestId, fromUserId: actorId, toUserId: target };
      const actorName = await nameOf(actorId);
      if (result.autoAccepted) {
        emitToUser(target, 'friends:requestAccepted', ids);
        emitToUser(actorId, 'friends:requestAccepted', ids);
        notifyFriendAccepted(target, actorName, actorId).catch(() => {});
      } else {
        emitToUser(target, 'friends:requestReceived', ids);
        emitToUser(actorId, 'friends:requestSent', ids);
        notifyFriendRequest(target, actorName, actorId).catch(() => {});
      }
      return { success: true };
    }

    case 'accept': {
      const result = await friendsManager.acceptFriendRequest(target, actorId);
      if (!result.success) return { success: false, code: result.errorCode || 'SERVER_ERROR' };
      const { data: row } = (await getSupabase()
        ?.from('friends')
        .select('user_id, friend_id')
        .eq('id', target)
        .maybeSingle()) ?? { data: null };
      if (row?.user_id) {
        const ids = { requestId: target, fromUserId: row.user_id, toUserId: actorId };
        emitToUser(row.user_id, 'friends:requestAccepted', ids);
        emitToUser(actorId, 'friends:requestAccepted', ids);
        notifyFriendAccepted(row.user_id, await nameOf(actorId), actorId).catch(() => {});
      }
      return { success: true };
    }

    case 'unfriend': {
      const result = await friendsManager.unfriend(actorId, target);
      if (!result.success) return { success: false, code: 'SERVER_ERROR' };
      emitToUser(target, 'friends:friendRemoved', { friendUserId: actorId });
      emitToUser(actorId, 'friends:friendRemoved', { friendUserId: target });
      return { success: true };
    }

    case 'block': {
      const result = await friendsManager.blockUser(actorId, target);
      if (!result.success) return { success: false, code: result.errorCode || 'SERVER_ERROR' };
      // Never reveal the block: a former friend only learns the friendship ended.
      if (result.wasFriends) emitToUser(target, 'friends:friendRemoved', { friendUserId: actorId });
      emitToUser(actorId, 'friends:friendRemoved', { friendUserId: target });
      return { success: true };
    }

    case 'unblock': {
      const result = await friendsManager.unblockUser(actorId, target);
      if (!result.success) return { success: false, code: result.errorCode || 'SERVER_ERROR' };
      return { success: true };
    }
  }
}
