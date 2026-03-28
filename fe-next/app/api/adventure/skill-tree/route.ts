/**
 * Skill Tree Sync API
 *
 * POST - Save skill tree state to DB (replaces localStorage-only persistence)
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkApiRateLimit } from '@/lib/apiRateLimit';
import { createClient } from '@/utils/supabase/server';
import { captureApiError } from '@/utils/sentry';

export async function POST(request: NextRequest) {
  const rateLimitResult = checkApiRateLimit(request, 'adventure-skill-tree', {
    maxRequests: 20,
    windowMs: 60_000,
  });
  if (!rateLimitResult.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
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
    // Skill tree has 3 paths × 5 tiers max = 15 skills max. Cap at 50 for future headroom.
    const MAX_SKILLS = 50;
    // Each skill can have up to 100 points allocated (budget check below enforces real cap)
    const MAX_SKILL_VALUE = 100;
    const entries = Object.entries(tree);
    if (entries.length > MAX_SKILLS) {
      return NextResponse.json({ error: 'Too many skills' }, { status: 400 });
    }
    // Validate: keys must be alphanumeric/dash/underscore, values integer 0-MAX_SKILL_VALUE
    const validKeyPattern = /^[a-zA-Z][a-zA-Z0-9_-]{0,49}$/;
    for (const [key, value] of entries) {
      if (typeof key !== 'string' || !validKeyPattern.test(key)) {
        return NextResponse.json({ error: `Invalid skill key: ${key}` }, { status: 400 });
      }
      if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > MAX_SKILL_VALUE) {
        return NextResponse.json({ error: `Invalid skill entry: ${key}=${value}` }, { status: 400 });
      }
    }

    // Server-side budget validation: 1 skill point earned per level (level 1 = 0 points)
    const { data: progression, error: progError } = await supabase
      .from('player_progression')
      .select('player_level')
      .eq('user_id', user.id)
      .single();

    if (progError || !progression) {
      console.error('[SKILL TREE API] Failed to fetch player level:', progError);
      return NextResponse.json({ error: 'Failed to validate skill points' }, { status: 500 });
    }

    const maxPoints = (progression.player_level as number) - 1;
    const totalAllocated = entries.reduce((sum, [, v]) => sum + v, 0);
    if (totalAllocated + (skillPoints as number) > maxPoints) {
      return NextResponse.json(
        { error: `Skill point budget exceeded: ${totalAllocated + (skillPoints as number)} > ${maxPoints} (level ${progression.player_level})` },
        { status: 400 }
      );
    }

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
