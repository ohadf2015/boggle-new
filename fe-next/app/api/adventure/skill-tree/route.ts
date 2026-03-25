/**
 * Skill Tree Sync API
 *
 * POST - Save skill tree state to DB (replaces localStorage-only persistence)
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkApiRateLimit } from '@/lib/apiRateLimit';
import { createClient } from '@/utils/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { captureApiError } from '@/utils/sentry';

export async function POST(request: NextRequest) {
  const rateLimitResult = checkApiRateLimit(request, 'adventure-skill-tree', {
    maxRequests: 20,
    windowMs: 60_000,
  });
  if (!rateLimitResult.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ error: 'Service temporarily unavailable' }, { status: 503 });
  }

  try {
    const authSupabase = await createClient();
    const { data: { user }, error: authError } = await authSupabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { skillTree, skillPoints } = body;

    // Validate skillTree is a flat object of string keys → number values
    if (!skillTree || typeof skillTree !== 'object' || Array.isArray(skillTree)) {
      return NextResponse.json({ error: 'Invalid skill tree data' }, { status: 400 });
    }
    if (typeof skillPoints !== 'number' || skillPoints < 0 || skillPoints > 1000) {
      return NextResponse.json({ error: 'Invalid skill points' }, { status: 400 });
    }

    const tree = skillTree as Record<string, number>;
    const MAX_SKILLS = 50;
    const entries = Object.entries(tree);
    if (entries.length > MAX_SKILLS) {
      return NextResponse.json({ error: 'Too many skills' }, { status: 400 });
    }
    for (const [key, value] of entries) {
      if (typeof key !== 'string' || key.length > 50 || typeof value !== 'number' || value < 0) {
        return NextResponse.json({ error: 'Invalid skill entry' }, { status: 400 });
      }
    }

    const supabase = createServiceClient(supabaseUrl, supabaseServiceKey);

    const { error: updateError } = await supabase
      .from('player_progression')
      .update({
        skill_tree: tree,
        skill_points: skillPoints,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('[SKILL TREE API] Update error:', updateError);
      return NextResponse.json({ error: 'Failed to save skill tree' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    captureApiError(error instanceof Error ? error : new Error(String(error)), '/api/adventure/skill-tree', { method: 'POST' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
