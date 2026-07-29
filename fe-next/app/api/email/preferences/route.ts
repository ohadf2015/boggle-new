import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { updateEmailPreferences, generateUnsubscribeToken } from '@/lib/email';

/**
 * Get Supabase admin client for database operations
 */
function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
}

/**
 * GET /api/email/preferences
 *
 * Get current email preferences for authenticated user.
 * Requires Authorization header with Supabase JWT.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = authHeader.split(' ')[1];
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  // Verify the JWT and get user
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  // Get user's email preferences
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('daily_email_subscribed, timezone')
    .eq('id', user.id)
    .single();

  if (error) {
    const errorMessage = error.message || 'Unknown error';
    console.error('[Email Preferences] Error fetching preferences:', errorMessage);
    return NextResponse.json({ error: 'Failed to fetch preferences' }, { status: 500 });
  }

  return NextResponse.json({
    daily_email_subscribed: profile?.daily_email_subscribed ?? true,
    timezone: profile?.timezone || null,
    email: user.email || null,
  });
}

/**
 * PATCH /api/email/preferences
 *
 * Update email preferences for authenticated user.
 * Requires Authorization header with Supabase JWT.
 *
 * Body: {
 *   daily_email_subscribed?: boolean,
 *   timezone?: string
 * }
 */
export async function PATCH(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = authHeader.split(' ')[1];
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  // Verify the JWT and get user
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  // Parse request body
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { daily_email_subscribed, timezone } = body;

  // Validate timezone if provided
  if (timezone !== undefined && timezone !== null) {
    try {
      // Test if timezone is valid by creating a date formatter
      new Intl.DateTimeFormat('en-US', { timeZone: timezone });
    } catch {
      return NextResponse.json({ error: 'Invalid timezone' }, { status: 400 });
    }
  }

  // Update preferences
  const result = await updateEmailPreferences(user.id, {
    daily_email_subscribed,
    timezone,
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  // Fetch updated preferences
  const { data: updatedProfile } = await supabase
    .from('profiles')
    .select('daily_email_subscribed, timezone')
    .eq('id', user.id)
    .single();

  return NextResponse.json({
    success: true,
    daily_email_subscribed: updatedProfile?.daily_email_subscribed ?? true,
    timezone: updatedProfile?.timezone || null,
  });
}
