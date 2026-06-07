/**
 * Admin management of Language Curator ("native-speaker") assignments.
 *
 * GET  /api/admin/curators[?language=he]  → { curators: [...] }
 * POST /api/admin/curators
 *   assign: { userId, language, trustTier? }
 *   revoke: { action:'revoke', userId, language, reason? }
 *
 * Served from Express (not Next app/api) on purpose: the custom server
 * body-parses /api/* before a request would fall through to the Next handler,
 * so a Next route's `await request.json()` hangs and times out (408). Every
 * other admin mutation is an Express route reading req.body — this matches.
 * Auth + rate limiting are applied by the parent admin router (adminAuth sets
 * req.adminUser), so no per-route auth or CSRF check is needed here.
 */
import { Router, type Response } from 'express';
import type { AdminRequest } from './types';
import logger from '../../utils/logger';
import {
  validateAssignmentInput,
  buildAssignmentUpsert,
  buildRevokePatch,
  type AssignmentInput,
} from '@/lib/curator/curatorAdmin';
import { SUPPORTED_LANGUAGES } from '@/lib/curator/curatorScope';
import { notifyCuratorAssigned } from '../../modules/pushNotificationTriggers';

const { getSupabase } = require('../../modules/supabaseServer');

const router: Router = Router();

const LIST_COLS =
  'curator_id, language, trust_tier, curator_points, active, assigned_at, assigned_by, revoked_at';

// GET /api/admin/curators[?language=he]
router.get('/', async (req: AdminRequest, res: Response): Promise<void> => {
  const requestId = req.requestId;
  try {
    const supabase = getSupabase();
    if (!supabase) {
      res.status(503).json({ error: 'service unavailable', requestId });
      return;
    }
    const language = typeof req.query.language === 'string' ? req.query.language : undefined;
    const base = supabase.from('curator_language_assignments').select(LIST_COLS).eq('active', true);
    const query =
      language && SUPPORTED_LANGUAGES.includes(language as never) ? base.eq('language', language) : base;
    const { data, error } = await query;
    if (error) throw error;
    res.json({ curators: data ?? [], requestId });
  } catch (error) {
    logger.error('ADMIN_CURATORS', `GET failed: ${(error as Error).message} [${requestId}]`);
    res.status(500).json({ error: 'Internal server error', requestId });
  }
});

// POST /api/admin/curators — assign or revoke
router.post('/', async (req: AdminRequest, res: Response): Promise<void> => {
  const requestId = req.requestId;
  const adminId = req.adminUser?.id;
  if (!adminId) {
    res.status(401).json({ error: 'unauthorized', requestId });
    return;
  }
  try {
    const body = (req.body ?? {}) as Partial<AssignmentInput> & { action?: string; reason?: string };

    const supabase = getSupabase();
    if (!supabase) {
      res.status(503).json({ error: 'service unavailable', requestId });
      return;
    }

    // Revoke path
    if (body.action === 'revoke') {
      if (typeof body.userId !== 'string' || typeof body.language !== 'string') {
        res.status(400).json({ error: 'invalid_body', requestId });
        return;
      }
      const patch = buildRevokePatch(adminId, body.reason ?? null, new Date().toISOString());
      const { error } = await supabase
        .from('curator_language_assignments')
        .update(patch)
        .eq('curator_id', body.userId)
        .eq('language', body.language);
      if (error) throw error;
      res.json({ ok: true, revoked: true, requestId });
      return;
    }

    // Assign path
    const input: AssignmentInput = {
      userId: String(body.userId ?? ''),
      language: String(body.language ?? ''),
      trustTier: body.trustTier,
    };
    const valid = validateAssignmentInput(input);
    if (!valid.ok) {
      res.status(400).json({ error: valid.error, requestId });
      return;
    }

    const row = buildAssignmentUpsert(input, adminId);
    const { error } = await supabase
      .from('curator_language_assignments')
      .upsert(row, { onConflict: 'curator_id,language' });
    if (error) throw error;

    // Welcome the new curator in their own language. Fire-and-forget: a push/DB
    // hiccup must never fail the assignment that already committed above.
    void notifyCuratorAssigned(input.userId, input.language, input.trustTier).catch(() => {});

    res.json({ ok: true, assigned: true, requestId });
  } catch (error) {
    logger.error('ADMIN_CURATORS', `POST failed: ${(error as Error).message} [${requestId}]`);
    res.status(500).json({ error: 'Internal server error', requestId });
  }
});

export default router;
