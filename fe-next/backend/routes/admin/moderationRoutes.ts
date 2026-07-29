/**
 * Admin Moderation Routes
 * Player ban/suspend, investigation, unified moderation queue.
 */

import express, { Response, Router } from 'express';
import type { AdminRequest } from './types';
import { successResponse, errorResponse, buildPaginationMeta } from './responseHelpers';
import { paginationSchema } from './paginationSchema';
import { requireAdminRole } from './rbac';
import { auditLog } from './middleware';
import logger from '../../utils/logger';

const { getSupabase } = require('../../modules/supabaseServer');

const router: Router = express.Router();

// ==================== Types ====================

interface SupabaseClient {
  from: (table: string) => Record<string, (...args: unknown[]) => unknown>;
}

// ==================== Service Functions ====================

export async function fetchPlayerInvestigation(supabase: SupabaseClient, playerId: string) {
  const [profileResult, gamesResult, modResult] = await Promise.allSettled([
    (supabase.from('profiles') as Record<string, Function>)
      .select('id, username, display_name, created_at, last_game_at, total_games, total_score, country_code, is_banned, ban_reason')
      .eq('id', playerId)
      .single(),
    (supabase.from('game_results') as Record<string, Function>)
      .select('id, score, word_count, created_at, language, is_ranked, game_code')
      .eq('player_id', playerId)
      .order('created_at', { ascending: false })
      .limit(20),
    (supabase.from('moderation_actions') as Record<string, Function>)
      .select('action_type, reason, created_at, admin_id, expires_at')
      .eq('target_player_id', playerId)
      .order('created_at', { ascending: false }),
  ]);

  return {
    profile: profileResult.status === 'fulfilled' ? (profileResult.value as { data: unknown }).data : null,
    recentGames: gamesResult.status === 'fulfilled' ? (gamesResult.value as { data: unknown[] }).data ?? [] : [],
    moderationHistory: modResult.status === 'fulfilled' ? (modResult.value as { data: unknown[] }).data ?? [] : [],
  };
}

export async function fetchModerationQueue(supabase: SupabaseClient, limit: number, offset: number) {
  // Fetch pending items from invalid_word_submissions as primary queue
  const result = await (supabase.from('invalid_word_submissions') as Record<string, Function>)
    .select('*', { count: 'exact' })
    .is('approved_at', null)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, count, error } = result as { data: unknown[] | null; count: number | null; error: { message: string } | null };

  if (error) {
    logger.warn('ADMIN_MOD', `Queue fetch failed: ${error.message}`);
    return { items: [], total: 0, pagination: buildPaginationMeta(0, { limit, offset }) };
  }

  return {
    items: data ?? [],
    total: count ?? 0,
    pagination: buildPaginationMeta(count ?? 0, { limit, offset }),
  };
}

// ==================== Routes ====================

/**
 * GET /api/admin/moderation/queue
 */
router.get('/moderation/queue', async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const { limit, offset } = paginationSchema.parse(req.query);
    const result = await fetchModerationQueue(getSupabase(), limit, offset);
    res.json(successResponse(result));
  } catch (err) {
    res.status(500).json(errorResponse('QUEUE_FETCH_FAILED', (err as Error).message));
  }
});

/**
 * GET /api/admin/moderation/players/:id/investigate
 */
router.get('/moderation/players/:id/investigate', async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const result = await fetchPlayerInvestigation(getSupabase(), req.params.id as string);
    if (!result.profile) {
      res.status(404).json(errorResponse('PLAYER_NOT_FOUND', 'Player not found'));
      return;
    }
    res.json(successResponse(result));
  } catch (err) {
    res.status(500).json(errorResponse('INVESTIGATION_FAILED', (err as Error).message));
  }
});

/**
 * POST /api/admin/moderation/players/:id/ban
 */
router.post('/moderation/players/:id/ban', requireAdminRole('moderator'), async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason, permanent, banUntil } = req.body;

    if (!reason) {
      res.status(400).json(errorResponse('MISSING_REASON', 'Ban reason is required'));
      return;
    }

    const supabase = getSupabase();

    // Insert moderation action
    const { error: actionError } = await supabase
      .from('moderation_actions')
      .insert({
        target_player_id: id,
        admin_id: req.adminUser!.id,
        action_type: 'ban',
        reason,
        expires_at: permanent ? null : banUntil,
        is_active: true,
      });

    if (actionError) {
      res.status(500).json(errorResponse('BAN_FAILED', actionError.message));
      return;
    }

    // Update profile
    await supabase.from('profiles').update({
      is_banned: true,
      banned_until: permanent ? null : banUntil,
      ban_reason: reason,
    }).eq('id', id);

    // Force-disconnect via Socket.IO
    const io = req.app.get('io');
    io?.to?.(`user:${id}`)?.emit?.('force_disconnect', { reason: 'account_banned' });

    auditLog(req.adminUser, 'player_ban', { targetId: id, permanent: !!permanent, reason });
    res.json(successResponse({ banned: true, targetId: id }));
  } catch (err) {
    logger.error('ADMIN_MOD', `Ban error: ${(err as Error).message}`);
    res.status(500).json(errorResponse('BAN_FAILED', (err as Error).message));
  }
});

/**
 * POST /api/admin/moderation/players/:id/warn
 */
router.post('/moderation/players/:id/warn', requireAdminRole('moderator'), async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      res.status(400).json(errorResponse('MISSING_REASON', 'Warning reason is required'));
      return;
    }

    await getSupabase()
      .from('moderation_actions')
      .insert({
        target_player_id: id,
        admin_id: req.adminUser!.id,
        action_type: 'warn',
        reason,
      });

    auditLog(req.adminUser, 'player_warn', { targetId: id, reason });
    res.json(successResponse({ warned: true, targetId: id }));
  } catch (err) {
    res.status(500).json(errorResponse('WARN_FAILED', (err as Error).message));
  }
});

export default router;
