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
  type GiftType,
} from '@/shared/utils/giftingRules';
import logger from '../utils/logger';

interface GiftSendParams {
  recipientId: string;
  giftType: GiftType;
  amount?: number;
  giftsToday: number;
  senderBalance: number;
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
  const senderId = socket.data?.userId;

  // Cannot gift yourself
  if (params.recipientId === senderId) {
    return { success: false, error: 'Cannot send gift to yourself' };
  }

  // Check daily limit
  if (!canSendGift(params.giftsToday)) {
    return { success: false, error: 'Daily gift limit reached' };
  }

  // Validate gift
  const validation = validateGift(
    { type: params.giftType, amount: params.amount },
    params.senderBalance
  );
  if (!validation.valid) {
    return { success: false, error: validation.error || 'Insufficient balance' };
  }

  // Calculate cost
  const cost = params.giftType === 'coins'
    ? params.amount!
    : GIFT_TYPES[params.giftType].cost;

  const xp = calculateGiftXP(params.giftType);

  logger.info('GIFT', `${senderId} sent ${params.giftType} to ${params.recipientId}`);

  // Emit gift:receive to recipient
  io.to(params.recipientId).emit('gift:receive', {
    senderId,
    senderName: socket.data?.username,
    giftType: params.giftType,
    amount: params.amount,
  });

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
