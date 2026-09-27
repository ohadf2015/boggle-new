/**
 * Bulk Approve Invalid Words API
 *
 * POST /api/admin/invalid-words/bulk-approve
 *
 * Approves multiple invalid words in a single batch operation.
 * Adds approved words to word_scores for immediate validation.
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/utils/logger';
import { verifyAdminAuth } from '@/lib/auth/adminAuth';
import { handleBulkApprove, type BulkApproveResult } from './_handlers';

/**
 * POST handler for bulk approve
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  logger.log('[BulkApprove] POST request received');

  // Verify admin authentication
  const authResult = await verifyAdminAuth(request);
  if (!authResult.success) {
    return authResult.response!;
  }

  try {
    const body = await request.json();
    const result = await handleBulkApprove(body, authResult.user!);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status || 500 });
    }

    return NextResponse.json(result);
  } catch (error) {
    const err = error as Error;
    logger.error('[BulkApprove] Error:', err.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
