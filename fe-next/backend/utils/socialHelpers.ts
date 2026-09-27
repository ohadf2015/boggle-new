/**
 * Social Helpers - Shared utilities for friend-related socket handlers
 *
 * Provides O(1) user-room broadcasting, shared profile fetch with Redis caching,
 * and auth extraction. These replace the duplicated local copies in
 * friendsHandler.ts, friendMessagingHandler.ts, and friendChallengeHandler.ts.
 */

import type { Server, Socket } from 'socket.io';
import { getSupabase } from '../modules/supabaseServer';
import logger from './logger';
import {
  getCachedUserProfile,
  cacheUserProfile,
  type CachedUserProfile,
} from '../redis';

// ==================== Auth ====================

/**
 * Extract authenticated user ID from socket.
 * Returns null if the socket has not authenticated.
 */
export function getAuthUserId(socket: Socket): string | null {
  return (socket.data?.verifiedUserId as string) || null;
}

// ==================== Broadcast ====================

/**
 * Broadcast an event to all sockets belonging to the given authenticated user.
 * Uses Socket.IO rooms (`user:<authUserId>`) for O(1) delivery instead of
 * an O(N) scan over all connected sockets.
 *
 * Sockets must join their user room when they authenticate — see socketHandlers.ts.
 */
export function broadcastToUser(
  io: Server,
  authUserId: string,
  event: string,
  data: unknown
): void {
  io.to(`user:${authUserId}`).emit(event, data);
}

// ==================== Profile ====================

export interface UserProfile {
  username: string;
  displayName: string | null;
  avatar: {
    emoji: string;
    color: string;
    image?: string | null;
  };
  isOnline: boolean;
}

/**
 * Fetch a user profile by ID, with Redis caching.
 * Computes `isOnline` from `last_seen_at` (within 5 minutes = online).
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const cached = await getCachedUserProfile(userId);
    if (cached) {
      const isOnline = cached.lastSeenAt
        ? new Date(cached.lastSeenAt) > new Date(Date.now() - 5 * 60 * 1000)
        : false;

      return {
        username: cached.username,
        displayName: cached.displayName ?? null,
        avatar: {
          emoji: cached.avatarEmoji,
          color: cached.avatarColor,
          image: cached.avatarImage,
        },
        isOnline,
      };
    }

    const supabase = getSupabase();
    if (!supabase) {
      logger.error('SOCIAL_HELPERS', 'Supabase client not available');
      return null;
    }

    const { data } = await supabase
      .from('profiles')
      .select('username, display_name, avatar_emoji, avatar_color, avatar_image, last_seen_at')
      .eq('id', userId)
      .single();

    if (!data) return null;

    const profileToCache: CachedUserProfile = {
      userId,
      username: data.username,
      displayName: data.display_name,
      avatarEmoji: data.avatar_emoji || '👤',
      avatarColor: data.avatar_color || '#808080',
      avatarImage: data.avatar_image,
      lastSeenAt: data.last_seen_at,
    };
    await cacheUserProfile(profileToCache);

    const isOnline = !!(
      data.last_seen_at &&
      new Date(data.last_seen_at) > new Date(Date.now() - 5 * 60 * 1000)
    );

    return {
      username: data.username,
      displayName: data.display_name,
      avatar: {
        emoji: data.avatar_emoji || '👤',
        color: data.avatar_color || '#808080',
        image: data.avatar_image,
      },
      isOnline,
    };
  } catch (error) {
    logger.error('SOCIAL_HELPERS', `Error getting user profile: ${(error as Error).message}`);
    return null;
  }
}
