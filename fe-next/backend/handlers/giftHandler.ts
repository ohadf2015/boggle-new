/**
 * Gift Handler
 * Socket handler for social gifting (send/receive gifts between players).
 */

import { z } from 'zod';
import type { Server, Socket } from 'socket.io';
import {
  canSendGift,
  validateGift,
  calculateGiftXP,
  GIFT_TYPES,
  DAILY_GIFT_LIMIT,
  type GiftType,
} from '@/shared/utils/giftingRules';
import { getAuthUserId, broadcastToUser, getUserProfile } from '../utils/socialHelpers';
import { areFriends, isBlocked } from '../modules/friendsManager';
import { getSupabase } from '../modules/supabaseServer';
import { notifyGiftReceived } from '../modules/pushNotificationTriggers';
import logger from '../utils/logger';
import { validatePayload } from '../utils/socketValidation.js';
import { checkRateLimit } from '../utils/rateLimiter.js';

// In-memory dedup: prevent double-click double-spend within 5s window
const recentGifts = new Map<string, number>();
const GIFT_DEDUP_WINDOW_MS = 5000;

// Per-sender in-flight lock: prevents TOCTOU on daily limit check
// by ensuring only one gift operation per sender at a time
const sendersInFlight = new Set<string>();

function dedupKey(senderId: string, recipientId: string, giftType: string): string {
  return `${senderId}:${recipientId}:${giftType}`;
}

function wasRecentlySent(senderId: string, recipientId: string, giftType: string): boolean {
  const lastSent = recentGifts.get(dedupKey(senderId, recipientId, giftType));
  return !!lastSent && Date.now() - lastSent < GIFT_DEDUP_WINDOW_MS;
}

function markGiftSent(senderId: string, recipientId: string, giftType: string): void {
  recentGifts.set(dedupKey(senderId, recipientId, giftType), Date.now());
  if (recentGifts.size > 500) {
    const now = Date.now();
    for (const [k, ts] of recentGifts) {
      if (now - ts > GIFT_DEDUP_WINDOW_MS) recentGifts.delete(k);
    }
  }
}

/** Clear dedup cache (for testing) */
export function clearGiftDedup(): void {
  recentGifts.clear();
}

interface GiftSendParams {
  recipientId: string;
  giftType: GiftType;
  amount?: number;
}

const giftSendSchema = z.object({
  recipientId: z.string().min(1),
  giftType: z.enum(['hints', 'streak_freeze', 'coins']),
  amount: z.number().int().positive().optional(),
});

interface GiftResult {
  success: boolean;
  error?: string;
  costDeducted?: number;
  xpAwarded?: number;
}

export async function handleGiftSend(
  socket: Socket,
  io: Server,
  params: GiftSendParams
): Promise<GiftResult> {
  const senderId = getAuthUserId(socket);

  if (!senderId) {
    return { success: false, error: 'Must be authenticated to send gifts' };
  }

  // Per-sender lock: only one gift operation at a time to prevent TOCTOU on daily limit
  if (sendersInFlight.has(senderId)) {
    return { success: false, error: 'Gift already processing, please wait' };
  }
  sendersInFlight.add(senderId);

  try {
    return await handleGiftSendInner(senderId, params, socket, io);
  } finally {
    sendersInFlight.delete(senderId);
  }
}

async function handleGiftSendInner(
  senderId: string,
  params: GiftSendParams,
  socket: Socket,
  io: Server
): Promise<GiftResult> {
  // Dedup: reject rapid duplicate gifts (same sender→recipient→type within 5s).
  // Peek only — commit the marker after successful RPC so failed sends can be retried.
  if (wasRecentlySent(senderId, params.recipientId, params.giftType)) {
    return { success: false, error: 'Gift already processing, please wait' };
  }

  // Cannot gift yourself
  if (params.recipientId === senderId) {
    return { success: false, error: 'Cannot send gift to yourself' };
  }

  // Must be friends and not blocked
  const [isFriend, blocked] = await Promise.all([
    areFriends(senderId, params.recipientId),
    isBlocked(senderId, params.recipientId),
  ]);
  if (blocked) {
    return { success: false, error: 'Cannot send gift to blocked user' };
  }
  if (!isFriend) {
    return { success: false, error: 'Can only send gifts to friends' };
  }

  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, error: 'Database unavailable' };
  }

  // Server-side balance lookup
  const { data: senderProfile } = await supabase
    .from('profiles')
    .select('total_coins')
    .eq('id', senderId)
    .single();

  if (!senderProfile) {
    return { success: false, error: 'Sender profile not found' };
  }

  // Server-side daily gift count
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const { count: giftsToday } = await supabase
    .from('gift_history')
    .select('id', { count: 'exact', head: true })
    .eq('sender_id', senderId)
    .gte('created_at', today.toISOString());

  const serverGiftsToday = giftsToday ?? 0;

  // Check daily limit
  if (!canSendGift(serverGiftsToday)) {
    return { success: false, error: 'Daily gift limit reached' };
  }

  // Validate gift against server-side balance
  const serverBalance = senderProfile.total_coins ?? 0;
  const validation = validateGift(
    { type: params.giftType, amount: params.amount },
    serverBalance
  );
  if (!validation.valid) {
    return { success: false, error: validation.error || 'Insufficient balance' };
  }

  // Calculate cost
  const cost = params.giftType === 'coins'
    ? params.amount!
    : GIFT_TYPES[params.giftType].cost;

  const xp = calculateGiftXP(params.giftType);

  // Persist: deduct from sender, credit recipient, record history
  const { error: deductError } = await supabase.rpc('process_gift', {
    p_sender_id: senderId,
    p_recipient_id: params.recipientId,
    p_gift_type: params.giftType,
    p_amount: params.amount ?? 1,
    p_cost: cost,
    p_xp: xp,
  });

  if (deductError) {
    logger.error('GIFT', `Failed to process gift: ${deductError.message}`);
    return { success: false, error: 'Failed to process gift' };
  }

  // Commit dedup marker only after RPC success — prevents retry-block on failures.
  markGiftSent(senderId, params.recipientId, params.giftType);

  logger.info('GIFT', `${senderId} sent ${params.giftType} to ${params.recipientId}`);

  // Get sender profile for notification
  const senderInfo = await getUserProfile(senderId);

  // Emit gift:receive to recipient via user room (not raw socket ID)
  broadcastToUser(io, params.recipientId, 'gift:receive', {
    senderId,
    senderName: senderInfo?.username ?? 'Unknown',
    giftType: params.giftType,
    amount: params.amount,
  });

  // Push notification for offline recipients
  notifyGiftReceived(
    params.recipientId,
    senderInfo?.username ?? 'Someone',
    params.giftType,
    senderId
  ).catch(() => {});

  return {
    success: true,
    costDeducted: cost,
    xpAwarded: xp,
  };
}

/**
 * Register gift socket event handlers
 */
export function registerGiftHandlers(io: Server, socket: Socket): void {
  // Return how many gifts the user has sent today
  socket.on('gift:getDailyCount', async () => {
    // Light weight: read-only Supabase count query, but spammable → DB hammer.
    if (!checkRateLimit(socket.id)) return;
    const senderId = getAuthUserId(socket);
    if (!senderId) return;
    try {
      const supabase = getSupabase();
      if (!supabase) { socket.emit('gift:dailyCount', { count: 0 }); return; }
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count } = await supabase
        .from('gift_history')
        .select('id', { count: 'exact', head: true })
        .eq('sender_id', senderId)
        .gte('created_at', today.toISOString());
      socket.emit('gift:dailyCount', { count: count ?? 0 });
    } catch {
      socket.emit('gift:dailyCount', { count: 0 });
    }
  });

  socket.on('gift:send', async (data: GiftSendParams) => {
    try {
      if (!checkRateLimit(socket.id)) {
        socket.emit('gift:sendResult', { success: false, error: 'Too many requests' });
        return;
      }
      const validation = validatePayload(giftSendSchema, data);
      if (!validation.success) {
        socket.emit('gift:sendResult', { success: false, error: `Invalid request: ${validation.error}` });
        return;
      }
      const validatedData = validation.data as GiftSendParams;
      const result = await handleGiftSend(socket, io, validatedData);
      socket.emit('gift:sendResult', result);
    } catch (error: unknown) {
      const err = error as Error;
      logger.error('GIFT', `gift:send handler failed: ${err.message}`);
      socket.emit('gift:sendResult', { success: false, error: 'Internal error' });
    }
  });
}
