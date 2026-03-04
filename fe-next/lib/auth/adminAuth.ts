/**
 * Admin Authentication Utilities for Next.js API Routes
 * Validates JWT tokens and verifies admin status via Supabase
 * Supports both Bearer token and cookie-based session authentication
 */

import { NextRequest, NextResponse } from 'next/server';

export interface AdminUser {
  id: string;
  email: string;
  username?: string;
}

export interface AdminAuthResult {
  success: boolean;
  user?: AdminUser;
  error?: string;
  response?: NextResponse;
}

/**
 * Verify admin authentication from Next.js API route request
 * Supports two authentication methods:
 * 1. Bearer token in Authorization header (for API calls)
 * 2. Cookie-based session (for dashboard/browser requests)
 *
 * @param request - Next.js API request
 * @returns Admin auth result with user or error response
 */
export async function verifyAdminAuth(request: NextRequest): Promise<AdminAuthResult> {
  // First try Bearer token authentication
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const result = await verifyBearerToken(authHeader.substring(7));
    if (result.success) {
      return result;
    }
    // If Bearer token provided but invalid, don't fall back to cookie auth
    return result;
  }

  // Fall back to cookie-based session auth
  const cookieResult = await verifyCookieSession();
  if (cookieResult.success) {
    return cookieResult;
  }

  // Neither auth method succeeded
  return {
    success: false,
    error: 'Missing authorization header',
    response: NextResponse.json(
      { error: 'Missing authorization header' },
      { status: 401 }
    ),
  };
}

/**
 * Verify Bearer token authentication
 */
async function verifyBearerToken(token: string): Promise<AdminAuthResult> {
  try {
    // Create Supabase client with service role key for token verification
    const supabaseLib = await import('@supabase/supabase-js');
    const supabase = supabaseLib.createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Verify JWT and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return {
        success: false,
        error: 'Invalid token',
        response: NextResponse.json({ error: 'Invalid token' }, { status: 401 }),
      };
    }

    // Check admin status in profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin, username')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.is_admin) {
      return {
        success: false,
        error: 'Admin access required',
        response: NextResponse.json(
          { error: 'Admin access required' },
          { status: 403 }
        ),
      };
    }

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email!,
        username: profile.username,
      },
    };
  } catch {
    return {
      success: false,
      error: 'Authentication failed',
      response: NextResponse.json(
        { error: 'Authentication failed' },
        { status: 500 }
      ),
    };
  }
}

/**
 * Verify cookie-based session authentication
 */
async function verifyCookieSession(): Promise<AdminAuthResult> {
  try {
    // Dynamic import to avoid issues in edge runtime
    const { createClient } = await import('@/utils/supabase/server');
    const supabase = await createClient();

    // Get user from cookie session
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: 'Unauthorized',
        response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      };
    }

    // Check admin status in profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin, username')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.is_admin) {
      return {
        success: false,
        error: 'Admin access required',
        response: NextResponse.json(
          { error: 'Admin access required' },
          { status: 403 }
        ),
      };
    }

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email!,
        username: profile.username,
      },
    };
  } catch {
    return {
      success: false,
      error: 'Authentication failed',
      response: NextResponse.json(
        { error: 'Authentication failed' },
        { status: 500 }
      ),
    };
  }
}
