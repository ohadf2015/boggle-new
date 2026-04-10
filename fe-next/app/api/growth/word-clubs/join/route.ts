/**
 * Word Club Join API
 *
 * POST — Join a club by invite code
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/utils/supabase/admin';

function getSupabaseAdmin() {
  return createAdminClient()!;
}

async function getUserFromRequest(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return null;
  const token = authHeader.replace('Bearer ', '');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: { user } } = await supabase.auth.getUser(token);
  return user;
}

/**
 * POST /api/growth/word-clubs/join
 * Join a club by invite code
 *
 * Body: { inviteCode: string }
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { inviteCode } = body;

    if (!inviteCode || typeof inviteCode !== 'string') {
      return NextResponse.json({ error: 'inviteCode is required' }, { status: 400 });
    }

    // Find the club
    const { data: club, error: clubErr } = await getSupabaseAdmin()
      .from('word_clubs')
      .select('id, name, max_members')
      .eq('invite_code', inviteCode.toUpperCase().trim())
      .single();

    if (clubErr || !club) {
      return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 });
    }

    // Check if already a member
    const { data: existing } = await getSupabaseAdmin()
      .from('word_club_members')
      .select('id')
      .eq('club_id', club.id)
      .eq('user_id', user.id)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'Already a member of this club' }, { status: 409 });
    }

    // Check member count
    const { count } = await getSupabaseAdmin()
      .from('word_club_members')
      .select('id', { count: 'exact', head: true })
      .eq('club_id', club.id);

    if (count != null && count >= club.max_members) {
      return NextResponse.json({ error: 'Club is full' }, { status: 400 });
    }

    // Add member
    const { error: joinErr } = await getSupabaseAdmin()
      .from('word_club_members')
      .insert({
        club_id: club.id,
        user_id: user.id,
        role: 'member',
        joined_at: new Date().toISOString(),
      });

    if (joinErr) {
      console.error('[API] word-clubs/join POST error:', joinErr.message);
      return NextResponse.json({ error: 'Failed to join club' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      club: { id: club.id, name: club.name },
    });
  } catch (error) {
    console.error('[API] word-clubs/join POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
