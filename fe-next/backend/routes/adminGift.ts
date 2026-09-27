/**
 * Admin Gift Routes
 * Handles /api/admin/gift/* endpoints for sending gifts to players
 */

import express, { Request, Response, Router } from 'express';
import { z } from 'zod';
import logger from '../utils/logger';
import { pushNotificationService, GiftNotificationData } from '../services/pushNotificationService';

const { getSupabase } = require('../modules/supabaseServer');

const router: Router = express.Router();

// ==================== Types ====================

interface AdminUser {
  id: string;
  email: string;
  username?: string;
}

interface AdminRequest extends Request {
  requestId?: string;
  adminUser?: AdminUser;
}

interface GiftMessage {
  id: string;
  recipient_id: string;
  sender_id: string;
  title: string;
  message: string;
  template_type: string | null;
  image_url: string | null;
  xp_amount: number;
  coin_amount: number;
  claimed: boolean;
  claimed_at: string | null;
  created_at: string;
  updated_at: string;
  recipient?: {
    username: string;
    display_name: string | null;
    avatar_emoji: string | null;
    avatar_color: string | null;
  };
  sender?: {
    username: string;
    display_name: string | null;
  };
}

// ==================== Validation Schemas ====================

const sendGiftSchema = z.object({
  recipientIds: z.array(z.string().uuid()).min(1).max(50),
  title: z.string().min(1).max(100),
  message: z.string().min(1).max(2000),
  templateType: z.enum(['top_player', 'feedback_request', 'thank_you', 'custom']).optional(),
  xpAmount: z.number().int().min(0).max(10000).default(0),
  coinAmount: z.number().int().min(0).max(10000).default(0),
  imageUrl: z.string().url().max(500).optional().nullable(),
  badgeId: z.string().max(100).optional().nullable(),
});

// Auth + rate limiting are applied by the parent admin router (admin/index.ts)
// Do NOT add duplicate adminAuth here — it would bypass RBAC and admin rate limiting.

// ==================== Routes ====================

/**
 * POST /api/admin/gift/send
 * Send gift messages to one or more players
 */
router.post('/send', async (req: AdminRequest, res: Response): Promise<void> => {
  const { requestId, adminUser } = req;

  try {
    const validation = sendGiftSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        error: 'Invalid request body',
        details: validation.error.issues,
        requestId,
      });
      return;
    }

    const { recipientIds, title, message, templateType, xpAmount, coinAmount, imageUrl, badgeId } = validation.data;

    if (!adminUser) {
      res.status(401).json({ error: 'Not authenticated', requestId });
      return;
    }

    const supabase = getSupabase();

    // Verify all recipients exist
    const { data: recipients, error: recipientError } = await supabase
      .from('profiles')
      .select('id, username')
      .in('id', recipientIds);

    if (recipientError) {
      logger.error('ADMIN_GIFT', `Failed to verify recipients: ${recipientError.message} [${requestId}]`);
      res.status(500).json({ error: 'Failed to verify recipients', requestId });
      return;
    }

    const validRecipientIds = new Set(recipients?.map((r: { id: string }) => r.id) || []);
    const invalidIds = recipientIds.filter(id => !validRecipientIds.has(id));

    if (invalidIds.length > 0) {
      res.status(400).json({
        error: 'Some recipient IDs are invalid',
        invalidIds,
        requestId,
      });
      return;
    }

    // Insert gift messages for each recipient
    const giftMessages = recipientIds.map(recipientId => ({
      recipient_id: recipientId,
      sender_id: adminUser.id,
      title,
      message,
      template_type: templateType || 'custom',
      image_url: imageUrl || null,
      xp_amount: xpAmount,
      coin_amount: coinAmount,
      badge_id: badgeId || null,
    }));

    const { data: insertedGifts, error: insertError } = await supabase
      .from('admin_gift_messages')
      .insert(giftMessages)
      .select('id, recipient_id');

    if (insertError) {
      logger.error('ADMIN_GIFT', `Failed to insert gifts: ${insertError.message} [${requestId}]`);
      res.status(500).json({ error: 'Failed to send gifts', requestId });
      return;
    }

    // Send push notifications to recipients (async, non-blocking)
    const giftNotifications: GiftNotificationData[] = (insertedGifts || []).map((gift: { id: string; recipient_id: string }) => ({
      recipientId: gift.recipient_id,
      giftId: gift.id,
      senderName: adminUser.username || 'Admin',
      title,
      xpAmount,
      coinAmount,
      badgeId: badgeId || undefined,
    }));

    // Fire and forget - don't wait for push delivery
    pushNotificationService.sendGiftNotifications(giftNotifications).catch((err: Error) => {
      logger.error('ADMIN_GIFT', `Push notification error: ${err.message} [${requestId}]`);
    });

    logger.info('ADMIN_GIFT', JSON.stringify({
      action: 'gifts_sent',
      adminId: adminUser.id,
      adminEmail: adminUser.email,
      recipientCount: recipientIds.length,
      xpAmount,
      coinAmount,
      badgeId: badgeId || null,
      templateType: templateType || 'custom',
      requestId,
    }));

    res.json({
      success: true,
      sentCount: insertedGifts?.length || 0,
      gifts: insertedGifts,
      requestId,
    });

  } catch (error) {
    const err = error as Error;
    logger.error('ADMIN_GIFT', `Send gift error: ${err.message} [${requestId}]`);
    res.status(500).json({ error: 'Failed to send gift', requestId });
  }
});

/**
 * GET /api/admin/gift/history
 * Get gift message history with pagination and filters
 */
router.get('/history', async (req: AdminRequest, res: Response): Promise<void> => {
  const { requestId } = req;

  try {
    const supabase = getSupabase();
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const offset = (page - 1) * limit;
    const recipientId = req.query.recipientId as string | undefined;
    const claimed = req.query.claimed as string | undefined;

    let query = supabase
      .from('admin_gift_messages')
      .select(`
        *,
        recipient:profiles!admin_gift_messages_recipient_id_fkey(username, display_name, avatar_emoji, avatar_color),
        sender:profiles!admin_gift_messages_sender_id_fkey(username, display_name)
      `, { count: 'exact' })
      .order('created_at', { ascending: false });

    if (recipientId) {
      query = query.eq('recipient_id', recipientId);
    }

    if (claimed === 'true') {
      query = query.eq('claimed', true);
    } else if (claimed === 'false') {
      query = query.eq('claimed', false);
    }

    query = query.range(offset, offset + limit - 1);

    const { data: gifts, error, count } = await query;

    if (error) {
      logger.error('ADMIN_GIFT', `Failed to fetch history: ${error.message} [${requestId}]`);
      res.status(500).json({ error: 'Failed to fetch gift history', requestId });
      return;
    }

    res.json({
      gifts: gifts as GiftMessage[],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
        hasMore: (count || 0) > offset + limit,
      },
      requestId,
    });

  } catch (error) {
    const err = error as Error;
    logger.error('ADMIN_GIFT', `History error: ${err.message} [${requestId}]`);
    res.status(500).json({ error: 'Failed to fetch gift history', requestId });
  }
});

/**
 * GET /api/admin/gift/stats
 * Get gift statistics
 */
router.get('/stats', async (req: AdminRequest, res: Response): Promise<void> => {
  const { requestId } = req;

  try {
    const supabase = getSupabase();

    // Get total gifts sent
    const { count: totalGifts } = await supabase
      .from('admin_gift_messages')
      .select('*', { count: 'exact', head: true });

    // Get unclaimed gifts
    const { count: unclaimedGifts } = await supabase
      .from('admin_gift_messages')
      .select('*', { count: 'exact', head: true })
      .eq('claimed', false);

    // Get total XP and coins awarded
    const { data: totals } = await supabase
      .from('admin_gift_messages')
      .select('xp_amount, coin_amount')
      .eq('claimed', true);

    const totalXpAwarded = totals?.reduce((sum: number, g: { xp_amount: number }) => sum + g.xp_amount, 0) || 0;
    const totalCoinsAwarded = totals?.reduce((sum: number, g: { coin_amount: number }) => sum + g.coin_amount, 0) || 0;

    res.json({
      totalGifts: totalGifts || 0,
      claimedGifts: (totalGifts || 0) - (unclaimedGifts || 0),
      unclaimedGifts: unclaimedGifts || 0,
      totalXpAwarded,
      totalCoinsAwarded,
      requestId,
    });

  } catch (error) {
    const err = error as Error;
    logger.error('ADMIN_GIFT', `Stats error: ${err.message} [${requestId}]`);
    res.status(500).json({ error: 'Failed to fetch gift stats', requestId });
  }
});

/**
 * DELETE /api/admin/gift/:id
 * Delete an unclaimed gift
 */
router.delete('/:id', async (req: AdminRequest, res: Response): Promise<void> => {
  const { requestId, adminUser } = req;
  const giftId = req.params.id;

  try {
    const supabase = getSupabase();

    // Check if gift exists and is unclaimed
    const { data: gift, error: fetchError } = await supabase
      .from('admin_gift_messages')
      .select('id, claimed, recipient_id')
      .eq('id', giftId)
      .single();

    if (fetchError || !gift) {
      res.status(404).json({ error: 'Gift not found', requestId });
      return;
    }

    if (gift.claimed) {
      res.status(400).json({ error: 'Cannot delete a claimed gift', requestId });
      return;
    }

    const { error: deleteError } = await supabase
      .from('admin_gift_messages')
      .delete()
      .eq('id', giftId);

    if (deleteError) {
      logger.error('ADMIN_GIFT', `Failed to delete gift: ${deleteError.message} [${requestId}]`);
      res.status(500).json({ error: 'Failed to delete gift', requestId });
      return;
    }

    logger.info('ADMIN_GIFT', JSON.stringify({
      action: 'gift_deleted',
      adminId: adminUser?.id,
      giftId,
      recipientId: gift.recipient_id,
      requestId,
    }));

    res.json({ success: true, requestId });

  } catch (error) {
    const err = error as Error;
    logger.error('ADMIN_GIFT', `Delete error: ${err.message} [${requestId}]`);
    res.status(500).json({ error: 'Failed to delete gift', requestId });
  }
});

export default router;
