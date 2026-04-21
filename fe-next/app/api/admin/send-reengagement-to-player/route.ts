import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import {
  getSupabaseAdmin,
  isEmailServiceConfigured,
  generateUnsubscribeToken,
} from '@/lib/email';
import {
  resolveUserLanguage,
  getFirstLetterForLanguage,
  sendReengagementEmail,
} from '@/lib/reengagementEmail';
import { captureApiError } from '@/utils/sentry';

export const maxDuration = 60;

/**
 * POST /api/admin/send-reengagement-to-player
 * Send a real re-engagement email to a specific player (by email or username).
 * Admin-only. Auto-detects language.
 *
 * Body: { playerIdentifier: string }
 */
export async function POST(request: NextRequest) {
  if (!isEmailServiceConfigured()) {
    return NextResponse.json(
      { error: 'Email service not configured' },
      { status: 503 }
    );
  }

  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { playerIdentifier } = body;

    if (!playerIdentifier) {
      return NextResponse.json({ error: 'playerIdentifier is required' }, { status: 400 });
    }

    const adminSupabase = getSupabaseAdmin();
    if (!adminSupabase) {
      return NextResponse.json({ error: 'Supabase admin not configured' }, { status: 503 });
    }

    // Resolve player
    const isEmail = playerIdentifier.includes('@');
    let profileId: string | null = null;
    let resolvedEmail: string | null = null;

    if (isEmail) {
      const { data: authUsers, error: listError } = await adminSupabase.auth.admin.listUsers();
      if (listError) {
        return NextResponse.json({ error: 'Failed to look up users' }, { status: 500 });
      }
      const match = authUsers.users.find(
        (u: { id: string; email?: string }) =>
          u.email?.toLowerCase() === playerIdentifier.toLowerCase()
      );
      if (!match) {
        return NextResponse.json({ error: `No user found with email ${playerIdentifier}` }, { status: 404 });
      }
      profileId = match.id;
      resolvedEmail = match.email ?? null;
    } else {
      const { data: profileByName } = await adminSupabase
        .from('profiles')
        .select('id')
        .eq('username', playerIdentifier)
        .single();
      if (!profileByName) {
        return NextResponse.json({ error: `No user found with username ${playerIdentifier}` }, { status: 404 });
      }
      profileId = profileByName.id;
    }

    if (!profileId) {
      return NextResponse.json({ error: 'Could not resolve profile' }, { status: 404 });
    }

    // Get profile details
    const { data: playerProfile } = await adminSupabase
      .from('profiles')
      .select('display_name, username, email_unsubscribe_token, country_code, timezone')
      .eq('id', profileId)
      .single();

    if (!resolvedEmail) {
      const { data: authUsers } = await adminSupabase.auth.admin.listUsers();
      const match = authUsers?.users.find((u: { id: string; email?: string }) => u.id === profileId);
      resolvedEmail = match?.email ?? null;
    }

    if (!resolvedEmail) {
      return NextResponse.json({ error: 'Player has no email address' }, { status: 404 });
    }

    // Resolve language + first letter
    const language = await resolveUserLanguage(profileId, playerProfile?.country_code ?? null);
    const letterData = await getFirstLetterForLanguage(language);
    const firstLetter = letterData?.letter || '?';

    // Ensure unsubscribe token
    let unsubToken = playerProfile?.email_unsubscribe_token;
    if (!unsubToken) {
      unsubToken = generateUnsubscribeToken();
      await adminSupabase
        .from('profiles')
        .update({ email_unsubscribe_token: unsubToken })
        .eq('id', profileId);
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://lexiclash.live';

    const result = await sendReengagementEmail(
      {
        id: profileId,
        email: resolvedEmail,
        display_name: playerProfile?.display_name ?? null,
        username: playerProfile?.username ?? 'player',
        timezone: playerProfile?.timezone ?? null,
        email_unsubscribe_token: unsubToken,
        country_code: playerProfile?.country_code ?? null,
      },
      language,
      firstLetter,
      baseUrl
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to send' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Re-engagement email sent to ${resolvedEmail}`,
      sentTo: resolvedEmail,
    });
  } catch (error) {
    captureApiError(
      error instanceof Error ? error : new Error(String(error)),
      '/api/admin/send-reengagement-to-player',
      { method: 'POST', statusCode: 500 }
    );
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
