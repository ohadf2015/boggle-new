/**
 * Gift Handler
 * Socket handler for social gifting (send/receive gifts between players).
 */

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

interface GiftSendParams {
  recipientId: string;
  giftType: GiftType;
  amount?: number;
}

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
  socket.on('gift:send', async (data: GiftSendParams) => {
    const result = await handleGiftSend(socket, io, data);
    socket.emit('gift:sendResult', result);
  });
}
