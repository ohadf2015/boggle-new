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

import {
  RealtimeChannel,
  REALTIME_SUBSCRIBE_STATES,
  type RealtimePostgresChangesPayload,
  type RealtimePresenceState,
  type RealtimeChannelSendResponse,
} from '@supabase/supabase-js';
import { supabase } from './supabase';
import logger from '@/utils/logger';

// Minimal row shapes — only fields this module reads. Full DB types live server-side.
interface LeaderboardRow {
  username?: string;
  player_id?: string;
  score?: number;
  [key: string]: unknown;
}
interface ProfileRow {
  id?: string;
  [key: string]: unknown;
}
interface GameResultRow {
  player_id?: string;
  [key: string]: unknown;
}
interface StudentProgressRow {
  student_id?: string;
  [key: string]: unknown;
}

type LeaderboardPayload = RealtimePostgresChangesPayload<LeaderboardRow>;
type ProfilePayload = RealtimePostgresChangesPayload<ProfileRow>;
type GameResultPayload = RealtimePostgresChangesPayload<GameResultRow>;
type StudentProgressPayload = RealtimePostgresChangesPayload<StudentProgressRow>;

export interface ClassroomProgressUpdate {
  studentId: string | undefined;
  eventType: string;
  data: StudentProgressRow | Record<string, never>;
}

export interface GameRoomBroadcastPayload {
  event: string;
  type?: string;
  payload?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface GameRoomPresenceEvent {
  type: 'join' | 'leave';
  key: string;
  presences: Array<Record<string, unknown>>;
}

// Active subscriptions tracking
const activeSubscriptions = new Map<string, RealtimeChannel>();

// Subscriber callbacks for shared subscriptions
const leaderboardCallbacks = new Set<(payload: LeaderboardPayload) => void>();
const leaderboardStatusCallbacks = new Set<(status: string) => void>();

// Subscriber callbacks for classroom progress
const classroomProgressCallbacks = new Map<string, Set<(payload: ClassroomProgressUpdate) => void>>();
const classroomProgressStatusCallbacks = new Map<string, Set<(status: string) => void>>();

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
  onPresence?: (
    state: RealtimePresenceState | null,
    event?: GameRoomPresenceEvent,
  ) => void;
  onBroadcast?: (payload: GameRoomBroadcastPayload) => void;
}

// supabase-js types send/track/untrack as RealtimeChannelSendResponse, which is
// the three literals WIDENED with `(string & {})`. Re-declaring just the
// literals here made every one of these assignments a type error, so mirror the
// library's type instead of narrowing it.
interface GameRoomChannel {
  broadcast: (event: string, payload: Record<string, unknown>) => Promise<RealtimeChannelSendResponse> | void;
  track: (userData: Record<string, unknown>) => Promise<RealtimeChannelSendResponse> | void;
  untrack: () => Promise<RealtimeChannelSendResponse> | void;
  unsubscribe: () => void;
}

/**
 * Get or create the shared classroom progress channel (singleton pattern per classroom)
 * This ensures only one WebSocket subscription per classroom across all consumers
 */
function getOrCreateClassroomProgressChannel(classroomId: string): RealtimeChannel | null {
  if (!supabase) {
    logger.warn('[Realtime] Supabase not configured');
    return null;
  }

  const channelName = `classroom-progress-${classroomId}`;

  // Return existing channel if already created
  if (activeSubscriptions.has(channelName)) {
    return activeSubscriptions.get(channelName)!;
  }

  logger.log('[Realtime] Creating classroom progress channel:', classroomId);

  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: '*', // Listen to all events: INSERT (new progress), UPDATE (progress updates), DELETE
        schema: 'public',
        table: 'student_lesson_progress'
      },
      (payload: StudentProgressPayload) => {
        if (!payload) return;
        logger.log('[Realtime] Classroom progress change:', payload.eventType, payload.new);

        // Get callbacks for this classroom
        const callbacks = classroomProgressCallbacks.get(classroomId);
        if (!callbacks) return;

        // Extract student ID from payload — `new`/`old` are empty objects for the opposite event
        const newRow = payload.new as StudentProgressRow | Record<string, never>;
        const oldRow = payload.old as StudentProgressRow | Record<string, never>;
        const studentId =
          ('student_id' in newRow ? newRow.student_id : undefined) ??
          ('student_id' in oldRow ? oldRow.student_id : undefined);

        // Notify all subscribers with debouncing per callback
        callbacks.forEach(callback => {
          const debounceKey = `classroom-${classroomId}-callback-${callback.toString().slice(0, 50)}`;
          debounce(debounceKey, () => {
            callback({
              studentId,
              eventType: payload.eventType,
              data: 'student_id' in newRow ? newRow : oldRow,
            });
          }, 500);
        });
      }
    )
    .subscribe((status) => {
      logger.log('[Realtime] Classroom progress subscription status:', classroomId, status);

      // Handle connection recovery
      if (status === REALTIME_SUBSCRIBE_STATES.CHANNEL_ERROR || status === REALTIME_SUBSCRIBE_STATES.TIMED_OUT) {
        if (connectionRetryCount < MAX_RETRY_COUNT) {
          const delay = getRetryDelay(connectionRetryCount);
          logger.info(`[Realtime] Classroom progress connection failed, retrying in ${delay}ms (attempt ${connectionRetryCount + 1}/${MAX_RETRY_COUNT})`);
          connectionRetryCount++;
          setTimeout(() => {
            // Remove and recreate channel
            activeSubscriptions.delete(channelName);
            supabase?.removeChannel(channel);
            getOrCreateClassroomProgressChannel(classroomId);
          }, delay);
        } else {
          logger.error('[Realtime] Classroom progress connection failed after max retries');
        }
      } else if (status === REALTIME_SUBSCRIBE_STATES.SUBSCRIBED) {
        connectionRetryCount = 0; // Reset on successful connection
      }

      // Notify all status subscribers for this classroom
      const statusCallbacks = classroomProgressStatusCallbacks.get(classroomId);
      statusCallbacks?.forEach(callback => callback(status));
    });

  activeSubscriptions.set(channelName, channel);
  return channel;
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
        event: '*', // Listen to all events: INSERT (new players), UPDATE (score changes), DELETE
        schema: 'public',
        table: 'leaderboard'
      },
      (payload: LeaderboardPayload) => {
        if (!payload) return;
        const newRow = payload.new as LeaderboardRow | Record<string, never>;
        logger.log(
          '[Realtime] Leaderboard change:',
          payload.eventType,
          'username' in newRow ? `player: ${newRow.username}` : '',
        );
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
          logger.info(`[Realtime] Leaderboard connection failed, retrying in ${delay}ms (attempt ${connectionRetryCount + 1}/${MAX_RETRY_COUNT})`);
          connectionRetryCount++;
          setTimeout(() => {
            // Remove and recreate channel
            activeSubscriptions.delete(channelName);
            supabase?.removeChannel(channel);
            getOrCreateLeaderboardChannel();
          }, delay);
        } else {
          logger.warn('[Realtime] Leaderboard connection failed after max retries');
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
 * Subscribe to classroom student progress changes (uses shared singleton channel per classroom)
 * Multiple consumers for the same classroom share the same WebSocket subscription
 *
 * @param classroomId - Classroom ID to watch
 * @param onUpdate - Callback when any student's progress changes (debounced by default)
 * @param options - Subscription options
 * @returns Unsubscribe function
 */
export function subscribeToClassroomProgress(
  classroomId: string,
  onUpdate: (payload: ClassroomProgressUpdate) => void,
  options: SubscriptionOptions = {}
): () => void {
  const channel = getOrCreateClassroomProgressChannel(classroomId);

  if (!channel) {
    return () => {};
  }

  // Get or create callback set for this classroom
  if (!classroomProgressCallbacks.has(classroomId)) {
    classroomProgressCallbacks.set(classroomId, new Set());
  }
  const callbacks = classroomProgressCallbacks.get(classroomId)!;

  // Add callback to the set
  callbacks.add(onUpdate);

  // Add status callback if provided
  if (options.onStatusChange) {
    if (!classroomProgressStatusCallbacks.has(classroomId)) {
      classroomProgressStatusCallbacks.set(classroomId, new Set());
    }
    classroomProgressStatusCallbacks.get(classroomId)!.add(options.onStatusChange);
  }

  return () => {
    logger.log('[Realtime] Removing classroom progress subscriber:', classroomId);
    callbacks.delete(onUpdate);

    if (options.onStatusChange) {
      classroomProgressStatusCallbacks.get(classroomId)?.delete(options.onStatusChange);
    }

    // Only remove the channel if no more subscribers for this classroom
    if (callbacks.size === 0) {
      logger.log('[Realtime] No more classroom progress subscribers, cleaning up channel:', classroomId);
      const channelName = `classroom-progress-${classroomId}`;
      const existingChannel = activeSubscriptions.get(channelName);
      if (existingChannel && supabase) {
        supabase?.removeChannel(existingChannel);
        activeSubscriptions.delete(channelName);
        classroomProgressCallbacks.delete(classroomId);
        classroomProgressStatusCallbacks.delete(classroomId);
      }
    }
  };
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
  onUpdate: (payload: LeaderboardPayload) => void,
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
        supabase?.removeChannel(existingChannel);
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
  onUpdate: (profile: ProfileRow) => void
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
        supabase?.removeChannel(existing);
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
      (payload: ProfilePayload) => {
        if (!payload) return;
        logger.log('[Realtime] Profile updated:', payload.new);
        onUpdate(payload.new as ProfileRow);
      }
    )
    .subscribe((status) => {
      logger.log('[Realtime] Profile subscription status:', status);
    });

  activeSubscriptions.set(channelName, channel);

  return () => {
    logger.log('[Realtime] Unsubscribing from profile');
    supabase?.removeChannel(channel);
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
  onNewResult: (result: GameResultRow) => void
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
      (payload: GameResultPayload) => {
        if (!payload) return;
        logger.log('[Realtime] New game result:', payload.new);
        onNewResult(payload.new as GameResultRow);
      }
    )
    .subscribe();

  activeSubscriptions.set(channelName, channel);

  return () => {
    supabase?.removeChannel(channel);
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
        handlers.onPresence!(null, {
          type: 'join',
          key,
          presences: newPresences as Array<Record<string, unknown>>,
        });
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        handlers.onPresence!(null, {
          type: 'leave',
          key,
          presences: leftPresences as Array<Record<string, unknown>>,
        });
      });
  }

  // Broadcast messages
  if (handlers.onBroadcast) {
    channel.on('broadcast', { event: 'game_event' }, (payload) => {
      handlers.onBroadcast!(payload as GameRoomBroadcastPayload);
    });
  }

  channel.subscribe((status) => {
    logger.log(`[Realtime] Game room ${gameCode} status:`, status);
  });

  activeSubscriptions.set(channelName, channel);

  return {
    broadcast: (event: string, payload: Record<string, unknown>) => {
      return channel.send({
        type: 'broadcast',
        event: 'game_event',
        payload: { event, ...payload }
      });
    },
    track: (userData: Record<string, unknown>) => {
      return channel.track(userData);
    },
    untrack: () => {
      return channel.untrack();
    },
    unsubscribe: () => {
      supabase?.removeChannel(channel);
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
  classroomProgressCallbacks.clear();
  classroomProgressStatusCallbacks.clear();

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
  classroomProgressSubscribers: number;
  pendingDebounces: number;
} {
  let classroomProgressTotal = 0;
  classroomProgressCallbacks.forEach(callbacks => {
    classroomProgressTotal += callbacks.size;
  });

  return {
    activeChannels: activeSubscriptions.size,
    leaderboardSubscribers: leaderboardCallbacks.size,
    classroomProgressSubscribers: classroomProgressTotal,
    pendingDebounces: debounceTimers.size
  };
}

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', cleanupAllSubscriptions);
}
