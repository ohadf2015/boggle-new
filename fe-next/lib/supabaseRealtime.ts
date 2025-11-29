/**
 * Supabase Real-time Subscriptions
 * Handles live updates for leaderboard and profile changes
 */

import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabase';
import logger from '@/utils/logger';

// Active subscriptions tracking
const activeSubscriptions = new Map<string, RealtimeChannel>();

interface SubscriptionOptions {
  onStatusChange?: (status: string) => void;
}

interface GameRoomHandlers {
  onPresence?: (state: any, event?: any) => void;
  onBroadcast?: (payload: any) => void;
}

interface GameRoomChannel {
  broadcast: (event: string, payload: any) => any;
  track: (userData: any) => any;
  untrack: () => any;
  unsubscribe: () => void;
}

/**
 * Subscribe to leaderboard changes
 * @param onUpdate - Callback when leaderboard changes
 * @param options - Subscription options
 * @returns Unsubscribe function
 */
export function subscribeToLeaderboard(
  onUpdate: (payload: any) => void,
  options: SubscriptionOptions = {}
): () => void {
  if (!supabase) {
    logger.warn('[Realtime] Supabase not configured');
    return () => {};
  }

  const channelName = `leaderboard-${Date.now()}`;

  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'leaderboard'
      },
      (payload) => {
        logger.log('[Realtime] Leaderboard change:', payload.eventType);
        onUpdate(payload);
      }
    )
    .subscribe((status) => {
      logger.log('[Realtime] Leaderboard subscription status:', status);
      if (options.onStatusChange) {
        options.onStatusChange(status);
      }
    });

  activeSubscriptions.set(channelName, channel);

  return () => {
    logger.log('[Realtime] Unsubscribing from leaderboard');
    supabase.removeChannel(channel);
    activeSubscriptions.delete(channelName);
  };
}

/**
 * Subscribe to own profile changes
 * @param userId - User ID to watch
 * @param onUpdate - Callback when profile changes
 * @returns Unsubscribe function
 */
export function subscribeToProfile(
  userId: string,
  onUpdate: (profile: any) => void
): () => void {
  if (!supabase || !userId) {
    return () => {};
  }

  const channelName = `profile-${userId}`;

  // Prevent duplicate subscriptions
  if (activeSubscriptions.has(channelName)) {
    logger.log('[Realtime] Profile subscription already exists');
    return () => {
      const existing = activeSubscriptions.get(channelName);
      if (existing) {
        supabase.removeChannel(existing);
        activeSubscriptions.delete(channelName);
      }
    };
  }

  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${userId}`
      },
      (payload) => {
        logger.log('[Realtime] Profile updated:', payload.new);
        onUpdate(payload.new);
      }
    )
    .subscribe((status) => {
      logger.log('[Realtime] Profile subscription status:', status);
    });

  activeSubscriptions.set(channelName, channel);

  return () => {
    logger.log('[Realtime] Unsubscribing from profile');
    supabase.removeChannel(channel);
    activeSubscriptions.delete(channelName);
  };
}

/**
 * Subscribe to game results for a specific player
 * @param userId - User ID
 * @param onNewResult - Callback when new game result is added
 * @returns Unsubscribe function
 */
export function subscribeToGameResults(
  userId: string,
  onNewResult: (result: any) => void
): () => void {
  if (!supabase || !userId) {
    return () => {};
  }

  const channelName = `game-results-${userId}`;

  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'game_results',
        filter: `player_id=eq.${userId}`
      },
      (payload) => {
        logger.log('[Realtime] New game result:', payload.new);
        onNewResult(payload.new);
      }
    )
    .subscribe();

  activeSubscriptions.set(channelName, channel);

  return () => {
    supabase.removeChannel(channel);
    activeSubscriptions.delete(channelName);
  };
}

/**
 * Broadcast channel for live game room updates
 * @param gameCode - Game room code
 * @param handlers - Event handlers { onPresence, onBroadcast }
 * @returns Channel control object { broadcast, track, unsubscribe }
 */
export function createGameRoomChannel(
  gameCode: string,
  handlers: GameRoomHandlers = {}
): GameRoomChannel {
  if (!supabase) {
    return {
      broadcast: () => {},
      track: () => {},
      untrack: () => {},
      unsubscribe: () => {}
    };
  }

  const channelName = `game-room-${gameCode}`;

  const channel = supabase.channel(channelName, {
    config: {
      presence: { key: 'user' },
      broadcast: { self: false }
    }
  });

  // Presence tracking (who's in the room)
  if (handlers.onPresence) {
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        handlers.onPresence!(state);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        handlers.onPresence!(null, { type: 'join', key, presences: newPresences });
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        handlers.onPresence!(null, { type: 'leave', key, presences: leftPresences });
      });
  }

  // Broadcast messages
  if (handlers.onBroadcast) {
    channel.on('broadcast', { event: 'game_event' }, (payload) => {
      handlers.onBroadcast!(payload);
    });
  }

  channel.subscribe((status) => {
    logger.log(`[Realtime] Game room ${gameCode} status:`, status);
  });

  activeSubscriptions.set(channelName, channel);

  return {
    broadcast: (event: string, payload: any) => {
      return channel.send({
        type: 'broadcast',
        event: 'game_event',
        payload: { event, ...payload }
      });
    },
    track: (userData: any) => {
      return channel.track(userData);
    },
    untrack: () => {
      return channel.untrack();
    },
    unsubscribe: () => {
      supabase.removeChannel(channel);
      activeSubscriptions.delete(channelName);
    }
  };
}

/**
 * Get all active subscriptions
 * @returns Array of channel names
 */
export function getActiveSubscriptions(): string[] {
  return Array.from(activeSubscriptions.keys());
}

/**
 * Cleanup all active subscriptions
 */
export function cleanupAllSubscriptions(): void {
  logger.log(`[Realtime] Cleaning up ${activeSubscriptions.size} subscriptions`);
  for (const [name, channel] of activeSubscriptions) {
    supabase?.removeChannel(channel);
  }
  activeSubscriptions.clear();
}

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', cleanupAllSubscriptions);
}
