/**
 * Admin Authentication Utilities for Next.js API Routes
 * Validates JWT tokens and verifies admin status via Supabase
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
 * Checks JWT token and admin status in Supabase
 *
 * @param request - Next.js API request
 * @returns Admin auth result with user or error response
 */
export async function verifyAdminAuth(request: NextRequest): Promise<AdminAuthResult> {
  const authHeader = request.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      success: false,
      error: 'Missing authorization header',
      response: NextResponse.json(
        { error: 'Missing authorization header' },
        { status: 401 }
      ),
    };
  }

  const token = authHeader.substring(7); // Remove 'Bearer '

  try {
    // Create Supabase client (dynamic import for server-side)
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
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: errorMessage,
      response: NextResponse.json(
        { error: 'Authentication failed' },
        { status: 500 }
      ),
    };
  }
}
