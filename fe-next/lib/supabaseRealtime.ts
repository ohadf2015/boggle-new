/**
 * Supabase Real-time Subscriptions
 * Handles live updates for leaderboard and profile changes
 *
 * Optimizations:
 * - Singleton pattern for shared subscriptions (leaderboard)
 * - Debounced callbacks to prevent excessive refetches
 * - Connection health monitoring with exponential backoff
 * - Proper cleanup and deduplication
 */

import { RealtimeChannel, REALTIME_SUBSCRIBE_STATES } from '@supabase/supabase-js';
import { supabase } from './supabase';
import logger from '@/utils/logger';

// Active subscriptions tracking
const activeSubscriptions = new Map<string, RealtimeChannel>();

// Subscriber callbacks for shared subscriptions
const leaderboardCallbacks = new Set<(payload: any) => void>();
const leaderboardStatusCallbacks = new Set<(status: string) => void>();

// Debounce timers
const debounceTimers = new Map<string, NodeJS.Timeout>();

// Connection state
let connectionRetryCount = 0;
const MAX_RETRY_COUNT = 5;
const BASE_RETRY_DELAY = 1000;

interface SubscriptionOptions {
  onStatusChange?: (status: string) => void;
  debounceMs?: number; // Debounce delay for callbacks
}

/**
 * Calculate exponential backoff delay with jitter
 */
function getRetryDelay(attempt: number): number {
  const exponentialDelay = BASE_RETRY_DELAY * Math.pow(2, attempt);
  const jitter = Math.random() * 1000;
  return Math.min(exponentialDelay + jitter, 30000); // Max 30 seconds
}

/**
 * Debounce helper - coalesces rapid calls into a single call
 */
function debounce(key: string, callback: () => void, delay: number): void {
  const existing = debounceTimers.get(key);
  if (existing) {
    clearTimeout(existing);
  }
  debounceTimers.set(key, setTimeout(() => {
    debounceTimers.delete(key);
    callback();
  }, delay));
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
 * Get or create the shared leaderboard channel (singleton pattern)
 * This ensures only one WebSocket subscription for leaderboard across all consumers
 */
function getOrCreateLeaderboardChannel(): RealtimeChannel | null {
  if (!supabase) {
    logger.warn('[Realtime] Supabase not configured');
    return null;
  }

  const channelName = 'leaderboard-shared';

  // Return existing channel if already created
  if (activeSubscriptions.has(channelName)) {
    return activeSubscriptions.get(channelName)!;
  }

  logger.log('[Realtime] Creating shared leaderboard channel');

  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE', // Only listen to updates, not inserts (new players don't affect existing ranks immediately)
        schema: 'public',
        table: 'leaderboard'
      },
      (payload) => {
        logger.log('[Realtime] Leaderboard update:', payload.eventType);
        // Notify all subscribers with debouncing per callback
        leaderboardCallbacks.forEach(callback => {
          debounce(`leaderboard-callback-${callback.toString().slice(0, 50)}`, () => callback(payload), 500);
        });
      }
    )
    .subscribe((status) => {
      logger.log('[Realtime] Leaderboard subscription status:', status);

      // Handle connection recovery
      if (status === REALTIME_SUBSCRIBE_STATES.CHANNEL_ERROR || status === REALTIME_SUBSCRIBE_STATES.TIMED_OUT) {
        if (connectionRetryCount < MAX_RETRY_COUNT) {
          const delay = getRetryDelay(connectionRetryCount);
          logger.warn(`[Realtime] Leaderboard connection failed, retrying in ${delay}ms (attempt ${connectionRetryCount + 1}/${MAX_RETRY_COUNT})`);
          connectionRetryCount++;
          setTimeout(() => {
            // Remove and recreate channel
            activeSubscriptions.delete(channelName);
            supabase.removeChannel(channel);
            getOrCreateLeaderboardChannel();
          }, delay);
        } else {
          logger.error('[Realtime] Leaderboard connection failed after max retries');
        }
      } else if (status === REALTIME_SUBSCRIBE_STATES.SUBSCRIBED) {
        connectionRetryCount = 0; // Reset on successful connection
      }

      // Notify all status subscribers
      leaderboardStatusCallbacks.forEach(callback => callback(status));
    });

  activeSubscriptions.set(channelName, channel);
  return channel;
}

/**
 * Subscribe to leaderboard changes (uses shared singleton channel)
 * Multiple consumers share the same WebSocket subscription
 *
 * @param onUpdate - Callback when leaderboard changes (debounced by default)
 * @param options - Subscription options
 * @returns Unsubscribe function
 */
export function subscribeToLeaderboard(
  onUpdate: (payload: any) => void,
  options: SubscriptionOptions = {}
): () => void {
  const channel = getOrCreateLeaderboardChannel();

  if (!channel) {
    return () => {};
  }

  // Add callback to the set
  leaderboardCallbacks.add(onUpdate);

  if (options.onStatusChange) {
    leaderboardStatusCallbacks.add(options.onStatusChange);
  }

  return () => {
    logger.log('[Realtime] Removing leaderboard subscriber');
    leaderboardCallbacks.delete(onUpdate);

    if (options.onStatusChange) {
      leaderboardStatusCallbacks.delete(options.onStatusChange);
    }

    // Only remove the channel if no more subscribers
    if (leaderboardCallbacks.size === 0) {
      logger.log('[Realtime] No more leaderboard subscribers, cleaning up channel');
      const channelName = 'leaderboard-shared';
      const existingChannel = activeSubscriptions.get(channelName);
      if (existingChannel && supabase) {
        supabase.removeChannel(existingChannel);
        activeSubscriptions.delete(channelName);
      }
    }
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

  // Clear all debounce timers
  debounceTimers.forEach((timer) => {
    clearTimeout(timer);
  });
  debounceTimers.clear();

  // Clear callback sets
  leaderboardCallbacks.clear();
  leaderboardStatusCallbacks.clear();

  // Remove all channels
  activeSubscriptions.forEach((channel) => {
    supabase?.removeChannel(channel);
  });
  activeSubscriptions.clear();

  // Reset connection state
  connectionRetryCount = 0;
}

/**
 * Get subscription statistics for monitoring
 */
export function getSubscriptionStats(): {
  activeChannels: number;
  leaderboardSubscribers: number;
  pendingDebounces: number;
} {
  return {
    activeChannels: activeSubscriptions.size,
    leaderboardSubscribers: leaderboardCallbacks.size,
    pendingDebounces: debounceTimers.size
  };
}

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', cleanupAllSubscriptions);
}
