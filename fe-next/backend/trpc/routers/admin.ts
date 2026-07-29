import { z } from 'zod';
import { router, loggedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import logger from '../../utils/logger';
import { pushNotificationService, type GiftNotificationData, type NotificationPayload } from '../../services/pushNotificationService';

const { getSupabase, isSupabaseConfigured } = require('../../modules/supabaseServer');

// ==================== Admin middleware ====================

const adminProcedure = loggedProcedure.use(async ({ ctx, next }) => {
  const adminKey = ctx.req.headers['x-admin-key'] as string | undefined;
  const expectedKey = process.env.ADMIN_API_KEY;
  if (!expectedKey || !adminKey || adminKey !== expectedKey) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Admin access required' });
  }
  return next();
});

function ensureSupabase() {
  if (!isSupabaseConfigured()) {
    throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Database not available' });
  }
  return getSupabase();
}

// ==================== Schemas ====================

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

const giftHistorySchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(50).default(20),
  recipientId: z.string().uuid().optional(),
  claimed: z.enum(['true', 'false']).optional(),
});

const deleteGiftSchema = z.object({
  id: z.string().uuid(),
});

const sendNotificationSchema = z.object({
  recipientIds: z.array(z.string().uuid()).min(1).max(100),
  title: z.string().min(1).max(100),
  body: z.string().min(1).max(500),
  notificationType: z.enum(['gift', 'system', 'achievement', 'social', 'marketing']).default('system'),
  imageUrl: z.string().url().max(500).optional().nullable(),
  actionUrl: z.string().max(200).optional().nullable(),
});

const notificationHistorySchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(50).default(20),
  type: z.string().optional(),
});

// ==================== Router ====================

export const adminRouter = router({
  // ---- Gift procedures ----

  sendGift: adminProcedure
    .input(sendGiftSchema)
    .mutation(async ({ input }) => {
      const supabase = ensureSupabase();
      const { recipientIds, title, message, templateType, xpAmount, coinAmount, imageUrl, badgeId } = input;

      // Verify recipients exist
      const { data: recipients, error: recipientError } = await supabase
        .from('profiles')
        .select('id, username')
        .in('id', recipientIds);

      if (recipientError) {
        logger.error('ADMIN_TRPC', `Failed to verify recipients: ${recipientError.message}`);
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to verify recipients' });
      }

      const validIds = new Set((recipients || []).map((r: { id: string }) => r.id));
      const invalidIds = recipientIds.filter(id => !validIds.has(id));
      if (invalidIds.length > 0) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Some recipient IDs are invalid', cause: { invalidIds } });
      }

      const giftMessages = recipientIds.map(recipientId => ({
        recipient_id: recipientId,
        sender_id: 'system',
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
        logger.error('ADMIN_TRPC', `Failed to insert gifts: ${insertError.message}`);
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to send gifts' });
      }

      // Fire-and-forget push notifications
      const giftNotifications: GiftNotificationData[] = (insertedGifts || []).map(
        (gift: { id: string; recipient_id: string }) => ({
          recipientId: gift.recipient_id,
          giftId: gift.id,
          senderName: 'Admin',
          title,
          xpAmount,
          coinAmount,
          badgeId: badgeId || undefined,
        }),
      );
      pushNotificationService.sendGiftNotifications(giftNotifications).catch((err: Error) => {
        logger.error('ADMIN_TRPC', `Push notification error: ${err.message}`);
      });

      logger.info('ADMIN_TRPC', JSON.stringify({
        action: 'gifts_sent', recipientCount: recipientIds.length, xpAmount, coinAmount,
      }));

      return { success: true, sentCount: insertedGifts?.length || 0, gifts: insertedGifts };
    }),

  giftHistory: adminProcedure
    .input(giftHistorySchema)
    .query(async ({ input }) => {
      const supabase = ensureSupabase();
      const { page, limit, recipientId, claimed } = input;
      const offset = (page - 1) * limit;

      let query = supabase
        .from('admin_gift_messages')
        .select(`
          *,
          recipient:profiles!admin_gift_messages_recipient_id_fkey(username, display_name, avatar_emoji, avatar_color),
          sender:profiles!admin_gift_messages_sender_id_fkey(username, display_name)
        `, { count: 'exact' })
        .order('created_at', { ascending: false });

      if (recipientId) query = query.eq('recipient_id', recipientId);
      if (claimed === 'true') query = query.eq('claimed', true);
      else if (claimed === 'false') query = query.eq('claimed', false);

      query = query.range(offset, offset + limit - 1);
      const { data: gifts, error, count } = await query;

      if (error) {
        logger.error('ADMIN_TRPC', `Gift history error: ${error.message}`);
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch gift history' });
      }

      return {
        gifts: gifts || [],
        pagination: {
          page, limit, total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
          hasMore: (count || 0) > offset + limit,
        },
      };
    }),

  giftStats: adminProcedure.query(async () => {
    const supabase = ensureSupabase();

    const { count: totalGifts } = await supabase
      .from('admin_gift_messages').select('*', { count: 'exact', head: true });

    const { count: unclaimedGifts } = await supabase
      .from('admin_gift_messages').select('*', { count: 'exact', head: true }).eq('claimed', false);

    const { data: totals } = await supabase
      .from('admin_gift_messages').select('xp_amount, coin_amount').eq('claimed', true);

    const totalXpAwarded = totals?.reduce((s: number, g: { xp_amount: number }) => s + g.xp_amount, 0) || 0;
    const totalCoinsAwarded = totals?.reduce((s: number, g: { coin_amount: number }) => s + g.coin_amount, 0) || 0;

    return {
      totalGifts: totalGifts || 0,
      claimedGifts: (totalGifts || 0) - (unclaimedGifts || 0),
      unclaimedGifts: unclaimedGifts || 0,
      totalXpAwarded,
      totalCoinsAwarded,
    };
  }),

  deleteGift: adminProcedure
    .input(deleteGiftSchema)
    .mutation(async ({ input }) => {
      const supabase = ensureSupabase();

      const { data: gift, error: fetchError } = await supabase
        .from('admin_gift_messages')
        .select('id, claimed, recipient_id')
        .eq('id', input.id)
        .single();

      if (fetchError || !gift) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Gift not found' });
      }
      if (gift.claimed) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot delete a claimed gift' });
      }

      const { error: deleteError } = await supabase
        .from('admin_gift_messages').delete().eq('id', input.id);

      if (deleteError) {
        logger.error('ADMIN_TRPC', `Delete gift error: ${deleteError.message}`);
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to delete gift' });
      }

      logger.info('ADMIN_TRPC', JSON.stringify({ action: 'gift_deleted', giftId: input.id }));
      return { success: true };
    }),

  // ---- Notification procedures ----

  sendNotification: adminProcedure
    .input(sendNotificationSchema)
    .mutation(async ({ input }) => {
      const supabase = ensureSupabase();
      const { recipientIds, title, body, notificationType, imageUrl, actionUrl } = input;

      const { data: recipients, error: recipientError } = await supabase
        .from('profiles').select('id, username').in('id', recipientIds);

      if (recipientError) {
        logger.error('ADMIN_TRPC', `Failed to verify recipients: ${recipientError.message}`);
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to verify recipients' });
      }

      const validIds = new Set((recipients || []).map((r: { id: string }) => r.id));
      const invalidIds = recipientIds.filter(id => !validIds.has(id));
      if (invalidIds.length > 0) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Some recipient IDs are invalid', cause: { invalidIds } });
      }

      const notification: NotificationPayload = {
        title, body, notificationType,
        imageUrl: imageUrl || undefined,
        actionUrl: actionUrl || undefined,
        senderId: 'admin',
      };

      const result = await pushNotificationService.sendToUsers(recipientIds, notification);

      logger.info('ADMIN_TRPC', JSON.stringify({
        action: 'notifications_sent', recipientCount: recipientIds.length,
        notificationType, pushSent: result.sent, pushFailed: result.failed,
      }));

      return {
        success: true,
        recipientCount: recipientIds.length,
        pushDelivery: {
          sent: result.sent,
          failed: result.failed,
          errors: result.errors.length > 0 ? result.errors : undefined,
        },
      };
    }),

  notificationHistory: adminProcedure
    .input(notificationHistorySchema)
    .query(async ({ input }) => {
      const supabase = ensureSupabase();
      const { page, limit, type: notificationType } = input;
      const offset = (page - 1) * limit;

      let query = supabase
        .from('user_notifications')
        .select(`
          id, user_id, title, body, notification_type, push_sent, push_sent_at, read, created_at,
          recipient:profiles!user_notifications_user_profile_fkey(username, display_name, avatar_emoji)
        `, { count: 'exact' })
        .order('created_at', { ascending: false });

      if (notificationType) query = query.eq('notification_type', notificationType);
      query = query.range(offset, offset + limit - 1);

      const { data: notifications, error, count } = await query;

      if (error) {
        logger.error('ADMIN_TRPC', `Notification history error: ${error.message}`);
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch notification history' });
      }

      return {
        notifications: notifications || [],
        pagination: {
          page, limit, total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
          hasMore: (count || 0) > offset + limit,
        },
      };
    }),

  notificationStats: adminProcedure.query(async () => {
    const supabase = ensureSupabase();

    const { count: totalNotifications } = await supabase
      .from('user_notifications').select('*', { count: 'exact', head: true });

    const { count: pushSent } = await supabase
      .from('user_notifications').select('*', { count: 'exact', head: true }).eq('push_sent', true);

    const { count: readCount } = await supabase
      .from('user_notifications').select('*', { count: 'exact', head: true }).eq('read', true);

    const { data: typeData } = await supabase
      .from('user_notifications').select('notification_type');

    const byType: Record<string, number> = {};
    if (typeData) {
      typeData.forEach((n: { notification_type: string }) => {
        byType[n.notification_type] = (byType[n.notification_type] || 0) + 1;
      });
    }

    const { count: activeTokens } = await supabase
      .from('user_push_tokens').select('*', { count: 'exact', head: true }).eq('is_active', true);

    return {
      totalNotifications: totalNotifications || 0,
      pushSent: pushSent || 0,
      readCount: readCount || 0,
      unreadCount: (totalNotifications || 0) - (readCount || 0),
      byType,
      activeTokens: activeTokens || 0,
    };
  }),
});
