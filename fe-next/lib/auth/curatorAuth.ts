/**
 * Language Curator authentication for Next.js API routes.
 *
 * Mirrors verifyAdminAuth (Bearer-token OR cookie session) but instead of a
 * single is_admin bool it resolves the caller's ACTIVE language assignments
 * from curator_language_assignments. Admins bypass as max-tier curators for
 * every language.
 *
 * Defence in depth: RLS already scopes the underlying tables, but routes call
 * this so we fail closed (403) before touching data and can enforce a required
 * language up front.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  SUPPORTED_LANGUAGES,
  MAX_CURATOR_TIER,
  canCurate,
  curatorLanguages,
  curatorTier,
  type CuratorAssignment,
} from '@/lib/curator/curatorScope';

export interface CuratorUser {
  id: string;
  email: string;
  username?: string;
}

export interface CuratorAuthResult {
  success: boolean;
  user?: CuratorUser;
  /** Active languages the caller may curate (all five for admins). */
  languages?: string[];
  /** Capability tier for the required language (or max across langs). */
  tier?: number;
  isAdmin?: boolean;
  error?: string;
  response?: NextResponse;
}

interface CuratorAuthOptions {
  /** If set, require the caller to curate this language (admins always pass). */
  language?: string;
}

type MinimalClient = {
  auth: { getUser: (token?: string) => Promise<{ data: { user: unknown }; error: unknown }> };
  from: (table: string) => {
    select: (cols?: string) => {
      eq: (col: string, val: unknown) => {
        eq: (col: string, val: unknown) => Promise<{ data: unknown; error: unknown }>;
        single: () => Promise<{ data: unknown; error: unknown }>;
      };
    };
  };
};

function unauthorized(error: string, status: number): CuratorAuthResult {
  return { success: false, error, response: NextResponse.json({ error }, { status }) };
}

/**
 * Verify curator authentication for an API request.
 * @param request Next.js request
 * @param opts.language optional required language (403 if caller can't curate it)
 */
export async function verifyCuratorAuth(
  request: NextRequest,
  opts: CuratorAuthOptions = {}
): Promise<CuratorAuthResult> {
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const supabaseLib = await import('@supabase/supabase-js');
    const supabase = supabaseLib.createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    ) as unknown as MinimalClient;
    return resolveCurator(supabase, authHeader.substring(7), opts);
  }

  // Fall back to cookie-based session auth.
  try {
    const { createClient } = await import('@/utils/supabase/server');
    const supabase = (await createClient()) as unknown as MinimalClient;
    return resolveCurator(supabase, undefined, opts);
  } catch {
    return unauthorized('Authentication failed', 500);
  }
}

async function resolveCurator(
  supabase: MinimalClient,
  token: string | undefined,
  opts: CuratorAuthOptions
): Promise<CuratorAuthResult> {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    const u = user as { id: string; email?: string } | null;
    if (authError || !u) {
      return unauthorized(token ? 'Invalid token' : 'Unauthorized', 401);
    }

    // is_admin → bypass as a max-tier curator for every language.
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin, username')
      .eq('id', u.id)
      .single();
    const prof = profile as { is_admin?: boolean; username?: string } | null;
    const isAdmin = !!prof?.is_admin;

    const baseUser: CuratorUser = { id: u.id, email: u.email ?? '', username: prof?.username };

    if (isAdmin) {
      const languages: string[] = [...SUPPORTED_LANGUAGES].sort();
      if (opts.language && !languages.includes(opts.language)) {
        return unauthorized('Unsupported language', 400);
      }
      return { success: true, user: baseUser, languages, tier: MAX_CURATOR_TIER, isAdmin: true };
    }

    // Resolve active assignments for this curator.
    const { data: rows } = await supabase
      .from('curator_language_assignments')
      .select('language, trust_tier, active')
      .eq('curator_id', u.id)
      .eq('active', true);
    const assignments = ((rows as CuratorAssignment[] | null) ?? []).filter(Boolean);

    const languages = curatorLanguages(assignments);
    if (languages.length === 0) {
      return unauthorized('Curator access required', 403);
    }

    if (opts.language && !canCurate(assignments, opts.language)) {
      return unauthorized('Curator access required for this language', 403);
    }

    const tier = opts.language
      ? curatorTier(assignments, opts.language)
      : Math.max(...assignments.map((a) => a.trust_tier));

    return { success: true, user: baseUser, languages, tier, isAdmin: false };
  } catch {
    return unauthorized('Authentication failed', 500);
  }
}
