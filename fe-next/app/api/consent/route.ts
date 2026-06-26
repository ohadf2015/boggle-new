/**
 * Consent API Routes
 *
 * API endpoints for managing parental consent for users under 14.
 * Required for GDPR/PPL and Israeli Ministry of Education compliance.
 *
 * Endpoints:
 * - GET /api/consent - Get current consent status
 * - POST /api/consent - Submit new consent
 * - DELETE /api/consent - Revoke consent
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import logger from '@/utils/logger';
import { handleGetConsent, handleSubmitConsent, handleRevokeConsent } from './_handlers';

/**
 * GET /api/consent
 * Get current consent status for authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Auth: fast local JWT verify (read-only GET); supabase client retained for the query.
    const user = await getAuthedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await handleGetConsent(user.id, supabase);
    return NextResponse.json(result.data, { status: result.status });
  } catch (error) {
    logger.error('GET consent error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/consent
 * Submit new parental consent
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const result = await handleSubmitConsent(user.id, body, supabase);
    return NextResponse.json(result.data, { status: result.status });
  } catch (error) {
    logger.error('POST consent error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/consent
 * Revoke existing consent
 */
export async function DELETE(_request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await handleRevokeConsent(user.id, supabase);
    return NextResponse.json(result.data, { status: result.status });
  } catch (error) {
    logger.error('DELETE consent error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
