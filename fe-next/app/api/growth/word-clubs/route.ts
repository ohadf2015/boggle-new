/**
 * Word Clubs API
 *
 * GET  — List clubs the current user belongs to (with members)
 * POST — Create a new club
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

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * GET /api/growth/word-clubs
 * List clubs the current user belongs to, with member info
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get club IDs user belongs to
    const { data: memberships, error: memErr } = await getSupabaseAdmin()
      .from('word_club_members')
      .select('club_id, role, joined_at')
      .eq('user_id', user.id);

    if (memErr) {
      console.error('[API] word-clubs GET memberships error:', memErr.message);
      return NextResponse.json({ error: 'Failed to fetch memberships' }, { status: 500 });
    }

    if (!memberships || memberships.length === 0) {
      return NextResponse.json({ clubs: [] });
    }

    const clubIds = memberships.map((m) => m.club_id);

    // Fetch clubs with members
    const { data: clubs, error: clubErr } = await getSupabaseAdmin()
      .from('word_clubs')
      .select('*, members:word_club_members(user_id, role, joined_at, user:user_id(id, display_name, avatar_image))')
      .in('id', clubIds)
      .order('created_at', { ascending: false });

    if (clubErr) {
      console.error('[API] word-clubs GET clubs error:', clubErr.message);
      return NextResponse.json({ error: 'Failed to fetch clubs' }, { status: 500 });
    }

    // Attach user's role to each club
    const clubsWithRole = (clubs ?? []).map((club) => {
      const membership = memberships.find((m) => m.club_id === club.id);
      return { ...club, userRole: membership?.role ?? 'member' };
    });

    return NextResponse.json({ clubs: clubsWithRole });
  } catch (error) {
    console.error('[API] word-clubs GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/growth/word-clubs
 * Create a new word club
 *
 * Body: { name: string, description?: string, maxMembers?: number }
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, description, maxMembers } = body;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json(
        { error: 'Club name must be at least 2 characters' },
        { status: 400 }
      );
    }

    if (name.trim().length > 30) {
      return NextResponse.json(
        { error: 'Club name must be 30 characters or less' },
        { status: 400 }
      );
    }

    const inviteCode = generateInviteCode();

    const { data: club, error: insertErr } = await getSupabaseAdmin()
      .from('word_clubs')
      .insert({
        name: name.trim(),
        description: description?.trim() ?? null,
        owner_id: user.id,
        invite_code: inviteCode,
        max_members: maxMembers ?? 20,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertErr) {
      console.error('[API] word-clubs POST insert error:', insertErr.message);
      return NextResponse.json({ error: 'Failed to create club' }, { status: 500 });
    }

    // Add creator as owner member
    const { error: memberErr } = await getSupabaseAdmin()
      .from('word_club_members')
      .insert({
        club_id: club.id,
        user_id: user.id,
        role: 'owner',
        joined_at: new Date().toISOString(),
      });

    if (memberErr) {
      console.error('[API] word-clubs POST member error:', memberErr.message);
      // Club was created but member insert failed — try to clean up
      await getSupabaseAdmin().from('word_clubs').delete().eq('id', club.id);
      return NextResponse.json({ error: 'Failed to create club membership' }, { status: 500 });
    }

    return NextResponse.json({ club }, { status: 201 });
  } catch (error) {
    console.error('[API] word-clubs POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
