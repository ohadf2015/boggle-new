import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { verifyAdminAuth } from '@/lib/auth/adminAuth';
import { isSameOrigin } from '@/lib/auth/sameOrigin';
import { captureApiError } from '@/utils/sentry';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/connections/ugc/[id]/moderate  { status: 'approved' | 'rejected' }
 * Admin-only: approve a pending riddle (so it surfaces) or reject it.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    // CSRF defense: this is a state-changing POST that can authenticate via an
    // ambient admin cookie session, so require a same-origin request + JSON body.
    if (!isSameOrigin(request)) {
      return NextResponse.json({ error: 'cross-origin request rejected' }, { status: 403 });
    }
    if (!request.headers.get('content-type')?.includes('application/json')) {
      return NextResponse.json({ error: 'content-type must be application/json' }, { status: 415 });
    }

    const auth = await verifyAdminAuth(request);
    if (!auth.success) return auth.response ?? NextResponse.json({ error: 'unauthorized' }, { status: 401 });

    const { id } = await params;
    if (!UUID_RE.test(id)) return NextResponse.json({ error: 'invalid id' }, { status: 400 });

    const body = await request.json().catch(() => null);
    const status = body?.status;
    if (status !== 'approved' && status !== 'rejected') {
      return NextResponse.json({ error: 'status must be approved or rejected' }, { status: 400 });
    }

    const admin = createAdminClient();
    if (!admin) return NextResponse.json({ error: 'service unavailable' }, { status: 503 });

    const { error } = await admin.from('connections_ugc_puzzles').update({ status }).eq('id', id);
    if (error) throw error;

    return NextResponse.json({ success: true, id, status });
  } catch (error) {
    captureApiError(error instanceof Error ? error : new Error(String(error)), '/api/connections/ugc/moderate', {
      method: 'POST',
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
