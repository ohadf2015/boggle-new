/**
 * Admin Notification Routes
 * Handles /api/admin/notification/* endpoints for sending push notifications
 */

import express, { Request, Response, Router, NextFunction } from 'express';
import { z } from 'zod';
import logger from '../utils/logger';
import { pushNotificationService, NotificationPayload } from '../services/pushNotificationService';

const { getSupabase, isSupabaseConfigured } = require('../modules/supabaseServer');

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

// ==================== Validation Schemas ====================

const sendNotificationSchema = z.object({
  recipientIds: z.array(z.string().uuid()).min(1).max(100),
  title: z.string().min(1).max(100),
  body: z.string().min(1).max(500),
  notificationType: z.enum(['gift', 'system', 'achievement', 'social', 'marketing']).default('system'),
  imageUrl: z.string().url().max(500).optional().nullable(),
  actionUrl: z.string().max(200).optional().nullable(),
});

// ==================== Middleware ====================

/**
 * Admin authentication middleware
 */
async function adminAuth(req: AdminRequest, res: Response, next: NextFunction): Promise<void> {
  const requestId = `notif-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.warn('ADMIN_NOTIFICATION', `Missing auth header [${requestId}]`);
    res.status(401).json({ error: 'Missing authorization header', requestId });
    return;
  }

  const token = authHeader.substring(7);
  if (!isSupabaseConfigured()) {
    res.status(503).json({ error: 'Auth service not available', requestId });
    return;
  }

  try {
    const supabase = getSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      logger.warn('ADMIN_NOTIFICATION', `Invalid token [${requestId}]`);
      res.status(401).json({ error: 'Invalid token', requestId });
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin, username')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.is_admin) {
      logger.warn('ADMIN_NOTIFICATION', `Non-admin access attempt by ${user.email} [${requestId}]`);
      res.status(403).json({ error: 'Admin access required', requestId });
      return;
    }

    req.adminUser = { id: user.id, email: user.email || '', username: profile.username };
    logger.debug('ADMIN_NOTIFICATION', `Admin access: ${user.email} -> ${req.method} ${req.path} [${requestId}]`);
    next();
  } catch (error) {
    const err = error as Error;
    logger.error('ADMIN_NOTIFICATION', `Auth error: ${err.message} [${requestId}]`);
    res.status(500).json({ error: 'Authentication failed', requestId });
  }
}

router.use(adminAuth);

// ==================== Routes ====================

/**
 * POST /api/admin/notification/send
 * Send push notifications to specific players
 */
router.post('/send', async (req: AdminRequest, res: Response): Promise<void> => {
  const { requestId, adminUser } = req;

  try {
    const validation = sendNotificationSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        error: 'Invalid request body',
        details: validation.error.issues,
        requestId,
      });
      return;
    }

    const { recipientIds, title, body, notificationType, imageUrl, actionUrl } = validation.data;

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
      logger.error('ADMIN_NOTIFICATION', `Failed to verify recipients: ${recipientError.message} [${requestId}]`);
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

    // Send notifications
    const notification: NotificationPayload = {
      title,
      body,
      notificationType,
      imageUrl: imageUrl || undefined,
      actionUrl: actionUrl || undefined,
      senderId: adminUser.id,
    };

    const result = await pushNotificationService.sendToUsers(recipientIds, notification);

    logger.info('ADMIN_NOTIFICATION', JSON.stringify({
      action: 'notifications_sent',
      adminId: adminUser.id,
      adminEmail: adminUser.email,
      recipientCount: recipientIds.length,
      notificationType,
      pushSent: result.sent,
      pushFailed: result.failed,
      requestId,
    }));

    res.json({
      success: true,
      recipientCount: recipientIds.length,
      pushDelivery: {
        sent: result.sent,
        failed: result.failed,
        errors: result.errors.length > 0 ? result.errors : undefined,
      },
      requestId,
    });

  } catch (error) {
    const err = error as Error;
    logger.error('ADMIN_NOTIFICATION', `Send notification error: ${err.message} [${requestId}]`);
    res.status(500).json({ error: 'Failed to send notification', requestId });
  }
});

/**
 * GET /api/admin/notification/history
 * Get notification history with pagination
 */
router.get('/history', async (req: AdminRequest, res: Response): Promise<void> => {
  const { requestId } = req;

  try {
    const supabase = getSupabase();
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const offset = (page - 1) * limit;
    const notificationType = req.query.type as string | undefined;

    let query = supabase
      .from('user_notifications')
      .select(`
        id,
        user_id,
        title,
        body,
        notification_type,
        push_sent,
        push_sent_at,
        read,
        created_at,
        recipient:profiles!user_notifications_user_profile_fkey(username, display_name, avatar_emoji)
      `, { count: 'exact' })
      .order('created_at', { ascending: false });

    if (notificationType) {
      query = query.eq('notification_type', notificationType);
    }

    query = query.range(offset, offset + limit - 1);

    const { data: notifications, error, count } = await query;

    if (error) {
      logger.error('ADMIN_NOTIFICATION', `Failed to fetch history: ${error.message} [${requestId}]`);
      res.status(500).json({ error: 'Failed to fetch notification history', requestId });
      return;
    }

    res.json({
      notifications,
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
    logger.error('ADMIN_NOTIFICATION', `History error: ${err.message} [${requestId}]`);
    res.status(500).json({ error: 'Failed to fetch notification history', requestId });
  }
});

/**
 * GET /api/admin/notification/stats
 * Get notification statistics
 */
router.get('/stats', async (req: AdminRequest, res: Response): Promise<void> => {
  const { requestId } = req;

  try {
    const supabase = getSupabase();

    // Get total notifications
    const { count: totalNotifications } = await supabase
      .from('user_notifications')
      .select('*', { count: 'exact', head: true });

    // Get push sent count
    const { count: pushSent } = await supabase
      .from('user_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('push_sent', true);

    // Get read count
    const { count: readCount } = await supabase
      .from('user_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('read', true);

    // Get counts by type
    const { data: typeData } = await supabase
      .from('user_notifications')
      .select('notification_type');

    const byType: Record<string, number> = {};
    if (typeData) {
      typeData.forEach((n: { notification_type: string }) => {
        byType[n.notification_type] = (byType[n.notification_type] || 0) + 1;
      });
    }

    // Get active token count
    const { count: activeTokens } = await supabase
      .from('user_push_tokens')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    res.json({
      totalNotifications: totalNotifications || 0,
      pushSent: pushSent || 0,
      readCount: readCount || 0,
      unreadCount: (totalNotifications || 0) - (readCount || 0),
      byType: byType || {},
      activeTokens: activeTokens || 0,
      requestId,
    });

  } catch (error) {
    const err = error as Error;
    logger.error('ADMIN_NOTIFICATION', `Stats error: ${err.message} [${requestId}]`);
    res.status(500).json({ error: 'Failed to fetch notification stats', requestId });
  }
});

export default router;
