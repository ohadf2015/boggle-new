import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { createRequestClient } from '@/utils/supabase/server';
import logger from '@/utils/logger';

const idSchema = z.string().uuid();

export interface OwnedClassroom {
  id: string;
  name?: string | null;
  language?: string | null;
}

export type OwnedClassroomResult =
  | { ok: true; sb: SupabaseClient; userId: string; classroom: OwnedClassroom }
  | { ok: false; response: NextResponse };

/**
 * 401 signed out, 400 bad id, 403 not the owning teacher — on the request-scoped client (RLS).
 * Bearer first: the cookie session can be stale while the browser client has refreshed.
 */
export async function authorizeClassroomOwner(req: Request, rawId: string, columns = 'id'): Promise<OwnedClassroomResult> {
  const { supabase: sb, token } = await createRequestClient(req);
  const { data: { user } } = await sb.auth.getUser(token ?? undefined);
  if (!user) return { ok: false, response: NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 }) };

  const parsed = idSchema.safeParse(rawId);
  if (!parsed.success) {
    return { ok: false, response: NextResponse.json({ ok: false, error: 'Invalid classroom id' }, { status: 400 }) };
  }

  const { data, error } = await sb
    .from('classrooms')
    .select(columns)
    .eq('id', parsed.data)
    .eq('teacher_id', user.id)
    .maybeSingle();
  if (error) {
    logger.error('[owned-classroom] ownership check failed', error);
    return { ok: false, response: NextResponse.json({ ok: false, error: error.message }, { status: 500 }) };
  }
  if (!data) return { ok: false, response: NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 }) };

  return { ok: true, sb, userId: user.id, classroom: data as unknown as OwnedClassroom };
}
