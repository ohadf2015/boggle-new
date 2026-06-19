import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import {
  SUPPORTED_LANGUAGES,
  curatorLanguages,
  isCurator as isCuratorFromAssignments,
  type CuratorAssignment,
} from '@/lib/curator/curatorScope';
import { captureApiError } from '@/utils/sentry';

const PRIVATE = { 'Cache-Control': 'private, no-store' } as const;
const EMPTY = { isCurator: false, isAdmin: false, languages: [] as string[], assignments: [] };

/**
 * GET /api/curator/status
 *   → { isCurator, isAdmin, languages, assignments } for the current user.
 *
 * Unlike verifyCuratorAuth this does NOT 403 a non-curator — the curator UI
 * uses it to decide whether to render at all, so a plain user simply gets
 * isCurator:false. Admins are treated as curators for every language.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient();
    const user = await getAuthedUser(request);
    if (!user) return NextResponse.json(EMPTY, { headers: PRIVATE });

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();
    const isAdmin = !!(profile as { is_admin?: boolean } | null)?.is_admin;

    const { data: rows } = await supabase
      .from('curator_language_assignments')
      .select('language, trust_tier, active, curator_points')
      .eq('curator_id', user.id)
      .eq('active', true);
    const assignments = ((rows as CuratorAssignment[] | null) ?? []).filter(Boolean);

    const languages = isAdmin ? [...SUPPORTED_LANGUAGES].sort() : curatorLanguages(assignments);
    const isCurator = isAdmin || isCuratorFromAssignments(assignments);

    return NextResponse.json({ isCurator, isAdmin, languages, assignments }, { headers: PRIVATE });
  } catch (error) {
    captureApiError(
      error instanceof Error ? error : new Error(String(error)),
      '/api/curator/status',
      { method: 'GET' }
    );
    // Fail closed but non-fatal: the UI just won't show curator affordances.
    return NextResponse.json(EMPTY, { headers: PRIVATE });
  }
}
