/**
 * API Route: /api/admin/blocks
 * Admin moderation blocklist management. Powers the admin "Blocklist" view and
 * the quick-block buttons in the Players/Guests admin lists.
 *
 *   GET    — list blocks (optionally filter by type / active-only)
 *   POST   — create or refresh a block (upsert on block_type+value)
 *   DELETE — remove a block by id (?id=...)
 *
 * Writes use the service-role client (bypasses RLS); the backend join path
 * consults a cached view of this table to refuse blocked players/guests/IPs.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth/adminAuth';
import { getSupabaseAdmin } from '@/lib/admin/server';
import { parseBlockPayload, BLOCK_TYPES } from './parseBlockPayload';

const TABLE = 'blocked_entities';

export async function GET(request: NextRequest) {
  const authResult = await verifyAdminAuth(request);
  if (!authResult.success) return authResult.response!;

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const typeFilter = searchParams.get('type');
  const activeOnly = searchParams.get('activeOnly') === 'true';

  let query = supabase
    .from(TABLE)
    .select('id, block_type, value, reason, blocked_by, created_at, expires_at')
    .order('created_at', { ascending: false })
    .limit(500);

  if (typeFilter && (BLOCK_TYPES as readonly string[]).includes(typeFilter)) {
    query = query.eq('block_type', typeFilter);
  }
  if (activeOnly) {
    // Permanent (NULL) or not-yet-expired.
    query = query.or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ blocks: data ?? [] });
}

export async function POST(request: NextRequest) {
  const authResult = await verifyAdminAuth(request);
  if (!authResult.success) return authResult.response!;

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = parseBlockPayload((body ?? {}) as Record<string, unknown>);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  // Upsert so re-blocking the same target refreshes reason/expiry rather than
  // erroring on the unique (block_type, value) constraint.
  const { data, error } = await supabase
    .from(TABLE)
    .upsert(
      { ...parsed.data, blocked_by: authResult.user!.id },
      { onConflict: 'block_type,value' },
    )
    .select('id, block_type, value, reason, blocked_by, created_at, expires_at')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ block: data }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const authResult = await verifyAdminAuth(request);
  if (!authResult.success) return authResult.response!;

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
