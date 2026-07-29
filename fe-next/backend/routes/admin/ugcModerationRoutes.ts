/**
 * Admin UGC Moderation Routes
 * Review, approve, and reject user-generated content.
 */

import express, { Response, Router } from 'express';
import type { AdminRequest } from './types';
import { auditLog } from './middleware';
import logger from '../../utils/logger';

import { getSupabase } from '../../modules/supabaseServer';

const router: Router = express.Router();

// ==================== Table Validation (SQL Injection Fix) ====================

export const UGC_TABLES = ['community_boards', 'word_packs', 'chat_messages', 'word_votes'] as const;
type UGCTable = typeof UGC_TABLES[number];

/**
 * Validate and resolve a table parameter to a safe allowlist value.
 * Prevents SQL injection via Supabase `.from(table)` calls.
 */
export function resolveUGCTable(raw: unknown): UGCTable {
  if (typeof raw === 'string' && (UGC_TABLES as readonly string[]).includes(raw)) {
    return raw as UGCTable;
  }
  return 'community_boards';
}

/**
 * GET /ugc/pending - List pending/flagged UGC items
 */
router.get('/ugc/pending', async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const supabase = getSupabase();
    if (!supabase) { res.status(503).json({ error: 'Database not available' }); return; }
    const table = resolveUGCTable(req.query.table);

    const { data, error } = await supabase
      .from(table)
      .select('*')
      .in('moderation_status', ['pending', 'flagged']);

    if (error) {
      logger.error('ADMIN_UGC', `Failed to fetch pending UGC: ${error.message}`);
      res.status(500).json({ error: 'Failed to fetch pending items' });
      return;
    }

    res.json({ items: data || [] });
  } catch (err) {
    const e = err as Error;
    logger.error('ADMIN_UGC', `Error fetching pending UGC: ${e.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /ugc/:id/approve - Approve a UGC item
 */
router.post('/ugc/:id/approve', async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const supabase = getSupabase();
    if (!supabase) { res.status(503).json({ error: 'Database not available' }); return; }
    const { id } = req.params;
    const table = resolveUGCTable(req.query.table);

    const { data, error } = await supabase
      .from(table)
      .update({ moderation_status: 'approved', moderated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      logger.error('ADMIN_UGC', `Failed to approve UGC ${id}: ${error.message}`);
      res.status(500).json({ error: 'Failed to approve item' });
      return;
    }

    auditLog(req.adminUser, 'ugc_approve', { id, table });
    res.json({ item: data });
  } catch (err) {
    const e = err as Error;
    logger.error('ADMIN_UGC', `Error approving UGC: ${e.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /ugc/:id/reject - Reject a UGC item
 */
router.post('/ugc/:id/reject', async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const supabase = getSupabase();
    if (!supabase) { res.status(503).json({ error: 'Database not available' }); return; }
    const { id } = req.params;
    const table = resolveUGCTable(req.query.table);
    const reason = req.body?.reason || '';

    const { data, error } = await supabase
      .from(table)
      .update({
        moderation_status: 'rejected',
        moderated_at: new Date().toISOString(),
        rejection_reason: reason,
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      logger.error('ADMIN_UGC', `Failed to reject UGC ${id}: ${error.message}`);
      res.status(500).json({ error: 'Failed to reject item' });
      return;
    }

    auditLog(req.adminUser, 'ugc_reject', { id, table, reason });
    res.json({ item: data });
  } catch (err) {
    const e = err as Error;
    logger.error('ADMIN_UGC', `Error rejecting UGC: ${e.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
